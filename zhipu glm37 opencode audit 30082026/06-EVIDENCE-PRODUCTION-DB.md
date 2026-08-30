# 06 — Evidence & Production Database Forensics

All queries below were executed READ-ONLY against the live production Supabase PostgreSQL
(`pandamarket-db`, pooler `aws-0-eu-central-1.pooler.supabase.com:6543`) on 2026-08-30,
using the credentials from `REMOTE_CREDENTIALS.md` (owner-authorized for this audit).
Temp scripts were deleted after use; no repo files were touched.

---

## A. Deploy parity — "is what I audited what's running?"

Render API (`GET /v1/services/srv-d9qjrth42hec73efhoa0/deploys?limit=2`):

| Field | Value |
|---|---|
| Service | `pandamarket-backend` (`srv-d9qjrth42hec73efhoa0`) |
| Latest live deploy | `dep-da9akcffdruc739phj0g` — status **live** since 2026-08-29T09:48:10Z |
| Deploy commit | `7141e9f0195bf4c55998f95a8e87302e1e70278f` — "fix(paypal): complete hardening of PayPal webhook routing..." |
| Local repo HEAD | `7141e9f` (2026-08-29 10:44:56 +0100) |

**Conclusion**: local code == deployed backend. Every bug documented in this audit is live.

Vercel frontend deploys from the same GitHub main branch automatically (per REMOTE_CREDENTIALS.md) — same commit.

---

## B. Order/fulfillment status snapshot (20 most recent orders)

Query: last 20 `pd_order` rows LEFT JOIN `pd_fulfillment`, with per-order item counts.

Key rows (order id suffix, statuses, gateway):

| order | order_status | pay_status | gateway | fulfillment | shipped_at | items |
|---|---|---|---|---|---|---|
| DGq97HRZ | pending | captured | paypal | pending / **shipped** (2 stores) | 2026-08-29T22:46 | 8 |
| W8NP54as | pending | captured | paypal | pending x2 | — | 7 |
| 6thmSpQZ | pending | captured | paypal | pending / **shipped** | 2026-08-29T22:44 | 10 |
| ThB55fwJ | cancelled | pending | paypal | cancelled x2 | — | 7 |
| kXeUX75t | payment_required | pending | cod | pending x2 | — | 5 |
| vCzt4t3H | **payment_required** | pending | cod | **shipped** (single) | **2026-08-15T16:20** | 3 |
| kB2SykvE | **payment_required** | pending | cod | **shipped** (single) | **2026-08-15T16:20** | 1 |
| 4Jv9AyVM | payment_required | pending | cod | pending / **shipped** | 2026-08-15T16:22 | 3 |
| Djs4uwPr | payment_required | pending | cod | pending x2 | — | 2 |
| 9WR5KkCM | payment_required | pending | cod | pending (single) | — | 1 |
| n2knp6yd | payment_required | pending | manual_mandat | pending (single) | — | 1 |

**Distributions:**

`pd_fulfillment.status`: pending 20, shipped 7, delivered 1, cancelled 2.
`pd_order` (status, payment_status): payment_required/pending 12; pending/captured 4; fulfilled/pending 2; cancelled/pending 1; delivered/captured 1.

**Reading**: 12 of ~20 recent orders sit in `payment_required` — the COD-heavy reality of this marketplace — and the two Aug-15 carrier-shipped COD orders prove the desync (single fulfillment shipped + order never promoted + payment never captured).

---

## C. The exact detail-endpoint SQL works — backend exonerated for symptom 3

Replayed the items LATERAL subquery of `getStoreOrderDetail` (order.service.ts:1010-1047) verbatim for real order/store pairs:

| order | store (suffix) | items returned |
|---|---|---|
| ...wuKXh67G | ...UBufUDF5ga | 2 |
| ...DGq97HRZ | ...UBufUDF5ga | 4 |
| ...DGq97HRZ | ...eVQfbTDxUj | 4 |

Also verified `pd_product` columns used by the query exist: `weight_grams, digital_file_key, thumbnail, slug`.
And a 10-row sample of `pd_order_item` JOIN `pd_product` — every item's product FK resolves (titles, quantities, prices intact, e.g. "Eau Florale de Rose Pure Disti..." x1 @26.000, "chaussure SPORT CHIC Urbano No..." x1 @128.600).

**Conclusion**: `GET /api/pd/orders/store/:id` returns items correctly in production. The "Détail des articles indisponible" symptom is purely the frontend COD/RTO tab bug (doc 01, root cause 3.1).

---

## D. Mismatch census — the exact rows behind symptom 1

Query: orders with at least one shipped/delivered fulfillment while order status IN (pending, payment_required, processing):

| order | order_status | fulfillment | total fulfillments | still pending | gateway |
|---|---|---|---|---|---|
| DGq97HRZ | pending | shipped | 2 | 1 | paypal |
| 6thmSpQZ | pending | shipped | 2 | 1 | paypal |
| vCzt4t3H | payment_required | shipped | **1** | **0** | cod |
| kB2SykvE | payment_required | shipped | **1** | **0** | cod |
| 4Jv9AyVM | payment_required | shipped | 2 | 1 | cod |

- The two `ful_count=1, ful_pending=0` COD rows are **impossible in a correct state machine** (manual `fulfill()` would have promoted them to `fulfilled`) — direct proof of the carrier-label desync (P0-3), and they are stuck pre-capture forever.
- The three multi-vendor rows are the "by design but unexplained" case (doc 01, 1.3).

## D-bis. Control group — correctly `fulfilled` orders

| order | gateway | fulfillment | carrier | tracking | shipped |
|---|---|---|---|---|---|
| wuKXh67G | paypal | shipped | aramex | PD-MSB2ILZX-UG1S | 2026-08-01 |
| pZRBn8mm | cod | shipped | "hhhh" (manual modal test) | 54245fh | 2026-05-06 |

Both reached `fulfilled` — consistent with the manual `fulfill()` path being the only order-status-syncing path (pZRBn8mm's carrier "hhhh"/tracking "54245fh" is clearly a manual test entry, not a carrier label).

## D-ter. Shipped fulfillments inventory (all 7 + 1 delivered)

| order | status | carrier | tracking | pd_shipment rows |
|---|---|---|---|---|
| pZRBn8mm | shipped | hhhh | 54245fh | 0 (manual) |
| EEjpEuep | delivered | Aramex | 5DF12VF0TN | 0 (manual) |
| wuKXh67G | shipped | aramex | PD-MSB2ILZX-UG1S | 1 |
| vCzt4t3H | shipped | aramex | ARAMEX-TN-76064226 | 1 |
| kB2SykvE | shipped | aramex | ARAMEX-TN-71380627 | 1 |
| 4Jv9AyVM | shipped | aramex | ARAMEX-TN-98744982 | 1 |
| 6thmSpQZ | shipped | La Poste Tunisienne | **NULL** | 0 |
| DGq97HRZ | shipped | La Poste Tunisienne | **NULL** | 0 |

Notes: the "ARAMEX-TN-" prefix pattern = simulation-fallback tracking numbers (shipping.service.ts:618-624 — carriers not configured, `simulationFallback` active in production). The two La Poste rows shipped with NULL tracking (P1-4 family — order status also never promoted, P0-3).

---

## E. Multi-vendor order census

All recent marketplace orders are 2-store orders between "Atelier Médina" and "mejrda" — 10 orders with exactly 2 fulfillments each. Per-store fulfillment state sample:

| order | Atelier Médina | mejrda |
|---|---|---|
| DGq97HRZ | shipped | pending |
| 6thmSpQZ | shipped | pending |
| 4Jv9AyVM | pending | shipped |
| W8NP54as / Djs4uwPr / kXeUX75t / nDp4d8NQ / YymtJ73h / VCucxAK5 | pending | pending |
| ThB55fwJ | cancelled | cancelled |

**Reading**: every seller on this platform currently experiences symptom 1 whenever their co-vendor lags. The UX hint (P2-10) matters as much as the state machine fix here.

---

## F. Git forensics

- `git log -S "ORDER_PLACED" -- backend/src/services/order.service.ts backend/src/api/order.route.ts` -> **empty**: the emission never existed (not a regression — unfinished feature).
- Recent order.service.ts history: a2af1a3 (refunds M-06, 2026-08-27), 1ad5386 (refund state machine B-19), 1235f7a (PAYMENT_CAPTURED wiring P0-02), 898bca6 (checkout idempotency), 088f783 / b88382e / 33e69ed (payments/quotes). The Aug-15 carrier-label orders predate the Aug-20..27 payment/refund hardening waves — the desync class was never touched.
- Commit cadence Aug 18-29 was heavy on storefront/product/payments; order fulfillment state machine untouched since the shipping feature landed (7e6e73b "feat(shipping): add carrier adapters and reconciliation", 2026-08-22) — which introduced `createShipment`'s fulfillment-only update.

---

## G. Reproduce the audit (for future verification)

Read-only re-run template (any Postgres client, e.g. node + pg):

```sql
-- 1) Desync census (should return ZERO rows after Guide A fix + data backfill)
SELECT o.id, o.status, f.status AS ful, COUNT(*) OVER () 
FROM pd_order o JOIN pd_fulfillment f ON f.order_id = o.id
WHERE f.status IN ('shipped','delivered')
  AND o.status IN ('pending','payment_required','processing');

-- 2) Orders whose fulfillments are all terminal but order not terminal
SELECT o.id, o.status,
       COUNT(*) FILTER (WHERE f.status='pending')  AS pend,
       COUNT(*) FILTER (WHERE f.status='shipped')  AS ship,
       COUNT(*) FILTER (WHERE f.status='delivered')AS del
FROM pd_order o JOIN pd_fulfillment f ON f.order_id = o.id
GROUP BY o.id, o.status
HAVING COUNT(*) FILTER (WHERE f.status='pending') = 0
   AND o.status NOT IN ('fulfilled','delivered','cancelled','refunded');

-- 3) COD shipped/delivered but payment_status <> 'captured' (money leak)
SELECT o.id, o.payment_status, f.status
FROM pd_order o JOIN pd_fulfillment f ON f.order_id = o.id
WHERE o.payment_gateway = 'cod'
  AND f.status IN ('shipped','delivered')
  AND o.payment_status <> 'captured';

-- 4) Double-restock detector (sum of restock-relevant refunds per order-item)
SELECT r.order_id, r.store_id, COUNT(*) AS processed_refunds, SUM(r.amount) AS refunded
FROM pd_store_order_refund r
WHERE r.status = 'processed'
GROUP BY 1,2 HAVING COUNT(*) > 1;
```

After implementing the fixes in doc 09, queries 1-3 must return empty (query 2 legitimately non-empty only for mixed-state multi-vendor orders), and the two stuck Aug-15 orders should be backfilled to `fulfilled` (and their COD flow resolved per business decision: delivered-in-transit -> capture on delivery confirmation, or cancel+restock).
