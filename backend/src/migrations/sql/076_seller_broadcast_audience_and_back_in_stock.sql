-- =============================================================================
-- Migration 076: Seller Broadcast Target Audience & Product Back-In-Stock Alerts
-- =============================================================================

-- 1. Extend pd_seller_broadcast with title and target_audience (all vs verified_only)
ALTER TABLE pd_seller_broadcast ADD COLUMN IF NOT EXISTS target_audience VARCHAR(32) DEFAULT 'all';
ALTER TABLE pd_seller_broadcast ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- 2. Create pd_product_back_in_stock_alert table
CREATE TABLE IF NOT EXISTS pd_product_back_in_stock_alert (
  id              VARCHAR(64) PRIMARY KEY,
  product_id      VARCHAR(64) NOT NULL REFERENCES pd_product(id) ON DELETE CASCADE,
  store_id        VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  buyer_id        VARCHAR(64) REFERENCES pd_user(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  status          VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'notified', 'cancelled'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at     TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_email_back_in_stock UNIQUE (product_id, email)
);

CREATE INDEX IF NOT EXISTS idx_back_in_stock_product_status ON pd_product_back_in_stock_alert(product_id, status);
CREATE INDEX IF NOT EXISTS idx_back_in_stock_store ON pd_product_back_in_stock_alert(store_id);
CREATE INDEX IF NOT EXISTS idx_back_in_stock_buyer ON pd_product_back_in_stock_alert(buyer_id);
