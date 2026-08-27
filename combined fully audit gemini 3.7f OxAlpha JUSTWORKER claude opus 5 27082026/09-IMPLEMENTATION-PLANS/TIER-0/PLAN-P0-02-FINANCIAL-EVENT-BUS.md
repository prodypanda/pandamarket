# Engineering Specification: PLAN-P0-02
## Connect Financial Event Bus & Guarantee Vendor Wallet Credits on Payment Capture

- **Target Bug:** [P0-2](../../02-BUGS-AND-PROBLEMS/P0-CRITICAL/P0-02-FINANCIAL-EVENT-BUS.md)
- **Severity:** 🔴 P0 (Direct Financial Loss / Vendor Wallet Starvation)
- **Estimated Effort:** 🛠 2 hours
- **Impacted Systems:** Payment Webhook Handler, Reconciliation Service, Order Service, Order Subscriber, Vendor Wallet.

---

### 1. Summary & Business Impact
When payments are captured online via Flouci or Konnect webhooks, or via automated reconciliation, the backend executes `orderService.markPaidInTransaction`. However, it fails to emit `eventBus.emit(PdEvent.PAYMENT_CAPTURED, { ... })`. 
The subscriber `order.subscriber.ts` listens for `PdEvent.PAYMENT_CAPTURED` to calculate platform commissions and credit `pd_vendor_wallet` via `walletService.creditPending`. Because the event is never emitted, **vendor wallets receive 0 TND for every card sale**. The same defect exists for Cash on Delivery (COD) orders upon delivery confirmation.

---

### 2. Root Cause & Blast Radius
- **Root Cause:**
  1. `backend/src/services/payment.service.ts:993`: `processPaymentWebhook` captures the payment and updates the order, but omits the event bus emission.
  2. `backend/src/services/payment-reconciliation.service.ts:325`: Successfully reconciles stuck transactions but omits `PAYMENT_CAPTURED`.
  3. `backend/src/services/order.service.ts:1748`: `confirmStoreFulfillmentDelivery` marks COD order fulfilled/delivered, but omits `PAYMENT_CAPTURED`.
  4. `backend/src/subscribers/order.subscriber.ts:148`: `onPaymentCaptured` lacks an idempotency check, meaning duplicate events could double-credit wallets.
- **Blast Radius:** All merchants using online payment or COD suffer 100% loss of credited funds in their platform wallet. Platform financial accounting completely disconnected from actual bank captures.

---

### 3. Proposed Changes & Exact Diffs

#### A. Modify `backend/src/services/payment.service.ts`
```diff
--- a/backend/src/services/payment.service.ts
+++ b/backend/src/services/payment.service.ts
@@ -990,6 +990,14 @@ export class PaymentService {
     await this.orderService.markPaidInTransaction(client, boundOrderId, {
       gateway: opts.gateway,
       reference: verifyResult.payment_id,
       source: 'webhook',
     });
+
+    await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
+      order_id: boundOrderId,
+      gateway: opts.gateway,
+      amount: verifyResult.amount,
+      currency: 'TND',
+      source: 'webhook',
+    });
```

#### B. Modify `backend/src/services/payment-reconciliation.service.ts`
```diff
--- a/backend/src/services/payment-reconciliation.service.ts
+++ b/backend/src/services/payment-reconciliation.service.ts
@@ -322,6 +322,14 @@ export class PaymentReconciliationService {
     await this.orderService.markPaidInTransaction(client, orderId, {
       gateway,
       reference: verifyResult.payment_id,
       source: 'reconciliation',
     });
+
+    await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
+      order_id: orderId,
+      gateway,
+      amount: parseFloat(order.total),
+      currency: 'TND',
+      source: 'reconciliation',
+    });
```

#### C. Modify `backend/src/services/order.service.ts`
```diff
--- a/backend/src/services/order.service.ts
+++ b/backend/src/services/order.service.ts
@@ -1745,6 +1745,15 @@ export class OrderService {
     if (allDelivered) {
       await client.query(
         `UPDATE pd_order SET status = 'delivered', updated_at = NOW() WHERE id = $1`,
         [opts.order_id],
       );
+      
+      if (order.payment_gateway === PaymentGateway.Cod) {
+        await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
+          order_id: opts.order_id,
+          gateway: PaymentGateway.Cod,
+          amount: parseFloat(order.total),
+          currency: 'TND',
+          source: 'cod_delivery',
+        });
+      }
     }
```

#### D. Add Idempotency Check in `backend/src/subscribers/order.subscriber.ts`
```diff
--- a/backend/src/subscribers/order.subscriber.ts
+++ b/backend/src/subscribers/order.subscriber.ts
@@ -148,6 +148,15 @@ async function onPaymentCaptured(orderId: string, gateway?: string): Promise<void>
   await assignSerialLicenseKeys(orderId);
 
+  // Idempotency check: verify if wallet transactions already exist for this order
+  const { rows: existingTx } = await query(
+    `SELECT id FROM pd_wallet_transaction WHERE order_id = $1 AND type = 'sale' LIMIT 1`,
+    [orderId]
+  );
+  if (existingTx.length > 0) {
+    logger.warn({ orderId }, '[onPaymentCaptured] Wallet already credited for order, skipping duplicate credit');
+    return;
+  }
+
   // Resolve per-payment-method retention days from platform config
   let retentionDays: number | undefined;
```

---

### 4. Concurrency, Security & Edge Cases
- **Webhook Replay / Double Delivery:** The idempotency query prevents double crediting if Flouci/Konnect send multiple webhook retries.
- **Partial Multi-Store Splits:** `order.subscriber.ts` already groups order items by `store_id`, correctly distributing commissions and net payouts per merchant.
- **Transaction Atomicity:** Event emission happens after `markPaidInTransaction` commits its internal row lock.

---

### 5. Automated Verification Plan
Run subscriber unit tests:
```bash
npm run test -w backend -- src/__tests__/order-subscriber.test.ts
```

---

### 6. Manual Verification Procedure
1. Trigger test webhook with valid signature:
```bash
curl -i -X POST http://localhost:9000/api/pd/payment/webhook/konnect \
  -H "Content-Type: application/json" \
  -d '{"payment_id":"konnect_test_999","order_id":"pd_ord_TEST123","status":"completed"}'
```
2. Query Supabase database to verify wallet transaction created:
```sql
SELECT * FROM pd_wallet_transaction WHERE order_id = 'pd_ord_TEST123';
```
*Expected Output:* 1 row of `type = 'sale'` with corresponding net amount credited.

---

### 7. Rollback Strategy
Revert commit on failure:
```bash
git checkout HEAD -- backend/src/services/payment.service.ts backend/src/services/payment-reconciliation.service.ts backend/src/services/order.service.ts backend/src/subscribers/order.subscriber.ts
```
