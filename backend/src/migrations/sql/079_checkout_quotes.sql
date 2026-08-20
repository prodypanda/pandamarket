-- PandaMarket checkout quote contract (P0-01)
-- Additive migration: old orders remain readable and legacy checkout can be
-- rolled out before the frontend starts sending quote_id.

CREATE TABLE IF NOT EXISTS pd_checkout_quote (
  id                         VARCHAR(64) PRIMARY KEY,
  quote_version              INTEGER NOT NULL DEFAULT 1,
  owner_user_id              VARCHAR(64) REFERENCES pd_user(id) ON DELETE CASCADE,
  owner_storefront_customer_id VARCHAR(64) REFERENCES pd_storefront_customer(id) ON DELETE CASCADE,
  store_id                   VARCHAR(64) REFERENCES pd_store(id) ON DELETE CASCADE,
  items                      JSONB NOT NULL DEFAULT '[]'::jsonb,
  shipping_address           JSONB,
  coupon_code                VARCHAR(64),
  currency                   VARCHAR(3) NOT NULL DEFAULT 'TND',
  subtotal                   DECIMAL(12,3) NOT NULL DEFAULT 0,
  discount_total             DECIMAL(12,3) NOT NULL DEFAULT 0,
  shipping_total             DECIMAL(12,3) NOT NULL DEFAULT 0,
  tax_total                  DECIMAL(12,3) NOT NULL DEFAULT 0,
  total                      DECIMAL(12,3) NOT NULL DEFAULT 0,
  breakdown                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_hash              VARCHAR(64) NOT NULL,
  expires_at                 TIMESTAMPTZ NOT NULL,
  consumed_at                TIMESTAMPTZ,
  consumed_order_id          VARCHAR(64),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_checkout_quote_owner CHECK (
    owner_user_id IS NOT NULL OR owner_storefront_customer_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_checkout_quote_owner_user
  ON pd_checkout_quote(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_quote_owner_storefront
  ON pd_checkout_quote(owner_storefront_customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_quote_expiry
  ON pd_checkout_quote(expires_at);
CREATE INDEX IF NOT EXISTS idx_checkout_quote_consumed_order
  ON pd_checkout_quote(consumed_order_id);

ALTER TABLE pd_order
  ADD COLUMN IF NOT EXISTS quote_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS quote_version INTEGER,
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS gross_subtotal DECIMAL(12,3),
  ADD COLUMN IF NOT EXISTS discount_total DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_total DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS quote_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_order_quote_id ON pd_order(quote_id);

UPDATE pd_order SET gross_subtotal = subtotal WHERE gross_subtotal IS NULL;

ALTER TABLE pd_order_item
  ADD COLUMN IF NOT EXISTS gross_subtotal DECIMAL(12,3),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE pd_order_item SET gross_subtotal = subtotal WHERE gross_subtotal IS NULL;
