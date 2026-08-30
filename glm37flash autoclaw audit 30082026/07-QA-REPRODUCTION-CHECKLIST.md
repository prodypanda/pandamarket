# 07 — QA: Reproduction & Verification Checklists

Use the pre-fix lists to reproduce all three bugs on the current build; re-run them as the post-fix acceptance list after each fix lands. Backend: `https://pandamarket-backend-fjom.onrender.com` · Frontend: seller Hub → Dashboard → Commandes.

## A. Pre-fix reproduction (expected: every box confirms the bug)

### Bug #1 — Status stuck at "En attente" after expédition
- [ ] Create an order paid with an online gateway (Flouci/Konnect/PayPal). Seller list shows Statut = "En attente".
- [ ] Capture/confirm payment. Statut **still** "En attente" (`pd_order.status` stays `pending`).
- [ ] Click **Générer l'étiquette**. Expédition column = "Expédiée", Statut column = "En attente". → BUG
- [ ] DB check: `pd_fulfillment.status='shipped'`, `pd_shipment` row exists, `pd_order.status='pending'`. → BUG
- [ ] (If carrier integration configured) let tracking sync report `delivered`: fulfillment = "Livrée", `pd_order.status` **still** `pending`; no seller button can repair it. → BUG (worst case)
- [ ] Multi-store: order with items from two stores; store A "Marquer expédiée" → order status stays "En attente" for both sellers. → expected aggregate, but unexplained in UI

### Bug #2 — "Préparation" cannot be changed
- [ ] Open any fresh order drawer: timeline "Préparation" already shows **"Colis préparé"** although nobody acted. → BUG
- [ ] Search the drawer for any control to set/advance/revert "Préparation": none exists (only Générer l'étiquette / Marquer expédiée / Marquer comme livrée / Annuler). → BUG
- [ ] Network tab: no request fires that could set a preparation state. → confirms missing endpoint
- [ ] DB check: no `pd_order` or `pd_fulfillment` row ever has `processing`/preparation state. → confirms dead state

### Bug #3 — "Détail des articles indisponible"
- [ ] Open an order from the **COD** tab (order number button). "Articles de la boutique" = "Détail des articles indisponible". → BUG (100% of the time)
- [ ] Open an order from the **RTO** tab via "Voir Fiche". Same empty section. → BUG (100%)
- [ ] Open the same order from the main table. Items display correctly (detail fetch path works).
- [ ] Print invoice / bon-livraison from a COD-tab entry: items row shows "Détail des articles indisponible". → BUG
- [ ] Block `GET /api/pd/orders/store/:id` (devtools → block request URL), open from the main table: section shows "indisponible" instead of a load-error state. → UX defect
- [ ] DB check: `pd_order_item` rows exist for the order/store. → proves it's a read-path bug, not missing data

### F-1 — No shipment notification
- [ ] Ship an order (either path) with a buyer account that has email/phone: no in-app "Commande expédiée", no `order_shipped` email, no WhatsApp tracking message. → BUG

## B. Post-fix acceptance (each box must PASS)

### After P0-1 (status propagation)
- [ ] Single-store order: generate label → `pd_order.status='fulfilled'`; UI Statut = "Expédiée".
- [ ] Carrier sync `delivered` → `pd_order.status='delivered'` automatically, without manual proof.
- [ ] Two-store order: A shipped, B pending → order status **not** `fulfilled`; B keeps its buttons.
- [ ] `cancelled`/`refunded` orders are never overwritten by the recompute.
- [ ] Manual "Marquer expédiée" path still works and remains idempotent.

### After P0-2 (ORDER_FULFILLED)
- [ ] Buyer receives exactly one shipment notification (in-app + email + WhatsApp) per fulfillment shipment.
- [ ] No duplicate notification when the label path and manual path race.

### After P1-1 (preparation) — only if Option A implemented
- [ ] Fresh order timeline: "En attente de préparation" (not "Colis préparé").
- [ ] "Marquer comme préparée" visible on `pending` fulfillment; persists a real state; rejected after shipment.
- [ ] Timeline step reflects stored state; label/ship flows unaffected.

### After P1-2 (items)
- [ ] Drawer shows items from all entry points: main table, COD tab, RTO tab, after bulk fulfill.
- [ ] Detail-fetch failure → explicit "Impossible de charger les articles" + retry (not "indisponible").
- [ ] Printed invoice/bon-livraison include items from COD/RTO entries.
- [ ] List payload still performant with items aggregation (spot-check 100-row page load).

### Regression sweep (every PR)
- [ ] `backend`: `vitest run` — especially `order.service.test.ts`, `seller-orders.test.ts`, `checkout-concurrency.test.ts`, `payment.*.test.ts`, `refund-pipeline.test.ts`, `carrier-adapter.test.ts`.
- [ ] `frontend`: `vitest run` — orders page + i18n snapshot tests.
- [ ] Manual: complete happy path (online order → pay → prepare → label → sync delivered → wallet credit visible) and COD path (order → COD confirm → label → deliver with proof → COD captured → wallet credit).
- [ ] Wallet: one `sale` credit per order only (duplicate guard), commission and retention correct per gateway.

## C. Monitoring ideas after deployment

- Alert on orders where `fulfillment_status='delivered'` but `pd_order.status NOT IN ('delivered','refunded')` for > 24h (detects propagation regressions).
- Alert on `pd_shipment.status='delivered'` with no `pd_wallet_transaction type='sale'` after COD settlement window (detects missed COD capture).
- Count of `pd_store_order_refund` processed per store per day (flags F-5/F-6 abuse while permanent controls are pending).
