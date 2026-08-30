# 07 — What Works Well (Preserve While Fixing)

The checkout/order core was clearly hardened through several dedicated passes (idempotency, quote contracts, payment capabilities). When implementing the fixes in doc 09, do NOT regress any of the following — they are the strongest parts of the codebase.

---

## 1. Checkout idempotency & concurrency safety (`order.service.ts:checkout`)

- **Advisory-lock serialization** for same idempotency key (410-413) closes the double-checkout race before any row is touched; combined with `ON CONFLICT (idempotency_key) DO NOTHING` INSERT (688) + post-insert replay (714-723) + binding assertion (882-895, rejects key reuse across customers/quotes/gateways).
- **Deterministic lock ordering**: products then variants, both `ORDER BY id FOR UPDATE` (453-469) — deadlock-free under multi-tab checkout.
- **Quote concurrency**: `lockForCheckout` + ORDER_QUOTE_STALE conflict mapping, with the elegant replay-when-concurrent-sibling-committed path (432-450).

## 2. Stock & digital asset integrity

- Guarded atomic decrements (`WHERE inventory_quantity >= qty RETURNING`) for products AND variants — no negative stock even under races.
- **Bundle stock handling**: component-level validation AND component-level decrement (both directions: restore path too, 289-332).
- **Serial keys**: `FOR UPDATE SKIP LOCKED` assignment at checkout (824-845) + idempotent finalization on payment capture (`assignSerialLicenseKeys`, order.subscriber.ts:308-364) + freeing rules in cancel paths.
- Refund/cancel restock **where implemented correctly** (`restoreOrderItemStock`) handles bundles + variants — the fix in Guide F should simply reuse it.

## 3. Tenant isolation

- Every seller order query is scoped by `EXISTS (SELECT 1 FROM pd_order_item WHERE order_id = ... AND store_id = $n)` — list, detail, note, refund, shipment, RTO, settlement: all verified.
- Customer routes check ownership (`customer_id` / `storefront_customer_id`); `GET /:id` implements customer/vendor/admin triage (order.route.ts:356-374).
- `requireStore` validates store ownership against the user on EVERY request (cookie switch, JWT claim, or first-owned fallback — middlewares/index.ts:237-301) — no trust in client-supplied store ids.

## 4. Money handling

- `roundTnd` consistently applied on every derived amount; per-store shipping allocation with the last-store-remainder technique avoids rounding drift (checkout-quote.service.ts:586-591).
- Commission/net split via subscription plan limits with wallet retention days per gateway (order.subscriber.ts:191-235).
- Refund request guards: captured-only + cumulative-vs-store-total cap (order.service.ts:1879-1903).

## 5. Payment state machine

- `markPaidInTransaction` idempotency (payment_status guard + FOR UPDATE re-read + typed conflict with details) — webhook replay safe.
- `cancelUnstartedPaymentOrder` compensation: row lock, fulfillment-started guard, active payment-attempt guard, failed-reference clearing — the model implementation that P0-4's fix should copy.

## 6. Carrier integration architecture (shipping.service.ts)

- Adapter pattern per carrier + simulation fallback (keeps dev/prod usable without real carrier accounts — production currently runs on simulated Aramex labels).
- Reconciliation ledger (`pd_shipment_reconciliation`) with retry/backoff and `next_sync_at` scheduling; running worker; carrier webhook ingestion with provider-event dedup (`ON CONFLICT (shipment_id, provider_event_id) DO NOTHING`).
- Compensation: DB-persist failure -> adapter `cancelShipment` attempt (693-699).

## 7. Frontend order dashboard (the good parts)

- Massive feature coverage (filters + presets + saved column layouts, CSV export, invoice/delivery-slip/shipping-label print documents with escapeHtml discipline, bulk fulfill, delivery proofs with file validation, note editing, refund workflow, COD radar, RTO tab, settlement ledger) — the bones are excellent; the defects are the wiring documented in doc 01/04.
- `fetchWithCsrf` (frontend/src/lib/api.ts:115-146): silent 401 -> session refresh -> retry, storefront-aware — robust against token expiry mid-dashboard.
- Correct detail-fetch pattern exists and works (main table `openOrderDetail`) — the COD/RTO fix is a two-line adoption of it.

## 8. Event bus & subscriber hygiene (for the events that DO fire)

- `PAYMENT_CAPTURED` subscribers are idempotent (wallet-transaction existence check) — the pattern ORDER_PLACED/ORDER_FULFILLED emitters should follow.
- Outbox worker + webhook worker + email worker + WhatsApp service all exist and run — emitting the two dead events instantly lights up an entire finished pipeline.

---

## Regression watchlist when fixing

1. Guide A touches `fulfill()` — keep the `status='pending'` guard and the not-in-cancelled/refunded order guard.
2. Guide C touches `persistTrackingResult` — keep event dedup and the `next_sync_at` bookkeeping.
3. Guide D deletes the duplicate `OrderItem` interface — run `tsc --noEmit` (declaration merging currently masks it).
4. Guide F touches `processStoreRefund` — preserve the cumulative-cap check and the whole-order refunded transition.
5. Any change to `listByStore`'s summary WHERE must keep the count/rows/summary queries consistent (they share `where`).
