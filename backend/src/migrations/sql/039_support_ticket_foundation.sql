CREATE TABLE IF NOT EXISTS pd_support_ticket (
  id VARCHAR(64) PRIMARY KEY,
  ticket_number VARCHAR(32) NOT NULL UNIQUE,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  created_by VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  assigned_admin_id VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  category VARCHAR(32) NOT NULL DEFAULT 'general',
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pd_support_ticket_category_check CHECK (category IN ('general', 'billing', 'technical', 'kyc', 'orders', 'returns', 'custom_template')),
  CONSTRAINT pd_support_ticket_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT pd_support_ticket_status_check CHECK (status IN ('open', 'in_progress', 'waiting_seller', 'waiting_admin', 'resolved', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_store_id ON pd_support_ticket(store_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_created_by ON pd_support_ticket(created_by);
CREATE INDEX IF NOT EXISTS idx_support_ticket_assigned_admin ON pd_support_ticket(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_status_priority ON pd_support_ticket(status, priority);
CREATE INDEX IF NOT EXISTS idx_support_ticket_created_at ON pd_support_ticket(created_at DESC);

CREATE TABLE IF NOT EXISTS pd_support_ticket_message (
  id VARCHAR(64) PRIMARY KEY,
  ticket_id VARCHAR(64) NOT NULL REFERENCES pd_support_ticket(id) ON DELETE CASCADE,
  author_id VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_message_ticket_id ON pd_support_ticket_message(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_message_author_id ON pd_support_ticket_message(author_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_message_created_at ON pd_support_ticket_message(created_at DESC);

CREATE TABLE IF NOT EXISTS pd_support_ticket_attachment (
  id VARCHAR(64) PRIMARY KEY,
  ticket_id VARCHAR(64) NOT NULL REFERENCES pd_support_ticket(id) ON DELETE CASCADE,
  message_id VARCHAR(64) REFERENCES pd_support_ticket_message(id) ON DELETE CASCADE,
  uploaded_by VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(127) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pd_support_ticket_attachment_size_check CHECK (file_size_bytes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_attachment_ticket_id ON pd_support_ticket_attachment(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_attachment_message_id ON pd_support_ticket_attachment(message_id);


DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'pd_set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_pd_support_ticket_updated_at ON pd_support_ticket;
    CREATE TRIGGER trg_pd_support_ticket_updated_at
      BEFORE UPDATE ON pd_support_ticket
      FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();

    DROP TRIGGER IF EXISTS trg_pd_support_ticket_message_updated_at ON pd_support_ticket_message;
    CREATE TRIGGER trg_pd_support_ticket_message_updated_at
      BEFORE UPDATE ON pd_support_ticket_message
      FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();
  END IF;
END $$;
