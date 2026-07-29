-- Migration 058: Superadmin Analytics Snapshots & Performance Indexes

CREATE TABLE IF NOT EXISTS pd_daily_platform_stats (
  snapshot_date DATE PRIMARY KEY,
  total_gmv NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  net_revenue NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_orders INT NOT NULL DEFAULT 0,
  active_vendors INT NOT NULL DEFAULT 0,
  total_vendors INT NOT NULL DEFAULT 0,
  new_users INT NOT NULL DEFAULT 0,
  total_users INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pd_daily_mrr_snapshots (
  snapshot_date DATE PRIMARY KEY,
  new_mrr NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  expansion_mrr NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  contraction_mrr NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  churned_mrr NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_mrr NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_arr NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pd_daily_ad_stats (
  snapshot_date DATE PRIMARY KEY,
  ad_revenue NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  active_campaigns INT NOT NULL DEFAULT 0,
  avg_ctr NUMERIC(6,3) NOT NULL DEFAULT 0.000,
  avg_cpc NUMERIC(10,3) NOT NULL DEFAULT 0.000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes for Real-Time Queries
CREATE INDEX IF NOT EXISTS idx_store_status_created ON pd_store(status, created_at);
CREATE INDEX IF NOT EXISTS idx_user_role_created ON pd_user(role, created_at);
CREATE INDEX IF NOT EXISTS idx_sub_intent_status_created ON pd_subscription_intent(status, created_at);
