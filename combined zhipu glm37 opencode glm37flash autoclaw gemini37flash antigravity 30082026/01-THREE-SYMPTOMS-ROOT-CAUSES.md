# 01 — The Three Reported Symptoms: Merged Root-Cause Analysis

Each symptom below merges the perspectives of all three audits: what the user sees, the code paths (file:line at `7141e9f`), production evidence, and the agreed fix direction. Line numbers were re-verified during the merge.

---

## Symptom 1 — Expedition "Expédiée" but order status "En attente" (pending)

### What is displayed

The seller orders table (`frontend/src/app/hub/dashboard/orders/page.tsx`) renders two side-by-side columns from two different tables:

- **"Statut" column** (lines 2752-2757): `statusLabel(order.status)` — `pending` → "En attente" (yellow), `payment_required` → "Paiement requis" (orange), `fulfilled` → "Expédiée" (purple), `delivered` → "Livrée" (green).
- **"Expédition" column** (lines 2759-2779): `fulfillmentLabel(order.fulfillment_status)` — `pending` → "À expédier", `shipped` → "Expédiée", `delivered` → "Livrée", `cancelled` → "Annulée", `null` → "Non expédiable".

`order.status` = `pd_order.status` (master aggregate); `order.fulfillment_status` = this store's `pd_fulfillment.status`. Joined per-store in `listByStore()` (order.service.ts:1362-1610).

### Root causes (three, merged from all audits)

**RC-1.1 — Carrier label generation never updates the order status** *(found by A and B independently; the primary bug)*

`POST /api/pd/orders/store/:id/shipments` → `createStoreShipment()` (order.service.ts:1082-1241) → `shippingService.createShipment()`:

```ts
// backend/src/services/shipping.service.ts:664-669
await query(
  `UPDATE pd_fulfillment
   SET tracking_number = $2, carrier = $3, status = 'shipped', shipped_at = COALESCE(shipped_at, NOW()), updated_at = NOW()
   WHERE id = $1 AND store_id = $4`,
  [req.fulfillment_id, carrierResult.tracking_number, carrier.name, req.store_id],
);
```

It force-sets the **fulfillment** to `shipped` (bypassing even the `status='pending'` guard the manual path uses) and **never recomputes `pd_order.status`**. Compare the manual path `fulfill()` (order.service.ts:1633-1644) which counts pending fulfillments and promotes the order to `fulfilled` when none remain.

**RC-1.2 — Carrier tracking sync has the same hole, plus no COD capture** *(A + B "worst variant")*

`persistTrackingResult()` (shipping.service.ts:882-895), invoked by carrier webhooks AND the running reconciliation worker (confirmed started in `main.ts:587` / `worker.ts:66`), maps carrier statuses onto fulfillments (`shipped`/`delivered`/`cancelled`) but never:
- recomputes `pd_order.status`;
- captures COD payment on `delivered` (the manual path does — order.service.ts:1743-1763);
- restocks on `returned`/`cancelled`;
- emits events.

**Worst variant (B's insight)**: once carrier sync sets the fulfillment to `delivered`, the manual repair button disappears (`canMarkDelivered` requires `fulfillment_status === 'shipped'`, page.tsx:1106-1108) → **no UI action can ever repair the order status**. An actually-delivered order reads "En attente" forever.

**RC-1.3 — Multi-vendor orders only advance the order when ALL vendors ship** *(by design, terrible UX — all three audits)*

All 10 recent marketplace orders in production are 2-vendor orders (Atelier Médina + mejrda):

| Order | Atelier Médina | mejrda | Order status |
|---|---|---|---|
| `...DGq97HRZ` | shipped | pending | **pending** (payment captured) |
| `...6thmSpQZ` | shipped | pending | **pending** |
| `...4Jv9AyVM` | pending | shipped | **payment_required** |

Each seller sees their own "Expédiée" next to the shared "En attente" with **zero explanation** in the UI. Audit C additionally framed the UI side: the dashboard presents the marketplace-wide master status as *primary*, where a seller-facing product should present the store-scoped status. Both fixes (backend propagation + store-scoped presentation) are complementary — see Guides A and K.

### Production evidence (Audit A, live SQL, 2026-08-30)

| Order | Gateway | Fulfillments | Fulf. status | Carrier/Tracking | Order status |
|---|---|---|---|---|---|
| `...vCzt4t3H` | cod | **1** | shipped (2026-08-15) | aramex / ARAMEX-TN-76064226 | **`payment_required`** — stuck 15 days, COD un-capturable |
| `...kB2SykvE` | cod | **1** | shipped (2026-08-15) | aramex / ARAMEX-TN-71380627 | **`payment_required`** — same |
| `...pZRBn8mm` | cod | 1 | shipped (2026-05-06, **manual modal**) | "hhhh"/54245fh | `fulfilled` ✅ (control case) |
| `...6thmSpQZ`, `...DGq97HRZ` | paypal | 2 | 1 shipped / 1 pending | La Poste, **tracking NULL** | `pending` (RC-1.3 + P1-4) |

The two Aug-15 rows are **impossible in a correct state machine** (single fulfillment, zero pending → should be `fulfilled`) — direct proof of RC-1.1.

### Consequences beyond cosmetics (merged impact radius)

- `canFulfill()` false after label creation → seller loses the "Marquer expédiée" control entirely (feeds Symptom 2).
- Buyer side shows the same raw status (`hub/orders/page.tsx:262-263`) while the checkout success page says "en cours de préparation" (`hub/checkout/success/page.tsx:198`) — three contradictory stories (B).
- Every strict-status consumer inherits the distortion: `open_orders` summary (order.service.ts:1540), store open-order counts (`store.service.ts:1151,1383`), broadcast eligibility (`seller-broadcast.service.ts:461`), subscription checks (`store-subscription.service.ts:62`) (B).
- COD revenue never captured for carrier-delivered orders → vendor wallets never credited (P0-1 financial dimension).

### Fix direction

Guide A (centralized `syncOrderStatusFromFulfillments` called from `createShipment` + `persistTrackingResult` + `fulfill` + `cancelStoreFulfillment` + RTO), Guide C (COD capture on carrier delivery), Guide K (store-scoped status presentation + multi-vendor hint).

---

## Symptom 2 — The seller can't change the "Préparation" status

### What is displayed

Drawer timeline: Commande créée → Paiement confirmé → **Préparation** → Expédition → Livraison (`buildOrderTimeline`, page.tsx:1125-1171). No control anywhere sets/advances/reverts preparation. The step shows **"Colis préparé" (done) for every order including brand-new ones**.

### Root causes (four, merged)

**RC-2.1 — No persisted preparation state exists at all** *(all three audits)*
- No API endpoint accepts a preparation target: the complete seller transition surface is `POST /:id/fulfill`, `/deliver`, `/fulfillment/cancel`, `/store/:id/rto`, `/store/:id/shipments`, plus refunds/COD tools (order.route.ts; seller.route.ts adds a duplicate `PATCH /seller/orders/:id/fulfill`).
- No DB writer: `pd_fulfillment.status` domain is `pending|shipped|delivered|cancelled` (001_initial_schema.sql:235-251, VARCHAR(20), no CHECK constraint — verified); `pd_order.status='processing'` is **never written anywhere** (repo-wide grep; the only `'processing'` matches are AI jobs/outbox/read-filters). Dead enum value with a UI label ("Confirmée", page.tsx:309) that can never appear.

**RC-2.2 — The timeline step is derived, and derived WRONG** *(all three audits)*

```ts
// page.tsx:1129
const isProcessing = ['processing','fulfilled','delivered'].includes(order.status)
  || ['pending','shipped','delivered'].includes(order.fulfillment_status || '');
```

Every order gets a `pd_fulfillment` row with `status='pending'` at checkout → the second clause is **always true** → "Colis préparé" from second zero. The step is decoration reflecting nothing.

**RC-2.3 — After label generation the seller loses ALL manual control** *(A + B)*

`canFulfill()` requires `fulfillment_status === 'pending'` (page.tsx:1102-1104). Label generation force-sets `shipped` → the ship button disables permanently; remaining actions are only deliver/cancel/RTO. Combined with Symptom 1, the seller perceives "I can't do anything with this order".

**RC-2.4 — Cross-store gating dead-end** *(B unique)*

`canFulfill`/`canCancelSellerFulfillment` additionally require the **order-level** status not to be `fulfilled/delivered/cancelled` (page.tsx:1102-1111). Via `markPaidInTransaction`'s `NOT EXISTS(pending) → 'fulfilled'` jump (order.service.ts:2229-2232) or `cancelStoreFulfillment` aggregates (1833-1837), the order can become `fulfilled` while **another store's** fulfillment is still `pending` → that store loses its ship/cancel buttons through no action of its own. Rare, but a hard dead-end.

### Fix direction (conflict resolved — see doc 06 §3)

**Recommended**: fulfillment-level `'preparing'` status as source of truth (autoclaw Option A / opencode Option 2): `POST /store/:id/prepare` transitions `pending → preparing`; `canFulfill` accepts both `pending` and `preparing`; order-level `processing` becomes a *derived* state in the central recompute helper (any `preparing` → order `processing`), NOT an independent writer (resolves the A-vs-C design conflict; avoids master-order flapping in multi-vendor scenarios). Minimal alternative: fulfillment `metadata.prepared_at` flag. Full details Guide D.

---

## Symptom 3 — "Articles de la boutique" shows "Détail des articles indisponible"

### What is displayed

The drawer items card (page.tsx:3514-3546) renders `selectedOrder.items` or falls back to `itemsDetailUnavailable` (fr.json:609). Same fallback exists in the printable invoice/delivery-slip builder (page.tsx:487-520).

### Root causes (merged)

**RC-3.1 — The LIST endpoint returns no items, and two tabs open the drawer with the list row** *(primary; all three audits)*

- `GET /api/pd/orders/store` → `listByStore()` (order.service.ts:1362-1610): SELECT aggregates totals/fulfillment/customer fields — **no `items`, no `seller_note`, no `shipments`, no `refunds`, no `cod_verification`**.
- `GET /api/pd/orders/store/:id` → `getStoreOrderDetail()` (order.service.ts:919-1055): full row via LATERAL joins.
- Main orders table opens the drawer correctly via `openOrderDetail()` (page.tsx:2786 → 1596-1617: set row, fetch detail, replace).
- **COD Radar tab (page.tsx:2972) and RTO tab (page.tsx:3205) call `setSelectedOrder(order)` directly** on the list row → items stay `undefined` → `(undefined || []).length === 0` → "Détail des articles indisponible" **every time**, plus empty note/refunds/shipments/COD cards.

**RC-3.2 — Fetch-failure fallback keeps the stale item-less row** *(A + B + C)*

`openOrderDetail` on `!res.ok` shows an error banner but keeps the list row as `selectedOrder` → the section reads "no data" instead of "load failed". Also a brief "indisponible" flash while the detail loads (row set synchronously before the async fetch) (C's stale-flash observation).

**RC-3.3 — The backend is NOT at fault** *(A verified with production SQL)*

The exact items LATERAL subquery of `getStoreOrderDetail` was replayed against production for 3 order/store pairs — returns correct items every time (2, 4, 4 items). All referenced `pd_product` columns exist (`thumbnail`, `slug`, `weight_grams`, `digital_file_key`); item FKs resolve.

**RC-3.4 — The test suite masks the contract gap** *(B unique)*

`backend/src/__tests__/seller-orders.test.ts:47` mocks `listByStore` returning rows **with** `items` — the mock encodes a contract the implementation never had, so no test can catch this class of bug.

**RC-3.5 — Duplicate `OrderItem` interface hides type breakage** *(A + C)*

`page.tsx:29-47` defines the correct `OrderItem`; `page.tsx:140-148` defines a leftover duplicate shaped like a note (`body`, `created_by`, `updated_by`). TypeScript declaration merging makes `tsc --noEmit` pass (verified) — the duplicate is dead weight actively misleading maintainers.

### Fix direction

Guide D step 1 (two-line point fix: `void openOrderDetail(order)` at 2972 + 3205), step 2 (loading skeleton + distinct load-error state), plus Guide L (optionally add the store-filtered items LATERAL to `listByStore` — B's contract fix, which also fixes CSV export/print from list rows, A's P2-9; watch payload size).

---

## Cross-symptom summary

| Symptom | Layer | Root causes | Fix guides |
|---|---|---|---|
| 1. Shipped but "En attente" | Backend state machine + UI presentation | RC-1.1 label path, RC-1.2 carrier sync (+ no COD capture, no repair path), RC-1.3 multi-vendor semantics unexplained; UI shows master status as primary | A, C, K |
| 2. No Préparation control | Product gap + frontend | RC-2.1 no persisted state, RC-2.2 wrong derivation, RC-2.3 controls lost after label, RC-2.4 cross-store gating dead-end | D (+ K for gating) |
| 3. Articles indisponible | Frontend data flow | RC-3.1 COD/RTO tabs bypass detail fetch, RC-3.2 stale fallback, RC-3.4 test mask, RC-3.5 duplicate interface | D, L |
