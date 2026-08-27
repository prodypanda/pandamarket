# Engineering Specification: PLAN-B-18
## Add Idempotency Keys to Payouts & Connect Admin Approval Workflow

- **Target Bug:** [B-18](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-17-TO-B-21-SECURITY-INFRA.md#b-18)
- **Severity:** 🟠 P1 (Double Debit Risk / Missing Payout Approval Queue)
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Vendor Wallet Service, Admin Withdrawals Page.

---

### 1. Summary & Business Impact
`walletService.withdraw` takes a database lock on `pd_vendor_wallet` to prevent overdrawing, but lacks an idempotency key. An HTTP timeout followed by a retry creates two separate debit transactions. Furthermore, the admin `/withdrawals` page is a read-only historical list with no approve/reject buttons.

---

### 2. Proposed Changes & Exact Diffs

#### A. Add `idempotency_key` to Payout Creation
```diff
--- a/backend/src/services/wallet.service.ts
+++ b/backend/src/services/wallet.service.ts
@@ -190,6 +190,11 @@ export class WalletService {
+    if (opts.idempotency_key) {
+      const { rows } = await client.query('SELECT id FROM pd_wallet_transaction WHERE idempotency_key = $1', [opts.idempotency_key]);
+      if (rows.length > 0) return rows[0];
+    }
```

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/wallet-withdraw.test.ts
```
