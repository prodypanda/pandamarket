/**
 * CSRF protection using the double-submit cookie pattern.
 *
 * How it works:
 * 1. On every response, we set a `pd_csrf` cookie with a random token.
 * 2. On state-changing requests (POST, PUT, DELETE, PATCH), we require
 *    the client to send the same token in the `X-CSRF-Token` header.
 * 3. If the header doesn't match the cookie, we reject the request.
 *
 * This works because:
 * - A cross-origin attacker can cause the browser to send cookies,
 *   but cannot read them (same-origin policy).
 * - Therefore, the attacker cannot set the X-CSRF-Token header.
 */

import { RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';
import { PdForbiddenError, PdErrorCode } from '../errors';
import { config } from '../config';

const CSRF_COOKIE = 'pd_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Middleware that sets the CSRF cookie on every response
 * and validates it on state-changing requests.
 *
 * Skips validation for:
 * - Safe HTTP methods (GET, HEAD, OPTIONS)
 * - Requests authenticated via API key (X-PD-API-Key header)
 * - Webhook callback routes (they use HMAC verification instead)
 */
export const csrfProtection: RequestHandler = (req, res, next) => {
  // Always set/refresh the CSRF cookie
  let csrfToken = req.cookies?.[CSRF_COOKIE];
  if (!csrfToken) {
    csrfToken = randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, csrfToken, {
      httpOnly: false, // Must be readable by JS to set the header
      secure: config.env === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  // Skip validation for safe methods
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Skip for API-key authenticated requests (external vendor API)
  if (req.headers['x-pd-api-key']) {
    return next();
  }

  // Skip for webhook routes (they use HMAC)
  if (req.path.includes('/webhook/') || req.path.includes('/callback')) {
    return next();
  }

  // Validate: header must match cookie
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;
  if (!headerToken || headerToken !== csrfToken) {
    return next(
      new PdForbiddenError(
        PdErrorCode.PERM_FORBIDDEN,
        'CSRF token mismatch. Please refresh the page and try again.',
      ),
    );
  }

  next();
};
