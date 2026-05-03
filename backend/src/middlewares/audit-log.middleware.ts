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

// Fields to redact from the request body before logging
const REDACT_FIELDS = new Set([
  'password',
  'password_hash',
  'token',
  'secret',
  'api_key',
  'flouci_app_secret',
  'konnect_api_key',
  'access_token',
  'refresh_token',
]);

function redactBody(body: Record<string, unknown>): Record<string, unknown> {
  if (!body || typeof body !== 'object') return body;
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (REDACT_FIELDS.has(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      redacted[key] = redactBody(value as Record<string, unknown>);
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

  // Only log if user is authenticated
  if (!req.user?.id) {
    return next();
  }

  // Capture the original end method to log after response
  const originalEnd = res.end;
  const startTime = Date.now();

  res.end = function (this: Response, ...args: Parameters<typeof originalEnd>) {
    const duration = Date.now() - startTime;

    // Fire and forget — don't block the response
    const logEntry = {
      id: pdId('audit'),
      user_id: req.user!.id,
      action: `${req.method} ${req.originalUrl}`,
      resource_type: extractResourceType(req.originalUrl),
      resource_id: extractResourceId(req.originalUrl),
      details: JSON.stringify({
        method: req.method,
        path: req.originalUrl,
        body: req.body ? redactBody(req.body) : null,
        status_code: res.statusCode,
        duration_ms: duration,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
      }),
      ip_address: req.ip ?? null,
    };

    query(
      `INSERT INTO pd_audit_log (id, user_id, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7::inet)`,
      [
        logEntry.id,
        logEntry.user_id,
        logEntry.action,
        logEntry.resource_type,
        logEntry.resource_id,
        logEntry.details,
        logEntry.ip_address,
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
