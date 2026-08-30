# 06 — Evidence, Per-Audit Attribution & Conflict Resolution

---

## 1. Deploy parity (Audit A, Render API)

| Field | Value |
|---|---|
| Service | `pandamarket-backend` (`srv-d9qjrth42hec73efhoa0`) |
| Latest live deploy | `dep-da9akcffdruc739phj0g` — **live** since 2026-08-29T09:48:10Z |
| Deploy commit | `7141e9f0195bf4c55998f95a8e87302e1e70278f` ("fix(paypal): …") |
| Local repo HEAD (all three audits) | `7141e9f` |

**Conclusion**: all three audits analyzed identical code, and that code is what runs in production. Every finding is live. Vercel frontend auto-deploys from the same GitHub main branch. (Audit B additionally confirmed the health endpoint `200 {"status":"ok"}`; Audit B could not query production data because credentials were redacted in its copy of REMOTE_CREDENTIALS.md — Audit A had the full credentials, owner-authorized, and used them read-only.)

## 2. Production database forensics (Audit A, read-only, 2026-08-30)

### Status snapshot (20 most recent orders)

`pd_fulfillment.status` distribution: pending 20, shipped 7, delivered 1, cancelled 2.
`pd_order` distribution: payment_required/pending 12 · pending/captured 4 · fulfilled/pending 2 · cancelled/pending 1 · delivered/captured 1.

### Desync census (the exact rows behind Symptom 1)

| order | order_status | fulfillment | ful_count | still pending | gateway |
|---|---|---|---|---|---|
| DGq97HRZ | pending | shipped | 2 | 1 | paypal |
| 6thmSpQZ | pending | shipped | 2 | 1 | paypal |
| vCzt4t3H | payment_required | shipped | **1** | **0** | cod |
| kB2SykvE | payment_required | shipped | **1** | **0** | cod |
| 4Jv9AyVM | payment_required | shipped | 2 | 1 | cod |

The two `ful_count=1, pending=0` COD rows are impossible in a correct state machine → direct proof of P0-1 (label path never promotes the order). Control group: manual-modal orders `...wuKXh67G` (paypal) and `...pZRBn8mm` (cod) correctly `fulfilled`.

### Detail-endpoint exoneration (Symptom 3)

The exact items LATERAL subquery of `getStoreOrderDetail` replayed against production for 3 order/store pairs → 2, 4, 4 items returned correctly. `pd_product` columns verified. Item FKs resolve (10-row sample). **The backend detail endpoint is healthy; Symptom 3 is purely frontend.**

### Multi-vendor census

All 10 recent marketplace orders are 2-store orders (Atelier Médina + mejrda), 2 fulfillments each — every seller currently experiences Symptom 1 whenever the co-vendor lags.

### Carrier-label inventory (all 7 shipped + 1 delivered fulfillments)

Manual rows (0 `pd_shipment`): carrier "hhhh"/"54245fh" (test), "Aramex"/5DF12VF0TN. Carrier rows: 4× aramex "ARAMEX-TN-…" (simulation-fallback pattern — carriers unconfigured in production) + 2× "La Poste Tunisienne" with **tracking NULL** (P1-4 evidence).

### Git forensics

`git log -S "ORDER_PLACED" -- order.service.ts order.route.ts` → **empty** (never existed; unfinished integration). order.service.ts recent history (refunds M-06, refund state machine B-19, PAYMENT_CAPTURED wiring, checkout idempotency, payments/quotes hardening) never touched the fulfillment state machine; the desync class arrived with `7e6e73b feat(shipping): add carrier adapters and reconciliation` (2026-08-22) and was never revisited.

## 3. Cross-audit finding matrix (who found what)

| Finding | A (opencode) | B (autoclaw) | C (gemini) |
|---|---|---|---|
| Symptom 1 root causes (label path / carrier sync / multi-vendor) | ✅ | ✅ | ✅ (UI framing) |
| Symptom 2 (no preparation state; dead `processing`; wrong derivation) | ✅ | ✅ | ✅ |
| Symptom 3 (COD/RTO tabs bypass detail fetch; list has no items) | ✅ | ✅ | ✅ |
| Carrier desync = P0 (never recomputes order) | ✅ | ✅ | — |
| Delivered orders stuck with NO UI repair | — | ✅ | — |
| `ORDER_FULFILLED` never emitted | ✅ | ✅ | — |
| `ORDER_PLACED` never emitted | ✅ | ❌ (said "wired") | — |
| Whole-order cancel unsafe (shipped orders cancellable) | ✅ | — | — |
| Refund double-restock | ✅ | ✅ | — |
| Refund gross-vs-net wallet debit | ✅ | — | — |
| Refund seller-self-processing governance gap | — | ✅ | — |
| **Shipping fee omitted from vendor wallet credit** | — | — | ✅ |
| RTO unguarded | ✅ | — | — |
| COD OTP shown to seller / no SMS | ✅ | — | — (assumed working) |
| Hardcoded `pandamarket.tn` links | ✅ | — | — |
| fulfill() NULL overwrite / non-transactional writes | ✅ | (implicit) | — |
| markPaid → fulfilled without shipment | — | ✅ | — |
| Cancelled labels returned forever (F-7) | — | ✅ | — |
| Untranslated shipment chips (F-8) | — | ✅ | — |
| Duplicate fulfill endpoints + misleading response (F-9) | — | ✅ | — |
| Test mock masks list-items contract (F-10 defect 4) | — | ✅ | — |
| Buyer-side raw status / three contradictory stories | — | ✅ | — |
| Duplicate OrderItem interface | ✅ | — | ✅ |
| Timeline auto-done (F-4) | ✅ | ✅ | ✅ |
| Invalid status literals `'paid'/'shipped'/'completed'` in SQL | **merge** | — | — |
| Duplicate fulfill endpoint body-param drift (`carrier_name` vs `carrier`) | **merge** | — | — |

## 4. Resolved conflicts

| # | Conflict | Positions | Resolution & rationale |
|---|----------|-----------|------------------------|
| 1 | Is `ORDER_PLACED` wired? | B: "✅ wired" · A: dead | **DEAD.** A's evidence is dispositive: repo-wide grep of `eventBus.emit(PdEvent.` → 13 hits, none ORDER_PLACED; `git log -S` → never existed. B's table row was an inference from the subscriber's existence, not from an emitter search. (B's own F-1 correctly applied the emitter-search method to ORDER_FULFILLED.) |
| 2 | Where does "Préparation" live? | C: write `pd_order.status='processing'` from the prepare endpoint · B: fulfillment-level only, "do NOT change pd_order.status" | **Fulfillment-level `'preparing'` is the source of truth** (B's rationale: preparation is per-store; a master-order writer would make multi-vendor orders flap and creates a second aggregate writer — the exact disease P0-1 cures). **Compromise adopted**: order-level `processing` becomes a *derived* state computed by the central recompute helper (any fulfillment `preparing` → order displays `processing`), never written directly by the prepare endpoint. C's migration sketch is unnecessary (VARCHAR column, no CHECK constraint — verified in 001_initial_schema.sql:239) but a hygiene CHECK constraint is optional. |
| 3 | Symptom 1 primary root cause framing | A+B: backend state machine bug · C: UI shows master status as primary | **Both, complementary.** The backend desync is objectively a bug (single-store shipped orders stuck pending — production-proven). The UI presentation issue is real for multi-vendor orders (correct aggregate, misleading as primary). Fix both: Guide A (backend) + Guide K (store-scoped primary status + hint). |
| 4 | Should `listByStore` return `items`? | B: yes (contract fix; test expects it) · A: point fixes suffice; list is intentionally light (noted export/print gap as P2) | **Point fixes first (critical), aggregation second (nice-to-have).** B's contract fix also solves A's P2-9 (CSV/print from list rows) but adds payload cost; gate it behind a payload check (cap/paginate if needed). |
| 5 | Refund restock line numbers | A: 2011-2018 · B: 2009-2015 | Same code block; counting offset. Unified citation: ~2009-2018. |
| 6 | Fulfill route location | B cited order.route.ts:334-348 · A verified 377-389 | A's verified numbers used throughout. |

## 5. Merge verification log (checks performed during THIS merge)

1. `seller.route.ts:229-253` — duplicate PATCH fulfill endpoint confirmed; body takes `tracking_number`/`carrier_name` (divergent from order.route's `carrier`) and responds `{status:'fulfilled'}` → P2-13 confirmed + param drift added.
2. `001_initial_schema.sql:235-251` — `pd_fulfillment.status` VARCHAR(20) DEFAULT 'pending', **no CHECK constraint** → gemini's migration is hygiene-only; autoclaw correct.
3. `seller-orders.test.ts:47,71` — mock returns `items` for list/detail → autoclaw defect 4 confirmed.
4. `hub/orders/page.tsx:262-263` + `hub/checkout/success/page.tsx:198` — buyer-side raw status + "en cours de préparation" copy confirmed.
5. `order.subscriber.ts:200-236` — `SUM(i.subtotal)` only, comment "keep it simple here" → gemini's P0-6 math confirmed (policy decision required).
6. Invalid status literals confirmed: `buyer-interest.service.ts:143` (`'paid','delivered','shipped'`), `store-subscription.service.ts:62` (`'paid','shipped'`), `seller-broadcast.service.ts:461` (`'paid'`), `analytics.service.ts:2452` (`'completed'`) → P2-15.
7. `tsc --noEmit` (frontend) passes — confirming P2-4's declaration-mergeing mask.

## 6. Re-runnable census queries (post-fix verification)

```sql
-- 1) Desync census (must return ZERO rows after Guide A + backfill)
SELECT o.id, o.status, f.status AS ful
FROM pd_order o JOIN pd_fulfillment f ON f.order_id = o.id
WHERE f.status IN ('shipped','delivered')
  AND o.status IN ('pending','payment_required','processing');

-- 2) Terminal-state census (only business-accepted rows post-fix)
SELECT o.id, o.status,
       COUNT(*) FILTER (WHERE f.status='pending') AS pend,
       COUNT(*) FILTER (WHERE f.status='shipped') AS ship,
       COUNT(*) FILTER (WHERE f.status='delivered') AS del
FROM pd_order o JOIN pd_fulfillment f ON f.order_id = o.id
GROUP BY o.id, o.status
HAVING COUNT(*) FILTER (WHERE f.status='pending') = 0
   AND o.status NOT IN ('fulfilled','delivered','cancelled','refunded');

-- 3) COD money leak (must return ZERO rows after Guide C + backfill)
SELECT o.id, o.payment_status, f.status
FROM pd_order o JOIN pd_fulfillment f ON f.order_id = o.id
WHERE o.payment_gateway='cod' AND f.status IN ('shipped','delivered')
  AND o.payment_status <> 'captured';

-- 4) Double-restock detector
SELECT r.order_id, r.store_id, COUNT(*) AS processed_refunds, SUM(r.amount) AS refunded
FROM pd_store_order_refund r WHERE r.status='processed'
GROUP BY 1,2 HAVING COUNT(*) > 1;

-- 5) Shipping-credit audit (after Guide J decision; compare wallet sale tx vs items+shipping)
SELECT o.id, s.id AS store_id,
       SUM(i.subtotal) AS items_total,
       MAX(f.shipping_total) AS shipping,
       (SELECT amount FROM pd_wallet_transaction w
         WHERE w.order_id=o.id AND w.store_id=s.id AND w.type='sale') AS credited
FROM pd_order o
JOIN pd_order_item i ON i.order_id=o.id
JOIN pd_store s ON s.id=i.store_id
LEFT JOIN pd_fulfillment f ON f.order_id=o.id AND f.store_id=s.id
WHERE o.payment_status='captured'
GROUP BY o.id, s.id, f.shipping_total;
```

Backfill note: the two stuck Aug-15 COD orders (`...vCzt4t3H`, `...kB2SykvE`) need a business decision — deliver-confirm → capture (and credit wallets), or cancel+restock. Do not silently auto-promote them.
