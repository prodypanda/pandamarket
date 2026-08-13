# HH-04 — `hub_homepage_pagination_style` Setting is Wired but Never Implemented

**Severity:** 🔴 Bug (Dead Feature)  
**Area:** Hub Homepage — Trending Products Section  
**Files:**  
- `frontend/src/app/hub/page.tsx`  
- `frontend/src/components/hub/HubHomeContent.tsx`  
- `frontend/src/app/(admin)/settings/page.tsx`  
**Impact:** Admins can set pagination to `infinite`, `load_more`, `pagination`, or `none` in the settings panel. The value is stored, passed as a prop, and accepted in the `MarketplaceSettings` interface — but `HubHomeContent` never reads it. All four modes render identically (a static 16-product grid).

---

## Root Cause

In `settings/page.tsx` line 56, the setting is defined:
```ts
hub_homepage_pagination_style: 'infinite' | 'load_more' | 'pagination' | 'none';
```

It is passed to `HubHomeContent` via `marketplaceSettings`, which accepts it in its interface (line 51):
```ts
hub_homepage_pagination_style?: string;
```

But inside `HubHomeContent`, the value is **never read**. The `renderTrending` section (line 286) always renders a static grid with all 16 products and no pagination controls.

---

## Fix Checklist

### Phase 1 — Implement `load_more` (simplest, highest value)

- [ ] **Step 1 — Add a `visibleCount` state to `HubHomeContent`**
  ```ts
  const [visibleCount, setVisibleCount] = useState(
    marketplaceSettings?.hub_homepage_pagination_style === 'none' ? Infinity : 8
  );
  ```

- [ ] **Step 2 — Slice `trendingProducts` by `visibleCount` in `renderTrending`**
  ```ts
  const visibleProducts = trendingProducts.slice(0, visibleCount === Infinity ? undefined : visibleCount);
  ```

- [ ] **Step 3 — Add a "Load More" button below the grid**  
  In `renderTrending`, after the product grid:
  ```tsx
  {paginationStyle === 'load_more' && visibleCount < trendingProducts.length && (
    <div className="mt-10 flex justify-center">
      <button
        onClick={() => setVisibleCount((n) => n + 8)}
        className="rounded-full border border-[#16C784] px-8 py-3 text-sm font-black
                   text-[#16C784] transition hover:bg-[#16C784] hover:text-white"
      >
        Voir plus de produits
      </button>
    </div>
  )}
  ```

### Phase 2 — Implement `pagination`

- [ ] **Step 4 — Add `currentPage` state**
  ```ts
  const [currentPage, setCurrentPage] = useState(1);
  const PRODUCTS_PER_PAGE = 16;
  ```

- [ ] **Step 5 — Slice products by page**
  ```ts
  const pagedProducts = paginationStyle === 'pagination'
    ? trendingProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE)
    : trendingProducts;
  ```

- [ ] **Step 6 — Add page number buttons**  
  Render `<button>` elements for each page derived from `trendingTotalPages` (already available via prop after implementing HH-02 changes).

### Phase 3 — Implement `infinite` scroll

- [ ] **Step 7 — Add an IntersectionObserver sentinel**  
  Place a `<div ref={sentinelRef}>` at the bottom of the trending grid. When it enters the viewport, call a `loadMore()` function that fetches the next page of products from `/api/pd/products/public?page=N` and appends them to the list.

- [ ] **Step 8 — Gate infinite scroll behind the setting**
  ```ts
  const paginationStyle = marketplaceSettings?.hub_homepage_pagination_style ?? 'load_more';
  ```
  Only activate the IntersectionObserver when `paginationStyle === 'infinite'`.

### Validation

- [ ] **Step 9 — Test all four modes**  
  In the admin settings panel, cycle through each `hub_homepage_pagination_style` value and verify:
  - `none` → static grid, no controls
  - `load_more` → "Load more" button appears after 8 products
  - `pagination` → numbered page buttons appear
  - `infinite` → new products load as user scrolls

- [ ] **Step 10 — Commit**  
  ```
  git add frontend/src/components/hub/HubHomeContent.tsx
  git commit -m "feat(hub): implement hub_homepage_pagination_style for classic theme (load_more/pagination/infinite)"
  ```

---

## Acceptance Criteria
- All four `hub_homepage_pagination_style` values produce distinct behavior in `HubHomeContent`.
- Changing the setting in the admin panel and saving reflects on `/hub` after revalidation.
- The feature does not break when `trendingProducts` is empty.
