-- Migration 042: Add campaign reserved_amount, auto-refill columns, and blocked IP table
ALTER TABLE pd_ads_campaign ADD COLUMN IF NOT EXISTS reserved_amount NUMERIC(18,3) NOT NULL DEFAULT 0 CHECK (reserved_amount >= 0);

ALTER TABLE pd_ads_account ADD COLUMN IF NOT EXISTS auto_refill_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pd_ads_account ADD COLUMN IF NOT EXISTS auto_refill_threshold NUMERIC(18,3) NOT NULL DEFAULT 5.000 CHECK (auto_refill_threshold >= 0);
ALTER TABLE pd_ads_account ADD COLUMN IF NOT EXISTS auto_refill_amount NUMERIC(18,3) NOT NULL DEFAULT 20.000 CHECK (auto_refill_amount > 0);

CREATE TABLE IF NOT EXISTS pd_ads_blocked_ip (
  ip_hash VARCHAR(128) PRIMARY KEY,
  reason TEXT,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
