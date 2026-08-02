-- =====================================================
-- PandaMarket — Migration 066
-- Checkout Idempotency & Nonnegative Inventory Constraints (GAP-P0-004 & GAP-P0-005)
-- =====================================================

-- 1. Add idempotency_key to pd_order
ALTER TABLE pd_order
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_idempotency_key
  ON pd_order(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2. Data cleanup for existing negative inventory values
UPDATE pd_product
  SET inventory_quantity = 0
  WHERE inventory_quantity < 0;

UPDATE pd_product_variant
  SET inventory_quantity = 0
  WHERE inventory_quantity < 0;

-- 3. Add CHECK constraints to enforce nonnegative inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_pd_product_inventory_nonnegative'
  ) THEN
    ALTER TABLE pd_product
      ADD CONSTRAINT chk_pd_product_inventory_nonnegative
      CHECK (inventory_quantity >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_pd_product_variant_inventory_nonnegative'
  ) THEN
    ALTER TABLE pd_product_variant
      ADD CONSTRAINT chk_pd_product_variant_inventory_nonnegative
      CHECK (inventory_quantity >= 0);
  END IF;
END $$;
