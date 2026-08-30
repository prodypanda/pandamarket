# 01 — Answers to the 3 Reported Symptoms (Root-Cause Analysis)

Each answer below contains: what the user sees, the exact code path responsible (file:line), live production evidence, and the recommended fix direction.

---

## Symptom 1 — "Order expedition is expedited but the order status displays pending"

### What is displayed

The seller dashboard orders table (`frontend/src/app/hub/dashboard/orders/page.tsx`) has TWO separate status columns:

- **"Statut" column** (line 2752-2757): renders `order.status` via `statusLabel()` (line 305-315).
  - `pending` -> "En attente" (yellow), `payment_required` -> "Paiement requis" (orange), `fulfilled` -> "Expédiée" (purple), etc.
- **"Expédition" column** (line 2759-2779): renders `order.fulfillment_status` via `fulfillmentLabel()` (line 1081-1090).
  - `pending` -> "À expédier", `shipped` -> "Expédiée", `delivered` -> "Livrée", `cancelled` -> "Annulée", `null` -> "Non expédiable".

These are two different database columns from two different tables (`pd_order.status` and `pd_fulfillment.status`), joined per-store in `listByStore()` (`backend/src/services/order.service.ts:1362-1610`). When they disagree, the UI shows contradictory badges. They disagree for **3 reasons**:

### Root cause 1.1 (the actual bug) — Carrier label generation never updates the order status

`POST /api/pd/orders/store/:id/shipments` -> `orderService.createStoreShipment()` (order.service.ts:1082-1241) -> `shippingService.createShipment()` (`backend/src/services/shipping.service.ts`). Inside `createShipment()`, after inserting the `pd_shipment` row, it runs:

```ts
// backend/src/services/shipping.service.ts:664-669
await query(
  `UPDATE pd_fulfillment
   SET tracking_number = $2, carrier = $3, status = 'shipped', shipped_at = COALESCE(shipped_at, NOW()), updated_at = NOW()
   WHERE id = $1 AND store_id = $4`,
  [req.fulfillment_id, carrierResult.tracking_number, carrier.name, req.store_id],
);
```

It force-sets the **fulfillment** to `shipped` (even bypassing the `status = 'pending'` guard that the manual path uses) but **never recomputes `pd_order.status`**. Compare with the manual path `fulfill()` (order.service.ts:1615-1646) which after shipping checks:

```ts
// backend/src/services/order.service.ts:1634-1644
const { rows } = await query<{ pending: string }>(
  `SELECT COUNT(*)::text AS pending FROM pd_fulfillment WHERE order_id = $1 AND status = 'pending'`,
  [opts.order_id],
);
if (rows[0].pending === '0') {
  await query(
    `UPDATE pd_order SET status = 'fulfilled' WHERE id = $1 AND status NOT IN ('cancelled','refunded')`,
    [opts.order_id],
  );
}
```

So: **manual ship -> order becomes `fulfilled` (displays "Expédiée"). Carrier-label ship -> order stays whatever it was (`pending`, `payment_required`, ...).**

**Live production evidence** (queried 2026-08-30):

| Order (last 8) | Gateway | Fulfillments | Fulfillment status | Carrier/Tracking | Order status TODAY |
|---|---|---|---|---|---|
| `...vCzt4t3H` | cod | 1 | **shipped** (2026-08-15) | aramex / ARAMEX-TN-76064226 | **`payment_required`** (stuck 15 days) |
| `...kB2SykvE` | cod | 1 | **shipped** (2026-08-15) | aramex / ARAMEX-TN-71380627 | **`payment_required`** (stuck 15 days) |
| `...pZRBn8mm` | cod | 1 | shipped (2026-05-06, **manual modal**, carrier "hhhh") | manual | `fulfilled` (correct) |

The two Aug-15 orders were shipped via Aramex labels (single fulfillment each, zero pending) yet the order status was never promoted. Extra damage: since the order is COD and the carrier-webhook delivery path (root cause 1.2) also fails to capture COD payment, **these orders can never reach `captured`** — the vendors will never be paid through the normal flow.

Also note orders `...6thmSpQZ` and `...DGq97HRZ` were shipped via "La Poste Tunisienne" label generation on Aug 29 with `tracking_number = NULL` — see P1-4 in doc 03 for the related fulfill() overwrite issue.

### Root cause 1.2 — Carrier tracking sync (webhook + reconciliation worker) has the same hole

`persistTrackingResult()` (shipping.service.ts:842-897), invoked by both the carrier webhook handler and the `shipment-reconciliation.worker.ts` sweep (confirmed started in `main.ts:587` and `worker.ts:66`), maps carrier statuses onto the fulfillment:

```ts
// backend/src/services/shipping.service.ts:882-895
await client.query(
  `UPDATE pd_fulfillment
   SET status = CASE
         WHEN $2 = 'delivered' THEN 'delivered'
         WHEN $2 IN ('cancelled', 'returned') THEN 'cancelled'
         ELSE CASE WHEN status = 'pending' THEN 'shipped' ELSE status END
       END,
       ...
   WHERE id = (SELECT fulfillment_id FROM pd_shipment WHERE id = $1)`,
  [shipmentId, mapTrackingStatus(result.status)],
);
```

It can set fulfillments `shipped` / `delivered` / `cancelled` but:
- never recomputes `pd_order.status` (same hole as 1.1);
- on `delivered` for a **COD** order it never sets `payment_status = 'captured'`, never emits `PAYMENT_CAPTURED`, never credits vendor wallets, never records a delivery proof — the manual path `markStoreFulfillmentDelivered()` (order.service.ts:1648-1765) does all of this correctly;
- on `cancelled`/`returned` it never restocks (the manual/RTO paths do).

### Root cause 1.3 — Multi-vendor orders only advance the order status when ALL vendors ship (by design, terrible UX)

`fulfill()` only promotes the order when `COUNT(pending fulfillments) = 0`. All 10 recent marketplace orders in production are 2-vendor orders (Atelier Médina + mejrda). Production snapshot:

| Order | Atelier Médina fulfillment | mejrda fulfillment | Order status |
|---|---|---|---|
| `...DGq97HRZ` | shipped | pending | **pending** (captured payment) |
| `...6thmSpQZ` | shipped | pending | **pending** |
| `...4Jv9AyVM` | pending | shipped | **payment_required** |

Each vendor sees their own "Expédiée" in the fulfillment column while the shared order badge reads "En attente". This is arguably correct domain modeling, but the dashboard offers **zero explanation** (no "waiting on 1 other vendor" hint), so it reads as a bug to every seller. Recommended: show a per-order aggregate hint like "En attente de 1 autre boutique" in both the table and the drawer timeline.

### Recommended fix

See `09-IMPLEMENTATION-GUIDES.md` Guide A (centralize `syncOrderStatusFromFulfillments` + call from `createShipment` and `persistTrackingResult`) and Guide C (route carrier `delivered` through the COD capture path). This single refactor fixes the desync class-wide rather than patching each site.

---

## Symptom 2 — "The seller can't change the Préparation status"

### What is displayed

In the order detail drawer, the timeline (built by `buildOrderTimeline()`, page.tsx:1125-1171) shows 5 steps: Commande cree -> Paiement confirme -> **Preparation** -> Expedition -> Livraison. The seller has no button/control anywhere to change a "Preparation" state.

### Root cause 2.1 — There IS no preparation state. It is a computed UI illusion.

```ts
// frontend/src/app/hub/dashboard/orders/page.tsx:1129
const isProcessing = ['processing', 'fulfilled', 'delivered'].includes(order.status)
  || ['pending', 'shipped', 'delivered'].includes(order.fulfillment_status || '');
...
// lines 1153-1157
{
  label: t('dashboardPages.orders.timelinePreparation'),
  description: isProcessing ? t('dashboardPages.orders.timelinePreparationReady') : t('...Waiting'),
  state: isProcessing ? 'done' : 'pending',
},
```

"Preparation" is derived from other statuses; nothing persisted backs it. There is no API endpoint that can set a preparation state, so the UI cannot offer a control for it.

### Root cause 2.2 — `OrderStatus.Processing` is dead code

`packages/types/src/enums.ts` defines `Processing = 'processing'`, and the dashboard maps it to the label "Confirmee" (`statusLabel`, page.tsx:309). **Grep across the entire backend returns zero writes of `status='processing'` to `pd_order`** — the state can never occur. (The only `'processing'` matches in backend src are for AI jobs, the outbox, and read-side filters.)

Consequence: the intended lifecycle `pending -> processing -> fulfilled` collapsed into `pending -> fulfilled`, and "preparation" as a seller action was never implemented.

### Root cause 2.3 — The preparation computation is also logically wrong

`isProcessing` includes `order.fulfillment_status === 'pending'` — i.e., **the moment an order exists with a pending fulfillment, "Preparation" renders as done ("Colis prepare")**. In reality the seller has not prepared anything. So the timeline shows "Colis prepare" before any action, and then offers no control to act.

### Root cause 2.4 — After label generation, the seller loses ALL manual shipment control

`canFulfill()` (page.tsx:1102-1104) requires `fulfillment_status === 'pending'`. Because `createShipment()` force-sets the fulfillment to `shipped` the moment a carrier label exists, the "Mark shipped" modal button disables permanently. The seller's remaining actions are only Mark-delivered / Cancel / RTO. Combined with symptom 1 (order status stuck), the seller perceives "I can't do anything with this order" — exactly what was reported.

### Recommended fix

Two options (detailed in Guide D):

- **Minimal**: fix the timeline computation (Preparation = current while `fulfillment_status === 'pending'` and payment ok; done when shipped), and surface a "Marquer comme preparee" local action that stores a flag (e.g., `pd_fulfillment.metadata.prepared_at`) via a small new endpoint.
- **Proper**: implement the persisted lifecycle: `pending -> processing` on payment capture (or on seller accept), expose `POST /orders/store/:id/prepare` that flips the seller's fulfillment into a `preparing` state (add to the `pd_fulfillment.status` enum + dashboard badge + `canFulfill` gate), then ship/deliver as today.

---

## Symptom 3 — "Articles de la boutique" displays "Détail des articles indisponible"

### What is displayed

In the order detail drawer, the card "Articles de la boutique" (i18n key `dashboardPages.orders.storeItems`, fr.json line 750) renders `selectedOrder.items` and falls back to "Détail des articles indisponible" (`itemsDetailUnavailable`, fr.json line 609) when the array is empty (page.tsx:3514-3546):

```tsx
{(selectedOrder.items || []).length > 0 ? (
  selectedOrder.items?.map((item) => ( /* thumbnail, title, qty, price */ ))
) : (
  <p ...>{t('dashboardPages.orders.itemsDetailUnavailable')}</p>
)}
```

### Root cause 3.1 — The LIST endpoint does not return items (by design), and two tabs open the drawer with the list row

- `GET /api/pd/orders/store` -> `listByStore()` (order.service.ts:1362-1610) returns order + fulfillment + customer + summary fields — **no `items`, no `seller_note`, no `shipments`, no `refunds`, no `cod_verification`**.
- `GET /api/pd/orders/store/:id` -> `getStoreOrderDetail()` (order.service.ts:919-1055) returns everything via LATERAL joins.
- The **main orders table** opens the drawer with `openOrderDetail(order)` (page.tsx:2786), which sets the list row first, then fetches the detail and replaces it (page.tsx:1596-1617). Correct behavior (with a brief "indisponible" flash while loading, see P2-5).
- The **COD Radar tab** (page.tsx:2972) and the **RTO tab** (page.tsx:3205) do:

```tsx
onClick={() => { setSelectedOrder(order); }}   // <-- list row, no detail fetch
```

The drawer then permanently renders the list row, whose `items` is `undefined` -> "Détail des articles indisponible". The note section, refunds, shipments, and COD verification card are equally empty/stale in these tabs.

**The backend is NOT at fault.** Verification performed: the exact LATERAL items subquery of `getStoreOrderDetail` was replayed against production for 3 order/store pairs and returns the correct items every time (2 items, 4 items, 4 items — see doc 06, section C). `pd_product` columns used (`thumbnail`, `slug`, `weight_grams`, `digital_file_key`) all exist.

### Root cause 3.2 (secondary) — Error fallback also leaves the stale row

`openOrderDetail()` (page.tsx:1596-1617): if the detail fetch fails (network/401 after refresh failure), it sets an error banner but leaves `selectedOrder` as the item-less list row -> the same "indisponible" message plus a drawer full of empty cards. A visible loading skeleton per section (or refusing to open the drawer on failure) would avoid the misleading state.

### Recommended fix

One-line-class fix: change the two `setSelectedOrder(order)` calls (lines 2972 and 3205) to `void openOrderDetail(order)`. Optionally gate the items card on a `loadingOrderDetail` state to avoid the flash. Detailed in Guide D.

---

## Cross-symptom summary

| Symptom | Layer | Root cause | Fix guide |
|---|---|---|---|
| Shipped but status pending | Backend state machine | Label generation + tracking sync mutate fulfillments without order recompute (1.1, 1.2); multi-vendor semantics unexplained (1.3) | Guides A + C |
| Can't change Préparation | Product gap + frontend | No persisted preparation state; dead `processing` enum; wrong timeline computation; fulfill button disabled after label generation (2.1-2.4) | Guide D |
| Articles indisponible | Frontend data flow | COD Radar & RTO tabs open drawer with list row that lacks `items` (3.1); error fallback keeps stale row (3.2) | Guide D |
