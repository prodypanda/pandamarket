# 03 — Bug #2: The seller cannot change the "Préparation" status

**Severity: High (missing capability + misleading UI)**
**Status at commit `7141e9f`: the "Préparation" state is not implementable by sellers at all — and the timeline lies about it.**

---

## 1. Symptom

In the seller order drawer, the timeline shows:

```
Commande créée → Paiement confirmé → [Préparation] → Expédition → Livraison
```

The "Préparation" step shows **"Colis préparé"** for essentially every order (even brand-new ones nobody touched), and the seller has **no action** to set, advance, or revert a preparation status. Sellers who want to record "package is packed, waiting for pickup" have no way to do so.

## 2. Why it can never change (three independent blockers)

### Blocker 1 — No API endpoint
The complete seller-reachable transition surface (verified in `backend/src/api/order.route.ts` + `seller.route.ts`):

- `POST /orders/:id/fulfill` — fulfillment `pending → shipped`
- `POST /orders/:id/deliver` — fulfillment `shipped → delivered`
- `POST /orders/:id/fulfillment/cancel` — fulfillment `pending → cancelled`
- `POST /store/:id/rto` — shipped → returned/cancelled
- `POST /store/:id/shipments` — label creation (implicitly `pending → shipped`)
- refunds / COD tools / settlements / notes

There is **no** `PATCH …/status` or `POST …/prepare` endpoint. Nothing accepts a target status of `processing`.

### Blocker 2 — No DB writer
`pd_order.status` writer map (see `01` §3): `processing` appears **nowhere** as a write target. A repo-wide search for `SET status = 'processing'` matches only AI jobs (`ai.service.ts:139`) and the outbox worker (`outbox.worker.ts:49`) — never orders. The enum value `OrderStatus.Processing` exists in `packages/types/src/enums.ts` and the UI even maps it to a label (`page.tsx:308`: `processing → "Confirmée"`), but it is unreachable dead state.

### Blocker 3 — The timeline step is derived, not stored
`page.tsx:1129`:
```ts
const isProcessing = ['processing','fulfilled','delivered'].includes(order.status)
                  || ['pending','shipped','delivered'].includes(order.fulfillment_status || '');
```
Every order gets a `pd_fulfillment` row at checkout with `status='pending'` → the second clause is **always true** → `isProcessing === true` → the step renders `timelinePreparationReady` ("Colis préparé") even for untouched orders. The step therefore reflects nothing and cannot be "changed" by any seller action — it is decoration.

## 3. Related dead-end (cross-store edge case)

`canFulfill` / `canCancelSellerFulfillment` additionally require the **order-level** status not to be in `['fulfilled','delivered','cancelled']` (`page.tsx:1102-1111`). The order-level status can be set to `fulfilled` while some *other* store's fulfillment is still `pending` via:

- `markPaidInTransaction` late capture: `WHEN NOT EXISTS (SELECT 1 FROM pd_fulfillment WHERE order_id=$1 AND status='pending') THEN 'fulfilled'` — only fires when no pending fulfillments exist, **but** a subsequent store-scope event chain (`cancelStoreFulfillment` aggregates, `order.service.ts:1830-1839`) can also set `fulfilled`/`delivered` from counts;
- in those states a `pending` fulfillment loses both its **Marquer expédiée** and **Annuler l'expédition** buttons with no server-side way to recover.

Rare (multi-store + late capture/cancel interleavings) but a hard dead-end when it hits.

## 4. What "fixing" means — two coherent options

### Option A (recommended): implement preparation for real
1. Add `POST /api/pd/orders/store/:id/prepare` (or a guarded `PATCH /store/:id/status` accepting only `processing`) → sets the **fulfillment**-level state (new `pd_fulfillment.status='preparing'` *or* reuse `pd_order.status='processing'` order-wide when all stores are preparing).
   - Simplest consistent model: keep the transition on the fulfillment layer with statuses `pending → preparing → shipped → delivered`, and derive the order aggregate exactly like the shipping propagation fix (Bug #1). This requires a small migration (`ALTER TABLE pd_fulfillment …` or reuse of `pd_order.status='processing'` with a per-store count rule).
2. Add a seller button **"Marquer comme préparée"** visible when `fulfillment_status === 'pending'`, and make the timeline step read real state.
3. Fix `isProcessing` to stop treating `fulfillment_status='pending'` as prepared (F-4).

### Option B (minimal): remove the fake step
Delete the "Préparation" step from `buildOrderTimeline` (or rename it to a passive "Traitement" that shows gateway/payment state). Zero backend work; removes the lie; sellers keep the two real controls (label / mark shipped).

**Do not** keep the current middle ground: a step that claims "Colis préparé" with no producer of that fact.

## 5. Test plan (post-fix)

- New order → timeline shows "En attente de préparation" (not "Colis préparé").
- Seller marks prepared → step turns done; `pd_order.status`/`pd_fulfillment.status` reflects it; label & ship flows still work from the prepared state.
- Regression: `backend/src/__tests__/seller-orders.test.ts`, plus new test asserting the prepare endpoint's auth (store-scoped) and transition guards (only from `pending`).
