-- =============================================================================
-- Down Migration 073: Store Subscriptions, AI Interest Tags, Buyer Profile & Broadcasts
-- Feature 20: Store Subscriptions, Followed Feed & AI Interest Engine
-- =============================================================================

DROP TABLE IF EXISTS pd_seller_broadcast CASCADE;
DROP TABLE IF EXISTS pd_buyer_interest_profile CASCADE;
DROP TABLE IF EXISTS pd_store_subscription CASCADE;

DROP INDEX IF EXISTS idx_pd_product_interest_tags_synced;
DROP INDEX IF EXISTS idx_pd_product_interest_tags_gin;

ALTER TABLE pd_product
  DROP COLUMN IF EXISTS interest_tags_synced_at,
  DROP COLUMN IF EXISTS interest_tags;

DROP INDEX IF EXISTS idx_store_subscribers_count;

ALTER TABLE pd_store
  DROP COLUMN IF EXISTS verified_subscribers_count,
  DROP COLUMN IF EXISTS subscribers_count;
