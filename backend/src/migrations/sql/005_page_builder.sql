-- ============================================================
-- Migration 005: Page Builder
-- ============================================================
-- Adds the pd_store_page table for storing GrapesJS page builder
-- content per vendor store. Each store can have multiple custom
-- pages (homepage override, about, landing pages, etc.).
--
-- Access gated by subscription_limits.has_page_builder (Regular+).
-- Builder data is stored as JSONB (GrapesJS project JSON) and
-- compiled HTML/CSS for fast rendering on the storefront.
-- ============================================================

CREATE TABLE IF NOT EXISTS pd_store_page (
  id              VARCHAR(64) PRIMARY KEY,
  store_id        VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  slug            VARCHAR(100) NOT NULL,
    -- e.g. 'home', 'about', 'landing-summer-2026'
  title           VARCHAR(200) NOT NULL,
  builder_data    JSONB DEFAULT '{}',
    -- GrapesJS project JSON: { assets: [], styles: [], pages: [{ component: "...", ... }] }
  html            TEXT DEFAULT '',
    -- Compiled HTML output from GrapesJS for fast SSR rendering
  css             TEXT DEFAULT '',
    -- Compiled CSS output from GrapesJS
  is_published    BOOLEAN DEFAULT false,
  is_homepage     BOOLEAN DEFAULT false,
    -- If true, this page replaces the default theme homepage for the store
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),

  -- Each store can only have one page per slug
  CONSTRAINT uq_store_page_slug UNIQUE (store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_store_page_store ON pd_store_page(store_id);
CREATE INDEX IF NOT EXISTS idx_store_page_published ON pd_store_page(store_id, is_published);
CREATE INDEX IF NOT EXISTS idx_store_page_homepage ON pd_store_page(store_id, is_homepage) WHERE is_homepage = true;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_store_page_updated_at ON pd_store_page;
CREATE TRIGGER trg_store_page_updated_at
  BEFORE UPDATE ON pd_store_page
  FOR EACH ROW
  EXECUTE FUNCTION pd_set_updated_at();
