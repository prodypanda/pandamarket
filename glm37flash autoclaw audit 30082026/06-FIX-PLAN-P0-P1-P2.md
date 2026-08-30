# 06 — Fix Plan (P0 / P1 / P2) with implementation how-tos

> **Nothing in this plan has been applied.** Every item is a reviewed suggestion. Sketches are indicative TypeScript — adapt naming/style to the codebase and re-run the test suites.

## Guiding principle

One helper, one truth: fulfillment mutations everywhere funnel through a single aggregate-recompute for `pd_order.status`. This reuses the exact logic already written twice (`fulfill()`, `markStoreFulfillmentDelivered`) — no new state, no migration.

---

## P0-1 · Centralize order-status propagation (fixes Bug #1 + F-2)

**Files:** `backend/src/services/order.service.ts` (new helper + reuse), `backend/src/services/shipping.service.ts` (call sites).

1. Add to `OrderService` (sketch — not applied):

```ts
/**
 * Recompute pd_order.status from the fulfillment aggregate.
 * Safe to call inside or outside a transaction; idempotent.
 * Returns the resulting status (or null if order untouched).
 */
async recomputeOrderFulfillmentStatus(
  orderId: string,
  client?: Pick<PoolClient, 'query'>,
): Promise<string | null> {
  const exec = client ?? { query: (sql: string, vals?: unknown[]) => query(sql, vals as unknown[]) };
  const { rows } = await exec.query<{ pending: string; shipped: string; delivered: string; cancelled: string; active: string }>(
    `SELECT COUNT(*) FILTER (WHERE status = 'pending')::text  AS pending,
            COUNT(*) FILTER (WHERE status = 'shipped')::text  AS shipped,
            COUNT(*) FILTER (WHERE status = 'delivered')::text AS delivered,
            COUNT(*) FILTER (WHERE status = 'cancelled')::text AS cancelled,
            COUNT(*) FILTER (WHERE status IN ('pending','shipped'))::text AS active
       FROM pd_fulfillment WHERE order_id = $1`,
    [orderId],
  );
  const c = rows[0];
  if (!c) return null;

  const target =
    c.active === '0' && c.delivered !== '0' ? 'delivered'
    : c.active === '0' && c.shipped !== '0' ? 'fulfilled'
    : c.cancelled !== '0' && c.active === '0' && c.delivered === '0' && c.shipped === '0' ? 'cancelled'
    : null; // mixed/early states → leave the order alone
  if (!target) return null;

  const { rows: upd } = await exec.query<{ status: string }>(
    `UPDATE pd_order SET status = $2, updated_at = NOW()
      WHERE id = $1 AND status NOT IN ('cancelled','refunded') RETURNING status`,
    [orderId, target],
  );
  return upd[0]?.status ?? null;
}
```

2. Replace the inline count-and-update blocks in `fulfill()` (`order.service.ts:1630-1644`), `markStoreFulfillmentDelivered` (`1737-1756`), `cancelStoreFulfillment` (`1814-1839`) with calls to the helper (keep their extra side-effects: COD capture, cancellation reason, stock restore).

3. Call the helper after every fulfillment mutation in the shipping layer:
   - `shippingService.createShipment` right after the `UPDATE pd_fulfillment … status='shipped'` (`shipping.service.ts:665-670`) — pass the DB client if inside the transaction;
   - `persistTrackingResult` after the fulfillment sync update (`shipping.service.ts:876-895`) — inside its transaction;
   - `cancelShipment` after fulfillment cancellation (`shipping.service.ts:939-943`);
   - `markStoreFulfillmentRto` (`order.service.ts:2462+`).

**Why this is safe:** idempotent, monotone with fulfillment reality, guarded against `cancelled/refunded`, and no longer order-write-proliferation because all other writers keep working unchanged.

**Tests to add:** label-created single-store order → order `fulfilled`; label + carrier `delivered` sync → order `delivered` without manual proof; two-store order (A shipped, B pending) → order stays untouched; refund-finalized order not resurrected.

## P0-2 · Emit `ORDER_FULFILLED` (fixes F-1)

**Files:** `order.service.ts` (`fulfill()`, after helper returns `fulfilled`), `shipping.service.ts` (`createShipment`, `persistTrackingResult` when fulfillment transitions to `shipped`/delivered handoff).

```ts
if (resultStatus === 'fulfilled') {
  await eventBus.emit(PdEvent.ORDER_FULFILLED, {
    order_id, carrier: shipment.provider, tracking_number: shipment.tracking_number,
  });
}
```
Subscriber side is already complete (`order.subscriber.ts:380-437`). Add a per-fulfillment idempotency guard if a fulfillment can re-enter `shipped`.

## P1-1 · Real preparation state (fixes Bug #2, Option A)

1. **Backend:** add `POST /api/pd/orders/store/:id/prepare` (`order.route.ts`), tenant-guarded like `fulfill`:
   - transitions the **fulfillment** `pending → preparing` (add the value to the fulfillment status domain — schema comment + validators; a VARCHAR column needs no migration, but add a CHECK constraint migration for hygiene, mirroring `003`);
   - reject when `fulfillment_status !== 'pending'`;
   - do **not** change `pd_order.status` (preparation is per-store, order stays aggregate).
2. **Frontend:** button "Marquer comme préparée" (`canPrepare(o) = o.fulfillment_status === 'pending'`) next to the label action; `fulfillmentLabel` gains `preparing: "En préparation"`; timeline "Préparation" step reads `fulfillment_status === 'preparing' || 'shipped' || 'delivered'` as done, `pending` as waiting.
3. **Fix `isProcessing`** (`page.tsx:1129`): drop `'pending'` from the prepared condition.
4. **Fix gating:** `canFulfill`/`canCancelSellerFulfillment` should not consult order-level status (or should allow when `fulfillment_status === 'pending'` regardless) — removes the cross-store dead-end (Bug #2 §3).
5. **Tests:** transition guards, tenant guard, timeline states, regression on `seller-orders.test.ts`.

*Minimal alternative:* Option B — remove/rename the timeline step (pure frontend, zero risk). Choose A if sellers need the workflow.

## P1-2 · Items everywhere (fixes Bug #3)

1. **Point fixes:** `page.tsx:2972` (COD tab) and `page.tsx:3205` (RTO tab): `onClick={() => void openOrderDetail(order)}`.
2. **Contract fix:** extend `listByStore`'s SELECT with the store-filtered items aggregation (same projection as `getStoreOrderDetail`'s LATERAL, minus bundle detail if payload is a concern):
   ```sql
   LEFT JOIN LATERAL (
     SELECT json_agg(json_build_object(
              'id', i.id, 'product_id', i.product_id, 'variant_id', i.variant_id,
              'product_title', i.title, 'quantity', i.quantity,
              'unit_price', i.unit_price, 'subtotal', i.subtotal,
              'thumbnail', p.thumbnail
            ) ORDER BY i.created_at ASC) AS items
     FROM pd_order_item i LEFT JOIN pd_product p ON p.id = i.product_id
     WHERE i.order_id = o.id AND i.store_id = $1
   ) items ON true
   ```
   and add `COALESCE(items.items, '[]'::json) AS items` to the projection. Update `StoreOrderRow` type. The existing test mock already expects this contract.
3. **Failure state:** in `openOrderDetail`, on `!res.ok`, set a `detailLoadFailed` flag; render a distinct "Impossible de charger les articles" with retry in the storeItems section instead of the generic fallback.

## P2-1 · Refund restock precision (F-5)

- Persist refunded lines: add `refunded_items jsonb` (array of `{order_item_id, quantity}`) to `pd_store_order_refund` (migration ~`099_…`) or store in `metadata` with a strict zod schema.
- Restock only `SUM(refunded_items quantities per product)` minus already-restocked (guard via a `restocked boolean` per refund or a `pd_refund_restock` ledger table with unique(refund_id, order_item_id)).
- Request payload: extend `storeRefundSchema` with optional `items: [{order_item_id, quantity}]`; when absent, restock nothing (amount-only refund).

## P2-2 · Refund oversight (F-6)

- Add threshold/config: `platformConfigService` key e.g. `refund_auto_process_max_amount_tnd` (default 0 = always require admin).
- `processStoreRefund` checks: amount ≤ threshold → allow seller; else mark `awaiting_admin` and notify admins (reuse notification batch service). Log every decision to `pd_audit_log`.

## P2-3 · Small hygiene fixes

- F-7: in `createStoreShipment`, short-circuit only when `existingShipments[0].status !== 'cancelled'`; else create a new label.
- F-8: add `shipmentStatusLabel` i18n map; use it at `page.tsx:3860`.
- F-9: deprecate `PATCH /seller/orders/:id/fulfill` (or alias it to the canonical route and fix its response body to `{success:true, fulfillment_status:'shipped'}`).
- F-10: tighten `markPaidInTransaction`'s `fulfilled` jump to require `EXISTS (SELECT 1 FROM pd_fulfillment WHERE order_id=$1 AND status IN ('shipped','delivered'))`.
- F-3/F-11: after P0/P1 land, revisit `pending` label (show "Confirmée" when `payment_status='captured'`) and the summary counters.

## Suggested merge order & regression scope

1. P0-1 + P0-2 (same PR — propagation + event).
2. P1-2 (frontend point fixes + list aggregation; update `seller-orders.test.ts` to assert real SQL output via integration test rather than mock).
3. P1-1 (preparation state; includes migration if adding CHECK constraint).
4. P2 items, one PR each.

Run: backend `vitest` (order/payment/shipping suites), frontend `vitest` (orders page tests), plus the manual QA checklist in `07`.
