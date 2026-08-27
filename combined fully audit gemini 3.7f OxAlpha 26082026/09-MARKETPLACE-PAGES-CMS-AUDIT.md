# 09 — Marketplace Pages (Platform CMS) Deep Pass

> **Audited Surfaces:** `backend/src/api/marketplace-cms.route.ts`, `backend/src/services/platform-cms.service.ts` (331 lines), tables `pd_platform_page` (migration 032) and `pd_platform_page_version` (migration 084), `frontend/src/app/(admin)/cms/page.tsx`, `frontend/src/app/(admin)/cms/[id]/page.tsx`, `frontend/src/app/hub/pages/[slug]/page.tsx`, `HubFooter.tsx`.

---

## 1. Inventory & Architecture

### 1.1 Backend Endpoints (`/api/pd/marketplace/cms`)

| # | Method | Path | Access Guard | Validation |
|---|---|---|---|---|
| 1 | GET | `/` | requireAuth + requireAdmin | None |
| 2 | GET | `/public` | Public | None |
| 3 | GET | `/slug/:slug` | Public | None |
| 4 | GET | `/slug/:slug/preview` | Preview Token | 15-min JWT |
| 5 | GET | `/:id/versions` | requireAdmin | None |
| 6 | POST | `/:id/versions/:versionId/restore` | requireAdmin | None |
| 7 | POST | `/:id/preview` | requireAdmin | None |
| 8 | GET | `/:id` | requireAdmin | None |
| 9 | POST | `/` | requireAdmin | `createPageSchema.parse()` inline |
| 10 | PUT | `/:id` | requireAdmin | `updatePageSchema.parse()` inline |
| 11 | DELETE | `/:id` | requireAdmin | None |

### 1.2 Current Database State
- `pd_platform_page`: Schema supports `id, slug, title, builder_data, html, css, is_published, show_in_footer, show_in_header, sort_order`. Lacks `seo_description`, `og_image`, `noindex`, `published_at`, and `draft_*` separation.
- **Current Live Rows:** **0 rows.** The platform has never seeded any marketplace pages.

---

## 2. Critical Broken Functionalities

### [CMS-1] `/cms` Route is Completely Unreachable from Admin UI
- **Forensic Evidence:** `(admin)/layout.tsx:248-325` sidebar navigation and `dashboard/page.tsx:193-199` Quick Jump menu contain zero links to `/cms`.
- **Impact:** Superadmin cannot discover or navigate to the Marketplace Pages CMS manager without typing the raw URL manually.
- **Fix:** Add a navigation item under "CATALOG & CONTENT" in `(admin)/layout.tsx:282-288` with i18n keys.

---

### [CMS-2] Session Loss Renders as "No Pages Found"
- **Forensic Evidence:** `cms/page.tsx:23` and `cms/[id]/page.tsx:16` use raw `fetch()` instead of `fetchWithCsrf()`.
- **Impact:** When the 15-minute access token expires, the list displays "No pages found" and the editor shows "Page not found" instead of triggering a refresh or redirecting to login.
- **Fix:** Refactor both CMS pages to use `fetchWithCsrf`.

---

### [CMS-3] Page Creation Returns 500 on Duplicate Slug
- **Forensic Evidence:** `marketplace-cms.route.ts:143` parses schemas inline and catches raw PostgreSQL unique constraint violation `23505`, bubbling as an unhandled 500 error.
- **Fix:** Map PG code `23505` to `PdConflictError(PdErrorCode.ALREADY_EXISTS, 'A page with this slug already exists')`.

---

### [CMS-4] Editor SEO & Navigation Settings Silently Discarded
- **Forensic Evidence:** In `PageBuilderEditorCore.tsx:2157-2162`, the editor sends `seo_title`, `seo_description`, `og_image`, `noindex`, and `show_in_navigation`. The Zod schema and database table lack these fields, stripping them silently on every save.
- **Impact:** Admins spend time configuring page SEO, but on reload, the settings revert to blank.
- **Fix:** Add migration for `seo_description, og_image, noindex`, update Zod schema, and map `show_in_navigation` to `show_in_header`.

---

### [CMS-5] Public Page SEO Metadata Fails to Resolve
- **Forensic Evidence:** `hub/pages/[slug]/page.tsx:58` attempts to read `page.settings.*`, a column that does not exist.
- **Impact:** All published marketplace pages lack meta descriptions, canonical URLs, and OpenGraph tags.
- **Fix:** Read the new SEO columns from `pd_platform_page`.

---

### [CMS-6] Media Library 404s in Platform Mode
- **Forensic Evidence:** `PageBuilderEditorCore.tsx:1428` calls `/api/pd/platform-media`, but the real endpoint mounted in backend is `/api/pd/admin/platform-media`.
- **Fix:** Correct the API request URL in platform mode.

---

### [CMS-7] Page Publishing Never Invalidates Next.js Cache
- **Forensic Evidence:** `revalidatePageBuilderCache` returns early if `storeId` is absent. `hub/pages/[slug]/page.tsx` caches responses with no platform cache tag.
- **Impact:** Edits made to published marketplace pages take hours or days to appear to shoppers.
- **Fix:** Add a dedicated cache tag `platform-cms-pages` and trigger `revalidateTag('platform-cms-pages')` on publish.

---

### [CMS-10] Dynamic Blocks Render Placeholder Text Publicly
- **Forensic Evidence:** `hub/pages/[slug]/page.tsx:88` passes no `dynamicContext`. Store blocks render literal placeholders: *"Produit réel"*, *"Catégorie réelle"*.
- **Fix:** Hide store-scoped blocks in platform mode; introduce platform blocks (e.g. Marketplace Categories, Trending Products).

---

## 3. Missing Capabilities vs Store Page Builder

| Feature | Store Page Builder | Platform CMS |
|---|---|---|
| **Template Picker** | ✅ Included | ❌ Missing |
| **Duplicate Page** | ✅ Supported | ❌ Missing |
| **Draft vs Published Separation** | ✅ 12 draft columns | ❌ Single row (edits go live instantly) |
| **Page-Count Quotas** | ✅ Plan-gated | ❌ Unbounded |
| **Page Analytics** | ✅ Views & conversions | ❌ None |
| **SEO Columns** | ✅ Full support | ❌ Discarded on save |
| **Menu Builder** | ✅ 4 menu tables | ❌ Hardcoded footer |

---

## 4. Content Deficit: The Marketplace Has Zero Legal Pages

Because `pd_platform_page` has 0 rows, all default platform legal and support links in `platform-config.service.ts:45-50` redirect to `/hub/search`:
- Terms of Service (`/terms`) ➔ Redirects to `/hub/search`
- Privacy Policy (`/privacy`) ➔ Redirects to `/hub/search`
- Refund Policy (`/refund`) ➔ Blank
- Help Center (`/help`) ➔ Redirects to `/hub/search`

**Immediate Action:** Execute a seed script creating standard Tunisian e-commerce legal templates for Terms, Privacy, Refund, and Help Center.
