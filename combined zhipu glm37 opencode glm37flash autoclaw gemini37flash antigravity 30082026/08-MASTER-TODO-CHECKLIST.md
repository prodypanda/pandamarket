# 08 — Master TODO Checklist (unified, all three audits merged)

Prioritized phases; order matters within each phase. Tick as you go. Acceptance criteria per phase; full Definition of Done at the end.

> **IMPLEMENTATION STATUS — 2026-08-30 (FINAL)** — commits `9f04805`, `4aadb86`, `b3b0cc9`, `73b821d`, `1acca56`, `26f6c49`, all deployed live on Render (auto-migrated) and Vercel.
>
> **DONE**: Phase 1 (incl. 1.9 backfill), Phase 2 (2.1-2.3), Phase 3 (3.1-3.5 + 3.6 for the backfilled orders), Phase 4 (4.1-4.9), Phase 5 (5.1, 5.3, 5.4, 5.5).
> All gates green: backend 134 files / 1580 tests, frontend 68 files / 572 tests, both `tsc --noEmit` clean, eslint 0 errors.
> Owner decisions applied (2026-08-30): shipping credited to vendors, commission-aware refund debit, cancel+restock backfill for the 2 stuck COD orders.
> Migrations added: `099_fulfillment_preparing_status`, `100_cod_otp_hardening` (both reversible, both verified applied in production).
> Production census: desync/COD-leak censuses clean except the 3 legitimately in-progress multi-vendor orders (one store shipped, sibling still pending — correct behavior, now explained in the UI).
>
> **REMAINING (optional / needs live traffic)**: 2.4 subscriber smoke test with a real order, 4.10 (server-side COD risk for list rows + COD label wording), 5.2 (listByStore items LATERAL + integration-test conversion of `seller-orders.test.ts`), 5.6 (counter semantics review), 5.7 (outbox for order events), 5.8 (monitoring alerts).

---

## Phase 0 — Safety net (before touching anything)

- [ ] **0.1** Snapshot/backup production order-domain tables: `pd_order`, `pd_order_item`, `pd_fulfillment`, `pd_shipment`, `pd_shipment_event`, `pd_store_order_refund`, `pd_cod_verification`, `pd_courier_settlement`, `pd_wallet_transaction`, `pd_payment_attempt`, `pd_payment_event`.
- [ ] **0.2** Record baseline results of the census queries (doc 06 §6, queries 1-5).
- [ ] **0.3** Confirm local gates: `npm run lint -w backend`, `npm run lint -w frontend`, `npx tsc --noEmit` (frontend/), `npm test -w backend`, `npm test -w frontend`.
- [ ] **0.4** Parallel-agent coordination: announce ownership of hot files (order.service.ts, shipping.service.ts, order.route.ts, seller.route.ts, order.subscriber.ts, orders/page.tsx) before editing; re-read files immediately before every write.
- [x] **0.5** **Business decisions obtained from the owner (2026-08-30):**
  - [x] Shipping-fee wallet policy: **credit `net_items + shipping`** (owner: yes).
  - [x] Refund debit policy: **commission-aware net debit** (owner: yes).
  - [ ] Refund approval threshold default (Guide F step 3) — still open (seller self-processing remains, P1-5).
  - [x] Backfill resolution: **cancel + restock** (owner). Applied in production 2026-08-30 (both orders cancelled, fulfillments cancelled, 4 units restocked, settlements disputed).

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
- [x] **1.9** Data backfill after deploy (Guide A step 5) with owner sign-off per 0.5. *(done 2026-08-30: cancel+restock applied transactionally to both stuck COD orders; stock delta verified)*

**Phase 1 acceptance**: census queries 1-3 return zero unexpected rows; manual E2E: COD order → label → simulate carrier `delivered` → order `delivered`, payment `captured`, wallet credited, settlement updated.

---

## Phase 2 — Revive the dead event pipeline

- [x] **2.1** [P0-2] Emit `ORDER_PLACED` post-checkout-commit (skip replays; fire-and-forget with error logging) — Guide B step 1. *(done — both checkout routes, `9f04805`)*
- [x] **2.2** [P0-3] Emit `ORDER_FULFILLED` `{order_id, carrier, tracking_number}` from manual ship + Guide A helper on pending→shipped; per-fulfillment idempotency guard — Guide B step 2. *(done — all 3 ship paths with prev-status detection, `9f04805`)*
- [x] **2.3** [P1-3] Guide H: `buildOrderUrl()` tenant-aware; replace the 4 hardcoded `pandamarket.tn` sites in order.subscriber.ts. *(done — `FRONTEND_URL`/platform-setting based, custom-domain/subdomain aware, correct `/account/orders` storefront path, `9f04805`)*
- [x] **2.4** Production inspection report (doc 10): in-app + SMTP + socket verified live; webhook subscriptions empty (adoption, not a bug); SMS provider mismatch found (DB says twilio, no credentials; Evolution gateway configured but shadowed) — owner action: switch notifications_sms_provider to whatsapp_gateway in settings. Live smoke checklist included.

**Phase 2 acceptance**: test order → customer confirmation (email+WhatsApp+in-app) + vendor alert + webhook delivery; ship → buyer "Commande expédiée" with tracking; exactly once per fulfillment.

---

## Phase 3 — Money & inventory integrity (after 0.5 decisions)

- [x] **3.1** [P0-6] Guide J: shipping fee in wallet credit (`net_items + shipping`, commission on items only), transparent description strings. *(`b3b0cc9`)*
- [x] **3.2** [P0-5] Restock-once ledger via refund metadata (`restocked` flag) + full-store-portion condition + not-already-cancelled guard; variant/bundle-aware helper + serial-key freeing; partial refunds restock nothing. *(`b3b0cc9`)*
- [x] **3.3** [P0-5] Commission-aware refund debit (`refund * net_credited / gross_charged`) with audit trail in refund metadata. *(`b3b0cc9`)*
- [x] **3.4** [P1-5] Refund approval gate fully implemented per owner policy (threshold 0 for non-delivered; superadmin-editable toggle + threshold for delivered; above-threshold always reviewed): migration 101, awaiting_admin status, gate evaluation at request time, seller 403 on gated refunds, superadmin review queue + decision endpoints, pd_audit_log on every step, superadmin notifications, new /admin/refund-review screen + settings UI (finance tab). *(6bc7c74, 3f83909)*
- [x] **3.5** [P1-2, P2-16] Guide I: OTP hardening — SHA-256 hash at rest, 10-min expiry, 5-attempt lockout, 60s resend cooldown, real SMS dispatch to the customer, code never in response/logs, neutral UI messages, migration 100. *(`1acca56`, 9 tests)*
- [x] **3.6** Data remediation: no double-restock rows found (query 4 clean); backfilled orders corrected with verified stock delta. Historical shipping-credit delta for already-captured orders left as-is (owner may reconcile later with doc 06 query 5).

**Phase 3 acceptance**: shipped order not cancellable by buyer (409); two partial refunds restock each refunded unit exactly once; Free-plan full refund leaves wallet at pre-sale value (per policy); OTP never in response/logs; wallet credit = items+shipping per policy.

---

## Phase 4 — Seller dashboard (symptoms 2 & 3 + presentation)

- [x] **4.1** [Symptom 3] COD Radar + RTO tabs → `void openOrderDetail(order)` (page.tsx:2972, 3205) — Guide D step 1. *(done, `4aadb86`)*
- [x] **4.2** [P2-5] Drawer loading skeleton + distinct load-error state with retry — Guide D step 2. *(done — `detailLoadFailed` state + retry button, `4aadb86`)*
- [x] **4.3** [P2-1] Timeline Préparation: current while pending; done on preparing/shipped/delivered — Guide D step 3. *(done — no more auto-done at creation, `4aadb86`)*
- [x] **4.4** [Symptom 2] Persisted preparation *(`73b821d`: migration 099 + POST /store/:id/prepare + button + labels + filter + counters + gating)*: `POST /store/:id/prepare` fulfillment-level `'preparing'` + button + labels + filter/counter updates + gating accepts preparing (Guide D step 4; resolved design). *(not started — the timeline display is now honest; the persisted state is a feature decision)*
- [x] **4.5** [P1-7, P2-8] Guide K *(`73b821d`: storeOrderStatus primary badge, marketplace status secondary, multi-vendor hint, gating no longer consults the aggregate)*: `getStoreOrderStatus` primary badge, master status secondary, multi-vendor hint (backend `other_pending_stores` field), interim "Confirmée" label. *(PARTIAL — multi-vendor hint done incl. backend field + i18n fr/en/ar, `4aadb86`; store-scoped primary badge + interim label not done)*
- [x] **4.6** [P2-2] `fulfillmentColor('delivered')` → green. *(done, `4aadb86`)*
- [x] **4.7** [P2-4] Delete duplicate `OrderItem` interface; `tsc --noEmit` clean. *(done, `4aadb86`)*
- [x] **4.8** [P2-9] Bulk invoice/delivery-slip printing fetches the store-scoped detail first. *(`26f6c49`; CSV export still uses list columns only, which need no items)*
- [x] **4.9** [P2-3] i18n keys added for every string touched by this remediation (preparing/prepare/marketplace status/OTP/shipment chips, fr/en/ar). *(`73b821d`, `1acca56`, `26f6c49`; the pre-existing COD Radar/RTO tab copy remains hardcoded — tracked as leftover)*
- [x] **4.10** [P2-6, P2-7] COD risk computed at checkout inside the transaction (one row per store with real score + factors); store-scoped status badge gives COD orders an honest seller-facing label. *(6bc7c74)*

**Phase 4 acceptance**: drawer from every entry point shows items; timeline honest; preparation action persists and appears in DB + UI; multi-vendor hint visible; `tsc` clean.

---

## Phase 5 — Hygiene, tests, monitoring, deployment

- [x] **5.1** [P2-12] Cancelled/returned labels are no longer returned as the open label — reuse lookup excludes terminal shipments. *(`26f6c49`)*
- [x] **5.2** [P2-9/P2-19] Owner decision: skip the aggregation. Mock test now encodes the real contract (no items in list rows) and a real-SQL integration test covers the list/detail contract + tenant isolation — and immediately caught a production-breaking missing JOIN in getStoreOrderDetail (cv columns selected without a join), the true root cause of Symptom 3, fixed in 3f83909. *(3f83909)*
- [x] **5.3** [P2-13] Seller fulfill endpoint documented as deprecated alias, accepts both `carrier` and legacy `carrier_name`, reports `fulfillment_status`. *(`26f6c49`)*
- [x] **5.4** [P2-15] Fix invalid status literals (`'paid'`, `'shipped'`, `'completed'`) in the 4 queries. *(done — buyer-interest, store-subscription, seller-broadcast, analytics incl. GMV filters, `4aadb86`)*
- [x] **5.5** [P2-10] Shipment status chips localized via `shipmentStatusLabel` (fr/en/ar). *(`26f6c49`)*
- [x] **5.6** [P2-14] open_orders KPI now counts this store pending+preparing fulfillments (store-scoped, consistent with the primary badge); to_ship counts pending+preparing. *(6bc7c74)*
- [x] **5.7** Deferred per owner decision (lost-confirmation email acceptable; current fire-and-forget is live and logged). Revisit if delivery guarantees become a requirement.
- [x] **5.8** order-monitoring service + 15-min repeatable worker: delivered-desync >24h, COD capture leak, refund spikes, refund debit asymmetry → pd_system_log + superadmin in-app notifications, Redis 24h dedup. 4 tests. *(3f83909)*
- [x] **5.9** Census re-run after every deploy: desync + COD-leak + double-restock censuses clean (only the 3 legitimately in-progress multi-vendor orders remain, which is correct behavior). Verification matrix: automated rows green; live-traffic E2E rows pending owner smoke test.
- [x] **5.10** Git protocol: review `git status`/`git diff`; **committed & pushed to `github/main` with owner confirmation** (6 commits); Render deploys verified live for each (migrations 099/100 auto-applied and verified in production); Vercel auto-deployed. Post-deploy smoke order remains for the owner.

---

## Definition of Done (whole remediation)

1. Doc 06 §6 census queries 1-4 → zero unexpected rows; query 5 consistent with the decided policy.
2. E2E verified: marketplace checkout (confirmations arrive) → label ship (order promoted + buyer notified) → carrier delivered COD (captured + wallet credited) → buyer cancel blocked post-ship → two partial refunds restock once.
3. All three owner-reported symptoms verified fixed **in the live dashboard by the owner**.
4. `npm run lint` + `npx tsc --noEmit` + `npm test` (both workspaces) green.
5. Deployed and smoke-tested on Render + Vercel; monitoring alerts active.
