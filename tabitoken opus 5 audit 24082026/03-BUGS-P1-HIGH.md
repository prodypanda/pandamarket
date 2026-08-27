# 03 · P1 — High-Severity Bugs

**Audit date:** 2026-08-24 · **Commit:** `898bca6` · [← Index](./README.md)

Ten findings. A feature is broken, or a security control is missing. None are exploitable-by-anonymous-internet
(those are the P0s), but each one either breaks a shipped feature or removes a defence you are relying on.

| # | Title | Category | Effort |
| --- | --- | --- | --- |
| [P1-3](#p1-3--hub-cms-pages-404-in-production) | Hub CMS pages 404 in production | Broken feature | ⚡ 1 line |
| [P1-4](#p1-4--legacy-params-signature) | Legacy `params` signature | Correctness | ⚡ Small |
| [P1-5](#p1-5--platform-cms-stored-xss-chain) | Platform CMS stored-XSS chain | Security | Small |
| [P1-6](#p1-6--three-platform-cms-endpoints-never-implemented) | 3 CMS endpoints called, never built | Broken feature | Medium |
| [P1-7](#p1-7--updatepage-interpolates-column-names) | `updatePage` interpolates column names | Security (latent) | ⚡ Small |
| [P1-8](#p1-8--dead-search-fallback-that-would-throw) | Dead search fallback that throws | Correctness | ⚡ Small |
| [P1-9](#p1-9--admin-cms-bypasses-the-csrf-helper) | Admin CMS bypasses CSRF helper | Broken feature | ⚡ 2 lines |
| [P1-10](#p1-10--render-backend-runs-on-11-env-vars) | Render runs on 11 env vars | Config / launch-readiness | Config |
| [P1-11](#p1-11--outbox-worker-built-tested-never-started) | Outbox worker never started | Broken feature | ⚡ 2 lines |
| [P1-12](#p1-12--migration-numbering-collisions) | Migration numbering collisions | Operational risk | Small |

---

## P1-3 · Hub CMS pages 404 in production

**File:** [`frontend/src/app/hub/pages/[slug]/page.tsx:9`](file:///c:/tek/pandamarket/frontend/src/app/hub/pages/%5Bslug%5D/page.tsx#L9)

```ts
const res = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/pd/marketplace/cms/slug/${slug}`,
  { next: { revalidate: 60 } }
);
```

`NEXT_PUBLIC_API_URL` appears **exactly once in the entire repository** — this line. It is **not** among the four
variables set on Vercel (`NEXT_PUBLIC_BACKEND_URL`, `BACKEND_URL`, `NEXT_PUBLIC_HUB_URL`,
`NEXT_PUBLIC_MARKETPLACE_DOMAIN`). In production it therefore resolves to `http://localhost:3001`, the fetch fails,
the `catch` at line 15 swallows it and returns `null`, and line 41 fires `notFound()`.

**Confirmed live:** `https://www.garbage.team/hub/pages/about` → **404**.

Every other server component in the repo uses `BACKEND_URL` from
[`frontend/src/lib/api.ts:13-14`](file:///c:/tek/pandamarket/frontend/src/lib/api.ts#L13-L14), which additionally
has a hardcoded live fallback (`https://pandamarket-backend-fjom.onrender.com`). This file is the only one that can
miss.

### How to fix ⚡

```diff
+import { BACKEND_URL } from '@/lib/api';
+
 async function getPageBySlug(slug: string) {
   try {
-    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/pd/marketplace/cms/slug/${slug}`, {
-      next: { revalidate: 60 }
-    });
+    const res = await fetch(`${BACKEND_URL}/api/pd/marketplace/cms/slug/${slug}`, {
+      next: { revalidate: 60 },
+    });
```

Then prevent recurrence with a CI guard — see [E2](./07-ENHANCEMENTS.md). Full walkthrough:
[09-IMPLEMENTATION-GUIDES.md](./09-IMPLEMENTATION-GUIDES.md#guide-a--fix-the-hub-cms-chain).

---

## P1-4 · Legacy `params` signature

**File:** `frontend/src/app/hub/pages/[slug]/page.tsx`, [lines 20 and 37](file:///c:/tek/pandamarket/frontend/src/app/hub/pages/%5Bslug%5D/page.tsx#L20-L37)

```ts
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await getPageBySlug(params.slug);           // ← synchronous access
...
export default async function HubCmsPage({ params }: { params: { slug: string } }) {
  const page = await getPageBySlug(params.slug);
```

Every other dynamic route in the repo uses `params: Promise<{...}>` and awaits it.
[`frontend/AGENTS.md`](file:///c:/tek/pandamarket/frontend/AGENTS.md) opens with a warning that this Next.js version
(`16.2.4`) differs from training data. This file was written against the old convention — the same class of mistake
the AGENTS.md warning exists to prevent.

### How to fix ⚡

```diff
-export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
-  const page = await getPageBySlug(params.slug);
+export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
+  const { slug } = await params;
+  const page = await getPageBySlug(slug);
```

```diff
-export default async function HubCmsPage({ params }: { params: { slug: string } }) {
-  const page = await getPageBySlug(params.slug);
+export default async function HubCmsPage({ params }: { params: Promise<{ slug: string }> }) {
+  const { slug } = await params;
+  const page = await getPageBySlug(slug);
```

> [!NOTE]
> Per `frontend/AGENTS.md`, cross-check the exact signature against `node_modules/next/dist/docs/` before
> committing rather than trusting this snippet or training data. The two are usually the same in Next 16, but the
> file explicitly tells you not to assume.

---

## P1-5 · Platform CMS stored-XSS chain

Two halves of one hole, on write and on render.

**Write side** — [`platform-cms.service.ts`](file:///c:/tek/pandamarket/backend/src/services/platform-cms.service.ts):
`createPage` (line 56) and `updatePage` (line 79) store `html` and `css` **verbatim**. Grepping that file for
`sanitizeHtml|SafePageRenderer|DOMPurify` returns nothing.

**Render side** — [`hub/pages/[slug]/page.tsx:47-51`](file:///c:/tek/pandamarket/frontend/src/app/hub/pages/%5Bslug%5D/page.tsx#L47-L51):

```tsx
<style dangerouslySetInnerHTML={{ __html: page.css || '' }} />
<div className="pd-page-content" dangerouslySetInnerHTML={{ __html: page.html || '' }} />
```

Raw injection, no sanitizer, on both `css` and `html`.

**The contrast that makes this indefensible.** The store page-builder path does this correctly and the code
already exists:

| Concern | Store path (correct) | Platform path (this bug) |
| --- | --- | --- |
| Sanitize on write | `page-builder.service.ts` — `sanitizeHtml`, `sanitizeCss`, `sanitizeUrlAttributes`, `sanitizeSrcsetAttributes`, `sanitizeInlineStyles` (lines 92–203); strips `<script>`, `on*=` handlers, `javascript:`/`vbscript:`, `<iframe>`, `<object>`, forms | none |
| Sanitize on render | [`SafePageRenderer.tsx`](file:///c:/tek/pandamarket/frontend/src/components/page-builder/SafePageRenderer.tsx) — DOMPurify with an allowlist config | raw `dangerouslySetInnerHTML` |

**Reachability today:** admin-only. All mutating CMS routes carry `requireAuth, requireAdmin`
(verified in [`platform-cms.route.ts`](file:///c:/tek/pandamarket/backend/src/api/platform-cms.route.ts)), and
`pd_platform_page` has **0 rows**. So nothing is exploitable right now. But "trusted admin" is exactly the
assumption that breaks the moment you add a staff role, an agency tier, or a compromised admin session.

Note the helmet CSP `scriptSrc: 'self'` blocks inline `<script>`, but **not** `onerror=` attribute handlers,
`javascript:` hrefs, CSS-based data exfiltration, or clickjacking overlays. CSP is defence-in-depth here, not the
control.

### How to fix

Reuse the existing sanitizers — do not write new ones. Two options:

1. Export the sanitizers from `page-builder.service.ts`, or lift them into a shared
   `backend/src/utils/html-sanitize.ts`, and call them in `platformCmsService.createPage`/`updatePage`.
2. On the frontend, replace the raw injection with `SafePageRenderer`.

Do both — sanitize on write **and** on render. Full walkthrough with code:
[09-IMPLEMENTATION-GUIDES.md](./09-IMPLEMENTATION-GUIDES.md#guide-b--platform-cms-sanitization).

---

## P1-6 · Three Platform CMS endpoints never implemented

[`PlatformPageBuilderEditor.tsx`](file:///c:/tek/pandamarket/frontend/src/components/page-builder/PlatformPageBuilderEditor.tsx)
calls four endpoints. Three do not exist:

| Editor line | Call | Backend |
| --- | --- | --- |
| [1370](file:///c:/tek/pandamarket/frontend/src/components/page-builder/PlatformPageBuilderEditor.tsx#L1370) | `GET /api/pd/marketplace/cms/{id}/versions` | ❌ missing |
| [1393](file:///c:/tek/pandamarket/frontend/src/components/page-builder/PlatformPageBuilderEditor.tsx#L1393) | `POST /api/pd/marketplace/cms/{id}/versions/{vid}/restore` | ❌ missing |
| [2240](file:///c:/tek/pandamarket/frontend/src/components/page-builder/PlatformPageBuilderEditor.tsx#L2240) | `POST /api/pd/marketplace/cms/{id}/preview` | ❌ missing |
| [2157](file:///c:/tek/pandamarket/frontend/src/components/page-builder/PlatformPageBuilderEditor.tsx#L2157) | `PUT /api/pd/marketplace/cms/{id}` | ✅ exists |

[`platform-cms.route.ts`](file:///c:/tek/pandamarket/backend/src/api/platform-cms.route.ts) implements only
`GET /`, `GET /public`, `GET /slug/:slug`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`. **Live probe of
`/versions` → 404.**

So version history and preview are **dead UI** in the platform page builder — buttons that always fail. The
store-level builder has the whole thing already:
[`page-builder.route.ts:170-219`](file:///c:/tek/pandamarket/backend/src/api/page-builder.route.ts#L170-L219)
implements `versions`, `versions/:id/restore`, and `preview`, backed by `pd_store_page_version` (migration
[028](file:///c:/tek/pandamarket/backend/src/migrations/sql/028_page_builder_versions.sql)) and the service methods
`listVersions` / `restoreVersion` / `createPreviewToken`
([`page-builder.service.ts:603-660`](file:///c:/tek/pandamarket/backend/src/services/page-builder.service.ts#L603-L660)).

The platform editor was cloned from the store editor (see [P3](./05-BUGS-P3-HYGIENE.md) — 99.3% identical) without
cloning the backend.

### How to fix

Either build the three endpoints mirroring the store implementation (add a `pd_platform_page_version` table plus
the routes), or feature-flag the dead UI until the backend exists. **Do not ship buttons that 404.** Full
mirror-implementation guide: [09-IMPLEMENTATION-GUIDES.md](./09-IMPLEMENTATION-GUIDES.md#guide-c--platform-cms-versioning--preview).
An integration test asserting every frontend `/api/pd/...` literal resolves to a mounted route ([E2](./07-ENHANCEMENTS.md))
would have caught this at commit time.

---

## P1-7 · `updatePage` interpolates column names

[`platform-cms.service.ts:85-91`](file:///c:/tek/pandamarket/backend/src/services/platform-cms.service.ts#L85-L91):

```ts
for (const [key, value] of Object.entries(data)) {
  if (['slug', 'title', 'builder_data', 'html', 'css', 'is_published', 'show_in_footer', 'show_in_header', 'sort_order'].includes(key)) {
    updates.push(`${key} = $${i}`);   // ← identifier interpolated into SQL
    values.push(value);
    i++;
  }
}
```

**Not currently exploitable** — the allowlist gates which keys reach the interpolation, and values are still
parameterised. But it is the only service in the codebase that builds SQL identifiers by string concatenation, and
its safety rests entirely on a future maintainer never adding a caller-influenced key to that array. That is a
fragile invariant to leave unguarded.

Same file, line 57: `createPage` uses `uuidv4()` while the rest of the schema uses `pd_<type>_<nanoid>` in
`VARCHAR(64)` (compare `pdId('lead')` in `cart.service.ts:237`). Inconsistent ID shape across one schema is a
latent join/format bug.

### How to fix

Replace the dynamic loop with an explicit static `SET` list using `COALESCE`, so no string ever concatenates into
the statement:

```ts
const res = await this.pool.query(
  `UPDATE pd_platform_page SET
     slug           = COALESCE($2, slug),
     title          = COALESCE($3, title),
     builder_data   = COALESCE($4, builder_data),
     html           = COALESCE($5, html),
     css            = COALESCE($6, css),
     is_published   = COALESCE($7, is_published),
     show_in_footer = COALESCE($8, show_in_footer),
     show_in_header = COALESCE($9, show_in_header),
     sort_order     = COALESCE($10, sort_order),
     updated_at     = NOW()
   WHERE id = $1
   RETURNING *`,
  [id, data.slug ?? null, data.title ?? null, data.builder_data ?? null,
   data.html ?? null, data.css ?? null, data.is_published ?? null,
   data.show_in_footer ?? null, data.show_in_header ?? null, data.sort_order ?? null],
);
```

And switch `createPage` to `pdId('page')` for schema consistency.

---

## P1-8 · Dead search fallback that would throw

[`search.service.ts:117-133`](file:///c:/tek/pandamarket/backend/src/services/search.service.ts#L117-L133) — the
Postgres fallback for when Meilisearch is down:

```ts
sql += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length}
              OR category ILIKE $${params.length} OR $${params.length} = ANY(tags))`;
```

`pd_product.tags` is **`jsonb`**, not an array (verified against the live schema; `interest_tags` is the `text[]`
column). Running `$n = ANY(tags)` against the live database returns:

```
ERROR: 42809: op ANY/ALL (array) requires array on right side
```

**This method throws on every invocation.** It is masked because `search.route.ts` routes through
`productService.searchPublished`, which correctly does `p.tags::text ILIKE`. A grep for
`searchService.searchProducts` finds **zero callers** — the only live use of `searchService` is `indexProduct`
from [`product.subscriber.ts:28`](file:///c:/tek/pandamarket/backend/src/subscribers/product.subscriber.ts#L28).

This matters because it is the *intended* Meili-down fallback. If someone wires it up believing it works, search
returns 500 instead of degraded results — the opposite of a fallback.

### How to fix ⚡

Delete `searchProducts` / `searchProductsPostgres` and keep `searchService` as the indexing client only —
`productService.searchPublished` is already the real, production-exercised implementation. If you keep the method,
change the clause to `p.tags::text ILIKE $n` and add a test that runs it against a real schema.

---

## P1-9 · Admin CMS bypasses the CSRF helper

[`(admin)/cms/page.tsx:40`](file:///c:/tek/pandamarket/frontend/src/app/%28admin%29/cms/page.tsx#L40) (POST) and
[`:59`](file:///c:/tek/pandamarket/frontend/src/app/%28admin%29/cms/page.tsx#L59) (DELETE) use bare `fetch` with no
`X-CSRF-Token`:

```ts
const res = await fetch('/api/pd/marketplace/cms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title, slug, is_published: false })
});
...
await fetch(`/api/pd/marketplace/cms/${id}`, { method: 'DELETE' });
```

A regex scan of all **357** non-test frontend source files for mutating `fetch('/api/pd/...')` calls lacking a CSRF
header found **this is the only offender** (the second hit was `lib/api.ts` itself, i.e. the helper). The codebase
is otherwise disciplined; this one file was written outside the convention.

`/cms` is not in the CSRF exemption list, so these two calls should be returning 403 for admins. Combined with
[P1-6](#p1-6--three-platform-cms-endpoints-never-implemented), the entire admin CMS section is non-functional.

Same file: `prompt()` at [line 36](file:///c:/tek/pandamarket/frontend/src/app/%28admin%29/cms/page.tsx#L36),
`alert()` at lines 49/52/62, `confirm()` at line 57 — browser-native dialogs in an otherwise polished admin UI, and
`prompt()` is unstyled and inaccessible.

### How to fix ⚡

```diff
+import { fetchWithCsrf } from '@/lib/api';
...
-      const res = await fetch('/api/pd/marketplace/cms', {
+      const res = await fetchWithCsrf('/api/pd/marketplace/cms', {
         method: 'POST',
...
-      await fetch(`/api/pd/marketplace/cms/${id}`, { method: 'DELETE' });
+      await fetchWithCsrf(`/api/pd/marketplace/cms/${id}`, { method: 'DELETE' });
```

Replace `prompt`/`alert`/`confirm` with the project's modal and toast components. Then add the ESLint rule from
[E4](./07-ENHANCEMENTS.md) banning bare mutating `fetch(` inside `frontend/src`, so this class of bug is caught by
lint rather than by audit.

---

## P1-10 · Render backend runs on 11 env vars

Service `srv-d9qjrth42hec73efhoa0`. The complete set:

`PD_DATABASE_URL` · `PD_DATABASE_SSL=true` · `PD_DATABASE_POOL_SIZE=8` · `PD_REDIS_URL` · `PD_NODE_ENV=production` ·
`PD_JWT_SECRET` · `PD_COOKIE_SECRET` · `PD_ENCRYPTION_KEY` · `PD_SMS_PROVIDER=whatsapp_gateway` ·
`PD_WHATSAPP_GATEWAY_URL` · `PD_WHATSAPP_GATEWAY_TOKEN`

Everything else falls back to a default. Feature by feature:

| Missing | Consequence |
| --- | --- |
| `PD_SMTP_*`, `PD_MAIL_FROM` | **Email is inert.** [`email.worker.ts:402`](file:///c:/tek/pandamarket/backend/src/workers/email.worker.ts#L402) logs `nodemailer not installed — falling back to console transport` then `throw new Error('nodemailer_missing')`; line 454/526 throw `no_smtp_config`; line 620 catches both. Password reset, email verification, order confirmations, digests never reach a user. Jobs "succeed". |
| `PD_S3_*` | `/ready` reports s3 `degraded`. The DB-blob image-restore fallback in `main.ts:228-264` is load-bearing — images are served out of Postgres. |
| `PD_GEMINI_API_KEY`, `PD_OPENAI_API_KEY` | All AI dead: `ai.route.ts` (80 KB), `ai.worker.ts`, `ai-tagger.worker.ts`, admin AI-costs, seller smart-fill. |
| `PD_FLOUCI_*`, `PD_KONNECT_*` | **Most dangerous.** See below. |
| `PD_PAYPAL_*` | Better: `paypal.provider.ts:224-227` **fails closed** when `webhookId` is absent. Make the others match. |
| `PD_ADMIN_CORS`, `PD_STORE_CORS` | Falls back to the permissive regex ([P2-14](./04-BUGS-P2-MEDIUM.md)). |
| `PD_SENTRY_DSN`, `PD_METRICS_ENABLED` | No error tracking, `/metrics` → 404. Running blind. |
| `PD_HUB_DOMAIN` | Host classification relies on hardcoded domain lists. |
| `FRONTEND_URL` | `outbox.worker.ts:139` defaults to `http://localhost:3000` — ISR revalidation posts into the void ([P1-11](#p1-11--outbox-worker-built-tested-never-started)). |

### The payment-credential trap

[`config.ts:130-139`](file:///c:/tek/pandamarket/backend/src/config.ts#L130-L139) defaults Flouci/Konnect to public
literals:

```ts
flouci: {
  appToken:  optional('PD_FLOUCI_APP_TOKEN',  'sandbox_token')!,
  appSecret: optional('PD_FLOUCI_APP_SECRET', 'sandbox_secret')!,
},
konnect: {
  apiKey:         optional('PD_KONNECT_API_KEY',         'sandbox_key')!,
  receiverWallet: optional('PD_KONNECT_RECEIVER_WALLET', 'sandbox_wallet')!,
},
```

And [`config.ts:216-223`](file:///c:/tek/pandamarket/backend/src/config.ts#L216-L223) only **warns**:

```ts
const warnIfDefault = (name: string, value: string, devDefault: string) => {
  if (value === devDefault) {
    console.warn(`[config] WARNING: ${name} is using the public sandbox default in production.`);
  }
};
warnIfDefault('PD_FLOUCI_APP_TOKEN', config.flouci.appToken, 'sandbox_token');
warnIfDefault('PD_FLOUCI_APP_SECRET', config.flouci.appSecret, 'sandbox_secret');
warnIfDefault('PD_KONNECT_API_KEY', config.konnect.apiKey, 'sandbox_key');
```

Meanwhile [`config.ts:197-215`](file:///c:/tek/pandamarket/backend/src/config.ts#L197-L215) **throws** for
dev-default JWT / cookie / encryption secrets. Payments were left out of the fail-fast guard. The consequence:
webhook HMACs are computed with a publicly-known secret, so anyone who reads this repo can forge a signed
Flouci/Konnect webhook.

Secret strength: `PD_JWT_SECRET` is **35 chars**, `PD_COOKIE_SECRET` **38**. For HS256 you want ≥ 64 chars.
Adequate-ish, not good.

### How to fix

1. Extend the fail-fast block in `config.ts` from `warnIfDefault` to `throw` when `env === 'production'` and a
   payment credential still equals its sandbox default ([E1](./07-ENHANCEMENTS.md)). Code:
   [09-IMPLEMENTATION-GUIDES.md](./09-IMPLEMENTATION-GUIDES.md#guide-e--fail-fast-on-sandbox-payment-credentials).
2. Populate Render env from a checked-in `.env.production.example` listing every `PD_*` the app reads, so the gap
   is visible rather than discovered.
3. Rotate `PD_JWT_SECRET`/`PD_COOKIE_SECRET` to 64-char values in the pre-launch rotation.
4. Add a boot-time subsystem summary log ([E5](./07-ENHANCEMENTS.md)): one line per optional subsystem —
   `configured` or `disabled — reason`.

> [!WARNING]
> The email gap deserves separate emphasis. It silently breaks account recovery and email verification for every
> user, and the failure mode is a *successful-looking* queue job. If you launch with SMTP unset, users who forget
> passwords are locked out with no signal in your logs.

---

## P1-11 · Outbox worker built, tested, never started

[`outbox.worker.ts`](file:///c:/tek/pandamarket/backend/src/workers/outbox.worker.ts) is a correct
transactional-outbox poller: 3-second interval, `processing` state, exponential backoff (`2^attempts * 5s`),
`MAX_ATTEMPTS = 5`, storefront ISR revalidation, webhook enqueue with idempotency key. It is exercised by
`backend/src/__tests__/outbox.test.ts`. The table exists (migration
[069](file:///c:/tek/pandamarket/backend/src/migrations/sql)), and `store.service.ts:901` enqueues into it.

But [`main.ts:498-512`](file:///c:/tek/pandamarket/backend/src/main.ts#L498-L512) starts ten workers — ai, email,
payout, search, subscription, webhook, notification-batch, daily-digest, payment-reconciliation,
shipment-reconciliation — and **`outboxWorker.start()` is never called anywhere outside tests.** Grepping `main.ts`
for `outbox` returns nothing.

**Consequence:** every event `store.service.ts` writes to the outbox sits `pending` forever. Storefront ISR
revalidation after theme/settings changes never fires from this path; outbound webhooks queued via the outbox never
dispatch. The table is currently empty (0 rows), consistent with almost nothing writing to it yet — so this is a
feature that quietly does not work, not a visible outage.

Two secondary defects in the same file:
- Line 139: `process.env.FRONTEND_URL || 'http://localhost:3000'`, and `FRONTEND_URL` is not set on Render — so even
  once started, revalidation POSTs to localhost.
- Line 145: swallows the failure at `debug` level, so you would never see it fail.

`ai-tagger.worker.ts` exports `startAiTaggerWorker` and is likewise never started — same class, lower stakes
([M12](./06-MISSING-WORK.md)).

### How to fix ⚡

In [`main.ts`](file:///c:/tek/pandamarket/backend/src/main.ts#L498-L525), inside the
`config.runWorkersInProcess` block:

```diff
+import { outboxWorker } from './workers/outbox.worker';
...
       const workers = [
         startAiWorker(),
         ...
         startShipmentReconciliationWorker(),
       ];
+      outboxWorker.start();

       const shutdownWorkers = async () => {
         logger.info('Shutting down in-process background workers...');
         await Promise.all(workers.map((w) => w.close().catch(() => {})));
+        outboxWorker.stop();
       };
```

Set `FRONTEND_URL` on Render. Change `outbox.worker.ts:145` from `logger.debug` to `logger.warn` with the response
status. Add the `PD_REVALIDATE_SECRET` machine-auth header ([P2-16](./04-BUGS-P2-MEDIUM.md)) so the server-to-server
revalidation call actually authenticates.

> [!IMPORTANT]
> Fixing this without also fixing [P2-16](./04-BUGS-P2-MEDIUM.md) trades a silent no-op for a silent 401 — the
> worker will call `/api/storefront/revalidate` with no cookie and get 401, and line 145 will swallow it. Do both
> together.

---

## P1-12 · Migration numbering collisions

Correcting an earlier concern: **there is no migration drift.** 120 `.sql` files = 95 up + 25 `.down.sql`.
`pd_migrations` has exactly 95 rows and a set-difference in both directions is empty. Schema is fully applied.
Latest: `083_shipping_integrations_and_cod.sql`.

The real problems are structural. **Twelve duplicated numeric prefixes.** The runner
[`migrations/run.ts`](file:///c:/tek/pandamarket/backend/src/migrations/run.ts) sorts **alphabetically**, so
ordering within a duplicated prefix depends on the filename's second token — fragile and semantically meaningless:

```
025  pandamarket_ads              | store_order_notes
026  ads_refill_intents           | page_builder_seo_navigation
027  ads_conversion_recognition   | page_builder_draft_publish
028  ads_platform_config          | page_builder_versions
029  ads_promotional_coupons      | audit_log_action_text
032  ai_provider_configuration    | platform_page_builder
046  ai_purposes_and_prompts | complete_subcategory_multilingual_translations | seed_multilingual_category_descriptions
047  seed_comprehensive_aliexpress_taxonomy | update_category_classification_prompt
066  checkout_idempotency_and_inventory | store_menus_and_footers
067  create_storefront_customer_sessions_and_tokens | theme_referential_integrity
068  create_store_domains_table   | storefront_digital_downloads
069  create_outbox_table          | storefront_mandat_receipts
```

Two parallel branches were merged without renumbering. It works today only because the collided pairs happen to be
independent. Add one migration that depends on ordering within a collided prefix and you get an
environment-dependent failure.

**`047_seed_comprehensive_aliexpress_taxonomy.sql` is 10 bytes containing `-- skipped`** — a placeholder committed
as a real migration and recorded as applied. Anyone reading the list believes AliExpress taxonomy was seeded.

**No `062_` exists** — a gap between 061 and 063.

### How to fix

Do **not** renumber applied migrations (they are recorded by filename; renaming re-runs them). Instead:

- **(a)** Add a preflight to `run.ts` that errors on duplicate numeric prefixes so no *new* collision can land.
- **(b)** Switch new migrations to timestamp prefixes (`20260824T2100_description.sql`) which cannot collide
  ([E18](./07-ENHANCEMENTS.md)).
- **(c)** Delete the 10-byte placeholder and remove its `pd_migrations` row in the migration that supersedes it, or
  rename its intent to `047_skipped_intentionally.sql` so it is legible.
- **(d)** Document the 062 gap in a `migrations/README.md`.

Preflight code: [09-IMPLEMENTATION-GUIDES.md](./09-IMPLEMENTATION-GUIDES.md#guide-f--migration-preflight).
