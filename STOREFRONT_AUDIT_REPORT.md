# Storefront Audit Report — 2026-08-02

## Executive Summary

Deep audit of the storefront implementation (commit `f8a58df` by external AI agent) using live access (Render, Vercel, Supabase, GitHub). Found and fixed **7 P0/P1 bugs** across 25+ files. All fixes verified with type-checks and tests (frontend: 86/86, backend: 347/347).

---

## Issues Found & Fixed

### P0-1: Publish Toggle Completely Broken
**File:** `frontend/src/app/hub/dashboard/online-store/page.tsx`

**Bug:** The publish toggle sent `{ status: "verified" | "unverified" }` to `PUT /api/pd/stores/me/maintenance`. The backend's Zod schema (`updateMaintenanceSchema`) expects `{ enabled: boolean, maintenance_message?: string }`. Every toggle attempt returned a 400 validation error.

**Fix:** Rewrote `handleTogglePublish` to send `{ enabled: boolean }` — `true` for maintenance mode (offline), `false` for live (verified status). Updated the store state from the response and improved error handling.

---

### P0-2: Demo Product Fallbacks in ALL 20 Themes (GAP-P1-010 NOT done)
**Files:** All 20 `*Theme.tsx` files in `frontend/src/components/themes/`

**Bug:** Every theme had this pattern:
```tsx
const allProducts = products.length > 0
  ? products
  : [
      { id: '1', title: 'Wireless Headphones', price: 149, images: [] },
      // ... 3 more fake products
    ];
```
Empty stores rendered **fake clickable products** leading to 404 errors. New sellers couldn't see their real empty state.

**Fix:** Replaced the demo fallback in all 20 themes with `const allProducts = products;`. The existing per-theme empty states (`displayProducts.length === 0`) now trigger correctly, showing "Aucun produit pour le moment" messages.

---

### P0-3: 18 of 20 Themes Missing StorefrontHeader
**Files:** All 20 `*Theme.tsx` files

**Bug:** Only `ClassicTheme` and `ArtisanTheme` imported and rendered `StorefrontHeader`. The other 18 themes (Minimal, Modern, Boutique, Coastal, Craft, Digital, Elegance, Flavor, Fresh, Garden, Kids, Luxe, Medina, Neon, Sahara, Studio, TechHub, Urban) had NO shared header — no navigation menu, search bar, logo, cart link, or mobile drawer.

**Fix:** Added `import { StorefrontHeader } from '../store/StorefrontHeader';` and the `<StorefrontHeader>` JSX to all 18 missing themes, passing `storeName`, `branding`, `theme`, `navigation`, `searchQuery`, `onSearchChange`, `categories`, `activeCategory`, `onCategoryChange`.

---

### P0-4: Themes Page Was a Stub Redirect
**File:** `frontend/src/app/hub/dashboard/online-store/themes/page.tsx`

**Bug:** The themes page was just a redirect to `/hub/dashboard/settings?tab=theme`. The overview page links sellers here expecting a full theme gallery.

**Fix:** Replaced the stub with a complete theme selection gallery — 20 theme cards with mini storefront previews, color preset swatches, active theme badge, and "Apply this theme" buttons that call `PUT /api/pd/stores/me/theme`.

---

### P0-5: Customers Page Calls Non-Existent Backend Endpoint
**Files:** `frontend/src/app/hub/dashboard/online-store/customers/page.tsx`, `backend/src/api/store.route.ts`

**Bug:** The customers dashboard page called `GET /api/pd/stores/me/customers` — an endpoint that didn't exist in the backend.

**Fix:** Added the `GET /me/customers` endpoint to `backend/src/api/store.route.ts`. It queries `pd_storefront_customer` for the seller's store, joins with `pd_order` for order counts, and returns paginated results.

---

### P1-1: Navigation Manager Field Name Mismatch
**File:** `frontend/src/app/hub/dashboard/online-store/navigation/page.tsx`

**Bug:** The frontend used `label` field but the backend's Zod schema (`menuItemInputSchema`) requires `localized_label`. Saving navigation would fail validation. Also, the `type` field was hardcoded to `custom_url` with no UI to change it, and `reference_id` was missing.

**Fix:**
- Changed `label` → `localized_label` in the `MenuItem` interface, `handleAddItem`, input fields, and fallback defaults
- Added normalization for backend responses (handles `localized_label` as `{ fr: "...", en: "..." }` object)
- Added type selector dropdown (page, product, category, collection, custom_url)
- Added `reference_id` input field (shown when type is not `custom_url`)
- Fixed `Date.now()` purity error → `crypto.randomUUID()`

---

### P1-2: Hardcoded `pandamarket.tn` Domain (should be `garbage.team`)
**Files:** 10+ files across frontend

**Bug:** Multiple pages hardcoded `pandamarket.tn` as the marketplace domain, but the actual domain is `garbage.team`.

**Fix:** Updated all seller-facing and admin-facing domain references:
- `online-store/page.tsx` — subdomain badge
- `online-store/customize/page.tsx` — preview host
- `online-store/domains/page.tsx` — subdomain display
- `hub/dashboard/orders/page.tsx` — store contact info
- `hub/dashboard/settings/page.tsx` — DNS instructions
- `hub/dashboard/my-subscription-orders/page.tsx` — store domain
- `(admin)/fraud-radar/page.tsx` — store subdomain
- `(admin)/subscription-orders/page.tsx` — store subdomain (3 locations)
- `components/admin/platform-analytics/VendorsAnalyticsTab.tsx` — vendor domain
- `(auth)/register/page.tsx` — subdomain suffix

---

### P1-3: Integrations Page Missing `custom_body_js` Input
**File:** `frontend/src/app/hub/dashboard/online-store/integrations/page.tsx`

**Bug:** The interface declared `custom_body_js` but the UI only had a `custom_head_js` textarea — no input for body scripts.

**Fix:** Added a second textarea for `custom_body_js` (scripts injected at end of body).

---

## Validation Results

| Check | Status | Details |
|-------|--------|---------|
| Backend type-check | ✅ PASS | `tsc --noEmit` clean |
| Backend tests | ✅ PASS | 347/347 tests, 42/42 files |
| Frontend type-check | ✅ PASS | `tsc --noEmit` clean |
| Frontend tests | ✅ PASS | 86/86 tests, 11/11 files |
| Frontend ESLint (online-store) | ✅ PASS | 0 errors, 0 warnings |
| Frontend ESLint (themes) | ✅ PASS | 0 errors, 0 warnings |
| Live site | ✅ 200 | `https://www.garbage.team/` accessible |

---

## Files Changed

### Frontend (25 files)
- `frontend/src/components/themes/EmptyStoreState.tsx` — **NEW** shared empty state component
- `frontend/src/components/themes/*Theme.tsx` (20 files) — removed demo fallbacks, added StorefrontHeader
- `frontend/src/app/hub/dashboard/online-store/page.tsx` — fixed publish toggle, removed unused imports
- `frontend/src/app/hub/dashboard/online-store/themes/page.tsx` — replaced stub with full theme gallery
- `frontend/src/app/hub/dashboard/online-store/navigation/page.tsx` — fixed field names, added type selector
- `frontend/src/app/hub/dashboard/online-store/customize/page.tsx` — fixed domain, removed unused imports
- `frontend/src/app/hub/dashboard/online-store/domains/page.tsx` — fixed domain, removed unused imports
- `frontend/src/app/hub/dashboard/online-store/integrations/page.tsx` — added body JS input
- `frontend/src/app/hub/dashboard/orders/page.tsx` — fixed domain
- `frontend/src/app/hub/dashboard/settings/page.tsx` — fixed DNS instructions
- `frontend/src/app/hub/dashboard/my-subscription-orders/page.tsx` — fixed domain
- `frontend/src/components/admin/platform-analytics/VendorsAnalyticsTab.tsx` — fixed domain
- `frontend/src/app/(admin)/fraud-radar/page.tsx` — fixed domain
- `frontend/src/app/(admin)/subscription-orders/page.tsx` — fixed domain
- `frontend/src/app/(auth)/register/page.tsx` — fixed domain suffix

### Backend (1 file)
- `backend/src/api/store.route.ts` — added `GET /me/customers` endpoint

---

## Remaining Issues (Not Fixed — Lower Priority)

1. **Email addresses still use `pandamarket.tn`** — `billing@pandamarket.tn`, `admin@pandamarket.tn`, `noreply@pandamarket.tn`, `support@pandamarket.tn` in admin settings defaults. These are email addresses, not domain names — changing them requires verifying the actual email accounts exist.

2. **Admin settings default `marketplace_public_url`** — still `https://pandamarket.tn` in `DEFAULT_SETTINGS`. This is a frontend default that gets overridden by backend platform config at runtime, but should be updated for consistency.

3. **Pre-existing ESLint errors** — 8 errors in admin pages (subscription-orders `react-hooks/purity`, settings `react-hooks/purity`, orders `no-explicit-any`). These are pre-existing and NOT caused by the storefront work.

4. **Unused vars in storefront routes** — `footerBranding`, `navigationPages`, `footerPages` in `[storeHost]/page.tsx`; `formatProductType`, `tx`, `borderColor`, `isPhysicalProduct` in product detail page. These are pre-existing.

5. **`EmptyStoreState` component created but not yet integrated** — The component exists at `frontend/src/components/themes/EmptyStoreState.tsx` but themes still use their inline empty states. Could be integrated later for a richer empty store experience (with contact email CTA).
