CREATE TABLE IF NOT EXISTS pd_customer_address (
  id              VARCHAR(64) PRIMARY KEY,
  customer_id     VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  label           VARCHAR(80) NOT NULL DEFAULT 'Adresse',
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(30) NOT NULL,
  address_line_1  VARCHAR(200) NOT NULL,
  address_line_2  VARCHAR(200),
  city            VARCHAR(100) NOT NULL,
  state           VARCHAR(100),
  postal_code     VARCHAR(20) NOT NULL,
  country         VARCHAR(2) NOT NULL DEFAULT 'TN',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_address_customer ON pd_customer_address(customer_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_address_one_default
  ON pd_customer_address(customer_id)
  WHERE is_default = true;

DROP TRIGGER IF EXISTS trg_pd_customer_address_updated_at ON pd_customer_address;
CREATE TRIGGER trg_pd_customer_address_updated_at
  BEFORE UPDATE ON pd_customer_address
  FOR EACH ROW
  EXECUTE FUNCTION pd_set_updated_at();
