-- 098_disable_ads_auto_refill.sql
--
-- P0-05 backfill: the ads auto-refill feature could previously be enabled
-- with auto_refill_enabled = true while automated card charging was never
-- implemented. checkAndTriggerAutoRefill is now warn-only and the settings
-- route rejects enabling it, but any account row enabled before the fix
-- keeps a stale flag that would silently re-arm minting if the code path
-- is ever restored. Disable all remaining enabled rows.

UPDATE pd_ads_account SET auto_refill_enabled = FALSE WHERE auto_refill_enabled = TRUE;
