# 04 — P2 Medium / Hygiene Findings (merged)

Grouped by area. Cheap fixes; several directly affect perceived dashboard quality.

---

## A. Seller dashboard UI (`frontend/src/app/hub/dashboard/orders/page.tsx`)

| ID | Finding | Location | Found by |
|----|---------|----------|----------|
| P2-1 | Timeline "Préparation" shows "Colis préparé" for every order with a fulfillment row (auto-done at creation) — wrong derivation, covered by Symptom 2 RC-2.2 | 1129, 1153-1157 | A + B (F-4) + C |
| P2-2 | `fulfillmentColor('delivered')` returns amber instead of green (copy-paste from `pending` case); order-level `getStatusColor('delivered')` is correctly green | 1096 | A |
| P2-3 | COD Radar tab, RTO tab, and the COD drawer card are hardcoded French, bypassing i18n (breaks ar/en locales) | 2884-3218, 3598-3730+ | A |
| P2-4 | Duplicate `OrderItem` interface (correct at 29-47; leftover note-shaped duplicate at 140-148) — declaration merging masks the paste error; `tsc` passes misleadingly | 29-47, 140-148 | A + C |
| P2-5 | Detail drawer: brief "Détail des articles indisponible" flash while loading (row set before fetch); on fetch error keeps the stale item-less row instead of a load-error state | 1596-1617, 3514-3546 | A + B (defect 3) + C (stale flash) |
| P2-6 | COD risk score: null → fake fallback 35 in two places, while `getOrCreateCodVerification` computes a real score only on first cod-verify action — orders never opened via cod-verify show 35 forever | 2963, 3605 vs order.service.ts:2355-2382 | A |
| P2-7 | COD `payment_required` label reads "Paiement requis" to sellers though nothing is required from the buyer pre-delivery — seller-facing semantics need a distinct mapping (e.g., "À confirmer (COD)") | statusLabel 305-315 | A (+B F-3 adjacent) |
| P2-8 | No multi-vendor hint: order-level badge waits on other vendors with zero explanation ("En attente de N autre(s) boutique(s)" subtitle needed in table + drawer) | 2752-2757 | A (+B reproduction note) |
| P2-9 | CSV export and bulk print iterate list rows which have no `items` → invoices/delivery slips show the "indisponible" row unless each order was opened first | 1878-1938, 1956-1958, 487-520 | A (+B print note) |
| P2-10 | Raw English shipment status chips untranslated in a French UI (`created`, `in_transit`, `out_for_delivery`…) | 3860 | B (F-8) |
| P2-11 | `canFulfill`/`canCancelSellerFulfillment` gate on order-level status → cross-store dead-end (Symptom 2 RC-2.4) | 1102-1111 | B |

## B. Backend behavior

| ID | Finding | Location | Found by |
|----|---------|----------|----------|
| P2-12 | `createStoreShipment` returns the latest existing shipment **regardless of status** — a cancelled label is returned forever as "Ouvrir l'étiquette" with no regeneration path | 1135-1143 | B (F-7) |
| P2-13 | Duplicate fulfill endpoints: `PATCH /api/pd/seller/orders/:id/fulfill` (seller.route.ts:229-253) duplicates `POST /orders/:id/fulfill`, responds `{status:'fulfilled'}` although it only ships the fulfillment, and — **verified during merge** — takes a divergent body param `carrier_name` vs `carrier` (drift already happened) | seller.route.ts:229-253 | B (F-9) + merge verification |
| P2-14 | Summary counters and filters encode `fulfilled = shipped` semantics — must be revisited together with any status-semantics change (P1-7) | order.service.ts:1540-1543; page.tsx:2467 | B (F-11) |
| P2-15 | **Invalid status literals in SQL**: queries reference order statuses that don't exist — `'paid'`, `'shipped'` (buyer-interest.service.ts:143; store-subscription.service.ts:62; seller-broadcast.service.ts:461) and `'completed'` (analytics.service.ts:2452). Harmless dead literals today but they silently exclude nothing while misleading maintainers about the status domain | see cited lines | **Found during this merge** |
| P2-16 | COD OTP send has no rate limit and no expiry on the code (operational half of P1-2) | order.service.ts:2418-2457 | A |
| P2-17 | `listByStore` runs three heavyweight queries sharing the same WHERE (rows + count + summary) on every page load; `getStoreOrderDetail` is heavy enough to deserve a short-TTL drawer cache | 1362-1610, 919-1055 | A (hygiene) |

## C. Buyer-side & testing

| ID | Finding | Location | Found by |
|----|---------|----------|----------|
| P2-18 | Buyer order page renders the same raw (desynced) `order.status` — buyer sees "En attente" for paid+shipped orders | hub/orders/page.tsx:262-263 | B |
| P2-19 | `backend/src/__tests__/seller-orders.test.ts` mocks `listByStore` returning rows **with** `items` — the mock encodes a contract the implementation never had; no test can catch the Bug-3 class. Should assert real SQL output via integration test | :47, :71 | B (defect 4) |
| P2-20 | Mandat-receipt rejection resets `payment_status='payment_required'` (refund reject path) — semantics edge worth a regression test when touching markPaid | payment.route.ts:617-622 | B (writer map) |

---

## Fix batching recommendation

- **UI batch** (one PR): P2-1 (with Guide D), P2-2, P2-5 (Guide D step 2), P2-8, P2-10, P2-11 (Guide K).
- **Backend batch**: P2-12, P2-13, P2-14 (with P1-7 work), P2-15, P2-16 (with Guide I).
- **Cleanup batch**: P2-3 (i18n sweep), P2-4 (delete duplicate interface + `tsc`), P2-6, P2-7, P2-9 (Guide L), P2-19 (test contract).
- P2-17, P2-18, P2-20: opportunistic / with their adjacent features.
