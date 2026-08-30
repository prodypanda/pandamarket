# 03 — P1 High-Severity Findings (merged)

---

## P1-1 — RTO (Return to Origin) has no state guards and no side-effect parity

**Found by**: Audit A (P1-1).
**Location**: `backend/src/services/order.service.ts:2462-2512` (`markStoreFulfillmentRto`), route `POST /orders/store/:id/rto` (order.route.ts:502-515).

- UPDATE has **no status guard** → can RTO a `delivered` fulfillment; double-RTO on an already-cancelled one double-restocks.
- Never recomputes `pd_order.status` (joins the P0-1 desync family).
- Restocks but does NOT free serial keys, does not adjust the `pd_courier_settlement` row created for COD at label time (ledger keeps showing original collected amount), and unconditionally sets `pd_cod_verification` to `rejected` even for carrier-fault reasons (`damaged_in_transit`, `delayed_delivery`).

**Fix**: Guide G.

---

## P1-2 — COD OTP is security theater: the code is shown to the seller, no SMS is ever sent

**Found by**: Audit A (P1-2). (Audit C described "SMS OTP verification" as a working feature — it is not.)
**Location**:
- Backend `order.service.ts:2418-2433` (`sendCodOtp`): generates a 6-digit code, returns it **in the HTTP response message** (`Code OTP de vérification généré : 123456`), logs it, stores plaintext. No SMS provider call exists.
- Frontend `page.tsx:2141`: renders the backend message (containing the OTP) directly to the seller.
- `verifyCodOtp` (2435-2457): plaintext compare, **no expiry check**, **no attempt limit**; send endpoint **not rate-limited**.

**Impact**: The "Diagnostic Risque COD & Pré-Validation" card implies customer confirmation; in reality the seller reads the code off the screen and types it themselves — zero fraud value, false security, OTPs leaked into logs.

**Fix**: Guide I — never return/log the code; real SMS/WhatsApp dispatch (a WhatsApp service exists); hash at rest; 10-min expiry; attempt limit; rate limit; neutral frontend message.

---

## P1-3 — Hardcoded `pandamarket.tn` URLs in live customer notifications

**Found by**: Audit A (P1-3).
**Location**: `backend/src/subscribers/order.subscriber.ts:109-110, 133-135, 420` — order-confirmation and order-shipped emails/WhatsApp use `https://pandamarket.tn/...` links. Live domains are `www.garbage.team` / `*.garbage.team` (next.config.ts, REMOTE_CREDENTIALS.md). Once P0-2/P0-3 emissions are fixed, every notification would contain dead links. Also ignores per-store custom domains and platform-config marketplace name.

**Fix**: Guide H — tenant-aware `buildOrderUrl()` (custom domain → subdomain → platform base).

---

## P1-4 — `fulfill()` overwrites carrier/tracking with NULL and key writes are non-transactional

**Found by**: Audit A (P1-4); non-atomicity independently noted for `createShipment` by both A and B.
**Location**: `order.service.ts:1615-1646`.

- Empty modal submit sends `undefined` for both fields (page.tsx:1629-1632) → UPDATE sets `carrier=NULL, tracking_number=NULL`, destroying any previously stored values. Production shows shipped rows `carrier='La Poste Tunisienne', tracking_number=NULL` (`...6thmSpQZ`, `...DGq97HRZ`) — tracking column then renders nothing.
- Fulfillment UPDATE and order-status promotion are **two separate queries** (crash between them = the exact desync state this audit started from). `createShipment` similarly chains shipment INSERT + fulfillment UPDATE + courier-settlement INSERT as independent queries; its compensation only cancels the carrier-side label, not partial DB writes.

**Fix**: Guide A step 3 — `COALESCE($3, carrier)` semantics + wrap in `transaction()`; same treatment in the shipping layer.

---

## P1-5 — Sellers self-process refunds with no oversight

**Found by**: Audit B (F-6).
**Location**: `POST /store/:id/refunds/:refundId/process` (order.route.ts:329-339) → `processStoreRefund`.

Wallet debit, restock, event emission, and the whole-order → `refunded` transition are all triggered by the seller with no admin approval gate, no threshold, no audit log. Money math is self-consistent (debits the seller's own wallet) but buyer restitution, restock correctness (P0-5), and order-state changes have no platform oversight — a governance gap for disputes.

**Fix**: Guide F step 3 — configurable threshold (`refund_auto_process_max_amount_tnd`, default 0 = admin approval required), `awaiting_admin` status, admin notification, `pd_audit_log` entries.

---

## P1-6 — `markPaidInTransaction` can jump a late-captured order to `fulfilled` with zero shipments

**Found by**: Audit B (F-10).
**Location**: `order.service.ts:2227-2235` — the CASE includes `WHEN NOT EXISTS (SELECT 1 FROM pd_fulfillment WHERE order_id=$1 AND status='pending') THEN 'fulfilled'`. If a late capture/reconciliation lands when all fulfillments left `pending` for any reason (e.g., all cancelled), the order becomes `fulfilled` ("Expédiée") although nothing shipped.

**Fix**: Guide L item 4 — tighten to require `EXISTS (... status IN ('shipped','delivered'))`; digital-only orders (zero fulfillments) keep the existing `fulfilled` completion, which is intended.

---

## P1-7 — Order status semantics mislead after payment ("paid" reads as "not started")

**Found by**: A + B (F-3) + C (UI framing).
**Location**: `order.service.ts:669-673` (initial status), `2227-2235` (markPaid keeps `pending`); `page.tsx:305-315` (labels); buyer `hub/orders/page.tsx:262-263`; checkout success `page.tsx:198` ("en cours de préparation").

An online-paid order stays `pending` until every vendor ships; `processing` is dead (Symptom 2 RC-2.1). Result: a paid **and shipped** order legitimately reads "En attente" at the order level; buyers see the same raw status while the success page promises preparation — three contradictory stories about one order.

**Fix**: falls out mostly from Guides A + D (propagation + real preparation state). Interim/UX-level: derived label — `pending` + `payment_status='captured'` → "Confirmée" (B's suggestion); store-scoped primary status (Guide K, C's proposal). Revisit the strict-status consumers listed in doc 01 §1 impact radius together with any semantics change (B F-11 notes summary counters already encode `fulfilled=shipped`).
