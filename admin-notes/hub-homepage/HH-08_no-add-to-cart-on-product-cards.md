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

- [ ] **Step 1 — Inspect the existing `AddToCartButton` component**  
  Open `frontend/src/components/hub/AddToCartButton.tsx` and understand its props interface:
  ```ts
  // Expected props (inspect actual file)
  interface AddToCartButtonProps {
    productId: string;
    storeSubdomain?: string | null;
    // ... check for variant, quantity, etc.
  }
  ```

- [ ] **Step 2 — Import `AddToCartButton` in `HubHomeContent`**  
  At the top of `HubHomeContent.tsx`:
  ```ts
  import { AddToCartButton } from './AddToCartButton';
  ```

- [ ] **Step 3 — Replace the ArrowRight icon with a proper action row**  
  In `ProductCard` (line 103–110), update the bottom row:
  ```tsx
  // BEFORE — only arrow icon
  <div className="flex items-center justify-between">
    <span className="font-black text-[#16C784]">
      {formatPrice(product.price)} {currency}
    </span>
    <span className="flex h-8 w-8 items-center justify-center rounded-full ...">
      <ArrowRight className="h-4 w-4" />
    </span>
  </div>

  // AFTER — price + add to cart + view arrow
  <div className="flex items-center justify-between gap-2">
    <span className="font-black text-[#16C784] text-sm">
      {formatPrice(product.price)} {currency}
    </span>
    <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
      <AddToCartButton
        productId={product.id}
        storeSubdomain={product.store_subdomain}
        compact
        className="h-8 w-8 rounded-full bg-[#16C784] text-white hover:bg-[#14b576]"
      />
    </div>
  </div>
  ```

  > **Important:** Wrap `AddToCartButton` in an `onClick={(e) => e.preventDefault()}` container  
  > so clicking it does not navigate to the product page (the whole card is a `<Link>`).

- [ ] **Step 4 — Add a wishlist button (optional but recommended)**  
  Import `WishlistButton` from `./WishlistButton` and add it alongside:
  ```tsx
  <WishlistButton
    productId={product.id}
    compact
    className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500"
  />
  ```

- [ ] **Step 5 — Prevent nested interactive elements from causing accessibility issues**  
  A `<Link>` wrapping interactive buttons can cause accessibility violations. Consider converting the card to a `<div>` with an explicit "View product" link instead of wrapping everything in `<Link>`:
  ```tsx
  <article className="group overflow-hidden rounded-3xl ...">
    <Link href={getHubProductHref(product)} tabIndex={-1} aria-hidden>
      {/* image */}
    </Link>
    <div className="p-4">
      <Link href={getHubProductHref(product)}>
        <h3 className="...">{product.title}</h3>
      </Link>
      <div className="flex items-center justify-between mt-3">
        <span className="...">{formatPrice(product.price)} {currency}</span>
        <div className="flex gap-1.5">
          <AddToCartButton productId={product.id} compact />
          <WishlistButton productId={product.id} compact />
        </div>
      </div>
    </div>
  </article>
  ```

- [ ] **Step 6 — Test the interaction**  
  - Click the product image → navigate to product detail page.  
  - Click the cart button → item added to cart, counter updates.  
  - Verify that clicking the cart button does NOT navigate away.  
  - Test with keyboard (Tab + Enter) to confirm no focus trap.

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/components/hub/HubHomeContent.tsx
  git commit -m "feat(hub): add AddToCartButton and WishlistButton to classic theme product cards"
  ```

---

## Acceptance Criteria
- Each product card on the trending grid has a visible "Add to Cart" button.
- Clicking the button adds the item to cart without navigating to the product page.
- The cart counter in the navbar updates immediately.
- No accessibility violations (no nested `<a>` inside `<a>` or `<Link>` inside `<Link>`).
