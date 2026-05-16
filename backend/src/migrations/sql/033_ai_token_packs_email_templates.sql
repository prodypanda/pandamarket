CREATE TABLE IF NOT EXISTS pd_ai_token_pack (
  id VARCHAR(64) PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  tokens INTEGER NOT NULL CHECK (tokens > 0),
  price_tnd DECIMAL(12,3) NOT NULL CHECK (price_tnd >= 0),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO pd_ai_token_pack (id, label, tokens, price_tnd, sort_order)
VALUES
  ('ai_pack_starter_100', 'Starter AI Boost', 100, 5.000, 10),
  ('ai_pack_growth_500', 'Growth AI Pack', 500, 20.000, 20),
  ('ai_pack_scale_1500', 'Scale AI Pack', 1500, 50.000, 30)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS pd_ai_token_purchase (
  id VARCHAR(64) PRIMARY KEY,
  store_id VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  pack_id VARCHAR(64) REFERENCES pd_ai_token_pack(id) ON DELETE SET NULL,
  tokens INTEGER NOT NULL CHECK (tokens > 0),
  amount_tnd DECIMAL(12,3) NOT NULL CHECK (amount_tnd >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  payment_method VARCHAR(30) NOT NULL DEFAULT 'wallet',
  wallet_transaction_id VARCHAR(64) REFERENCES pd_wallet_transaction(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_token_purchase_store_created
  ON pd_ai_token_purchase(store_id, created_at DESC);

ALTER TABLE pd_ai_feature_pricing
  DROP CONSTRAINT IF EXISTS pd_ai_feature_pricing_tokens_required_check;

ALTER TABLE pd_ai_feature_pricing
  ADD CONSTRAINT pd_ai_feature_pricing_tokens_required_check CHECK (tokens_required >= 0);

INSERT INTO pd_ai_feature_pricing (job_type, tokens_required)
VALUES ('product_description', 2)
ON CONFLICT (job_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS pd_email_template_style (
  id VARCHAR(64) PRIMARY KEY,
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('marketplace', 'store')),
  store_id VARCHAR(64) REFERENCES pd_store(id) ON DELETE CASCADE,
  template_key VARCHAR(80) NOT NULL,
  label VARCHAR(160) NOT NULL,
  subject TEXT,
  preheader TEXT,
  title TEXT,
  body_html TEXT,
  cta_label TEXT,
  cta_url TEXT,
  primary_color VARCHAR(20) NOT NULL DEFAULT '#16C784',
  accent_color VARCHAR(20) NOT NULL DEFAULT '#B91C1C',
  background_color VARCHAR(20) NOT NULL DEFAULT '#F8F9FC',
  text_color VARCHAR(20) NOT NULL DEFAULT '#1A1A2E',
  header_background VARCHAR(20) NOT NULL DEFAULT '#1A1A2E',
  footer_text TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK ((scope = 'marketplace' AND store_id IS NULL) OR (scope = 'store' AND store_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_template_style_unique
  ON pd_email_template_style(scope, COALESCE(store_id, ''), template_key);

CREATE INDEX IF NOT EXISTS idx_email_template_style_scope_store
  ON pd_email_template_style(scope, store_id);

INSERT INTO pd_email_template_style
  (id, scope, store_id, template_key, label, primary_color, accent_color, background_color, text_color, header_background, footer_text)
VALUES
  ('email_tpl_marketplace_welcome_customer', 'marketplace', NULL, 'welcome_customer', 'Buyer registration', '#16C784', '#B91C1C', '#F8F9FC', '#1A1A2E', '#1A1A2E', 'PandaMarket SARL'),
  ('email_tpl_marketplace_order_confirmed', 'marketplace', NULL, 'order_confirmed', 'Order placed', '#16C784', '#B91C1C', '#F8F9FC', '#1A1A2E', '#1A1A2E', 'PandaMarket SARL'),
  ('email_tpl_marketplace_payment_captured', 'marketplace', NULL, 'payment_captured', 'Payment confirmed', '#16C784', '#B91C1C', '#F8F9FC', '#1A1A2E', '#1A1A2E', 'PandaMarket SARL')
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'pd_set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_pd_ai_token_pack_updated_at ON pd_ai_token_pack;
    CREATE TRIGGER trg_pd_ai_token_pack_updated_at
      BEFORE UPDATE ON pd_ai_token_pack
      FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();

    DROP TRIGGER IF EXISTS trg_pd_email_template_style_updated_at ON pd_email_template_style;
    CREATE TRIGGER trg_pd_email_template_style_updated_at
      BEFORE UPDATE ON pd_email_template_style
      FOR EACH ROW EXECUTE FUNCTION pd_set_updated_at();
  END IF;
END $$;
