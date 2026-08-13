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

- [ ] **Step 1 — Add a `loading` state variable**  
  ```ts
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);  // ← add this
  ```

- [ ] **Step 2 — Set `loading = false` after the fetch**  
  ```ts
  useEffect(() => {
    // ...
    fetch(`/api/pd/ads/public/delivery?${params}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { ads: [] }))
      .then((d) => {
        setAds(d.ads || []);
        setLoading(false);    // ← add this
      })
      .catch(() => {
        setAds([]);
        setLoading(false);    // ← add this
      });
  }, [placement, locale, category]);
  ```

### Part 2 — Render skeleton when loading

- [ ] **Step 3 — Add skeleton markup for the `cards` variant**  
  Replace the early `return null` with a conditional:
  ```tsx
  if (loading) {
    return variant === 'banner' ? (
      // Banner skeleton
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-60 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
      </section>
    ) : (
      // Cards skeleton
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 h-6 w-32 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-gray-100">
              <div className="aspect-square animate-pulse bg-gray-100 dark:bg-gray-800" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!ads.length) return null;  // keep the empty-state guard
  ```

### Part 3 — Prevent layout shift with reserved space

- [ ] **Step 4 — Add `min-h` to the section container when ads eventually populate**  
  Ensure the wrapper height doesn't collapse by using `min-h` classes that match skeleton dimensions, then remove them once ads load.

- [ ] **Step 5 — Test in Chrome DevTools → Network → Slow 3G**  
  - The skeleton placeholders should appear immediately on page load.  
  - After ~2–3 seconds, the real ads should fade in.  
  - If no ads exist, the section collapses gracefully after loading.

- [ ] **Step 6 — Measure CLS improvement**  
  Use Chrome DevTools → Performance → Core Web Vitals.  
  CLS on the hub homepage should decrease toward 0 after this fix.

- [ ] **Step 7 — Commit**  
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
