CREATE TABLE IF NOT EXISTS pd_digital_download (
  id                    VARCHAR(64) PRIMARY KEY,
  order_id              VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  product_id            VARCHAR(64) NOT NULL REFERENCES pd_product(id) ON DELETE CASCADE,
  customer_id           VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  download_count        INTEGER NOT NULL DEFAULT 0,
  first_downloaded_at   TIMESTAMP,
  last_downloaded_at    TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE(order_id, product_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_digital_download_customer ON pd_digital_download(customer_id, product_id);
CREATE INDEX IF NOT EXISTS idx_digital_download_order ON pd_digital_download(order_id);

DROP TRIGGER IF EXISTS trg_pd_digital_download_updated_at ON pd_digital_download;
CREATE TRIGGER trg_pd_digital_download_updated_at
  BEFORE UPDATE ON pd_digital_download
  FOR EACH ROW
  EXECUTE FUNCTION pd_set_updated_at();

ALTER TABLE pd_product ADD COLUMN IF NOT EXISTS digital_file_key TEXT;
ALTER TABLE pd_product ADD COLUMN IF NOT EXISTS digital_file_name VARCHAR(255);
ALTER TABLE pd_product ADD COLUMN IF NOT EXISTS digital_file_content_type VARCHAR(100);
ALTER TABLE pd_product ADD COLUMN IF NOT EXISTS digital_file_size BIGINT;
