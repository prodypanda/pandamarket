ALTER TABLE pd_user
  ADD COLUMN IF NOT EXISTS onboarding_state JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_user_onboarding_state
  ON pd_user USING GIN (onboarding_state);
