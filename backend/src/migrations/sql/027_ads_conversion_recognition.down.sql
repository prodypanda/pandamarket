DROP INDEX IF EXISTS idx_ads_conversion_pending;
ALTER TABLE pd_ads_conversion DROP COLUMN IF EXISTS recognized_at;
