# 05 — Additional findings F-1 … F-11 (full-pipeline audit)

Findings beyond the three reported bugs, discovered while auditing the whole order process at commit `7141e9f`. Severity reflects marketplace impact at current scale.

---

## F-1 · HIGH — `ORDER_FULFILLED` is a dead event: buyers are never told their order shipped

- The subscriber exists and does real work: in-app notification "Commande expédiée", `order_shipped` email, WhatsApp message with tracking link (`backend/src/subscribers/order.subscriber.ts:66-74` registration; `380-437` handler).
- A repo-wide search for `emit(PdEvent.ORDER_FULFILLED` returns **zero** producers. Neither `fulfill()` nor `createStoreShipment` nor `persistTrackingResult` emits it.
- Consequence: no shipment notification ever reaches the buyer from either ship path (email/WhatsApp/in-app all silent), weakening delivery coordination and COD success rates.
- Fix: emit from both ship paths and from delivery transitions; include `carrier` + `tracking_number` (the payload shape the subscriber already expects). Idempotency: guard per fulfillment to avoid double-send on re-ship.

## F-2 · HIGH — Carrier-synced delivery never reaches `pd_order`

- `persistTrackingResult` (`shipping.service.ts:858-897`) updates `pd_shipment` and `pd_fulfillment` only. A parcel the carrier marks delivered leaves `pd_order.status` untouched (typically `pending`).
- The manual repair path (`POST /orders/:id/deliver`) requires fulfillment `status='shipped'`; once sync already set `delivered`, `canMarkDelivered` is false (`page.tsx:1106-1108`) → **no UI remedy**.
- Fix: call the same aggregate recompute as Bug #1's fix inside `persistTrackingResult`.

## F-3 · HIGH — `pd_order.status` semantics are misleading after payment

- Creation semantics: `pending` = awaiting payment (online) / `payment_required` = COD/mandat. After capture, online orders **stay** `pending` (`order.service.ts:2227-2235` only maps `payment_required → pending`).
- Nothing ever writes `processing` (see Bug #2). Result: "paid & shipped" ≡ "pending" in the DB; the UI column reads "En attente".
- Fix: with Bug #1 propagation + Bug #2's `processing` implemented, the lifecycle becomes coherent; until then, consider a UI-level derived label (e.g., `pending` + `payment_status='captured'` → "Confirmée").

## F-4 · MEDIUM — Timeline "Préparation" is auto-done for every order

- `isProcessing` (`page.tsx:1128-1130`) treats `fulfillment_status='pending'` as prepared → step shows "Colis préparé" for untouched orders. Covered in Bug #2 (Blocker 3).

## F-5 · MEDIUM — Partial refunds restock ALL store items, repeatedly

- `processStoreRefund` step 3b (`order.service.ts:2009-2015`):
  ```sql
  UPDATE pd_product p SET inventory_quantity = p.inventory_quantity + oi.quantity …
  FROM pd_order_item oi WHERE oi.order_id=$1 AND oi.store_id=$2 AND oi.product_id=p.id
  ```
  runs **unconditionally per processed refund**, for every store item — regardless of refund amount or which lines are being refunded.
- Two 30% partial refunds ⇒ items restocked twice in full; cancel (restores stock) + refund (restocks again) ⇒ double-restock. Inventory inflation breaks availability guarantees.
- Fix: refund-line tracking (store the refunded `order_item_id`/quantities in `pd_store_order_refund.metadata` or a child table) and restock only net-unrestocked quantities; add a unique guard per (refund, item).

## F-6 · MEDIUM — Sellers process their own refunds with no oversight

- `POST /api/pd/orders/store/:id/refunds/:refundId/process` (`order.route.ts:252-266`) is store-scoped only; `processStoreRefund` debits the vendor wallet, restocks, emits refund events, and can flip the whole order to `refunded` (`order.service.ts:1934-2040`).
- Money math is self-consistent (debit leaves the seller's own wallet; over-debit protected by `debitRefund`), but buyer restitution, restock correctness (F-5) and order-state changes have **no platform/admin approval gate or audit review** — a governance gap for disputes.
- Fix: minimum viable control — require an admin approval when cumulative refunds exceed a threshold or when the order is not `delivered`; always append an audit-log entry (`pd_audit_log`) with actor + amounts.

## F-7 · MEDIUM — Cancelled shipment labels are returned as "open label" forever

- `createStoreShipment` returns the latest existing shipment regardless of status (`order.service.ts:1135-1141`); the UI then shows "Ouvrir l'étiquette" for a **cancelled** label with no regeneration path.
- Fix: only short-circuit on non-cancelled shipments; when latest is `cancelled`, allow creating a new label (and consider nulling fulfillment carrier/tracking on cancel — currently `cancelShipment` sets fulfillment `cancelled`, which blocks `canGenerateLabel` anyway; verify intended UX).

## F-8 · LOW — Raw English shipment status chips in a French UI

- Drawer chip prints `shipment.status` untranslated (`page.tsx:3860`): `created`, `in_transit`, `out_for_delivery`… Add an i18n map alongside `fulfillmentLabel`.

## F-9 · LOW — Duplicate fulfill endpoints with a misleading response

- `PATCH /api/pd/seller/orders/:id/fulfill` responds `{ status:'fulfilled' }` although it only ships the fulfillment (`seller.route.ts:150-170`) — the status key suggests order state. The dashboard actually calls `POST /api/pd/orders/:id/fulfill`. Two parallel endpoints invite drift.
- Fix: keep one canonical endpoint; make the other an alias or deprecate; correct the response body.

## F-10 · LOW — Late capture can jump the order to `fulfilled` without any shipment

- `markPaidInTransaction`: `WHEN NOT EXISTS (… status='pending') THEN 'fulfilled'` (`order.service.ts:2229-2231`). If a reconciliation/return-trip capture lands after fulfillments left `pending` for any reason (e.g., cancelled), the order becomes `fulfilled` ("Expédiée") even if nothing ships. Acceptable when labels exist (F-1/E evidence), wrong for pure cancellations.
- Fix: require `EXISTS (… status IN ('shipped','delivered'))` for the `fulfilled` jump.

## F-11 · INFO — Summary counters encode "fulfilled = shipped"

- `listByStore` summary (`order.service.ts:1540-1543`) and the status filter's option label (`page.tsx:2467` maps `fulfilled → "Expédiée"`) bake the aggregate semantics into the API/UI. If status semantics change (F-3), revisit these together.

---

## Verified-solid areas (no action needed)

- Checkout idempotency (header key + unique partial index + binding mismatch conflict) and payment-event dedup / `PAY_ALREADY_CAPTURED` handling.
- Atomic stock decrement guards (product/variant/bundle) with `FOR UPDATE SKIP LOCKED` serial allocation; `checkout-concurrency.test.ts` covers races.
- Tenant isolation: every store-scoped query guards via `EXISTS (SELECT 1 FROM pd_order_item … store_id)`; `resolveSellerStoreId` verifies ownership.
- Wallet crediting idempotent per order (`sale` transaction guard), commission by plan, per-gateway retention days; COD capture deferred to full delivery with event emission.
- Shipment reconciliation worker + carrier webhook signature verification + compensation cancellation if DB persistence fails.
- Multi-vendor model (per-store fulfillment/refunds/settlements) is coherently structured.
