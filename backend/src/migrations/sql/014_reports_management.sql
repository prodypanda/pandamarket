ALTER TABLE pd_reports
  ALTER COLUMN store_id DROP NOT NULL;

ALTER TABLE pd_reports
  ADD COLUMN IF NOT EXISTS target_type VARCHAR(20) NOT NULL DEFAULT 'seller' CHECK (target_type IN ('seller', 'buyer')),
  ADD COLUMN IF NOT EXISTS target_user_id VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'buyer' CHECK (source IN ('buyer', 'admin')),
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

UPDATE pd_reports r
SET target_user_id = s.owner_id
FROM pd_store s
WHERE r.store_id = s.id
  AND r.target_type = 'seller'
  AND r.target_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_reports_target_type ON pd_reports(target_type);
CREATE INDEX IF NOT EXISTS idx_reports_target_user ON pd_reports(target_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_source ON pd_reports(source);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON pd_reports(priority);
CREATE INDEX IF NOT EXISTS idx_reports_updated_at ON pd_reports(updated_at);
