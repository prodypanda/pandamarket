ALTER TABLE pd_reports
  DROP CONSTRAINT IF EXISTS pd_reports_status_check;

ALTER TABLE pd_reports
  ADD CONSTRAINT pd_reports_status_check
  CHECK (status IN ('open', 'investigating', 'awaiting_buyer', 'awaiting_seller', 'resolved', 'dismissed'));

DROP INDEX IF EXISTS idx_reports_active_buyer_seller_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_active_buyer_seller_unique
  ON pd_reports (reporter_id, store_id, (COALESCE(order_id, '')))
  WHERE source = 'buyer'
    AND target_type = 'seller'
    AND status IN ('open', 'investigating', 'awaiting_buyer', 'awaiting_seller');

CREATE TABLE IF NOT EXISTS pd_report_messages (
  id VARCHAR(64) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL REFERENCES pd_reports(id) ON DELETE CASCADE,
  author_id VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  author_role VARCHAR(30) NOT NULL,
  visibility VARCHAR(30) NOT NULL CHECK (visibility IN ('buyer_admin', 'seller_admin', 'all_parties', 'admin_internal')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pd_report_attachments (
  id VARCHAR(64) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL REFERENCES pd_reports(id) ON DELETE CASCADE,
  message_id VARCHAR(64) REFERENCES pd_report_messages(id) ON DELETE CASCADE,
  uploaded_by VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  visibility VARCHAR(30) NOT NULL CHECK (visibility IN ('buyer_admin', 'seller_admin', 'all_parties', 'admin_internal')),
  file_url TEXT,
  file_key TEXT,
  file_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (file_url IS NOT NULL OR file_key IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS pd_report_events (
  id VARCHAR(64) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL REFERENCES pd_reports(id) ON DELETE CASCADE,
  actor_id VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN ('case_created', 'message_added', 'attachment_added', 'status_changed', 'note_updated')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_messages_report ON pd_report_messages(report_id, created_at);
CREATE INDEX IF NOT EXISTS idx_report_messages_visibility ON pd_report_messages(visibility);
CREATE INDEX IF NOT EXISTS idx_report_attachments_report ON pd_report_attachments(report_id, created_at);
CREATE INDEX IF NOT EXISTS idx_report_attachments_message ON pd_report_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_report_attachments_file_key ON pd_report_attachments(file_key);
CREATE INDEX IF NOT EXISTS idx_report_attachments_visibility ON pd_report_attachments(visibility);
CREATE INDEX IF NOT EXISTS idx_report_events_report ON pd_report_events(report_id, created_at);
