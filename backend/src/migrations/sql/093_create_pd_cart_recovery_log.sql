-- 093_create_pd_cart_recovery_log.sql

CREATE TABLE IF NOT EXISTS pd_cart_recovery_log (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL,
  sequence_step INTEGER NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  recipient TEXT NOT NULL,
  dispatched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_id, sequence_step)
);

CREATE INDEX IF NOT EXISTS idx_cart_recovery_log_cart ON pd_cart_recovery_log(cart_id);
