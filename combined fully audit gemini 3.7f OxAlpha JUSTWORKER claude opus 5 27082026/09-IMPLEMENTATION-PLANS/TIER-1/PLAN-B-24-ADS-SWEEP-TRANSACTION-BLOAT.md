# Engineering Specification: PLAN-B-24
## Eliminate 60,368 Churn Transactions in Ads 5-Minute Lifecycle Sweep

- **Target Bug:** [B-24](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-22-TO-B-26-WORKERS-AND-ADS.md#b-24)
- **Severity:** 🟠 P1 (Database Bloat / 21 MB Churn / Ad Delivery Stalls)
- **Estimated Effort:** 🛠 2 hours
- **Impacted Systems:** Ads Sweep Timer, Database Performance, Ads Ledger.

---

### 1. Summary & Business Impact
Every 5 minutes, an in-process `setInterval` in `ads.service.ts:773` releases all campaign reservations and immediately re-reserves them, creating two ledger rows per campaign every 5 minutes. Over 30 days this generated **60,368 useless ledger rows** (21 MB, second largest table). While reservations drop to zero, live ad delivery stalls.

---

### 2. Proposed Changes & Exact Diffs

#### Modify `backend/src/services/ads.service.ts`
Reconcile reservations **incrementally**: only write transaction rows if the reserved amount has actually changed between cycles.
Move the sweep to a BullMQ repeatable job with a single distributed lock (`pg_advisory_xact_lock`).

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/ads-sweep.test.ts
```
