/**
 * Custom error classes for PandaMarket.
 *
 * Hierarchy:
 *   PdError (base, http_status + code + details)
 *     PdValidationError      400
 *     PdAuthenticationError  401
 *     PdForbiddenError       403
 *     PdNotFoundError        404
 *     PdConflictError        409
 *     PdQuotaExceededError   403
 *     PdRateLimitError       429
 *     PdInternalError        500
 *     PdServiceUnavailable   503
 *
 * Always throw a `PdError` subclass; never throw a plain `Error` in app code.
 */

import { PdErrorCode, PdErrorCodeValue } from '@pandamarket/types';

export class PdError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: PdErrorCodeValue | string,
    message: string,
    httpStatus: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// =====================================================
// 400 — Validation
// =====================================================
export class PdValidationError extends PdError {
  constructor(message = 'Invalid input data', details?: Record<string, unknown>) {
    super(PdErrorCode.VALIDATION_ERROR, message, 400, details);
  }
}

// =====================================================
// 401 — Authentication
// =====================================================
export class PdAuthenticationError extends PdError {
  constructor(
    code: PdErrorCodeValue = PdErrorCode.AUTH_TOKEN_INVALID,
    message = 'Authentication required',
    details?: Record<string, unknown>,
  ) {
    super(code, message, 401, details);
  }
}

// =====================================================
// 403 — Permission / Quota
// =====================================================
export class PdForbiddenError extends PdError {
  constructor(
    code: PdErrorCodeValue = PdErrorCode.PERM_FORBIDDEN,
    message = 'Forbidden',
    details?: Record<string, unknown>,
  ) {
    super(code, message, 403, details);
  }
}

export class PdQuotaExceededError extends PdError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(PdErrorCode.PRODUCT_QUOTA_EXCEEDED, message, 403, details);
  }
}

export class PdPlanRequiredError extends PdError {
  constructor(requiredPlan: string, currentPlan: string) {
    super(
      PdErrorCode.PERM_PLAN_REQUIRED,
      `This feature requires the ${requiredPlan} plan minimum`,
      403,
      { required_plan: requiredPlan, current_plan: currentPlan },
    );
  }
}

// =====================================================
// 404 — Not Found
// =====================================================
export class PdNotFoundError extends PdError {
  constructor(
    code: PdErrorCodeValue = PdErrorCode.NOT_FOUND,
    message = 'Resource not found',
    details?: Record<string, unknown>,
  ) {
    super(code, message, 404, details);
  }
}

// =====================================================
// 409 — Conflict
// =====================================================
export class PdConflictError extends PdError {
  constructor(
    code: PdErrorCodeValue,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(code, message, 409, details);
  }
}

// =====================================================
// 429 — Rate Limit
// =====================================================
export class PdRateLimitError extends PdError {
  constructor(retryAfterSeconds: number) {
    super(PdErrorCode.RATE_LIMITED, 'Too many requests', 429, {
      retry_after: retryAfterSeconds,
    });
  }
}

// =====================================================
// 500 — Internal
// =====================================================
export class PdInternalError extends PdError {
  constructor(message = 'Internal server error', details?: Record<string, unknown>) {
    super(PdErrorCode.INTERNAL_ERROR, message, 500, details);
  }
}

// =====================================================
// 503 — Service Unavailable
// =====================================================
export class PdServiceUnavailableError extends PdError {
  constructor(message = 'Service temporarily unavailable') {
    super(PdErrorCode.SERVICE_UNAVAILABLE, message, 503);
  }
}

// Re-export the codes catalogue for convenience
export { PdErrorCode };
