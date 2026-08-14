# HH-05 — Third `SponsoredAdsRail` Uses Default Placement — May Clash with Other Rails

**Severity:** 🔴 Bug  
**Area:** Hub Homepage  
**File:** `frontend/src/app/hub/page.tsx`  
**Line:** 210  
**Impact:** Three sponsored ad rails are rendered on the homepage. The third one uses no explicit `placement` prop, defaulting to `hub.sponsored_products`. Since the second rail also uses a distinct placement (`hub.sponsored_brands`), there is currently no direct collision — but the default `hub.sponsored_products` placement may also be used on other hub pages (product lists, search), causing the same ad campaigns to appear twice on those pages and once on the homepage simultaneously.

---

## Root Cause

```tsx
// hub/page.tsx lines 207–210
<SponsoredAdsRail placement="hub.home_banner"     title="Sponsored content" variant="banner" locale={...} />
{homeContent}
<SponsoredAdsRail placement="hub.sponsored_brands" title="Sponsored brands"  locale={...} />
<SponsoredAdsRail locale={...} />    {/* ← missing placement, defaults to 'hub.sponsored_products' */}
```

The third rail has no placement, title, or variant specified. `SponsoredAdsRail` defaults:
- `placement` → `'hub.sponsored_products'`
- `title`     → `'Sponsored'`
- `variant`   → `'cards'`

This is the same placement used on search and product pages. Vendors targeting `hub.sponsored_products` will appear on the homepage bottom AND on the search page unintentionally sharing budget.

---

## Fix Checklist

- [x] **Step 1 — Establish placement ownership per layout**  
- [x] **Step 2 — Add the explicit placement, title, and variant to the rails and avoid duplicate brands on Alibaba/Amazon**  
  ```tsx
  <SponsoredAdsRail placement="hub.home_banner" title="Sponsored content" variant="banner" locale={activeLocale as any} />
  {homeContent}
  {!layoutEmbedsSponsoredBrands && (
    <SponsoredAdsRail placement="hub.sponsored_brands" title="Sponsored brands" locale={activeLocale as any} />
  )}
  <SponsoredAdsRail placement="hub.sponsored_products" title="Sponsored products" variant="cards" locale={activeLocale as any} />
  ```

- [x] **Step 3 — Register the placements in the ads system**  
- [x] **Step 4 — Update the ads manager**  
- [x] **Step 5 — Verify no duplicate ad delivery**  
- [x] **Step 6 — Commit**  
  ```
  git add frontend/src/app/hub/page.tsx
  git commit -m "fix(hub): establish sponsored placement ownership and prevent duplicate sponsored rails across layouts"
  ```

---

## Acceptance Criteria
- All three `SponsoredAdsRail` instances on the homepage have explicit, unique `placement` values.
- `hub.sponsored_products` placement is no longer used on the homepage.
- The admin can create campaigns per placement without unintended overlap.
