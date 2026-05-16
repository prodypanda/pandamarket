ALTER TABLE pd_subscription_limits
  ADD COLUMN IF NOT EXISTS has_own_ai_provider BOOLEAN NOT NULL DEFAULT false;

UPDATE pd_subscription_limits
SET has_own_ai_provider = true
WHERE plan_id IN ('pro', 'golden', 'platinum');

UPDATE pd_subscription_limits
SET ai_tokens_included = 650,
    updated_at = NOW()
WHERE plan_id = 'pro'
  AND ai_tokens_included = -1;

CREATE TABLE IF NOT EXISTS pd_ai_provider_config (
  id VARCHAR(64) PRIMARY KEY,
  provider VARCHAR(30) NOT NULL CHECK (provider IN ('gemini', 'openai', 'claude', 'custom')),
  label VARCHAR(120) NOT NULL,
  model VARCHAR(160) NOT NULL,
  base_url TEXT,
  api_key_encrypted TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_provider_single_default
  ON pd_ai_provider_config (is_default)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_ai_provider_order
  ON pd_ai_provider_config (is_enabled, is_default DESC, priority ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS pd_ai_feature_pricing (
  job_type VARCHAR(30) PRIMARY KEY,
  tokens_required INTEGER NOT NULL CHECK (tokens_required >= 0),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO pd_ai_feature_pricing (job_type, tokens_required)
VALUES
  ('image_compression', 1),
  ('seo_generation', 2),
  ('page_copy', 2)
ON CONFLICT (job_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS pd_store_ai_provider_config (
  id VARCHAR(64) PRIMARY KEY,
  store_id VARCHAR(64) UNIQUE NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL CHECK (provider IN ('gemini', 'openai', 'claude', 'custom')),
  model VARCHAR(160) NOT NULL,
  base_url TEXT,
  api_key_encrypted TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

UPDATE pd_vendor_credits vc
SET ai_tokens = l.ai_tokens_included,
    last_refill = NOW(),
    updated_at = NOW()
FROM pd_store s
JOIN pd_subscription_limits l ON l.plan_id = s.subscription_plan
WHERE vc.store_id = s.id
  AND vc.ai_tokens = -1
  AND l.ai_tokens_included <> -1;

UPDATE pd_vendor_credits vc
SET ai_tokens = -1,
    last_refill = NOW(),
    updated_at = NOW()
FROM pd_store s
JOIN pd_subscription_limits l ON l.plan_id = s.subscription_plan
WHERE vc.store_id = s.id
  AND vc.ai_tokens <> -1
  AND l.ai_tokens_included = -1;
