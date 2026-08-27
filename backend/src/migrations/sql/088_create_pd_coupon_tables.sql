-- 088_create_pd_coupon_tables.sql

CREATE TABLE IF NOT EXISTS pd_coupon (
  id TEXT PRIMARY KEY,
  store_id TEXT REFERENCES pd_store(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  discount_value NUMERIC(10, 3) NOT NULL,
  min_order_amount NUMERIC(10, 3) DEFAULT 0,
  max_discount_amount NUMERIC(10, 3),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_coupon_code ON pd_coupon(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_pd_coupon_store ON pd_coupon(store_id);

CREATE TABLE IF NOT EXISTS pd_coupon_redemption (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES pd_coupon(id) ON DELETE CASCADE,
  order_id TEXT,
  user_id TEXT REFERENCES pd_user(id) ON DELETE SET NULL,
  discount_applied NUMERIC(10, 3) NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_coupon_redemption_coupon ON pd_coupon_redemption(coupon_id);
CREATE INDEX IF NOT EXISTS idx_pd_coupon_redemption_user ON pd_coupon_redemption(user_id);
