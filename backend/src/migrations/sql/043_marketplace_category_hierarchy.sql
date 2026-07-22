-- =====================================================
-- Migration 043: Marketplace Category Hierarchy (Parent & Sub-Categories)
-- =====================================================

ALTER TABLE pd_marketplace_category
  ADD COLUMN IF NOT EXISTS parent_id VARCHAR(64) REFERENCES pd_marketplace_category(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS icon VARCHAR(100),
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS seo_description TEXT;

CREATE INDEX IF NOT EXISTS idx_marketplace_category_parent ON pd_marketplace_category(parent_id);
