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

- [ ] **Step 1 — Decide on a dedicated placement key for the homepage bottom rail**  
  The third rail should have its own placement slug. Recommended: `hub.homepage_bottom`.  
  Confirm with the ads team that this placement key exists (or needs to be created) in the campaign configuration.

- [ ] **Step 2 — Add the explicit placement, title, and variant to the third rail**  
  ```tsx
  // hub/page.tsx — line 210
  // BEFORE
  <SponsoredAdsRail locale={activeLocale as any} />

  // AFTER
  <SponsoredAdsRail
    placement="hub.homepage_bottom"
    title="You may also like"
    variant="cards"
    locale={activeLocale as any}
  />
  ```

- [ ] **Step 3 — Register the new placement in the backend ads system**  
  - Open `backend/src/api/ads.route.ts` or the ads service.  
  - Find where placement values are validated/enumerated.  
  - Add `'hub.homepage_bottom'` to the allowed placement list.

- [ ] **Step 4 — Update the admin Ads manager (if placements are configurable)**  
  If the superadmin Ads page shows placement options for campaign creation, add `hub.homepage_bottom` as a visible option with description: "Homepage bottom — below sponsored brands".

- [ ] **Step 5 — Verify no duplicate ad delivery**  
  - Create a test campaign targeting `hub.sponsored_products`.  
  - Visit `/hub` and confirm the campaign appears only in the rails that explicitly use `hub.sponsored_products` (none on the homepage after this fix).  
  - Visit `/hub/search` and confirm it appears there as expected.

- [ ] **Step 6 — Commit**  
  ```
  git add frontend/src/app/hub/page.tsx
  git commit -m "fix(hub): give third SponsoredAdsRail an explicit placement key 'hub.homepage_bottom'"
  ```

---

## Acceptance Criteria
- All three `SponsoredAdsRail` instances on the homepage have explicit, unique `placement` values.
- `hub.sponsored_products` placement is no longer used on the homepage.
- The admin can create campaigns per placement without unintended overlap.
