-- Rollback Migration 045
ALTER TABLE pd_marketplace_category
  DROP COLUMN IF EXISTS name_fr,
  DROP COLUMN IF EXISTS name_ar,
  DROP COLUMN IF EXISTS name_en,
  DROP COLUMN IF EXISTS description_fr,
  DROP COLUMN IF EXISTS description_ar,
  DROP COLUMN IF EXISTS description_en;
