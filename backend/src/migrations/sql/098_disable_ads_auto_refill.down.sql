-- 098_disable_ads_auto_refill.down.sql

-- No safe automatic rollback: re-enabling auto-refill would re-arm
-- unbacked balance minting (see P0-05). Re-enable explicitly per-account
-- only after a real payment integration exists.
SELECT 1;
