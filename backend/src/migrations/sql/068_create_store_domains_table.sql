-- Migration 068: Create store custom domains table (pd_store_domain)
CREATE TABLE IF NOT EXISTS pd_store_domain (
  id VARCHAR(255) PRIMARY KEY,
  store_id VARCHAR(255) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  hostname VARCHAR(255) NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT false,
  verification_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'failed'
  verification_token_hash VARCHAR(255) NOT NULL,
  verified_at TIMESTAMPTZ,
  ssl_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'issuing', 'active', 'failed'
  certificate_expires_at TIMESTAMPTZ,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_domain_store_id ON pd_store_domain(store_id);
CREATE INDEX IF NOT EXISTS idx_store_domain_hostname ON pd_store_domain(hostname);
CREATE INDEX IF NOT EXISTS idx_store_domain_status ON pd_store_domain(verification_status, ssl_status);
