-- Migration 055: Subscription Desync, Decline Routing & Add-On Disaggregation
ALTER TABLE pd_subscription_intent 
ADD COLUMN IF NOT EXISTS decline_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS decline_type VARCHAR(20), -- hard, soft
ADD COLUMN IF NOT EXISTS scheduled_retry_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS pd_subscription_addon (
  id VARCHAR(64) PRIMARY KEY,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  addon_key VARCHAR(50) NOT NULL,
  addon_name VARCHAR(100) NOT NULL,
  amount NUMERIC(10,3) NOT NULL DEFAULT 0.000,
  currency VARCHAR(10) NOT NULL DEFAULT 'TND',
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, paused, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_addon_store ON pd_subscription_addon(store_id);
