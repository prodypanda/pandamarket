# PandaMarket — Marketplace Order Process Deep Audit

**Date:** 2026-08-30 · **Scope:** full order pipeline (checkout → payment → fulfillment/expédition → delivery → refunds → wallet) with root-cause analysis of three reported seller-dashboard defects.
**Mode:** read-only audit. No project file was modified. Codebase: `C:\tek\pandamarket` (commit `7141e9f`, branch `main`).

---

## 1. Executive summary

All three reported symptoms are **real, reproducible defects**, and they share one systemic root cause: **`pd_order.status` is a payment/aggregate flag that is almost never advanced after checkout, while fulfillment reality lives in `pd_fulfillment.status` and `pd_shipment.status`.** The UI shows both columns side by side, so the order column reads "En attente" while the expedition column correctly reads "Expédiée".

| # | Symptom | Verdict | Primary root cause |
|---|---------|---------|--------------------|
| 1 | Expedition shows "Expédiée" but order status shows "En attente" (pending) | **Confirmed bug** | Label/shipment creation flips fulfillment to `shipped` but never touches `pd_order.status`; `processing` is never written anywhere; multi-store aggregation keeps the order `pending` |
| 2 | Seller cannot change the "Préparation" status | **Confirmed missing capability** | No API endpoint and no DB writer for a preparation/`processing` state exists at all; the timeline "Préparation" step is auto-derived (and wrong) |
| 3 | "Articles de la boutique" shows "Détail des articles indisponible" | **Confirmed bug (deterministic in 2 entry points)** | COD table and RTO table open the drawer from **list rows** that never contain `items`; any detail-fetch failure has the same fallback |

Additional material findings (detailed in §7): the `ORDER_FULFILLED` event has a subscriber but **no emitter** (buyers never get shipped notifications), carrier-synced delivery leaves the order stuck at `pending` forever, the timeline marks "Colis préparé" for every order that merely has a fulfillment row, and partial refunds restock the full store item set (inventory inflation risk).

Production notes: backend health endpoint responded `200 {"status":"ok"}` at audit time. The Supabase/Redis passwords in `REMOTE_CREDENTIALS.md` are **redacted in-file** (`***`, `…`), so no production data queries were possible; conclusions below are code-level and reproducible from the repository. Meilisearch is unconfigured (user-confirmed) — it does not affect the order pipeline.

---

## 2. Data model & the four state machines

The order process is split across four independent status fields. They are **not** synchronized by a single state machine — each is advanced by different code paths, which is the root of symptom #1.

```
pd_order.status            (order-level aggregate)   -- schema 001_initial_schema.sql:186-190
  payment_required → pending → (processing?) → fulfilled → delivered
                                          ↘ cancelled / refunded

pd_order.payment_status    (money)                   -- 001:194-196
  pending → captured → refunded   (failed on attempt)

pd_fulfillment.status      (per store, per order)    -- 001:235-243
  pending → shipped → delivered      ↘ cancelled

pd_shipment.status         (per label/carrier)       -- 003_shipping_and_digital.sql
  created → picked_up → in_transit → out_for_delivery → delivered / returned / cancelled
```

Key tables: `pd_order`, `pd_order_item` (carries `store_id` for multi-vendor splitting), `pd_fulfillment` (one per store per order, created at checkout), `pd_shipment` (carrier label), plus `pd_store_order_refund`, `pd_store_delivery_proof`, `pd_courier_settlement`, `pd_payment_attempt`, `pd_payment_event`.

**Fact:** the `processing` value exists in the shared enum (`packages/types/src/enums.ts` — `OrderStatus.Processing`) and in the schema comment, but a repository-wide search finds **no `UPDATE ... SET status = 'processing'` on `pd_order` anywhere**. It is dead state.

### Who writes `pd_order.status` (complete map, verified by search)

| Writer | Transition | Location |
|---|---|---|
| `orderService.checkout` | insert as `payment_required` (COD/mandat) or `pending` (online) | `backend/src/services/order.service.ts:669-671` |
| `markPaidInTransaction` | `payment_required → pending`; → `fulfilled` only if **no** pending fulfillment exists; otherwise unchanged | `order.service.ts:2216-2236` |
| `fulfill()` (manual "Marquer expédiée") | → `fulfilled` only when **all** fulfillments shipped | `order.service.ts:1615-1646` (order update at 1641) |
| `markStoreFulfillmentDelivered` | → `delivered` only when no active fulfillments remain; captures COD payment | `order.service.ts:1648-1765` |
| `cancelStoreFulfillment` | → `cancelled` / `delivered` / `fulfilled` depending on remaining counts | `order.service.ts:1767-1841` |
| `processStoreRefund` | → `refunded` when cumulative processed refunds ≥ order total | `order.service.ts:1996-2007` |
| `cancel()` | → `cancelled` (whole order) | `order.service.ts:2041+` |
| **Shipment label creation** | **NOTHING — order untouched** | `order.service.ts:1082-1245`, `shipping.service.ts:645-670` |
| **Carrier tracking sync / webhooks** | **NOTHING — order untouched** | `shipping.service.ts:858-897` (`persistTrackingResult`) |

---

## 3. End-to-end lifecycle walkthrough (as implemented)

1. **Cart & quote.** Cart service → `checkout-quote.service.ts` computes per-store totals, shipping (`FLAT_SHIPPING_PER_STORE = 7` TND fallback), discounts, tax; produces a versioned `quote_id`.
2. **Checkout.** `POST /api/pd/orders/checkout` (marketplace, `requireAuth`) or `/storefront/checkout` (storefront customer, Idempotency-Key mandatory) → `order.route.ts:117-160, 173-207`.
   - Gateway availability is asserted (`paymentCapabilityService.assertGatewayAvailable`) with a capability version stored on the order.
   - Order inserted with initial status: **COD / manual mandat → `payment_required`; online → `pending`** (`order.service.ts:669-671`).
   - One `pd_order_item` per line (carries `store_id`), guarded atomic stock decrement per product/variant/bundle, serial-key reservation with `FOR UPDATE SKIP LOCKED`.
   - **One `pd_fulfillment` per store** inserted (`order.service.ts:861-866`) — this is the seller's work unit.
   - Idempotent replay via `idempotency_key` unique partial index.
3. **Payment.**
   - Online (Flouci/Konnect/PayPal): webhook or return-trip sync captures `pd_payment_attempt` then calls `markPaidInTransaction` in the same transaction (`payment.service.ts:945-1010`, emits `PAYMENT_CAPTURED`). Result: `payment_status='captured'`, `status` stays `pending` (from `payment_required → pending` only).
   - Manual mandat: admin/seller approves a receipt (`payment.route.ts:570-620`) → `markPaidInTransaction` → `PAYMENT_CAPTURED`.
   - COD: no capture at checkout; captured only when every fulfillment is delivered (`order.service.ts:1737-1756`).
4. **Wallet credit.** `PAYMENT_CAPTURED` → `order.subscriber.ts:onPaymentCaptured`: per-store `creditPending` with plan commission and per-gateway retention days; duplicate-credit guard via existing `sale` wallet transaction; serial keys assigned; vendor + customer notified; WhatsApp/email queues.
5. **Fulfillment — two divergent "ship" paths (the heart of bug #1):**
   - **Path A — manual:** `POST /api/pd/orders/:id/fulfill` (`order.route.ts:334-348`) → `orderService.fulfill()`: fulfillment `pending → shipped`, and **if this was the last pending fulfillment, order → `fulfilled`** (`order.service.ts:1623, 1641`).
   - **Path B — label/expédition:** `POST /api/pd/orders/store/:id/shipments` (`order.route.ts:282-296`) → `createStoreShipment` → `shippingService.createShipment`: inserts `pd_shipment`, and updates the fulfillment **`SET ... status = 'shipped'`** (`shipping.service.ts:666`) — **but never updates `pd_order.status`**. If the seller never used Path A, the order stays `pending`/`payment_required` even though the fulfillment is now `shipped`.
6. **Tracking.** BullMQ `shipment-reconciliation.worker` + carrier webhooks → `persistTrackingResult`: updates `pd_shipment` and `pd_fulfillment` (pending→shipped; delivered; cancelled/returned) — **again never `pd_order`** (`shipping.service.ts:858-897`).
7. **Delivery.** Manual: `POST /api/pd/orders/:id/deliver` with optional proof → `markStoreFulfillmentDelivered` (order → `delivered` when all stores done; COD captured here). Carrier-synced delivery does **not** reach the order.
8. **Cancellations & refunds.** Store-scope cancel (`cancelStoreFulfillment`) restores stock and recomputes order status; `processStoreRefund` debits the vendor wallet, restocks, and can mark the whole order `refunded` (see finding F-5/F-6).
9. **Seller payouts** run through `payout.worker` on wallet balances (out of strict scope; adjacent and consistent).

---

## 4. Bug #1 — Expedition "Expédiée" but order status "En attente"

### Reproduction
1. Buyer pays online (or places a COD order). Seller dashboard list: status column "En attente" (or "Paiement requis").
2. Seller clicks **"Générer l'étiquette"** (expédition) → label created successfully. Expedition column now shows **"Expédiée"** (fulfillment `shipped` → `fulfillmentLabel`, `page.tsx:1081-1090`).
3. Status column still shows **"En attente"** (`statusLabel('pending')`, `page.tsx:305-315`) — indefinitely, until delivery is recorded manually.

### Root cause chain (verified)
1. Label path B flips fulfillment only: `shipping.service.ts:666` `UPDATE pd_fulfillment SET tracking_number=$2, carrier=$3, status='shipped' ...` — no `pd_order` statement follows (`createStoreShipment`, `order.service.ts:1082-1245`, likewise only updates the fulfillment's carrier/tracking at 1235-1242).
2. Only Path A (`fulfill()`, `order.service.ts:1641`) propagates to the order, and even there only when **zero** pending fulfillments remain order-wide.
3. For online-paid orders the order was created `pending` and `markPaid` leaves it `pending` (`order.service.ts:2233` CASE). Nothing ever writes `processing`. So a **paid, shipped** order legitimately reads `pending`.
4. For COD orders the order sits at `payment_required` ("Paiement requis") until delivery — also read as "not started" by sellers.
5. Multi-store orders: even Path A cannot advance the order until **every store** ships, so each seller sees the aggregate `pending` although their own fulfillment is `shipped` — correct aggregation, misleading per-store display (no per-store explanation in the UI).

### Consequences beyond cosmetics
- `canFulfill()` becomes false after label creation (fulfillment no longer `pending`), so "Marquer expédiée" disappears — the seller has **no remaining action that advances the order status** except "Marquer comme livrée".
- If the carrier sync (or webhook) later marks the fulfillment `delivered`, the order is **never** advanced (`persistTrackingResult` touches only shipment+fulfillment) → an actually-delivered order can remain "En attente" forever unless the seller manually files a delivery proof. This is the strongest variant of the bug.
- Buyer side mirrors it: `frontend/src/app/hub/orders/page.tsx:46,262-263` renders the same raw `order.status`, so buyers also see "En attente" for paid+shipped orders; meanwhile the checkout success page promises "votre commande … est en cours de préparation par le vendeur" (`app/hub/checkout/success/page.tsx:198`) — three different stories about the same order.
- Analytics partially mask the problem by OR-ing statuses (`analytics.service.ts:1687-1702`), but any consumer that trusts `pd_order.status` (e.g., `store.service.ts:1151,1383` open-order counters, `seller-broadcast.service.ts:461`, `store-subscription.service.ts:62`) inherits the distortion.

---

## 5. Bug #2 — Seller cannot change the "Préparation" status

### What the UI offers
The seller order detail drawer shows a 5-step timeline: Commande créée → Paiement confirmé → **Préparation** → Expédition → Livraison (`buildOrderTimeline`, `page.tsx:1126-1165`). The row actions are only: Générer l'étiquette / Ouvrir l'étiquette, Marquer expédiée (modal with carrier+tracking), Marquer comme livrée, Annuler l'expédition, COD tools, refunds, notes.

### Why it can never change
1. **No backend endpoint exists** to set a preparation/`processing` state. The complete seller-reachable transition surface is: `POST /:id/fulfill`, `POST /:id/deliver`, `POST /:id/fulfillment/cancel`, `POST /store/:id/rto`, `POST /store/:id/shipments`, refunds, COD tools (`order.route.ts`; `seller.route.ts` adds an alternate `PATCH /seller/orders/:id/fulfill` with the same single transition).
2. **No DB writer** for `status='processing'` exists (§2 table). The enum value and the UI label (`processing → "Confirmée"`, `page.tsx:308`) are dead.
3. The timeline "Préparation" step is **derived, not stored**: `isProcessing = ['processing','fulfilled','delivered'].includes(order.status) || ['pending','shipped','delivered'].includes(order.fulfillment_status)` (`page.tsx:1129`). Because a fulfillment row exists from checkout with status `pending`, `isProcessing` is **always true** → the step displays **"Colis préparé"** for every order, including brand-new ones that nobody touched. The step cannot be advanced or reverted by the seller because it reflects nothing.
4. After label generation the only remaining manual transitions are deliver/cancel; there is no "revert to preparation" either (fulfillment can only go `pending → shipped`, `shipped → delivered`; cancel only from `pending`).

### Extra trap (cross-store edge)
`canFulfill`/`canCancelSellerFulfillment` also require the **order-level** status not to be `fulfilled/delivered/cancelled` (`page.tsx:1102-1111`). The order-level status can be set to `fulfilled` by `markPaidInTransaction` (`order.service.ts:2229-2231` → when a late capture happens after all fulfillments left `pending`, e.g. one store cancelled) or by `cancelStoreFulfillment` aggregates (`order.service.ts:1835`) — in those states another store's still-`pending` fulfillment loses its ship/cancel buttons even though the seller did nothing wrong. Rare, but a hard dead-end when it hits.

---

## 6. Bug #3 — "Articles de la boutique" → "Détail des articles indisponible"

### The render rule
Drawer section "Articles de la boutique" (`storeItems`, fr.json) renders items when `(selectedOrder.items || []).length > 0`, else the fallback string `itemsDetailUnavailable` = "Détail des articles indisponible" (`page.tsx:3517-3545`; same fallback in the printable invoice/bon-livraison HTML builder at `page.tsx:513-521`).

### Where `items` actually comes from
- `GET /api/pd/orders/store/:id` → `getStoreOrderDetail` (`order.route.ts:231-236`) returns `items` via a LATERAL `json_agg` over `pd_order_item` **filtered by the seller's `store_id`** (`order.service.ts:919-1055`). Tenant-isolated and normally populated (the endpoint 404s if the store has no items on the order).
- `GET /api/pd/orders/store` (list, `listByStore`, `order.service.ts:1362-1600`) returns **no `items` field at all** — the SELECT has no item aggregation.

### The defects
1. **Deterministic — COD table:** the COD tab opens the drawer with `onClick={() => { setSelectedOrder(order); }}` (`page.tsx:2972`) using the **list row** (no `items`, no detail fetch). Every COD order opened from that table shows "Détail des articles indisponible" in "Articles de la boutique", plus empty customer stats. Same for the RTO table's "Voir Fiche" button (`page.tsx:3205`).
2. **On any detail-fetch failure:** `openOrderDetail` (`page.tsx:1596-1616`) sets the row first, fetches, and on `!res.ok` shows the error but **keeps the items-less row** as `selectedOrder` → same empty state (graceful degradation shows a wrong "no data" instead of "load failed" for that section).
3. **Masked by tests:** `backend/src/__tests__/seller-orders.test.ts` mocks `listByStore` returning rows *with* `items` — the mock encodes the contract the implementation never had, so no test catches the divergence.
4. Secondary effect: the print builder (`page.tsx:487-521`) renders the same "indisponible" row when printing from those entry points.

---

## 7. Additional findings from the full-pipeline audit

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| F-1 | **High** | `ORDER_FULFILLED` has a subscriber (customer "Commande expédiée" notification + `order_shipped` email + WhatsApp tracking) but **no emitter exists anywhere** → buyers are never notified of shipment from either ship path | subscriber: `order.subscriber.ts:66-74, 380-437`; emit search: 0 hits |
| F-2 | **High** | Carrier tracking sync / carrier webhooks never propagate delivery to `pd_order` → delivered orders can remain `pending` forever | `shipping.service.ts:858-897` vs writer map §2 |
| F-3 | **High** | Order status semantics: `pending` = "awaiting payment" at creation but survives payment capture; `processing` dead; UI label "En attente" for paid orders misleads sellers and buyers | `order.service.ts:669-671, 2227-2236`; `page.tsx:305-315` |
| F-4 | Medium | Timeline "Préparation" shows "Colis préparé" for every order with a fulfillment row (auto-done), contradicting `En attente de préparation` logic elsewhere | `page.tsx:1128-1130, 1153-1157` |
| F-5 | Medium | Partial refund restocks **all** store items of the order each time a refund is processed → repeated partial refunds inflate inventory; cancel+refund can double-restock | `order.service.ts:2009-2015` (unconditional restock) |
| F-6 | Medium | Sellers can process their own refund requests (`POST /store/:id/refunds/:refundId/process`) with no platform/admin approval gate; wallet debit, restock and order→`refunded` all seller-triggered. Money leaves the seller's own wallet (self-consistent) but buyer restitution and order-state changes have no oversight | `order.route.ts:252-266`; `order.service.ts:1934-2040` |
| F-7 | Medium | `createStoreShipment` returns the latest existing shipment **regardless of its status** (even `cancelled`), so a seller whose label was cancelled gets the cancelled label back as "Open label" with no regeneration path | `order.service.ts:1135-1141` |
| F-8 | Low | Shipment status chip in the drawer prints raw English carrier states (`created`, `in_transit`…) untranslated | `page.tsx:3860` |
| F-9 | Low | `PATCH /api/pd/seller/orders/:id/fulfill` responds `{status:'fulfilled'}` though it only ships the fulfillment — misleading API contract; two parallel fulfill endpoints (orders vs seller) also invite drift | `seller.route.ts:150-170` |
| F-10 | Low | `markPaidInTransaction` can jump a late-captured order straight to `fulfilled` (no pending fulfillments) even when nothing was actually shipped via Path A (label-only shipments make this consistent, but manual flows may skip tracking) | `order.service.ts:2229-2231` |
| F-11 | Info | List endpoint summary counters and filters treat `fulfilled` as "shipped" — consistent with UI, inconsistent with schema comment | `order.service.ts:1540-1543`; `page.tsx:2467` |

### What is solid (verified, worth keeping)
- Checkout idempotency (header + unique partial index + binding assertions), payment-event dedup, `PAY_ALREADY_CAPTURED` handling.
- Guarded atomic stock decrement (product/variant/bundle) with `FOR UPDATE SKIP LOCKED` serial allocation; checkout concurrency suite exists (`checkout-concurrency.test.ts`).
- Tenant isolation on seller reads/writes (`EXISTS pd_order_item ... store_id` guard in every store-scoped query; `resolveSellerStoreId` verifies ownership).
- Wallet crediting is idempotent per order (`sale` transaction guard) with commission + per-gateway retention; COD capture correctly deferred to full delivery.
- Shipment reconciliation worker + carrier webhook signature verification + compensation cancel on persist failure.
- Multi-vendor splitting (per-store fulfillment, per-store refunds, per-store courier settlement ledger) is coherently modeled.

---

## 8. Recommendations (prioritized; no code was changed)

**P0 — make fulfillment reality propagate to the order**
1. In `shippingService.createShipment` (and `persistTrackingResult`), after updating `pd_fulfillment`, apply the same aggregate rule as `fulfill()`/`markStoreFulfillmentDelivered`: if no `pending` fulfillments remain → `pd_order.status='fulfilled'`; if none active and ≥1 delivered → `'delivered'`. This alone fixes bug #1 for both label and carrier-synced paths.
2. Emit `ORDER_FULFILLED` (carrier, tracking) from both ship paths and from delivery sync (F-1) so buyers actually receive shipped notifications.

**P1 — give the seller a real preparation control (bug #2)**
3. Either implement `processing` end-to-end (`PATCH /api/pd/orders/store/:id/status` restricted to `pending → processing → shipped` transitions per fulfillment, with a writer for `status='processing'`), **or** remove the "Préparation" step from the seller timeline. Do not keep a fake auto-done step.
4. Fix `isProcessing` (drop `fulfillment_status='pending'` from the "prepared" condition) and gate `canFulfill`/`canCancelSellerFulfillment` on fulfillment status alone, not order-aggregate status (removes the cross-store dead-end).

**P1 — items everywhere (bug #3)**
5. Replace the two direct `setSelectedOrder(order)` calls with `openOrderDetail(order)` (COD + RTO tables), **and/or** add the same store-filtered items LATERAL aggregation to `listByStore` (the test already assumes it). Prefer both: cheap aggregation + correct fetch behavior; on fetch failure keep a distinct "could not load items" state.

**P2 — consistency & hygiene**
6. Rename/clarify order status semantics for paid-but-unshipped (use `processing` once implemented, or relabel `pending` in seller/buyer UIs as "Confirmée / Payée" per context); update `store.service`/`analytics` counters if semantics change.
7. Restock only the refunded quantity (line-level refund items) instead of all store items per refund (F-5); add an approval gate or at least an audit event for seller-processed refunds (F-6).
8. `createStoreShipment`: if latest shipment is `cancelled`, allow regeneration instead of returning it (F-7); translate shipment status chips (F-8); unify the two fulfill endpoints behind one service contract (F-9).

---

## 9. Reproduction & verification checklist (for post-fix QA)

- **Bug #1:** new order (online + COD) → generate label → order status must read "Expédiée"/`fulfilled` (single-store) ; carrier-sync to `delivered` → order `delivered` without manual proof.
- **Bug #2:** preparation action visible and persisted (`pd_order.status='processing'`), timeline reflects it; multi-store order: store A shipped + store B pending → order not `fulfilled`, store B keeps buttons.
- **Bug #3:** open drawer from Orders table, COD tab, and RTO tab → items always listed; simulate detail 500 → explicit error state, not silent "indisponible".
- **Notifications:** shipped order triggers buyer notification/email/WhatsApp once (idempotent per fulfillment).
- **Refunds:** two 30% partial refunds → inventory restocked exactly once for the refunded quantity only.

## 10. Environment & source notes

- Backend health (live, during audit): `https://pandamarket-backend-fjom.onrender.com/health` → `200 {"status":"ok"}`. No other production calls were made; DB/Redis passwords are redacted in `REMOTE_CREDENTIALS.md`, so no data-level verification was possible. All conclusions cite repository code at commit `7141e9f`.
- Key sources: `backend/src/services/order.service.ts`, `backend/src/services/shipping.service.ts`, `backend/src/api/order.route.ts`, `backend/src/api/seller.route.ts`, `backend/src/subscribers/order.subscriber.ts`, `backend/src/migrations/sql/001_initial_schema.sql` & `003_shipping_and_digital.sql`, `frontend/src/app/hub/dashboard/orders/page.tsx`, `frontend/src/i18n/messages/fr.json`, `packages/types/src/enums.ts`.
- Label mapping (fr.json `dashboardPages.orders`): `pending`="En attente", `paymentRequired`="Paiement requis", `confirmed`="Confirmée" (for `processing`), `shipped`="Expédiée", `delivered`="Livrée", `storeItems`="Articles de la boutique", `itemsDetailUnavailable`="Détail des articles indisponible", `timelinePreparation`="Préparation", `timelinePreparationReady`="Colis préparé".

---

*This audit is a technical research document produced for informational purposes from the repository state at the cited commit; it is not legal advice and does not replace review by qualified counsel or your engineering team before relying on or acting on it.*
