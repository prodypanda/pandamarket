-- =====================================================
-- PandaMarket — Initial Schema (001)
-- =====================================================
-- Implements all entities described in
-- `ai instructions/database-schema.md`.
-- All entity IDs use the `pd_<entity>_<nano>` convention.
-- =====================================================

-- ----------------------------------------------------
-- Extensions
-- ----------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------
-- Users
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_user (
  id              VARCHAR(64) PRIMARY KEY,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  first_name      VARCHAR(100),
  last_name       VARCHAR(100),
  role            VARCHAR(20) NOT NULL DEFAULT 'customer',
    -- 'customer' | 'vendor' | 'admin' | 'super_admin'
  store_id        VARCHAR(64),
    -- nullable; vendors are linked to a store
  email_verified  BOOLEAN DEFAULT false,
  phone           VARCHAR(30),
  is_active       BOOLEAN DEFAULT true,
  last_login_at   TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_role ON pd_user(role);
CREATE INDEX IF NOT EXISTS idx_user_store ON pd_user(store_id);

-- ----------------------------------------------------
-- Subscription Limits (seeded reference table)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_subscription_limits (
  plan_id                 VARCHAR(20) PRIMARY KEY,
    -- 'free' | 'starter' | 'regular' | 'agency' | 'pro' | 'golden' | 'platinum'
  max_products            INTEGER NOT NULL,    -- -1 = unlimited
  max_images_per_product  INTEGER NOT NULL,
  has_ai_seo              BOOLEAN DEFAULT false,
  has_image_compression   BOOLEAN DEFAULT false,
  has_custom_domain       BOOLEAN DEFAULT false,
  has_page_builder        BOOLEAN DEFAULT false,
  has_direct_payment      BOOLEAN DEFAULT false,
  has_white_label         BOOLEAN DEFAULT false,
  commission_rate         DECIMAL(5,4) DEFAULT 0,  -- e.g. 0.1500 = 15 %
  ai_tokens_included      INTEGER DEFAULT 0,       -- -1 = unlimited
  yearly_price            DECIMAL(10,2) DEFAULT 0,
  is_enabled              BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

-- ----------------------------------------------------
-- Stores
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_store (
  id                  VARCHAR(64) PRIMARY KEY,
  name                VARCHAR(150) NOT NULL,
  status              VARCHAR(20) DEFAULT 'unverified',
    -- 'unverified' | 'verified' | 'suspended'
  seller_type         VARCHAR(20) NOT NULL DEFAULT 'retailer' CHECK (seller_type IN ('wholesaler', 'retailer', 'hybrid')),
  is_verified         BOOLEAN DEFAULT false,
  subscription_plan   VARCHAR(20) NOT NULL DEFAULT 'free' REFERENCES pd_subscription_limits(plan_id),
  subscription_type   VARCHAR(20) NOT NULL DEFAULT 'commission',
    -- 'commission' | 'yearly'
  subscription_expires_at TIMESTAMP,
  subdomain           VARCHAR(100) UNIQUE NOT NULL,
  custom_domain       VARCHAR(255) UNIQUE,
  theme_id            VARCHAR(50) DEFAULT 'minimal',
  settings            JSONB DEFAULT '{}',
    -- { colors: {...}, logo_url, favicon_url, store_name, store_description, social: {...} }
  payment_config      TEXT,
    -- AES-256-GCM encrypted JSON: { flouci_app_token, flouci_app_secret, konnect_api_key, ... }
    -- NULL when in Escrow mode
  shipping_mode       VARCHAR(20) DEFAULT 'self_managed',
    -- 'self_managed' | 'platform_unified'
  owner_id            VARCHAR(64) NOT NULL REFERENCES pd_user(id),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_subdomain ON pd_store(subdomain);
CREATE INDEX IF NOT EXISTS idx_store_custom_domain ON pd_store(custom_domain);
CREATE INDEX IF NOT EXISTS idx_store_status ON pd_store(status);
CREATE INDEX IF NOT EXISTS idx_store_seller_type ON pd_store(seller_type);
CREATE INDEX IF NOT EXISTS idx_store_owner ON pd_store(owner_id);

-- Wire up the user.store_id FK now that pd_store exists
ALTER TABLE pd_user
  ADD CONSTRAINT fk_user_store
  FOREIGN KEY (store_id) REFERENCES pd_store(id) ON DELETE SET NULL;

-- ----------------------------------------------------
-- Themes (catalogue)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_theme (
  id              VARCHAR(64) PRIMARY KEY,
  slug            VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  preview_url     TEXT,
  is_free         BOOLEAN DEFAULT true,
  price           DECIMAL(10,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ----------------------------------------------------
-- Products
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_product (
  id                   VARCHAR(64) PRIMARY KEY,
  store_id             VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  type                 VARCHAR(20) NOT NULL DEFAULT 'physical',
    -- 'physical' | 'digital' | 'service'
  status               VARCHAR(30) NOT NULL DEFAULT 'draft',
    -- 'draft' | 'published' | 'archived' | 'pending_approval' | 'rejected'
  title                VARCHAR(200) NOT NULL,
  slug                 VARCHAR(100) NOT NULL,
  description          TEXT,
  category             VARCHAR(100),
  price                DECIMAL(12,3) NOT NULL DEFAULT 0,
  inventory_quantity   INTEGER DEFAULT 0,
  weight_grams         INTEGER,
  thumbnail            TEXT,
  seo_title            VARCHAR(200),
  seo_description      VARCHAR(300),
  tags                 JSONB DEFAULT '[]',
  metadata             JSONB DEFAULT '{}',
    -- digital: { download_url, license_key_pool_id, max_downloads, expires_in_hours }
  rejection_reason     TEXT,
  created_at           TIMESTAMP DEFAULT NOW(),
  updated_at           TIMESTAMP DEFAULT NOW(),
  UNIQUE (store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_product_store ON pd_product(store_id);
CREATE INDEX IF NOT EXISTS idx_product_status ON pd_product(status);
CREATE INDEX IF NOT EXISTS idx_product_category ON pd_product(category);
CREATE INDEX IF NOT EXISTS idx_product_published ON pd_product(status) WHERE status = 'published';

-- ----------------------------------------------------
-- Product Images
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_product_image (
  id              VARCHAR(64) PRIMARY KEY,
  product_id      VARCHAR(64) NOT NULL REFERENCES pd_product(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  alt_text        VARCHAR(200),
  position        INTEGER DEFAULT 0,
  is_thumbnail    BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_image_product ON pd_product_image(product_id);

-- ----------------------------------------------------
-- Product Variants
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_product_variant (
  id                   VARCHAR(64) PRIMARY KEY,
  product_id           VARCHAR(64) NOT NULL REFERENCES pd_product(id) ON DELETE CASCADE,
  sku                  VARCHAR(100),
  title                VARCHAR(200) NOT NULL,
  price                DECIMAL(12,3) NOT NULL,
  inventory_quantity   INTEGER DEFAULT 0,
  options              JSONB DEFAULT '{}',  -- { size: 'M', color: 'red' }
  created_at           TIMESTAMP DEFAULT NOW(),
  updated_at           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variant_product ON pd_product_variant(product_id);

-- ----------------------------------------------------
-- Orders
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_order (
  id                  VARCHAR(64) PRIMARY KEY,
  customer_id         VARCHAR(64) NOT NULL REFERENCES pd_user(id),
  status              VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- 'payment_required' | 'pending' | 'processing' | 'fulfilled' | 'delivered' | 'cancelled' | 'refunded'
  payment_gateway     VARCHAR(20) NOT NULL,
    -- 'flouci' | 'konnect' | 'manual_mandat' | 'cod'
  payment_status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'captured' | 'failed' | 'refunded'
  payment_reference   VARCHAR(255),
    -- gateway-side ID (Flouci payment_id, Konnect paymentRef, etc.)
  subtotal            DECIMAL(12,3) NOT NULL,
  shipping_total      DECIMAL(12,3) DEFAULT 0,
  total               DECIMAL(12,3) NOT NULL,
  currency            VARCHAR(3) DEFAULT 'TND',
  shipping_address    JSONB,
  billing_address     JSONB,
  notes               TEXT,
  cancelled_at        TIMESTAMP,
  cancelled_reason    TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_customer ON pd_order(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON pd_order(status);
CREATE INDEX IF NOT EXISTS idx_order_payment_status ON pd_order(payment_status);

-- ----------------------------------------------------
-- Order Items (one per product line; carries store_id for splitting)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_order_item (
  id            VARCHAR(64) PRIMARY KEY,
  order_id      VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  product_id    VARCHAR(64) NOT NULL REFERENCES pd_product(id),
  variant_id    VARCHAR(64) REFERENCES pd_product_variant(id),
  store_id      VARCHAR(64) NOT NULL REFERENCES pd_store(id),
  title         VARCHAR(200) NOT NULL,
  quantity      INTEGER NOT NULL,
  unit_price    DECIMAL(12,3) NOT NULL,
  subtotal      DECIMAL(12,3) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_item_order ON pd_order_item(order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_store ON pd_order_item(store_id);

-- ----------------------------------------------------
-- Fulfillments (one per store per order — Order Splitting)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_fulfillment (
  id              VARCHAR(64) PRIMARY KEY,
  order_id        VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  store_id        VARCHAR(64) NOT NULL REFERENCES pd_store(id),
  status          VARCHAR(20) DEFAULT 'pending',
    -- 'pending' | 'shipped' | 'delivered' | 'cancelled'
  shipping_total  DECIMAL(12,3) DEFAULT 0,
  carrier         VARCHAR(50),
  tracking_number VARCHAR(100),
  shipped_at      TIMESTAMP,
  delivered_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_order ON pd_fulfillment(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_store ON pd_fulfillment(store_id);

-- ----------------------------------------------------
-- Vendor Wallet
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_vendor_wallet (
  id              VARCHAR(64) PRIMARY KEY,
  store_id        VARCHAR(64) UNIQUE NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  balance         DECIMAL(12,3) DEFAULT 0,
  pending_balance DECIMAL(12,3) DEFAULT 0,
  total_earned    DECIMAL(12,3) DEFAULT 0,
  total_withdrawn DECIMAL(12,3) DEFAULT 0,
  payout_mode     VARCHAR(20) DEFAULT 'on_demand',
    -- 'automatic' | 'on_demand'
  retention_days  INTEGER DEFAULT 7,
  currency        VARCHAR(3) DEFAULT 'TND',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ----------------------------------------------------
-- Wallet Transactions (append-only audit trail)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_wallet_transaction (
  id              VARCHAR(64) PRIMARY KEY,
  wallet_id       VARCHAR(64) NOT NULL REFERENCES pd_vendor_wallet(id) ON DELETE CASCADE,
  type            VARCHAR(30) NOT NULL,
    -- 'sale' | 'commission' | 'payout' | 'refund' | 'addon_purchase'
  amount          DECIMAL(12,3) NOT NULL,
    -- positive for credit, negative for debit
  balance_after   DECIMAL(12,3),
  order_id        VARCHAR(64) REFERENCES pd_order(id),
  description     TEXT,
  metadata        JSONB DEFAULT '{}',
  available_at    TIMESTAMP,  -- when the funds become withdrawable
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON pd_wallet_transaction(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_type ON pd_wallet_transaction(type);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_available ON pd_wallet_transaction(available_at)
  WHERE available_at IS NOT NULL;

-- ----------------------------------------------------
-- Vendor Credits (AI tokens)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_vendor_credits (
  id              VARCHAR(64) PRIMARY KEY,
  store_id        VARCHAR(64) UNIQUE NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  ai_tokens       INTEGER DEFAULT 0,    -- -1 = unlimited
  tokens_used     INTEGER DEFAULT 0,
  last_refill     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ----------------------------------------------------
-- KYC Verification Documents
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_verification_documents (
  id                  VARCHAR(64) PRIMARY KEY,
  store_id            VARCHAR(64) UNIQUE NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  rc_document_url     TEXT,           -- Registre de Commerce (private bucket)
  cin_document_url    TEXT,           -- Carte d'Identité Nationale
  phone_number        VARCHAR(30),
  phone_verified      BOOLEAN DEFAULT false,
  status              VARCHAR(20) DEFAULT 'pending',
    -- 'pending' | 'approved' | 'rejected'
  reviewed_by         VARCHAR(64) REFERENCES pd_user(id),
  reviewed_at         TIMESTAMP,
  notes               TEXT,
  rejection_reason    TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_status ON pd_verification_documents(status);

-- ----------------------------------------------------
-- Mandat Minute Proofs
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_mandat_proofs (
  id                  VARCHAR(64) PRIMARY KEY,
  order_id            VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  uploaded_by         VARCHAR(10) NOT NULL,    -- 'buyer' | 'vendor'
  uploader_user_id    VARCHAR(64) REFERENCES pd_user(id),
  image_url           TEXT NOT NULL,
  amount_expected     DECIMAL(12,3) NOT NULL,
  status              VARCHAR(20) DEFAULT 'pending',
    -- 'pending' | 'approved' | 'rejected'
  reviewed_by         VARCHAR(64) REFERENCES pd_user(id),
  reviewed_at         TIMESTAMP,
  rejection_reason    TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mandat_status ON pd_mandat_proofs(status);
CREATE INDEX IF NOT EXISTS idx_mandat_order ON pd_mandat_proofs(order_id);

-- ----------------------------------------------------
-- Reports (Fraud signaling)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_reports (
  id              VARCHAR(64) PRIMARY KEY,
  reporter_id     VARCHAR(64) NOT NULL REFERENCES pd_user(id),
  store_id        VARCHAR(64) NOT NULL REFERENCES pd_store(id),
  order_id        VARCHAR(64) REFERENCES pd_order(id),
  reason          TEXT NOT NULL,
  evidence_urls   JSONB DEFAULT '[]',
  status          VARCHAR(20) DEFAULT 'open',
    -- 'open' | 'investigating' | 'resolved' | 'dismissed'
  admin_notes     TEXT,
  resolved_by     VARCHAR(64) REFERENCES pd_user(id),
  resolved_at     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (reporter_id, store_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON pd_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_store ON pd_reports(store_id);

-- ----------------------------------------------------
-- API Keys (vendors -> their ERP/POS)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_api_keys (
  id              VARCHAR(64) PRIMARY KEY,
  store_id        VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  key_hash        VARCHAR(255) UNIQUE NOT NULL,    -- SHA-256
  key_prefix      VARCHAR(20) NOT NULL,            -- e.g. 'pd_sk_aaaa'
  label           VARCHAR(100) NOT NULL,
  scopes          JSONB DEFAULT '["products:read"]',
  is_active       BOOLEAN DEFAULT true,
  last_used_at    TIMESTAMP,
  expires_at      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_store ON pd_api_keys(store_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON pd_api_keys(key_hash);

-- ----------------------------------------------------
-- AI Jobs (BullMQ tracking)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_ai_jobs (
  id                  VARCHAR(64) PRIMARY KEY,
  store_id            VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  user_id             VARCHAR(64) REFERENCES pd_user(id),
  type                VARCHAR(30) NOT NULL,
    -- 'image_compression' | 'seo_generation'
  status              VARCHAR(20) DEFAULT 'queued',
    -- 'queued' | 'processing' | 'completed' | 'failed'
  input_url           TEXT,
  input_meta          JSONB DEFAULT '{}',
  output              JSONB,
  tokens_consumed     INTEGER DEFAULT 0,
  error_message       TEXT,
  bullmq_job_id       VARCHAR(100),
  created_at          TIMESTAMP DEFAULT NOW(),
  started_at          TIMESTAMP,
  completed_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_store ON pd_ai_jobs(store_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON pd_ai_jobs(status);

-- ----------------------------------------------------
-- Notifications
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_notifications (
  id              VARCHAR(64) PRIMARY KEY,
  user_id         VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  type            VARCHAR(50) NOT NULL,
  title           VARCHAR(200) NOT NULL,
  message         TEXT NOT NULL,
  data            JSONB DEFAULT '{}',
  is_read         BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON pd_notifications(user_id, is_read, created_at DESC);

-- ----------------------------------------------------
-- Refresh Tokens (rotated, blacklist on logout)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS pd_refresh_tokens (
  id              VARCHAR(64) PRIMARY KEY,
  user_id         VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  token_hash      VARCHAR(255) UNIQUE NOT NULL,
  expires_at      TIMESTAMP NOT NULL,
  revoked_at      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_user ON pd_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_expiry ON pd_refresh_tokens(expires_at);

-- ----------------------------------------------------
-- Updated-at trigger
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION pd_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'pd_user', 'pd_store', 'pd_subscription_limits',
    'pd_product', 'pd_product_variant',
    'pd_order', 'pd_fulfillment',
    'pd_vendor_wallet', 'pd_vendor_credits',
    'pd_verification_documents', 'pd_mandat_proofs',
    'pd_reports'
  ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I; ' ||
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I ' ||
      'FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$$;
