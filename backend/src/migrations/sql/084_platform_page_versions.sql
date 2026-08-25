-- Audit P1-6 / M1: Platform CMS versioning backend.
-- Mirrors pd_store_page_version (migration 028) minus store_id, so the
-- Platform Page Builder editor's version history and restore UI have a real
-- backing table instead of calling missing endpoints.

CREATE TABLE IF NOT EXISTS pd_platform_page_version (
  id VARCHAR(64) PRIMARY KEY,
  page_id VARCHAR(64) NOT NULL REFERENCES pd_platform_page(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(200),
  slug VARCHAR(100),
  builder_data JSONB DEFAULT '{}',
  html TEXT DEFAULT '',
  css TEXT DEFAULT '',
  seo_title VARCHAR(200),
  seo_description VARCHAR(320),
  show_in_navigation BOOLEAN DEFAULT false,
  show_in_footer BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  published_at TIMESTAMP,
  created_by VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_platform_page_version_number UNIQUE (page_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_platform_page_version_page
  ON pd_platform_page_version(page_id, version_number DESC);
