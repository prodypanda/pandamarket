-- =============================================================================
-- Migration 073: Store Subscriptions, AI Interest Tags, Buyer Profile & Broadcasts
-- Feature 20: Store Subscriptions, Followed Feed & AI Interest Engine
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: pd_store_subscription
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_store_subscription (
  id                      VARCHAR(64) PRIMARY KEY,
  buyer_id                VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  store_id                VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  notify_price_drops      BOOLEAN NOT NULL DEFAULT true,
  notify_new_products     BOOLEAN NOT NULL DEFAULT true,
  is_verified_buyer       BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_buyer_store_subscription UNIQUE (buyer_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_store_subscription_buyer_id ON pd_store_subscription(buyer_id);
CREATE INDEX IF NOT EXISTS idx_store_subscription_store_id ON pd_store_subscription(store_id);
CREATE INDEX IF NOT EXISTS idx_store_subscription_buyer_store ON pd_store_subscription(buyer_id, store_id);
CREATE INDEX IF NOT EXISTS idx_store_subscription_store_verified ON pd_store_subscription(store_id, is_verified_buyer);
CREATE INDEX IF NOT EXISTS idx_store_subscription_created_at ON pd_store_subscription(created_at DESC);

-- Wire updated_at trigger if helper function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'pd_set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_pd_store_subscription_updated_at ON pd_store_subscription;
    CREATE TRIGGER trg_pd_store_subscription_updated_at
      BEFORE UPDATE ON pd_store_subscription
      FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Alter Table: pd_store (Subscriber counters)
-- -----------------------------------------------------------------------------
ALTER TABLE pd_store
  ADD COLUMN IF NOT EXISTS subscribers_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_subscribers_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_store_subscribers_count ON pd_store(subscribers_count DESC);

-- -----------------------------------------------------------------------------
-- 3. Alter Table: pd_product (AI Interest Tags)
-- -----------------------------------------------------------------------------
ALTER TABLE pd_product
  ADD COLUMN IF NOT EXISTS interest_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interest_tags_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pd_product_interest_tags_gin ON pd_product USING GIN (interest_tags);
CREATE INDEX IF NOT EXISTS idx_pd_product_interest_tags_synced ON pd_product(interest_tags_synced_at) WHERE status = 'published';

-- -----------------------------------------------------------------------------
-- 4. Table: pd_buyer_interest_profile
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_buyer_interest_profile (
  buyer_id                VARCHAR(64) PRIMARY KEY REFERENCES pd_user(id) ON DELETE CASCADE,
  tag_weights             JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_calculated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_interest_profile_tag_weights ON pd_buyer_interest_profile USING GIN (tag_weights);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'pd_set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_pd_buyer_interest_profile_updated_at ON pd_buyer_interest_profile;
    CREATE TRIGGER trg_pd_buyer_interest_profile_updated_at
      BEFORE UPDATE ON pd_buyer_interest_profile
      FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. Table: pd_seller_broadcast
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_seller_broadcast (
  id                         VARCHAR(64) PRIMARY KEY,
  store_id                   VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  coupon_code                VARCHAR(64),
  discount_type              VARCHAR(32) DEFAULT 'percentage',
  discount_value             NUMERIC(10,2),
  message                    TEXT NOT NULL,
  sent_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subscribers_count_at_send  INT NOT NULL DEFAULT 0,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_seller_broadcast_discount_type CHECK (discount_type IN ('percentage', 'fixed') OR discount_type IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_seller_broadcast_store_sent ON pd_seller_broadcast(store_id, sent_at DESC);
