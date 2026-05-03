/**
 * Sentry error reporting integration.
 *
 * Captures unhandled errors, 5xx responses, and BullMQ worker failures.
 * Disabled when PD_SENTRY_DSN is not set (e.g. local dev).
 *
 * Usage:
 *   import { initSentry, captureException, sentryRequestHandler, sentryErrorHandler } from './utils/sentry';
 *   initSentry();                          // call once at startup
 *   app.use(sentryRequestHandler());       // before routes
 *   app.use(sentryErrorHandler());         // after routes, before custom errorHandler
 */

import { config } from '../config';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Lazy-loaded Sentry SDK (only imported when DSN is configured)
// ---------------------------------------------------------------------------

let Sentry: typeof import('@sentry/node') | null = null;

export function isSentryEnabled(): boolean {
  return !!config.sentryDsn;
}

/**
 * Initialise Sentry. Safe to call even when DSN is empty (no-op).
 */
export async function initSentry(): Promise<void> {
  if (!config.sentryDsn) {
    logger.info('Sentry DSN not configured — error reporting disabled.');
    return;
  }

  try {
    Sentry = await import('@sentry/node');

    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.env,
      release: `pandamarket-backend@${process.env.npm_package_version ?? '0.1.0'}`,
      tracesSampleRate: config.env === 'production' ? 0.2 : 1.0,
      // Do not send PII by default
      sendDefaultPii: false,
      // Ignore expected client errors
      ignoreErrors: [
        'PdValidationError',
        'PdAuthenticationError',
        'PdForbiddenError',
        'PdNotFoundError',
        'PdConflictError',
        'PdRateLimitError',
        'PdQuotaExceededError',
      ],
      beforeSend(event) {
        // Strip sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-pd-api-key'];
        }
        return event;
      },
    });

    logger.info('Sentry initialised successfully.');
  } catch (err) {
    logger.warn({ err }, 'Failed to initialise Sentry — continuing without error reporting.');
  }
}

/**
 * Capture an exception in Sentry with optional extra context.
 */
export function captureException(
  err: Error,
  context?: Record<string, unknown>,
): void {
  if (!Sentry) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry!.captureException(err);
  });
}

/**
 * Capture a message in Sentry.
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
): void {
  if (!Sentry) return;
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for the current scope (call after auth middleware).
 */
export function setUser(user: { id: string; role: string; store_id?: string | null }): void {
  if (!Sentry) return;
  Sentry.setUser({ id: user.id, role: user.role, store_id: user.store_id ?? undefined } as Record<string, string | undefined>);
}

/**
 * Express request handler — adds request context to Sentry events.
 * Place BEFORE your routes.
 */
export function sentryRequestHandler() {
  if (!Sentry) {
    // Return a no-op middleware
    return (_req: unknown, _res: unknown, next: () => void) => next();
  }
  return Sentry.Handlers.requestHandler({ ip: true });
}

/**
 * Express error handler — reports unhandled errors to Sentry.
 * Place AFTER your routes but BEFORE your custom error handler.
 */
export function sentryErrorHandler() {
  if (!Sentry) {
    return (_err: unknown, _req: unknown, _res: unknown, next: () => void) => next();
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error: Error & { httpStatus?: number }) {
      // Only report 5xx errors to Sentry (client errors are expected)
      const status = error.httpStatus ?? 500;
      return status >= 500;
    },
  });
}
