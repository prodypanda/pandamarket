# 08 — Master TODO Checklist

Prioritized, actionable, verifiable. Each item links to the implementation guide in doc 09.
Order of execution matters within each phase. Tick boxes as you go.

---

## Phase 0 — Safety net (before touching anything)

- [ ] **0.1** Snapshot production DB (at minimum the order-domain tables: `pd_order`, `pd_order_item`, `pd_fulfillment`, `pd_shipment`, `pd_shipment_event`, `pd_store_order_refund`, `pd_cod_verification`, `pd_courier_settlement`, `pd_wallet_transaction`).
- [ ] **0.2** Record baseline from doc 06 queries G.1-G.4 (screenshot / save results) for before/after comparison.
- [ ] **0.3** Confirm CI gates available locally: `npm run lint -w backend`, `npm run lint -w frontend`, `npm run type-check -w frontend` (or `npx tsc --noEmit` in frontend/), `npm run test -w backend`, `npm run test -w frontend`.
- [ ] **0.4** Coordinate with parallel agents: this workspace is shared — announce the order-domain files you will touch (order.service.ts, shipping.service.ts, orders/page.tsx, order.subscriber.ts) before editing.

---

## Phase 1 — Backend state machine centralization (fixes the desync class)

- [ ] **1.1** [P0-3] Add `syncOrderStatusFromFulfillments(executor, orderId)` private helper to `orderService` implementing the canonical state machine (doc 05 §13). — *Guide A, step 1*
- [ ] **1.2** [P0-3] Call it (in-transaction) from: `fulfill()`, `createShipment()` (needs to run in the caller's transaction or its own + document), `persistTrackingResult()`, `cancelStoreFulfillment()`, `markStoreFulfillmentRto()`. Replace the ad-hoc recompute blocks in `fulfill`/`cancelStoreFulfillment`. — *Guide A, step 2*
- [ ] **1.3** [P1-4] Make `fulfill()` transactional and stop NULL-overwriting carrier/tracking (`COALESCE` or conditional SET). — *Guide A, step 3*
- [ ] **1.4** [P0-3/Guide C] Factor the COD-capture tail of `markStoreFulfillmentDelivered` (capture + PAYMENT_CAPTURED + ads recognition) into a reusable method; invoke from `persistTrackingResult` when a COD fulfillment transitions to `delivered`. Also restock on carrier `returned`/`cancelled`. — *Guide C*
- [ ] **1.5** [P1-1] RTO hardening: `AND status IN ('shipped')` guard, reuse `restoreOrderItemStock`, free serial keys, mark courier settlement `disputed`, recompute order status (via 1.1), conditional COD-verification status by reason. — *Guide G*
- [ ] **1.6** Data backfill (one-off SQL, after code deploy): promote the stuck Aug-15 orders (`...vCzt4t3H`, `...kB2SykvE`) and any query-G.2 rows to correct statuses; decide business resolution for their COD payment (deliver-confirm -> capture, or cancel+restock). — *Guide A, step 5*

**Verify (Phase 1)**: doc 06 queries G.1, G.2, G.3 return empty (or business-accepted) rows; manual E2E: COD order -> label -> simulate carrier `delivered` webhook -> order `delivered`, payment `captured`, wallet credited, settlement updated.

---

## Phase 2 — Revive the dead event pipeline

- [ ] **2.1** [P0-1] Emit `ORDER_PLACED` after successful checkout commit (route level, after `orderService.checkout` resolves; include `order_id`). — *Guide B, step 1*
- [ ] **2.2** [P0-2] Emit `ORDER_FULFILLED` with `{ order_id, carrier, tracking_number }` from `fulfill()` AND from the 1.1 helper on pending->shipped transitions. — *Guide B, step 2*
- [ ] **2.3** [P1-3] Fix hardcoded `pandamarket.tn` URLs in `order.subscriber.ts` (lines 109-110, 133-135, 420) via a tenant-aware `buildOrderUrl()` (custom domain -> subdomain -> platform base). — *Guide H*
- [ ] **2.4** Smoke-verify subscriber side: order email queued (`emailQueue`), WhatsApp dispatch attempted, vendor notification + socket `new_order`, webhook delivery row created for subscribed stores.

**Verify (Phase 2)**: place a test order -> customer email/WhatsApp/notification + vendor notification appear; ship it -> customer "Commande expédiée" notification with tracking; vendor webhook endpoint (if configured) receives both events.

---

## Phase 3 — Safety fixes (money & inventory)

- [ ] **3.1** [P0-4] Guard whole-order `cancel()` on fulfillment state (copy the `cancelUnstartedPaymentOrder` pattern): reject if any fulfillment `shipped`/`delivered`; when allowed, also cancel fulfillments atomically. — *Guide E*
- [ ] **3.2** [P0-5] Refund restock correctness: restock exactly once per unit refunded (track restocked amounts), reuse `restoreOrderItemStock` (variants + bundles), free serial keys for refunded serial items. — *Guide F, step 1*
- [ ] **3.3** [P0-5] Refund wallet debit: commission-aware (debit net, or debit gross + commission-recovery transaction) — pick policy with owner. — *Guide F, step 2*
- [ ] **3.4** [P1-2] OTP hardening: remove OTP from response/logs, hash at rest, expiry (10 min), attempt limit, rate-limit send endpoint; integrate real SMS/WhatsApp dispatch. — *Guide I*
- [ ] **3.5** Data remediation: identify orders affected by double-restock (query G.4 + inventory audit) and negative vendor wallets; correct with owner sign-off.

**Verify (Phase 3)**: shipped order cannot be cancelled by buyer (409); two partial refunds restock each unit exactly once; Free-plan vendor full refund leaves wallet at its pre-sale value (or the agreed policy); OTP never appears in API response or logs.

---

## Phase 4 — Seller dashboard fixes (symptoms 2 & 3)

- [ ] **4.1** [Symptom 3] COD Radar tab + RTO tab: replace `setSelectedOrder(order)` (page.tsx:2972, 3205) with `void openOrderDetail(order)`. — *Guide D, step 1*
- [ ] **4.2** [P2-5] Gate the items card (and note/refunds/shipments cards) on `loadingOrderDetail` — skeleton instead of "Détail des articles indisponible" flash; on fetch error show retry instead of stale row. — *Guide D, step 2*
- [ ] **4.3** [P2-1] Fix `buildOrderTimeline` Préparation logic: current while `fulfillment_status === 'pending'` (and payment ok), done once shipped. — *Guide D, step 3*
- [ ] **4.4** [Symptom 2, optional full feature] Persisted preparation state: decide minimal (fulfillment metadata `prepared_at` + `POST /store/:id/prepare`) vs full (`preparing` enum state + badge + gates). Implement chosen option. — *Guide D, step 4*
- [ ] **4.5** [P2-2] Fix `fulfillmentColor('delivered')` -> green.
- [ ] **4.6** [P2-10] Multi-vendor hint: "En attente de N autre(s) boutique(s)" subtitle on status badge + timeline note (order rows expose `open_report_count`-style extra field or compute client-side from a small `pending_siblings` count added to `listByStore`).
- [ ] **4.7** [P2-4] Delete duplicate `OrderItem` interface (page.tsx:140-148); run `tsc --noEmit`.
- [ ] **4.8** [P2-9] CSV export & bulk print: fetch details for selected orders before generating documents.
- [ ] **4.9** [P2-3] i18n the COD Radar / RTO / COD drawer hardcoded French blocks (move to fr/en/ar message files).
- [ ] **4.10** [P2-6/P2-7] COD risk score: compute server-side for COD list rows; adjust seller-facing label for COD `payment_required`.

**Verify (Phase 4)**: open an order from COD Radar tab -> items visible; timeline shows Préparation as current on a fresh order; delivered fulfillment badge is green; multi-vendor order shows the waiting-on hint; `npx tsc --noEmit` clean.

---

## Phase 5 — Polish & hardening (non-blocking)

- [ ] **5.1** [P2-8] OTP send rate limit (per order+store) + `otp_expires_at` column (if not done in 3.4).
- [ ] **5.2** Consider routing ORDER_PLACED/ORDER_FULFILLED through the existing outbox pattern for guaranteed delivery (workers already run).
- [ ] **5.3** Refund lifecycle: add reject/approve endpoints + customer-facing refund status visibility.
- [ ] **5.4** `getStoreOrderDetail` short-TTL cache for the drawer (optional).
- [ ] **5.5** Post-fix full audit re-run: execute doc 06 §G queries; all must be clean.

---

## Definition of Done (whole audit)

1. Doc 06 §G queries 1-3 return zero unexpected rows.
2. E2E happy paths verified for: marketplace checkout (email+WhatsApp+vendor notify), carrier-label ship (order promoted + customer notified), carrier delivered (COD captured + wallet credited), buyer cancel blocked post-ship, two-partial-refund restock correctness.
3. All three owner-reported symptoms verified fixed in the live dashboard by the owner.
4. `npm run lint` + `npm run type-check` + `npm run test` (both workspaces) green.
5. Production deploy + post-deploy smoke (Render deploys from the same commit; Vercel auto-deploys).
