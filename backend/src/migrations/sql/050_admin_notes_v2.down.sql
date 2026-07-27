-- Rollback for migration 050: Admin Notes v2

DROP TABLE IF EXISTS admin_note_activity;
DROP TABLE IF EXISTS admin_note_attachments;
DROP TABLE IF EXISTS admin_note_checklist_items;

ALTER TABLE admin_notes
  DROP COLUMN IF EXISTS content_format,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS trashed_at,
  DROP COLUMN IF EXISTS completed_at;

DROP INDEX IF EXISTS idx_admin_notes_status;
DROP INDEX IF EXISTS idx_admin_notes_archived_at;
DROP INDEX IF EXISTS idx_admin_notes_trashed_at;
DROP INDEX IF EXISTS idx_admin_notes_due_at;
DROP INDEX IF EXISTS idx_admin_notes_priority;
DROP INDEX IF EXISTS idx_admin_notes_is_completed;
DROP INDEX IF EXISTS idx_admin_notes_tags;
