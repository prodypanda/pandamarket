/**
 * Express middlewares.
 */

import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { randomUUID } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { verifyAccessToken } from '../utils/jwt';
import { logger, childLogger } from '../utils/logger';
import { redisRateLimitStore } from './rate-limit-store';
import {
  PdAuthenticationError,
  PdError,
  PdErrorCode,
  PdForbiddenError,
  PdInternalError,
  PdValidationError,
} from '../errors';
import { UserRole } from '@pandamarket/types';
import { adminCapabilityService } from '../services/admin-capability.service';
import { apiKeyService } from '../services/api-key.service';
import { systemLogService } from '../services/system-log.service';
import { captureException, setUser } from '../utils/sentry';
import { query } from '../db/pool';

const SELECTED_STORE_COOKIE = 'pd_selected_store_id';

// =====================================================
// Request ID + access logging
// =====================================================

export const requestId: RequestHandler = (req, res, next) => {
  const id =
    (req.headers['x-request-id'] as string | undefined) ?? randomUUID().slice(0, 12);
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};

export const accessLog: RequestHandler = (req, res, next) => {
  const start = Date.now();
  const log = childLogger({ request_id: req.requestId });
  res.on('finish', () => {
    const duration = Date.now() - start;
    log.info(
      {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: duration,
        user_id: req.user?.id,
      },
      'request',
    );
  });
  next();
};

// =====================================================
// Auth — JWT
// =====================================================

/** Extracts a Bearer token from Authorization header or `pd_at` cookie. */
function extractAccessToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && /^Bearer\s/.test(header)) return header.slice(7);
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies
    ?.pd_at;
  return cookieToken ?? null;
}

function extractStorefrontAccessToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && /^Bearer\s/.test(header)) return header.slice(7);
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies
    ?.pd_storefront_at;
  return cookieToken ?? null;
}

/**
 * Hard-required auth — throws 401 if no/invalid token.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = extractAccessToken(req);
  if (!token) {
    return next(
      new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_INVALID, 'Authentication required'),
    );
  }
  try {
    const payload = verifyAccessToken(token);
    if ((payload as any).token_type === 'storefront_customer' || (payload as any).role === 'storefront_customer') {
      return next(
        new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Storefront customer token cannot access marketplace APIs'),
      );
    }
    req.user = {
      id: payload.sub,
      role: payload.role,
      store_id: payload.store_id,
      session_id: payload.session_id ?? null,
    };
    // Set Sentry user context for error attribution
    setUser({ id: payload.sub, role: payload.role, store_id: payload.store_id });
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional auth — populates `req.user` if a valid token is present, otherwise no-op.
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = extractAccessToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    if ((payload as any).token_type === 'storefront_customer' || (payload as any).role === 'storefront_customer') {
      return next();
    }
    req.user = { id: payload.sub, role: payload.role, store_id: payload.store_id, session_id: payload.session_id ?? null };
  } catch {
    // ignore — anonymous request
  }
  next();
};

export const requireStorefrontCustomer: RequestHandler = async (req, _res, next) => {
  const token = extractStorefrontAccessToken(req);
  if (!token) {
    return next(
      new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_INVALID, 'Storefront authentication required'),
    );
  }
  try {
    const payload = verifyAccessToken(token);
    if (payload.role !== UserRole.Customer || !payload.store_id) {
      return next(
        new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_INVALID, 'Invalid storefront session'),
      );
    }
    // If x-store-id header is provided, ensure it matches session store_id
    const headerStoreId = req.headers['x-store-id'] as string | undefined;
    if (headerStoreId && headerStoreId !== payload.store_id) {
      return next(
        new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Storefront session does not match this store'),
      );
    }
    const { rows } = await query<{ is_active: boolean }>(
      'SELECT is_active FROM pd_storefront_customer WHERE id = $1 AND store_id = $2',
      [payload.sub, payload.store_id],
    );
    if (!rows[0] || !rows[0].is_active) {
      return next(
        new PdAuthenticationError(PdErrorCode.AUTH_ACCOUNT_SUSPENDED, 'Account disabled or invalid session'),
      );
    }
    req.storefrontCustomer = {
      id: payload.sub,
      store_id: payload.store_id,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Require one of the given roles.
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new PdAuthenticationError());
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new PdForbiddenError(
          PdErrorCode.PERM_FORBIDDEN,
          `This endpoint requires one of: ${roles.join(', ')}`,
          { required_roles: roles, current_role: req.user.role },
        ),
      );
    }
    next();
  };
}

export const requireAdmin: RequestHandler = requireRole(UserRole.Admin, UserRole.SuperAdmin);
export const requireSuperAdmin: RequestHandler = requireRole(UserRole.SuperAdmin);
export const requireVendor: RequestHandler = requireRole(UserRole.Vendor);

/**
 * Require specific administrative capabilities (RBAC). SuperAdmin bypasses all capability checks.
 */
export function requireCapability(...capabilities: string[]): RequestHandler {
  return async (req, _res, next) => {
    if (!req.user) {
      return next(new PdAuthenticationError());
    }
    if (req.user.role === UserRole.SuperAdmin) {
      return next();
    }
    if (req.user.role !== UserRole.Admin) {
      return next(
        new PdForbiddenError(
          PdErrorCode.PERM_FORBIDDEN,
          'Admin privileges required',
        ),
      );
    }

    try {
      const userCaps = await adminCapabilityService.getUserCapabilities(req.user.id);
      const hasAny = capabilities.some((cap) => userCaps.includes(cap));
      if (!hasAny) {
        return next(
          new PdForbiddenError(
            PdErrorCode.PERM_FORBIDDEN,
            `Required capability missing: ${capabilities.join(' or ')}`,
            { required_capabilities: capabilities, user_capabilities: userCaps },
          ),
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Require that the authenticated vendor has a store and return it.
 */
export const requireStore: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    const token = extractAccessToken(req);
    if (!token) return next(new PdAuthenticationError());
    try {
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.sub,
        role: payload.role,
        store_id: payload.store_id,
        session_id: payload.session_id ?? null,
      };
      setUser({ id: payload.sub, role: payload.role, store_id: payload.store_id });
    } catch (err) {
      return next(err);
    }
  }

  try {
    const selectedStoreId = (req as Request & { cookies?: Record<string, string> }).cookies
      ?.[SELECTED_STORE_COOKIE];
    if (selectedStoreId) {
      const { rows } = await query<{ id: string }>(
        'SELECT id FROM pd_store WHERE id = $1 AND owner_id = $2',
        [selectedStoreId, req.user.id],
      );
      if (rows[0]) {
        req.user.store_id = rows[0].id;
        setUser({ id: req.user.id, role: req.user.role, store_id: req.user.store_id });
        return next();
      }
      res.clearCookie(SELECTED_STORE_COOKIE, { path: '/' });
    }

    if (req.user.store_id) {
      const { rows } = await query<{ id: string }>(
        'SELECT id FROM pd_store WHERE id = $1 AND owner_id = $2',
        [req.user.store_id, req.user.id],
      );
      if (rows[0]) {
        req.user.store_id = rows[0].id;
        return next();
      }
    }

    const { rows } = await query<{ id: string }>(
      `SELECT id
       FROM pd_store
       WHERE owner_id = $1
       ORDER BY created_at ASC
       LIMIT 1`,
      [req.user.id],
    );
    if (!rows[0]) {
      return next(
        new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'You do not own a store'),
      );
    }
    req.user.store_id = rows[0].id;
    setUser({ id: req.user.id, role: req.user.role, store_id: req.user.store_id });
    return next();
  } catch (err) {
    return next(err);
  }
};

// =====================================================
// API Key auth (vendor external API)
// =====================================================

export const requireApiKey: RequestHandler = async (req, _res, next) => {
  const header = req.headers['x-pd-api-key'];
  if (!header || typeof header !== 'string') {
    return next(
      new PdAuthenticationError(PdErrorCode.KEY_INVALID, 'Missing X-PD-API-Key header'),
    );
  }
  try {
    const key = await apiKeyService.verify(header);
    req.apiKey = { id: key.id, store_id: key.store_id, scopes: key.scopes };
    next();
  } catch (err) {
    next(err);
  }
};

// =====================================================
// Validation (Zod)
// =====================================================

export function validate<T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body'): RequestHandler {
  return (req, _res, next) => {
    try {
      const data = schema.parse(req[source]);
      // overwrite with the (possibly coerced) parsed value
      (req as unknown as Record<string, unknown>)[source] = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of err.issues) {
          fields[issue.path.join('.')] = issue.message;
        }
        next(new PdValidationError('Invalid input', { fields }));
      } else {
        next(err);
      }
    }
  };
}

// =====================================================
// Rate limiting
// =====================================================

/**
 * Audit P2-22: all limiters share the Redis-backed store (see
 * ./rate-limit-store.ts) so counts survive restarts and span instances.
 */

/**
 * Behind Render's proxy, `req.ip` resolves to an internal 10.x hop — meaning
 * every client shared one bucket (observed live: pd_rl_api:10.x keys). Key by
 * the real client IP from proxy headers instead.
 */
export function clientBucketKey(req: Request): string {
  if (req.user?.id) return `u:${req.user.id}`;
  if ((req as unknown as { apiKey?: { id?: string } }).apiKey?.id)
    return `k:${(req as unknown as { apiKey: { id: string } }).apiKey.id}`;
  const forwarded = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'];
  const xffFirst = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return (
    (typeof forwarded === 'string' ? forwarded : undefined) ||
    xffFirst ||
    req.ip ||
    'unknown'
  );
}

/**
 * Strict rate limit for sensitive auth endpoints (login, register, forgot).
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisRateLimitStore('pd_rl_auth:'),
  keyGenerator: clientBucketKey,
  message: { error: { code: PdErrorCode.RATE_LIMITED, message: 'Too many requests' } },
});

/**
 * Default API rate limit (100 req / minute / IP).
 */
export const adsEventRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisRateLimitStore('pd_rl_adsev:'),
  keyGenerator: clientBucketKey,
  message: { error: { code: PdErrorCode.RATE_LIMITED, message: 'Too many advertising events' } },
});

export const adsDeliveryRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisRateLimitStore('pd_rl_adsdl:'),
  keyGenerator: clientBucketKey,
  message: { error: { code: PdErrorCode.RATE_LIMITED, message: 'Too many advertising requests' } },
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisRateLimitStore('pd_rl_api:'),
  keyGenerator: clientBucketKey,
  message: { error: { code: PdErrorCode.RATE_LIMITED, message: 'Too many requests' } },
});

// =====================================================
// Error handler (must be last)
// =====================================================

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const log = childLogger({ request_id: req.requestId });
  const isPdError = err instanceof PdError || (Boolean(err) && typeof (err as any).httpStatus === 'number' && typeof (err as any).code === 'string');
  if (isPdError) {
    const httpStatus = (err as any).httpStatus || 400;
    const code = (err as any).code || 'PD_VALIDATION_ERROR';
    const message = err.message || 'Validation error';
    const details = (err as any).details;
    res.status(httpStatus).json({
      error: {
        code,
        message,
        ...(details && { details }),
      },
    });
    if (httpStatus >= 500) {
      log.error({ err }, 'Server error');
      systemLogService.captureError(err, req, httpStatus, {
        handled: true,
        details: details ?? null,
      });
    } else log.debug({ err: { code, msg: message } }, 'Client error');
    return;
  }
  // Unknown error — wrap as 500
  log.error({ err }, 'Unhandled error');
  systemLogService.captureError(err, req, 500, { handled: false });
  captureException(err, { request_id: req.requestId, path: req.originalUrl });
  const wrapped = new PdInternalError('Internal server error', { request_id: req.requestId });
  res.status(500).json(wrapped.toJSON());
};

// =====================================================
// Async handler helper
// =====================================================

export function asyncHandler<TReq extends Request = Request, TRes extends Response = Response>(
  fn: (req: TReq, res: TRes, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as TReq, res as TRes, next)).catch(next);
  };
}

export { logger };
