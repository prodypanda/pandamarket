# 00 — Combined Executive Summary

**Sources**: 3 independent audits (opencode/GLM-3.7 · AutoClaw/GLM-3.7-Flash · Antigravity/Gemini-3.7-Flash), all at commit `7141e9f`, merged 2026-08-30 after claim-by-claim re-verification.

---

## 1. Why this audit exists

The owner reported 3 seller-dashboard symptoms:

1. An expedition is "Expédiée" (shipped) but the order status still displays "En attente" (pending).
2. The seller cannot change the "Préparation" (preparation) status.
3. "Articles de la boutique" (store items) shows "Détail des articles indisponible" (item details unavailable).

**All three audits independently confirmed all three symptoms as real, reproducible defects** — a rare triple cross-confirmation — and each traced them to a shared systemic root: the order state machine is split-brain, and the UI renders the corrupted aggregate faithfully.

## 2. The systemic picture (merged consensus)

```
pd_order.status        (master aggregate — payment lifecycle)      ← advanced by MANUAL paths only
pd_order.payment_status(money)
pd_fulfillment.status  (per-store work unit — fulfillment reality) ← mutated by ALL paths
pd_shipment.status     (per carrier label — logistics reality)     ← mutated by carrier sync/webhooks
```

The three "ship" paths and their effects (merged verified table):

| Path | Code | Fulfillment | Order status | COD capture | Events |
|---|---|---|---|---|---|
| Manual "Marquer expédiée" | `POST /orders/:id/fulfill` → `fulfill()` (order.service.ts:1615-1646) | `pending → shipped` | ✅ recomputed (all shipped → `fulfilled`) | n/a | ❌ none |
| Carrier label "Générer l'étiquette" | `POST /orders/store/:id/shipments` → `shippingService.createShipment` (shipping.service.ts:664-669) | force `shipped` | ❌ **never** | n/a | ❌ none |
| Carrier tracking sync / webhook | `persistTrackingResult` (shipping.service.ts:882-897), worker running | mapped `shipped/delivered/cancelled` | ❌ **never** | ❌ **never** | ❌ none |
| Manual "Marquer comme livrée" | `markStoreFulfillmentDelivered` (order.service.ts:1648-1765) | `shipped → delivered` | ✅ recomputed | ✅ captures + emits | ✅ PAYMENT_CAPTURED |

**Live production proof** (Audit A, read-only SQL): COD orders `...vCzt4t3H` and `...kB2SykvE` — single fulfillment, Aramex-shipped 2026-08-15 — are **still `payment_required` on 2026-08-30**, with payment that existing code can never capture. Counter-proof: a manual-modal order from May correctly reached `fulfilled`.

## 3. Headline findings (unified numbering, details in docs 02-04)

### P0 — Critical (6)

| ID | Finding | Found by |
|----|---------|----------|
| P0-1 | Carrier-label + carrier-sync paths never recompute `pd_order.status` (state desync class; also leaves delivered orders stuck with **no UI repair** — `canMarkDelivered` requires `shipped`) | A + B |
| P0-2 | `ORDER_PLACED` never emitted — the ENTIRE order-placed notification layer is dead (customer email/WhatsApp/in-app, vendor alert + socket, ERP/POS webhooks, stock-low alerts, `orders_created` metric). Verified: 13 total `eventBus.emit` calls in backend, none ORDER_PLACED; `git log -S`: never existed | **A only** (B's table wrongly said "wired" — resolved, see doc 06) |
| P0-3 | `ORDER_FULFILLED` never emitted — buyer never notified of shipment (email/WhatsApp/in-app/webhook all dead) | A + B |
| P0-4 | Whole-order `cancel()` trusts order status only → buyer/admin can cancel an **already-shipped** order (restocks in-transit goods, frees serial keys) | **A only** |
| P0-5 | Refund processing: restock re-runs fully on **every** processed refund (double-restock), ignores variants/bundles/serials; wallet debits **gross** while credit was **net-of-commission** → Free-plan (15%) wallets go negative on full refunds | A + B (partial each) |
| P0-6 | **Vendor wallet credit omits shipping fees** — `onPaymentCaptured` credits `SUM(items.subtotal) − commission` only; the per-store shipping the buyer paid (7 TND flat) never reaches the merchant who pays the carrier. 100 TND Free-plan order + 7 TND shipping: vendor gets 85 TND, absorbs 7 TND shipping cost. *(Needs business-decision on policy; math confirmed in code)* | **C only** |

### P1 — High (7)

| ID | Finding | Found by |
|----|---------|----------|
| P1-1 | RTO has no state guards (can RTO `delivered`; double-RTO double-restocks), no order recompute, no serial freeing, no settlement adjustment, unconditional COD-verification rejection | A |
| P1-2 | COD OTP is security theater: code returned **in the HTTP response** and rendered to the seller; no SMS ever sent; plaintext at rest; no expiry, no attempt limit, no rate limit | A |
| P1-3 | Hardcoded `pandamarket.tn` URLs in customer notifications — live domain is `garbage.team`; every order email/WhatsApp link would be dead | A |
| P1-4 | `fulfill()` overwrites carrier/tracking with NULL when the modal is submitted empty (prod shows `La Poste Tunisienne` + NULL tracking) and is non-transactional (fulfillment update + order promotion are separate queries; same non-atomicity in `createShipment`) | A (+B implicitly) |
| P1-5 | Sellers self-process their own refund requests with no platform/admin approval gate or audit trail — wallet debit, restock, order→`refunded` all seller-triggered | **B only** (F-6) |
| P1-6 | `markPaidInTransaction` can jump a late-captured order straight to `fulfilled` with **zero** shipped/delivered fulfillments (pure-cancellation edge) | **B only** (F-10) |
| P1-7 | Status semantics mislead after payment: paid online orders stay `pending` ("En attente"); `processing` is dead state; buyer pages show the same raw status while the checkout success page claims "en cours de préparation" — three contradictory stories | A + B + C (framed differently) |

### P2 — Medium/hygiene (18, grouped in doc 04)

Highlights: timeline "Préparation" auto-done at creation (all 3); duplicate `OrderItem` interface masking type errors (A + C); COD/RTO drawer error fallback shows "indisponible" instead of load-error (all 3); `fulfillmentColor('delivered')` amber (A); hardcoded French in COD UI (A); cancelled labels returned forever as "open label" (B F-7); untranslated English shipment chips (B F-8); duplicate fulfill endpoints with **divergent body params** `carrier` vs `carrier_name` and misleading `{status:'fulfilled'}` response (B F-9 + merge verification); test mock encodes a `listByStore`-with-items contract that never existed (B); **invalid status literals `'paid'/'shipped'/'completed'` in 4 SQL queries** (found during merge); COD risk-score fake fallback 35; no multi-vendor "waiting on other store" hint; CSV/print built from item-less list rows; summary counters encode `fulfilled=shipped`; drawer detail flash; hygiene notes.

## 4. Business impact (what this costs today)

1. **Vendor money (3 leaks)**: (a) COD carrier-delivered orders never capture → wallets never credited (P0-1); (b) shipping fees never credited to any vendor (P0-6); (c) refunds debit more than was credited on commission plans (P0-5).
2. **Customer experience**: zero order-confirmation and zero shipping notifications — no email, no WhatsApp, no in-app, for ANY order (P0-2/P0-3).
3. **Vendor integrations**: ERP/POS order webhooks never fire (README promise non-functional for orders).
4. **Inventory integrity**: double-restocks (refunds), restock of in-transit goods (cancel), variant/bundle/serial blind spots.
5. **Trust in the dashboard**: contradictory badges, fake timeline, dead controls, "indisponible" items — exactly what the owner reported.
6. **Analytics distortion**: every strict `pd_order.status` consumer (open-order counters, broadcast eligibility, subscription checks) misclassifies shipped orders.

## 5. Recommended fix order (full detail: docs 07-08)

1. **Phase 1 — State machine**: one `syncOrderStatusFromFulfillments()` helper called (in-transaction) from every fulfillment mutation site (A+B sketches merged). Plus RTO guards, cancel guard, fulfill transactionality.
2. **Phase 2 — Events**: emit `ORDER_PLACED` (post-checkout) and `ORDER_FULFILLED` (on shipped transitions); fix hardcoded domains.
3. **Phase 3 — Money**: COD capture on carrier delivery; shipping-fee wallet credit (after business decision); refund restock/debit correctness; OTP hardening.
4. **Phase 4 — Dashboard**: COD/RTO tabs call `openOrderDetail()`; timeline Préparation logic; store-scoped status presentation + multi-vendor hint; persisted `preparing` state (fulfillment-level, recommended resolution).
5. **Phase 5 — Hygiene/QA**: P2 batch, test-contract fixes, monitoring alerts, data backfill verification.

## 6. What is solid (do not regress — doc 05 §8 + audit A doc 07)

Checkout idempotency (advisory-lock serialization + partial unique index + binding assertions), deterministic row-lock ordering, guarded atomic stock decrements (product/variant/bundle) with `FOR UPDATE SKIP LOCKED` serial allocation, quote/capability versioning, payment-webhook idempotency, tenant isolation via `EXISTS` guards everywhere, per-gateway wallet retention with per-order credit idempotency, carrier adapter architecture with simulation fallback + reconciliation sweep + compensation, and the manual delivery path (the one complete, correct fulfillment flow — the model to generalize).

## 7. Guarantees

- Zero source files modified by any audit or by this merge (`git status` clean apart from additive audit folders).
- Production access strictly read-only; deploy parity proven (local HEAD = live Render deploy).
- Every finding is pinned `file:line` at `7141e9f` and, where possible, backed by live production rows.
- All cross-audit conflicts resolved with documented evidence (doc 06).
