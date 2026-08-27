# Engineering Specification: PLAN-P0-05
## Prevent Ads Auto-Refill Balance Minting Without Real Payment

- **Target Bug:** [P0-5](../../02-BUGS-AND-PROBLEMS/P0-CRITICAL/P0-05-ADS-BALANCE-MINTING.md)
- **Severity:** 🔴 P0 (Arbitrary Balance Creation / Revenue Leakage)
- **Estimated Effort:** ⚡ 45 minutes
- **Impacted Systems:** Ads Service, Ads Account Management, Billing Worker.

---

### 1. Summary & Business Impact
In `backend/src/services/ads.service.ts:512-520`, the auto-refill logic `checkAndTriggerAutoRefill` detects when an advertising account drops below its threshold. Instead of calling a payment gateway (e.g. charging a saved card token or initiating an invoice), it directly runs:
`UPDATE pd_ads_account SET balance = balance + $1`
This creates free advertising money out of thin air on an automated schedule.

---

### 2. Root Cause & Blast Radius
- **Root Cause:** Incomplete feature stub where balance was credited directly without payment gateway integration.
- **Blast Radius:** Advertisers who enable auto-refill get perpetual free ads traffic, burning impressions and system compute with zero revenue for PandaMarket.

---

### 3. Proposed Changes & Exact Diffs

#### A. Modify `backend/src/services/ads.service.ts`
```diff
--- a/backend/src/services/ads.service.ts
+++ b/backend/src/services/ads.service.ts
@@ -512,12 +512,12 @@ export class AdsService {
   async checkAndTriggerAutoRefill(accountId: string): Promise<void> {
     const account = await this.getAccountById(accountId);
     if (!account || !account.auto_refill_enabled) return;
 
-    // DANGEROUS STUB: directly mutates balance with no payment
-    // await query('UPDATE pd_ads_account SET balance = balance + $1 WHERE id = $2', [account.auto_refill_amount, accountId]);
+    logger.warn({ accountId }, '[AdsService] Auto-refill requested but automated card charging is not configured. Skipping balance update.');
+    // Auto-refill must require an authorized payment card token
   }
```

#### B. Reject `auto_refill_enabled` in Validation Schema (`backend/src/api/ads.route.ts`)
```diff
--- a/backend/src/api/ads.route.ts
+++ b/backend/src/api/ads.route.ts
@@ -85,6 +85,11 @@ const updateAccountSettingsSchema = z.object({
   auto_refill_enabled: z.boolean().optional().refine(val => val !== true, {
+    message: 'Automated card auto-refill is currently disabled pending payment provider tokenization',
+  }),
   auto_refill_threshold: z.number().min(0).optional(),
   auto_refill_amount: z.number().min(10).optional(),
 });
```

---

### 4. Concurrency, Security & Edge Cases
- **Existing Balances:** Any existing accounts with `auto_refill_enabled = true` in the database must have that flag set to `false` via a safe migration query.
```sql
UPDATE pd_ads_account SET auto_refill_enabled = false WHERE auto_refill_enabled = true;
```

---

### 5. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/ads-service.test.ts
```

---

### 6. Manual Verification Procedure
1. Attempt to enable auto-refill via seller ads settings:
```bash
curl -i -X PUT http://localhost:9000/api/pd/ads/account/settings \
  -H "Authorization: Bearer $SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"auto_refill_enabled":true,"auto_refill_amount":50}'
```
*Expected Output:* `HTTP 400 Bad Request` with error `Automated card auto-refill is currently disabled pending payment provider tokenization`.

---

### 7. Rollback Strategy
Revert commit on failure:
```bash
git checkout HEAD -- backend/src/services/ads.service.ts backend/src/api/ads.route.ts
```
