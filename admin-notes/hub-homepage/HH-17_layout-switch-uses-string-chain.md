# HH-17 — Layout Selection Uses Fragile String-Chain Instead of Component Map

**Severity:** 🟢 Improvement (Code Quality / Maintainability)  
**Area:** Hub Homepage — Layout Resolution  
**File:** `frontend/src/app/hub/page.tsx`  
**Line:** 164–196  
**Impact:** The homepage layout selection is a deeply nested ternary chain with 5 levels. Adding a sixth layout requires editing this chain, which is error-prone. A `Record<HomepageLayout, ComponentType>` map is more maintainable and type-safe.

---

## Current State

```tsx
// hub/page.tsx:164–196
const homeContent =
  homepageLayout === 'alibaba' ? (
    <AlibabaHomeContent ... />
  ) : homepageLayout === 'amazon' ? (
    <AmazonHomeContent ... />
  ) : homepageLayout === 'premium_deals' || (homepageLayout === 'theme_default' && marketplaceTheme === 'aliexpress2') ? (
    <AliExpress2HomeContent ... />
  ) : homepageLayout === 'deals' || (homepageLayout === 'theme_default' && marketplaceTheme === 'aliexpress') ? (
    <AliExpressHomeContent ... />
  ) : (
    <HubHomeContent ... />
  );
```

This is 5 levels of ternary nesting. Adding a 6th layout means adding another level.

---

## Improvement Checklist

- [x] **Step 1 — Define a union type for all layouts**  
- [x] **Step 2 — Define a shared props type for all home content components**  
- [x] **Step 3 — Build a resolution function instead of a ternary chain**  
- [x] **Step 4 — Replace the ternary chain with the function call**  
- [x] **Step 5 — Verify all layouts still render correctly**  
- [x] **Step 6 — TypeScript verification**  
- [x] **Step 7 — Commit**  
  ```
  git add frontend/src/app/hub/page.tsx
  git commit -m "refactor(hub): replace ternary layout chain with resolveHomeContentComponent function"
  ```

---

## Acceptance Criteria
- The layout resolution logic is a single named function, not a ternary chain.
- Adding a new layout only requires: (1) a new `if` branch in the function, (2) a new import.
- TypeScript compiles without errors.
- All existing layouts render identically to before the refactor.
