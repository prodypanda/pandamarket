# 09 — Implementation Guides (How-To Fix)

Concrete, step-by-step guides with code sketches. Line references are from HEAD `7141e9f`.
All sketches are directionally complete but must be adapted to final conventions (error types, naming, i18n keys) and pass lint/typecheck/tests. Coordinate with parallel agents before editing shared files.

---

## Guide A — Centralize the order status state machine [fixes P0-3, P1-4]

**Files**: `backend/src/services/order.service.ts`, `backend/src/services/shipping.service.ts`.

### Step 1 — The helper

Add to `OrderService`:

```ts
/**
 * Recompute pd_order.status from its fulfillments. MUST run inside the
 * caller's transaction (pass the PoolClient). Canonical rules:
 *  - cancelled/refunded orders are never touched
 *  - all fulfillments cancelled  -> order cancelled (reason passed in)
 *  - >=1 delivered, rest terminal-> delivered (+ COD capture if pending)
 *  - >=1 shipped, none pending   -> fulfilled
 *  - any pending                 -> payment_required|pending stays as-is
 */
async syncOrderStatusFromFulfillments(
  c: PoolClient,
  orderId: string,
  opts: { cancelReason?: string } = {},
): Promise<void> {
  await c.query(
    `UPDATE pd_order o
     SET status = sub.next_status,
         updated_at = NOW()
     FROM (
       SELECT order_id,
              COUNT(*) FILTER (WHERE status = 'pending')   AS pend,
              COUNT(*) FILTER (WHERE status = 'shipped')   AS ship,
              COUNT(*) FILTER (WHERE status = 'delivered') AS del,
              COUNT(*) FILTER (WHERE status = 'cancelled') AS canc
       FROM pd_fulfillment WHERE order_id = $1 GROUP BY order_id
     ) sub
     WHERE o.id = sub.order_id
       AND o.status NOT IN ('cancelled','refunded')
       AND o.status IS DISTINCT FROM (
         CASE
           WHEN sub.pend = 0 AND sub.ship = 0 AND sub.del = 0 THEN 'cancelled'
           WHEN sub.pend = 0 AND sub.del > 0                 THEN 'delivered'
           WHEN sub.pend = 0 AND sub.ship > 0                 THEN 'fulfilled'
           ELSE o.status
         END
       )`,
    [orderId],
  );
  // If transitioning to 'cancelled', also set cancelled_at/reason (extend as needed).
}
```

Note: digital-only orders have zero fulfillments -> the sub-select returns no row -> order untouched (markPaid already handles them: `NOT EXISTS(pending) -> fulfilled`).

### Step 2 — Wire it into every mutation site

| Site | Change |
|---|---|
| `fulfill()` (order.service.ts:1615-1646) | wrap in `transaction()`; UPDATE ... RETURNING fulfillment; then call the helper; delete the inline count/update block (1633-1644). |
| `shipping.service.createShipment()` (664-669) | after the fulfillment UPDATE, call `orderService.syncOrderStatusFromFulfillments(...)` — either accept a client param (preferred: make the shipment insert + fulfillment update + sync one transaction) or a follow-up transaction. Minimum viable: follow-up call. |
| `persistTrackingResult()` (882-895) | it already runs inside `transaction(async (client) => ...)` — call the helper with `client` at the end. On `delivered` also run Guide C capture; on `returned/cancelled` also restock (see Guide G restock block). |
| `cancelStoreFulfillment()` (1767-1841) | replace the ad-hoc counts block (1803-1838) with the helper (pass cancelReason). |
| `markStoreFulfillmentRto()` (2462-2512) | call the helper at the end (Guide G adds guards). |
| `markStoreFulfillmentDelivered()` (1648-1765) | replace the counts block (1735-1750) with the helper, then keep the COD-capture UPDATE (it is order/payment-specific, not derivable from fulfillments alone). |

### Step 3 — Fix `fulfill()` NULL overwrite + atomicity

```ts
const { rowCount } = await c.query(
  `UPDATE pd_fulfillment
      SET status = 'shipped',
          carrier = COALESCE($3, carrier),
          tracking_number = COALESCE($4, tracking_number),
          shipped_at = NOW()
    WHERE order_id = $1 AND store_id = $2 AND status = 'pending'`,
  [opts.order_id, opts.store_id, opts.carrier ?? null, opts.tracking_number ?? null],
);
```

### Step 4 — Tests to add (backend vitest, follow existing `__tests__` style)

- fulfill single-store -> order `fulfilled`.
- createShipment (simulate adapter) single-store -> order `fulfilled`.
- tracking delivered on COD -> order `delivered` + payment captured (after Guide C).
- multi-vendor: one store ships -> order stays; second ships -> `fulfilled`.

### Step 5 — Production backfill (after deploy)

```sql
-- Promote fully-shipped stuck orders (verify each with the owner first)
UPDATE pd_order o
SET status = 'fulfilled', updated_at = NOW()
WHERE o.status IN ('pending','payment_required')
  AND NOT EXISTS (SELECT 1 FROM pd_fulfillment f WHERE f.order_id = o.id AND f.status <> 'shipped')
  AND EXISTS     (SELECT 1 FROM pd_fulfillment f WHERE f.order_id = o.id AND f.status = 'shipped');
```

For the two stuck COD orders decide: if truly delivered, additionally set `payment_status='captured'` and trigger wallet credit via the subscriber path (or a small script calling `onPaymentCaptured` logic); if lost, cancel + restock via existing services.

---

## Guide B — Emit the dead lifecycle events [fixes P0-1, P0-2]

**Files**: `backend/src/api/order.route.ts`, `backend/src/services/order.service.ts`.

### Step 1 — ORDER_PLACED

In both checkout routes (order.route.ts:141-167 and 182-217), after `orderService.checkout` succeeds:

```ts
if (!result.replayed) {
  try {
    await eventBus.emit(PdEvent.ORDER_PLACED, { order_id: result.order.id });
  } catch (err) {
    logger.error({ err, order_id: result.order.id }, 'ORDER_PLACED emission failed');
    // do NOT fail the checkout — the order is committed
  }
}
```

(Skip when `replayed` — idempotency replays must not re-notify. The subscriber side has its own idempotency gaps for notifications — acceptable v1; the outbox pattern is the durable fix, Phase 5.2.)

### Step 2 — ORDER_FULFILLED

In `fulfill()` after the helper runs, and in Guide A's helper on pending->shipped (detect via the RETURNING clause of the fulfillment UPDATE):

```ts
eventBus.emit(PdEvent.ORDER_FULFILLED, {
  order_id: opts.order_id,
  carrier: carrier ?? null,
  tracking_number: tracking ?? null,
}).catch((err) => logger.error({ err }, 'ORDER_FULFILLED emission failed'));
```

Payload shape matches `onOrderFulfilled` (order.subscriber.ts:366-370). For multi-vendor orders this fires per store-shipment — the subscriber message says "Votre commande #X est en route", which is acceptable; refine later with per-store context if needed.

**Verification**: place + ship a test order; confirm emailQueue jobs (`order_confirmed`, `new_order_vendor`, `order_shipped`), WhatsApp dispatch logs, notifications, and `pd_webhook_delivery` rows for subscribed stores.

---

## Guide C — COD capture on carrier-delivered orders [completes P0-3]

**File**: `backend/src/services/order.service.ts`, `backend/src/services/shipping.service.ts`.

1. Extract from `markStoreFulfillmentDelivered` (1648-1765) a reusable method:

```ts
private async captureCodIfDelivered(c: PoolClient, orderId: string): Promise<void> {
  const { rows } = await c.query<{ gateway: PaymentGateway; status: OrderStatus; payment_status: PaymentStatus }>(
    `SELECT payment_gateway::text AS gateway, status, payment_status FROM pd_order WHERE id = $1 FOR UPDATE`,
    [orderId],
  );
  const o = rows[0];
  if (!o || o.gateway !== PaymentGateway.Cod || o.payment_status === PaymentStatus.Captured) return;
  // only capture when EVERY fulfillment is delivered (consistent with manual path)
  const { rows: f } = await c.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'delivered') AS del, COUNT(*) AS total
       FROM pd_fulfillment WHERE order_id = $1`, [orderId]);
  if (Number(f[0].del) !== Number(f[0].total) || Number(f[0].total) === 0) return;
  await c.query(
    `UPDATE pd_order SET payment_status = 'captured', updated_at = NOW() WHERE id = $1`, [orderId]);
}
```

2. In `persistTrackingResult`, when the mapped status is `delivered`: call `captureCodIfDelivered(client, orderId)` inside the existing transaction, and after commit emit `PAYMENT_CAPTURED` (mirror 1752-1763: ads recognition + event) — the wallet credit then flows through the existing subscriber.

3. When mapped status is `returned`/`cancelled`: restock via `restoreOrderItemStock` per item (needs the order's items — query like `cancelStoreFulfillment` 1787-1798) and update the courier settlement to `disputed`.

---

## Guide D — Seller dashboard fixes [fixes symptoms 2 & 3]

**File**: `frontend/src/app/hub/dashboard/orders/page.tsx`.

### Step 1 — COD Radar & RTO tabs fetch the detail (symptom 3, two-line fix)

```diff
- onClick={() => { setSelectedOrder(order); }}
+ onClick={() => { void openOrderDetail(order); }}
```
at line 2972 (COD Radar) and line 3205 (RTO).

### Step 2 — Loading/error states for drawer sections

- Items / note / refunds / shipments cards: render skeleton when `loadingOrderDetail` is true instead of "Détail des articles indisponible".
- In `openOrderDetail`'s error branch (1604-1607): keep the drawer open with an error banner + a Retry button calling `openOrderDetail(order)` again, instead of silently keeping the stale row.

### Step 3 — Timeline Préparation (symptom 2 display part)

```ts
// page.tsx buildOrderTimeline — replace isProcessing semantics:
const awaitingShipment = order.fulfillment_status === 'pending';
// Preparation step:
{
  label: t('dashboardPages.orders.timelinePreparation'),
  description: isShipped || isDelivered
    ? t('dashboardPages.orders.timelinePreparationReady')
    : t('dashboardPages.orders.timelinePreparationWaiting'),
  state: isShipped || isDelivered ? 'done' : 'current',
},
```
(Preparation becomes the active step while the seller must act; done once shipped.)

### Step 4 — Persisted preparation state (choose ONE)

**Option 1 (minimal, recommended first)**: `POST /api/pd/orders/store/:id/prepare` sets `pd_fulfillment.metadata = metadata || '{}' || '{"prepared_at": "..."}'` (and optionally `prepared_by`). Frontend: "Marquer comme préparée" button enabled while `fulfillment_status === 'pending' && !metadata.prepared_at`; timeline Preparation turns done when `metadata.prepared_at` exists; label shows preparer + timestamp. No enum change, no migration (metadata is jsonb already — verify column exists on pd_fulfillment; if not, one migration).

**Option 2 (full)**: migration adds `'preparing'` to `pd_fulfillment.status` allowed values; seller action `pending -> preparing`; `canFulfill` accepts both; label "En préparation"; fulfillment filter gains the value. More moving parts (zod enums at order.route.ts:129, listByStore filter, labels, colors, bulk fulfill).

### Step 5 — The small P2s in the same file

- `fulfillmentColor`: `case 'delivered': return 'bg-green-50 text-green-700 border-green-200';`
- Delete `interface OrderItem` at 140-148; run `npx tsc --noEmit`.
- Multi-vendor hint: add to `listByStore` SELECT `COUNT(*) FILTER (WHERE f2.status='pending' AND f2.store_id <> $1) AS other_pending_stores` (second lateral) and render "En attente de {n} autre(s) boutique(s)" under the status badge.

---

## Guide E — Guard whole-order cancel [fixes P0-4]

**File**: `backend/src/services/order.service.ts` `cancel()` (2041-2086).

Copy the guard from `cancelUnstartedPaymentOrder` (2122-2130):

```ts
await transaction(async (c) => {
  const { rows: started } = await c.query(
    `SELECT COUNT(*)::int AS n FROM pd_fulfillment
      WHERE order_id = $1 AND status IN ('shipped','delivered') FOR UPDATE`, // lock fulfillments
    [orderId],
  );
  if (Number(started[0]?.n ?? 0) > 0) {
    throw new PdValidationError('Cannot cancel an order with shipped or delivered items', {
      code: PdErrorCode.ORDER_CANNOT_CANCEL,
    });
  }
  // ... existing cancel body (order UPDATE + restock + serial freeing),
  // plus: UPDATE pd_fulfillment SET status='cancelled' WHERE order_id=$1 AND status='pending';
});
```

Also consider allowing sellers to cancel only their own fulfillment (route already redirects vendor requests — keep).

---

## Guide F — Refund correctness [fixes P0-5]

**File**: `backend/src/services/order.service.ts` `processStoreRefund` (1934-2039).

### Step 1 — Correct restock

Replace lines 2011-2018 with either:

- **Simple once-flag** (correct for full-order refunds): store `restocked: true, restocked_at` in refund metadata and skip if already done; restock via `restoreOrderItemStock` per item (handles variants + bundles); free serial keys (`UPDATE pd_license_key SET order_id=NULL, assigned_at=NULL, is_used=false WHERE order_id=$1 AND product_id=$2 AND is_used=false`) for serial items when the refund covers them.
- **Precise** (per-amount): requires per-item refund lines — larger change; defer unless partial refunds are common.

Prefer the once-flag now; per-item refunding is a Phase 5 product decision.

### Step 2 — Commission-aware debit

Decide policy with the owner:
- (a) debit net: `amount * (1 - commission_rate)` (vendor wallet returns exactly to pre-sale state; platform absorbs the commission loss), or
- (b) debit gross + a platform `commission_recovery` wallet transaction (platform recovers its commission).

Implement via `walletService.debitRefund` param change (e.g., pass `commission_rate` resolved from the store's plan at refund time — plan may have changed since capture; store the credited commission in the original wallet transaction metadata to be exact).

---

## Guide G — RTO hardening [fixes P1-1]

**File**: `backend/src/services/order.service.ts` `markStoreFulfillmentRto` (2462-2512).

```sql
UPDATE pd_fulfillment ... WHERE order_id=$1 AND store_id=$2 AND status = 'shipped'
```
(rowCount check -> 409 if not shippable-returnable). Then inside the same transaction:
- restock via `restoreOrderItemStock` per item (already queries items — reuse);
- free serial keys (same statement as Guide F);
- `UPDATE pd_courier_settlement SET status='disputed', updated_at=NOW() WHERE order_id=$1 AND store_id=$2`;
- COD verification: `rejected` only for `client_refused | unreachable | wrong_address | fake_order | customer_cancelled`; use `unreachable`/neutral for carrier-fault reasons;
- `syncOrderStatusFromFulfillments(c, orderId)`.

---

## Guide H — Tenant-aware URLs in notifications [fixes P1-3]

**File**: `backend/src/subscribers/order.subscriber.ts` (+ helper module).

```ts
function buildOrderUrl(order: { storefront_store_id?: string | null; order_id: string }): string {
  // resolve: store custom domain -> subdomain.garbage.team -> marketplace base from platform settings
}
```
Replace lines 109-110, 133-135, 420. Read the domain from the same source the storefront middleware uses (store settings / platform config) — do not hardcode either domain.

---

## Guide I — OTP hardening [fixes P1-2]

1. `sendCodOtp`: generate code, store **hash** (`otp_hash`), set `otp_expires_at = NOW() + interval '10 minutes'`, dispatch via SMS/WhatsApp provider (extend `whatsappOrderNotificationService` with a generic sender or add an SMS service), return `{ success: true }` — never the code; remove the code from `logger.info`.
2. `verifyCodOtp`: compare hash, check expiry, increment `otp_attempts`, lock after 5 failures.
3. Route: rate limiter on `POST /store/:id/cod-otp/send` (express-rate-limit is already a dependency).
4. Frontend (page.tsx:2141): stop rendering raw backend messages for this flow; fixed string "Code envoyé au client par SMS".
5. Migration for `otp_hash`, `otp_expires_at`, `otp_attempts` on `pd_cod_verification` (drop or keep legacy `otp_code` column during transition).

---

## Verification matrix (run after ALL guides)

| Check | Command / action | Expected |
|---|---|---|
| Backend types/lint/tests | `npm run lint -w backend && npm test -w backend` | green |
| Frontend types | `npx tsc --noEmit` (in frontend/) | clean |
| Frontend lint/tests | `npm run lint -w frontend && npm test -w frontend` | green |
| Desync census | doc 06 §G query 1 | 0 rows |
| Terminal-state census | doc 06 §G query 2 | only business-accepted rows |
| COD leak census | doc 06 §G query 3 | 0 rows |
| Double-restock census | doc 06 §G query 4 | 0 rows |
| E2E marketplace order | place -> confirm email/WhatsApp/vendor notify | all arrive |
| E2E label ship | label -> order promoted + customer notified | yes |
| E2E carrier deliver (COD) | webhook delivered -> captured + wallet credited | yes |
| E2E buyer cancel post-ship | expect 409 | blocked |
| E2E double partial refund | restock exactly once per unit | correct |
| Dashboard COD tab | open drawer -> items visible | yes |
| Dashboard timeline | fresh order -> Préparation current | yes |

**Deployment**: commit -> push to `github/main` -> Render auto-deploys backend (verify via API: `GET /v1/services/srv-d9qjrth42hec73efhoa0/deploys`), Vercel auto-deploys frontend. Post-deploy: re-run the census queries + one live smoke order.
