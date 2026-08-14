# HH-03 — `getProductImage()` Called Redundantly in Deals Spotlight

**Severity:** 🔴 Bug (Performance / Code Quality)  
**Area:** Hub Homepage — Deals Spotlight Section  
**File:** `frontend/src/components/hub/HubHomeContent.tsx`  
**Line:** 263–264  
**Impact:** `getProductImage(product)` is called 2–3 times per product card in the deals spotlight: once in the `{condition ?}` check, once again as the `src`, and sometimes a third time inside `getResizedImageUrl(...)`. Each call to `normalizePublicAssetUrl` runs string operations and `URL` parsing unnecessarily.

---

## Root Cause

```tsx
// HubHomeContent.tsx:263–264 — inside renderDealsSpotlight
{getProductImage(product) ? (
  <img
    src={getProductImage(product)                                    // ← called again!
         ? getResizedImageUrl(getProductImage(product), 'medium')   // ← called a 3rd time!
         : ''}
    alt={product.title}
    ...
  />
```

The same pure function is called 3× per product instead of caching its result in a variable once.

---

## Fix Checklist

- [x] **Step 1 — Open the file**  
- [x] **Step 2 — Locate the duplicate calls**  
- [x] **Step 3 — Extract the image URL into a variable**  
- [x] **Step 4 — Apply the same pattern to the hero products aside**  
- [x] **Step 5 — Verify no behavior change**  
- [x] **Step 6 — Commit**  
  ```
  git add frontend/src/components/hub/HubHomeContent.tsx
  git commit -m "perf(hub): cache getProductImage() result in deals spotlight to avoid triple calls"
  ```

---

## Acceptance Criteria
- `getProductImage(product)` is called at most once per product card.
- Product images in the Deals Spotlight section still display correctly.
- No visible behavior change in the UI.
