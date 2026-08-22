-- Migration 083: carrier integrations, shipment reconciliation, and COD operations
--
-- External carrier credentials and endpoint paths remain environment-only. The
-- tables below persist provider references and immutable event history so a
-- timeout, duplicate webhook, or worker restart cannot lose fulfillment state.

ALTER TABLE pd_shipment
  ADD COLUMN IF NOT EXISTS provider_reference VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS next_sync_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sync_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

ALTER TABLE pd_fulfillment
  ADD COLUMN IF NOT EXISTS rto_reason_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS rto_notes TEXT,
  ADD COLUMN IF NOT EXISTS rto_at TIMESTAMP;

-- Keep this index non-unique for legacy compatibility: older simulated rows
-- may legitimately reuse a tracking number. Webhook lookup is deterministic
-- (newest matching shipment wins), while provider references remain stored for
-- reconciliation and support investigations.
CREATE INDEX IF NOT EXISTS idx_shipment_provider_tracking
  ON pd_shipment(provider, tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipment_reconciliation_due
  ON pd_shipment(next_sync_at)
  WHERE next_sync_at IS NOT NULL AND status IN ('created', 'picked_up', 'in_transit', 'out_for_delivery');

CREATE TABLE IF NOT EXISTS pd_shipment_event (
  id                  VARCHAR(64) PRIMARY KEY,
  shipment_id         VARCHAR(64) NOT NULL REFERENCES pd_shipment(id) ON DELETE CASCADE,
  provider_event_id   VARCHAR(255),
  status              VARCHAR(30) NOT NULL,
  location            TEXT,
  description         TEXT,
  occurred_at         TIMESTAMP NOT NULL,
  source              VARCHAR(20) NOT NULL DEFAULT 'carrier',
  raw_payload         JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (shipment_id, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_shipment_event_shipment_time
  ON pd_shipment_event(shipment_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS pd_shipment_reconciliation (
  id                  VARCHAR(64) PRIMARY KEY,
  shipment_id         VARCHAR(64) NOT NULL REFERENCES pd_shipment(id) ON DELETE CASCADE,
  action              VARCHAR(30) NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempt_count       INTEGER NOT NULL DEFAULT 0,
  next_attempt_at     TIMESTAMP,
  provider_status     VARCHAR(30),
  last_error          TEXT,
  resolved_at         TIMESTAMP,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (shipment_id, action)
);

CREATE INDEX IF NOT EXISTS idx_shipment_reconciliation_due_jobs
  ON pd_shipment_reconciliation(status, next_attempt_at)
  WHERE status IN ('pending', 'retry');

CREATE TABLE IF NOT EXISTS pd_cod_verification (
  id                  VARCHAR(64) PRIMARY KEY,
  order_id            VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  store_id            VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
  call_attempts       INTEGER NOT NULL DEFAULT 0,
  last_call_at        TIMESTAMP,
  otp_code            VARCHAR(20),
  otp_sent_at         TIMESTAMP,
  otp_verified_at     TIMESTAMP,
  risk_score          NUMERIC(5,2) NOT NULL DEFAULT 0,
  risk_factors        JSONB NOT NULL DEFAULT '[]',
  notes               TEXT,
  verified_by         VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_cod_verification_store_status
  ON pd_cod_verification(store_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS pd_courier_settlement (
  id                    VARCHAR(64) PRIMARY KEY,
  store_id              VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  order_id              VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  carrier               VARCHAR(64) NOT NULL,
  tracking_number       VARCHAR(128),
  collected_amount      NUMERIC(12,3) NOT NULL DEFAULT 0,
  courier_fee           NUMERIC(12,3) NOT NULL DEFAULT 0,
  net_payout            NUMERIC(12,3) NOT NULL DEFAULT 0,
  status                VARCHAR(20) NOT NULL DEFAULT 'pending',
  settled_at            TIMESTAMP,
  settlement_reference  VARCHAR(128),
  notes                 TEXT,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_courier_settlement_store_status
  ON pd_courier_settlement(store_id, status, created_at DESC);

DO $$
BEGIN
  IF to_regprocedure('pd_set_updated_at()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_pd_shipment_updated_at ON pd_shipment;
    CREATE TRIGGER trg_pd_shipment_updated_at BEFORE UPDATE ON pd_shipment
      FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();
    DROP TRIGGER IF EXISTS trg_pd_shipment_reconciliation_updated_at ON pd_shipment_reconciliation;
    CREATE TRIGGER trg_pd_shipment_reconciliation_updated_at BEFORE UPDATE ON pd_shipment_reconciliation
      FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();
    DROP TRIGGER IF EXISTS trg_pd_cod_verification_updated_at ON pd_cod_verification;
    CREATE TRIGGER trg_pd_cod_verification_updated_at BEFORE UPDATE ON pd_cod_verification
      FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();
    DROP TRIGGER IF EXISTS trg_pd_courier_settlement_updated_at ON pd_courier_settlement;
    CREATE TRIGGER trg_pd_courier_settlement_updated_at BEFORE UPDATE ON pd_courier_settlement
      FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();
  END IF;
END;
$$;
