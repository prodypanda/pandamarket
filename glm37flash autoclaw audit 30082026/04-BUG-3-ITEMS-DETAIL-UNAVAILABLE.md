# 04 — Bug #3: "Articles de la boutique" shows "Détail des articles indisponible"

**Severity: High for COD/RTO workflows (deterministic), Medium overall**
**Status at commit `7141e9f`: reproduced from code; two deterministic entry points + one failure-mode entry point.**

---

## 1. Symptom

In the seller order drawer, the section headed **"Articles de la boutique"** (`storeItems`, with the red package icon) shows the gray fallback text **"Détail des articles indisponible"** instead of the ordered items — while the order plainly has items (they exist in `pd_order_item` and are visible in the printable invoice).

## 2. The render rule

`frontend/src/app/hub/dashboard/orders/page.tsx:3517-3545`:
```tsx
<h3 …>{t('dashboardPages.orders.storeItems')}</h3>
…
{(selectedOrder.items || []).length > 0 ? (
  selectedOrder.items?.map((item) => (…))
) : (
  <p …>{t('dashboardPages.orders.itemsDetailUnavailable')}</p>
)}
```
`itemsDetailUnavailable` = "Détail des articles indisponible" (`fr.json:609`). The same fallback is used by the printable invoice / bon-livraison HTML builder (`page.tsx:513-521`), so printing from an affected entry point also shows the empty row.

## 3. Where `items` can and cannot come from

| Source | Contains `items`? | Evidence |
|--------|-------------------|----------|
| `GET /api/pd/orders/store/:id` → `getStoreOrderDetail` | **Yes** — LATERAL `json_agg` over `pd_order_item` filtered by the seller's `store_id`; also 404-guards on item existence | `order.route.ts:231-236`; `order.service.ts:919-1055` (items LATERAL ~998-1040) |
| `GET /api/pd/orders/store` (list) → `listByStore` | **No** — the SELECT aggregates only totals/fulfillment/customer fields, no item aggregation | `order.service.ts:1362-1600` (SELECT ~1489-1510) |
| Bulk/manual fulfill responses | No items | `order.route.ts:334-348` returns `{success:true}` |

So the drawer only has items **after** a successful detail fetch replaces the row.

## 4. The defects

### Defect 1 — COD table opens the drawer without fetching details
`page.tsx:2971-2973` (COD management tab):
```tsx
<button type="button"
  onClick={() => { setSelectedOrder(order); }}   // ← list row: no items, no fetch
  className="font-black text-slate-900 …">
  #{order.id.slice(-8).toUpperCase()}
</button>
```
Every order opened from the COD tab shows "Détail des articles indisponible" **every time**, plus empty customer stats (same fields are list-missing).

### Defect 2 — RTO table, same pattern
`page.tsx:3203-3206` ("Voir Fiche" button): `onClick={() => { setSelectedOrder(order); }}` — identical consequence for every RTO order.

### Defect 3 — Fetch failure degrades to the wrong state
`openOrderDetail` (`page.tsx:1596-1616`) sets the (items-less) row first, then fetches; on `!res.ok` it shows the error banner but **keeps the items-less row** as `selectedOrder`. The section then reads as "no data" instead of "failed to load". Network errors behave the same.

### Defect 4 — The test suite masks the contract gap
`backend/src/__tests__/seller-orders.test.ts` mocks `listByStore` returning rows **with** `items`:
```ts
data: [{ id:'ord_1', …, items: [{ title:'Artisan Vase', quantity:2, unit_price:40 }] }]
```
The real implementation never returns items, so the mock encodes a contract that does not exist — no test can catch Bug #3.

## 5. Fix directions (details in `06-FIX-PLAN`)

1. **Point fixes (minimal):** replace both `onClick={() => { setSelectedOrder(order); }}` with `onClick={() => void openOrderDetail(order)}` (COD tab `page.tsx:2972`, RTO tab `page.tsx:3205`). The detail endpoint is already tenant-scoped and returns everything the drawer needs.
2. **Contract fix (recommended, also future-proofs the print builder):** add the same store-filtered items LATERAL aggregation to `listByStore`'s SELECT (`json_agg` of `id, product_id, variant_id, title, quantity, unit_price, subtotal, thumbnail`) — the test already expects it. Watch payload size: cap or paginate if needed.
3. **Honest failure state:** when the detail fetch fails, show a distinct "Impossible de charger les articles" (retry) instead of reusing the "indisponible" empty state.

## 6. Verification (post-fix)

- Open the drawer from: main table ✅, COD tab ✅, RTO tab ✅, after bulk fulfill ✅ → items always listed with thumbnail, quantity, unit price, SKU.
- Kill the backend / return 500 for `GET /orders/store/:id` → drawer shows an explicit error with retry, not "indisponible".
- Print invoice/bon-livraison from COD and RTO entries → items rows render.
