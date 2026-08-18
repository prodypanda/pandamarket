-- 077_ai_purpose_multi_tier_fallback.sql
-- Add 3-tier multi-model failover columns (Primary, Fallback 1, Fallback 2) to pd_ai_purpose_routing

ALTER TABLE pd_ai_purpose_routing
ADD COLUMN IF NOT EXISTS fallback_provider_config_id_1 TEXT REFERENCES pd_ai_provider_config(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fallback_provider_config_id_2 TEXT REFERENCES pd_ai_provider_config(id) ON DELETE SET NULL;
