-- Migration 026: Dedicated PandaMarket Ads refill intents
CREATE TABLE IF NOT EXISTS pd_ads_refill_intent (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES pd_ads_account(id) ON DELETE CASCADE,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  gateway VARCHAR(20) NOT NULL CHECK (gateway IN ('flouci','konnect')),
  amount NUMERIC(18,3) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'TND',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','captured','failed','expired')),
  gateway_reference VARCHAR(255) UNIQUE,
  checkout_url TEXT,
  created_by VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ads_refill_store ON pd_ads_refill_intent(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_refill_pending ON pd_ads_refill_intent(status, expires_at);
