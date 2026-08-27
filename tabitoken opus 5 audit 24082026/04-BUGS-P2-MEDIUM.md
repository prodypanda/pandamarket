# 04 · P2 — Medium-Severity Bugs

**Audit date:** 2026-08-24 · **Commit:** `898bca6` · [← Index](./README.md)

Twelve findings. Correctness, performance, and operational risk. None break a shipped feature outright, but each is
a real defect that will bite under load, at scale, or during an incident.

| # | Title | Category | Effort |
| --- | --- | --- | --- |
| [P2-13](#p2-13--ready-can-never-be-green) | `/ready` can never be green | Operational | ⚡ Small |
| [P2-14](#p2-14--cors-allowlist-includes-third-party-namespaces) | CORS allows `*.vercel.app` / `*.onrender.com` | Security | Small |
| [P2-15](#p2-15--middleware-blocks-on-two-backend-round-trips) | Middleware blocks on 2 backend fetches/request | Performance | Small |
| [P2-16](#p2-16--revalidate-endpoint-has-no-machine-caller-auth) | Revalidate endpoint: no machine auth, no ownership check | Security / correctness | Small |
| [P2-17](#p2-17--everything-runs-in-one-web-process) | Everything runs in one web process | Operational | Medium |
| [P2-18](#p2-18--migrations-auto-run-at-boot-and-failures-are-ignored) | Migrations auto-run at boot; failures ignored | Operational | Small |
| [P2-19](#p2-19--69-unindexed-foreign-keys) | 69 unindexed foreign keys | Performance | Small |
| [P2-20](#p2-20--rls-enabled-on-0-of-120-tables) | RLS on 0/120 tables | Architecture (not a bug) | Medium |
| [P2-21](#p2-21--csp-contains-invalid-and-localhost-default-sources) | CSP has invalid / localhost sources | Security | ⚡ Small |
| [P2-22](#p2-22--rate-limiting-is-in-memory) | Rate limiting is in-memory | Correctness | Small |
| [P2-23](#p2-23--lint-fails-on-both-sides) | Lint fails on both sides | Hygiene / CI | Medium |
| [P2-24](#p2-24--zod-major-version-split) | zod major-version split across workspaces | Latent | Small |

---

## P2-13 · `/ready` can never be green

[`main.ts:360-374`](file:///c:/tek/pandamarket/backend/src/main.ts#L360-L374) sets `allHealthy = false` when the
Meilisearch check fails, and line 392 maps that to a 503. S3 is handled correctly — line 389 marks it `degraded`
with the comment `// S3 not critical for readiness`. Meilisearch, which you have deliberately not configured, is
treated as mandatory:

```ts
try {
  const meiliRes = await fetch(`${config.meili.host}/health`, { signal: AbortSignal.timeout(5000) });
  if (meiliRes.ok) {
    checks.meilisearch = { status: 'ok', latency_ms: Date.now() - start };
  } else {
    checks.meilisearch = { status: 'error' };
    allHealthy = false;                     // ← makes /ready return 503 forever
  }
} catch {
  checks.meilisearch = { status: 'error' };
  allHealthy = false;                       // ← and here
}
```

**Confirmed live:** `GET /ready` → **503 `not_ready`** (postgres ok 1023 ms, redis ok 45 ms, meilisearch `error`, s3
`degraded`). Currently harmless because Render's health check points at `/health` (200), but `/ready` is what you
reach for when you add autoscaling, a load balancer, or k8s probes — and it is permanently red, which trains
everyone to ignore it.

### How to fix ⚡

Mirror the S3 treatment — reserve `allHealthy = false` for Postgres and Redis, the only two dependencies the app
genuinely cannot serve without:

```diff
     if (meiliRes.ok) {
       checks.meilisearch = { status: 'ok', latency_ms: Date.now() - start };
     } else {
-      checks.meilisearch = { status: 'error' };
-      allHealthy = false;
+      checks.meilisearch = { status: 'degraded' };   // not critical for readiness
     }
   } catch {
-    checks.meilisearch = { status: 'error' };
-    allHealthy = false;
+    checks.meilisearch = { status: 'degraded' };
   }
```

Optionally split into `/ready` (hard deps: Postgres, Redis) and `/health/detail` (everything, including degraded
subsystems).

---

## P2-14 · CORS allowlist includes third-party namespaces

`main.ts` accepts any origin matching `*.onrender.com`, `*.vercel.app`, `*.pandamarket.tn`, `*.garbage.team`, plus
any localhost port. The last two are yours. **The first two are shared public namespaces** — anyone can deploy to
`evil.vercel.app` and that origin passes your CORS check with credentials.

Because auth rides on cookies with `sameSite` and CSRF double-submit is in place, this is not directly exploitable
today. It is an unnecessarily wide surface, and localhost being permitted in production is a further smell.

### How to fix

Replace the wildcards with exact deployment hosts via `PD_ADMIN_CORS`/`PD_STORE_CORS`
(`pandamarket-frontend.vercel.app`, `pandamarket-backend-fjom.onrender.com`). Keep the tenant-subdomain regex for
`*.garbage.team` / `*.pandamarket.tn`, which multi-tenancy legitimately needs. Gate the localhost entries on
`config.env !== 'production'`.

---

## P2-15 · Middleware blocks on two backend round-trips

[`middleware.ts`](file:///c:/tek/pandamarket/frontend/src/middleware.ts) calls `getMaintenanceStatus`
([line 148](file:///c:/tek/pandamarket/frontend/src/middleware.ts#L148)) and `getStorefrontStatus`
([line 170](file:///c:/tek/pandamarket/frontend/src/middleware.ts#L170)). Both use `cache: 'no-store'` with a
3-second timeout, and they run **sequentially** on every matched request, before any page renders:

```ts
const res = await fetchWithTimeout(`${backendUrl}/api/pd/marketplace/maintenance`, {
  headers: forwardedIpHeaders(req),
  cache: 'no-store',
}, 3000);
```

With `/ready` reporting **1023 ms** Postgres latency and Render free-tier cold starts, a storefront page view can
pay up to ~2 s of serialized middleware latency before Next.js starts rendering. On a marketplace, that is the
difference between usable and not. **This is the single highest user-visible performance win in the audit.**

### How to fix

- Cache both results in the Edge runtime with a short TTL (10–30 s) keyed by host — maintenance mode and storefront
  status change rarely and tolerate staleness.
- Run the two fetches with `Promise.all` instead of sequentially.
- Drop the timeout to ~800 ms and **fail open** (assume not-in-maintenance) so a slow backend degrades instead of
  blocking.
- Best: push maintenance state into a signed cookie or Edge Config so the common path needs zero network calls.

Full guide: [09-IMPLEMENTATION-GUIDES.md](./09-IMPLEMENTATION-GUIDES.md#guide-d--cache-and-parallelize-middleware).

---

## P2-16 · Revalidate endpoint has no machine-caller auth

[`revalidate/route.ts:32-52`](file:///c:/tek/pandamarket/frontend/src/app/api/storefront/revalidate/route.ts#L32-L52)
authenticates by forwarding the caller's cookie to `/api/pd/auth/me` and checking the role. Correct for the seller
dashboard. But two problems:

**1. No machine-caller path.** [`outbox.worker.ts:140`](file:///c:/tek/pandamarket/backend/src/workers/outbox.worker.ts#L140)
calls this same endpoint server-to-server **with no cookie**, so once [P1-11](./03-BUGS-P1-HIGH.md) is fixed every
outbox revalidation will 401 — and `outbox.worker.ts:145` swallows it at `debug`. Two bugs that hide each other.

**2. No ownership check.** Any authenticated seller can revalidate **any** hostname. `hostnames[]` is taken from
the request body and never checked against what the caller owns, so seller A can force cache invalidation on seller
B's storefront. Low impact (cache churn, not data exposure), but a missing authorization check — and the same
"trust the input" shape as the two P0s.

### How to fix

- Accept `Authorization: Bearer <PD_REVALIDATE_SECRET>` as an alternative credential for machine callers, and send
  it from the worker:

```diff
 // outbox.worker.ts revalidateStorefrontHosts
 await fetch(`${frontendUrl}/api/storefront/revalidate`, {
   method: 'POST',
-  headers: { 'Content-Type': 'application/json' },
+  headers: {
+    'Content-Type': 'application/json',
+    'Authorization': `Bearer ${process.env.PD_REVALIDATE_SECRET ?? ''}`,
+  },
   body: JSON.stringify({ hostnames }),
 });
```

- For cookie-authenticated sellers, resolve their owned hostnames server-side and intersect with the requested list
  rather than trusting the body.
- Log revalidation failures at `warn` with the status code.

---

## P2-17 · Everything runs in one web process

`config.runWorkersInProcess` defaults **true** and is not overridden on Render, so a single instance carries: the
HTTP server, 10 BullMQ workers ([`main.ts:498-512`](file:///c:/tek/pandamarket/backend/src/main.ts#L498-L512)), a
5-minute ads lifecycle timer, a 2-minute admin-notes reminder sweep, and a 10-minute keep-alive self-ping.

Specific problems inside that:

- **The admin-notes sweep is N+1.** Every 2 minutes it does `SELECT id FROM pd_user WHERE role IN (...)` then one
  `fetchDueReminders` per admin. It also keeps an in-memory `handledReminderIds` Set that is `clear()`ed wholesale
  at 1000 entries — so after a clear, already-handled reminders **re-fire**. Dedupe state belongs in Redis or a
  `reminder_sent_at` column, not a process-local Set with a destructive eviction policy.
- **The keep-alive self-ping** ([`main.ts:416-433`](file:///c:/tek/pandamarket/backend/src/main.ts#L416-L433))
  hits its own `/health` every 10 minutes to defeat free-tier sleep. It works, but it masks real cold-start
  behaviour, so you will not discover startup regressions until users do.
- **A worker OOM or crash takes down HTTP** with it. There is no isolation between a runaway AI job and your
  storefront.

`backend/package.json` already has standalone runners (`worker:ai`, `worker:email`,
`worker:payment-reconciliation`), and 20 files exist in `src/workers/`, so the split is half-built.

### How to fix

Set `PD_RUN_WORKERS_IN_PROCESS=false` on the web service and add a Render **background worker** service running the
runners. Move the two timers into the worker process. Replace the sweep's per-admin loop with one `JOIN` query.
Move dedupe to a Redis `SETEX` keyed by reminder id. Once workers are separate and the service is on a paid tier,
delete the self-ping.

---

## P2-18 · Migrations auto-run at boot and failures are ignored

[`main.ts:93-98`](file:///c:/tek/pandamarket/backend/src/main.ts#L93-L98) runs migrations on every boot and only
`logger.warn`s on failure — then the server starts and serves traffic. A half-applied schema will happily accept
requests and produce confusing runtime errors instead of a clean failed deploy.

Combined with in-process workers, two instances booting concurrently both attempt migrations.
[`run.ts`](file:///c:/tek/pandamarket/backend/src/migrations/run.ts) has no advisory lock, so concurrent boots can
race on the same file.

### How to fix

Wrap the migration run in `SELECT pg_advisory_lock(<constant>)` so only one instance migrates. In production,
`process.exit(1)` on migration failure — a failed deploy is far better than a silently degraded one. Best practice
is a separate release/pre-deploy step rather than application boot.

---

## P2-19 · 69 unindexed foreign keys

Every `pd_*` table has a primary key ✅, but 69 foreign keys have no supporting index on the referencing column.
Each one makes `DELETE`/`UPDATE` on the parent do a sequential scan of the child, and makes reverse lookups slow.

Highest-traffic offenders:

| Table | Column |
| --- | --- |
| `pd_order_item` | `product_id`, `variant_id` |
| `pd_checkout_quote` | `store_id` |
| `pd_review` | `order_id` |
| `pd_wallet_transaction` | `order_id` |
| `pd_store` | `theme_id`, `subscription_plan` |
| `pd_storefront_customer_token` | `customer_id`, `store_id` |
| `pd_storefront_customer_session` | `store_id` |
| `pd_digital_download` | `product_id` |
| `pd_ads_*` | 14 more across the ads family |

At 132 products and 15 orders this is invisible. At 10k products it is the first thing that hurts.

### How to fix

One migration adding `CREATE INDEX CONCURRENTLY IF NOT EXISTS` for the ~20 on hot paths (order items, checkout
quotes, storefront customer tokens/sessions, reviews, wallet transactions, ads events). Skip the rest until
`pg_stat_user_tables` shows they matter. Add a CI check that new FKs come with an index. Index list and migration:
[09-IMPLEMENTATION-GUIDES.md](./09-IMPLEMENTATION-GUIDES.md#guide-g--index-the-hot-foreign-keys).

---

## P2-20 · RLS enabled on 0 of 120 tables

All tenant isolation lives in application code — the `WHERE store_id = $1` in each service. Verified:
`relrowsecurity` is false on all 120 `pd_*` tables.

> [!NOTE]
> **This is not a bug.** It is a legitimate architecture choice for a single-backend app that owns its connection,
> and Supabase PostgREST is not publicly reachable without a key (probed: 401). It is listed here for completeness
> and because it raises the stakes of every other isolation finding.

Because there is no second line of defence, every isolation bug is a full cross-tenant breach — exactly what
[P0-2](./02-BUGS-P0-CRITICAL.md) demonstrates. One missing `WHERE` clause is all it takes.

### How to fix (optional, medium effort)

If you later expose Supabase directly to clients, RLS becomes mandatory. In the meantime the cheaper mitigation is a
test-level invariant ([E3](./07-ENHANCEMENTS.md)): for each tenant-scoped service method, seed two stores and assert
store A's call never returns store B's rows. That catches P0-2-class bugs without a schema migration.

---

## P2-21 · CSP contains invalid and localhost-default sources

`main.ts` helmet config:

- `imgSrc` includes `config.s3.publicBaseUrl`, which **defaults to the relative path `/pd-product-images`**. A
  relative path is not a valid CSP source expression — browsers discard the token, and depending on the parse you
  can lose the whole directive.
- `connectSrc` includes `config.meili.host` and `config.s3.endpoint`, both of which default to **localhost** URLs.
  Since neither is configured on Render, your production CSP header currently advertises `http://localhost:*`
  sources.
- `scriptSrc: 'self'` with no `'unsafe-inline'` — the app renders JSON-LD via `dangerouslySetInnerHTML` in
  `hub/page.tsx:365-372` and `StorefrontSeoJsonLd.tsx:23-28`, but `<script type="application/ld+json">` is data,
  not script, so browsers do not execute it and CSP does not block it. **This is fine** — worth knowing rather than
  fixing.

### How to fix ⚡

Only push absolute `https://` origins into CSP source lists; filter out relative paths and `http://localhost` when
`env === 'production'`. There is already a `/api/csp-report` route in the frontend — point `report-uri`/`report-to`
at it and watch real violations instead of guessing ([E8](./07-ENHANCEMENTS.md)).

---

## P2-22 · Rate limiting is in-memory

The four limiters in
[`middlewares/index.ts:306-344`](file:///c:/tek/pandamarket/backend/src/middlewares/index.ts#L306-L344) —
`authRateLimit` (10/15 min), `adsEventRateLimit` (60/min), `adsDeliveryRateLimit` (30/min), `apiRateLimit`
(100/min) — use `express-rate-limit`'s **default in-process memory store**. No `RedisStore`, despite Redis being
available and healthy.

Consequences: counters reset on every deploy and every restart; with N instances the effective limit is N×.
`apiRateLimit` keys on `req.user?.id ?? req.apiKey?.id ?? req.ip` (lines 338-342) — good design — but
`app.set('trust proxy', 1)` at `main.ts:118` means `req.ip` comes from `X-Forwarded-For`. Behind Render's proxy
that is correct; verify Render sends exactly one hop, or the value is spoofable and IP-keyed limits become
bypassable.

> [!IMPORTANT]
> This directly affects the fix for [P0-1](./02-BUGS-P0-CRITICAL.md). The new `gamifiedSpinRateLimit` (5/hour) is
> worthless as an in-memory limiter — it resets on every deploy and multiplies per instance. Back it with Redis.

### How to fix

Add `rate-limit-redis` backed by the existing `PD_REDIS_URL` so limits are global and survive restarts. Confirm the
proxy hop count matches `trust proxy: 1`.

---

## P2-23 · Lint fails on both sides

| | Errors | Warnings |
| --- | --- | --- |
| backend (`eslint "src/**/*.ts"`) | **21** | 361 |
| frontend (`npm run lint`) | **475** | 529 |

Backend errors are all mechanical and safe:

| Rule | Locations |
| --- | --- |
| `no-empty` | `admin.route.ts:4635`, `ai.route.ts:1089`/`1602`, `files.route.ts:570`, `store.route.ts:971`/`976` |
| `no-useless-escape` (`\-` in char classes) | `ai.route.ts:174,175,186,187,298,300,306,308` |
| `prefer-const` | `ai.route.ts:1590`, `store.route.ts:705`/`725`, `image-variant.service.ts:284`, `subscription-payment.service.ts:407` |
| `no-case-declarations` | `files.route.ts:160`/`191` |

The frontend's 475 errors are dominated by `@typescript-eslint/no-explicit-any`, plus dead vars in `middleware.ts`
(`HUB_DOMAINS` L29, `ADMIN_DOMAINS` L41, `PLATFORM_BASES` L50, `isAdminHost`/`isMarketplaceHost` L103) and
`@next/next/no-img-element` in `LazyBlurImage.tsx:53`, `MarketplaceWatermark.tsx:133`/`168`.

The real issue is not the count — it is that **`npm run lint` exits 1 on a clean checkout**, so lint cannot gate CI
and new violations are invisible.

### How to fix

`eslint --fix` clears 5 backend and 4 frontend errors immediately. Fix the ~16 remaining backend errors by hand
(~30 min; the `\-` escapes are a find-and-replace). For the frontend, get to zero *errors* — demote
`no-explicit-any` to `warn` if typing 475 sites is not worth it now, but do not leave it as an error you ignore.
Then wire lint into CI as a blocking check.

> [!NOTE]
> `npx next lint` fails with "Invalid project directory" — `next lint` is removed in this Next version. The
> `npm run lint` script calling `eslint` directly is the correct invocation. Do not "fix" it back to `next lint`.

---

## P2-24 · zod major-version split

`backend` pins `zod@^3.23.8`; `frontend` pins `zod@^4.4.2`. zod 4 changed error formatting, the `.error` shape, and
several schema APIs. `packages/types` has no zod dependency at all (grep confirmed), so nothing is broken **today**
— but the first shared schema you put in `packages/types` will typecheck against one major and fail at runtime
against the other.

Related: `nodemailer@^8.0.7` is a dependency of the **root** `package.json`, while `backend` has only
`@types/nodemailer` in devDependencies and imports it dynamically (`smtp-config.service.ts:346`,
`email.worker.ts:399`). It resolves via hoisting today. Any change to workspace hoisting or a `--production` install
in a Docker build turns that into the `nodemailer_missing` path — a silent fallback to console transport, which is
exactly the [P1-10](./03-BUGS-P1-HIGH.md) email failure mode again.

### How to fix

Align on zod 4 in both workspaces (backend is the smaller migration) or pin both to 3 until you are ready. Move
`nodemailer` into `backend/dependencies` where it is actually imported.
