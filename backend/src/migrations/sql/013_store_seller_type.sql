ALTER TABLE pd_store
  ADD COLUMN IF NOT EXISTS seller_type VARCHAR(20) NOT NULL DEFAULT 'retailer';

ALTER TABLE pd_store
  DROP CONSTRAINT IF EXISTS chk_pd_store_seller_type;

ALTER TABLE pd_store
  ADD CONSTRAINT chk_pd_store_seller_type
  CHECK (seller_type IN ('wholesaler', 'retailer', 'hybrid'));

CREATE INDEX IF NOT EXISTS idx_store_seller_type ON pd_store(seller_type);
