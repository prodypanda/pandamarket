CREATE TABLE IF NOT EXISTS pd_store_order_refund (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  requested_by VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  amount DECIMAL(12,3) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'TND',
  reason_code VARCHAR(40) NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'processed', 'rejected')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_order_refund_order ON pd_store_order_refund(order_id);
CREATE INDEX IF NOT EXISTS idx_store_order_refund_store ON pd_store_order_refund(store_id);
CREATE INDEX IF NOT EXISTS idx_store_order_refund_status ON pd_store_order_refund(status);
CREATE INDEX IF NOT EXISTS idx_store_order_refund_created_at ON pd_store_order_refund(created_at);
