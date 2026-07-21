-- Migration 027: defer Ads conversion recognition until payment capture
ALTER TABLE pd_ads_conversion
  ADD COLUMN IF NOT EXISTS recognized_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ads_conversion_pending
  ON pd_ads_conversion(order_id)
  WHERE recognized_at IS NULL;
