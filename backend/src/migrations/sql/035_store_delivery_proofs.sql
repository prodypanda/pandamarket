CREATE TABLE IF NOT EXISTS pd_store_delivery_proof (
  id              VARCHAR(64) PRIMARY KEY,
  order_id        VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  fulfillment_id  VARCHAR(64) REFERENCES pd_fulfillment(id) ON DELETE SET NULL,
  store_id        VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  shipment_id     VARCHAR(64) REFERENCES pd_shipment(id) ON DELETE SET NULL,
  captured_by     VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  proof_url       TEXT,
  received_by     VARCHAR(200),
  note            TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_delivery_proof_order_store ON pd_store_delivery_proof(order_id, store_id);
CREATE INDEX IF NOT EXISTS idx_store_delivery_proof_fulfillment ON pd_store_delivery_proof(fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_store_delivery_proof_shipment ON pd_store_delivery_proof(shipment_id);
