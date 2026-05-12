-- =====================================================
-- PandaMarket — Optional account 2FA (017)
-- =====================================================

ALTER TABLE pd_user
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_recovery_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS two_factor_last_used_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_user_two_factor_enabled ON pd_user(two_factor_enabled) WHERE two_factor_enabled = true;
