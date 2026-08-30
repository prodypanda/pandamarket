# 02 — P0 Critical Bugs

Format: each bug has Location, Description, Evidence, Impact, Reproduction, and Fix direction. Line numbers refer to HEAD `7141e9f`.

---

## P0-1 — `ORDER_PLACED` event is never emitted (entire order notification layer dead)

**Location**
- Defined: `backend/src/events/event-bus.ts:41` (`ORDER_PLACED: 'pd.order.placed'`)
- Should be emitted in: `backend/src/services/order.service.ts` `checkout()` (line 376-880) — only `logger.info(... 'Order created')` at line 871-874.
- Subscribers waiting forever: `backend/src/subscribers/order.subscriber.ts:38-45` (customer email `order_confirmed` at 102-114, customer in-app notification at 92-100, **WhatsApp confirmation** at 117-140, vendor "Nouvelle commande" notification + socket `new_order` + email at 142-175), `backend/src/subscribers/webhook.subscriber.ts:54-57` (vendor ERP/POS outgoing webhooks), `backend/src/subscribers/stock-low.subscriber.ts:21` (low-stock alert engine driven by order consumption).

**Description**
`checkout()` commits the order (transaction at line 404-879) and returns. No `eventBus.emit(PdEvent.ORDER_PLACED, ...)` call exists anywhere in the codebase. `git log -S "ORDER_PLACED" -- backend/src/services/order.service.ts backend/src/api/order.route.ts` returns **empty** — it never existed, so this is not a regression but an unfinished integration.

**Evidence**
- Grep of `eventBus.emit(PdEvent.` across `backend/src`: the only ORDER-related emissions are `PAYMENT_CAPTURED` (order.service.ts:1756, payment.service.ts:1002, payment-reconciliation.service.ts:353, payment.route.ts:615), `ORDER_REFUNDED` / `PAYMENT_REFUNDED` (order.service.ts:2021-2029). Zero `ORDER_PLACED`, zero `ORDER_FULFILLED`.

**Impact**
- Customers receive **no order confirmation** (email, WhatsApp, in-app).
- Vendors are **never notified** of new orders (no notification, no socket event, no email) — on a marketplace whose core promise is automatic Hub listing + vendor stores.
- Vendor **ERP/POS webhooks** never fire for orders (the "Integrate ERP/POS via REST API and outgoing webhooks" feature is dead for orders).
- **Low-stock alerts** are never triggered by purchases (stock is decremented, but the alert engine listens to ORDER_PLACED).
- Business metrics: `incrementBusinessMetric('orders_created')` (subscriber line 40) never runs -> dashboards undercount.

**Fix direction (Guide B)**
After the checkout transaction commits successfully, emit:
```ts
eventBus.emit(PdEvent.ORDER_PLACED, { order_id: orderId }).catch(...)
```
Note: `eventBus.emit` is async in this codebase (subscribers await it in payment paths — see order.service.ts:1756 `await eventBus.emit(...)`). Emit AFTER commit (post-`transaction()`), and decide policy: fire-and-forget with logging vs await. Recommend: await inside the route after `orderService.checkout` returns, or emit-and-catch. Also consider an outbox pattern later (an outbox worker already exists at `backend/src/workers/outbox.worker.ts`).

---

## P0-2 — `ORDER_FULFILLED` event is never emitted (no shipping notifications)

**Location**
- Defined: `backend/src/events/event-bus.ts:42` (`ORDER_FULFILLED: 'pd.order.fulfilled'`)
- Subscribers: `order.subscriber.ts:56-62` -> `onOrderFulfilled` (366-426): customer notification "Commande expédiée" (390-398), email `order_shipped` with carrier + tracking (399-409), **WhatsApp shipping notification** (412-425); `webhook.subscriber.ts:63-66` (vendor webhooks).

**Description**
Neither the manual fulfill path (`order.service.ts:1615-1646`) nor the carrier-label path (shipping.service.ts:664-669) nor the tracking-sync path (shipping.service.ts:882-895) emits `ORDER_FULFILLED`. Dead code — no shipping notification of any kind is ever sent to the customer, and vendor webhooks never receive shipment events.

**Impact**
- Customers never learn their order shipped (no tracking number delivered anywhere except by the seller manually).
- Vendor webhook integrations miss the shipment event entirely.

**Fix direction (Guide B)**: emit in `fulfill()` after the status update, AND in the centralized `syncOrderStatusFromFulfillments` helper (Guide A) whenever a fulfillment transitions pending->shipped, with `{ order_id, carrier, tracking_number }` payload (matches the subscriber's expected shape at order.subscriber.ts:366-370).

---

## P0-3 — Order/fulfillment state desync on carrier-driven transitions

**Location**
- `backend/src/services/shipping.service.ts:664-669` (`createShipment` — sets fulfillment `shipped`, never touches order).
- `backend/src/services/shipping.service.ts:882-895` (`persistTrackingResult` — sets fulfillment `shipped`/`delivered`/`cancelled`, never touches order; on `delivered` for COD never captures payment; on `cancelled`/`returned` never restocks).

**Description & Evidence** — full detail in `01-ANSWERS-THREE-SYMPTOMS.md` root causes 1.1 and 1.2. Production proof: orders `...vCzt4t3H`, `...kB2SykvE` (single-fulfillment COD, Aramex-shipped 2026-08-15) still `payment_required` on 2026-08-30; their COD payment can never be captured by the existing code (only `markStoreFulfillmentDelivered` captures COD, and it requires `status='shipped'` — true — but it is only reachable from the manual dashboard button; the carrier webhook delivery bypasses it).

**Impact**
- Symptom 1 as reported by the owner.
- COD revenue permanently un-captured for carrier-delivered orders -> vendor wallets never credited (wallet credit pipeline runs only on `PAYMENT_CAPTURED`).
- Analytics revenue (`payment_status='captured'` filters in `listByStore` summary and analytics.service) undercounts.
- Cancels/refunds/compensation logic that trusts `pd_order.status` behaves incorrectly (see P0-4).

**Fix direction (Guides A + C)**: centralize a `syncOrderStatusFromFulfillments(executor, orderId)` and invoke it (in-transaction) from: `createShipment`, `persistTrackingResult`, `fulfill`, `markStoreFulfillmentDelivered`, `cancelStoreFulfillment`, `markStoreFulfillmentRto`. For COD delivery via carrier, additionally run the capture block (payment_status -> captured, `PAYMENT_CAPTURED` emit, courier settlement link, ads conversion recognition) — i.e., factor the tail of `markStoreFulfillmentDelivered` into a reusable private method.

---

## P0-4 — Whole-order `cancel()` ignores fulfillment state (can cancel shipped orders)

**Location**: `backend/src/services/order.service.ts:2041-2086` (`cancel`), called by `PUT /api/pd/orders/:id/cancel` (`backend/src/api/order.route.ts:427-459`).

**Description**
The only guards are:
```ts
if (order.status === OrderStatus.Cancelled) throw ...;                        // 2043-2045
if ([Fulfilled, Delivered].includes(order.status)) throw ...;                 // 2046-2051
```
It trusts `pd_order.status` — but P0-3 proves shipped fulfillments coexist with `pending`/`payment_required` order status. A buyer (or admin) cancelling such an order will:
- set `pd_order.status = 'cancelled'` while the fulfillment remains `shipped` (the UPDATE at 2053-2057 touches only `pd_order`);
- **restock items that are physically in transit** (`restoreOrderItemStock` loop at 2058-2083);
- free serial license keys only when payment isn't captured (2074-2082) — for shipped-but-uncaptured COD orders they get freed too.

Contrast with `cancelUnstartedPaymentOrder()` (2093-2206), which correctly checks `COUNT(fulfillments WHERE status IN ('shipped','delivered'))` (2122-2130) before compensating — that guard exists, just not in the public cancel.

**Reproduction**
1. Create a COD order (status `payment_required`).
2. Generate a carrier label (fulfillment -> `shipped`, order stays `payment_required` — P0-3).
3. As the buyer, `PUT /api/pd/orders/:id/cancel` with any reason -> 200 OK. Order cancelled, stock restored, parcel still with Aramex.

**Impact**: inventory corruption (phantom stock), contradictory states (`cancelled` order + `shipped` fulfillment), seller ships goods that are "cancelled", serial keys freed for in-flight orders.

**Fix direction (Guide E)**: inside `cancel()`, first run the same fulfillment-state check as `cancelUnstartedPaymentOrder` (refuse if any fulfillment is `shipped`/`delivered`, or convert to per-store cancellation semantics); also set fulfillments `cancelled` atomically when a whole-order cancel is allowed.

---

## P0-5 — Refund processing restocks incorrectly and debits gross instead of net

**Location**: `backend/src/services/order.service.ts:1934-2039` (`processStoreRefund`).

**Three distinct defects:**

1. **Restock re-runs fully on every processed refund** (lines 2011-2018):
   ```sql
   UPDATE pd_product p
      SET inventory_quantity = p.inventory_quantity + oi.quantity, ...
     FROM pd_order_item oi
    WHERE oi.order_id = $1 AND oi.store_id = $2 AND oi.product_id = p.id
   ```
   Two sequential partial refunds on the same order each add the FULL item quantities -> **double restock** (inflated phantom stock). There is no ledger/marker of "already restocked for this refund".

2. **Restock ignores variants, bundles, and serial products**: only `pd_product.inventory_quantity` is incremented. Variant stock (`pd_product_variant`), bundle component stock (`pd_product_bundle_item` expansion — see the correct reference implementation `restoreOrderItemStock()` at 289-332), and license-key freeing are all skipped. Compare with `cancel()`/`cancelStoreFulfillment()` which use `restoreOrderItemStock` properly.

3. **Wallet debit is gross, credit was net** (lines 1976-1982): `walletService.debitRefund({ amount: refundAmount, ... })` debits the full refund amount, but vendors were credited **net of commission** in `onPaymentCaptured` (order.subscriber.ts:219-236: `calculateVendorNet(total, limits.commission_rate)`). On the Free plan (15% commission), a full refund debits 100 TND from a wallet that only received 85 TND -> **vendor wallet goes negative by design**.

**Also notable in the same method**: refund status transitions are `requested -> processed` only (a `rejected` guard exists at 1950-1952; there is no API surface to reject/approve — `POST /store/:id/refunds/:refundId/process` processes unconditionally).

**Impact**: inventory corruption (over-restock, variant/bundle desync), negative vendor balances, financial loss on Free-plan stores, serial products refunded but keys not reclaimed.

**Fix direction (Guide F)**: (a) restock once per order-item per unit refunded — either track `restocked_quantity` on refund rows or restock only the delta between cumulative processed refund amounts and previously restocked amounts; (b) reuse `restoreOrderItemStock` per line with actual refunded quantities (needs per-item refund granularity or a simple once-flag for full refunds); (c) debit `amount * (1 - commission_rate)` or introduce a commission-recovery transaction; (d) free serial keys for refunded serial items when not consumed.
