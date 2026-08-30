# 02 — P0 Critical Findings (merged, unified numbering)

Each finding: Location · Description · Evidence · Impact · Reproduction · Fix direction. Line numbers at `7141e9f`.

---

## P0-1 — Order/fulfillment state desync on carrier-driven transitions

**Found by**: Audit A (P0-3) + Audit B (F-2) — independently.
**Location**:
- `backend/src/services/shipping.service.ts:664-669` (`createShipment` — sets fulfillment `shipped`, never touches order)
- `backend/src/services/shipping.service.ts:882-895` (`persistTrackingResult` — sets fulfillment `shipped/delivered/cancelled`, never touches order; on `delivered` for COD never captures payment; on `returned/cancelled` never restocks)

**Description**: Two of the three "ship" paths mutate fulfillments without recomputing `pd_order.status` or running the COD-capture/notify side effects. Full analysis in doc 01 RC-1.1/RC-1.2.

**Evidence**: Production orders `...vCzt4t3H`, `...kB2SykvE` (single-fulfillment COD, Aramex-shipped 2026-08-15) still `payment_required` on 2026-08-30; their COD payment is un-capturable by existing code (only `markStoreFulfillmentDelivered` captures COD, and it is reachable only from the manual dashboard button). Counter-example: manual-modal orders correctly reach `fulfilled`. Worker confirmed running (`main.ts:587`, `worker.ts:66`).

**Impact**: Symptom 1; permanently un-captured COD revenue → vendor wallets never credited; delivered orders stuck with **no UI repair** (B: `canMarkDelivered` requires `shipped`); analytics/counters distortion; makes P0-4 exploitable.

**Fix direction**: Guide A (centralize `syncOrderStatusFromFulfillments`, call in-transaction from all five mutation sites) + Guide C (COD capture on carrier delivery) + production backfill (Guide A step 5).

---

## P0-2 — `ORDER_PLACED` is never emitted: the entire order-placed notification layer is dead

**Found by**: **Audit A only** (P0-1). (Audit B's events table listed it as "✅ wired" — **incorrect**; resolved in doc 06 §2.)
**Location**:
- Defined: `backend/src/events/event-bus.ts:41` (`ORDER_PLACED: 'pd.order.placed'`)
- Should be emitted in: `orderService.checkout()` (order.service.ts:376-880) — only `logger.info('Order created')` at 871-874.
- Subscribers waiting forever: `order.subscriber.ts:38-45` (customer email `order_confirmed`, in-app notification, **WhatsApp confirmation**, vendor "Nouvelle commande" notification + socket `new_order` + email), `webhook.subscriber.ts:54-57` (vendor ERP/POS webhooks), `stock-low.subscriber.ts:21` (order-driven low-stock alerts).

**Evidence**: Repo-wide grep of `eventBus.emit(PdEvent.` → 13 hits total (STOCK_LOW, PAYMENT_CAPTURED ×4, AI_JOB_*, WALLET_*, PRODUCT_PUBLISHED ×2, ORDER_REFUNDED, PAYMENT_REFUNDED) — **none ORDER_PLACED**. `git log -S "ORDER_PLACED" -- order.service.ts order.route.ts` → empty: never existed (unfinished integration, not a regression).

**Impact**: Customers receive **no order confirmation** (email/WhatsApp/in-app); vendors **never alerted** of new orders; vendor ERP/POS webhooks never fire for orders; low-stock alerts never triggered by purchases; `orders_created` business metric never increments.

**Fix direction**: Guide B step 1 — emit after checkout commit (skip on idempotent replay), fire-and-forget with logging (order is already committed).

---

## P0-3 — `ORDER_FULFILLED` is never emitted: no shipment notifications

**Found by**: Audit A (P0-2) + Audit B (F-1).
**Location**: Defined `event-bus.ts:42`; subscriber `order.subscriber.ts:56-62` → `onOrderFulfilled` (366-426): customer notification "Commande expédiée", `order_shipped` email with carrier+tracking, WhatsApp tracking message; `webhook.subscriber.ts:63-66` vendor webhooks.

**Description**: Neither `fulfill()` nor `createShipment` nor `persistTrackingResult` emits it. Buyers never learn their order shipped; the tracking number is delivered nowhere except manually by the seller.

**Fix direction**: Guide B step 2 — emit with `{ order_id, carrier, tracking_number }` (payload shape the subscriber already expects) from the manual ship path AND from the central recompute helper on pending→shipped transitions; per-fulfillment idempotency guard against double-send.

---

## P0-4 — Whole-order `cancel()` ignores fulfillment state (can cancel shipped orders)

**Found by**: **Audit A only** (P0-4).
**Location**: `backend/src/services/order.service.ts:2041-2086` (`cancel`), route `PUT /api/pd/orders/:id/cancel` (order.route.ts:427-459).

**Description**: Guards only on `order.status` (cancelled / fulfilled / delivered). After P0-1, a shipped fulfillment coexists with `pending`/`payment_required` order status → a buyer (or admin) cancelling such an order will:
- set `pd_order.status='cancelled'` while the fulfillment remains `shipped` (the UPDATE touches only `pd_order`);
- **restock items physically in transit** (`restoreOrderItemStock` loop);
- free serial license keys for in-flight orders (when payment not captured).

`cancelUnstartedPaymentOrder()` (2093-2206) contains the correct fulfillment-started guard (2122-2130) — the pattern exists, just not in the public cancel.

**Reproduction**: COD order → generate carrier label (fulfillment `shipped`, order stays `payment_required`) → buyer `PUT /orders/:id/cancel` → 200 OK; order cancelled, stock restored, parcel still with the carrier.

**Fix direction**: Guide E — copy the fulfillment-state guard; when allowed, also cancel fulfillments atomically in the same transaction.

---

## P0-5 — Refund processing restocks incorrectly and debits gross instead of net

**Found by**: Audit A (P0-5) + Audit B (F-5, restock half).
**Location**: `backend/src/services/order.service.ts:1934-2039` (`processStoreRefund`).

**Three defects**:
1. **Restock re-runs fully on every processed refund** (~2011-2018): unconditional `UPDATE pd_product ... + oi.quantity` for ALL store items → two partial refunds = double restock; cancel-then-refund = double restock. No ledger of already-restocked units.
2. **Restock ignores variants, bundles, serials**: only `pd_product.inventory_quantity` is touched. The correct reference implementation `restoreOrderItemStock()` (289-332 — variants + bundle components) is used by cancel paths but not here; serial keys never reclaimed.
3. **Wallet debit is gross, credit was net** (1976-1982): `walletService.debitRefund(amount)` debits the full refund, but `onPaymentCaptured` credited **net of commission** (order.subscriber.ts:219-236). Free plan (15%): full refund debits 100 TND from a wallet that received 85 TND → **vendor wallet negative by design**.

**Related governance gap** (B F-6, elevated here): the process endpoint is seller-self-service with **no admin approval gate or audit log** — wallet debit, restock, and order→`refunded` are all seller-triggered.

**Fix direction**: Guide F — once-per-unit restock tracking (refunded_items ledger or metadata flag), reuse `restoreOrderItemStock`, free serials, commission-aware debit policy decision, approval threshold + `pd_audit_log`.

---

## P0-6 — Vendor wallet credit omits shipping fees (merchants absorb delivery cost)

**Found by**: **Audit C only** (its "Bug D" / critical financial finding). Math re-verified during merge.
**Location**: `backend/src/subscribers/order.subscriber.ts:200-236` (`onPaymentCaptured`):

```sql
SELECT i.store_id, ..., SUM(i.subtotal)::text AS store_total
FROM pd_order_item i ...
-- code comment: "Per-store totals (excluding shipping for commission calc — keep it simple here)"
```

Then `net = calculateVendorNet(store_total, commission_rate)` and `walletService.creditPending(net)`.

**Description**: The buyer pays `items + shipping` (per-store flat shipping ~7 TND, stored on `pd_fulfillment.shipping_total` and included in COD `cod_amount` at label generation — order.service.ts:1227). The vendor wallet credit is computed from **item subtotal only**. The shipping fee collected from the buyer never reaches the merchant — while the merchant is the one paying the carrier (or remitting via the courier-settlement ledger where `courier_fee` is deducted from what the courier collected).

**Worked example (Audit C)**: Free-plan vendor, 100.000 TND items + 7.000 TND shipping. Customer pays 107.000. Commission 15.000. Expected vendor credit: 85.000 + 7.000 = **92.000**. Actual credit: **85.000**. The 7.000 TND shipping stays in the marketplace account; the merchant ships out of pocket.

**Impact**: Systematic under-crediting of every vendor on every paid order with shipping (~7 TND/store/order at current rates). Compounds with P0-1 (COD orders never capture at all) and P0-5 (refunds debit gross).

**Caveat / business decision required**: whether shipping passes 100% to the merchant depends on the platform's shipping economics (platform-subsidized labels vs seller-managed carriers). The code comment "keep it simple here" indicates an unfinished decision rather than a deliberate policy. **Decision needed from owner** before Guide J is implemented: (a) credit `net_items + shipping` (Audit C's proposal), or (b) explicitly document shipping as platform revenue and adjust seller-facing pricing/UI accordingly.

**Fix direction**: Guide J (with the business-decision gate) — extend the per-store query with `COALESCE(MAX(f.shipping_total),0)`, commission on items only, credit `net_items + shipping_total`; keep the description string transparent; make it idempotent-safe with the existing sale-transaction guard (orders already credited under the old rule would need a reconciliation decision).
