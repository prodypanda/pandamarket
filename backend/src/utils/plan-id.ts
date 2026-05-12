import { PdValidationError } from '../errors';

export const PLAN_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,18}[a-z0-9])?$/;

export function normalizePlanId(value: string): string {
  const planId = value.trim().toLowerCase();
  if (!PLAN_ID_PATTERN.test(planId)) {
    throw new PdValidationError('Plan ID must use 1-20 lowercase letters, numbers, or hyphens, and cannot start or end with a hyphen', {
      field: 'plan_id',
    });
  }
  return planId;
}
