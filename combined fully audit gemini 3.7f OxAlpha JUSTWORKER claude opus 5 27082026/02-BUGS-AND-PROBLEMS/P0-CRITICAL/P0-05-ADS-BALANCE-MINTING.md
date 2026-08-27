# P0-05 · ADS-BALANCE-MINTING

### P0-5 · Ads Auto-Refill Balance Minting Without Payment
- **Files:** `backend/src/services/ads.service.ts:512-520`
- **Evidence:** `checkAndTriggerAutoRefill` directly updates balance without charging cards.
- **Root Cause:** Incomplete auto-charge implementation directly mutating balance.
- **Fix Guide:** See [Guide E](../../06-IMPLEMENTATION-GUIDES/GUIDE-E-ADS-BALANCE-PROTECTION.md).
