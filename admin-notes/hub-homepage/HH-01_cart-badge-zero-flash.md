# HH-01 — Cart Badge Always Shows "0" on Cold Render

**Severity:** 🔴 Bug  
**Area:** Hub Navbar  
**File:** `frontend/src/components/hub/HubNavbar.tsx`  
**Line:** 193–198  
**Impact:** Every page load shows a red "0" badge on the shopping bag icon, which is visually misleading for new/unauthenticated visitors who have no cart items.

---

## Root Cause

```tsx
// HubNavbar.tsx:193–198
<Link href="/hub/cart" ...>
  <ShoppingBag className="w-5 h-5" strokeWidth={1.75} />
  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold
                   rounded-full h-4 w-4 flex items-center justify-center">
    {cartCount}                          ← always rendered, even when 0
  </span>
</Link>
```

`cartCount` is `0` before the `CartContext` hydrates (or when the cart is genuinely empty), but the badge `<span>` is always rendered unconditionally — so the red dot with "0" is always visible.

---

## Fix Checklist

- [ ] **Step 1 — Open the file**  
  Open `frontend/src/components/hub/HubNavbar.tsx` and navigate to **line 193**.

- [ ] **Step 2 — Locate the cart badge span**  
  Find the `<span>` inside the cart `<Link>` that renders `{cartCount}`.

- [ ] **Step 3 — Add a conditional render guard**  
  Wrap the badge `<span>` with `{cartCount > 0 && (…)}` so it only renders when there are items:

  ```tsx
  // BEFORE
  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold
                   rounded-full h-4 w-4 flex items-center justify-center">
    {cartCount}
  </span>

  // AFTER
  {cartCount > 0 && (
    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold
                     rounded-full h-4 w-4 flex items-center justify-center"
          aria-label={`${cartCount} items in cart`}>
      {cartCount > 99 ? '99+' : cartCount}
    </span>
  )}
  ```

- [ ] **Step 4 — Add aria-label to the cart Link**  
  The `<Link>` itself has no accessible name. Add `aria-label` that reflects cart state:

  ```tsx
  <Link
    href="/hub/cart"
    aria-label={cartCount > 0 ? `Cart — ${cartCount} items` : 'Open cart'}
    className={...}
  >
  ```

- [ ] **Step 5 — Handle the 99+ overflow**  
  If `cartCount > 99`, display `"99+"` instead of a 3-digit number that overflows the badge circle (see Step 3 code above).

- [ ] **Step 6 — Test the fix**  
  - Load `/hub` with no items in cart → red badge must NOT appear.  
  - Add 1 item to cart → badge must show `1`.  
  - Add 100 items → badge must show `99+`.  
  - Verify with screen reader that the aria-label is read correctly.

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/components/hub/HubNavbar.tsx
  git commit -m "fix(hub): hide cart badge when cartCount is 0, add aria-label and 99+ overflow"
  ```

---

## Acceptance Criteria
- Red badge is invisible when cart is empty.
- Badge shows correct count (capped at 99+) when items exist.
- Cart link has an accessible name at all times.
