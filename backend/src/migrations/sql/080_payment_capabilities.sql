-- PandaMarket payment capability contract (P0-02)
-- Records the server capability snapshot selected at checkout. The value is a
-- non-secret digest; credentials and provider configuration are never stored on
-- the order or returned to the buyer.

ALTER TABLE pd_order
  ADD COLUMN IF NOT EXISTS payment_capability_version VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_order_payment_capability_version
  ON pd_order(payment_capability_version)
  WHERE payment_capability_version IS NOT NULL;
