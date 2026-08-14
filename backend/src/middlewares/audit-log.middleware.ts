/**
 * Audit log middleware for admin actions.
 *
 * Automatically logs admin actions (POST, PUT, PATCH, DELETE) on
 * admin routes to the `pd_audit_log` table for compliance and
 * security review.
 *
 * Logged data:
 *   - Admin user ID
 *   - HTTP method and path
 *   - Request body (with sensitive fields redacted)
 *   - Response status code
 *   - Timestamp
 *   - IP address
 */

import { RequestHandler, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Sensitive field patterns to redact from request body/metadata before logging (SO-03)
const SENSITIVE_PATTERNS = [
  'password',
  'password_hash',
  'secret',
  'token',
  'api_key',
  'apikey',
  'app_secret',
  'client_secret',
  'private_key',
  'access_token',
  'refresh_token',
  'auth_token',
  'flouci_app_secret',
  'konnect_api_key',
  'paypal_sandbox_client_secret',
  'paypal_live_client_secret',
  'smtp_pass',
  'smtp_password',
  'card_number',
  'cvv',
  'cin_number',
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_PATTERNS.some((pattern) => {
    const normalizedPattern = pattern.replace(/[-_]/g, '');
    return normalized.includes(normalizedPattern);
  });
}

export function redactBody(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => redactBody(item));
  }
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactBody(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Middleware that logs admin actions to pd_audit_log.
 * Should be applied to admin route groups.
 */
export const auditLog: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Only log state-changing methods
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Capture the original end method to log after response
  const originalEnd = res.end;
  const startTime = Date.now();

  res.end = function (this: Response, ...args: Parameters<typeof originalEnd>) {
    const duration = Date.now() - startTime;

    // Only log if user is authenticated and is an admin or vendor
    const actorId = req.user?.id || req.storefrontCustomer?.id;
    const actorRole = req.user?.role || (req.storefrontCustomer ? 'customer' : null);

    // Only log if user is authenticated and has an allowed role
    if (!actorId || !['admin', 'super_admin', 'vendor', 'customer'].includes(actorRole || '')) {
      return originalEnd.apply(this, args);
    }

    // Fire and forget — don't block the response
    const logEntry = {
      id: pdId('audit'),
      actor_id: actorId,
      actor_role: actorRole,
      action: `${req.method} ${req.originalUrl}`,
      resource_type: extractResourceType(req.originalUrl),
      resource_id: extractResourceId(req.originalUrl),
      ip: req.ip ?? null,
      user_agent: req.headers['user-agent'] ?? null,
      metadata: JSON.stringify({
        method: req.method,
        path: req.originalUrl,
        body: req.body ? redactBody(req.body) : null,
        status_code: res.statusCode,
        duration_ms: duration,
      }),
    };

    query(
      `INSERT INTO pd_audit_log (id, actor_id, actor_role, action, resource_type, resource_id, ip, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8, $9::jsonb)`,
      [
        logEntry.id,
        logEntry.actor_id,
        logEntry.actor_role,
        logEntry.action,
        logEntry.resource_type,
        logEntry.resource_id,
        logEntry.ip,
        logEntry.user_agent,
        logEntry.metadata,
      ],
    ).catch((err) => {
      logger.warn({ err }, 'Failed to write audit log entry');
    });

    return originalEnd.apply(this, args);
  } as typeof originalEnd;

  next();
};

/**
 * Extract the resource type from the URL path.
 * e.g., /api/pd/admin/verifications/pd_kyc_xxx/approve → 'verifications'
 */
function extractResourceType(url: string): string {
  const parts = url.replace(/^\/api\/pd\/admin\//, '').split('/');
  return parts[0] ?? 'unknown';
}

/**
 * Extract the resource ID from the URL path.
 * e.g., /api/pd/admin/verifications/pd_kyc_xxx/approve → 'pd_kyc_xxx'
 */
function extractResourceId(url: string): string | null {
  const parts = url.replace(/^\/api\/pd\/admin\//, '').split('/');
  // Look for a pd_ prefixed ID
  for (const part of parts) {
    if (part.startsWith('pd_')) return part;
  }
  return parts[1] ?? null;
}
