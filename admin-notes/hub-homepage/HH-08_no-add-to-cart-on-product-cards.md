# HH-08 — No Add-to-Cart Button on Trending Product Cards

**Severity:** 🟡 Enhancement  
**Area:** Hub Homepage — Trending Products Section  
**File:** `frontend/src/components/hub/HubHomeContent.tsx`  
**Line:** 72–113 (`ProductCard`)  
**Impact:** Buyers must navigate to the product detail page to add items to cart. All competing layouts (AliExpress, Amazon, Alibaba) have direct add-to-cart or quick-buy actions on their product cards. Adding a one-click cart button significantly increases conversion rates on the homepage.

---

## Current State

The `ProductCard` component renders:
- Product image
- Category badge
- Store name
- Title
- Price
- An ArrowRight icon (purely decorative)

There is no cart button. The `AddToCartButton` component already exists at `frontend/src/components/hub/AddToCartButton.tsx` — it is just not used here.

---

## Enhancement Checklist

- [x] **Step 1 — Inspect the existing `AddToCartButton` component**  
- [x] **Step 2 — Import `useCart` in `HubHomeContent`**  
- [x] **Step 3 — Replace the ArrowRight icon with a proper action row**  
- [x] **Step 4 — Add quick cart button with confirmation feedback**  
- [x] **Step 5 — Prevent nested interactive elements from causing navigation conflicts**  
- [x] **Step 6 — Test the interaction**  
- [x] **Step 7 — Commit**  
  ```
  git add frontend/src/components/hub/HubHomeContent.tsx
  git commit -m "feat(hub): add AddToCartButton and quick add action to classic theme product cards"
  ```

---

## Acceptance Criteria
- Each product card on the trending grid has a visible "Add to Cart" button.
- Clicking the button adds the item to cart without navigating to the product page.
- The cart counter in the navbar updates immediately.
- No accessibility violations (no nested `<a>` inside `<a>` or `<Link>` inside `<Link>`).
