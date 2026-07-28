-- Migration 053: Subscription Lifecycle Controls, Pause/Resume, Proration, Credits & Adjustments
ALTER TABLE pd_store
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(30) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_resume_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS subscription_credits NUMERIC(10, 3) DEFAULT 0.000,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS pd_subscription_adjustment (
  id VARCHAR(64) PRIMARY KEY,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  intent_id VARCHAR(64) REFERENCES pd_subscription_intent(id) ON DELETE SET NULL,
  type VARCHAR(30) NOT NULL, -- credit, discount, refund, proration_credit
  amount NUMERIC(10, 3) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'TND',
  reason TEXT,
  created_by VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_adj_store_id ON pd_subscription_adjustment(store_id);
CREATE INDEX IF NOT EXISTS idx_sub_adj_intent_id ON pd_subscription_adjustment(intent_id);
