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

- [x] **Step 1 — Add a `visibleCount` state to `HubHomeContent`**
- [x] **Step 2 — Slice `trendingProducts` by `visibleCount` in `renderTrending`**
- [x] **Step 3 — Add a "Load More" button below the grid**  

### Phase 2 — Implement `pagination`

- [x] **Step 4 — Add `currentPage` state**
- [x] **Step 5 — Slice products by page**
- [x] **Step 6 — Add page number buttons**  

### Phase 3 — Implement `infinite` scroll

- [x] **Step 7 — Add an IntersectionObserver sentinel**  
- [x] **Step 8 — Gate infinite scroll behind the setting**

### Validation

- [x] **Step 9 — Test all four modes**  
  In the admin settings panel, cycle through each `hub_homepage_pagination_style` value and verify:
  - `none` → static grid, no controls
  - `load_more` → "Load more" button appears after 8 products
  - `pagination` → numbered page buttons appear
  - `infinite` → new products load as user scrolls

- [x] **Step 10 — Commit**  
  ```
  git add frontend/src/components/hub/HubHomeContent.tsx frontend/src/components/hub/HubProductPagination.tsx
  git commit -m "feat(hub): implement hub_homepage_pagination_style for classic theme and enhance pagination a11y"
  ```

---

## Acceptance Criteria
- All four `hub_homepage_pagination_style` values produce distinct behavior in `HubHomeContent`.
- Changing the setting in the admin panel and saving reflects on `/hub` after revalidation.
- The feature does not break when `trendingProducts` is empty.
