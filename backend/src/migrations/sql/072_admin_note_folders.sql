-- Migration 072: Admin Note Folders

CREATE TABLE IF NOT EXISTS admin_note_folders (
  id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  admin_id    VARCHAR(36) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(20) DEFAULT 'default',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_note_folders_admin_id ON admin_note_folders(admin_id);

-- Alter admin_notes to support folders and reordering
-- We use ON DELETE SET NULL as requested (when a folder is deleted, notes go back to 'No Folder')
ALTER TABLE admin_notes
  ADD COLUMN IF NOT EXISTS folder_id VARCHAR(36) REFERENCES admin_note_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_admin_notes_folder_id ON admin_notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_sort_order ON admin_notes(sort_order);
