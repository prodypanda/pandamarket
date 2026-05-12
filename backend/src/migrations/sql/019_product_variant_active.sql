ALTER TABLE pd_product_variant
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE pd_product_variant
SET is_active = true
WHERE is_active IS NULL;

CREATE INDEX IF NOT EXISTS idx_variant_product_active
  ON pd_product_variant(product_id, is_active);
