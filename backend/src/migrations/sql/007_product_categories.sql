-- =====================================================
-- Product Categories (Marketplace + Storefront)
-- =====================================================

CREATE TABLE IF NOT EXISTS pd_marketplace_category (
  id              VARCHAR(64) PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  slug            VARCHAR(140) UNIQUE NOT NULL,
  description     TEXT,
  is_default      BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  position        INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_category_default
  ON pd_marketplace_category(is_default)
  WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_category_active
  ON pd_marketplace_category(is_active, position, name);

INSERT INTO pd_marketplace_category (id, name, slug, description, is_default, is_active, position)
VALUES ('cat_market_uncategorized', 'Non categorized products', 'non-categorized-products', 'Default marketplace category for uncategorized products.', true, true, 0)
ON CONFLICT (slug) DO UPDATE SET
  is_default = true,
  is_active = true,
  updated_at = NOW();

INSERT INTO pd_marketplace_category (id, name, slug, description, is_default, is_active, position)
VALUES
  ('cat_market_fashion', 'Fashion', 'fashion', 'Clothing, accessories, shoes, and lifestyle fashion products.', false, true, 10),
  ('cat_market_beauty', 'Beauty & Cosmetics', 'beauty-cosmetics', 'Cosmetics, skincare, fragrances, and beauty essentials.', false, true, 20),
  ('cat_market_electronics', 'Electronics', 'electronics', 'Phones, gadgets, computers, accessories, and electronic devices.', false, true, 30),
  ('cat_market_home', 'Home & Living', 'home-living', 'Home decor, furniture, kitchen, and living essentials.', false, true, 40),
  ('cat_market_food', 'Food & Grocery', 'food-grocery', 'Food, grocery, snacks, drinks, and local specialties.', false, true, 50),
  ('cat_market_handmade', 'Handmade & Artisan', 'handmade-artisan', 'Handmade, artisan, craft, and locally made products.', false, true, 60)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS pd_storefront_category (
  id              VARCHAR(64) PRIMARY KEY,
  store_id        VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  parent_id       VARCHAR(64) REFERENCES pd_storefront_category(id) ON DELETE SET NULL,
  name            VARCHAR(120) NOT NULL,
  slug            VARCHAR(140) NOT NULL,
  description     TEXT,
  is_default      BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  position        INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (store_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_storefront_category_default
  ON pd_storefront_category(store_id, is_default)
  WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_storefront_category_store
  ON pd_storefront_category(store_id, parent_id, is_active, position, name);

ALTER TABLE pd_product
  ADD COLUMN IF NOT EXISTS marketplace_category_id VARCHAR(64) REFERENCES pd_marketplace_category(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS storefront_category_id VARCHAR(64) REFERENCES pd_storefront_category(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_product_marketplace_category ON pd_product(marketplace_category_id);
CREATE INDEX IF NOT EXISTS idx_product_storefront_category ON pd_product(storefront_category_id);

INSERT INTO pd_storefront_category (id, store_id, name, slug, description, is_default, is_active, position)
SELECT 'cat_store_uncategorized_' || s.id,
       s.id,
       'Non categorized products',
       'non-categorized-products',
       'Default storefront category for uncategorized products.',
       true,
       true,
       0
FROM pd_store s
ON CONFLICT (store_id, slug) DO UPDATE SET
  is_default = true,
  is_active = true,
  updated_at = NOW();

UPDATE pd_product p
SET marketplace_category_id = c.id
FROM pd_marketplace_category c
WHERE p.marketplace_category_id IS NULL
  AND p.category IS NOT NULL
  AND (
    LOWER(TRIM(p.category)) = LOWER(c.name)
    OR LOWER(REGEXP_REPLACE(TRIM(p.category), '[[:space:]]+', '-', 'g')) = c.slug
  );

UPDATE pd_product p
SET marketplace_category_id = 'cat_market_uncategorized',
    category = 'Non categorized products'
WHERE marketplace_category_id IS NULL;

UPDATE pd_product p
SET storefront_category_id = sc.id
FROM pd_storefront_category sc
WHERE sc.store_id = p.store_id
  AND sc.is_default = true
  AND p.storefront_category_id IS NULL;
