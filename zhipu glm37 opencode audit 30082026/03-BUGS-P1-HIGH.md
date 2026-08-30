# 03 — P1 High-Severity Bugs

---

## P1-1 — RTO (Return to Origin) has no state guards and no side-effect parity

**Location**: `backend/src/services/order.service.ts:2462-2512` (`markStoreFulfillmentRto`), route `POST /api/pd/orders/store/:id/rto` (order.route.ts:502-515).

**Description**
```sql
UPDATE pd_fulfillment
   SET status = 'cancelled', rto_reason_code = $3, rto_notes = $4, rto_at = NOW(), ...
 WHERE order_id = $1 AND store_id = $2      -- <-- NO status guard
```
- Can RTO a fulfillment that is **already `delivered`** (should be blocked) or already `cancelled` (double RTO -> double restock via step 4).
- Never recomputes `pd_order.status` (adds to the P0-3 desync family: all fulfillments cancelled -> order should become `cancelled`; mixed -> `fulfilled`/`delivered` per `cancelStoreFulfillment` semantics at 1803-1838).
- Restocks (2501-2508) but does NOT free serial license keys and does not reverse/adjust the `pd_courier_settlement` row that `createShipment` created for COD (shipping.service.ts:671-692) — the settlement ledger keeps showing the original collected amount as pending/settled.
- Sets `pd_cod_verification` to `rejected` unconditionally (2491-2499) even if the RTO reason is `damaged_in_transit` or `delayed_delivery` (not the customer's fault).

**Fix direction (Guide G)**: add `AND status IN ('shipped')` guard (RTO only valid after shipping), recompute order status via the centralized helper, reuse `restoreOrderItemStock`, free serial keys, mark the courier settlement `disputed`, and choose the COD-verification status by reason code.

---

## P1-2 — COD OTP is security theater: the code is shown to the seller, no SMS is ever sent

**Location**
- Backend: `backend/src/services/order.service.ts:2418-2433` (`sendCodOtp`):
  ```ts
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  ...
  logger.info({ order_id: orderId, otp_code: otpCode }, 'Generated COD verification OTP');
  return { success: true, message: `Code OTP de vérification généré : ${otpCode}` };
  ```
  The 6-digit code is returned **in the HTTP response** and also written to the application log. No SMS provider call exists. The code is stored in plaintext (`otp_code` column, 2422-2429).
- Frontend: `frontend/src/app/hub/dashboard/orders/page.tsx:2141` — `setCodFeedback(data.message || ...)` renders the backend message **containing the OTP** directly in the seller UI.
- `verifyCodOtp` (2435-2457) compares plaintext, has **no expiry check** (`otp_sent_at` is never validated) and **no attempt limiting**.

**Impact**
The whole "Diagnostic Risque COD & Pré-Validation" card implies the customer confirms by OTP. In reality the seller sees the code on screen and types it themselves — zero fraud value, false sense of security, and OTPs leak into logs (which also contradicts the platform's own security posture).

**Fix direction (Guide I)**
1. Never return the code in the response; integrate a real SMS/WhatsApp sender (a WhatsApp notification service already exists: `whatsapp-order-notification.service.ts`).
2. Hash the OTP at rest, add `otp_expires_at` (e.g., 10 minutes) and max-attempt counter.
3. Rate-limit `POST /store/:id/cod-otp/send` (per order per store).
4. Frontend: stop rendering backend raw messages for this flow; show a neutral "Code envoyé au client".

---

## P1-3 — Hardcoded `pandamarket.tn` URLs in live customer notifications

**Location**: `backend/src/subscribers/order.subscriber.ts`
- Line 109: `https://pandamarket.tn/store/orders/${order.id}`
- Line 110: `https://pandamarket.tn/hub/orders`
- Lines 133-135: same pair in the WhatsApp payload.
- Line 420: `trackingUrl: 'https://pandamarket.tn/hub/orders'` (order-shipped WhatsApp).

**Description**
The actual production domains are `www.garbage.team` / `*.garbage.team` (per REMOTE_CREDENTIALS.md / next.config.ts). Every customer-facing order email/WhatsApp (once P0-1/P0-2 emissions are fixed) would contain links to a domain that is not the live storefront — dead links in every notification. Also the URLs ignore per-store custom domains (`store_custom_domain`) and the platform-config marketplace name setting that exists elsewhere (`platformConfigService`).

**Fix direction (Guide H)**: centralize a `buildOrderUrl(order)` helper that resolves tenant domain (custom domain -> subdomain -> marketplace base from platform settings), use it in all four sites.

---

## P1-4 — `fulfill()` overwrites carrier/tracking with NULL and is not transactional

**Location**: `backend/src/services/order.service.ts:1615-1646`.

**Description**
```ts
const { rowCount } = await query(
  `UPDATE pd_fulfillment
      SET status = 'shipped', carrier = $3, tracking_number = $4, shipped_at = NOW()
    WHERE order_id = $1 AND store_id = $2 AND status = 'pending'`,
  [opts.order_id, opts.store_id, opts.carrier ?? null, opts.tracking_number ?? null],
);
```
- If the seller ships via the modal without filling carrier/tracking (frontend sends `undefined` for both — page.tsx:1629-1632), any previously stored carrier/tracking (e.g., set by a prior partial flow or by store settings automation) is overwritten with NULL. Production shows shipped rows with `carrier='La Poste Tunisienne', tracking_number=NULL` for `...6thmSpQZ` / `...DGq97HRZ` — the tracking column in the dashboard then renders nothing and the tracking link disappears.
- The fulfillment UPDATE and the order-status promotion (1634-1644) are **two separate, non-transactional queries** — a crash between them leaves exactly the desync state this audit started from (shipped fulfillment + stale order status). Same non-atomicity exists in `createShipment` (shipment insert, fulfillment update, courier-settlement insert are three independent queries — its own compensation try/catch only covers carrier-side cancellation, not partial DB writes: shipping.service.ts:642-700).

**Fix direction (Guide A/B)**: use `COALESCE($3, carrier)` / `COALESCE($4, tracking_number)` semantics (or only set when provided), wrap fulfill() in `transaction()`, and reuse the centralized status sync helper inside the same transaction.
