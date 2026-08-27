-- ============================================================
-- Migration 032: Platform Page Builder
-- ============================================================
-- Adds the pd_platform_page table for storing GrapesJS page builder
-- content for the Marketplace Hub (Platform).
-- ============================================================

CREATE TABLE IF NOT EXISTS pd_platform_page (
  id              VARCHAR(64) PRIMARY KEY,
  slug            VARCHAR(100) NOT NULL UNIQUE,
    -- e.g. 'about', 'faq', 'terms', 'privacy'
  title           VARCHAR(200) NOT NULL,
  builder_data    JSONB DEFAULT '{}',
  html            TEXT DEFAULT '',
  css             TEXT DEFAULT '',
  is_published    BOOLEAN DEFAULT false,
  show_in_footer  BOOLEAN DEFAULT false,
  show_in_header  BOOLEAN DEFAULT false,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_page_published ON pd_platform_page(is_published);
CREATE INDEX IF NOT EXISTS idx_platform_page_footer ON pd_platform_page(show_in_footer) WHERE show_in_footer = true;
CREATE INDEX IF NOT EXISTS idx_platform_page_header ON pd_platform_page(show_in_header) WHERE show_in_header = true;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_platform_page_updated_at ON pd_platform_page;
CREATE TRIGGER trg_platform_page_updated_at
  BEFORE UPDATE ON pd_platform_page
  FOR EACH ROW
  EXECUTE FUNCTION pd_set_updated_at();
