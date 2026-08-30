# 04 — P2 Medium / Hygiene Issues

Lower severity, but cheap to fix and they directly affect the perceived quality of the seller dashboard.

---

## P2-1 — Timeline "Préparation" computation is wrong (shows done at order creation)

**Location**: `frontend/src/app/hub/dashboard/orders/page.tsx:1129`, `1153-1157`.
`isProcessing` includes `fulfillment_status === 'pending'`, so a brand-new order renders "Colis préparé" (done) before the seller did anything. Correct semantics: Preparation should be `current` while awaiting shipment, `done` once shipped. (See symptom 2 analysis in doc 01.)

## P2-2 — `fulfillmentColor('delivered')` returns amber instead of green

**Location**: `page.tsx:1096` — `case 'delivered': return 'bg-amber-50 text-amber-700 border-amber-200';` while the order-level `getStatusColor('delivered')` (line 299) correctly returns green. The fulfillment column shows delivered orders in amber (warning color). Copy-paste from the `pending` case.

## P2-3 — COD Radar / RTO / COD drawer cards are hardcoded French, bypassing i18n

**Locations**: `page.tsx:2884-3218` (COD Radar tab: "Total Commandes COD", "En Attente de Confirmation", "Aucune commande avec paiement à la livraison (COD) pour le moment." ...), `3598-3730+` (drawer COD card: "Diagnostic Risque COD & Pré-Validation", "Risque Élevé/Modéré/Faible", "Actions de Confirmation Téléphonique", "Appeler le Client", "WhatsApp 1-Clic", ...), RTO tab labels (`getRtoLabel`). The rest of the page is fully i18n'd via `t()` — these blocks break the ar/en locales.

## P2-4 — Duplicate `OrderItem` interface (declaration merging masks a paste error)

**Location**: `page.tsx:29-47` (correct, full shape) and `page.tsx:140-148` (leftover duplicate shaped like a note: `body`, `created_by`, `updated_by`). TypeScript merges the two declarations, so `tsc --noEmit` passes (verified), but the second block is dead weight and actively misleading — it looks like someone pasted `SellerOrderNote` over `OrderItem`. Delete lines 140-148.

## P2-5 — Detail drawer shows a flash of "Détail des articles indisponible" while loading

**Location**: `page.tsx:1596-1617` — `openOrderDetail` first `setSelectedOrder(order)` (list row, no items) then replaces with the fetched detail. During the fetch the items card renders the "unavailable" fallback. Gate on the existing `loadingOrderDetail` state (skeleton instead of the misleading message). Related: on fetch error the stale row persists (see doc 01, root cause 3.2).

## P2-6 — COD risk score fallbacks diverge between list view and drawer

**Location**: `page.tsx:2963` (COD tab) and `3605` (drawer) both default the score to 35 when `cod_risk_score` is null, but `getOrCreateCodVerification` (order.service.ts:2355-2382) computes a real score on first read. Orders never opened through a cod-verify action keep showing the fake 35 forever. Prefer computing the risk lazily server-side in `listByStore` for COD orders (or storing it at checkout).

## P2-7 — COD order status label is semantically wrong for sellers

For COD, initial status is `payment_required` ("Paiement requis") — but nothing is actually required from the buyer before delivery; the seller-facing meaning is "awaiting preparation/confirmation". Consider a seller-side label mapping (e.g., "À confirmer (COD)") without changing the enum.

## P2-8 — `sendCodOtp` has no rate limit and no expiry

Covered under P1-2 but listing the operational aspects here: `POST /store/:id/cod-otp/send` can be spammed (generates a new code each time, each written to logs); `otp_sent_at` is stored but never checked in `verifyCodOtp`.

## P2-9 — CSV export / print documents depend on `order.items` from list rows

`exportFilteredOrders()` (page.tsx:1878-1938) and bulk print (1956-1958) iterate `orders` (list rows). List rows have no `items`, so invoices/delivery slips generated from the table show the "Détail des articles indisponible" row (page.tsx:520) unless each order was opened first. Same root pattern as symptom 3 — the fix in Guide D should include fetching details before export/print.

## P2-10 — Minor: multi-vendor orders lack an aggregate hint

No UI hint explains that the order-level status waits on other vendors (production is full of 2-vendor orders). See doc 01 root cause 1.3. A tooltip/subtitle like "En attente de 1 autre boutique" on the status badge resolves the confusion without backend changes.

## P2-11 — Hygiene notes

- `getStoreOrderDetail` LEFT JOINs `pd_store s ON s.id = $2` regardless of order contents — harmless but noisy; the query is also large enough that caching (per order+store, short TTL) would help the drawer.
- `listByStore` runs 3 heavyweight queries per page load (rows + count + summary with the same WHERE) — acceptable now, worth batching later.
- `interface OrderItem` in the drawer render uses `item.product_title` etc. which exist only thanks to declaration merging (P2-4) — after deleting the duplicate, confirm the correct interface carries all rendered fields (`id`, `product_id`, `variant_id`, `product_title`, `quantity`, `unit_price`, `subtotal`, `product_type`, `thumbnail`, `slug`, `variant_sku`, `variant_title`, `bundle_items`) — it does (page.tsx:29-47).
- `logger.info` in `sendCodOtp` logs the OTP (P1-2) — also violates the "never log secrets" rule.
