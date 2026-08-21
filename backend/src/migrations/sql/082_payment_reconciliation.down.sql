ALTER TABLE pd_payment_attempt
  DROP CONSTRAINT IF EXISTS chk_payment_attempt_compensation_status,
  DROP CONSTRAINT IF EXISTS chk_payment_attempt_reconciliation_status,
  DROP CONSTRAINT IF EXISTS chk_payment_attempt_provider_state;

DROP INDEX IF EXISTS idx_payment_attempt_compensation_due;
DROP INDEX IF EXISTS idx_payment_attempt_reconciliation_due;

ALTER TABLE pd_payment_attempt
  DROP COLUMN IF EXISTS compensation_reason,
  DROP COLUMN IF EXISTS provider_expected_currency,
  DROP COLUMN IF EXISTS provider_expected_amount_minor,
  DROP COLUMN IF EXISTS compensated_at,
  DROP COLUMN IF EXISTS compensation_status,
  DROP COLUMN IF EXISTS last_reconciliation_error,
  DROP COLUMN IF EXISTS last_reconciliation_at,
  DROP COLUMN IF EXISTS next_reconciliation_at,
  DROP COLUMN IF EXISTS reconciliation_attempts,
  DROP COLUMN IF EXISTS reconciliation_status,
  DROP COLUMN IF EXISTS provider_state;
