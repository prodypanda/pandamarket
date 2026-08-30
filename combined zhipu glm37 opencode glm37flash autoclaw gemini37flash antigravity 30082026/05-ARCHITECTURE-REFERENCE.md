# 05 — Canonical Order Architecture Reference (merged)

Single source of truth for the order domain **as built at commit `7141e9f`**. Merges Audit B's architecture reference, Audit C's architecture/financial breakdown, and Audit A's flow audit. All line numbers re-verified.

---

## 1. Domain model

```
pd_order (master, payment lifecycle)
  ├── pd_order_item      (1 per line; carries store_id → multi-vendor splitting)
  ├── pd_fulfillment     (1 per store per order — the seller's work unit, created at checkout)
  │     └── pd_shipment  (carrier label; 0..1 per fulfillment in practice)
  ├── pd_store_order_note / pd_store_order_refund / pd_store_delivery_proof
  ├── pd_courier_settlement (COD cash reconciliation per store)
  └── pd_payment_attempt / pd_payment_event (capture idempotency)
```

Key columns:
- `pd_order.status` VARCHAR(30) default `pending` (001_initial_schema.sql:188): `payment_required | pending | processing | fulfilled | delivered | cancelled | refunded`.
- `pd_order.payment_status` VARCHAR(20) (001:192): `pending | captured | failed | refunded`.
- `pd_fulfillment.status` VARCHAR(20) default `pending` (001:239, **no CHECK constraint**): `pending | shipped | delivered | cancelled`.
- `pd_shipment.status` (003_shipping_and_digital.sql): `created → picked_up → in_transit → out_for_delivery → delivered`, plus `returned`, `cancelled`.
- Later ALTERs add: `storefront_customer_id`, `idempotency_key` (unique partial index), `quote_id`/`quote_version`, `payment_capability_version`, `gross_subtotal`, `discount_total`, `tax_total`, `coupon_code`, `discount_breakdown`, `quote_snapshot`; RTO fields on `pd_fulfillment`.

## 2. The four state machines (as implemented)

```
pd_order.status            payment_required → pending → (processing: DEAD) → fulfilled → delivered
                                 └──────────────→ cancelled / refunded
pd_order.payment_status    pending → captured (online webhook / mandat approve / COD at full delivery) → refunded
pd_fulfillment.status      pending → shipped → delivered        └→ cancelled (cancel / RTO / carrier returned)
pd_shipment.status         created → picked_up → in_transit → out_for_delivery → delivered | returned | cancelled
```

**Coupling rules that exist** (complete verified writer map for `pd_order.status`):

| # | Writer | Transition | Location |
|---|--------|-----------|----------|
| 1 | `checkout` | insert `payment_required` (COD/mandat) or `pending` (online) | order.service.ts:669-673, 682-712 |
| 2 | `markPaidInTransaction` | `payment_required → pending`; → `fulfilled` iff no pending fulfillment (⚠ P1-6: even with zero shipped) | 2216-2237 |
| 3 | `fulfill()` | → `fulfilled` iff zero pending fulfillments order-wide | 1633-1644 |
| 4 | `markStoreFulfillmentDelivered` | → `delivered` iff no active fulfillments and ≥1 delivered; captures COD | 1735-1750 |
| 5 | `cancelStoreFulfillment` | → `cancelled` / `delivered` / `fulfilled` per remaining counts | 1803-1838 |
| 6 | `processStoreRefund` | → `refunded` iff cumulative processed refunds ≥ order total | 1995-2007 |
| 7 | `cancel()` | → `cancelled` (⚠ P0-4: ignores fulfillment state) | 2041-2086 |
| 8 | mandat receipt reject | resets `payment_status` (not status) | payment.route.ts:617-622 |
| — | **createShipment (label path)** | **NOTHING** | shipping.service.ts:645-670 |
| — | **persistTrackingResult (carrier sync/webhooks)** | **NOTHING** | shipping.service.ts:882-897 |

## 3. API surface (order domain)

| Method & path | Auth | Service | Notes |
|---|---|---|---|
| `POST /orders/checkout` | `requireAuth` | `checkout()` | Idempotency-Key optional |
| `POST /orders/storefront/checkout` | `requireStorefrontCustomer` | `checkout()` | Idempotency-Key **mandatory** |
| `GET /orders/me` / `storefront/me` / `storefront/:id` | customer | list/detail | ownership-checked |
| `GET /orders/store` | `requireStore` | `listByStore` | **no `items`** (Symptom 3 prerequisite); filters + summary KPIs |
| `GET /orders/store/:id` | `requireStore` | `getStoreOrderDetail` | full row incl. items LATERAL, note, refunds, shipments, COD verification, settlement |
| `PUT /orders/store/:id/note` | `requireStore` | `upsertStoreOrderNote` | |
| `POST /orders/store/:id/shipments` | `requireStore` | `createStoreShipment` | label path (P0-1) |
| `POST /orders/:id/fulfill` | `requireStore` | `fulfill` | manual ship path |
| `POST /orders/:id/deliver` | `requireStore` | `markStoreFulfillmentDelivered` | optional proof; COD capture |
| `POST /orders/:id/fulfillment/cancel` | `requireStore` | `cancelStoreFulfillment` | per-store cancel + restock |
| `PUT /orders/:id/cancel` | `requireAuth` | vendor→store-scope; buyer/admin→whole order | ⚠ P0-4 |
| `POST /orders/store/:id/refunds` + `/:refundId/process` | `requireStore` | request/process | ⚠ P0-5, P1-5 |
| `POST /orders/store/:id/cod-verify` / `cod-otp/send` / `cod-otp/verify` | `requireStore` | COD risk & OTP | ⚠ P1-2 |
| `POST /orders/store/:id/rto` | `requireStore` | `markStoreFulfillmentRto` | ⚠ P1-1 |
| `GET/POST /orders/store-settlements` / `store/:id/settlement` | `requireStore` | courier ledger | |
| `PATCH /seller/orders/:id/fulfill` | `requireAuth+Store` | `fulfill` | **duplicate** of fulfill; body `carrier_name` (⚠ P2-13) |
| `GET /seller/orders` / `:id` / `invoice.pdf` / `packing-slip.pdf` | `requireStore` | list/detail/PDFs | |

`requireStore` resolves store: `pd_selected_store_id` cookie (ownership-validated) → JWT `store_id` (ownership-validated) → first owned store. Every store query is tenant-isolated via `EXISTS (SELECT 1 FROM pd_order_item WHERE order_id=… AND store_id=$n)`.

## 4. Events & workers

| Event | Emitters (verified) | Subscribers | Status |
|---|---|---|---|
| `ORDER_PLACED` | **NONE** | customer confirm (email+in-app+WhatsApp), vendor alert (notification+socket+email), ERP/POS webhooks, stock-low alerts, `orders_created` metric | ❌ **dead** (P0-2) |
| `ORDER_FULFILLED` | **NONE** | buyer "Commande expédiée" (notification+email+WhatsApp), vendor webhooks | ❌ **dead** (P0-3) |
| `PAYMENT_CAPTURED` | payment.service.ts:1002; payment.route.ts:615 (mandat approve); order.service.ts:1756 (COD delivery); payment-reconciliation.service.ts:353 | wallet `creditPending` per store (commission + retention), serial assignment, notifications, analytics | ✅ wired, idempotent per order |
| `ORDER_REFUNDED` / `PAYMENT_REFUNDED` | processStoreRefund | subscribers | ✅ wired |
| `PRODUCT_PUBLISHED`, `STOCK_LOW`, `AI_JOB_*`, `WALLET_*` | various | various | ✅ |

Workers (all running in `main.ts` and/or `worker.ts`): email, webhook, AI, payout, search, subscription, notification-batch, daily-digest, payment-reconciliation, **shipment-reconciliation** (sweeps `next_sync_at <= NOW()` → `persistTrackingResult` — the P0-1 carrier path), image, outbox.

## 5. Money flow (merged from Audit C)

```
Buyer pays total = Σ items + Σ shipping (per store, flat 7 TND fallback; combined rebate −3 TND per extra store)
  → platform receives total
  → on PAYMENT_CAPTURED: per store creditPending( SUM(items.subtotal) − commission(plan) )   ← ⚠ P0-6: shipping NOT credited
     retention days: flouci 3 / konnect 3 / mandat 1 / cod 7 (platform-configurable)
     payout worker releases pending → available after retention; withdrawals need superadmin review
Commission: Free plan 15%, all paid plans 0%
COD: courier collects cash; pd_courier_settlement tracks collected_amount − courier_fee = net_payout
Refund: debitRefund(full amount)                                                               ← ⚠ P0-5: gross-vs-net
```

## 6. Frontend label mappings (fr.json → `dashboardPages.orders`)

`pending`="En attente" · `paymentRequired`="Paiement requis" · `confirmed`="Confirmée" (dead `processing`) · `shipped`="Expédiée" (both layers) · `delivered`="Livrée" · `cancelled`="Annulée" · `toShip`="À expédier" · `notFulfillable`="Non expédiable" · `storeItems`="Articles de la boutique" · `itemsDetailUnavailable`="Détail des articles indisponible" · `timelinePreparation`/`…Ready`/`…Waiting`="Préparation"/"Colis préparé"/"En attente de préparation".

Gating functions (page.tsx:1003-1111):
```ts
canGenerateLabel(o)          = fulfillment_id && shipping_address && !['delivered','cancelled'].includes(fulfillment_status)
canFulfill(o)                = fulfillment_status==='pending' && !['fulfilled','delivered','cancelled'].includes(status)   // ⚠ order-level gate (P2-11)
canMarkDelivered(o)          = fulfillment_status==='shipped' && !['delivered','cancelled'].includes(status)
canCancelSellerFulfillment(o)= fulfillment_status==='pending' && !['fulfilled','delivered','cancelled','refunded'].includes(status)
```

## 7. Intended (canonical) state machine after fixes

```
payment_required (COD/mandat) ──markPaid──> pending/processing* ──all shipped──> fulfilled ──all delivered──> delivered
                                                │ *processing = derived: any fulfillment 'preparing'
pending (online) ──markPaid──> pending ──any store prepares──> processing (derived display state)
any ──buyer/admin cancel──> cancelled      [BLOCKED once any fulfillment shipped/delivered — P0-4 fix]
all-vendor refunds ≥ total ──> refunded
COD delivered (manual OR carrier) ──> captured + PAYMENT_CAPTURED + wallet credit
```

## 8. Verified-solid (do not regress)

- Checkout idempotency: advisory-lock serialization per key + partial unique index + `ON CONFLICT DO NOTHING` replay + binding assertions; deterministic product/variant lock ordering (deadlock-free).
- Guarded atomic stock decrements (product/variant/bundle components) with `FOR UPDATE SKIP LOCKED` serial assignment; `checkout-concurrency.test.ts` covers races.
- Payment-webhook idempotency (`pd_payment_event` hash dedup; `PAY_ALREADY_CAPTURED` typed conflict).
- Wallet credit idempotency per order (existing `sale` transaction guard), commission by plan, per-gateway retention.
- Tenant isolation everywhere (`EXISTS` guards + `resolveSellerStoreId` ownership).
- Carrier adapter architecture: per-carrier adapters + simulation fallback (production runs simulated Aramex labels), signature-verified webhooks, provider-event dedup, `next_sync_at` reconciliation sweep, carrier-side compensation on persist failure.
- The manual delivery path `markStoreFulfillmentDelivered` — the one complete, correct fulfillment flow; generalize it rather than reinvent.
- Multi-vendor model coherence: per-store fulfillments, refunds, settlements, isolation.
