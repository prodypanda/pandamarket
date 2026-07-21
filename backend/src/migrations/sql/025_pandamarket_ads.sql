-- Migration 025: PandaMarket Ads foundation

CREATE TABLE IF NOT EXISTS pd_ads_account (
  id VARCHAR(64) PRIMARY KEY,
  store_id VARCHAR(64) NOT NULL UNIQUE REFERENCES pd_store(id) ON DELETE CASCADE,
  balance NUMERIC(18,3) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  reserved_balance NUMERIC(18,3) NOT NULL DEFAULT 0 CHECK (reserved_balance >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'TND',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pd_ads_campaign (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES pd_ads_account(id) ON DELETE CASCADE,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  campaign_type VARCHAR(32) NOT NULL CHECK (campaign_type IN ('sponsored_product','sponsored_brand','sponsored_content')),
  objective VARCHAR(32) NOT NULL DEFAULT 'traffic' CHECK (objective IN ('awareness','traffic','sales','conversions')),
  status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','approved','scheduled','active','paused','completed','rejected','cancelled','exhausted')),
  pricing_model VARCHAR(16) NOT NULL DEFAULT 'cpc' CHECK (pricing_model IN ('cpc','cpm','fixed_daily')),
  bid_amount NUMERIC(18,3) NOT NULL DEFAULT 0 CHECK (bid_amount >= 0),
  daily_budget NUMERIC(18,3) NOT NULL CHECK (daily_budget > 0),
  total_budget NUMERIC(18,3) NOT NULL CHECK (total_budget > 0),
  spent_amount NUMERIC(18,3) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  targeting JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CHECK (total_budget >= daily_budget)
);

CREATE INDEX IF NOT EXISTS idx_ads_campaign_store ON pd_ads_campaign(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_campaign_delivery ON pd_ads_campaign(status, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS pd_ads_creative (
  id VARCHAR(64) PRIMARY KEY,
  campaign_id VARCHAR(64) NOT NULL REFERENCES pd_ads_campaign(id) ON DELETE CASCADE,
  product_id VARCHAR(64) REFERENCES pd_product(id) ON DELETE SET NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_label VARCHAR(80),
  destination_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pd_ads_placement (
  id VARCHAR(64) PRIMARY KEY,
  placement_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  template VARCHAR(40),
  format VARCHAR(40) NOT NULL,
  default_pricing_model VARCHAR(16) NOT NULL DEFAULT 'cpc',
  default_price NUMERIC(18,3) NOT NULL DEFAULT 0,
  dimensions VARCHAR(40),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pd_ads_campaign_placement (
  campaign_id VARCHAR(64) NOT NULL REFERENCES pd_ads_campaign(id) ON DELETE CASCADE,
  placement_id VARCHAR(64) NOT NULL REFERENCES pd_ads_placement(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, placement_id)
);

CREATE TABLE IF NOT EXISTS pd_ads_transaction (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES pd_ads_account(id) ON DELETE CASCADE,
  campaign_id VARCHAR(64) REFERENCES pd_ads_campaign(id) ON DELETE SET NULL,
  type VARCHAR(32) NOT NULL CHECK (type IN ('refill','promotional_credit','campaign_debit','refund','admin_adjustment','credit_expiry','reservation','reservation_release')),
  amount NUMERIC(18,3) NOT NULL,
  balance_after NUMERIC(18,3) NOT NULL CHECK (balance_after >= 0),
  idempotency_key VARCHAR(160) UNIQUE,
  payment_reference VARCHAR(255),
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ads_transaction_account ON pd_ads_transaction(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pd_ads_event (
  id VARCHAR(64) PRIMARY KEY,
  campaign_id VARCHAR(64) NOT NULL REFERENCES pd_ads_campaign(id) ON DELETE CASCADE,
  creative_id VARCHAR(64) REFERENCES pd_ads_creative(id) ON DELETE SET NULL,
  placement_id VARCHAR(64) REFERENCES pd_ads_placement(id) ON DELETE SET NULL,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('impression','click','conversion')),
  event_key VARCHAR(160) NOT NULL UNIQUE,
  session_hash VARCHAR(128),
  ip_hash VARCHAR(128),
  cost NUMERIC(18,3) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ads_event_campaign ON pd_ads_event(campaign_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pd_ads_daily_stat (
  campaign_id VARCHAR(64) NOT NULL REFERENCES pd_ads_campaign(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  spend NUMERIC(18,3) NOT NULL DEFAULT 0,
  revenue NUMERIC(18,3) NOT NULL DEFAULT 0,
  PRIMARY KEY (campaign_id, stat_date)
);

CREATE TABLE IF NOT EXISTS pd_ads_review (
  id VARCHAR(64) PRIMARY KEY,
  campaign_id VARCHAR(64) NOT NULL REFERENCES pd_ads_campaign(id) ON DELETE CASCADE,
  reviewer_user_id VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved','rejected','changes_requested')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pd_ads_conversion (
  id VARCHAR(64) PRIMARY KEY,
  campaign_id VARCHAR(64) NOT NULL REFERENCES pd_ads_campaign(id) ON DELETE CASCADE,
  event_id VARCHAR(64) REFERENCES pd_ads_event(id) ON DELETE SET NULL,
  order_id VARCHAR(64) REFERENCES pd_order(id) ON DELETE SET NULL,
  revenue NUMERIC(18,3) NOT NULL DEFAULT 0,
  attribution_type VARCHAR(16) NOT NULL CHECK (attribution_type IN ('click','view')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, order_id)
);

INSERT INTO pd_ads_placement (id, placement_key, name, template, format, default_pricing_model, default_price, dimensions) VALUES
 ('pd_adpl_hub_brand','hub.sponsored_brands','Hub sponsored brands',NULL,'brand_card','cpc',0.150,'responsive'),
 ('pd_adpl_hub_products','hub.sponsored_products','Hub sponsored products',NULL,'product_card','cpc',0.100,'responsive'),
 ('pd_adpl_search_top','search.top_results','Search top results',NULL,'product_card','cpc',0.200,'responsive'),
 ('pd_adpl_product_related','product.related','Product related sponsorship',NULL,'product_card','cpc',0.100,'responsive'),
 ('pd_adpl_home_banner','hub.home_banner','Hub homepage sponsored banner',NULL,'banner','cpm',8.000,'1200x320')
ON CONFLICT (placement_key) DO NOTHING;
