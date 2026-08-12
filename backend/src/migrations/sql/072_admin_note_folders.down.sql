-- Down Migration 072: Admin Note Folders

ALTER TABLE admin_notes
  DROP COLUMN IF EXISTS folder_id,
  DROP COLUMN IF EXISTS sort_order;

DROP TABLE IF EXISTS admin_note_folders;
