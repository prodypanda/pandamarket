-- Migration: 077_product_bundles_and_packs.sql
-- Description: Adds product bundle / pack capabilities and pd_product_bundle_item table

-- 1. Add bundle pricing configuration columns to pd_product
ALTER TABLE pd_product
  ADD COLUMN IF NOT EXISTS bundle_pricing_type VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bundle_discount_value NUMERIC(10, 3) DEFAULT NULL;

-- 2. Create pd_product_bundle_item table
CREATE TABLE IF NOT EXISTS pd_product_bundle_item (
  id VARCHAR(36) PRIMARY KEY,
  bundle_product_id VARCHAR(36) NOT NULL REFERENCES pd_product(id) ON DELETE CASCADE,
  product_id VARCHAR(36) NOT NULL REFERENCES pd_product(id) ON DELETE CASCADE,
  variant_id VARCHAR(36) REFERENCES pd_product_variant(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_bundle_no_self_reference CHECK (bundle_product_id <> product_id)
);

-- 3. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id ON pd_product_bundle_item(bundle_product_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_product_id ON pd_product_bundle_item(product_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_variant_id ON pd_product_bundle_item(variant_id);
