# 09 — QA: Reproduction, Verification & Monitoring (merged)

Merges Audit A's verification matrix, Audit B's pre-fix reproduction + post-fix acceptance checklists, and the census SQL from doc 06. Backend: `https://pandamarket-backend-fjom.onrender.com` · Frontend: seller Hub → Dashboard → Commandes (`www.garbage.team`).

---

## A. Pre-fix reproduction (use to confirm each bug on the current build — all deterministic)

### Symptom 1 — Status stuck "En attente" after expedition
- [ ] Online-gateway order: status "En attente" → capture payment → **still** "En attente" (`pd_order.status` stays `pending`).
- [ ] Click **Générer l'étiquette** → Expédition column "Expédiée", Statut column "En attente". → BUG
- [ ] DB: `pd_fulfillment.status='shipped'`, `pd_shipment` row exists, `pd_order.status='pending'`. → BUG
- [ ] (Carrier configured) tracking sync reports `delivered`: fulfillment "Livrée", order **still** `pending`; no seller button can repair it (`canMarkDelivered` false). → BUG (worst case)
- [ ] Multi-store: store A "Marquer expédiée" → order stays "En attente" for both sellers with no explanation. → UX gap
- [ ] COD order: "Paiement requis" persists after label even though nothing is awaited from the buyer.

### Symptom 2 — "Préparation" cannot be changed
- [ ] Fresh order drawer: timeline "Préparation" already **"Colis préparé"** although nobody acted. → BUG
- [ ] No control anywhere to set/advance/revert preparation (only label / ship / deliver / cancel). → missing capability
- [ ] Network tab: no request fires that could set a preparation state. → confirms missing endpoint
- [ ] DB: no row ever has `processing`/preparation state. → dead state
- [ ] After label generation: "Marquer expédiée" button gone (fulfillment no longer `pending`). → control loss

### Symptom 3 — "Détail des articles indisponible"
- [ ] Open an order from the **COD** tab (order-number button): items section shows the fallback. → BUG (100%)
- [ ] Open from the **RTO** tab ("Voir Fiche"): same. → BUG (100%)
- [ ] Same order from the main table: items display correctly (detail fetch works).
- [ ] Print invoice/delivery slip from a COD-tab entry: items row shows "Détail des articles indisponible". → BUG
- [ ] Block `GET /api/pd/orders/store/:id` (devtools) and open from the main table: section shows "indisponible" instead of a load-error state. → UX defect
- [ ] DB: `pd_order_item` rows exist for the order/store. → proves read-path bug

### Dead events
- [ ] Ship an order (either path) with a buyer that has email/phone: no in-app "Commande expédiée", no `order_shipped` email, no WhatsApp. → BUG
- [ ] Place an order: no customer confirmation, no vendor "Nouvelle commande", no webhook delivery row. → BUG

### Money (DB-level)
- [ ] Compare `pd_wallet_transaction(type='sale')` amount vs `SUM(items.subtotal) − commission` for a captured order: shipping absent from the credit. → P0-6
- [ ] Process two partial refunds on one order: inventory incremented twice in full. → P0-5
- [ ] Free-plan vendor full refund: wallet goes negative by the commission amount. → P0-5

---

## B. Post-fix acceptance (each box must PASS after its phase)

### After Phase 1 (state machine)
- [ ] Single-store label → `pd_order.status='fulfilled'`; UI Statut "Expédiée".
- [ ] Carrier sync `delivered` → order `delivered` automatically, without manual proof.
- [ ] COD carrier-delivered → `payment_status='captured'`, `PAYMENT_CAPTURED` emitted, wallet credited, settlement updated.
- [ ] Two-store: A shipped, B pending → order **not** `fulfilled`; B keeps buttons; hint visible (after 4.5).
- [ ] `cancelled`/`refunded` orders never overwritten by the recompute.
- [ ] Manual "Marquer expédiée" still works, idempotent, and no longer NULLs carrier/tracking on empty submit.
- [ ] RTO rejected on `delivered` fulfillments; single-RTO restock once; settlement `disputed`.
- [ ] Buyer cancel on shipped order → 409.

### After Phase 2 (events)
- [ ] Exactly one buyer shipment notification set (in-app + email + WhatsApp) per fulfillment shipment; no duplicates on path races.
- [ ] Order placement triggers customer confirmation + vendor alert + webhook delivery; `orders_created` metric increments.

### After Phase 3 (money)
- [ ] Wallet credit = `net_items + shipping` (per decided policy) — verify with doc 06 §6 query 5.
- [ ] Two 30% partial refunds → inventory restocked exactly once, only for refunded quantities/lines.
- [ ] Refund above threshold → `awaiting_admin` + admin notified + audit log entry.
- [ ] OTP: not in response, not in logs, expires, rate-limited; verification requires the real customer-entered code.

### After Phase 4 (dashboard)
- [ ] Drawer shows items from ALL entry points (main, COD, RTO, post-bulk-fulfill).
- [ ] Detail-fetch failure → explicit "Impossible de charger les articles" + retry.
- [ ] Fresh order timeline: "En attente de préparation" (not "Colis préparé").
- [ ] "Commencer la préparation" visible on pending; persists; rejected after shipment; label/ship still work from prepared state.
- [ ] Store-scoped status is the primary badge; master status secondary; "En attente de N autre(s) boutique(s)" hint on multi-vendor orders.
- [ ] Delivered fulfillment badge is green; shipment chips translated; `tsc --noEmit` clean.

### Regression sweep (every PR)
- [ ] Backend vitest: order.service / seller-orders / checkout-concurrency / payment.* / refund-pipeline / carrier-adapter suites.
- [ ] Frontend vitest: orders page + i18n snapshots.
- [ ] Manual happy paths: online (order → pay → prepare → label → sync delivered → wallet credit) and COD (order → COD confirm → label → deliver with proof → captured → wallet credit).
- [ ] Wallet: exactly one `sale` credit per order; commission + retention correct per gateway.

---

## C. Monitoring alerts (post-deployment, Audit B §C extended)

1. Orders with `fulfillment_status='delivered'` but `pd_order.status NOT IN ('delivered','refunded')` for >24h → propagation regression.
2. `pd_shipment.status='delivered'` with no `pd_wallet_transaction type='sale'` after the COD settlement window → missed COD capture.
3. `pd_store_order_refund` processed count per store per day (spike = F-5/F-6 abuse while controls were pending).
4. Wallet transactions where debit > credited sale for the same order (refund asymmetry regression).
5. Emission lag: orders created in the last hour vs `ORDER_PLACED`-driven notification count (dead-event regression).
6. Census queries (doc 06 §6) as a scheduled job with non-zero-row alerts.

---

## D. Deployment protocol (per REMOTE_CREDENTIALS.md)

1. Owner confirms commit + push to `github/main` (explicit confirmation required — never auto-push).
2. Render: auto-deploys from main; verify via `GET https://api.render.com/v1/services/srv-d9qjrth42hec73efhoa0/deploys` (expect the new commit, status `live`); manual trigger available with the API key if needed.
3. Vercel: auto-deploys; verify the frontend preview/production alias.
4. Post-deploy smoke: health endpoint, one live test order through the full E2E, census queries clean.
