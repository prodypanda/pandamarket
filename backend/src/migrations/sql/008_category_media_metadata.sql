ALTER TABLE pd_marketplace_category
  ADD COLUMN IF NOT EXISTS short_description VARCHAR(255),
  ADD COLUMN IF NOT EXISTS long_description TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE pd_storefront_category
  ADD COLUMN IF NOT EXISTS short_description VARCHAR(255),
  ADD COLUMN IF NOT EXISTS long_description TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

UPDATE pd_marketplace_category
SET short_description = COALESCE(short_description, description)
WHERE description IS NOT NULL;

UPDATE pd_storefront_category
SET short_description = COALESCE(short_description, description)
WHERE description IS NOT NULL;
