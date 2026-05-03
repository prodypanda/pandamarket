-- =====================================================
-- PandaMarket — Migration 002
-- Payment idempotency + outgoing vendor webhook subscriptions
-- =====================================================
-- Purpose:
--   1. Prevent duplicate processing of payment webhook events
--      (Flouci/Konnect retry aggressively — without an event log we
--      would credit vendor wallets multiple times).
--   2. Persist vendor webhook subscriptions + delivery attempts so the
--      outgoing webhook dispatcher worker can implement a 3-retry policy.
-- =====================================================

-- ----------------------------------------------------
-- Inbound payment events (idempotency log)
-- ----------------------------------------------------
-- One row per (gateway, gateway_event_id) pair.
-- The provider's own ID is stored in `gateway_event_id` and protected
-- by a UNIQUE constraint so concurrent webhook deliveries cannot
-- both succeed.
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_payment_event (
  id                  VARCHAR(64) PRIMARY KEY,
  gateway             VARCHAR(20) NOT NULL,
    -- 'flouci' | 'konnect' | 'manual_mandat' | 'cod'
  gateway_event_id    VARCHAR(255) NOT NULL,
    -- Flouci payment_id, Konnect paymentRef, etc.
  order_id            VARCHAR(64) REFERENCES pd_order(id) ON DELETE SET NULL,
  status              VARCHAR(20) NOT NULL,
    -- 'received' | 'processed' | 'failed' | 'duplicate'
  amount              DECIMAL(12,3),
  signature_valid     BOOLEAN,
  raw_payload         JSONB,
  error_message       TEXT,
  source_ip           INET,
  processed_at        TIMESTAMP,
  created_at          TIMESTAMP DEFAULT NOW(),

  -- Hard idempotency guarantee
  UNIQUE (gateway, gateway_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_event_order
  ON pd_payment_event(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_event_status
  ON pd_payment_event(status);
CREATE INDEX IF NOT EXISTS idx_payment_event_created
  ON pd_payment_event(created_at DESC);

-- ----------------------------------------------------
-- Outgoing vendor webhook subscriptions
-- ----------------------------------------------------
-- A vendor can subscribe their ERP/POS to one or more events.
-- Secret is used to sign each delivery (HMAC-SHA256).
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_webhook_subscription (
  id              VARCHAR(64) PRIMARY KEY,
  store_id        VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  secret          VARCHAR(128) NOT NULL,
    -- random 64-byte hex; shown ONCE on creation
  events          JSONB NOT NULL DEFAULT '[]',
    -- e.g. ["pd.order.placed","pd.order.fulfilled","pd.stock.low"]
  is_active       BOOLEAN DEFAULT true,
  last_delivery_at TIMESTAMP,
  last_status_code INTEGER,
  consecutive_failures INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_sub_store
  ON pd_webhook_subscription(store_id);
CREATE INDEX IF NOT EXISTS idx_webhook_sub_active
  ON pd_webhook_subscription(is_active) WHERE is_active = true;

-- ----------------------------------------------------
-- Outgoing webhook delivery attempts (audit trail)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_webhook_delivery (
  id              VARCHAR(64) PRIMARY KEY,
  subscription_id VARCHAR(64) NOT NULL REFERENCES pd_webhook_subscription(id) ON DELETE CASCADE,
  event_type      VARCHAR(50) NOT NULL,
  payload         JSONB NOT NULL,
  attempt         INTEGER NOT NULL DEFAULT 1,
  status_code     INTEGER,
  response_body   TEXT,
  error           TEXT,
  delivered_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_subscription
  ON pd_webhook_delivery(subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_created
  ON pd_webhook_delivery(created_at DESC);

-- ----------------------------------------------------
-- Audit log (sensitive admin actions)
-- ----------------------------------------------------
-- Append-only — required by security guide §1.3 / §6.
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_audit_log (
  id              VARCHAR(64) PRIMARY KEY,
  actor_id        VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  actor_role      VARCHAR(20),
  action          VARCHAR(80) NOT NULL,
    -- e.g. 'kyc.approve', 'kyc.reject', 'mandat.approve',
    -- 'store.suspend', 'store.unsuspend', 'plan.change', 'payout.process'
  resource_type   VARCHAR(40),
  resource_id     VARCHAR(64),
  ip              INET,
  user_agent      TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON pd_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON pd_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource
  ON pd_audit_log(resource_type, resource_id);

-- Wire updated_at trigger on the new mutable table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'pd_set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_pd_webhook_subscription_updated_at ON pd_webhook_subscription;
    CREATE TRIGGER trg_pd_webhook_subscription_updated_at
      BEFORE UPDATE ON pd_webhook_subscription
      FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();
  END IF;
END $$;
