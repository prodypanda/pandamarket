# 07 — Implementation Guides (merged, A–L)

Concrete, step-by-step, code-sketched. Sketches merge the strongest version from each source audit; all must be adapted to final conventions and pass lint/typecheck/tests. **Coordinate with parallel agents before editing shared files** (order.service.ts, shipping.service.ts, order.route.ts, order.subscriber.ts, orders/page.tsx are all hot).

---

## Guide A — Centralize the order status state machine `[P0-1, P1-4]`

**Files**: `backend/src/services/order.service.ts`, `backend/src/services/shipping.service.ts`.
**Sources**: Audit A Guide A + Audit B P0-1 (sketch merged below).

### Step 1 — The helper (single source of truth)

Add to `OrderService` (merged sketch — A's SQL-set version with B's count-and-decide shape):

```ts
/**
 * Recompute pd_order.status from the fulfillment aggregate. MUST run inside
 * the caller's transaction. Idempotent. Canonical rules:
 *  - cancelled/refunded orders are never touched
 *  - any fulfillment 'preparing' (and none shipped/delivered) -> 'processing' (derived display state)
 *  - zero pending, >=1 delivered, rest terminal   -> 'delivered'
 *  - zero pending, >=1 shipped                    -> 'fulfilled'
 *  - zero pending/shipped/delivered (all canc.)   -> 'cancelled' (caller passes reason)
 *  - otherwise (any pending)                      -> leave alone
 */
async syncOrderStatusFromFulfillments(
  c: PoolClient,
  orderId: string,
  opts: { cancelReason?: string } = {},
): Promise<void> {
  await c.query(
    `UPDATE pd_order o
     SET status = sub.next_status,
         updated_at = NOW(),
         cancelled_at = CASE WHEN sub.next_status = 'cancelled' THEN NOW() ELSE o.cancelled_at END,
         cancelled_reason = CASE WHEN sub.next_status = 'cancelled' THEN $2 ELSE o.cancelled_reason END
     FROM (
       SELECT order_id,
              COUNT(*) FILTER (WHERE status = 'pending')    AS pend,
              COUNT(*) FILTER (WHERE status = 'preparing')  AS prep,
              COUNT(*) FILTER (WHERE status = 'shipped')    AS ship,
              COUNT(*) FILTER (WHERE status = 'delivered')  AS del
       FROM pd_fulfillment WHERE order_id = $1 GROUP BY order_id
     ) sub,
     LATERAL (SELECT CASE
                WHEN sub.pend = 0 AND sub.del > 0                        THEN 'delivered'
                WHEN sub.pend = 0 AND sub.ship > 0                       THEN 'fulfilled'
                WHEN sub.pend = 0 AND sub.prep = 0                       THEN 'cancelled'
                WHEN sub.ship = 0 AND sub.del = 0 AND sub.prep > 0       THEN 'processing'
                ELSE NULL
              END AS next_status) ns
     WHERE o.id = sub.order_id
       AND o.status NOT IN ('cancelled','refunded')
       AND ns.next_status IS NOT NULL
       AND o.status IS DISTINCT FROM ns.next_status`,
    [orderId, opts.cancelReason ?? null],
  );
}
```

(Drop the `preparing` branch until Guide D lands; digital-only orders have zero fulfillments → sub-select empty → untouched, `markPaid` keeps handling them.)

### Step 2 — Wire it into every mutation site

| Site | Change |
|---|---|
| `fulfill()` (1615-1646) | wrap in `transaction()`; delete the inline count/update block (1633-1644); call helper |
| `shippingService.createShipment()` (664-669) | after the fulfillment UPDATE, call the helper (pass the client — prefer making the shipment INSERT + fulfillment UPDATE + sync one transaction) |
| `persistTrackingResult()` (882-895) | already transactional — call helper with `client`; on `delivered` also Guide C; on `returned/cancelled` also restock (Guide G block) |
| `cancelStoreFulfillment()` (1767-1841) | replace ad-hoc counts block (1803-1838) with helper (pass reason) |
| `markStoreFulfillmentDelivered()` (1648-1765) | replace counts block (1735-1750) with helper; keep the COD-capture UPDATE (payment-specific) |
| `markStoreFulfillmentRto()` (2462-2512) | call helper (after Guide G guards) |

### Step 3 — Fix `fulfill()` NULL overwrite + atomicity

```sql
UPDATE pd_fulfillment
   SET status = 'shipped',
       carrier = COALESCE($3, carrier),
       tracking_number = COALESCE($4, tracking_number),
       shipped_at = NOW()
 WHERE order_id = $1 AND store_id = $2 AND status = 'pending'
```

### Step 4 — Tests

Single-store label → order `fulfilled`; carrier `delivered` sync → order `delivered` (+ COD captured after Guide C); two-store A-shipped-B-pending → order untouched; refunded order never resurrected.

### Step 5 — Production backfill (after deploy; business sign-off required)

```sql
UPDATE pd_order o SET status='fulfilled', updated_at=NOW()
WHERE o.status IN ('pending','payment_required')
  AND NOT EXISTS (SELECT 1 FROM pd_fulfillment f WHERE f.order_id=o.id AND f.status<>'shipped')
  AND EXISTS     (SELECT 1 FROM pd_fulfillment f WHERE f.order_id=o.id AND f.status='shipped');
```
Then resolve the two stuck COD orders per the business decision (capture+credit vs cancel+restock).

---

## Guide B — Emit the dead lifecycle events `[P0-2, P0-3]`

**Files**: `backend/src/api/order.route.ts`, `backend/src/services/order.service.ts` (+ shipping.service.ts via Guide A helper).

1. **ORDER_PLACED** — in both checkout routes, after `orderService.checkout` succeeds and `!result.replayed`:
```ts
try { await eventBus.emit(PdEvent.ORDER_PLACED, { order_id: result.order.id }); }
catch (err) { logger.error({ err, order_id: result.order.id }, 'ORDER_PLACED emission failed'); }
```
2. **ORDER_FULFILLED** — from `fulfill()` and from the Guide A helper on pending→shipped (detect via the fulfillment UPDATE's RETURNING):
```ts
eventBus.emit(PdEvent.ORDER_FULFILLED, {
  order_id, carrier: carrier ?? null, tracking_number: tracking ?? null,
}).catch((err) => logger.error({ err }, 'ORDER_FULFILLED emission failed'));
```
Payload shape matches `onOrderFulfilled` (order.subscriber.ts:366-370). Add a per-fulfillment idempotency guard (B) against double-send on re-ship races.
3. **Smoke-verify**: emailQueue jobs (`order_confirmed`, `new_order_vendor`, `order_shipped`), WhatsApp dispatch, notifications, socket `new_order`, `pd_webhook_delivery` rows.

---

## Guide C — COD capture on carrier-delivered orders `[completes P0-1]`

**Files**: order.service.ts, shipping.service.ts. (Audit A Guide C.)

1. Extract from `markStoreFulfillmentDelivered` a reusable `captureCodIfDelivered(c, orderId)`: FOR UPDATE the order; require gateway=COD, payment not captured, ALL fulfillments delivered (and ≥1); then `payment_status='captured'`.
2. In `persistTrackingResult`, when mapped status is `delivered`: call it inside the existing transaction; after commit, mirror 1752-1763 (ads recognition + `PAYMENT_CAPTURED` emission) → wallet credit flows through the existing subscriber.
3. When mapped status is `returned`/`cancelled`: restock via `restoreOrderItemStock` per item; update courier settlement to `disputed`.

---

## Guide D — Preparation state + timeline + drawer fixes `[Symptom 2, Symptom 3, P2-1, P2-4, P2-5]`

**Files**: order.route.ts, order.service.ts, orders/page.tsx.

### Step 1 — COD/RTO tabs fetch the detail (Symptom 3, two-line fix — all three audits agree)

```diff
- onClick={() => { setSelectedOrder(order); }}
+ onClick={() => { void openOrderDetail(order); }}
```
at page.tsx:2972 (COD Radar) and 3205 (RTO).

### Step 2 — Loading/error states

Gate the items/note/refunds/shipments cards on `loadingOrderDetail` (skeleton, not "indisponible"); on fetch error show a distinct "Impossible de charger les articles" + Retry (B's failure-state proposal) instead of keeping the stale row silently.

### Step 3 — Timeline Préparation

Preparation = `current` while `fulfillment_status === 'pending'` (and payment OK); `done` once `preparing`/`shipped`/`delivered`. Never derive "done" from `pending`.

### Step 4 — Persisted preparation (resolved design — see doc 06 §4.2)

**Fulfillment-level `'preparing'`** (recommended; Audit B Option A + Audit A Option 2; replaces Audit C's direct `pd_order` write with the derived rule already in Guide A's helper):
- `POST /api/pd/orders/store/:id/prepare` → `markStoreFulfillmentPreparing`: guarded `UPDATE pd_fulfillment SET status='preparing' WHERE order_id=$1 AND store_id=$2 AND status='pending'` (409 otherwise); then Guide A helper (order displays derived `processing`).
- No migration required (VARCHAR, no CHECK — verified); optionally add hygiene CHECK including `'preparing'`.
- Frontend: "Commencer la préparation" button when `fulfillment_status==='pending'`; `canFulfill`/`canCancelSellerFulfillment` accept `pending` AND `preparing`, and **stop gating on order-level status** (fixes P2-11 cross-store dead-end); `fulfillmentLabel` gains `preparing: "En préparation"`; status filter + zod enum (`order.route.ts:129`) + summary counters (`to_ship` should count `pending`+`preparing`) updated.
- Minimal alternative if the full feature is deferred: fulfillment `metadata.prepared_at` flag via the same endpoint shape (no status-domain change).

---

## Guide E — Guard whole-order cancel `[P0-4]`

**File**: order.service.ts `cancel()` (2041-2086). (Audit A Guide E.)

Inside a transaction: lock fulfillments; reject with `ORDER_CANNOT_CANCEL` if any `shipped`/`delivered`; keep the existing body; additionally set fulfillments `cancelled` where `pending`. Pattern source: `cancelUnstartedPaymentOrder` (2122-2130). Keep the route's vendor→store-scope redirect.

---

## Guide F — Refund correctness `[P0-5, P1-5]`

**File**: order.service.ts `processStoreRefund` (1934-2039). (A Guide F + B P2-1/P2-2 merged.)

1. **Restock once, per unit**: persist refunded lines — `refunded_items jsonb` (`[{order_item_id, quantity}]`, strict zod) on `pd_store_order_refund` (migration) or metadata with schema; restock only net-unrestocked quantities via `restoreOrderItemStock` (variants+bundles); free serial keys for refunded serial items. When payload has no items: amount-only refund, restock nothing.
2. **Commission-aware debit** (policy decision with owner): (a) debit net `amount*(1-commission_rate)` — vendor returns to pre-sale state, platform absorbs; or (b) debit gross + platform `commission_recovery` transaction. Resolve the rate from the wallet's original sale transaction metadata (plan may have changed).
3. **Oversight gate** (B): platform-config `refund_auto_process_max_amount_tnd` (default 0 = admin approval); amounts above → status `awaiting_admin` + admin notification; log every decision to `pd_audit_log`. Add the missing reject/approve endpoints.

---

## Guide G — RTO hardening `[P1-1]`

**File**: order.service.ts `markStoreFulfillmentRto` (2462-2512). (Audit A Guide G.)

Guard `AND status = 'shipped'` (409 otherwise, same transaction). Then: restock via `restoreOrderItemStock`; free serial keys; `pd_courier_settlement → 'disputed'`; COD verification status by reason (rejected only for customer-fault reasons; neutral/unreachable for carrier-fault); Guide A helper at the end.

---

## Guide H — Tenant-aware notification URLs `[P1-3]`

**File**: order.subscriber.ts (+ helper module). (Audit A Guide H.)

`buildOrderUrl({storefront_store_id, order_id})`: custom domain → `subdomain.garbage.team` → platform-config marketplace base. Replace lines 109-110, 133-135, 420. Never hardcode either domain.

---

## Guide I — OTP hardening `[P1-2, P2-16]`

**Files**: order.service.ts, order.route.ts, page.tsx, migration.

1. `sendCodOtp`: store **hash** + `otp_expires_at` (10 min); dispatch via real SMS/WhatsApp (extend the existing WhatsApp service); return `{success:true}` only; remove the code from logs.
2. `verifyCodOtp`: hash compare, expiry check, `otp_attempts` increment, lock after 5.
3. Rate-limit the send route (express-rate-limit already a dependency).
4. Frontend (page.tsx:2141): neutral "Code envoyé au client" — never render raw backend messages here.
5. Migration: `otp_hash`, `otp_expires_at`, `otp_attempts` on `pd_cod_verification`.

---

## Guide J — Shipping fee in vendor wallet credit `[P0-6 — REQUIRES BUSINESS DECISION FIRST]`

**File**: order.subscriber.ts `onPaymentCaptured` (200-236). (Audit C Fix 4, gated.)

**Decision gate (owner)**: (a) credit `net_items + shipping` (C's proposal — recommended if merchants pay carriers, which the courier-settlement model implies), or (b) document shipping as platform revenue and adjust seller-facing UI/pricing copy. If (a):

```sql
SELECT i.store_id, s.owner_id, u.email AS owner_email, s.subscription_plan AS plan,
       SUM(i.subtotal)::text AS item_subtotal,
       COALESCE(MAX(f.shipping_total), 0)::text AS shipping_total
FROM pd_order_item i
JOIN pd_store s ON s.id = i.store_id
JOIN pd_user u ON u.id = s.owner_id
LEFT JOIN pd_fulfillment f ON f.order_id = $1 AND f.store_id = i.store_id
WHERE i.order_id = $1
GROUP BY i.store_id, s.owner_id, u.email, s.subscription_plan
```
Commission on `item_subtotal` only; credit `roundTnd(netItems + shippingTotal)`; transparent description `Sale (X TND) + Shipping (Y TND) − commission (Z TND)`. The existing per-order sale-transaction idempotency guard protects replays; decide the reconciliation for orders already credited under the old rule (doc 06 §6 query 5 audits the delta).

---

## Guide K — Store-scoped status presentation `[P1-7, P2-8, P2-11, RC-1.3/RC-2.4]`

**File**: orders/page.tsx. (Audit C Fix 2 + A's hint + B's gating fix.)

1. Add `getStoreOrderStatus(order)` (C's sketch): priority `fulfillment_status` (cancelled/delivered/shipped/preparing) → `payment_required` → default "À expédier"; render it as the **primary** badge in table + drawer; demote the master status to a secondary chip labeled "Commande place (marché)".
2. Multi-vendor hint: extend `listByStore` SELECT with `COUNT(*) FILTER (WHERE f2.status IN ('pending','preparing') AND f2.store_id <> $1) AS other_pending_stores` (second lateral); render "En attente de {n} autre(s) boutique(s)" under the status badge and in the timeline.
3. Gating: `canFulfill`/`canCancelSellerFulfillment` consult fulfillment status only (also in Guide D step 4).
4. Interim label (before D lands): `pending` + `payment_status==='captured'` → "Confirmée" (B's suggestion); revisit with P2-14 counters.

---

## Guide L — Hygiene batch `[P2-2, P2-3, P2-4, P2-6, P2-7, P2-9, P2-10, P2-12, P2-13, P2-15, P1-6]`

One sweep, one PR each subgroup:

1. **P2-4**: delete duplicate `OrderItem` (page.tsx:140-148) → `tsc --noEmit`.
2. **P2-2**: `fulfillmentColor('delivered')` → green.
3. **P2-10**: `shipmentStatusLabel` i18n map at page.tsx:3860.
4. **P2-12**: `createStoreShipment` short-circuits only on non-`cancelled` latest shipment; cancelled → regenerate.
5. **P2-13**: deprecate `PATCH /seller/orders/:id/fulfill` (alias to canonical route; fix response to `{success:true, fulfillment_status:'shipped'}`); unify body param to `carrier`.
6. **P1-6**: tighten markPaid's `fulfilled` jump: `EXISTS (... status IN ('shipped','delivered'))` (keep zero-fulfillment digital completion).
7. **P2-15**: fix invalid status literals → `'paid'`→`'pending'`+captured check or remove; `'shipped'`→`'fulfilled'`; `'completed'`→`'delivered'` (4 files, see doc 04 B).
8. **P2-9 / list-items contract** (B's fix + A's P2-9): optionally add the store-filtered items LATERAL to `listByStore` (cap payload); update `StoreOrderRow` type; convert `seller-orders.test.ts` to assert real SQL output (P2-19); make CSV export / bulk print fetch details before generating.
9. **P2-3 / P2-6 / P2-7**: i18n the COD/RTO hardcoded French; compute COD risk server-side for list rows; seller-facing COD label mapping.

---

## Verification matrix (run after ALL guides)

| Check | Command / action | Expected |
|---|---|---|
| Backend gates | `npm run lint -w backend && npm test -w backend` | green |
| Frontend gates | `npx tsc --noEmit` (frontend/) + `npm run lint -w frontend && npm test -w frontend` | clean/green |
| Census queries | doc 06 §6 queries 1-4 | zero unexpected rows |
| Shipping-credit audit | doc 06 §6 query 5 | matches decided policy |
| E2E marketplace order | place → confirm email/WhatsApp/vendor notify arrive | yes |
| E2E label ship | label → order promoted + buyer notified | yes |
| E2E carrier deliver (COD) | webhook delivered → captured + wallet credited (items+shipping per policy) | yes |
| E2E buyer cancel post-ship | expect 409 | blocked |
| E2E double partial refund | restock exactly once per refunded unit | correct |
| Dashboard COD tab | open drawer → items visible; load-error state distinct | yes |
| Dashboard timeline | fresh order → Préparation current (not done) | yes |
| Multi-vendor | store A shipped → hint "En attente de 1 autre boutique"; B keeps buttons | yes |
