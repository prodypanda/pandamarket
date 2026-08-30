# 00 — Executive Summary

**Audit**: Marketplace order process deep audit
**Auditor**: Zhipu GLM 3.7 (opencode agent) — 30/08/2026
**Code audited**: local HEAD `7141e9f`, verified byte-identical to the live Render production deployment (see 06-EVIDENCE).

---

## 1. What was investigated

1. **Full order lifecycle** (backend + frontend): checkout, idempotency, payment capture, fulfillment (manual + carrier label + carrier tracking), delivery proof, cancellation (customer / vendor / compensation), refunds, COD verification (risk scoring, OTP), RTO, courier settlement ledger, seller dashboard UX, event bus subscribers, workers.
2. **Three owner-reported symptoms** (see doc 01 for full detail):
   - Order shows shipped but status stays "pending".
   - Seller cannot change the "Préparation" status.
   - "Articles de la boutique" shows "Détail des articles indisponible".
3. **Production data forensics**: direct read-only SQL against the live Supabase PostgreSQL, plus Render deploy API verification.

## 2. Headline findings

### 2.1 The order state machine is split-brain (root of symptom 1)

`pd_order.status` and `pd_fulfillment.status` are maintained by **independent code paths**:

| Transition path | Updates fulfillment? | Updates order status? | COD capture on delivery? | Events emitted? |
|---|---|---|---|---|
| `POST /orders/:id/fulfill` (manual "Mark shipped" modal) | YES | YES (if all stores shipped -> `fulfilled`) | n/a | NONE (ORDER_FULFILLED never emitted anywhere) |
| `POST /orders/store/:id/shipments` (carrier label generation -> `shipping.service.createShipment`) | YES (force `shipped`) | **NO — BUG** | n/a | NONE |
| Carrier webhook / reconciliation worker (`persistTrackingResult`) | YES (mapped) | **NO — BUG** | **NO — BUG** (COD never captured) | NONE |
| `POST /orders/:id/deliver` (manual delivery + proof) | YES | YES | YES (correct full path) | PAYMENT_CAPTURED (yes) |
| `POST /orders/:id/fulfillment/cancel` (vendor cancel) | YES | YES (recomputed) | n/a | NONE |

**Live production proof**: COD orders `...vCzt4t3H` and `...kB2SykvE` were shipped via Aramex labels on 2026-08-15 with **single** fulfillments — their `pd_order.status` is **still `payment_required`** today, and their COD payment was never captured, so the vendors were never paid. A counter-example order shipped through the manual modal in May correctly reached `fulfilled`.

Additionally, **by design but with terrible UX**: order-level status only advances when **every vendor** in a multi-vendor order ships. The 10 most recent marketplace orders are all 2-vendor orders (Atelier Médina + mejrda); when one vendor ships, the seller sees "Expédiée" (fulfillment column) next to "En attente" (order status column) with no explanation.

### 2.2 The order notification/webhook layer is entirely dead

`PdEvent.ORDER_PLACED` (`pd.order.placed`) and `PdEvent.ORDER_FULFILLED` (`pd.order.fulfilled`) have **full subscriber implementations**:
- customer order-confirmation email + in-app notification + **WhatsApp** message,
- vendor "Nouvelle commande" notification + realtime socket event + email,
- vendor ERP/POS **outgoing webhooks**,
- low-stock alert engine,
- customer "Commande expédiée" email + notification + WhatsApp.

**But `git log -S` proves no code has ever emitted either event.** Net effect: zero order emails, zero order WhatsApp messages, zero vendor webhook deliveries, zero low-stock alerts triggered by orders. (Payments/refund events ARE emitted correctly.)

### 2.3 The seller dashboard faithfully displays corrupted data (root of symptoms 1-3)

- Status column = `order.status`; Fulfillment column = `fulfillment_status`. Desynced data -> contradictory badges.
- "Préparation" is a **computed** timeline step with no persisted state behind it; `OrderStatus.Processing` exists in the enum but **nothing in the backend ever sets it** (dead state). After label generation the fulfill button disables (`canFulfill` requires `pending`), so the seller loses all manual control of the shipment flow.
- COD Radar tab (`page.tsx:2972`) and RTO tab (`page.tsx:3205`) open the detail drawer with `setSelectedOrder(order)` on the **list row** (which never contains `items`) instead of calling `openOrderDetail()` -> permanent "Détail des articles indisponible". The main orders table does it correctly. The backend detail endpoint itself is **healthy** (verified by replaying its exact SQL against production).

## 3. Severity counts

| Severity | Count | Highlights |
|----------|-------|-----------|
| P0 Critical | 5 | State-machine desync (2 paths), dead ORDER_PLACED/ORDER_FULFILLED events, unsafe whole-order cancel, corrupting refund restock + gross-vs-net wallet debit |
| P1 High | 4 | Unguarded RTO, COD OTP returned to seller with no SMS, hardcoded `pandamarket.tn` domains in live notifications, fulfill() NULL-overwrite of carrier/tracking |
| P2 Medium | 9+ | Préparation timeline logic, delivered=amber color, hardcoded French in COD UI, duplicate OrderItem interface, detail flash, OTP no rate-limit/expiry, etc. |

## 4. Business impact (what this costs today)

1. **Vendor money**: COD orders shipped via carrier labels never capture payment on delivery -> vendor wallets never credited (wallet credit only runs on PAYMENT_CAPTURED).
2. **Customer experience**: no order confirmation, no shipping notification (email/WhatsApp/in-app) — for ANY order, any gateway.
3. **Vendor integrations**: ERP/POS webhooks for orders never fire (the "Integrate ERP/POS via outgoing webhooks" promise from the README is non-functional for orders).
4. **Ops safety**: a buyer (or admin) can cancel an already-shipped order (restock of shipped goods + contradictory states); partial refunds double-restock inventory and can push Free-plan vendor wallets negative.
5. **Trust in dashboard**: sellers see contradictory statuses and dead controls, exactly as reported.

## 5. Recommended fix order (details in docs 08 + 09)

1. Centralize order-status recompute (`syncOrderStatusFromFulfillments`) and call it from every fulfillment-mutating path, inside transactions.
2. Emit `ORDER_PLACED` (post-checkout commit) and `ORDER_FULFILLED` (on every shipped transition).
3. Route carrier-webhook delivery through the same COD-capture path as manual delivery (capture + PAYMENT_CAPTURED + wallet credit).
4. Frontend: COD Radar / RTO tabs call `openOrderDetail()`; fix Préparation timeline; (optionally) add a persisted `preparing` state.
5. Guard `cancel()` on fulfillment state; make refund restock idempotent + variant/bundle/serial-aware + commission-aware.
6. Fix hardcoded domains; replace the OTP-display hack with real SMS dispatch.

## 6. Method & guarantees

- Read-only: **zero repo files modified** (`git status` verified before and after; only pre-existing untracked folders from other agents were present).
- Production credentials used strictly read-only (SELECTs + Render GET endpoints); temp scripts deleted after use.
- Every finding is pinned to `file:line` and (where relevant) backed by live production rows.
- Deploy parity verified: Render service `pandamarket-backend` (`srv-d9qjrth42hec73efhoa0`) latest live deploy = commit `7141e9f0195bf4c55998f95a8e87302e1e70278f` = local HEAD.
