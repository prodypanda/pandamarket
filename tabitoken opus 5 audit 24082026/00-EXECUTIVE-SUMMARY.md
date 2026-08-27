# 00 · Executive Summary

**Audit date:** 2026-08-24 · **Commit:** `898bca6` · [← Index](./README.md)

---

## Verdict

PandaMarket is further along than its own documentation claims, and the commerce core is credible. The defects are
not spread evenly — they cluster in three identifiable places, which makes them tractable.

### What is genuinely good

| Area | Evidence |
| --- | --- |
| Type safety | `npm run type-check -w backend` → **0 errors**. `npx tsc --noEmit -p frontend/tsconfig.json` → **0 errors** |
| Test coverage (frontend) | **417 tests across 44 files, all passing** |
| Auth | No JWT in `localStorage`. `pd_at` 15 min / `pd_rt` 7 d, both httpOnly. Socket auth via short-lived token verified server-side |
| Payment webhooks | Real HMAC-SHA256, length-check before `timingSafeEqual`, `rawBody` preserved, idempotency by `(gateway, gateway_reference)`, service-layer rejection as defence in depth |
| PayPal | **Fails closed** when `webhookId` is absent — the correct default |
| Admin authorization | `router.use(requireAuth, requireAdmin)` covers all 225 admin routes. Verified live: `401` |
| Checkout | Quote versioning + payment-attempt idempotency + concurrent-request hardening (the current HEAD commit) |
| Schema basics | Every one of 120 `pd_*` tables has a primary key. Supabase PostgREST is not publicly readable (401 without key) |

### Where the problems are

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLUSTER 1 — Platform CMS                          BROKEN E2E       │
│  Wrong env var → 404 live · 3 endpoints called but never built      │
│  · no HTML sanitization · missing CSRF header · UUID/nanoid mismatch │
├─────────────────────────────────────────────────────────────────────┤
│  CLUSTER 2 — Gamified coupon endpoint         CONFIRMED EXPLOITABLE │
│  No auth · CSRF exempted · client sets its own prize value          │
│  · rate cap logs but never blocks · cross-tenant PII leak           │
├─────────────────────────────────────────────────────────────────────┤
│  CLUSTER 3 — Deployment configuration            11 ENV VARS SET    │
│  Email inert · AI dead · S3 unset · payment creds are public        │
│  sandbox literals · no Sentry · no metrics · CORS wide open         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The two P0s

### P0-1 · Unauthenticated arbitrary coupon issuance

Reproduced against live production with no auth, no session, no CSRF token:

```json
POST /api/pd/cart/gamified-spin
{"game_type":"spin_wheel","prize_won":"AUDIT_PROBE_50_PERCENT",
 "coupon_code":"AUDITPROBE1","discount_value":99999,"consent_given":true}

→ 201 {"data":{"success":true,"lead_id":"pd_lead_hsYAEUKxrxyqpnhU",
        "coupon_code":"AUDITPROBE1","discount_value":99999}}
```

Four failures stack: no auth middleware, an explicit CSRF exemption, prize values taken verbatim from the client body,
and a 24-hour frequency cap that queries the count, logs it, and then inserts anyway with no `return`.

**Why it is not yet catastrophic:** the checkout coupon resolver never reads `pd_gamified_lead` — it matches five
hardcoded literals and then falls back to `pd_seller_broadcast`. So injected coupons are not redeemable today. That is
luck, not design. The moment gamified leads are wired into redemption, this becomes direct financial loss.

→ Full detail and fix: [02-BUGS-P0-CRITICAL.md](./02-BUGS-P0-CRITICAL.md)

### P0-2 · Cross-tenant PII leak

`getStoreGamifiedLeads(storeId?)` falls through to an unscoped `SELECT *` when `storeId` is falsy. Any authenticated
user **without** a `store_id` — every buyer on the platform — receives the 100 most recent leads across all tenants,
including `phone` and `email`. All 11 rows currently in the table have `store_id = null`, so even the scoped branch
(`WHERE store_id = $1 OR store_id IS NULL`) means **every seller currently sees every lead**.

---

## Highest-impact non-P0 items

| Item | Why it matters | Effort |
| --- | --- | --- |
| **Email is completely inert** ([P1-10](./03-BUGS-P1-HIGH.md)) | No SMTP config anywhere. Password reset and email verification never reach a user, and the queue job reports **success**. Users who forget passwords are locked out with no signal in your logs. | Config only |
| **Sandbox payment secrets in production** ([P1-10](./03-BUGS-P1-HIGH.md)) | `config.ts` defaults Flouci/Konnect credentials to the literals `'sandbox_secret'` / `'sandbox_key'` and only `warnIfDefault`s. Webhook HMACs are computed with a **publicly known secret** — anyone who reads this repo can forge a signed payment webhook. JWT/cookie/encryption secrets *do* fail-fast; payments were left out of that guard. | ~10 lines |
| **Hub CMS pages 404 in production** ([P1-3](./03-BUGS-P1-HIGH.md)) | One file uses `NEXT_PUBLIC_API_URL`, which appears **exactly once in the whole repo** and is not set on Vercel. Falls back to `localhost:3001`, fetch fails, `catch` swallows it, `notFound()` fires. | 1 line |
| **Outbox worker never started** ([P1-11](./03-BUGS-P1-HIGH.md)) | Fully implemented, fully tested, and `main.ts` never calls `.start()`. Every event written to the outbox sits `pending` forever. | 2 lines |
| **Middleware blocks on 2 backend fetches per request** ([P2-15](./04-BUGS-P2-MEDIUM.md)) | With measured Postgres latency of **1023 ms**, a storefront page view can pay ~2 s before Next.js starts rendering. Biggest user-visible performance win available. | Small |

---

## Live system snapshot

| Check | Result |
| --- | --- |
| `GET /health` | `200 {"status":"ok"}` |
| `GET /ready` | **503 `not_ready`** — postgres ok (**1023 ms**), redis ok (45 ms), meilisearch `error`, s3 `degraded` |
| `GET /api/pd/search?q=shirt` | `200`, `total: 124` — Postgres path, not Meili |
| `GET /api/pd/admin/ads` unauthenticated | `401` ✅ |
| `POST /api/pd/cart/gamified-spin` unauthenticated | **`201` — accepted `discount_value: 99999`** ❌ |
| `GET /api/pd/marketplace/cms/abc/versions` | **`404` — endpoint does not exist** |
| `https://www.garbage.team/hub/pages/about` | **`404`** |
| `https://www.garbage.team/hub/products` | **`404`** — no index route exists |
| `/metrics` | `404` — metrics disabled |
| `/robots.txt`, `/sitemap.xml` | `200` ✅ |

**Database:** 120 `pd_*` tables · 13 users · 7 stores · 132 products · 15 orders · **0 platform CMS pages** ·
11 gamified leads · outbox empty · all tables have a PK ✅ · **RLS on 0/120 tables** · **69 unindexed foreign keys**

**Build health:** backend type-check ✅ · frontend type-check ✅ · 417 frontend tests ✅ ·
backend lint **21 errors** ❌ · frontend lint **475 errors** ❌

**i18n:** EN 3039 keys · FR 3035 · AR 3033 → 11 missing in FR, 6 missing in AR, 7 orphaned in FR

---

## Recommended sequence

**Today** — delete the audit probe row; fix both P0s.

**This week** — the Platform CMS chain (P1-3 → P1-9, five files); configure SMTP and send a real password reset
end to end; make sandbox payment credentials fail rather than warn; start the outbox worker.

**This month** — cache the middleware status fetches; split workers onto their own Render service; tighten CORS;
index the hot foreign keys; get lint to zero errors and make it block CI; add Sentry and metrics.

**Backlog** — build a real coupon system to replace the five hardcoded literals; deduplicate the two 4,325-line
page-builder components (99.3% identical); split the 6,882-line `admin.route.ts`; clean ~600 KB of committed scratch
files from the repo root.

→ Full ordered checklist with effort estimates: [08-TODO-CHECKLIST.md](./08-TODO-CHECKLIST.md)

---

## One structural observation

Three separate findings share a single root cause: **`PlatformPageBuilderEditor.tsx` and `PageBuilderEditor.tsx` are
4,325 lines each and differ by 32 lines — 99.3% identical.** The platform variant was forked from the store variant,
the frontend kept calling the store API surface, and the corresponding platform backend endpoints were never written.
That single copy-paste produced P1-6 (three missing endpoints), contributed to P1-5 (sanitizers not carried across),
and will keep producing divergence bugs until the two files are merged behind a `mode: 'store' | 'platform'` prop.

Fixing the duplication is listed as a backlog item on effort grounds, but it is the highest-leverage refactor in the
codebase.
