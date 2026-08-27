-- Migration 068: Add storefront_customer_id to pd_digital_download and create download audit log

ALTER TABLE pd_digital_download ADD COLUMN IF NOT EXISTS storefront_customer_id VARCHAR(64) REFERENCES pd_storefront_customer(id) ON DELETE CASCADE;
ALTER TABLE pd_digital_download ALTER COLUMN customer_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_digital_download_storefront ON pd_digital_download(storefront_customer_id, product_id);

-- Drop old unique constraint and create a new one that covers both customer types
ALTER TABLE pd_digital_download DROP CONSTRAINT IF EXISTS pd_digital_download_order_id_product_id_customer_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_download_unique ON pd_digital_download(order_id, product_id, COALESCE(customer_id, ''), COALESCE(storefront_customer_id, ''));

CREATE TABLE IF NOT EXISTS pd_download_audit_log (
  id                      VARCHAR(64) PRIMARY KEY,
  download_id             VARCHAR(64) NOT NULL REFERENCES pd_digital_download(id) ON DELETE CASCADE,
  product_id              VARCHAR(64) NOT NULL REFERENCES pd_product(id) ON DELETE CASCADE,
  order_id                VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  customer_id             VARCHAR(64),
  storefront_customer_id  VARCHAR(64),
  store_id                VARCHAR(64) NOT NULL,
  ip_address              VARCHAR(45),
  user_agent              TEXT,
  created_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_download_audit_product ON pd_download_audit_log(product_id);
CREATE INDEX IF NOT EXISTS idx_download_audit_store ON pd_download_audit_log(store_id);
