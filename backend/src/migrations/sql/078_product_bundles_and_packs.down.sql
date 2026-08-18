-- Rollback Migration: 077_product_bundles_and_packs.down.sql

DROP TABLE IF EXISTS pd_product_bundle_item;

ALTER TABLE pd_product
  DROP COLUMN IF EXISTS bundle_pricing_type,
  DROP COLUMN IF EXISTS bundle_discount_value;
