# 08 — Master TODO Checklist (unified, all three audits merged)

Prioritized phases; order matters within each phase. Tick as you go. Acceptance criteria per phase; full Definition of Done at the end.

> **IMPLEMENTATION STATUS — 2026-08-30** (commits `9f04805`, `4aadb86`, both deployed live on Render + auto-deployed on Vercel):
> Phase 1 (all items except 1.9 backfill), Phase 2 (2.1-2.3), Phase 4 (4.1-4.3, 4.6, 4.7, partial 4.5 multi-vendor hint), and Phase 5.4 are **DONE** — all gates green (backend: 133 files / 1565 tests; frontend: 68 files / 572 tests; both `tsc --noEmit` clean; eslint 0 errors). The implementation extracted the shared state machine into `backend/src/services/order-fulfillment-shared.ts` (avoids order↔shipping circular import) and added `backend/src/__tests__/order-status-sync.test.ts` (8 tests). Post-deploy census (2026-08-30): the only remaining desync rows are the 5 pre-existing ones awaiting the 1.9/0.5 backfill decision — no new desyncs possible via any code path. **Remaining: Phase 3 (blocked on the 0.5 business decisions), 1.9 backfill, 2.4 smoke, 4.4/4.5 rest, 4.8-4.10, Phase 5 leftovers.**

---

## Phase 0 — Safety net (before touching anything)

- [ ] **0.1** Snapshot/backup production order-domain tables: `pd_order`, `pd_order_item`, `pd_fulfillment`, `pd_shipment`, `pd_shipment_event`, `pd_store_order_refund`, `pd_cod_verification`, `pd_courier_settlement`, `pd_wallet_transaction`, `pd_payment_attempt`, `pd_payment_event`.
- [ ] **0.2** Record baseline results of the census queries (doc 06 §6, queries 1-5).
- [ ] **0.3** Confirm local gates: `npm run lint -w backend`, `npm run lint -w frontend`, `npx tsc --noEmit` (frontend/), `npm test -w backend`, `npm test -w frontend`.
- [ ] **0.4** Parallel-agent coordination: announce ownership of hot files (order.service.ts, shipping.service.ts, order.route.ts, seller.route.ts, order.subscriber.ts, orders/page.tsx) before editing; re-read files immediately before every write.
- [ ] **0.5** **Business decisions to obtain from the owner BEFORE Phase 3:**
  - [ ] Shipping-fee wallet policy: credit `net_items + shipping` vs platform revenue (Guide J).
  - [ ] Refund debit policy: net vs gross + commission recovery (Guide F step 2).
  - [ ] Refund approval threshold default (Guide F step 3).
  - [ ] Backfill resolution for the two stuck COD orders `...vCzt4t3H` / `...kB2SykvE` (capture+credit vs cancel+restock) and any query-2 rows.

---

## Phase 1 — Backend state machine centralization (fixes the desync class)

- [x] **1.1** [P0-1] Add `syncOrderStatusFromFulfillments(executor, orderId, opts)` to `OrderService` (Guide A step 1; canonical rules incl. derived `processing` once Guide D lands). *(done: shared module `order-fulfillment-shared.ts` + delegating method, `9f04805`)*
- [x] **1.2** [P0-1] Wire the helper in-transaction into: `fulfill()`, `createShipment()`, `persistTrackingResult()`, `cancelStoreFulfillment()`, `markStoreFulfillmentDelivered()` (replace ad-hoc blocks), `markStoreFulfillmentRto()` (Guide A step 2). *(done incl. `cancelShipment()`, `9f04805`)*
- [x] **1.3** [P1-4] `fulfill()`: transactional + `COALESCE` carrier/tracking (no NULL overwrite); same atomicity treatment in the shipping layer (Guide A step 3). *(done — `createShipment` writes are now one transaction, `9f04805`)*
- [x] **1.4** [P0-1 money] Guide C: extract `captureCodIfDelivered`; invoke from `persistTrackingResult` on carrier `delivered` (+ ads recognition + PAYMENT_CAPTURED post-commit); restock + settlement-dispute on carrier `returned/cancelled`. *(done — inlined in `persistTrackingResult` with post-commit emissions, `9f04805`)*
- [x] **1.5** [P1-1] Guide G RTO hardening: `status='shipped'` guard, `restoreOrderItemStock`, serial freeing, settlement → `disputed`, reason-aware COD-verification status, order recompute. *(done, `9f04805`)*
- [x] **1.6** [P0-4] Guide E: guard whole-order `cancel()` on fulfillment state (409 when any shipped/delivered); cancel fulfillments atomically when allowed. *(done, `9f04805`)*
- [x] **1.7** [P1-6] Tighten `markPaidInTransaction`'s `fulfilled` jump (require ≥1 shipped/delivered fulfillment; keep digital-only completion). *(done — also respects delivered, `9f04805`)*
- [x] **1.8** Backend tests: single-store label → `fulfilled`; carrier `delivered` → `delivered` + COD captured; two-store partial → untouched; refunded never resurrected; cancel-blocked-post-ship; RTO guards; markPaid jump. *(done — `order-status-sync.test.ts`, 8 tests, `4aadb86`)*
- [ ] **1.9** Data backfill after deploy (Guide A step 5) with owner sign-off per 0.5. *(**BLOCKED on owner decision** — the 5 pre-existing desync rows persist until backfill)*

**Phase 1 acceptance**: census queries 1-3 return zero unexpected rows; manual E2E: COD order → label → simulate carrier `delivered` → order `delivered`, payment `captured`, wallet credited, settlement updated.

---

## Phase 2 — Revive the dead event pipeline

- [x] **2.1** [P0-2] Emit `ORDER_PLACED` post-checkout-commit (skip replays; fire-and-forget with error logging) — Guide B step 1. *(done — both checkout routes, `9f04805`)*
- [x] **2.2** [P0-3] Emit `ORDER_FULFILLED` `{order_id, carrier, tracking_number}` from manual ship + Guide A helper on pending→shipped; per-fulfillment idempotency guard — Guide B step 2. *(done — all 3 ship paths with prev-status detection, `9f04805`)*
- [x] **2.3** [P1-3] Guide H: `buildOrderUrl()` tenant-aware; replace the 4 hardcoded `pandamarket.tn` sites in order.subscriber.ts. *(done — `FRONTEND_URL`/platform-setting based, custom-domain/subdomain aware, correct `/account/orders` storefront path, `9f04805`)*
- [ ] **2.4** Smoke-verify the full subscriber chain (email queue, WhatsApp, notifications, socket, `pd_webhook_delivery`). *(needs a live test order — can run with owner)*

**Phase 2 acceptance**: test order → customer confirmation (email+WhatsApp+in-app) + vendor alert + webhook delivery; ship → buyer "Commande expédiée" with tracking; exactly once per fulfillment.

---

## Phase 3 — Money & inventory integrity (after 0.5 decisions)

- [ ] **3.1** [P0-6] Guide J: shipping fee in wallet credit per decided policy; update description strings; run the shipping-credit audit query for reconciliation of historical orders.
- [ ] **3.2** [P0-5] Guide F step 1: refunded-lines ledger (`refunded_items`), once-per-unit restock via `restoreOrderItemStock`, variant/bundle/serial aware.
- [ ] **3.3** [P0-5] Guide F step 2: commission-aware refund debit per decided policy.
- [ ] **3.4** [P1-5] Guide F step 3: approval threshold + `awaiting_admin` + admin notification + `pd_audit_log`; add reject/approve endpoints.
- [ ] **3.5** [P1-2, P2-16] Guide I: OTP hardening (hash, expiry, attempts, rate limit, real SMS/WhatsApp dispatch, neutral UI message, migration).
- [ ] **3.6** Data remediation: double-restock orders (query 4), negative wallets, historical shipping-credit delta — correct with owner sign-off.

**Phase 3 acceptance**: shipped order not cancellable by buyer (409); two partial refunds restock each refunded unit exactly once; Free-plan full refund leaves wallet at pre-sale value (per policy); OTP never in response/logs; wallet credit = items+shipping per policy.

---

## Phase 4 — Seller dashboard (symptoms 2 & 3 + presentation)

- [x] **4.1** [Symptom 3] COD Radar + RTO tabs → `void openOrderDetail(order)` (page.tsx:2972, 3205) — Guide D step 1. *(done, `4aadb86`)*
- [x] **4.2** [P2-5] Drawer loading skeleton + distinct load-error state with retry — Guide D step 2. *(done — `detailLoadFailed` state + retry button, `4aadb86`)*
- [x] **4.3** [P2-1] Timeline Préparation: current while pending; done on preparing/shipped/delivered — Guide D step 3. *(done — no more auto-done at creation, `4aadb86`)*
- [ ] **4.4** [Symptom 2] Persisted preparation: `POST /store/:id/prepare` fulfillment-level `'preparing'` + button + labels + filter/counter updates + gating accepts preparing (Guide D step 4; resolved design). *(not started — the timeline display is now honest; the persisted state is a feature decision)*
- [ ] **4.5** [P1-7, P2-8] Guide K: `getStoreOrderStatus` primary badge, master status secondary, multi-vendor hint (backend `other_pending_stores` field), interim "Confirmée" label. *(PARTIAL — multi-vendor hint done incl. backend field + i18n fr/en/ar, `4aadb86`; store-scoped primary badge + interim label not done)*
- [x] **4.6** [P2-2] `fulfillmentColor('delivered')` → green. *(done, `4aadb86`)*
- [x] **4.7** [P2-4] Delete duplicate `OrderItem` interface; `tsc --noEmit` clean. *(done, `4aadb86`)*
- [ ] **4.8** [P2-9] CSV export & bulk print fetch details first (or rely on list-items contract, 5.2).
- [ ] **4.9** [P2-3] i18n the COD/RTO/drawer hardcoded French blocks (fr/en/ar).
- [ ] **4.10** [P2-6, P2-7] COD risk computed server-side for list rows; seller-facing COD label.

**Phase 4 acceptance**: drawer from every entry point shows items; timeline honest; preparation action persists and appears in DB + UI; multi-vendor hint visible; `tsc` clean.

---

## Phase 5 — Hygiene, tests, monitoring, deployment

- [ ] **5.1** [P2-12] Cancelled-label regeneration in `createStoreShipment`.
- [ ] **5.2** [P2-9/P2-19] listByStore items LATERAL (payload-capped) + convert `seller-orders.test.ts` to real-SQL integration test.
- [ ] **5.3** [P2-13] Deprecate/alias duplicate fulfill endpoint; unify `carrier` param; fix response body.
- [x] **5.4** [P2-15] Fix invalid status literals (`'paid'`, `'shipped'`, `'completed'`) in the 4 queries. *(done — buyer-interest, store-subscription, seller-broadcast, analytics incl. GMV filters, `4aadb86`)*
- [ ] **5.5** [P2-10] Shipment status chips i18n.
- [ ] **5.6** [P2-14] Revisit summary counters/filters with the final status semantics.
- [ ] **5.7** Consider routing the two order events through the outbox pattern for guaranteed delivery.
- [ ] **5.8** Set up monitoring alerts (doc 09 §C).
- [ ] **5.9** Full audit re-run: census queries all clean; verification matrix (doc 07) fully green.
- [ ] **5.10** Git protocol: review `git status`/`git diff`; **commit & push to `github/main` only with explicit owner confirmation**; verify Render deploy (`srv-d9qjrth42hec73efhoa0`) and Vercel (`www.garbage.team`); post-deploy smoke order.

---

## Definition of Done (whole remediation)

1. Doc 06 §6 census queries 1-4 → zero unexpected rows; query 5 consistent with the decided policy.
2. E2E verified: marketplace checkout (confirmations arrive) → label ship (order promoted + buyer notified) → carrier delivered COD (captured + wallet credited) → buyer cancel blocked post-ship → two partial refunds restock once.
3. All three owner-reported symptoms verified fixed **in the live dashboard by the owner**.
4. `npm run lint` + `npx tsc --noEmit` + `npm test` (both workspaces) green.
5. Deployed and smoke-tested on Render + Vercel; monitoring alerts active.
