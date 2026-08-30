# 01 — Order Architecture Reference (as built at commit `7141e9f`)

Everything below was verified by direct read of the repository. Line numbers refer to the cited commit.

---

## 1. Core tables and their status fields

### `pd_order` — `backend/src/migrations/sql/001_initial_schema.sql:185-213`
| Column | Type | Values |
|--------|------|--------|
| `status` | VARCHAR(30), default `pending` | `payment_required` \| `pending` \| `processing` \| `fulfilled` \| `delivered` \| `cancelled` \| `refunded` |
| `payment_status` | VARCHAR(20), default `pending` | `pending` \| `captured` \| `failed` \| `refunded` |
| `payment_gateway` | VARCHAR(20) | `flouci` \| `konnect` \| `manual_mandat` \| `cod` (PayPal handled in payment layer) |

Later `ALTER`s add: `storefront_customer_id`, `idempotency_key` (unique partial index), `quote_id`, `quote_version`, `payment_capability_version`, `gross_subtotal`, `discount_total`, `tax_total`, `coupon_code`, `discount_breakdown`, `quote_snapshot`, RTO/notes fields via `pd_fulfillment`.

### `pd_order_item` — `001:216-233`
One row per product line; **carries `store_id`** → this is how multi-vendor order splitting works. Extended with `gross_subtotal`, `discount_amount`, `discount_breakdown`.

### `pd_fulfillment` — `001:235-254`
**One per store per order**, created inside the checkout transaction (`order.service.ts:861-866`). This is the seller's work unit.

| `status` | Meaning in UI |
|----------|----------------|
| `pending` | "À expédier" (`toShip`) — awaiting shipment |
| `shipped` | "Expédiée" |
| `delivered` | "Livrée" |
| `cancelled` | "Annulée" |

### `pd_shipment` — `003_shipping_and_digital.sql`
Carrier label record (Aramex / La Poste / manual / own_fleet / simulation). Statuses: `created → picked_up → in_transit → out_for_delivery → delivered`, plus `returned`, `cancelled`. Raw English values are printed untranslated in the seller drawer chip (`page.tsx:3860`).

### Supporting tables
`pd_store_order_refund`, `pd_store_delivery_proof` (035), `pd_courier_settlement`, `pd_pickup_request`, `pd_license_key` (serial products), `pd_payment_attempt` (065/081), `pd_payment_event` (002), `pd_shipment_reconciliation`.

---

## 2. The four state machines (independent, only loosely coupled)

```
pd_order.status
  payment_required --(markPaid)--> pending --(fulfill: last ship)--> fulfilled --(last deliver)--> delivered
        │                                                                               │
        └─────────────────────(cancel / refunds)──> cancelled / refunded <──────────────┘
  NB: 'processing' exists in the enum but NOTHING ever writes it.

pd_order.payment_status
  pending --(markPaid: online/mandat, or COD at full delivery)--> captured --> refunded

pd_fulfillment.status   (per store)
  pending --(fulfill() OR createShipment)--> shipped --(deliver OR carrier sync)--> delivered
     └──(cancel / RTO)--> cancelled        (carrier sync: returned → cancelled)

pd_shipment.status      (per label)
  created → picked_up → in_transit → out_for_delivery → delivered
     └──> cancelled / returned
```

The coupling rules that DO exist:
- `fulfill()` (`order.service.ts:1615-1646`): when the **last** `pending` fulfillment ships → `pd_order.status='fulfilled'`.
- `markStoreFulfillmentDelivered` (`order.service.ts:1648-1765`): when no active fulfillments remain and ≥1 delivered → `pd_order.status='delivered'`; captures COD payment and emits `PAYMENT_CAPTURED`.
- `cancelStoreFulfillment` (`order.service.ts:1767-1841`): recomputes order status from remaining counts (`cancelled` / `delivered` / `fulfilled`).
- `processStoreRefund` (`order.service.ts:1996-2007`): cumulative processed refunds ≥ order total → `pd_order.status='refunded'`.
- **Label creation and carrier sync update ONLY fulfillment + shipment — never the order** (this asymmetry is Bug #1).

---

## 3. Complete writer map for `pd_order.status` (verified by repo-wide search)

| # | Writer | Transition | Location |
|---|--------|-----------|----------|
| 1 | `orderService.checkout` | insert `payment_required` (COD / manual mandat) or `pending` (online gateways) | `order.service.ts:669-671, 682-705` |
| 2 | `markPaidInTransaction` | `payment_required → pending`; → `fulfilled` iff no `pending` fulfillment exists; else unchanged | `order.service.ts:2216-2236` (CASE at 2227-2235) |
| 3 | `fulfill()` | → `fulfilled` iff zero `pending` fulfillments remain order-wide | `order.service.ts:1637-1644` |
| 4 | `markStoreFulfillmentDelivered` | → `delivered` iff no active (`pending`/`shipped`) fulfillments remain; also sets `payment_status='captured'` for COD | `order.service.ts:1737-1756` |
| 5 | `cancelStoreFulfillment` | → `cancelled` / `delivered` / `fulfilled` per remaining counts | `order.service.ts:1814-1839` |
| 6 | `processStoreRefund` | → `refunded` iff processed refunds ≥ total | `order.service.ts:1996-2007` |
| 7 | `cancel()` | → `cancelled` (whole order, restocks) | `order.service.ts:2041+` |
| 8 | refund reject path | resets `payment_status='payment_required'` (mandat rejection) | `payment.route.ts:617-622` |
| — | `createStoreShipment` / `shippingService.createShipment` | **NO order write** | `order.service.ts:1082-1245`; `shipping.service.ts:645-670` |
| — | `persistTrackingResult` (sync + carrier webhooks) | **NO order write** | `shipping.service.ts:858-897` |

Search patterns used: `UPDATE pd_order SET status`, `SET status = 'fulfilled'`, `SET status = 'processing'`, `status = 'shipped'`. A grep for `'processing'` across `backend/src` returns only AI-job/outbox/analytics usages — never `pd_order`.

---

## 4. API surface (order process only)

| Method & path | Auth | Service call | Notes |
|---------------|------|--------------|-------|
| `POST /api/pd/orders/checkout` | `requireAuth` | `checkout()` | Idempotency-Key optional |
| `POST /api/pd/orders/storefront/checkout` | `requireStorefrontCustomer` | `checkout()` | Idempotency-Key **mandatory** |
| `GET /api/pd/orders/me` / `storefront/me` | customer | `listByCustomer` / `listByStorefrontCustomer` | |
| `GET /api/pd/orders/store` | `requireStore` | `listByStore` | **returns NO `items`** (Bug #3 prerequisite) |
| `GET /api/pd/orders/store/:id` | `requireStore` | `getStoreOrderDetail` | returns `items` via LATERAL aggregation |
| `POST /api/pd/orders/store/:id/shipments` | `requireStore` | `createStoreShipment` | label/expédition path (Bug #1 Path B) |
| `POST /api/pd/orders/:id/fulfill` | `requireStore` | `fulfill` | manual ship path (Bug #1 Path A) |
| `POST /api/pd/orders/:id/deliver` | `requireStore` | `markStoreFulfillmentDelivered` | optional delivery proof |
| `POST /api/pd/orders/:id/fulfillment/cancel` | `requireStore` | `cancelStoreFulfillment` | |
| `PUT /api/pd/orders/:id/cancel` | `requireAuth` | vendor→store-scope cancel; buyer/admin→whole order | |
| `POST /api/pd/orders/store/:id/refunds` | `requireStore` | `requestStoreRefund` | |
| `POST /api/pd/orders/store/:id/refunds/:refundId/process` | `requireStore` | `processStoreRefund` | **seller self-processing** (F-6) |
| `POST /api/pd/orders/store/:id/cod-verify` / `cod-otp/send` / `cod-otp/verify` | `requireStore` | COD risk & OTP | |
| `POST /api/pd/orders/store/:id/rto` | `requireStore` | `markStoreFulfillmentRto` | |
| `GET|POST /api/pd/orders/store-settlements` / `store/:id/settlement` | `requireStore` | courier settlement ledger | |
| `PATCH /api/pd/seller/orders/:id/fulfill` | `requireStore` | `fulfill` | duplicate of Path A (drift risk, F-9) |
| `GET /api/pd/seller/orders` / `:id` / `invoice.pdf` / `packing-slip.pdf` | `requireStore` | list/detail/PDFs | |

Source: `backend/src/api/order.route.ts`, `backend/src/api/seller.route.ts`.

---

## 5. Events & background workers

| Event / worker | Producer | Consumer | Status |
|----------------|----------|----------|--------|
| `ORDER_PLACED` | checkout | `order.subscriber.ts` — vendor + customer notifications, WhatsApp | ✅ wired |
| `PAYMENT_CAPTURED` | `payment.service.ts:1002`, `payment.route.ts:615` (mandat approve), `order.service.ts:1756` (COD delivery), `payment-reconciliation.service.ts:353` | wallet `creditPending` per store (commission + retention), serial-key assignment, notifications | ✅ wired, idempotent per order |
| `ORDER_FULFILLED` | **NONE — zero emitters in the codebase** | buyer "Commande expédiée" notification + `order_shipped` email + WhatsApp tracking | ❌ **dead listener (F-1)** |
| `ORDER_REFUNDED` / `PAYMENT_REFUNDED` | `processStoreRefund` | subscribers | ✅ wired |
| Shipment reconciliation | BullMQ repeatable sweep + per-label jobs (`shipment-reconciliation-queue.ts`) | `syncShipment` → `persistTrackingResult` | ✅ runs in `main.ts` & `worker.ts`; never touches `pd_order` |
| Payment reconciliation | repeatable sweep | late capture → `markPaidInTransaction` | ✅ |
| Payout worker | wallet balances | seller payouts | adjacent, consistent |

---

## 6. Frontend label mappings (`frontend/src/i18n/messages/fr.json` → `dashboardPages.orders`)

| i18n key | French | Used for |
|----------|--------|----------|
| `pending` | "En attente" | order status `pending` |
| `paymentRequired` | "Paiement requis" | order status `payment_required` |
| `confirmed` | "Confirmée" | order status `processing` (dead state) |
| `shipped` | "Expédiée" | order status `fulfilled` **and** fulfillment status `shipped` |
| `delivered` | "Livrée" | both layers |
| `cancelled` | "Annulée" | both layers |
| `toShip` | "À expédier" | fulfillment `pending` |
| `notFulfillable` | "Non expédiable" | missing fulfillment |
| `storeItems` | "Articles de la boutique" | drawer section heading |
| `itemsDetailUnavailable` | "Détail des articles indisponible" | empty items fallback |
| `timelinePreparation` / `…Ready` / `…Waiting` | "Préparation" / "Colis préparé" / "En attente de préparation" | timeline step 3 |
| `markShipped` | "Marquer expédiées" | bulk action |
| `generateLabel` / `openLabel` | "Générer l'étiquette" / "Ouvrir l'étiquette" | expédition actions |
| `markDelivered` | "Marquer comme livrée" | delivery action |

Frontend gating functions (`frontend/src/app/hub/dashboard/orders/page.tsx:1102-1111`):
```ts
canFulfill(o)                  = o.fulfillment_status === 'pending' && !['fulfilled','delivered','cancelled'].includes(o.status)
canMarkDelivered(o)            = o.fulfillment_status === 'shipped' && !['delivered','cancelled'].includes(o.status)
canCancelSellerFulfillment(o)  = o.fulfillment_status === 'pending' && !['fulfilled','delivered','cancelled','refunded'].includes(o.status)
canGenerateLabel(o)            = Boolean(o.fulfillment_id && o.shipping_address && !['delivered','cancelled'].includes(o.fulfillment_status || ''))   // page.tsx:1004
```

Timeline derivation (`page.tsx:1128-1131`) — note `fulfillment_status === 'pending'` counts as **prepared** (Bug #2 / F-4):
```ts
const isProcessing = ['processing','fulfilled','delivered'].includes(order.status)
                  || ['pending','shipped','delivered'].includes(order.fulfillment_status || '');
```
