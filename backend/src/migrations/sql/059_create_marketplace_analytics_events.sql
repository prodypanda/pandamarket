-- Migration 059: First-Party Marketplace Analytics Event Table
CREATE TABLE IF NOT EXISTS pd_marketplace_analytics_event (
  id VARCHAR(64) PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- actor & entity context
  user_id VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  store_id VARCHAR(64) REFERENCES pd_store(id) ON DELETE SET NULL,
  product_id VARCHAR(64) REFERENCES pd_product(id) ON DELETE SET NULL,
  category_id VARCHAR(64),
  order_id VARCHAR(64),

  -- session & privacy context
  visitor_hash VARCHAR(128),
  session_hash VARCHAR(128),
  referrer_domain VARCHAR(255),
  locale VARCHAR(10),
  device_type VARCHAR(20),

  -- event payload context
  source VARCHAR(30) NOT NULL DEFAULT 'web',
  path TEXT,
  search_query_hash VARCHAR(128),
  search_query_normalized VARCHAR(255),
  search_results_count INT,
  funnel_step VARCHAR(64),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_mae_type_time ON pd_marketplace_analytics_event(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_mae_store_time ON pd_marketplace_analytics_event(store_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_mae_product_time ON pd_marketplace_analytics_event(product_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_mae_user_time ON pd_marketplace_analytics_event(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_mae_session_time ON pd_marketplace_analytics_event(session_hash, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pd_mae_search_time ON pd_marketplace_analytics_event(search_query_hash, occurred_at DESC);
