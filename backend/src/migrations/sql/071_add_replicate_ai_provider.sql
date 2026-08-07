-- 071_add_replicate_ai_provider.sql
-- Add replicate to AiProvider CHECK constraint

ALTER TABLE pd_ai_provider_config DROP CONSTRAINT pd_ai_provider_config_provider_check;
ALTER TABLE pd_ai_provider_config ADD CONSTRAINT pd_ai_provider_config_provider_check CHECK (provider IN ('gemini', 'openai', 'claude', 'custom', 'replicate'));

ALTER TABLE pd_store_ai_provider_config DROP CONSTRAINT pd_store_ai_provider_config_provider_check;
ALTER TABLE pd_store_ai_provider_config ADD CONSTRAINT pd_store_ai_provider_config_provider_check CHECK (provider IN ('gemini', 'openai', 'claude', 'custom', 'replicate'));
