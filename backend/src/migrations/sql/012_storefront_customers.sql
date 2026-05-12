CREATE TABLE IF NOT EXISTS pd_storefront_customer (
  id              VARCHAR(64) PRIMARY KEY,
  store_id        VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  phone           VARCHAR(30),
  email_verified  BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  last_login_at   TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, email)
);

CREATE INDEX IF NOT EXISTS idx_storefront_customer_store ON pd_storefront_customer(store_id);
CREATE INDEX IF NOT EXISTS idx_storefront_customer_email ON pd_storefront_customer(email);

DROP TRIGGER IF EXISTS trg_pd_storefront_customer_updated_at ON pd_storefront_customer;
CREATE TRIGGER trg_pd_storefront_customer_updated_at
  BEFORE UPDATE ON pd_storefront_customer
  FOR EACH ROW
  EXECUTE FUNCTION pd_set_updated_at();

ALTER TABLE pd_order ADD COLUMN IF NOT EXISTS storefront_customer_id VARCHAR(64) REFERENCES pd_storefront_customer(id) ON DELETE SET NULL;
ALTER TABLE pd_order ALTER COLUMN customer_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_storefront_customer ON pd_order(storefront_customer_id);

ALTER TABLE pd_order DROP CONSTRAINT IF EXISTS chk_pd_order_customer_owner;
ALTER TABLE pd_order ADD CONSTRAINT chk_pd_order_customer_owner
  CHECK (customer_id IS NOT NULL OR storefront_customer_id IS NOT NULL);

ALTER TABLE pd_mandat_proofs ADD COLUMN IF NOT EXISTS uploader_storefront_customer_id VARCHAR(64) REFERENCES pd_storefront_customer(id) ON DELETE SET NULL;
