-- Migration: 051_create_subscription_intents.sql
-- Description: Track subscription payment intents and orders for plan upgrades/downgrades

CREATE TABLE IF NOT EXISTS pd_subscription_intent (
  id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  store_id            VARCHAR(36) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  user_id             VARCHAR(36) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  from_plan           VARCHAR(20) NOT NULL,
  target_plan         VARCHAR(20) NOT NULL REFERENCES pd_subscription_limits(plan_id),
  amount              NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
  currency            VARCHAR(3) NOT NULL DEFAULT 'TND',
  gateway             VARCHAR(20) NOT NULL,
  gateway_reference   VARCHAR(255),
  checkout_url        TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'captured', 'failed', 'cancelled', 'pending_review', 'rejected')),
  proof_url           TEXT,
  rejection_reason    TEXT,
  reviewed_by         VARCHAR(36) REFERENCES pd_user(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  metadata            JSONB DEFAULT '{}'::jsonb,
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_intent_store ON pd_subscription_intent(store_id);
CREATE INDEX IF NOT EXISTS idx_sub_intent_status ON pd_subscription_intent(status);
