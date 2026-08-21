-- =====================================================
-- PandaMarket - Migration 082
-- Payment initialization compensation and reconciliation state
-- =====================================================

ALTER TABLE pd_payment_attempt
  ADD COLUMN IF NOT EXISTS provider_state VARCHAR(32) NOT NULL DEFAULT 'not_created',
  ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(32) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS reconciliation_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_reconciliation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reconciliation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reconciliation_error TEXT,
  ADD COLUMN IF NOT EXISTS compensation_status VARCHAR(32) NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS compensated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS compensation_reason TEXT,
  ADD COLUMN IF NOT EXISTS provider_expected_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS provider_expected_currency VARCHAR(10);

UPDATE pd_payment_attempt
SET provider_state = CASE
      WHEN status IN ('initialized', 'captured') THEN 'created'
      ELSE provider_state
    END,
    reconciliation_status = CASE
      WHEN status IN ('initialized', 'captured') THEN 'none'
      ELSE reconciliation_status
    END;

CREATE INDEX IF NOT EXISTS idx_payment_attempt_reconciliation_due
  ON pd_payment_attempt(reconciliation_status, next_reconciliation_at)
  WHERE reconciliation_status IN ('queued', 'pending');

CREATE INDEX IF NOT EXISTS idx_payment_attempt_compensation_due
  ON pd_payment_attempt(compensation_status, updated_at)
  WHERE compensation_status = 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_payment_attempt_provider_state'
  ) THEN
    ALTER TABLE pd_payment_attempt
      ADD CONSTRAINT chk_payment_attempt_provider_state
      CHECK (provider_state IN ('not_created', 'unknown', 'created', 'captured')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_payment_attempt_reconciliation_status'
  ) THEN
    ALTER TABLE pd_payment_attempt
      ADD CONSTRAINT chk_payment_attempt_reconciliation_status
      CHECK (reconciliation_status IN ('none', 'queued', 'pending', 'resolved', 'manual_review')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_payment_attempt_compensation_status'
  ) THEN
    ALTER TABLE pd_payment_attempt
      ADD CONSTRAINT chk_payment_attempt_compensation_status
      CHECK (compensation_status IN ('not_required', 'pending', 'completed', 'manual_review')) NOT VALID;
  END IF;
END $$;
