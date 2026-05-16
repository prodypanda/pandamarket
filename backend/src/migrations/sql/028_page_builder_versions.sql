CREATE TABLE IF NOT EXISTS pd_store_page_version (
  id VARCHAR(64) PRIMARY KEY,
  page_id VARCHAR(64) NOT NULL REFERENCES pd_store_page(id) ON DELETE CASCADE,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  builder_data JSONB DEFAULT '{}',
  html TEXT DEFAULT '',
  css TEXT DEFAULT '',
  seo_title VARCHAR(200),
  seo_description VARCHAR(320),
  og_image TEXT,
  noindex BOOLEAN DEFAULT false,
  show_in_navigation BOOLEAN DEFAULT false,
  show_in_footer BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  published_at TIMESTAMP,
  created_by VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_store_page_version_number UNIQUE (page_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_store_page_version_page ON pd_store_page_version(page_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_store_page_version_store ON pd_store_page_version(store_id, created_at DESC);
