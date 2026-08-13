# HH-02 — Hero Stats Show Page-1 Count Instead of Real Total

**Severity:** 🔴 Bug  
**Area:** Hub Homepage Hero  
**File:** `frontend/src/components/hub/HubHomeContent.tsx`  
**Line:** 154–158  
**Impact:** Visitors see "16+ Produits actifs" (only the first page of 16) instead of the real platform total (could be hundreds or thousands). This looks unprofessional and makes the marketplace appear empty.

---

## Root Cause

```tsx
// HubHomeContent.tsx:154–158
const marketplaceStats = [
  { label: 'Produits actifs', value: `${trendingProducts.length}+` },  // ← only 16 items from page 1
  { label: 'Catégories',      value: `${publicCategories.length}+` },
  { label: 'Paiements',       value: '4 modes' },                       // ← hardcoded
];
```

`trendingProducts` is the page-1 fetch result (16 items max). The API returns a `meta.total` field that is already extracted as `trendingTotalPages` in `hub/page.tsx:113` but the **actual total product count is never passed down**.

---

## Fix Checklist

- [ ] **Step 1 — Update the backend API response check**  
  Open `frontend/src/app/hub/page.tsx` and inspect the `getTrendingProducts` return at line 110–114.  
  Confirm that `data.meta.total` (total product count across all pages) is available in the response.  
  If not, confirm with the backend team that `GET /api/pd/products/public` returns `meta.total`.

- [ ] **Step 2 — Extract `totalProducts` in `getTrendingProducts`**  
  ```ts
  // hub/page.tsx — update the return type and value
  async function getTrendingProducts(sortBy?: string): Promise<{
    products: Product[];
    totalPages: number;
    totalProducts: number;   // ← add this
  }> {
    // ...
    return {
      products: data.data || [],
      totalPages: data.meta?.total_pages || 1,
      totalProducts: data.meta?.total || 0,   // ← add this
    };
  }
  ```

- [ ] **Step 3 — Pass `totalProducts` down to the content component**  
  In `HubHomepage` (hub/page.tsx line 154), destructure `totalProducts`:
  ```ts
  const [{ products: trendingProducts, totalPages: trendingTotalPages, totalProducts }, categories] = ...
  ```

- [ ] **Step 4 — Add `totalProducts` to `HubHomeContentProps`**  
  In `HubHomeContent.tsx`, extend the props interface:
  ```ts
  interface HubHomeContentProps {
    trendingProducts: Product[];
    categories: MarketplaceCategory[];
    marketplaceSettings?: MarketplaceSettings;
    totalProducts?: number;    // ← add this
  }
  ```

- [ ] **Step 5 — Update the stats array**  
  Replace the hardcoded count with the real total:
  ```ts
  const marketplaceStats = [
    {
      label: 'Produits actifs',
      value: totalProducts && totalProducts > 16
        ? `${totalProducts.toLocaleString()}+`
        : `${trendingProducts.length}+`,
    },
    { label: 'Catégories', value: `${publicCategories.length}+` },
    { label: 'Paiements',  value: '4 modes' },
  ];
  ```

- [ ] **Step 6 — Pass the prop at the call site**  
  In `hub/page.tsx` where `<HubHomeContent>` is rendered (line ~191):
  ```tsx
  <HubHomeContent
    trendingProducts={trendingProducts}
    categories={orderedCategories}
    marketplaceSettings={marketplaceSettings}
    totalProducts={totalProducts}
  />
  ```

- [ ] **Step 7 — Test**  
  - Seed the DB with more than 16 products.  
  - Visit `/hub` and confirm the stat shows the actual total, not 16.  
  - With 0 products, confirm it shows `0+` gracefully.

- [ ] **Step 8 — Commit**  
  ```
  git add frontend/src/app/hub/page.tsx frontend/src/components/hub/HubHomeContent.tsx
  git commit -m "fix(hub): show real total product count in hero stats instead of page-1 count"
  ```

---

## Acceptance Criteria
- Hero "Produits actifs" stat reflects the full platform product count.
- Works correctly even when the DB has 0 products.
- No breaking change to other layout components (AliExpress, Amazon, Alibaba).
