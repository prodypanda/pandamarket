# 10 — Storefront Theming & 20 Templates Deep Pass

> **Audited Surfaces:** `frontend/src/lib/themes.ts` (724 lines, 20 themes), `ThemeWrapper.tsx`, 20 theme components in `frontend/src/components/themes/*.tsx`, `ThemeCustomizer.tsx`, `frontend/src/app/store/[storeHost]/page.tsx`, `seed.ts`.

---

## 1. Inventory & Architectural Structure

### 1.1 Registry & Pricing
The platform defines 20 themes:
- **Free Themes (14):** Artisan, Classic, Coastal, Craft, Elegance, Flavor, Fresh, Garden, Kids, Medina, Minimal, Modern, Sahara, Urban.
- **Premium Themes (6):** Boutique (75 TND), Digital (80 TND), Studio (90 TND), TechHub (100 TND), Neon (120 TND), Luxe (150 TND).
- **Architecture Disconnect:** The theme registry (`themes.ts`) contains **no pricing or tier flags**. Premium flags exist only in PostgreSQL (`pd_theme.is_free = false`).

### 1.2 The Uniform Skeleton Flaw
Across all 20 themes, the page structure is virtually identical:
```
[StorefrontHeader] ➔ [Hero Block] ➔ [Category Pills] ➔ [Product Grid] ➔ [StorefrontFooter]
```
- **0 of 20 themes** contain promo banners, testimonials, newsletter forms, FAQs, trust badge rows, collection grids, or countdown timers.
- Meanwhile, the Page Builder component library already contains 14 of these blocks, but they are completely disconnected from the storefront themes.

---

## 2. Critical Broken Functionalities

### [STF-1] Fullscreen Theme Preview Displays Stale Settings
- **Forensic Evidence:** In `frontend/src/app/hub/dashboard/online-store/customize/page.tsx:111-118`:
  `draftThemeCustomization` posts `currentCustomization`, which only updates upon page fetch or save. `ThemeCustomizer.tsx` maintains draft edits in private state.
- **Impact:** Clicking "Aperçu en plein écran" displays old saved settings instead of the merchant's live draft edits.
- **Fix:** Add an `onChange` callback to `ThemeCustomizer` that synchronizes draft state to the parent page.

---

### [STF-2] Unsaved Changes Banner Never Fires
- **Forensic Evidence:** In `customize/page.tsx:163`, `setIsDirty(true)` is executed *inside* `onSave`, immediately before `handleSave` resets it to `false`.
- **Impact:** The unsaved changes banner never appears during editing.
- **Fix:** Set `isDirty = true` inside the `onChange` handler whenever user input mutates the theme config.

---

### [STF-3] Sidebar Layout Variation is a No-Op on 6 Advertising Themes
- **Forensic Evidence:** Flavor, Garden, Medina, Sahara, TechHub, and Urban advertise `layoutVariation: 'sidebar'` in `themes.ts`, but none of their JSX components import or render `ThemeLayout`.
- **Fix:** Wrap the product grid in `ThemeLayout` or remove `'sidebar'` from their advertised capabilities.

---

### [STF-4] Full-Width & Magazine Layouts Ignored by 17 Themes
- **Forensic Evidence:** 8 themes hardcode `max-w-6xl` or `max-w-7xl` container clamps in their outermost `div`, neutralizing `layoutVariation: 'full-width'`.
- **Fix:** Replace hardcoded clamps with `tc.layout.container` responsive tokens.

---

### [STF-5] Category Filtering Case-Sensitivity Split 10 / 10
- **Forensic Evidence:** 10 themes use `p.category?.toLowerCase() === selectedCategory?.toLowerCase()`, while the other 10 use exact case `p.category === selectedCategory`.
- **Impact:** If a seller inputs "Électronique" on product A and "électronique" on product B, half of the themes show only product A, while the other half show both.
- **Fix:** Standardize on a single shared `filterStoreProducts()` function in `shared.ts`.

---

### [STF-6] Client-Side Filtering Filters Only the Current Page
- **Forensic Evidence:** In `frontend/src/app/store/[storeHost]/page.tsx:544-554`:
  Category pill clicks filter the ~24 items loaded on the current page rather than issuing an updated query to the backend.
- **Fix:** Push category filters to the URL search params (`?category=...`) and trigger server-side re-fetching.

---

### [STF-7] All 20 Storefront Themes Use `unoptimized` on `next/image`
- **Forensic Evidence:** In every file under `frontend/src/components/themes/*.tsx`:
  `<Image src={product.thumbnail} ... unoptimized />`
- **Impact:** Automatic Next.js WebP transcoding and responsive srcset generation are disabled. Mobile shoppers download raw 5MB+ photos, destroying page speed.
- **Fix:** Remove `unoptimized` and register image domains in `next.config.ts`.

---

## 3. Missing Theming Features

### [STF-M1] Absence of Content Sections Beyond Hero + Grid
- Build a modular section renderer:
  ```tsx
  <ThemeSections sections={customization.sections} />
  ```
  Supporting: `Testimonials`, `Newsletter`, `PromoBanner`, `TrustBadges`, `FeaturedCollections`.

### [STF-M2] Video Hero is a Static Fake Play Button
- 7 themes advertise `heroStyle: 'video'`, but render a non-interactive play SVG icon over a background color.
- **Fix:** Add `heroVideoUrl` and `heroPosterUrl` to `ThemeCustomization` and render a real `<video playsInline autoPlay muted loop>` element.

### [STF-M3] Banner Hero Style Never Renders an Image
- In all 20 themes, selecting `heroStyle: 'banner'` falls back to a flat solid color container.
- **Fix:** Add `heroImageUrl`, `heroTitle`, `heroSubtitle`, and `heroCtaUrl` fields.

### [STF-M5] Complete Absence of Product Card Affordances
- Product cards lack:
  - Sale discount percentage badges (`-25%`).
  - Low stock warning badges.
  - Wishlist heart toggles.
  - Quick View modal buttons.
  - Direct "Ajouter au panier" buttons on hover.
- **Fix:** Refactor all 20 themes to consume a unified, highly polished `<StorefrontProductCard />` component.

---

## 4. The Free Premium Themes Exploit

- **Forensic Evidence:**
  - Route `/api/pd/themes/:themeId/purchase` requires payment (75–150 TND).
  - However, in `frontend/src/app/hub/dashboard/online-store/themes/page.tsx`, clicking "Activer le thème" on Boutique, TechHub, Neon, Studio, Luxe, or Digital directly sends `PUT /api/pd/stores/me/theme` with `{ theme_id }`.
  - The backend `PUT` handler does not verify whether the store has purchased the theme in `pd_theme_purchase`!
- **Impact:** **615 TND worth of premium themes are handed out for free.**
- **Fix:** In `store.service.ts:setTheme`, assert that if `theme.is_free === false`, a valid row exists in `pd_theme_purchase` for that `store_id`. Return `403 Payment Required` otherwise.
