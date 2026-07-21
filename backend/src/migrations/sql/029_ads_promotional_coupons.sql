CREATE TABLE IF NOT EXISTS pd_ads_coupon (
 id VARCHAR(64) PRIMARY KEY,
 code VARCHAR(40) NOT NULL UNIQUE,
 amount NUMERIC(18,3) NOT NULL CHECK(amount>0),
 currency VARCHAR(3) NOT NULL DEFAULT 'TND',
 max_redemptions INTEGER NOT NULL DEFAULT 1 CHECK(max_redemptions>0),
 redemption_count INTEGER NOT NULL DEFAULT 0 CHECK(redemption_count>=0),
 expires_at TIMESTAMPTZ,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 created_by VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS pd_ads_coupon_redemption (
 coupon_id VARCHAR(64) NOT NULL REFERENCES pd_ads_coupon(id) ON DELETE CASCADE,
 store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
 transaction_id VARCHAR(64) NOT NULL REFERENCES pd_ads_transaction(id) ON DELETE RESTRICT,
 redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(coupon_id,store_id)
);
