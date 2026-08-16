-- Migration 074 Down: Remove compare_at_price from pd_product and pd_product_variant

DROP INDEX IF EXISTS idx_pd_product_variant_compare_at_price;
DROP INDEX IF EXISTS idx_pd_product_compare_at_price;

ALTER TABLE pd_product_variant DROP COLUMN IF EXISTS compare_at_price;
ALTER TABLE pd_product DROP COLUMN IF EXISTS compare_at_price;
