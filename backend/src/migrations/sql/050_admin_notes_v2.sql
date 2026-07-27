-- Migration 050: Admin Notes v2 — archive/trash, markdown, checklists, attachments, activity log
-- Extends the personal superadmin workspace (migration 049).

-- 1) Extend admin_notes with archive/trash lifecycle, markdown format and soft-delete metadata
ALTER TABLE admin_notes
  ADD COLUMN IF NOT EXISTS content_format VARCHAR(10) NOT NULL DEFAULT 'plain' CHECK (content_format IN ('plain', 'markdown')),
  ADD COLUMN IF NOT EXISTS status        VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'trashed')),
  ADD COLUMN IF NOT EXISTS archived_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trashed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at  TIMESTAMPTZ;

-- Backfill status from is_completed so existing rows keep working under the new lifecycle
UPDATE admin_notes
  SET status = 'active',
      completed_at = CASE WHEN is_completed THEN updated_at ELSE NULL END
WHERE status = 'active' AND archived_at IS NULL AND trashed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_notes_status ON admin_notes(status);
CREATE INDEX IF NOT EXISTS idx_admin_notes_archived_at ON admin_notes(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_notes_trashed_at ON admin_notes(trashed_at) WHERE trashed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_notes_due_at ON admin_notes(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_notes_priority ON admin_notes(priority);
CREATE INDEX IF NOT EXISTS idx_admin_notes_is_completed ON admin_notes(is_completed) WHERE is_completed = TRUE;
CREATE INDEX IF NOT EXISTS idx_admin_notes_tags ON admin_notes USING GIN (tags);

-- 2) Checklist items per note
CREATE TABLE IF NOT EXISTS admin_note_checklist_items (
  id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  note_id     VARCHAR(36) NOT NULL REFERENCES admin_notes(id) ON DELETE CASCADE,
  content     VARCHAR(1000) NOT NULL DEFAULT '',
  is_done     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_note_checklist_items_note_id ON admin_note_checklist_items(note_id);
CREATE INDEX IF NOT EXISTS idx_admin_note_checklist_items_sort ON admin_note_checklist_items(note_id, sort_order);

-- 3) Attachments per note (references existing pd_file_blob key + asset)
CREATE TABLE IF NOT EXISTS admin_note_attachments (
  id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  note_id      VARCHAR(36) NOT NULL REFERENCES admin_notes(id) ON DELETE CASCADE,
  admin_id     VARCHAR(36) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  file_key     VARCHAR(1024) NOT NULL,
  bucket       VARCHAR(128) NOT NULL,
  filename     VARCHAR(500) NOT NULL DEFAULT '',
  content_type VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
  file_size    BIGINT NOT NULL DEFAULT 0,
  scope        VARCHAR(20) NOT NULL DEFAULT 'platform',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_note_attachments_note_id ON admin_note_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_admin_note_attachments_admin_id ON admin_note_attachments(admin_id);

-- 4) Activity log per note (immutable history)
CREATE TABLE IF NOT EXISTS admin_note_activity (
  id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  note_id     VARCHAR(36) NOT NULL REFERENCES admin_notes(id) ON DELETE CASCADE,
  admin_id    VARCHAR(36) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  action      VARCHAR(50) NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_note_activity_note_id ON admin_note_activity(note_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_note_activity_admin_id ON admin_note_activity(admin_id);
