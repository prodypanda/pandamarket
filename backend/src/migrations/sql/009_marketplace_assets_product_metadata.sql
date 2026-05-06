ALTER TABLE pd_product
  ADD COLUMN IF NOT EXISTS product_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '[]'::jsonb;

UPDATE pd_product SET attributes = '[]'::jsonb WHERE attributes IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_reference ON pd_product(product_reference);
CREATE INDEX IF NOT EXISTS idx_product_attributes ON pd_product USING GIN (attributes);
CREATE INDEX IF NOT EXISTS idx_product_tags ON pd_product USING GIN (tags);

CREATE TABLE IF NOT EXISTS pd_file_asset (
  id VARCHAR(64) PRIMARY KEY,
  scope VARCHAR(20) NOT NULL DEFAULT 'store' CHECK (scope IN ('store', 'platform')),
  purpose VARCHAR(40) NOT NULL,
  url TEXT NOT NULL,
  file_key TEXT UNIQUE NOT NULL,
  bucket VARCHAR(120) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  file_size BIGINT,
  owner_user_id VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  store_id VARCHAR(64) REFERENCES pd_store(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_asset_scope ON pd_file_asset(scope, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_asset_store ON pd_file_asset(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_asset_content_type ON pd_file_asset(content_type);

DROP TRIGGER IF EXISTS trg_pd_file_asset_updated_at ON pd_file_asset;
CREATE TRIGGER trg_pd_file_asset_updated_at
  BEFORE UPDATE ON pd_file_asset
  FOR EACH ROW
  EXECUTE FUNCTION pd_set_updated_at();
