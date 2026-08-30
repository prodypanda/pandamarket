# 05 — Order Process Full Audit (End-to-End Flow)

This document maps the ENTIRE order pipeline as it exists at HEAD `7141e9f`, with per-step audit notes. Use it as the reference state machine when implementing fixes.

---

## 1. Actors & surfaces

| Actor | Surface | Auth middleware |
|---|---|---|
| Marketplace customer | Hub checkout | `requireAuth` (order.route.ts:141-167) |
| Storefront customer | Store checkout | `requireStorefrontCustomer` (order.route.ts:182-217) |
| Seller/vendor | Dashboard `/hub/dashboard/orders` | `requireStore` (order.route.ts:246+, middleware index.ts:237-301) |
| Platform admin | Admin endpoints | role check `admin/super_admin` |
| Carriers | Webhooks | shipping.service webhook handler |
| ERP/POS | Outgoing webhooks | subscriber-driven |

`requireStore` resolves the active store from: `pd_selected_store_id` cookie (validated against `owner_id`) -> JWT `store_id` -> first owned store (middlewares/index.ts:237-301). Multi-store owners can switch context via cookie; every store query is tenant-isolated with `EXISTS (SELECT 1 FROM pd_order_item WHERE order_id = ... AND store_id = $n)` guards — verified in all store routes.

---

## 2. Checkout (order creation)

**Route**: `POST /api/pd/orders/checkout` (marketplace) / `POST /api/pd/orders/storefront/checkout` (storefront; requires `Idempotency-Key` header).

**Flow** (`orderService.checkout`, order.service.ts:376-880):

1. **Idempotency pre-check** (148-158 route-level, 395-403 service): lookup by key with binding (customer/storefront-customer/quote/gateway); replay returns existing order (200).
2. **Transaction begins** (404). If idempotency key: `pg_advisory_xact_lock(hashtext('pd_checkout:idempotency:'+key))` (410-413) serializes concurrent same-key attempts; in-transaction replay check (414-418). Binding assertion (`assertIdempotencyBinding`, 882-895) rejects key reuse across different bindings.
3. **Quote lock** (423-451): `checkoutQuoteService.lockForCheckout` (FOR UPDATE); special-case replays the committed order when the quote was concurrently consumed by the same idempotency key (ORDER_QUOTE_STALE + order_id details).
4. **Row locks in deterministic order** (453-469): products `ORDER BY id FOR UPDATE`, then variants — deadlock-safe under concurrency.
5. **Per-line validation** (472-616): product exists; `status=Published`; store `Verified` + `is_verified`; storefront line must belong to the store (514-519); bundle component stock (520-555); physical stock (556-562); serial license availability (563-578); variant belongs to product (582-604); **wholesale tier pricing** (605, `getWholesaleUnitPrice` 338-370 — Wholesaler/Hybrid sellers, min-quantity enforcement, tier sort + selection).
6. **Totals** (618-647): one fulfillment per **shippable** store (620-621); shipping address required if any physical item (622-624); `checkoutQuoteService.calculateTotals` (shipping per store, combined-shipping rebate for 2+ stores, coupons, taxes); quote assertion `assertMatches` (632-642) — items, address, coupon, totals must match the locked quote.
7. **Payment capability** (649-665): `paymentCapabilityService.assertGatewayAvailable` with version check + store locks. COD is correctly blocked for digital-only carts (`physical_items_required`, payment-capability.service.ts:538-546).
8. **Order INSERT** (667-723): initial status — `payment_required` for COD/ManualMandat, else `pending` (669-673); `ON CONFLICT (idempotency_key) DO NOTHING` + replay fallback (714-723).
9. **Order items + stock** (725-846): per-line INSERT with discount breakdown; guarded atomic decrements (`WHERE inventory_quantity >= qty RETURNING ...`), bundle components decremented individually (751-793), variant decrements (808-823), serial key assignment `FOR UPDATE SKIP LOCKED` (824-845).
10. **Ads attribution** (848-856) with `ON CONFLICT (campaign_id, order_id) DO NOTHING`.
11. **Fulfillments created ONLY for shippable (physical) stores** (858-865). Digital/serial-only stores get NO fulfillment row -> their dashboard rows show "Non expédiable" (fulfillmentLabel null case) — by design.
12. **Quote consumed** (867-869), logging, `buyerInterestService.syncBuyerProfile` fire-and-forget (875-877).

**Audit notes**
- [OK] Idempotency, locking, stock safety, tenant isolation: strong (see doc 07).
- [BUG P0-1] No `ORDER_PLACED` emission after commit.
- [NOTE] Wholesale validation happens per-line at checkout only; no re-validation at fulfill time (acceptable — stock was reserved).

---

## 3. Payment capture

**Paths**:
- Gateway webhooks (PayPal/Flouci/Konnect) -> `payment.service` / `payment.route.ts:615` -> `markPaidInTransaction` (order.service.ts:2216-2267): `payment_status='captured'`, and status CASE: keep `cancelled/refunded`; if NO pending fulfillments -> `fulfilled` (digital orders auto-complete — reasonable); `payment_required` -> `pending`; else keep. Emits `PAYMENT_CAPTURED` (payment.service.ts:1002, payment-reconciliation.service.ts:353).
- `PAYMENT_CAPTURED` subscriber (order.subscriber.ts:178-306): assigns serial license keys (idempotent), per-store wallet credit **net of commission** (Free plan 15%), retention days per gateway, vendor + customer notifications, analytics event. Idempotency guard via existing wallet transaction (182-189).
- COD: captured only at delivery (manual path only — see P0-3 for the carrier path hole).

**Audit notes**
- [OK] Capture idempotency (payment_status guard + FOR UPDATE fallback + conflict error).
- [BUG P0-5-adjacent] Wallet credit = net, refund debit = gross (see doc 02).

---

## 4. Fulfillment (shipping)

**Three competing write paths:**

| # | Path | Code | Sets fulfillment | Sets order status | Emits events |
|---|---|---|---|---|---|
| A | Manual modal "Marquer expédiée" | `POST /orders/:id/fulfill` -> `fulfill()` (1615-1646) | `pending -> shipped` (guarded), carrier/tracking (NULL-overwrite bug P1-4) | recomputed: all shipped -> `fulfilled` | NONE (P0-2) |
| B | Carrier label | `POST /orders/store/:id/shipments` -> `createStoreShipment` (1082-1241) -> `shippingService.createShipment` (shipping.service.ts:600-719) | force `shipped` + carrier + tracking + `shipped_at` (664-669); courier settlement row for COD (671-692) | **NO** (P0-3) | NONE |
| C | Carrier tracking sync | webhook `handleCarrierWebhook` (~1000-1008) + reconciliation worker sweep (`reconcileDueShipments` 1010-1050, worker running in main.ts:587 + worker.ts:66) -> `persistTrackingResult` (842-897) | mapped `shipped`/`delivered`/`cancelled` | **NO** (P0-3) | NONE |

**Path B details worth knowing** (createStoreShipment): returns existing shipment if one already exists (1135-1143); requires complete address + phone (1146-1152); requires physical items (1154-1170); sender info from store settings with platform fallbacks (1172-1180); weight from `weight_grams` (default 500g, min 50g) (1182-1189); COD amount = store total (1227); simulation fallback when carrier adapter not configured (618-624) — hence "ARAMEX-TN-xxxxx" style tracking numbers in production.

**Audit notes**
- [BUG] Desync class P0-3 (paths B and C).
- [BUG] P1-4 non-transactional writes.
- [OK] The `next_sync_at` reconciliation sweep design is solid and already running.

---

## 5. Delivery

**Manual path** (the ONLY complete one): `POST /orders/:id/deliver` -> `markStoreFulfillmentDelivered` (1648-1765):
- guarded `shipped -> delivered` in a transaction;
- shipment row updated + delivery proof persisted (`pd_store_delivery_proof`) when any proof field present (1699-1733);
- order recompute: all fulfillments terminal + at least one delivered -> `delivered`, and **COD capture** (`payment_status='captured'` for COD, 1743-1750);
- post-commit: ads conversion recognition, `PAYMENT_CAPTURED` emission for COD (1752-1763) -> wallet credit pipeline.

**Carrier path**: `persistTrackingResult` sets fulfillment `delivered` but does NONE of the above (P0-3) — no COD capture, no proof, no events.

---

## 6. Cancellation

| Path | Code | Notes |
|---|---|---|
| Vendor cancels their store's portion | `POST /orders/:id/fulfillment/cancel` -> `cancelStoreFulfillment` (1767-1841) | guarded `pending` only; restocks via `restoreOrderItemStock` (correct variant/bundle handling); recomputes order status (all inactive -> cancelled; delivered-only -> delivered; shipped-only -> fulfilled). [OK design] |
| Customer/admin whole-order cancel | `PUT /orders/:id/cancel` (route 427-459) -> `cancel()` (2041-2086) | Vendor requests are redirected to their store-fulfillment cancel (route 444-453) — good; but the whole-order path trusts order status only -> **P0-4** (can cancel shipped orders after P0-3 desync; restocks in-transit goods). |
| Payment-init compensation | `cancelUnstartedPaymentOrder` (2093-2206) | Correct guards (fulfillment started check 2122-2130, active payment attempt check 2148-2157). Reference implementation for the fix. |

---

## 7. Refunds (seller-initiated)

1. **Request**: `POST /orders/store/:id/refunds` -> `requestStoreRefund` (1843-1924): requires `payment_status='captured'`; cumulative requested+approved+processed refunds must not exceed store total (1885-1903); inserts `pd_store_order_refund` row (status `requested`).
2. **Process**: `POST /orders/store/:id/refunds/:refundId/process` -> `processStoreRefund` (1934-2039): `requested -> processed`; wallet debit (gross — P0-5); cumulative check vs ORDER total (note: compares against the **whole-order** total but sums refunds across stores — for multi-vendor orders the whole order flips to `refunded` only when ALL stores' refunds together reach the order total — subtle but coherent); restock block (**corrupting — P0-5**); emits `ORDER_REFUNDED` + `PAYMENT_REFUNDED` (2021-2029).

**Audit notes**
- [BUG P0-5] Restock + wallet asymmetry (full detail doc 02).
- [GAP] No reject/approve endpoint (status `rejected` exists but no route sets it); no customer-side refund request flow; refund amount is store-level, not per-item.

---

## 8. COD risk & pre-validation

- Risk scoring: `calculateCodRisk` (2272-2353) — phone format (Tunisian prefixes), address completeness, customer history, basket size; score 0-100 with factors JSON. `getOrCreateCodVerification` (2355-2382) lazily creates `pd_cod_verification` rows.
- Status updates: `updateCodVerification` (2384-2416) — status/call-attempts/notes.
- OTP: `sendCodOtp` / `verifyCodOtp` (2418-2457) — **P1-2 security theater**.
- Frontend: COD Radar tab + drawer card (page.tsx:2884-3218, 3598-3730) with call/WhatsApp 1-click actions (tel:/wa.me deep links — nice), risk badges, and the OTP display hack.

---

## 9. RTO

`POST /orders/store/:id/rto` -> `markStoreFulfillmentRto` (2462-2512): sets fulfillment `cancelled` + RTO metadata, shipment `returned`, COD verification `rejected`, restocks. **P1-1**: no status guard, no order recompute, no serial-key freeing, no settlement adjustment, unconditional verification rejection.

---

## 10. Courier settlement ledger

- `POST /orders/store/:id/settlement` -> `upsertCourierSettlement` (2617-2662): upsert by (order_id, store_id), net = collected - fee.
- `GET /orders/store-settlements` -> `listCourierSettlements` (2517-2615): paginated + summary (collected/fees/net/pending/settled).
- Auto-created for COD at label generation (shipping.service.ts:671-692).
- [NOTE] Never reconciled on RTO/refund (P1-1 related).

---

## 11. Seller dashboard (frontend) — data flow map

- **List**: `GET /api/pd/orders/store` (filters: status, payment gateway/status, fulfillment status, dates, customer, product, country, channel, dispute, search; page/limit<=100). Returns rows WITHOUT items/notes/shipments/refunds + `meta.summary` (KPIs incl. to_ship, shipped, SLA 48h rate, revenue captured-only).
- **Detail**: `openOrderDetail()` (1596-1617) fetches `GET /api/pd/orders/store/:id` -> full row. Used by: main table Eye button (2786), post-action refreshes (1641, 1656, 1694, 1858). **NOT used by**: COD Radar tab (2972), RTO tab (3205) — symptom 3.
- **Actions**: fulfill modal (1625), label generation (1671), delivery proof modal (1702+), vendor cancel (1801), refund request (1839), note upsert (2045), COD verify/OTP (2106-2173), RTO (2180), settlement (2244), bulk fulfill (2011), CSV export (1878), print docs (invoice/delivery slip/label) (466-1079).
- **Status badges**: order status column (2752), fulfillment column (2759), payment column (2737), timeline (1125-1171).
- [BUGS] see P2-1..P2-11 + symptom docs.

---

## 12. Workers & realtime (order-relevant)

| Component | Status | Note |
|---|---|---|
| `shipment-reconciliation.worker` | RUNNING (main.ts:587, worker.ts:66) | sweeps `next_sync_at <= NOW()` shipments -> `persistTrackingResult` (P0-3 hole) |
| `email.worker` | running | processes `emailQueue` (order templates exist but nothing enqueues them for placed/shipped — P0-1/P0-2) |
| `webhook.worker` | running | processes webhook deliveries (order events never enqueued — P0-1/P0-2) |
| `notification-batch.worker`, `daily-digest.worker` | running | digests reference orders |
| `outbox.worker` | running | generic outbox (currently used by non-order flows) |
| `socketGateway` | wired in subscribers | `new_order` / `payment_received` emits are dead until P0-1 fixed |
| WhatsApp service | implemented (`whatsapp-order-notification.service.ts`) | only called from dead subscribers |

---

## 13. Canonical order state machine (documented INTENDED behavior)

```
                    +---------------------+
                    | payment_required    |  COD / Manual Mandat at checkout
                    +---------+-----------+
                              | markPaid (gateway webhook)
                              v
 pending  <-------------------+  non-COD checkout / payment captured
    |  \
    |   (all fulfillments shipped)  ->  fulfilled  -> (all delivered) -> delivered
    |                                              \-> (COD) payment captured at delivery
    | \
    |  (vendor cancels own portion; others terminal) -> per-store cancelled
    v
 cancelled  (whole-order: buyer/admin; must be blocked once ANY fulfillment shipped/delivered)
    |
 refunded   (cumulative processed refunds >= order total)
```

**Current ACTUAL behavior deviates** at: carrier-label ship (order not promoted), carrier delivered (order not promoted, COD not captured), carrier returned/cancelled (order not recomputed, no restock), RTO (no recompute), whole-order cancel (no fulfillment guard), refunds (restock corruption).
