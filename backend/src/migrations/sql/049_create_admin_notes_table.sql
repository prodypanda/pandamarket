-- Admin Notes / Reminders / Drafts
-- Personal workspace for superadmin

CREATE TABLE IF NOT EXISTS admin_notes (
  id            VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  admin_id      VARCHAR(36) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  type          VARCHAR(20) NOT NULL DEFAULT 'note' CHECK (type IN ('note', 'reminder', 'draft')),
  title         VARCHAR(500) NOT NULL DEFAULT '',
  content       TEXT NOT NULL DEFAULT '',
  color         VARCHAR(20) DEFAULT 'default',
  priority      VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_pinned     BOOLEAN DEFAULT FALSE,
  is_completed  BOOLEAN DEFAULT FALSE,
  reminder_at   TIMESTAMPTZ,
  due_at        TIMESTAMPTZ,
  tags          TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notes_admin_id ON admin_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_type ON admin_notes(type);
CREATE INDEX IF NOT EXISTS idx_admin_notes_reminder_at ON admin_notes(reminder_at) WHERE reminder_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_notes_is_pinned ON admin_notes(is_pinned) WHERE is_pinned = TRUE;
