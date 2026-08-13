# HH-12 — `RecentlyViewedTracker` Not Called on Hub Homepage

**Severity:** 🟡 Enhancement  
**Area:** Hub Homepage — Recently Viewed Block  
**File:** `frontend/src/components/hub/HubHomeContent.tsx`  
**Related:** `frontend/src/components/hub/RecentlyViewedTracker.tsx`  
**Impact:** The `recently_viewed` block is available in the Homepage Blocks editor and renders a `<RecentlyViewedRail />` for returning visitors. However, products are only tracked when `RecentlyViewedTracker` is explicitly called. It is not imported or called anywhere on the hub homepage — meaning the recently-viewed rail will always be empty for first-time visitors to the homepage.

---

## Root Cause

`RecentlyViewedRail` (from `home-template-shared.tsx`) reads from localStorage/sessionStorage.  
`RecentlyViewedTracker` is the **writer** — it observes products the user scrolls past and records them.  

`RecentlyViewedTracker` is imported only on individual product pages (if at all), never on the homepage. So when the homepage renders the `recently_viewed` block, there is no data because tracking never started.

---

## Enhancement Checklist

- [ ] **Step 1 — Inspect `RecentlyViewedTracker`**  
  Open `frontend/src/components/hub/RecentlyViewedTracker.tsx` and understand its API:
  - What props does it accept? (likely `productId`, `productData`, etc.)
  - Does it need to be placed once per page, or once per product?

- [ ] **Step 2 — Determine the right placement**  
  - If `RecentlyViewedTracker` is per-product, it should be added to the **product detail page**, not the homepage.  
  - If it accepts a product list and tracks scrolling via IntersectionObserver, it can be added to the homepage trending grid.

- [ ] **Step 3A — If tracker is per-product (place on product detail page)**  
  Open `frontend/src/app/hub/products/[id]/page.tsx` and import/render the tracker:
  ```tsx
  import { RecentlyViewedTracker } from '../../../../components/hub/RecentlyViewedTracker';
  // ...
  // Inside the component, after product data is loaded:
  <RecentlyViewedTracker productId={product.id} productData={product} />
  ```

- [ ] **Step 3B — If tracker can observe a product list (place on homepage)**  
  Add to `HubHomeContent` after the trending grid renders:
  ```tsx
  import { RecentlyViewedTracker } from './RecentlyViewedTracker';
  // ...
  // At the bottom of the component JSX:
  <RecentlyViewedTracker products={trendingProducts.slice(0, 4)} />
  ```

- [ ] **Step 4 — Verify the recently_viewed block populates**  
  - Visit `/hub/products/[some-id]` (or scroll the homepage after Step 3B).  
  - Navigate back to `/hub`.  
  - Enable the `recently_viewed` block in admin → Homepage Blocks editor.  
  - Confirm the "Recently Viewed" rail appears and shows the product you visited.

- [ ] **Step 5 — Handle the empty state gracefully**  
  The `RecentlyViewedRail` component should already handle the empty state (return null if no products). Confirm this is the case.

- [ ] **Step 6 — Test in incognito (fresh session)**  
  In incognito, the recently viewed data should be empty.  
  The `recently_viewed` block should not render at all (no empty rail shown to new visitors).

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/components/hub/HubHomeContent.tsx
  git add frontend/src/app/hub/products/[id]/page.tsx  # if Step 3A
  git commit -m "feat(hub): connect RecentlyViewedTracker so the recently-viewed block has data to display"
  ```

---

## Acceptance Criteria
- Products are recorded as "viewed" when users interact with the hub.
- The "Recently Viewed" homepage block shows real viewed products for returning visitors.
- New visitors (no history) see no recently-viewed section (not an empty rail).
