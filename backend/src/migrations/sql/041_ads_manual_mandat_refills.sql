-- Add admin-reviewed manual mandat funding to PandaMarket Ads refills.
ALTER TABLE pd_ads_refill_intent DROP CONSTRAINT IF EXISTS pd_ads_refill_intent_gateway_check;
ALTER TABLE pd_ads_refill_intent ADD CONSTRAINT pd_ads_refill_intent_gateway_check
  CHECK (gateway IN ('flouci','konnect','manual_mandat'));

ALTER TABLE pd_ads_refill_intent DROP CONSTRAINT IF EXISTS pd_ads_refill_intent_status_check;
ALTER TABLE pd_ads_refill_intent ADD CONSTRAINT pd_ads_refill_intent_status_check
  CHECK (status IN ('pending','pending_review','captured','failed','expired','rejected'));

ALTER TABLE pd_ads_refill_intent
  ADD COLUMN IF NOT EXISTS proof_url TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_ads_refill_manual_review
  ON pd_ads_refill_intent(status, created_at)
  WHERE gateway='manual_mandat';
