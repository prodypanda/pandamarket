-- 097_social_accounts_and_auto_posting.sql
-- Create schema for social media accounts and auto-publishing ledger

CREATE TABLE IF NOT EXISTS pd_social_account (
  id VARCHAR(64) PRIMARY KEY,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  platform VARCHAR(32) NOT NULL, -- facebook, instagram, tiktok, linkedin, pinterest
  account_name VARCHAR(255),
  account_id VARCHAR(255),
  encrypted_access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_social_account_store_platform ON pd_social_account(store_id, platform);

CREATE TABLE IF NOT EXISTS pd_social_post (
  id VARCHAR(64) PRIMARY KEY,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  product_id VARCHAR(64) REFERENCES pd_product(id) ON DELETE SET NULL,
  social_account_id VARCHAR(64) REFERENCES pd_social_account(id) ON DELETE CASCADE,
  caption TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'draft', -- draft, scheduled, publishing, published, failed
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  external_post_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_social_post_store_status ON pd_social_post(store_id, status);
CREATE INDEX IF NOT EXISTS idx_pd_social_post_scheduled ON pd_social_post(status, scheduled_at);
