-- Rollback Migration 043
DROP INDEX IF EXISTS idx_marketplace_category_parent;

ALTER TABLE pd_marketplace_category
  DROP COLUMN IF EXISTS parent_id,
  DROP COLUMN IF EXISTS icon,
  DROP COLUMN IF EXISTS banner_url,
  DROP COLUMN IF EXISTS seo_title,
  DROP COLUMN IF EXISTS seo_description;
