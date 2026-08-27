# 09 — Implementation Guides

Copy-paste-ready fixes for the highest-value items. Each guide is self-contained: it states the file, the current
code, the replacement, and how to verify. Line numbers were accurate at commit `898bca6`; confirm the surrounding
context before pasting.

Back to [README](./README.md) · [P0](./02-BUGS-P0-CRITICAL.md) · [P1](./03-BUGS-P1-HIGH.md) · [P2](./04-BUGS-P2-MEDIUM.md) · [Checklist](./08-TODO-CHECKLIST.md)

> [!NOTE]
> The two P0 fixes (gamified-spin authority + tenant isolation) live in full in
> [02-BUGS-P0-CRITICAL.md](./02-BUGS-P0-CRITICAL.md). This file covers the P1/P2 guides that other documents link to.

## Guide index

| Guide | Fixes | File(s) touched | Effort |
| --- | --- | --- | --- |
| [A — Fix the hub CMS chain](#guide-a--fix-the-hub-cms-chain) | P1-3, P1-4, P1-5 | [`hub/pages/[slug]/page.tsx`](file:///c:/tek/pandamarket/frontend/src/app/hub/pages/%5Bslug%5D/page.tsx) | S |
| [B — Platform CMS sanitization](#guide-b--platform-cms-sanitization) | P1-5, P1-7 | [`platform-cms.service.ts`](file:///c:/tek/pandamarket/backend/src/services/platform-cms.service.ts) | S |
| [C — Platform CMS versioning & preview](#guide-c--platform-cms-versioning--preview) | P1-6, M1 | [`platform-cms.route.ts`](file:///c:/tek/pandamarket/backend/src/api/platform-cms.route.ts), service | M |
| [D — Cache & parallelize middleware](#guide-d--cache-and-parallelize-middleware) | P2-15 | frontend middleware | S |
| [E — Fail-fast on sandbox payment credentials](#guide-e--fail-fast-on-sandbox-payment-credentials) | P1-10, E1 | [`config.ts`](file:///c:/tek/pandamarket/backend/src/config.ts) | XS |
| [F — Migration preflight](#guide-f--migration-preflight) | P1-12, P2-18 | [`migrations/run.ts`](file:///c:/tek/pandamarket/backend/src/migrations/run.ts) | S |
| [G — Index the hot foreign keys](#guide-g--index-the-hot-foreign-keys) | P2-19, E12 | new migration | S |

---

## Guide A — Fix the hub CMS chain

**Fixes:** [P1-3](./03-BUGS-P1-HIGH.md) (wrong backend URL) · [P1-4](./03-BUGS-P1-HIGH.md) (legacy sync `params`) · [P1-5](./03-BUGS-P1-HIGH.md) (raw HTML injection).

**File:** [`frontend/src/app/hub/pages/[slug]/page.tsx`](file:///c:/tek/pandamarket/frontend/src/app/hub/pages/%5Bslug%5D/page.tsx)

Three defects compound in one file:

1. Line 9 builds the API base from `NEXT_PUBLIC_API_URL || 'http://localhost:3001'`. In production `NEXT_PUBLIC_API_URL`
   is unset, so the page fetches `localhost` and renders nothing.
2. Lines 20 & 37 read `params.slug` synchronously. Next.js 16 makes `params` a `Promise`; this throws or warns.
3. Lines 47–51 inject `page.html` via raw `dangerouslySetInnerHTML` with no sanitization — the one CMS render path that
   bypasses `SafePageRenderer`.

### Step 1 — use the shared, correct backend URL

The correct base already exists in [`lib/api.ts:13-14`](file:///c:/tek/pandamarket/frontend/src/lib/api.ts#L13-L14) as
`BACKEND_URL`, with the live fallback `https://pandamarket-backend-fjom.onrender.com`.

```diff
-const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
+import { BACKEND_URL } from '@/lib/api';
```

### Step 2 — await the params Promise

```diff
-export default async function HubPage({ params }: { params: { slug: string } }) {
-  const res = await fetch(`${API_URL}/api/pd/platform-cms/slug/${params.slug}`, {
+export default async function HubPage({ params }: { params: Promise<{ slug: string }> }) {
+  const { slug } = await params;
+  const res = await fetch(`${BACKEND_URL}/api/pd/platform-cms/slug/${slug}`, {
     next: { revalidate: 60 },
   });
```

Apply the same `await params` change to `generateMetadata` (line 20) if that function also destructures `params`
synchronously.

> [!WARNING]
> `frontend/AGENTS.md` records that Next.js 16.2.4 has breaking changes vs. training data. Before finalizing the
> `params: Promise<…>` signature, confirm the exact shape against `node_modules/next/dist/docs/` in this repo — do not
> trust memory here.

### Step 3 — render through SafePageRenderer, not raw HTML

The storefront already renders CMS output safely. `SafePageRenderer` (signature at
[`SafePageRenderer.tsx:389`](file:///c:/tek/pandamarket/frontend/src/components/SafePageRenderer.tsx#L389)) takes
`{ html, css, dynamicContext?, analytics? }`.

```diff
-      <div dangerouslySetInnerHTML={{ __html: page.html }} />
+      <SafePageRenderer html={page.html} css={page.css} />
```

```diff
+import { SafePageRenderer } from '@/components/SafePageRenderer';
```

> [!IMPORTANT]
> Step 3 is a mitigation on the render side. The stored content is only trustworthy once **Guide B** also sanitizes on
> the write side. Do both — sanitize on the way in *and* render safely on the way out.

### Verify

- `npm run build -w frontend` compiles with no `params` warning.
- With the backend up, `GET /hub/pages/<a-published-slug>` returns rendered content (not a blank page).
- Seed a page whose `html` contains `<script>alert(1)</script>` and confirm the script does not execute in the hub
  render.

---

## Guide B — Platform CMS sanitization

**Fixes:** [P1-5](./03-BUGS-P1-HIGH.md) (stored HTML/CSS never sanitized) · [P1-7](./03-BUGS-P1-HIGH.md) (`uuidv4()` ID
instead of the project's `pd_<type>_<nanoid>` convention).

**File:** [`platform-cms.service.ts`](file:///c:/tek/pandamarket/backend/src/services/platform-cms.service.ts)

`createPage` (L56) and `updatePage` (L79) store `html`, `css`, and `builder_data` **verbatim**. The store-side builder
already sanitizes; the platform-side one does not. There is no need to write new sanitizers — reuse the ones in
[`page-builder.service.ts`](file:///c:/tek/pandamarket/backend/src/services/page-builder.service.ts) (`sanitizeHtml`
L161, `sanitizeCss` L188, plus the URL/srcset/inline-style helpers at L92–L154).

### Step 1 — export the sanitizers from page-builder.service.ts

They are currently module-private. Add a single named export block near the top-level functions:

```ts
// page-builder.service.ts — expose the sanitizers for reuse by platform CMS
export const contentSanitizers = { sanitizeHtml, sanitizeCss };
```

### Step 2 — sanitize on write in platform-cms.service.ts

```diff
+import { contentSanitizers } from './page-builder.service';
+import { pdId } from '../utils/id';   // same helper used across the codebase
```

`createPage`:

```diff
-  async createPage(data: Partial<PlatformPage>): Promise<PlatformPage> {
-    const id = uuidv4();
+  async createPage(data: Partial<PlatformPage>): Promise<PlatformPage> {
+    const id = pdId('ppage');
+    const html = contentSanitizers.sanitizeHtml(data.html || '');
+    const css = contentSanitizers.sanitizeCss(data.css || '');
     const res = await this.pool.query(
       `INSERT INTO pd_platform_page
         (id, slug, title, builder_data, html, css, is_published, show_in_footer, show_in_header, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
       [
         id,
         data.slug,
         data.title,
         data.builder_data || {},
-        data.html || '',
-        data.css || '',
+        html,
+        css,
```

`updatePage` — sanitize inside the allowlist loop (L85-91) so `html`/`css` are cleaned before they reach the query:

```diff
     for (const [key, value] of Object.entries(data)) {
       if (['slug', 'title', 'builder_data', 'html', 'css', 'is_published', 'show_in_footer', 'show_in_header', 'sort_order'].includes(key)) {
+        let v = value;
+        if (key === 'html') v = contentSanitizers.sanitizeHtml((value as string) || '');
+        if (key === 'css')  v = contentSanitizers.sanitizeCss((value as string) || '');
         updates.push(`${key} = $${i}`);
-        values.push(value);
+        values.push(v);
         i++;
       }
     }
```

> [!NOTE]
> P1-7 also flags that `updatePage` interpolates the column *name* into SQL (`${key} = $${i}`). This is currently safe
> **only because** the `.includes([...])` allowlist gates every key. Keep that allowlist as the security boundary — do
> not remove it, and never widen it to accept arbitrary keys.

### Verify

- Create a platform page with `html: '<img src=x onerror=alert(1)>'` → the stored row has the `onerror` attribute
  stripped.
- Create a page with `css: '@import url(http://evil);'` → the `@import` is gone.
- New rows have IDs shaped `ppage_…`, not a bare UUID.
- Existing UUID-keyed rows still load (the change is forward-only; do not rewrite old IDs).

---

## Guide C — Platform CMS versioning & preview

**Fixes:** [P1-6](./03-BUGS-P1-HIGH.md) (editor calls endpoints that don't exist) · [M1](./06-MISSING-WORK.md).

The **store** page builder is fully built with versioning, restore, and preview. The **platform** CMS editor's UI calls
the same shape of endpoints, but the backend never implemented them. Confirmed calls in
[`PlatformPageBuilderEditor.tsx`](file:///c:/tek/pandamarket/frontend/src/components/PlatformPageBuilderEditor.tsx):

| UI call | Line | Backend status |
| --- | --- | --- |
| `GET  /platform-cms/:id/versions` | ~1370 | **missing** |
| `POST /platform-cms/:id/versions/:vid/restore` | ~1393 | **missing** |
| `PUT  /platform-cms/:id` | ~2157 | exists |
| `POST /platform-cms/:id/preview` | ~2240 | **missing** |

`platform-cms.route.ts` implements only: `GET /`, `GET /public`, `GET /slug/:slug`, `GET /:id`, `POST /`,
`PUT /:id`, `DELETE /:id`.

**The store side is the template.** Mirror it:
- Routes: [`page-builder.route.ts:170-219`](file:///c:/tek/pandamarket/backend/src/api/page-builder.route.ts#L170-L219)
- Service: `listVersions` / `restoreVersion` / `createPreviewToken` at
  [`page-builder.service.ts:603-660`](file:///c:/tek/pandamarket/backend/src/services/page-builder.service.ts#L603-L660)
- Table: `pd_store_page_version` (migration 028).

### Decision first

> [!IMPORTANT]
> If a platform-CMS launch is weeks away, the **cheaper correct move is to feature-flag the dead UI** (hide the
> version/preview controls) so the editor stops calling missing endpoints — then build the backend when the feature is
> actually scheduled. Only implement now if platform pages ship at launch. Both paths close P1-6; pick based on
> roadmap, not reflex.

### Step 1 — the version table (mirror `pd_store_page_version`)

New migration `pd_platform_page_version`, matching the store schema minus `store_id`:

```sql
CREATE TABLE pd_platform_page_version (
  id                 TEXT PRIMARY KEY,
  page_id            TEXT NOT NULL REFERENCES pd_platform_page(id) ON DELETE CASCADE,
  version_number     INTEGER NOT NULL,
  title              TEXT,
  slug               TEXT,
  builder_data       JSONB,
  html               TEXT,
  css                TEXT,
  seo_title          TEXT,
  seo_description    TEXT,
  noindex            BOOLEAN DEFAULT FALSE,
  show_in_navigation BOOLEAN DEFAULT FALSE,
  show_in_footer     BOOLEAN DEFAULT FALSE,
  sort_order         INTEGER DEFAULT 0,
  published_at       TIMESTAMPTZ,
  created_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (page_id, version_number)
);
CREATE INDEX idx_platform_page_version_page ON pd_platform_page_version(page_id);
```

### Step 2 — snapshot on write

In `updatePage` (and `createPage`), write a version row before/after applying the update — copy the store logic
verbatim, swapping the table name and dropping the `store_id` argument.

### Step 3 — the three routes

Add to [`platform-cms.route.ts`](file:///c:/tek/pandamarket/backend/src/api/platform-cms.route.ts), guarded by the same
admin middleware the file already uses:

```ts
// GET versions
router.get('/:id/versions', asyncHandler(async (req, res) => {
  const versions = await platformCmsService.listVersions(req.params.id);
  res.json({ data: versions });
}));

// restore a version
router.post('/:id/versions/:versionId/restore', asyncHandler(async (req, res) => {
  const page = await platformCmsService.restoreVersion(req.params.id, req.params.versionId);
  res.json({ data: page });
}));

// preview token
router.post('/:id/preview', asyncHandler(async (req, res) => {
  const token = await platformCmsService.createPreviewToken(req.params.id, req.body);
  res.json({ data: token });
}));
```

Implement `listVersions`, `restoreVersion`, `createPreviewToken` in `platform-cms.service.ts` by adapting the store
methods. **Run every write through Guide B's sanitizers** — restore must re-sanitize, since old versions may predate
sanitization.

### Verify

- Route-manifest test (E2) passes: every `fetch('/api/pd/platform-cms/…')` literal maps to a mounted route.
- In the editor: edit → save → open version history → restore → preview all succeed with no 404 in the network tab.

---

## Guide D — Cache and parallelize middleware

**Fixes:** [P2-15](./04-BUGS-P2-MEDIUM.md). Frontend middleware makes two **sequential, uncached** backend status
fetches on every storefront request, adding up to ~2 s of blocking latency per page view.

### The two problems

1. **Sequential** — the second `await` waits on the first for no reason.
2. **Uncached** — the same rarely-changing status is fetched on every single request.

### Step 1 — parallelize

```diff
-const storeStatus = await fetch(`${BACKEND_URL}/api/pd/storefront/status?host=${host}`);
-const maintenance = await fetch(`${BACKEND_URL}/api/pd/platform/maintenance`);
+const [storeStatus, maintenance] = await Promise.all([
+  fetch(`${BACKEND_URL}/api/pd/storefront/status?host=${host}`),
+  fetch(`${BACKEND_URL}/api/pd/platform/maintenance`),
+]);
```

### Step 2 — cache with a short TTL

Middleware runs on the edge and cannot hold a long-lived process cache reliably, so cache per host with a small
in-module `Map` and a TTL (30–60 s). Status flips are rare; staleness of ≤1 min is acceptable.

```ts
type Cached<T> = { value: T; expires: number };
const statusCache = new Map<string, Cached<StoreStatus>>();
const TTL_MS = 30_000;

async function getStoreStatus(host: string): Promise<StoreStatus> {
  const hit = statusCache.get(host);
  if (hit && hit.expires > Date.now()) return hit.value;
  const res = await fetch(`${BACKEND_URL}/api/pd/storefront/status?host=${host}`, {
    signal: AbortSignal.timeout(1500),          // fail fast instead of hanging the request
  });
  const value = (await res.json()) as StoreStatus;
  statusCache.set(host, { value, expires: Date.now() + TTL_MS });
  return value;
}
```

Add the `AbortSignal.timeout` to both fetches so a slow backend degrades gracefully instead of blocking the page.

### Verify

- Load a storefront page twice; the second load makes zero status fetches within the TTL window (check backend logs).
- Point a fetch at an unresponsive host → the page still responds within ~1.5 s rather than hanging.

---

## Guide E — Fail-fast on sandbox payment credentials

**Fixes:** [P1-10](./03-BUGS-P1-HIGH.md) · **E1**. The pattern already exists in
[`config.ts`](file:///c:/tek/pandamarket/backend/src/config.ts): JWT/cookie/encryption secrets **throw** in production
(L197-215), while payment credentials only **warn** (`warnIfDefault`, L216-223). Payments deserve the same fatal
treatment — a payment gateway silently running on `sandbox_token` in production is worse than a boot failure.

The defaults live at L130-139: `flouci`/`konnect` default to `sandbox_token` / `sandbox_secret` / `sandbox_key` /
`sandbox_wallet`.

### The fix

Add a `failIfDefaultInProduction` helper alongside the existing throw-block and apply it to the payment credentials:

```ts
function failIfDefaultInProduction(name: string, value: string, sentinel: string) {
  if (config.env === 'production' && value === sentinel) {
    throw new Error(
      `[config] ${name} is still the sandbox default ('${sentinel}') in production. ` +
      `Set a real value or explicitly disable the gateway.`,
    );
  }
}
```

Call it for each payment secret in the same place `warnIfDefault` is called today:

```diff
-warnIfDefault('FLOUCI_TOKEN', config.payments.flouci.token, 'sandbox_token');
-warnIfDefault('KONNECT_KEY', config.payments.konnect.key, 'sandbox_key');
+failIfDefaultInProduction('FLOUCI_TOKEN', config.payments.flouci.token, 'sandbox_token');
+failIfDefaultInProduction('FLOUCI_SECRET', config.payments.flouci.secret, 'sandbox_secret');
+failIfDefaultInProduction('KONNECT_KEY', config.payments.konnect.key, 'sandbox_key');
+failIfDefaultInProduction('KONNECT_WALLET', config.payments.konnect.wallet, 'sandbox_wallet');
```

> [!TIP]
> Pair this with a per-gateway `enabled` flag (E5's subsystem report). A gateway you have not configured should boot as
> **disabled with a clear log line**, not fail — the fatal path is only for a gateway that is *enabled* but still on a
> sandbox secret. That keeps development frictionless while making a misconfigured production impossible.

### Verify

- `PD_NODE_ENV=production` + default `FLOUCI_TOKEN` → boot throws with the explicit message.
- Real credentials → boots clean.
- `PD_NODE_ENV=development` + defaults → boots (warn only), unchanged behaviour.

---

## Guide F — Migration preflight

**Fixes:** [P1-12](./03-BUGS-P1-HIGH.md) (12 duplicated numeric prefixes; one 10-byte placeholder) ·
[P2-18](./04-BUGS-P2-MEDIUM.md) (no advisory lock, does not fail hard).

**File:** [`migrations/run.ts`](file:///c:/tek/pandamarket/backend/src/migrations/run.ts)

### Step 1 — duplicate-prefix preflight

Before running anything, scan the SQL directory and abort on a collision:

```ts
function assertNoDuplicatePrefixes(files: string[]) {
  const byPrefix = new Map<string, string[]>();
  for (const f of files) {
    if (f.endsWith('.down.sql')) continue;
    const prefix = f.split('_')[0];               // e.g. "047"
    byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), f]);
  }
  const dupes = [...byPrefix.entries()].filter(([, fs]) => fs.length > 1);
  if (dupes.length) {
    throw new Error(
      `Duplicate migration prefixes:\n` +
      dupes.map(([p, fs]) => `  ${p}: ${fs.join(', ')}`).join('\n'),
    );
  }
}
```

Also flag the near-empty placeholder — a migration file under ~20 bytes (e.g.
`047_seed_comprehensive_aliexpress_taxonomy.sql`, 10 bytes, `-- skipped`) is almost certainly a mistake:

```ts
if (fs.statSync(path).size < 20) {
  logger.warn({ file }, 'Suspiciously small migration — is this a forgotten placeholder?');
}
```

### Step 2 — advisory lock (prevents concurrent-boot races)

Wrap the whole run in a Postgres session advisory lock so two instances booting at once cannot race:

```ts
await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
try {
  await runPendingMigrations(client);
} finally {
  await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
}
```

### Step 3 — fail hard in production

A failed migration must stop the boot, not log and continue serving on a half-migrated schema:

```diff
 } catch (err) {
-  logger.error({ err }, 'Migration failed');
+  logger.error({ err }, 'Migration failed');
+  if (config.env === 'production') process.exit(1);
+  throw err;
 }
```

### Step 4 (follow-up, E18) — adopt timestamp prefixes

For new migrations, switch from `NNN_` to `YYYYMMDDHHMM_`. Collisions become effectively impossible and ordering stays
correct across branches.

### Verify

- Introduce a deliberate duplicate prefix → the runner aborts before touching the DB.
- Boot two instances simultaneously against a fresh DB → migrations run exactly once; the second waits on the lock.
- Feed a failing migration with `PD_NODE_ENV=production` → process exits non-zero, does not serve traffic.

---

## Guide G — Index the hot foreign keys

**Fixes:** [P2-19](./04-BUGS-P2-MEDIUM.md) · **E12**. 69 foreign keys are unindexed; ~20 sit on the read hot path.
Postgres does **not** auto-create an index for the referencing side of an FK, so every join and every `WHERE fk = $1`
does a sequential scan.

### Step 1 — find the unindexed FKs

Run this to get the exact list for *this* database rather than guessing:

```sql
SELECT c.conrelid::regclass       AS table_name,
       a.attname                  AS column_name
FROM   pg_constraint c
JOIN   pg_attribute a  ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE  c.contype = 'f'
AND    NOT EXISTS (
         SELECT 1 FROM pg_index i
         WHERE i.indrelid = c.conrelid
         AND   a.attnum = ANY(i.indkey)
       )
ORDER  BY table_name, column_name;
```

### Step 2 — index the hot ones first

Prioritise foreign keys on the tables in the request path — orders, cart, storefront, line items. Create them
concurrently so you do not lock writes on a live table:

```sql
-- one per FK; CONCURRENTLY must run outside a transaction block
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_order_item_order_id
  ON pd_order_item (order_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_order_store_id
  ON pd_order (store_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pd_cart_item_cart_id
  ON pd_cart_item (cart_id);
-- …repeat for the ~20 hot FKs from Step 1's output
```

> [!WARNING]
> `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. If the migration runner wraps each file in a
> transaction (most do), put these in a dedicated migration marked non-transactional, or apply them as a one-off
> maintenance script against the live DB. Do **not** drop `CONCURRENTLY` on a populated production table — it takes an
> `ACCESS EXCLUSIVE` lock and blocks all writes for the duration.

### Step 3 — measure

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM pd_order_item WHERE order_id = 'pd_order_example';
```

Confirm the plan flips from `Seq Scan` to `Index Scan` and note the timing delta.

### Verify

- Re-run the Step 1 query → the ~20 targeted FKs no longer appear.
- `EXPLAIN ANALYZE` on the hottest queries shows index scans.
- No write-blocking observed during index creation (because `CONCURRENTLY`).
