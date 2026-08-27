-- 090_create_pd_serial_key_table.sql

CREATE TABLE IF NOT EXISTS pd_serial_key (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES pd_product(id) ON DELETE CASCADE,
  key_ciphertext TEXT NOT NULL,
  is_assigned BOOLEAN DEFAULT false,
  order_id TEXT REFERENCES pd_order(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_serial_key_product ON pd_serial_key(product_id, is_assigned);
CREATE INDEX IF NOT EXISTS idx_pd_serial_key_order ON pd_serial_key(order_id);
