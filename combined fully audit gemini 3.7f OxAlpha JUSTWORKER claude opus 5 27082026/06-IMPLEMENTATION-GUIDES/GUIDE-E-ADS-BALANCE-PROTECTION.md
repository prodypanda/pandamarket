## Guide E · Ads Auto-Refill Balance Minting Fix (P0-5)
**Files:** `backend/src/services/ads.service.ts`

In `backend/src/services/ads.service.ts:512-520`:
1. Remove direct `UPDATE pd_ads_account SET balance = balance + $1` statement.
2. In the validation schema, reject `auto_refill_enabled: true` until real automated card capture is implemented.

---
