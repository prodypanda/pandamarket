-- Migration 067: Theme Referential Integrity
-- Required by GAP-P1-021 — Enforce theme existence before applying.
--
-- pd_store.theme_id stores theme *slugs* (e.g. 'minimal', 'classic'),
-- not pd_theme.id UUIDs.  pd_theme.slug is UNIQUE NOT NULL, so it is
-- a valid FK target.

-- ─── 1. Fix orphaned theme_id values ────────────────────────────
-- Any store whose theme_id is not a valid slug gets reset to the
-- default 'minimal' so the FK can be created without errors.

UPDATE pd_store
   SET theme_id = 'minimal'
 WHERE theme_id IS NOT NULL
   AND theme_id NOT IN (SELECT slug FROM pd_theme);

-- ─── 2. FK: pd_store.theme_id → pd_theme.slug ──────────────────
-- ON DELETE SET DEFAULT  → if a theme row is deleted, revert stores
--                          to the default ('minimal').
-- ON UPDATE CASCADE      → if a theme slug is renamed, propagate.

ALTER TABLE pd_store
  ADD CONSTRAINT fk_store_theme_slug
  FOREIGN KEY (theme_id) REFERENCES pd_theme(slug)
  ON DELETE SET DEFAULT
  ON UPDATE CASCADE;

-- ─── Rollback ───────────────────────────────────────────────────
-- ALTER TABLE pd_store DROP CONSTRAINT IF EXISTS fk_store_theme_slug;
