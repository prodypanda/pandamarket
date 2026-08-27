ALTER TABLE pd_store_page
  ADD COLUMN IF NOT EXISTS seo_title VARCHAR(200),
  ADD COLUMN IF NOT EXISTS seo_description VARCHAR(320),
  ADD COLUMN IF NOT EXISTS og_image TEXT,
  ADD COLUMN IF NOT EXISTS noindex BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_in_navigation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_in_footer BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_store_page_navigation
  ON pd_store_page(store_id, sort_order)
  WHERE is_published = true AND show_in_navigation = true;

CREATE INDEX IF NOT EXISTS idx_store_page_footer
  ON pd_store_page(store_id, sort_order)
  WHERE is_published = true AND show_in_footer = true;
