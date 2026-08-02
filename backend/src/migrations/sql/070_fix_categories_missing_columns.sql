-- Migration 070: Fix missing category columns and clean-schema drift
ALTER TABLE pd_marketplace_category
  ADD COLUMN IF NOT EXISTS show_in_megamenu BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_marketplace_category_megamenu ON pd_marketplace_category(show_in_megamenu) WHERE is_active = true;
