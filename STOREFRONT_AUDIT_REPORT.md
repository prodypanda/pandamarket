# Storefront Audit Report — 2026-08-02 (Updated)

## Executive Summary

Deep audit of the storefront implementation (commit `f8a58df` by external AI agent) using live access (Render, Vercel, Supabase, GitHub). Found and fixed **12 P0/P1 bugs** across 32+ files in two rounds. All fixes verified with type-checks and tests (frontend: 86/86, backend: 347/347).

**Round 1** (commit `245aec3`): 7 P0/P1 bugs fixed across 25+ files.
**Round 2** (commit `98e83db`): 5 P0/P1 bugs fixed across 7 files.

---

## Round 2 Issues Found & Fixed (commit `98e83db`)

### P0-6: "View Storefront" Button Redirects to Wrong Page
**File:** `frontend/src/app/hub/dashboard/online-store/page.tsx`

**Bug:** The "View Storefront" button constructed the URL as `/store/${subdomain}`, which on `garbage.team` renders the **marketplace seller page** (because `isMarketplaceStoreRoute` is true), NOT the seller's themed storefront website.

**Fix:** Created a new `getStorefrontUrl()` helper in `store-hosts.ts` that constructs the correct storefront subdomain URL (`https://{subdomain}.{marketplace_domain}`). The button now opens the actual storefront website at `https://prodypanda.garbage.team/` instead of the marketplace seller page.

---

### P0-7: `getMarketplacePublicUrl()` Fallback Uses Wrong Domain
**File:** `frontend/src/lib/marketplace-settings.ts`

**Bug:** The fallback domain was hardcoded as `https://pandamarket.tn` (the old domain). The DB already has `https://garbage.team`, but if the DB setting was missing, the wrong domain would be used.

**Fix:** Changed the fallback from `https://pandamarket.tn` to `https://garbage.team`. Also added `NEXT_PUBLIC_MARKETPLACE_DOMAIN` env var as a candidate, and set it to `garbage.team` on Vercel.

---

### P0-8: Backend Default `marketplace_public_url` Uses Wrong Domain
**File:** `backend/src/services/platform-config.service.ts`

**Bug:** The `PLATFORM_SETTING_DEFAULTS` had `marketplace_public_url: 'https://pandamarket.tn'` — the wrong domain. This default is used when the DB setting is missing.

**Fix:** Changed to `marketplace_public_url: 'https://garbage.team'`.

---

### P0-9: Theme Customize Preview URL Uses Wrong Domain
**File:** `frontend/src/app/hub/dashboard/online-store/customize/page.tsx`

**Bug:** The preview URL was hardcoded as `${subdomain}.garbage.team` and opened on the marketplace route `/store/${host}/preview` instead of the actual storefront subdomain.

**Fix:** Now uses `getStorefrontUrl()` helper to construct the correct URL, and opens the preview on the actual storefront subdomain (`https://{subdomain}.garbage.team/preview?token=...`).

---

### P1-4: Footer Blocks Management UI Completely Missing
**File:** `frontend/src/app/hub/dashboard/online-store/navigation/page.tsx`

**Bug:** The backend has full footer block endpoints (`GET/PUT /me/footer/draft`, `POST /me/content/publish`), and the `StorefrontFooter` component renders blocks from `navigation.footer.blocks`, but there was NO seller UI to manage footer blocks. Sellers had no way to add/edit/remove footer columns (text, contact, social, menu, newsletter, payment badges, legal links, map).

**Fix:** Rewrote the navigation page to include a complete footer blocks management section:
- Add/remove/reorder footer blocks with drag ordering (up/down arrows)
- Edit block content based on type:
  - **text** — free-text textarea
  - **menu** — list of label/URL link pairs
  - **contact** — email, phone, address fields
  - **social** — Facebook, Instagram, X, TikTok, YouTube, WhatsApp URLs
  - **newsletter** — title, placeholder, button label
  - **payment_badges** — auto-rendered badges with optional note
  - **legal** — CGV, privacy, refund URLs
  - **map** — Google Maps embed URL
- Saves draft and publishes via `PUT /me/footer/draft` + `POST /me/content/publish`
- Also added the missing `utility` menu location (bar above header for contact/social)

---

### P1-5: StorefrontFooter Missing `newsletter` and `legal` Block Renderers
**File:** `frontend/src/components/store/StorefrontFooter.tsx`

**Bug:** The `StoreFooterBlock` type supports `newsletter` and `legal` block types, but the `renderBlockContent` function only handled `text`, `menu`, `contact`, `social`, `payment_badges`, `map`. Newsletter and legal blocks would render as `null`.

**Fix:** Added renderers for:
- **newsletter** — title, email input, subscribe button
- **legal** — list of CGV, privacy, refund links

---

## Round 1 Issues Found & Fixed (commit `245aec3`)

### P0-1: Publish Toggle Completely Broken
**File:** `frontend/src/app/hub/dashboard/online-store/page.tsx`

**Bug:** The publish toggle sent `{ status: "verified" | "unverified" }` to `PUT /api/pd/stores/me/maintenance`. The backend expects `{ enabled: boolean }`. Every toggle attempt returned a 400 validation error.

**Fix:** Rewrote `handleTogglePublish` to send `{ enabled: boolean }` — `true` for maintenance mode (offline), `false` for live.

---

### P0-2: Demo Product Fallbacks in ALL 20 Themes
**Files:** All 20 `*Theme.tsx` files

**Bug:** Every theme had demo products fallback that showed fake clickable products leading to 404s for empty stores.

**Fix:** Replaced with `const allProducts = products;` in all 20 themes.

---

### P0-3: 18 of 20 Themes Missing StorefrontHeader
**Files:** All 20 `*Theme.tsx` files

**Bug:** Only 2 themes had `StorefrontHeader`. The other 18 had no navigation, search, logo, cart, or mobile menu.

**Fix:** Added `StorefrontHeader` import and JSX to all 18 missing themes.

---

### P0-4: Themes Page Was a Stub Redirect
**File:** `frontend/src/app/hub/dashboard/online-store/themes/page.tsx`

**Fix:** Replaced stub with full theme gallery (20 cards, previews, color swatches, apply buttons).

---

### P0-5: Customers Endpoint Didn't Exist
**Files:** `backend/src/api/store.route.ts`, `frontend/src/app/hub/dashboard/online-store/customers/page.tsx`

**Fix:** Added `GET /me/customers` endpoint.

---

### P1-1: Navigation Manager Field Name Mismatch
**File:** `frontend/src/app/hub/dashboard/online-store/navigation/page.tsx`

**Fix:** Changed `label` → `localized_label`, added type selector and `reference_id`.

---

### P1-2: Hardcoded `pandamarket.tn` Domain
**Files:** 10+ files across frontend

**Fix:** Updated all domain references to `garbage.team`.

---

### P1-3: Integrations Page Missing `custom_body_js` Input
**File:** `frontend/src/app/hub/dashboard/online-store/integrations/page.tsx`

**Fix:** Added textarea for `custom_body_js`.

---

## Infrastructure Changes

1. **Vercel env vars added:**
   - `NEXT_PUBLIC_MARKETPLACE_DOMAIN=garbage.team` (production + preview)
   - `NEXT_PUBLIC_HUB_URL=https://garbage.team` (production + preview)

2. **Vercel deployment triggered:** `dpl_CFAchhtGpTUsKkTXUo9maodsDuFd`

3. **Render backend deploy triggered:** `dep-d9ne5cdaeets73bo9hs0`

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
| Git push to GitHub | ✅ PASS | `98e83db` pushed to `main` |

---

## System Audit Summary

### Theme System ✅ Functional
- 20 themes with complete configs (colors, typography, layout, layoutVariations, gridDensities, heroStyles, colorPresets)
- `ThemeWrapper.tsx` correctly maps theme IDs to components
- `ThemeCustomizer` has all 4 sections: layout, grid, hero, colors
- Theme preview works via `/store/[storeHost]/preview?token=...`
- Draft → preview → publish flow is functional
- All 20 themes now render `StorefrontHeader` and `StorefrontFooter`

### Menus & Navigation System ✅ Functional (with enhancement)
- Backend has full endpoints: `GET/PUT /me/navigation/draft`, `GET/PUT /me/footer/draft`, `POST /me/content/publish`
- `menu.service.ts` handles draft navigation, draft footer, publish, and public navigation
- `StorefrontHeader` correctly renders header menu items from `navigation.menus`
- `StorefrontFooter` renders footer blocks from `navigation.footer.blocks`
- **NEW:** Footer blocks management UI added (text, menu, contact, social, newsletter, payment_badges, legal, map)
- **NEW:** Utility menu location added to navigation page

### Page Builder System ✅ Functional
- Backend has 9 endpoints (list, get, create, update, delete, duplicate, versions, restore, preview)
- Frontend dashboard has full page builder with template picker, maintenance page, homepage override
- Storefront rendering handles homepage override and individual pages
- Preview token system works via `?pb_preview=...`

---

## Remaining Issues (Not Fixed — Lower Priority)

1. **Draft/Publish separation for menu items is broken** — The `pd_store_menu_item` table stores only the current (draft) items. When you publish, only the `published_revision` JSON field is updated, but `getPublicNavigation` reads from `pd_store_menu_item` directly. This means public navigation always shows the latest draft. Fixing this requires a database migration to add draft/published columns or a separate published items table.

2. **Email addresses still use `pandamarket.tn`** — `billing@pandamarket.tn`, `admin@pandamarket.tn`, `noreply@pandamarket.tn`, `support@pandamarket.tn` in backend defaults. These are email accounts, not domain names.

3. **Pre-existing ESLint warnings** — 35 `no-unused-vars` warnings in pre-existing code (not caused by storefront work).

4. **RLS disabled on 109 tables** — Security advisory: Row Level Security is disabled on all tables. Anyone with the anon key can read/modify all data. Enabling RLS requires creating policies for every table — a significant project.

5. **Documentation references `pandamarket.tn`** — `README.md`, `ai instructions/*.md`, `Caddyfile` still reference the old domain. These are documentation files, not runtime code.

6. **`EmptyStoreState` component created but not yet integrated** — The component exists but themes still use their inline empty states. Could be integrated for a richer empty store experience.

---

## Round 3 Issues Found & Fixed (commits `576d2fe` → `0f5aa7a`)

### P0-7: Wallet Funds Stuck in Pending (5555 TND Never Released)

**Files:** `backend/src/main.ts`, `backend/src/services/wallet.service.ts`, `backend/src/subscribers/order.subscriber.ts`, `backend/src/api/admin.route.ts`

**Root Cause #1:** `scheduleRecurringPayoutJobs()` and `scheduleRecurringSubscriptionJobs()` were never called in `main.ts`. The BullMQ worker was started, but no recurring job was ever queued. This means `walletService.releaseDueFunds()` never ran — pending funds stayed pending forever.

**Root Cause #2:** Per-payment-method retention days (`retention_days_flouci=2`, etc.) are stored as platform-level settings but were NOT propagated to `creditPending()`. The wallet's `retention_days` was set at creation time to `config.defaultRetentionDays` (default 7) and never updated. Even after the job runs, `available_at` was set 7 days in the future.

**Fix:**
- Call `scheduleRecurringPayoutJobs()` and `scheduleRecurringSubscriptionJobs()` after worker startup in `main.ts`.
- `creditPending()` now accepts optional `retention_days` parameter that overrides `wallet.retention_days`.
- `onPaymentCaptured()` resolves retention from platform config per gateway (flouci/konnect/mandat/cod) and passes it to `creditPending()`.
- Added admin endpoints: `POST /wallets/release-due`, `POST /wallets/sync-retention`.
- Bulk-released the stuck 5555 TND pending transaction (available_at was 2026-05-14, never released).
- Synced all wallets to `retention_days=2` to match platform config.

**Live data verified:** Atelier Médina wallet now shows `balance=5555.000`, `pending_balance=0.000`, `retention_days=2`.

### P1-9: Navigation Menu Item Selector Was Free-Text

**Files:** `frontend/src/components/dashboard/ReferenceSelector.tsx`, `frontend/src/app/hub/dashboard/online-store/navigation/page.tsx`

**Bug:** When adding a menu item, the seller had to type the reference ID (product ID, page ID, etc.) as free text — no way to search/select.

**Fix:** Created a new `ReferenceSelector` component — a searchable dropdown that fetches products, pages, and categories from the API. Sellers can now search and select the target entity instead of typing an ID.

### P1-10: No Mega Menu Support for Storefront

**Files:** `frontend/src/components/store/StorefrontHeader.tsx`, `frontend/src/app/hub/dashboard/online-store/navigation/page.tsx`

**Bug:** The storefront header only rendered simple dropdowns (max 192px wide, flat list). No support for mega menus with multiple columns or promotional images.

**Fix:**
- `StorefrontHeader` now renders a mega menu panel (multi-column) when a header menu item has 6+ children or has a promotional image.
- Navigation page supports nested children: sellers can add sub-links to any header menu item.
- Mega menu shows promotional image banner on the right when set.
- Tree helper functions for add/remove/update of nested menu items.

### P1-11: Seller Dashboard i18n Incomplete

**Files:** `frontend/src/app/hub/dashboard/layout.tsx`, `frontend/src/app/hub/dashboard/online-store/navigation/page.tsx`, `frontend/src/i18n/messages/{fr,en,ar}.json`

**Bug:** The dashboard layout had partial i18n (some strings used `t()`, many were hardcoded French). The navigation page had no i18n at all.

**Fix:**
- Added 25+ new translation keys for sidebar items (setupGuide, analytics, ads, media, messages, financialReport, onlineStore, themes, customize, menusNavigation, pages, domains, seoMeta, integrationsPixels, customers, etc.) in all three languages.
- Added `storefrontNav` section with 30+ keys for the navigation page (locations, item types, save/publish, mega menu, footer blocks).
- Dashboard layout: all navigation groups, account menu items, and button labels now use `t()`.
- Navigation page: all UI strings translated (title, buttons, locations, item types, feedback messages).
- Language switcher already present (`LocaleSwitcher` component).
- RTL support already handled by `LocaleContext` (`dir='rtl'` for Arabic).

---

## Validation

- Backend type-check: ✅ pass
- Backend tests: ✅ 347/347 pass
- Frontend type-check: ✅ pass
- Frontend tests: ✅ 86/86 pass
- Frontend ESLint: ✅ no errors
- Live marketplace: ✅ `https://www.garbage.team/` returns 200
- Live storefront: ✅ `https://prodypanda.garbage.team/` returns 200
- Backend health: ✅ `https://pandamarket-backend-zjr5.onrender.com/health` returns 200
- Vercel deploy: ✅ triggered (commit `0f5aa7a`)
- Render deploy: ✅ triggered (commit `0f5aa7a`)
