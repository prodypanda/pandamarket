-- Migration 063: Create Analytics Rollup Tables
-- pd_analytics_event_daily_rollup & pd_analytics_search_daily_rollup

DROP TABLE IF EXISTS pd_analytics_event_daily_rollup CASCADE;
DROP TABLE IF EXISTS pd_analytics_search_daily_rollup CASCADE;

CREATE TABLE pd_analytics_event_daily_rollup (
  id TEXT PRIMARY KEY,
  rollup_date DATE NOT NULL,
  event_type TEXT NOT NULL,
  store_id TEXT NOT NULL DEFAULT '',
  product_id TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  event_count INT NOT NULL DEFAULT 0,
  unique_visitors INT NULL,
  unique_sessions INT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rollup_date, event_type, store_id, product_id, category_id, locale, source)
);

CREATE INDEX idx_pd_analytics_event_daily_rollup_date_type
  ON pd_analytics_event_daily_rollup(rollup_date DESC, event_type);

CREATE INDEX idx_pd_analytics_event_daily_rollup_store_date
  ON pd_analytics_event_daily_rollup(store_id, rollup_date DESC);

CREATE TABLE pd_analytics_search_daily_rollup (
  id TEXT PRIMARY KEY,
  rollup_date DATE NOT NULL,
  search_query_hash TEXT NOT NULL,
  search_query_normalized TEXT NULL,
  store_id TEXT NOT NULL DEFAULT '',
  searches_count INT NOT NULL DEFAULT 0,
  zero_result_count INT NOT NULL DEFAULT 0,
  result_click_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rollup_date, search_query_hash, store_id)
);

CREATE INDEX idx_pd_analytics_search_daily_rollup_date
  ON pd_analytics_search_daily_rollup(rollup_date DESC);
