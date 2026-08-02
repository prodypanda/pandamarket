-- Migration 067: Storefront customer sessions, verification/reset tokens, and address ownership

CREATE TABLE IF NOT EXISTS pd_storefront_customer_session (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL REFERENCES pd_storefront_customer(id) ON DELETE CASCADE,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  is_revoked BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sfc_session_customer ON pd_storefront_customer_session(customer_id, store_id);
CREATE INDEX IF NOT EXISTS idx_sfc_session_refresh ON pd_storefront_customer_session(refresh_token_hash);

CREATE TABLE IF NOT EXISTS pd_storefront_customer_token (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL REFERENCES pd_storefront_customer(id) ON DELETE CASCADE,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(30) NOT NULL, -- 'email_verify' | 'password_reset'
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sfc_token_hash ON pd_storefront_customer_token(token_hash);

ALTER TABLE pd_customer_address ADD COLUMN IF NOT EXISTS storefront_customer_id VARCHAR(64) REFERENCES pd_storefront_customer(id) ON DELETE CASCADE;
ALTER TABLE pd_customer_address ALTER COLUMN customer_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_address_storefront_customer ON pd_customer_address(storefront_customer_id);
