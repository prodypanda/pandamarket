-- =====================================================
-- Migration 075: Storefront Category Hierarchy Parity & Subcategories
-- Adds icon, banner, SEO metadata, multilingual translations,
-- and megamenu visibility to pd_storefront_category
-- =====================================================

ALTER TABLE pd_storefront_category
  ADD COLUMN IF NOT EXISTS icon VARCHAR(100),
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description_fr TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS show_in_megamenu BOOLEAN NOT NULL DEFAULT true;

-- Synchronize existing names and descriptions to French (default locale)
UPDATE pd_storefront_category
SET name_fr = name
WHERE name_fr IS NULL AND name IS NOT NULL;

UPDATE pd_storefront_category
SET description_fr = description
WHERE description_fr IS NULL AND description IS NOT NULL;

-- Indexes for efficient hierarchy and active navigation queries
CREATE INDEX IF NOT EXISTS idx_storefront_category_parent 
  ON pd_storefront_category(store_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_storefront_category_megamenu 
  ON pd_storefront_category(store_id, show_in_megamenu) 
  WHERE is_active = true;
