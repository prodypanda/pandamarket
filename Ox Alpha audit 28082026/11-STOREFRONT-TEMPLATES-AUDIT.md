# 11 — Storefront Templates / Theming — Dedicated Deep Pass

> Owner report: *"for the storefront there are a lot of missing works for the templates."* **Confirmed, and worse than expected.** All 20 themes render the *same* skeleton (header → hero → category pills → product grid → footer). No theme has a second content section. 3 of 4 layout variations are no-ops on most themes, 4 of 7 `ThemeConfig` fields are entirely dead, and the premium purchase endpoint hands out 615 TND of paid themes for free.

---

## 1. Inventory

### 1.1 Registry — `frontend/src/lib/themes.ts` (724 lines, 20 themes)

Premium themes (DB `pd_theme.is_free=false`): **boutique 75 · techhub 100 · neon 120 · studio 90 · luxe 150 · digital 80 TND** (seeded `backend/data/seed.ts:212-380`). The registry itself has **no price/premium/tier/capability flags** — premium status lives only in Postgres.

All 20 have dedicated components and are wired in `ThemeWrapper.tsx:24-45`. Unknown `theme_id` falls back to Classic in 10 places.

### 1.2 Section matrix — every theme is identical

| Section | Themes having it |
|---|---|
StorefrontHeader | 20/20 (shared component) |
Hero (4 branches) | 20/20 |
Category pill row | 20/20 |
Product grid | 20/20 |
Empty state | 20/20 (hand-rolled, 20 different strings) |
StorefrontFooter | 20/20 (shared) |
**Banner / testimonials / newsletter / FAQ / collections / trust row / blog / countdown** | **0/20** |

Meanwhile the page-builder ships 14 such block types.

Copy-paste clusters (Jaccard on normalized lines): Garden↔Studio 0.462, Garden↔Urban 0.436, Studio↔Urban 0.433, Coastal↔Studio 0.426, Coastal↔Garden 0.419, Neon↔Sahara 0.404 (cluster 1); Craft↔Fresh 0.396, Craft↔Digital 0.394, Digital↔Fresh 0.393, Craft↔Kids 0.384, Fresh↔Kids 0.382 (cluster 2). Elegance↔Medina share a 667-char identical normalized prefix.

**`displayProducts` filter duplicated 20× in two variants** → category filtering is **case-sensitive in 10 themes, case-insensitive in the other 10**.

### 1.3 Customization support

| Capability | Honored |
|---|---|
7 colors + `colorPresetId` | ✅ 20/20 |
`gridDensity` | ✅ 20/20 |
`heroStyle` | ✅ 20/20 (but see STF-M2/M3) |
`layoutVariation: sidebar` | ⚠️ **11/20** (9 don't import `ThemeLayout`; **6 of those advertise `sidebar`**) |
`layoutVariation: full-width / magazine` | ❌ **3/20** (only Classic, Coastal, Minimal lack an outer `max-w-*` clamp) |
logo / logo_light / logo_dark | ✅ |
favicon | ⚠️ injected as raw `<link>` inside a client component body ×20; **no upload UI anywhere** |
fonts (body/heading) | ❌ not in `ThemeCustomization` at all (i18n keys exist with no control) |
`layout.borderRadius` | ❌ **0 references** |
`layout.headerStyle` | ❌ **0 references** |
`layout.productGrid` (incl. `masonry`) | ❌ **0 references** |
`theme.colors.*` (Tailwind strings) | ❌ **0 references** |
`typography.headingFont` | ❌ **1/20 applies it** (6 themes declare `playfair` and hardcode `font-serif`) |
`typography.headingStyle` | ⚠️ 3/20 |
hero image / title / subtitle / video URL | ❌ **not modelled at all** — `video` heroStyle renders a **fake play button** in every theme |

---

## 2. Broken

| ID | Issue | Evidence | Fix |
|----|-------|----------|-----|
| **STF-1** 🔴 | **Fullscreen preview shows stale settings** — `draftThemeCustomization` posts `currentCustomization`, which only updates on fetch/save; `ThemeCustomizer` keeps edits in private state | `customize/page.tsx:111-118,33-34,162`; `ThemeCustomizer.tsx:51` | Add `onChange` prop; keep page state in sync |
| **STF-2** 🔴 | **Unsaved-changes banner can never fire** — `isDirty` set true at :163 *inside* `onSave`, one line before `handleSave` clears it | `customize/page.tsx:163` vs `:64` | Drive `isDirty` from the new `onChange` |
| **STF-3** | `sidebar` is a **no-op on 6 themes that advertise it** (Flavor, Garden, Medina, Sahara, TechHub, Urban) | `themes.ts:440,588,525,504,411,567`; no `ThemeLayout` import | Wrap grids in `ThemeLayout` as `ClassicTheme.tsx:102` does, or remove the option |
| **STF-4** | `full-width`/`magazine` no-ops on **17/20** — 8 themes nest `ThemeLayout` inside their own `max-w-6xl/7xl`, 9 never call it | e.g. `BoutiqueTheme.tsx:169`, `ModernTheme.tsx:176` | Delete hardcoded clamps; adopt `tc.layout.container` |
| **STF-5** | **Category filtering case-sensitivity split 10/10** | `MinimalTheme.tsx:35` vs `TechHubTheme.tsx:40-41` | One shared `filterStoreProducts()` in `shared.ts` |
| **STF-6** | **Client-side filtering only filters the current page** — pills filter ~24 items and the pill list itself changes as the seller paginates | `page.tsx:544-554`, `StorefrontProductLoading.tsx:259`, `MinimalTheme.tsx:26` | Commit pills to URL via `useStorefrontCatalogState().update({category})`; drop local filter |
| **STF-7** | `storefront_product_loading_mode` **ignored on `/products`** (no provider mounted there) | `products/page.tsx:242-252` | Mount `StorefrontProductLoadingProvider`; remove duplicate paginator in `CatalogControls:258-284` |
| **STF-8** | `pd_theme.preview_url` points at `/themes/{slug}/preview.jpg` — **path doesn't exist**, and the field is never rendered | `seed.ts:218`; no `public/themes/` | Generate real screenshots + render, or drop the field |
| **STF-9** | Preview viewport switcher is cosmetic — resizes a `<div>`, so Tailwind breakpoints still resolve against the window | `StorefrontPreviewBar.tsx:172-184` | Render into an `<iframe>` and size that |

## 3. Missing per theme

- **STF-M1** 🔴 **No theme has any section beyond hero + grid.** Zero testimonials/newsletter/banner/collections/FAQ/trust-row across all 20. *Fix:* build `components/themes/sections/*` (Testimonials, Newsletter, PromoBanner, TrustBadges, CollectionsGrid), add an ordered `sections?: ThemeSection[]` to `ThemeCustomization`, render between hero and grid in all 20.
- **STF-M2** `heroStyle:'video'` is a **fake play button** in all 20; 7 themes advertise it. *Fix:* add `heroVideoUrl`/`heroPosterUrl`, render `<video muted loop playsInline poster>`, gate the option on a URL.
- **STF-M3** 🔴 `heroStyle:'banner'` **never shows an image** — it's the else-fallback rendering a solid color block. *Fix:* add `heroImageUrl/Position/Fit`, `heroTitle/Subtitle/CtaLabel/CtaHref` (the page-builder already models exactly this shape — reuse it).
- **STF-M4** Dead hero branches: `minimal` unreachable for digital/luxe/techhub/urban, `video` for 13 themes, `split` for minimal/studio/neon (40-70 lines of dead JSX per file).
- **STF-M5** **No product-card affordances anywhere**: no `compare_at_price` badge (field exists), no wishlist, no quick view, no add-to-cart from grid, no rating. *Fix:* one `ThemeProductCard` used by all 20 (also removes 20 duplicated card bodies).
- **STF-M6** Cart/checkout/account/404/500 not theme-aware beyond colors; cart & account hand-roll their own headers; `not-found.tsx`/`error.tsx` hardcode `#16C784` and English.
- **STF-M7** `masonry` grid declared for modern/artisan/studio, never built.
- **STF-M8** `mobile` and `utility` menu locations are **editable in the dashboard and never rendered**; mobile drawer reuses the header menu and drops nested children.

## 4. Dead customization settings

| Setting | Consumers | Fix |
|---|---|---|
`layout.borderRadius` (20 values) | 0 | expose as `--tc-radius`, or delete |
`layout.headerStyle` | 0 | map to `StorefrontHeader variant` |
`layout.productGrid` | 0 | drive gap/aspect-ratio, or delete |
`theme.colors.*` | 0 | delete (superseded by `resolveThemeColors`) |
`typography.headingFont` | 1/20 | apply in the other 6 declaring themes |
`settings.seo.*` (meta_title/description/keywords/og_image_url) | **0** — `publicStorefrontSettings` doesn't even expose `seo`, so the storefront cannot read it | add to the public projection, consume in `generateMetadata` |
`settings.integrations.custom_head_js` / `custom_body_js` | **0 anywhere** — saved, never rendered | expose behind consent + CSP review (**arbitrary JS: treat as security-sensitive**) |
`favicon_url` | read by 20 themes, **no writer UI** | add picker next to the 3 logo pickers; move to `metadata.icons` |
`pd_theme.is_premium` | read into types, never used (UI branches on `!free`); never seeded → false for all 6 paid themes | set `is_premium = NOT is_free` or delete the column |
`pd_theme.preview_images` / `features` | 0 renderers, never seeded | render in a theme detail modal, or drop |

## 5. Inconsistencies

1. **Three places to change the theme with three behaviors**: `online-store/themes` (no gating/price, applies instantly), `online-store/customize`, and the legacy `dashboard/settings` theme tab (gating + purchase + a second embedded `ThemeCustomizer`). Consolidate to one gallery.
2. **Mixed FR/EN inside one storefront**: shared chrome is FR-only; 11 themes are EN-only; `ar.json` (174 KB) is used by **no** storefront surface. A Studio store shows FR chrome + EN body.
3. **Hardcoded colors defeat presets** in 12 themes (Modern keeps purple/indigo spheres under every preset; TechHub cards always `#111111`; Sahara `#FFFBF5`; Neon `#0A0A0A`; Urban forces black; Digital `#1A1A2E`; …).
4. `colorVars()` CSS variables are written by all 20 and consumed by **one** file.
5. **Dark themes break in shared chrome**: search dropdown and mega-menu panel hardcode white; nothing ever sets `dark` on `<html>` for storefronts.
6. `getStoreThemeLogoSurface` hardcodes a 5-theme dark list → dark *presets* of light themes get the wrong logo (a luminance helper already exists and is used correctly elsewhere).
7. **Panda/Ox brand colors leak into storefronts** (`#B91C1C`, emerald-600, slate borders).
8. `ThemeLayout` and `ThemeCustomizer` hardcode French labels.
9. 🔴 **Page-builder homepage replaces the theme shell** — renders a bespoke 16px header + plain footer, so the store silently loses the announcement bar, search, mega menu, cart badge, `pd_store_menu` and all footer blocks. (`pages/[slug]` does it correctly — copy that pattern.)
10. **`settings` write is a shallow JSONB merge** → saving colors can wipe `layoutVariation` set by another tab.
11. `publishThemeDraft` leaves `draft_theme_id`/`draftThemeCustomization` behind → draft stays "pending" forever after publish.
12. `/products` uses the server renderer while `/` uses the client one → divergent behavior on the same theme.
13. `/products` builds `branding` without `marketplace_*` fields → "PandaMarket" leaks on rebranded marketplaces.

## 6. Premium flow gaps

- **STF-P1** 🔴 **Purchase requires no payment.** `POST /themes/:id/purchase` accepts an optional, client-supplied, unvalidated `payment_reference` and inserts a purchase with `amount_paid = theme.price` — no payment intent, no gateway callback, no wallet debit, no ledger, no idempotency, no invoice. **615 TND of themes free per store.** (`theme.route.ts:41-58`, `theme.service.ts:128-162`; the service imports no payment/wallet module.)
  *Fix:* `POST /themes/:id/purchase-intent` → pending purchase + Flouci/Konnect payment (model on `subscription-payment.service.ts`), mark paid only from the verified webhook; or atomic wallet debit + ledger entry.
- **STF-P2** Gallery UX invites a 403: `online-store/themes` never fetches `/api/pd/themes` or `/purchases/mine`; all 20 render with identical "Apply" buttons, no price, no lock → clicking Luxe surfaces a raw 403. (Entitlement itself **is** enforced in `store.service.ts:782-823` and covered by tests.)
- **STF-P3** `publishThemeDraft` has **no entitlement check**; combined with `updateSettings` accepting `z.record(z.unknown())`, a stray `draft_theme_id` publishes a premium theme unpaid.
- **STF-P4** No refunds/revocation/expiry (`pd_theme_purchase` has no status), no admin surface for theme sales.
- **STF-P5** Nothing happens after purchase (log line only) — no event, notification, email, or auto-apply.
- **STF-P6** `pd_theme.price` is `DECIMAL(10,2)` while all other money columns and the UI use 3 decimals.
- **STF-P7** Re-seeding cannot correct pricing (`ON CONFLICT DO UPDATE` only touches name/description/preview_url).
- **STF-P8** FK split footgun: `pd_store.theme_id`→`slug` but `pd_theme_purchase.theme_id`→`id`; frontend purchases by id and applies by slug.
- **STF-P9** Move `/purchases/mine` above `/:slug` to avoid future shadowing.

## 7. Quality

- **All 20 themes use `next/image` with `unoptimized`** (also header/footer) → the 16 configured `remotePatterns` are never exercised; storefront LCP is a full-size origin image.
- **A11y floor**: across all 20 theme files — 0 `focus-visible`, 0 `aria-label`, 0 `aria-pressed`, 0 `role`, 0 `type="button"`. Category pills are toggles with no state exposed.
- `<link rel="icon">` injected inside a client component body (×20), outside `<head>`, re-rendered on every update.
- Search autocomplete has **no request cancellation** → stale response can overwrite; failure and zero-results render identically.
- ⚠️ **Storefront search calls `/api/v1/search/...`** while the backend mounts `/api/pd/search` and rewrites only `/api/pd/:path*` — **appears to 404 in production**. *Flagged as needs live verification* (`StorefrontHeader.tsx:102`, `main.ts:322,349`, `next.config.ts:28-31`).
- Two full filter/sort UIs with divergent options (`CatalogControls` vs `ThemeLayout`, the latter `hidden lg:block` with no mobile equivalent).
- `EmptyStoreState.tsx` is dead (52 lines, 0 importers) while 20 themes hand-roll empty states.
- `formatStorePrice` hardcodes TND/3 decimals — no currency abstraction in the theme layer.
- `getResizedImageUrl` applied to a **map embed URL** before use as `<iframe src>`.
- Unused: `locale` in 2 pages, `variation` prop in `ThemeLayout`, `token` in `StorefrontPreviewBar`.

## 8. Tests

Present: `theme-entitlement.test.ts` (4 cases), `theme-preview.test.ts` (4 cases).
Missing: `purchaseTheme` untested; `resolveThemeColors`/`getGridClasses`/`getLayoutClasses`/`useThemeCustomization` untested; **zero rendering tests for any of the 20 themes**; `ThemeCustomizer` untested; **visual regression is fake** (`storefront-visual.spec.ts:24` uses `?preview_theme=` — a parameter that exists nowhere; asserts only `screenshot.length > 1000`, no baselines); no per-theme e2e; storefront specs wrap everything in `if (await x.isVisible())` so they pass vacuously; no a11y test.

---

## 9. Fix checklist — Storefront templates

### Tier A — revenue + the "templates don't work" symptom
- [ ] 🔴 Gate `POST /themes/:id/purchase` behind real payment (intent + webhook, or atomic wallet debit + ledger) — **STF-P1**
- [ ] Add entitlement check to `publishThemeDraft`; blacklist `theme_id`/`draft_theme_id`/`themeCustomization` in `updateSettings` — **STF-P3**
- [ ] Add `onChange` to `ThemeCustomizer`; fix preview draft + `isDirty` — **STF-1/STF-2**
- [ ] Theme gallery: fetch `/themes` + `/purchases/mine`, show price/lock/purchase CTA, reuse the existing confirm modal — **STF-P2**
- [ ] Consolidate the 3 theme-change surfaces into one — **INC-1**

### Tier B — make advertised options real
- [ ] Wrap all 20 grids in `ThemeLayout`; delete hardcoded `max-w-*` clamps — **STF-3/STF-4**
- [ ] Shared `filterStoreProducts`; move category filtering to URL/server — **STF-5/STF-6**
- [ ] Mount loading provider on `/products`; remove duplicate paginator — **STF-7**
- [ ] Implement or delete: `borderRadius`, `headerStyle`, `productGrid`/`masonry`, `theme.colors.*`, `headingFont` in 6 themes — **§4**
- [ ] Add hero content model (image/title/subtitle/CTA/video) + customizer controls — **STF-M2/STF-M3**
- [ ] Prune unreachable hero branches or add the styles to the registry — **STF-M4**

### Tier C — the actual "missing template work"
- [ ] Build shared sections library (Testimonials, Newsletter, PromoBanner, TrustBadges, CollectionsGrid, FAQ) + ordered `sections` in customization; wire into all 20 — **STF-M1**
- [ ] Build `ThemeProductCard` with badge/wishlist/quick-add/rating; adopt in all 20 — **STF-M5**
- [ ] Theme-ize cart/checkout/account/404/500 via `renderStorefrontTheme` children — **STF-M6**
- [ ] Render `mobile`/`utility` menu locations; accordion for nested children in the drawer — **STF-M8**
- [ ] Preserve theme shell when a page-builder homepage exists — **INC-9**
- [ ] Storefront i18n: route all theme strings through `translate(locale, 'storefront.theme.*')`; pass locale from server pages — **INC-2**
- [ ] Replace hardcoded hex/Tailwind colors with `colorVars()` derivations; fix dark chrome; luminance-based logo surface; remove Panda brand colors — **INC-3/4/5/6/7**
- [ ] Expose `settings.seo.*` in the public projection and consume in metadata; add favicon picker — **§4**
- [ ] Deep JSONB merge for `settings`; clear draft keys on publish — **INC-10/INC-11**
- [ ] Unify `/` and `/products` renderers; pass full branding — **INC-12/INC-13**
- [ ] Drop `unoptimized`, add `sizes` per grid density — **Q-1**
- [ ] A11y pass: `type="button"`, `aria-pressed`, `focus-visible`, `nav aria-label`, `aria-current` — **Q-2**
- [ ] Favicon via `metadata.icons`; abort-controller + error state on search; verify `/api/v1/search` path — **Q-3/Q-4/Q-5**
- [ ] Unify filter/sort into one component with mobile drawer; adopt or delete `EmptyStoreState` — **Q-6/Q-7**

### Tier D — template platform features
- [ ] Theme import/export (signed `.pmtheme`), preview-before-apply using existing `draft_theme_id`, theme versioning/rollback
- [ ] Custom CSS injection (sanitized) + decision on `custom_*_js` (consent + CSP)
- [ ] Per-page theme overrides; section reordering in themes; scheduling for hero/sections
- [ ] Real theme screenshots + detail modal using `preview_images`/`features`; fix `is_premium`/price scale/seed updates — **STF-8, STF-P6/P7**
- [ ] Tests: parameterized render suite for 20 themes, registry↔component contract test (would have caught STF-3/4/M4), customizer test, purchase-payment regression test, real visual regression with baselines (20 themes × 3 viewports), a11y via `@axe-core/playwright`, de-vacuous the e2e specs
