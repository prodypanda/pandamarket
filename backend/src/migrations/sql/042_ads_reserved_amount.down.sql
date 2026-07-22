-- Migration 042 Down: Rollback campaign reserved_amount, auto-refill columns, and blocked IP table
ALTER TABLE pd_ads_campaign DROP COLUMN IF EXISTS reserved_amount;

ALTER TABLE pd_ads_account DROP COLUMN IF EXISTS auto_refill_enabled;
ALTER TABLE pd_ads_account DROP COLUMN IF EXISTS auto_refill_threshold;
ALTER TABLE pd_ads_account DROP COLUMN IF EXISTS auto_refill_amount;

DROP TABLE IF EXISTS pd_ads_blocked_ip;
