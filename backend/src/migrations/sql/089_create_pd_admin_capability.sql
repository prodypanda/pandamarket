-- 089_create_pd_admin_capability.sql

CREATE TABLE IF NOT EXISTS pd_admin_capability (
  user_id TEXT NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  capability VARCHAR(64) NOT NULL,
  granted_by TEXT REFERENCES pd_user(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_pd_admin_capability_user ON pd_admin_capability(user_id);
