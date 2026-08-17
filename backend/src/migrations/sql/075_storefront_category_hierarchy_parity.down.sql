-- Rollback Migration 075
DROP INDEX IF EXISTS idx_storefront_category_megamenu;
DROP INDEX IF EXISTS idx_storefront_category_parent;

ALTER TABLE pd_storefront_category
  DROP COLUMN IF EXISTS show_in_megamenu,
  DROP COLUMN IF EXISTS description_en,
  DROP COLUMN IF EXISTS description_ar,
  DROP COLUMN IF EXISTS description_fr,
  DROP COLUMN IF EXISTS name_en,
  DROP COLUMN IF EXISTS name_ar,
  DROP COLUMN IF EXISTS name_fr,
  DROP COLUMN IF EXISTS seo_description,
  DROP COLUMN IF EXISTS seo_title,
  DROP COLUMN IF EXISTS banner_url,
  DROP COLUMN IF EXISTS icon;
