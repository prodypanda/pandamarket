-- Migration 074: Product Discount & Compare-At Price (Old Price)
-- Adds compare_at_price to pd_product and pd_product_variant with performance indexes

ALTER TABLE pd_product 
ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12, 3) DEFAULT NULL;

ALTER TABLE pd_product_variant 
ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(12, 3) DEFAULT NULL;

-- Index for discount filtering and sorting
CREATE INDEX IF NOT EXISTS idx_pd_product_compare_at_price 
ON pd_product(compare_at_price) 
WHERE compare_at_price IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pd_product_variant_compare_at_price 
ON pd_product_variant(compare_at_price) 
WHERE compare_at_price IS NOT NULL;
