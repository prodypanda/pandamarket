-- Migration 004: Theme Purchases
-- Required by PRD §4.2 — Premium theme marketplace
-- Tracks which stores have purchased which premium themes.

-- ─── Theme purchases table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS pd_theme_purchase (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  theme_id        UUID NOT NULL REFERENCES pd_theme(id) ON DELETE CASCADE,
  amount_paid     DECIMAL(10, 3) NOT NULL DEFAULT 0,
  currency        VARCHAR(3) NOT NULL DEFAULT 'TND',
  payment_reference VARCHAR(255),
  purchased_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),

  -- A store can only purchase a theme once
  CONSTRAINT uq_theme_purchase_store_theme UNIQUE (store_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_theme_purchase_store ON pd_theme_purchase(store_id);
CREATE INDEX IF NOT EXISTS idx_theme_purchase_theme ON pd_theme_purchase(theme_id);

-- Add price and is_premium columns to pd_theme if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pd_theme' AND column_name = 'price'
  ) THEN
    ALTER TABLE pd_theme ADD COLUMN price DECIMAL(10, 2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pd_theme' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE pd_theme ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pd_theme' AND column_name = 'preview_images'
  ) THEN
    ALTER TABLE pd_theme ADD COLUMN preview_images JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pd_theme' AND column_name = 'features'
  ) THEN
    ALTER TABLE pd_theme ADD COLUMN features JSONB DEFAULT '[]';
  END IF;
END $$;

-- ─── Platform config table (admin global settings) ──────────────

CREATE TABLE IF NOT EXISTS pd_platform_config (
  key             VARCHAR(100) PRIMARY KEY,
  value           TEXT NOT NULL,
  updated_by      UUID REFERENCES pd_user(id),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed default platform settings
INSERT INTO pd_platform_config (key, value) VALUES
  ('order_splitting_enabled', 'true'),
  ('retention_days_flouci', '7'),
  ('retention_days_konnect', '7'),
  ('retention_days_mandat', '14'),
  ('retention_days_cod', '7'),
  ('min_withdrawal_tnd', '20'),
  ('platform_commission_rate', '15'),
  ('max_upload_size_mb', '10')
ON CONFLICT (key) DO NOTHING;

-- ─── Rollback ───────────────────────────────────────────────────
-- DROP TABLE IF EXISTS pd_theme_purchase;
-- ALTER TABLE pd_theme DROP COLUMN IF EXISTS price;
-- ALTER TABLE pd_theme DROP COLUMN IF EXISTS is_premium;
-- ALTER TABLE pd_theme DROP COLUMN IF EXISTS preview_images;
-- ALTER TABLE pd_theme DROP COLUMN IF EXISTS features;
