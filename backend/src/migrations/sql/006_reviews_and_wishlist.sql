-- Migration 006: Product Reviews & Customer Wishlist
-- Spec source: wireframes.md §1.3 (★★★★☆ ratings, ♡ Wishlist button)
-- Date: 2026-05-04

-- ============================================================
-- 1. Product Reviews & Ratings
-- ============================================================

CREATE TABLE IF NOT EXISTS pd_review (
  id                   VARCHAR(64) PRIMARY KEY,
  product_id           VARCHAR(64) NOT NULL REFERENCES pd_product(id) ON DELETE CASCADE,
  customer_id          VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  store_id             VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  order_id             VARCHAR(64) REFERENCES pd_order(id),
  rating               SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title                VARCHAR(200),
  body                 TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  status               VARCHAR(20) DEFAULT 'published'
                       CHECK (status IN ('published', 'pending', 'hidden', 'flagged')),
  admin_notes          TEXT,
  helpful_count        INTEGER DEFAULT 0,
  created_at           TIMESTAMP DEFAULT NOW(),
  updated_at           TIMESTAMP DEFAULT NOW(),
  -- One review per customer per product
  UNIQUE(product_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_review_product ON pd_review(product_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_customer ON pd_review(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_store ON pd_review(store_id, status);
CREATE INDEX IF NOT EXISTS idx_review_rating ON pd_review(product_id, rating);

-- Aggregate table for fast product rating reads
CREATE TABLE IF NOT EXISTS pd_product_rating (
  product_id      VARCHAR(64) PRIMARY KEY REFERENCES pd_product(id) ON DELETE CASCADE,
  average_rating  DECIMAL(3,2) DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  rating_1        INTEGER DEFAULT 0,
  rating_2        INTEGER DEFAULT 0,
  rating_3        INTEGER DEFAULT 0,
  rating_4        INTEGER DEFAULT 0,
  rating_5        INTEGER DEFAULT 0,
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. Customer Wishlist
-- ============================================================

CREATE TABLE IF NOT EXISTS pd_wishlist_item (
  id              VARCHAR(64) PRIMARY KEY,
  customer_id     VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  product_id      VARCHAR(64) NOT NULL REFERENCES pd_product(id) ON DELETE CASCADE,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON pd_wishlist_item(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_product ON pd_wishlist_item(product_id);

-- ============================================================
-- 3. Updated_at triggers
-- ============================================================

DROP TRIGGER IF EXISTS trg_pd_review_updated_at ON pd_review;
CREATE TRIGGER trg_pd_review_updated_at
  BEFORE UPDATE ON pd_review
  FOR EACH ROW
  EXECUTE FUNCTION pd_set_updated_at();
