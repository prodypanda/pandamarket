-- Migration 052: Create pd_subscription_intent_activity table for audit trail
CREATE TABLE IF NOT EXISTS pd_subscription_intent_activity (
  id VARCHAR(64) PRIMARY KEY,
  intent_id VARCHAR(64) NOT NULL REFERENCES pd_subscription_intent(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- created, proof_uploaded, approved, rejected, cancelled, deleted, expired
  actor_id VARCHAR(64),
  actor_type VARCHAR(20) NOT NULL DEFAULT 'system', -- vendor, admin, system
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subint_act_intent_id ON pd_subscription_intent_activity(intent_id);
CREATE INDEX IF NOT EXISTS idx_subint_act_created_at ON pd_subscription_intent_activity(created_at);
