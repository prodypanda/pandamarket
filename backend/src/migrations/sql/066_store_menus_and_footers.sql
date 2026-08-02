-- Migration 066: Store Menus and Footers Schema (GAP-P1-013)

-- 1. Store Menu Header/Footer/Mobile/Utility locations
CREATE TABLE IF NOT EXISTS pd_store_menu (
  id                  VARCHAR(64) PRIMARY KEY,
  store_id            VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  location            VARCHAR(32) NOT NULL, -- 'header' | 'footer' | 'mobile' | 'utility'
  is_published        BOOLEAN DEFAULT false,
  draft_revision      JSONB DEFAULT '{}',
  published_revision  JSONB DEFAULT '{}',
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_store_menu_location UNIQUE (store_id, location)
);

CREATE INDEX IF NOT EXISTS idx_store_menu_store ON pd_store_menu(store_id);

-- 2. Store Menu Items (hierarchical links)
CREATE TABLE IF NOT EXISTS pd_store_menu_item (
  id                  VARCHAR(64) PRIMARY KEY,
  menu_id             VARCHAR(64) NOT NULL REFERENCES pd_store_menu(id) ON DELETE CASCADE,
  parent_id           VARCHAR(64) REFERENCES pd_store_menu_item(id) ON DELETE CASCADE,
  type                VARCHAR(32) NOT NULL, -- 'page' | 'product' | 'category' | 'collection' | 'custom_url'
  reference_id        VARCHAR(64),
  url                 TEXT,
  localized_label     JSONB NOT NULL DEFAULT '{}',
  target              VARCHAR(16) DEFAULT '_self', -- '_self' | '_blank'
  rel                 VARCHAR(64),
  icon                VARCHAR(64),
  image               TEXT,
  visibility_start    TIMESTAMP,
  visibility_end      TIMESTAMP,
  sort_order          INTEGER DEFAULT 0,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_menu_item_menu ON pd_store_menu_item(menu_id);
CREATE INDEX IF NOT EXISTS idx_store_menu_item_parent ON pd_store_menu_item(parent_id);

-- 3. Store Footer schema
CREATE TABLE IF NOT EXISTS pd_store_footer (
  id                  VARCHAR(64) PRIMARY KEY,
  store_id            VARCHAR(64) UNIQUE NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  is_published        BOOLEAN DEFAULT false,
  draft_revision      JSONB DEFAULT '{}',
  published_revision  JSONB DEFAULT '{}',
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_footer_store ON pd_store_footer(store_id);

-- 4. Store Footer Blocks
CREATE TABLE IF NOT EXISTS pd_store_footer_block (
  id                  VARCHAR(64) PRIMARY KEY,
  footer_id           VARCHAR(64) NOT NULL REFERENCES pd_store_footer(id) ON DELETE CASCADE,
  type                VARCHAR(32) NOT NULL, -- 'menu' | 'text' | 'contact' | 'social' | 'newsletter' | 'payment_badges' | 'legal' | 'map'
  title               VARCHAR(200),
  content             JSONB NOT NULL DEFAULT '{}',
  sort_order          INTEGER DEFAULT 0,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_footer_block_footer ON pd_store_footer_block(footer_id);
