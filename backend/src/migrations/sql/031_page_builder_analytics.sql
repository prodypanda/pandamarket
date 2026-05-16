CREATE TABLE IF NOT EXISTS pd_store_page_analytics_event (
  id VARCHAR(64) PRIMARY KEY,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  page_id VARCHAR(64) NOT NULL REFERENCES pd_store_page(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('page_view', 'cta_click', 'product_click')),
  product_id VARCHAR(64),
  target_url TEXT,
  target_label VARCHAR(200),
  page_path TEXT,
  referrer TEXT,
  visitor_hash VARCHAR(128),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_page_analytics_store_created ON pd_store_page_analytics_event(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_page_analytics_page_created ON pd_store_page_analytics_event(page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_page_analytics_type_created ON pd_store_page_analytics_event(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_page_analytics_product_created ON pd_store_page_analytics_event(product_id, created_at DESC) WHERE product_id IS NOT NULL;
