-- =====================================================
-- PandaMarket - Migration 081
-- Payment attempt idempotency and immutable financial binding
-- =====================================================

ALTER TABLE pd_payment_attempt
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
  ADD COLUMN IF NOT EXISTS request_fingerprint VARCHAR(64),
  ADD COLUMN IF NOT EXISTS capability_version VARCHAR(80),
  ADD COLUMN IF NOT EXISTS quote_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS quote_version INTEGER,
  ADD COLUMN IF NOT EXISTS provider_response JSONB,
  ADD COLUMN IF NOT EXISTS initializing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS initialized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_code VARCHAR(80),
  ADD COLUMN IF NOT EXISTS failure_message TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempt_order_idempotency
  ON pd_payment_attempt(order_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempt_initializing
  ON pd_payment_attempt(order_id, status, initializing_started_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_payment_attempt_idempotency_binding'
  ) THEN
    ALTER TABLE pd_payment_attempt
      ADD CONSTRAINT chk_payment_attempt_idempotency_binding
      CHECK (
        idempotency_key IS NULL
        OR (
          request_fingerprint IS NOT NULL
          AND capability_version IS NOT NULL
          AND request_fingerprint ~ '^[a-f0-9]{64}$'
          AND capability_version ~ '^pcv1_[a-f0-9]{64}$'
        )
      ) NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION pd_payment_attempt_binding_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.order_id IS DISTINCT FROM NEW.order_id
     OR OLD.gateway IS DISTINCT FROM NEW.gateway
     OR OLD.expected_amount_minor IS DISTINCT FROM NEW.expected_amount_minor
     OR OLD.expected_currency IS DISTINCT FROM NEW.expected_currency
     OR OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key
     OR OLD.request_fingerprint IS DISTINCT FROM NEW.request_fingerprint
     OR OLD.capability_version IS DISTINCT FROM NEW.capability_version
     OR OLD.quote_id IS DISTINCT FROM NEW.quote_id
     OR OLD.quote_version IS DISTINCT FROM NEW.quote_version
     OR OLD.merchant_account_id IS DISTINCT FROM NEW.merchant_account_id
  THEN
    RAISE EXCEPTION 'Payment attempt financial binding is immutable'
      USING ERRCODE = '23514';
  END IF;

  -- The provider reference is unknown during the short local reservation.
  -- Permit exactly one transition from the local pending marker to the
  -- provider reference when the reservation becomes initialized.
  IF OLD.gateway_reference IS DISTINCT FROM NEW.gateway_reference
     AND NOT (
       OLD.status = 'initializing'
       AND NEW.status = 'initialized'
       AND OLD.gateway_reference LIKE 'pending_%'
     )
  THEN
    RAISE EXCEPTION 'Payment attempt gateway reference is immutable'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pd_payment_attempt_binding_immutable ON pd_payment_attempt;
CREATE TRIGGER trg_pd_payment_attempt_binding_immutable
  BEFORE UPDATE ON pd_payment_attempt
  FOR EACH ROW EXECUTE FUNCTION pd_payment_attempt_binding_immutable();
