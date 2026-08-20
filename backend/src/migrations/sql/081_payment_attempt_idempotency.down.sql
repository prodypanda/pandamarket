DROP TRIGGER IF EXISTS trg_pd_payment_attempt_binding_immutable ON pd_payment_attempt;
DROP FUNCTION IF EXISTS pd_payment_attempt_binding_immutable();

DROP INDEX IF EXISTS idx_payment_attempt_initializing;
DROP INDEX IF EXISTS idx_payment_attempt_order_idempotency;

ALTER TABLE pd_payment_attempt
  DROP CONSTRAINT IF EXISTS chk_payment_attempt_idempotency_binding;

ALTER TABLE pd_payment_attempt
  DROP COLUMN IF EXISTS failure_message,
  DROP COLUMN IF EXISTS failure_code,
  DROP COLUMN IF EXISTS failed_at,
  DROP COLUMN IF EXISTS initialized_at,
  DROP COLUMN IF EXISTS initializing_started_at,
  DROP COLUMN IF EXISTS provider_response,
  DROP COLUMN IF EXISTS capability_version,
  DROP COLUMN IF EXISTS quote_version,
  DROP COLUMN IF EXISTS quote_id,
  DROP COLUMN IF EXISTS request_fingerprint,
  DROP COLUMN IF EXISTS idempotency_key;
