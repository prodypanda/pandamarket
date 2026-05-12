ALTER TABLE pd_subscription_limits
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true;

UPDATE pd_subscription_limits
SET is_enabled = true
WHERE is_enabled IS NULL;
