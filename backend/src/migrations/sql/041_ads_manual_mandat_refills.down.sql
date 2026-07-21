DELETE FROM pd_ads_refill_intent WHERE gateway='manual_mandat';
DROP INDEX IF EXISTS idx_ads_refill_manual_review;
ALTER TABLE pd_ads_refill_intent
  DROP COLUMN IF EXISTS rejection_reason,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS proof_url;
ALTER TABLE pd_ads_refill_intent DROP CONSTRAINT IF EXISTS pd_ads_refill_intent_status_check;
ALTER TABLE pd_ads_refill_intent ADD CONSTRAINT pd_ads_refill_intent_status_check
  CHECK (status IN ('pending','captured','failed','expired'));
ALTER TABLE pd_ads_refill_intent DROP CONSTRAINT IF EXISTS pd_ads_refill_intent_gateway_check;
ALTER TABLE pd_ads_refill_intent ADD CONSTRAINT pd_ads_refill_intent_gateway_check
  CHECK (gateway IN ('flouci','konnect'));
