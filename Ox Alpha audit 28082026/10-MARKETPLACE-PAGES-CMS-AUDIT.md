# 10 — Marketplace Pages (Platform CMS) — Dedicated Deep Pass

> Owner report: *"the marketplace pages have missing work and the superadmin can't create or manage marketplace pages."*
> **Verdict: the symptom is real; the cause is the UI layer, not the API.** The backend is complete (11 endpoints incl. versions/restore/preview). The superadmin simply has **no link to `/cms` anywhere in the admin panel**, both CMS pages use bare `fetch` (so an expired token renders "No pages found" indistinguishably from "broken"), and the editor sends five fields the API silently discards.

---

## 1. Inventory

### 1.1 Backend endpoints — mounted `/api/pd/marketplace/cms` (`main.ts:331`)

| # | Method | Path | Guard | Validation |
|---|---|---|---|---|
| 1 | GET | `/` | requireAuth + requireAdmin | — |
| 2 | GET | `/public` | **public** | — |
| 3 | GET | `/slug/:slug` | **public** | — |
| 4 | GET | `/slug/:slug/preview?pb_preview=` | token | — |
| 5 | GET | `/:id/versions` | admin | — |
| 6 | POST | `/:id/versions/:versionId/restore` | admin | — |
| 7 | POST | `/:id/preview` | admin | — |
| 8 | GET | `/:id` | admin | — |
| 9 | POST | `/` | admin | `createPageSchema.parse()` **inline** |
| 10 | PUT | `/:id` | admin | `updatePageSchema.parse()` **inline** |
| 11 | DELETE | `/:id` | admin | — |

Service `platform-cms.service.ts` (331 lines): list/listPublic/get/getBySlug/createPublishedVersion (snapshot, prune to 20)/listVersions/restoreVersion/createPagePreviewToken (15-min JWT, slug-bound)/getBySlugForPreview/create/update/delete. Sanitization correctly reuses the store builder's `sanitizeHtml`/`sanitizeCss` on create (:257-258), update (:298-299), restore (:188-189).

### 1.2 Database
`pd_platform_page` (migration `032`): `id, slug UNIQUE, title, builder_data JSONB, html, css, is_published, show_in_footer, show_in_header, sort_order, created_at, updated_at`. **No SEO columns, no locale, no draft_* columns, no published_at, no settings column.**
`pd_platform_page_version` (migration `084`): 14 columns incl. `seo_title`, `show_in_navigation` — but **omits `seo_description`, `og_image`, `noindex`**.
Live row count: **0** — nothing in the repo ever seeds this table.

### 1.3 Frontend
`(admin)/cms/page.tsx` (123 lines) — list; create via `prompt()` + client slugify; delete via `confirm()`. Renders Title/Slug/Status/Edit/Delete only.
`(admin)/cms/[id]/page.tsx` (58 lines) — hosts `PlatformPageBuilderEditor` → `PageBuilderEditorCore` with `mode="platform"`; `onSave` is an empty comment block (:52-54).
Public: `hub/pages/[slug]/page.tsx` (90 lines) — `SafePageRenderer`, preview branch, `notFound()` when unpublished.
Only consumer of CMS pages anywhere: `HubFooter.tsx:32,175` (`show_in_footer`). `HubNavbar` never queries CMS → `show_in_header` is dead.

---

## 2. Broken

| ID | Issue | Evidence | Fix |
|----|-------|----------|-----|
| **CMS-1** 🔴 | **`/cms` unreachable from the admin UI** — absent from sidebar and dashboard Quick Jump; only whitelisted in middleware | `(admin)/layout.tsx:248-325`, `dashboard/page.tsx:193-199`, `middleware.ts:96` | Add nav entry under CATALOG & CONTENT (`layout.tsx:282-288`) + 3 i18n keys |
| **CMS-2** 🔴 | **Session loss looks like a broken feature** — both pages use bare `fetch`, no 401-refresh-retry; list shows "No pages found", editor "Page not found" | `cms/page.tsx:23`, `cms/[id]/page.tsx:16` vs `lib/api.ts:87-115` | Swap to `fetchWithCsrf`; distinguish HTTP error from empty result |
| **CMS-3** | **Create returns 500** on validation failure *and* on duplicate slug (inline `.parse()` → raw ZodError → wrapped 500; no unique-violation mapping). The list slugifies from a `prompt()` with no dedup, so creating "Terms of Service" twice → 500 | route :143; service :247 | Use `validate(createPageSchema)` middleware; map PG `23505` → `PdConflictError{field:'slug'}` like `page-builder.service.ts:328-345` |
| **CMS-4** 🔴 | **Editor's SEO/noindex/nav fields silently discarded** — editor sends `seo_title`, `seo_description`, `og_image`, `noindex`, `show_in_navigation`; zod strips them; no columns exist; on reload the panel re-initializes blank = invisible write-loss loop | `PageBuilderEditorCore.tsx:2157-2162` vs route :16-26 | Migration adding the 4 SEO columns; extend zod + COALESCE SET list; map `show_in_navigation`→`show_in_header` |
| **CMS-5** | **Public SEO metadata never resolves** — reads `page.settings.*`, a column that doesn't exist → every marketplace page ships with title only, no description, no canonical, no robots | `hub/pages/[slug]/page.tsx:58` | After CMS-4 read real columns; add canonical from `marketplace_public_url`, `robots` from `noindex` |
| **CMS-6** | **Platform editor's media library 404s** — requests `/api/pd/platform-media`; the real route is `/api/pd/admin/platform-media` → asset manager permanently empty | `PageBuilderEditorCore.tsx:1428` vs `admin/smtp-config.routes.ts:115` | Fix path + map response shape |
| **CMS-7** | **Publishing never invalidates the Next cache** — `revalidatePageBuilderCache` returns early without `storeId`; revalidate route hard-requires `storeId`; hub fetch caches 60s with no tag while the module declares `revalidate = 0` | `PageBuilderEditorCore.tsx:2193-2197`, `page-builder-cache.ts:24`, `api/page-builder/revalidate/route.ts:16-18`, `hub/pages/[slug]/page.tsx:8,23` | Add platform tag + admin-gated platform branch; remove the conflicting revalidate |
| **CMS-8** | PUT response shape mismatch (`{data}` vs editor reading `data.page.slug`) — masked by CMS-7 | route :157 vs core :2175 | Return both or normalize client |
| **CMS-9** | **Version restore is destructive and mislabeled** — writes straight into the live row (published page changes instantly) while the button says `restoreAsDraft`; drops slug/footer/sort; returns hardcoded `seo_*: null` which the editor then applies, wiping the panel | service :175-201, core :3855, :1355-1363 | Restore into `draft_*` (needs CMS-M2); carry all snapshot columns; return the real row |
| **CMS-10** | **Dynamic blocks render as placeholder text publicly** — platform block panel offers 5 store-scoped blocks; public renderer passes no `dynamicContext` → visitors see literal "Produit réel"/"Catégorie réelle"/"Email réel" | core :297-458, `hub/pages/[slug]/page.tsx:88`, `dynamic-blocks.ts:500` | Hide store blocks in platform mode; add platform blocks (marketplace categories/trending/contact) + a marketplace `dynamicContext` |
| **CMS-11** | 3 failing store API calls on every platform editor load (`/stores/me`, `/products`, `/categories` → 403/404 swallowed) | core :1616-1648 | Guard `if (!isPlatform)` |
| **CMS-12** | AI copy helper unusable in platform mode (route requires `requireStore` + `has_ai_seo`; superadmin has no store) yet the button still fires | core :2603, `ai.route.ts:593-598` | Hide panel when platform, or add an admin-scoped AI route |
| **CMS-13** | Social-preview URL wrong: renders `platform.{domain}` instead of `{domain}/hub/pages/{slug}` | core :3564 | Fix template |

## 3. Missing

- **CMS-M1** No rename and no slug change from any UI (`persistPage` never sends `title`/`slug`; list only sets title once at creation) — API supports both.
- **CMS-M2** 🔴 **No draft/published separation.** With 30s autosave, editing a published legal page pushes every keystroke batch to production. Port migration `027`'s twelve `draft_*` columns + `COALESCE(draft_x, x)` selects.
- **CMS-M3** No `published_at` on the live table → no "last published" display/ordering.
- **CMS-M4** List has no publish toggle, no footer/header toggles (fetched but not rendered), no reorder, no preview link, no search/filter, no pagination, no duplicate.
- **CMS-M5** No duplicate endpoint (stores have `POST /pages/:id/duplicate`).
- **CMS-M6** `show_in_header` is dead end-to-end (column+index+zod+service, no writer, no renderer).
- **CMS-M7** Marketplace pages absent from `sitemap.xml` (hub branch hardcodes 7 URLs; store branch does include pages).
- **CMS-M8** `deletePage` has no existence check → 204 for unknown ids.
- **CMS-M9** No page-count limit, no platform kill-switch setting for the CMS surface.
- **CMS-M10** Audit log mis-categorizes CMS mutations as `resource_type='marketplace'`.
- **CMS-M11** No down-migration for `032`.
- **CMS-M12** Preview of an unpublished page renders body with `<title>Page Not Found</title>` and no `noindex` (store version handles this).

## 4. Parity gaps vs store pages

| Capability | Store | Platform |
|---|---|---|
Templates library (`TemplatePicker`) | ✅ | ❌
Create from template HTML/CSS | ✅ | ❌ (create schema has no html/css)
Duplicate | ✅ | ❌
Draft vs published columns | ✅ | ❌
Restore → draft | ✅ | ❌ (live)
Version snapshot completeness | 18 cols | 14 (3 SEO cols dropped)
SEO fields | ✅ | ❌
Nav + footer placement | ✅ both | footer only
Per-page analytics | ✅ (`pd_store_page_analytics_event`, FK-bound to store pages) | ❌ structurally impossible
Analytics in list (`views_30d`) | ✅ | ❌
Dynamic blocks resolved | ✅ | ❌
Menus / footer blocks builder | ✅ (4 tables + revisions) | ❌ no `pd_platform_menu*`
Homepage override (`is_homepage`) | ✅ | ❌
Maintenance-page template flow | ✅ | ❌
Cache-tag revalidation | ✅ | ❌
ISR with tags | ✅ | ❌ bare 60s
Slug conflict → 409 | ✅ | ❌ 500
Zod errors → 400 | ✅ | ❌ 500
Scheduling / multi-locale | ❌ | ❌ (neither)

## 5. Content gaps — the marketplace has **no legal pages at all**

`pd_platform_page` has 0 rows. Meanwhile the footer links point at `/hub/search`:

| Page | Setting key | Current default | Status |
|---|---|---|---|
Terms/CGU | `marketplace_terms_url` | `/hub/search` | **missing** |
Privacy | `marketplace_privacy_url` | `/hub/search` | **missing** |
Help centre | `marketplace_help_url` | `/hub/search` | **missing** |
Contact | `marketplace_contact_url` | `/hub/search` | **missing** |
Refund | `marketplace_refund_url` | `''` (link hidden) | **missing** |
Cookie policy | `marketplace_cookie_policy_url` | `''` (link hidden) | **missing** |
About / FAQ / Seller guide | *(no key at all)* | Amazon template hardcodes `/hub`, `/hub/cases` | **missing** |

Defaults: `platform-config.service.ts:45-50`; renderers `HubFooter.tsx:57-62,196-201`; `safeFooterHref` (:12-18) silently falls back to `/hub/search`, which is why the wrong links look intentional. Note the two rendering paths disagree — Amazon/Alibaba templates hardcode their own fallbacks (`AmazonHomeContent.tsx:450-476`, `AlibabaHomeContent.tsx:1195-1221`), so fixing settings alone leaves those layouts pointing at case management.

**This is a compliance exposure** (Tunisia PDP 2004-63 / GDPR-adjacent): a live marketplace with no terms, privacy, refund or cookie policy.

## 6. i18n & tests

- No locale column, no `_fr/_ar/_en` variants (contrast `pd_marketplace_category`, migration `045:5-11`). One page per slug, single language. Admin CMS UI strings hardcoded English; **no `cms` key exists in any locale file**, so the parity test passes vacuously.
- **Zero tests**: no match for `platform-cms`, `platform_page`, `marketplace/cms`, `hub/pages`, `PlatformPageBuilder` in 86 backend tests, 32 frontend tests, or 17 e2e specs. `/cms` is not among the 9 admin routes smoke-tested.

---

## 7. Fix checklist — Marketplace pages

### Tier A — makes the feature usable (half a day)
- [ ] ⚡ Add `/cms` to the admin sidebar (CATALOG & CONTENT) + dashboard Quick Jump + i18n keys EN/FR/AR — **CMS-1**
- [ ] ⚡ Swap both CMS pages to `fetchWithCsrf`; show explicit error state — **CMS-2**
- [ ] `validate()` middleware on create/update + `23505` → 409 with `details.field='slug'`; client-side slug dedup suggestion — **CMS-3**
- [ ] ⚡ Fix platform media endpoint path — **CMS-6**
- [ ] ⚡ Guard store fetches + hide AI panel in platform mode — **CMS-11/CMS-12**
- [ ] ⚡ Fix social-preview URL — **CMS-13**
- [ ] Normalize PUT response contract — **CMS-8**

### Tier B — data integrity & SEO
- [ ] Migration: add `seo_title, seo_description, og_image, noindex, published_at` + twelve `draft_*` columns to `pd_platform_page`; add `og_image, noindex` to the version table — **CMS-4/CMS-M2/CMS-M3**
- [ ] Extend zod schemas + COALESCE SET list; map `show_in_navigation`→`show_in_header` — **CMS-4**
- [ ] Public renderer: read real SEO columns, add canonical + robots + preview-aware metadata — **CMS-5/CMS-M12**
- [ ] Restore into draft, carry all columns, return real row, relabel button — **CMS-9**
- [ ] Platform cache tags + admin-gated revalidate branch; remove conflicting `revalidate: 60` — **CMS-7**
- [ ] Existence check on delete — **CMS-M8**
- [ ] Audit-log resource typing for CMS — **CMS-M10**

### Tier C — parity & content
- [ ] Title/slug editing in the editor Settings panel + inline rename in list — **CMS-M1**
- [ ] Rich list: publish toggle, footer/header toggles, reorder (drag), preview link, search, duplicate — **CMS-M4/CMS-M5**
- [ ] Reuse `TemplatePicker` + allow html/css on create (legal-page templates!) — parity
- [ ] Platform dynamic blocks + `dynamicContext` from marketplace settings; hide store-scoped blocks — **CMS-10**
- [ ] Add marketplace pages to `sitemap.xml` (needs `updated_at` in `listPublicPages`) — **CMS-M7**
- [ ] Decide `show_in_header`: render in `HubNavbar` or drop the column — **CMS-M6**
- [ ] **Seed 9 draft pages** (`terms`, `privacy`, `refund-policy`, `cookie-policy`, `contact`, `about`, `faq`, `help-center`, `seller-guide`) with `show_in_footer=true`, `is_published=false`, placeholder bodies flagged for legal review
- [ ] Repoint the 6 settings keys to `/hub/pages/<slug>`; tighten `publicLinkSettingSchema` to reject `/hub/search` for these keys; replace the free-text inputs with a **published-CMS-slug dropdown**
- [ ] Replace hardcoded fallbacks in `AmazonHomeContent.tsx:450-476` and `AlibabaHomeContent.tsx:1195-1221` with settings values
- [ ] Multi-locale support: either `locale` column + slug/locale unique pair, or `_fr/_en/_ar` content columns (decide once; matches marketplace category precedent)

### Tier D — platform CMS features (new)
- [ ] `pd_platform_menu` + `pd_platform_footer_block` for hub nav/footer management (parity with stores)
- [ ] Scheduling (publish_at / unpublish_at) with a worker
- [ ] Page analytics: `pd_platform_page_analytics_event` or relax the store-page FK to a union
- [ ] Page-count/kill-switch settings — **CMS-M9**
- [ ] Tests: service suite, route suite (11 endpoints × guards), component tests (PUT payload keys ↔ schema, `fetchWithCsrf` usage), e2e create→publish→live→footer→unpublish→404, migration column-parity assertion — **T1–T6**
