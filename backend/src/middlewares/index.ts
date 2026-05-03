/**
 * Express middlewares.
 */

import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { randomUUID } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { verifyAccessToken } from '../utils/jwt';
import { logger, childLogger } from '../utils/logger';
import {
  PdAuthenticationError,
  PdError,
  PdErrorCode,
  PdForbiddenError,
  PdInternalError,
  PdValidationError,
} from '../errors';
import { UserRole } from '@pandamarket/types';
import { apiKeyService } from '../services/api-key.service';
import { captureException, setUser } from '../utils/sentry';

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
    req.user = {
      id: payload.sub,
      role: payload.role,
      store_id: payload.store_id,
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
    req.user = { id: payload.sub, role: payload.role, store_id: payload.store_id };
  } catch {
    // ignore — anonymous request
  }
  next();
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
export const requireVendor: RequestHandler = requireRole(UserRole.Vendor);

/**
 * Require that the authenticated vendor has a store and return it.
 */
export const requireStore: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new PdAuthenticationError());
  if (!req.user.store_id) {
    return next(
      new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'You do not own a store'),
    );
  }
  next();
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
 * Strict rate limit for sensitive auth endpoints (login, register, forgot).
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: PdErrorCode.RATE_LIMITED, message: 'Too many requests' } },
});

/**
 * Default API rate limit (100 req / minute / IP).
 */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user?.id) return `u:${req.user.id}`;
    if (req.apiKey?.id) return `k:${req.apiKey.id}`;
    return req.ip ?? 'unknown';
  },
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
  if (err instanceof PdError) {
    res.status(err.httpStatus).json(err.toJSON());
    if (err.httpStatus >= 500) log.error({ err }, 'Server error');
    else log.debug({ err: { code: err.code, msg: err.message } }, 'Client error');
    return;
  }
  // Unknown error — wrap as 500
  log.error({ err }, 'Unhandled error');
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
