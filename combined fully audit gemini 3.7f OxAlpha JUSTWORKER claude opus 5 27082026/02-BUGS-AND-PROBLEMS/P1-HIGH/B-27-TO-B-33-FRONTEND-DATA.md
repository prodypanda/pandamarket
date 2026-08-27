# B-27 to B-33 · Frontend Rendering, Analytics & Migrations
#### B-27 · Page-builder HTML is sanitized only by regex on the server-rendered path
**Severity:** P1 · **Files:** `frontend/src/components/page-builder/SafePageRenderer.tsx:111-122, 372-387, 457`, `backend/src/services/page-builder.service.ts:166-187`

SSR markup uses `sanitizeHtmlInitial` (a chain of regexes); DOMPurify only runs in `useEffect` after hydration (`:410`). `isUnsafeUrl` strips whitespace and control characters but **does not decode HTML entities**, so `href="&#106;avascript:alert(1)"` survives the backend write path (identical logic) and the SSR path. The browser decodes it; a click before hydration executes.

**How to fix:** use `isomorphic-dompurify` on both sides with the same allow-list as `PURIFY_CONFIG`, and decode entities before URL-scheme checks. Then render the already-sanitized string.

---

#### B-28 · Product image writes swallow quota errors and report success
**Severity:** P1 · **File:** `frontend/src/app/hub/dashboard/products/page.tsx:2543-2583, 2717-2730`

`saveProductImage`, `saveGalleryImages` and `deleteRemovedGalleryImages` all `await fetchWithCsrf(...)` and **never check `res.ok`**. `POST /me/products/:id/images` enforces `assertCanAddImage` (`store.route.ts:544-554`), so a Free seller (`max_images_per_product: 2`) uploading 6 gallery images sees "Produit mis à jour avec succès" while images 3–6 are silently dropped.

**How to fix:** check each response, aggregate failures, surface the quota error, and pre-check `limits.max_images_per_product` in the gallery picker.

---

#### B-29 · Product filters, exports and dashboard charts operate on one page of data
**Severity:** P1 (wrong numbers shown to sellers)

| Location | Defect |
| --- | --- |
| `products/page.tsx:900-950, 1040-1052` | `type` and `category` filters applied **client-side** to the 20 rows the server returned; the pagination footer keeps reporting the unfiltered total (`:3310`). CSV "export all" (`:2256`) exports the current page. |
| `orders/page.tsx:1871-1874` | Order export hardcodes `limit:'100'` regardless of `meta.total` — silently truncates. |
| `financial/page.tsx:270-279, 218-233` | 90-day revenue bars derived client-side from `limit=100` orders while the KPI row uses the server `meta.summary` — two inconsistent numbers on one screen. |
| `dashboard/page.tsx:209, 139-158` | Pulls `limit=200` orders to rebuild a 30-day chart that `/api/pd/analytics/store?period=30` already returns. |
| `online-store/customers/page.tsx:28` | No `page` param → backend caps at 50; client-side search over those 50; no way to reach customer 51. |
| `wallet/page.tsx:413` | Disables "Next" on `transactions.length < 20`, ignoring the `meta` the endpoint returns. |

**How to fix:** push `type` and `category_id` into `productService.listByStore` (`product.service.ts:1397-1420`); add server-side export endpoints that stream the full filtered set; drive all charts from the analytics service; paginate customers and wallet transactions off `meta`.

---

#### B-30 · `/me/media` is unpaginated and re-decodes every image on every request
**Severity:** P1 · **File:** `backend/src/api/store.route.ts:579-760` (and the admin twin at `admin/smtp-config.routes.ts:114-203`)

`media/page.tsx:157-181` sends `limit=150`; the backend **ignores `limit` and `page` entirely**, selects every blob row **including `b.data`**, then runs `await sharp(row.data).metadata()` **inside the row loop** (`:672-680`), then unions product images and sorts in JS. Live DB: 547 blobs, 34 MB. At a few thousand assets this times out.

**How to fix:** paginate server-side; persist `width`/`height` at upload time (`image-variant.service.ts` already decodes then) instead of on read; never select `data` for a listing.

---

#### B-31 · RTL is structurally broken in the seller dashboard, and two large pages are untranslated
**Severity:** P1 · i18n catalogues are **perfect** — I verified EN/FR/AR at 3,046 keys each, zero missing, zero orphaned, zero empty values. The gap is entirely unwired UI.

- `hub/dashboard/layout.tsx:463` pins the sidebar `fixed … border-r` and the content `md:ml-64` (`:553`), mobile drawer `inset-y-0 left-0` (`:508`) — no `rtl:` variants, no logical properties. `LocaleContext.tsx:70` sets `dir='rtl'` for Arabic, so the sidebar sits left and overlaps a left-margined main area.
- `app/layout.tsx:142` hardcodes `<html lang="fr">` with no `dir`; direction is patched at runtime, so Arabic users get an LTR first paint plus layout shift.
- `products/page.tsx`: 15 `t()` calls against ~401 lines of hardcoded French.
- `onboarding/page.tsx`: `t` imported for `locale` only; every label, step name, coachmark and error is hardcoded English. `dashboardPages.onboarding` exists in the catalogues with 10 generic keys.
- 19 of 34 admin pages have no `t()` at all (`withdrawals`, `kyc`, `mandats`, `plans`, `dashboard`, `ads`, `ai-costs`, `marketplace-categories`, `platform-media`, all three audit-log pages, `smtp-config`, `cms`, `admin/support`); five more import `useLocale` for `dir` only.
- `fraud-radar/page.tsx` mixes French and English and hardcodes `.garbage.team` (`:265`).

**How to fix:** convert the dashboard shell to logical utilities (`ms-64`, `me-*`, `start-0`, `border-s`); resolve locale server-side and set `lang`/`dir` on `<html>` in the root layout; add the missing keys and wire them. Add an ESLint rule banning bare Latin/Arabic string literals in JSX text position for `app/**` to stop the bleed.

---

#### B-32 · Simulated numbers presented as analytics
**Severity:** P1 (operator trust) · **Files:**
- `frontend/src/components/admin/platform-analytics/IntelligenceTab.tsx:99-101` hardcodes `baselineMonthlyGmv = 145000`, `baselineMonthlySubRev = 18500`, `baselineTakeRate = 8.5` — the entire "What-If Revenue Simulator" is fiction unrelated to tenant data.
- `analytics.service.ts:4230-4240` — cohort retention is `Math.max(15, 100*0.75^idx)`, revenue `retained*45`, orders `retained*1.5`. Pure formula, labelled as cohort analysis.
- `admin/subscription-lifecycle.routes.ts:369-386` ships a 16-item `MOCK_CATALOG` of Tunisian products used whenever the DB returns < 6 rows (`:418, 446`).
- `admin/subscription-orders.routes.ts:617-624` hardcodes `systemSpeed = 98` and floors radar metrics with `Math.max(score, 10|20|15)` so the radar never shows a genuinely low value.
- `IntelligenceTab.tsx:156` alerts "Report generated and dispatched!" while `analytics.service.ts` returns `email_sent: false`.
- `online-store/integrations/page.tsx:485-513` **fabricates a three-event shipment timeline** ("Hub Tunis-Carthage", …) with `new Date()` offsets when the tracking API fails, and shows it as real tracking.
- `subscription/payment-method/page.tsx:34-47` is a `setTimeout(1200)` that collects a full PAN/expiry/CVV into React state, discards it, and reports success.
- `AiCostsDashboard.tsx:1018-1044` "Sandbox Test" is a hardcoded 900 ms `setTimeout` returning canned JSON.
- `fraud-radar/page.tsx:107` copies a "Magic Link" to the clipboard; `subscription-payment.service.ts:734-740` generates the token, logs it, and **never persists it** — grep for `magic_token` returns only those 3 lines.

**How to fix:** source the simulator baseline from `getGlobalOverview`; compute cohorts from real order/user data or remove the tab; gate `MOCK_CATALOG` behind an explicit `?demo=true`; remove the `Math.max` floors; branch on `email_sent`; show "tracking unavailable"; delete the fake card form and the magic-link button (or implement them).

---

#### B-33 · Migration hygiene: 12 duplicate prefixes, one placeholder, 70 missing rollbacks
**Severity:** P1 · **Verified on disk and against `pd_migrations` (99 applied = 99 files)**

```
025 025_pandamarket_ads.sql        | 025_store_order_notes.sql
026 026_ads_refill_intents.sql     | 026_page_builder_seo_navigation.sql
027 027_ads_conversion_recognition | 027_page_builder_draft_publish
028 028_ads_platform_config        | 028_page_builder_versions
029 029_ads_promotional_coupons    | 029_audit_log_action_text
032 032_ai_provider_configuration  | 032_platform_page_builder
046 046_ai_purposes_and_prompts | 046_complete_subcategory… | 046_seed_multilingual…
047 047_seed_comprehensive_aliexpress_taxonomy.sql (10 bytes: "-- skipped") | 047_update_category_classification_prompt
066 066_checkout_idempotency… | 066_store_menus_and_footers
067 067_create_storefront_customer_sessions… | 067_theme_referential_integrity
068 068_create_store_domains… | 068_storefront_digital_downloads
069 069_create_outbox_table | 069_storefront_mandat_receipts
```

`migrations/run.ts:79-105` warns but deliberately does not abort (correct choice for existing collisions). On a **fresh** database, alphabetical order decides, and `046_ai_purposes_and_prompts.sql` creating `pd_ai_prompt_templates` is exactly the table that 8 failed AI jobs report as missing (`relation "pd_ai_prompt_templates" does not exist`) — evidence the ordering has already bitten. 70 of 99 migrations have no `.down.sql`.

**How to fix:** renumber the 12 collisions with timestamp prefixes (the convention is already documented in `migrations/README.md`) and record the rename in `pd_migrations` in the same transaction; resolve or delete `047_seed_comprehensive_aliexpress_taxonomy.sql`; make the preflight **fail** on *new* collisions by pinning a baseline list of known-legacy duplicates; backfill `.down.sql` for at least the structural migrations.
