-- Migration 069: Storefront Mandat Minute Receipts Table

CREATE TABLE IF NOT EXISTS pd_payment_receipt (
  id                      VARCHAR(64) PRIMARY KEY,
  order_id                VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  store_id                VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  storefront_customer_id  VARCHAR(64) REFERENCES pd_storefront_customer(id) ON DELETE CASCADE,
  customer_id             VARCHAR(64) REFERENCES pd_user(id) ON DELETE CASCADE,
  file_key                TEXT NOT NULL,
  file_name               VARCHAR(255) NOT NULL,
  file_size               BIGINT,
  mime_type               VARCHAR(100),
  status                  VARCHAR(32) NOT NULL DEFAULT 'pending_review',
  review_notes            TEXT,
  reviewed_by             VARCHAR(64),
  reviewed_at             TIMESTAMP,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_receipt_order ON pd_payment_receipt(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipt_store ON pd_payment_receipt(store_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipt_sfc ON pd_payment_receipt(storefront_customer_id);
