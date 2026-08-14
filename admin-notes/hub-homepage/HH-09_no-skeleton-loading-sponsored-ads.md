# HH-09 — No Skeleton Placeholder While Sponsored Ads Load

**Severity:** 🟡 Enhancement  
**Area:** Hub Homepage — Sponsored Ads Rails  
**File:** `frontend/src/components/hub/SponsoredAdsRail.tsx`  
**Line:** 118 (`if (!ads.length) return null;`)  
**Impact:** The three `SponsoredAdsRail` instances on the homepage return `null` while loading and when empty. This causes:
1. **Layout shift (CLS)** — the page height changes once ads populate.
2. **Empty sections** — if a rail has no ads, the space between sections collapses with no visual separator, making the page feel broken.
3. **Poor perceived performance** — nothing shows during the ~300ms ad fetch.

---

## Root Cause

```tsx
// SponsoredAdsRail.tsx:118
if (!ads.length) return null;
```

There is no loading state. The component fetches ads client-side, and until the response arrives, it renders nothing.

---

## Enhancement Checklist

### Part 1 — Add a `loading` state

- [x] **Step 1 — Add a `loading` state variable**  
- [x] **Step 2 — Set `loading = false` after the fetch**  

### Part 2 — Render skeleton when loading

- [x] **Step 3 — Add skeleton markup for the `cards` and `banner` variant**  

### Part 3 — Prevent layout shift with reserved space

- [x] **Step 4 — Add `min-h` to the section container when ads eventually populate**  
- [x] **Step 5 — Test in Chrome DevTools → Network → Slow 3G**  
- [x] **Step 6 — Measure CLS improvement**  
- [x] **Step 7 — Commit**  
  ```
  git add frontend/src/components/hub/SponsoredAdsRail.tsx
  git commit -m "feat(hub): add skeleton loading state to SponsoredAdsRail to prevent layout shift"
  ```

---

## Acceptance Criteria
- A skeleton placeholder is visible immediately while sponsored ads are loading.
- The page layout does not shift when ads appear (CLS ≈ 0 for ad sections).
- If no ads exist after loading, the section still collapses gracefully.
- Skeleton appearance is consistent with the site's design language (gray pulses).
