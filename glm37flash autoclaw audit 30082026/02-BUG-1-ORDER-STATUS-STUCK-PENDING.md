# 02 — Bug #1: Expedition shows "Expédiée" but order status stays "En attente" (pending)

**Severity: High (seller-facing correctness + buyer-facing consistency)**
**Status at commit `7141e9f`: reproduced from code, deterministic.**

---

## 1. Symptom

In the seller dashboard (`Hub → Dashboard → Commandes`):

- The **Expédition** column shows **"Expédiée"** (purple chip) — driven by `pd_fulfillment.status = 'shipped'`.
- The **Statut** column still shows **"En attente"** (yellow chip) — driven by `pd_order.status = 'pending'` (or "Paiement requis" for COD).
- The mismatch persists until delivery is manually recorded; in the carrier-sync case it can persist **forever**.

## 2. Reproduction (no code changes needed)

**Case A — online payment (Flouci/Konnect/PayPal):**
1. Buyer checks out with an online gateway → `pd_order.status='pending'` (creation default, `order.service.ts:669-671`).
2. Payment captured (webhook/return-trip) → `markPaidInTransaction` keeps status `pending` (`order.service.ts:2233`: only `payment_required → pending`; `pending` stays `pending`).
3. Seller clicks **"Générer l'étiquette"** → `POST /api/pd/orders/store/:id/shipments` → `createStoreShipment` → `shippingService.createShipment` sets fulfillment `status='shipped'` (`shipping.service.ts:666`).
4. ✅ Expedition column: "Expédiée". ❌ Status column: "En attente". **Bug visible.**

**Case B — multi-store order:**
1. Order contains items from store A and store B → two fulfillments, both `pending`.
2. Store A uses even the *manual* path ("Marquer expédiée", `POST /orders/:id/fulfill` → `fulfill()`).
3. `fulfill()` bumps the order only when **zero** pending fulfillments remain (`order.service.ts:1637-1644`); store B is still pending → order stays `pending`. Store A's seller sees "Expédiée" + "En attente".

**Case C — carrier-synced delivery (worst variant):**
1. Label created (fulfillment `shipped`, order untouched).
2. Carrier webhook / BullMQ sweep reports `delivered` → `persistTrackingResult` sets fulfillment `delivered` (`shipping.service.ts:858-897`) — **order still never updated**.
3. Order remains "En attente" even though the parcel was delivered. Only a manual `POST /orders/:id/deliver` (delivery proof) would fix it, and that button disappears once fulfillment is `delivered` (`canMarkDelivered` requires `fulfillment_status === 'shipped'`, `page.tsx:1106-1108`) — so in the pure-sync scenario **no UI action can ever repair the order status**.

## 3. Root-cause chain (evidence)

| Step | Fact | Evidence |
|------|------|----------|
| 1 | Label path flips fulfillment only | `shipping.service.ts:665-670`: `UPDATE pd_fulfillment SET tracking_number=$2, carrier=$3, status='shipped', shipped_at=COALESCE(shipped_at,NOW()) …` — no `pd_order` statement in the function |
| 2 | `createStoreShipment` likewise only stamps carrier/tracking on the fulfillment | `order.service.ts:1235-1242` |
| 3 | Carrier sync / webhooks update shipment + fulfillment only | `shipping.service.ts:858-897` (`persistTrackingResult`) |
| 4 | `processing` never written; paid online orders stay `pending` | writer map in `01-ORDER-ARCHITECTURE-REFERENCE.md` §3 |
| 5 | UI renders the two layers side by side | status column `page.tsx:2755` (`statusLabel`), fulfillment column `page.tsx:2761` (`fulfillmentLabel`); labels: `pending`="En attente", `shipped`="Expédiée" |

## 4. Impact radius

- **Seller UX:** the status column is untrustworthy; `open_orders` counters (`order.service.ts:1540`), store open-order counts (`store.service.ts:1151,1383`) and broadcast eligibility (`seller-broadcast.service.ts:461`) all read `pd_order.status` and misclassify shipped orders.
- **Buyer UX:** `frontend/src/app/hub/orders/page.tsx:46,262-263` renders the same raw status → buyers see "En attente" for paid+shipped orders, while the checkout success page says "en cours de préparation par le vendeur" (`app/hub/checkout/success/page.tsx:198`) and the fulfillment chip says "Expédiée".
- **Analytics:** `analytics.service.ts:1687-1702` ORs statuses, partially masking the issue, but any strict-status consumer inherits the distortion.

## 5. Fix directions (details & sketches in `06-FIX-PLAN-P0-P1-P2.md`)

1. **Propagate aggregate status after every fulfillment mutation** — extract the counting rule already used by `fulfill()` / `markStoreFulfillmentDelivered` into one helper (e.g., `recomputeOrderFulfillmentStatus(orderId, client)`) and call it from: `shippingService.createShipment`, `persistTrackingResult`, `cancelShipment`, `markStoreFulfillmentRto`, in addition to the existing call sites. Rule: no `pending` fulfillments left → `fulfilled`; no active (`pending`/`shipped`) and ≥1 `delivered` → `delivered`; all `cancelled` → `cancelled`.
2. **Emit `ORDER_FULFILLED`** from both ship paths (also fixes F-1, buyer shipment notifications).
3. Optionally demote/clarify the status column label for `pending`+`captured` (e.g., show "Confirmée") until the `processing` state is implemented (Bug #2).

## 6. Why this is safe to fix

The aggregate rule is already implemented twice (in `fulfill()` and `markStoreFulfillmentDelivered`) and is idempotent. Centralizing it adds no new state — it only makes existing writes consistent. No DB migration is required.
