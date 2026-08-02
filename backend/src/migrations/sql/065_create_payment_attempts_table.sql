-- =====================================================
-- PandaMarket — Migration 065
-- Payment Attempts Tracking Table (GAP-P0-003)
-- =====================================================
-- Purpose:
--   Binds payment webhook captures strictly to initialized local payment attempts.
--   Prevents amount tampering, currency mismatches, and untrusted order ID injection.
-- =====================================================

CREATE TABLE IF NOT EXISTS pd_payment_attempt (
  id                      VARCHAR(64) PRIMARY KEY,
  order_id                VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  gateway                 VARCHAR(64) NOT NULL,
  gateway_reference       VARCHAR(255) UNIQUE NOT NULL,
  expected_amount_minor   BIGINT NOT NULL,
  expected_currency       VARCHAR(10) NOT NULL,
  merchant_account_id     VARCHAR(255),
  status                  VARCHAR(32) NOT NULL DEFAULT 'initialized',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempt_gateway_ref
  ON pd_payment_attempt(gateway, gateway_reference);

CREATE INDEX IF NOT EXISTS idx_payment_attempt_order
  ON pd_payment_attempt(order_id);

CREATE INDEX IF NOT EXISTS idx_payment_attempt_status
  ON pd_payment_attempt(status);

-- Wire updated_at trigger if helper function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'pd_set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_pd_payment_attempt_updated_at ON pd_payment_attempt;
    CREATE TRIGGER trg_pd_payment_attempt_updated_at
      BEFORE UPDATE ON pd_payment_attempt
      FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();
  END IF;
END $$;
