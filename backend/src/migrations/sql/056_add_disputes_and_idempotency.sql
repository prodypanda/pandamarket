-- Migration 056: Dispute Workbench, Idempotency & Out-of-Order Webhook Queue
ALTER TABLE pd_subscription_intent 
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

CREATE TABLE IF NOT EXISTS pd_subscription_dispute (
  id VARCHAR(64) PRIMARY KEY,
  intent_id VARCHAR(64) NOT NULL REFERENCES pd_subscription_intent(id) ON DELETE CASCADE,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  dispute_reference VARCHAR(100),
  reason VARCHAR(255),
  amount NUMERIC(10,3) NOT NULL DEFAULT 0.000,
  currency VARCHAR(10) NOT NULL DEFAULT 'TND',
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, under_review, won, lost
  evidence_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_dispute_intent ON pd_subscription_dispute(intent_id);
CREATE INDEX IF NOT EXISTS idx_sub_dispute_store ON pd_subscription_dispute(store_id);
