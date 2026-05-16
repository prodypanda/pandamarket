ALTER TABLE pd_store_page
  ADD COLUMN IF NOT EXISTS draft_builder_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS draft_html TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS draft_css TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS draft_seo_title VARCHAR(200),
  ADD COLUMN IF NOT EXISTS draft_seo_description VARCHAR(320),
  ADD COLUMN IF NOT EXISTS draft_og_image TEXT,
  ADD COLUMN IF NOT EXISTS draft_noindex BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS draft_show_in_navigation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS draft_show_in_footer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS draft_sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

UPDATE pd_store_page
SET
  draft_builder_data = COALESCE(draft_builder_data, builder_data, '{}'::jsonb),
  draft_html = COALESCE(draft_html, html, ''),
  draft_css = COALESCE(draft_css, css, ''),
  draft_seo_title = COALESCE(draft_seo_title, seo_title),
  draft_seo_description = COALESCE(draft_seo_description, seo_description),
  draft_og_image = COALESCE(draft_og_image, og_image),
  draft_noindex = COALESCE(draft_noindex, noindex, false),
  draft_show_in_navigation = COALESCE(draft_show_in_navigation, show_in_navigation, false),
  draft_show_in_footer = COALESCE(draft_show_in_footer, show_in_footer, false),
  draft_sort_order = COALESCE(draft_sort_order, sort_order, 0),
  published_at = CASE WHEN is_published = true AND published_at IS NULL THEN updated_at ELSE published_at END;
