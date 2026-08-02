-- Migration 069: Create transactional outbox table for atomic publishing & cache invalidation
CREATE TABLE IF NOT EXISTS pd_outbox_event (
  id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL, -- e.g. store_id
  revision INT NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  attempts INT DEFAULT 0,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_next_attempt ON pd_outbox_event(status, next_attempt_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate_id ON pd_outbox_event(aggregate_id, revision);
