-- Migration 057: Vendor Subscription Self-Service, Accounting GL & Cron Logs
ALTER TABLE pd_subscription_intent
ADD COLUMN IF NOT EXISTS magic_token VARCHAR(128),
ADD COLUMN IF NOT EXISTS magic_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sub_intent_magic_token ON pd_subscription_intent(magic_token);

CREATE TABLE IF NOT EXISTS pd_subscription_cron_log (
  id VARCHAR(64) PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  processed_count INT NOT NULL DEFAULT 0,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_cron_log_created ON pd_subscription_cron_log(created_at DESC);
