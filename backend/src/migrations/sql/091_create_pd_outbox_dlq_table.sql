-- 091_create_pd_outbox_dlq_table.sql

CREATE TABLE IF NOT EXISTS pd_outbox_dlq (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_type VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL,
  last_error TEXT,
  failed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_outbox_dlq_event ON pd_outbox_dlq(event_type);
