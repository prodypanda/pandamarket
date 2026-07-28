-- Migration 054: Subscription Webhook & Diagnostics Audit Logs
CREATE TABLE IF NOT EXISTS pd_subscription_webhook_log (
  id VARCHAR(64) PRIMARY KEY,
  intent_id VARCHAR(64) REFERENCES pd_subscription_intent(id) ON DELETE SET NULL,
  gateway VARCHAR(30) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'success', -- success, failed, pending_retry
  payload JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_webhook_intent ON pd_subscription_webhook_log(intent_id);
CREATE INDEX IF NOT EXISTS idx_sub_webhook_gateway ON pd_subscription_webhook_log(gateway);
