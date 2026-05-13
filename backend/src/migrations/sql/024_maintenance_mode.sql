-- Migration 024: Maintenance Mode
-- Adds 'maintenance' to pd_store.status CHECK constraint.
-- Seeds default maintenance platform config keys.

-- Extend pd_store.status to include 'maintenance'
ALTER TABLE pd_store
  DROP CONSTRAINT IF EXISTS pd_store_status_check;

ALTER TABLE pd_store
  DROP CONSTRAINT IF EXISTS chk_pd_store_status;

ALTER TABLE pd_store
  ADD CONSTRAINT chk_pd_store_status
  CHECK (status IN ('unverified', 'verified', 'suspended', 'maintenance'));

-- Seed default maintenance platform config keys
INSERT INTO pd_platform_config (key, value) VALUES
  ('maintenance_enabled', 'false'),
  ('maintenance_title', 'Maintenance en cours'),
  ('maintenance_message', 'Notre plateforme est en cours de maintenance. Nous serons de retour très bientôt.'),
  ('maintenance_eta', ''),
  ('maintenance_allowed_ips', ''),
  ('maintenance_block_storefronts', 'false')
ON CONFLICT (key) DO NOTHING;
