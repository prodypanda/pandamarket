# Engineering Specification: PLAN-P0-07
## Refactor Mandat Receipt Review to Use `markPaidInTransaction` & Emit Events

- **Target Bug:** [P0-7](../../02-BUGS-AND-PROBLEMS/P0-CRITICAL/P0-07-MANDAT-RECEIPT-REVIEW.md)
- **Severity:** 🔴 P0 (Financial Inconsistency / Order State Corruption)
- **Estimated Effort:** 🛠 2 hours
- **Impacted Systems:** Payment Route, Order Service, Mandat Receipt Processor, Vendor Wallet.

---

### 1. Summary & Business Impact
In `backend/src/api/payment.route.ts:466-532`, when an administrator reviews an offline Mandat receipt and approves it, the route handler executes a raw SQL query:
`UPDATE pd_order SET payment_status = 'captured', status = 'confirmed' WHERE id = $1`
This bypasses:
1. `orderService.markPaidInTransaction` (which updates payment attempts and pins status).
2. Per-store fulfillment records in `pd_store_order`.
3. `PdEvent.PAYMENT_CAPTURED` emission, meaning the merchant's wallet is never credited.
4. On rejection, the order is left in an un-resubmittable state with no re-upload path.

---

### 2. Root Cause & Blast Radius
- **Root Cause:** Direct SQL mutations instead of using the centralized `orderService.markPaidInTransaction` state machine.
- **Blast Radius:** All offline Mandat orders approved by admin leave the database in a desynchronized state; sellers see orders as confirmed but receive 0 TND in their wallet.

---

### 3. Proposed Changes & Exact Diffs

#### A. Modify `backend/src/api/payment.route.ts`
```diff
--- a/backend/src/api/payment.route.ts
+++ b/backend/src/api/payment.route.ts
@@ -490,12 +490,26 @@ router.post(
     if (action === 'approve') {
-      await client.query(
-        `UPDATE pd_order SET payment_status = 'captured', status = 'confirmed', updated_at = NOW() WHERE id = $1`,
-        [receipt.order_id]
-      );
+      // Use authoritative orderService method to capture payment
+      await orderService.markPaidInTransaction(client, receipt.order_id, {
+        gateway: 'manual_mandat',
+        reference: receipt.id,
+        source: 'receipt_review',
+      });
+
+      await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
+        order_id: receipt.order_id,
+        gateway: 'manual_mandat',
+        amount: receipt.amount,
+        currency: 'TND',
+        source: 'mandat_review',
+      });
     } else {
       await client.query(
-        `UPDATE pd_order SET payment_status = 'failed', status = 'cancelled', updated_at = NOW() WHERE id = $1`,
-        [receipt.order_id]
+        `UPDATE pd_order SET payment_status = 'payment_required', updated_at = NOW() WHERE id = $1`,
+        [receipt.order_id]
       );
     }
```

---

### 4. Concurrency, Security & Edge Cases
- **Gateway Verification:** The receipt review endpoint must assert that the order's `payment_gateway === 'manual_mandat'` before allowing receipt processing.
- **Rejection & Re-upload:** When rejected, `payment_status` is set back to `payment_required`, allowing the customer to re-upload a clear image of their postal receipt.

---

### 5. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/payment-receipts.test.ts
```

---

### 6. Manual Verification Procedure
1. Create a Mandat order and upload a receipt.
2. Approve the receipt via the admin endpoint:
```bash
curl -i -X POST http://localhost:9000/api/pd/admin/receipts/rcpt_123/review \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"approve","notes":"Postal slip verified"}'
```
3. Verify in SQL:
```sql
SELECT status, payment_status FROM pd_order WHERE id = 'ord_123';
SELECT * FROM pd_wallet_transaction WHERE order_id = 'ord_123';
```
*Expected Output:* `status = 'confirmed'`, `payment_status = 'captured'`, and wallet credited.

---

### 7. Rollback Strategy
Revert commit on failure:
```bash
git checkout HEAD -- backend/src/api/payment.route.ts
```
