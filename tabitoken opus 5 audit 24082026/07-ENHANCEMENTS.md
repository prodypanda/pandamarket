# 07 — Enhancements, Improvements & Ideas

These are **not bugs**. They are changes that would make PandaMarket meaningfully safer, faster, or easier to
maintain. Each is scored by effort (**XS** < 1h · **S** < ½ day · **M** 1–3 days · **L** > 3 days) and cross-linked to
the bug or missing-work item it relates to.

Back to [README](./README.md) · Bugs: [P1](./03-BUGS-P1-HIGH.md) · [P2](./04-BUGS-P2-MEDIUM.md) · Guides: [09](./09-IMPLEMENTATION-GUIDES.md)

---

## Priority view

The single highest-leverage items across all three groups:

| Rank | Item | Why it wins | Effort |
| --- | --- | --- | --- |
| 1 | **E10 — cache middleware status checks** | Removes up to ~2 s of blocking latency from *every* storefront page view. Biggest user-visible win on the list. | S |
| 2 | **E1 — fail-fast on sandbox payment creds** | Closes the same class of gap that already fail-fasts for JWT/cookie/encryption. One consistent rule. | XS |
| 3 | **E2 — route-manifest test** | Catches P1-3 and P1-6 automatically, forever. Structural defence against URL drift. | S |
| 4 | **E3 — tenant-isolation invariant tests** | Would have caught P0-2 before shipping. Protects the multi-tenant core permanently. | M |
| 5 | **E12 — index the hot foreign keys** | ~20 of 69 unindexed FKs on the query hot path. Mechanical, high payoff. | S |

---

## Security & correctness hardening

| # | Idea | Why | Effort | Related |
| --- | --- | --- | --- | --- |
| E1 | **Fail-fast on sandbox payment credentials in production** | `config.ts` already fail-fasts on dev JWT/cookie/encryption secrets. Payments were omitted. Adopt one rule: no known-public secret boots when `env === 'production'`. | XS | [P1-10](./03-BUGS-P1-HIGH.md), [Guide E](./09-IMPLEMENTATION-GUIDES.md#guide-e--fail-fast-on-sandbox-payment-credentials) |
| E2 | **Route-manifest test** | Assert every `fetch('/api/pd/…')` literal in `frontend/src` maps to a mounted Express route. Catches P1-6 and P1-3 automatically. | S | [P1-3](./03-BUGS-P1-HIGH.md), [P1-6](./03-BUGS-P1-HIGH.md) |
| E3 | **Tenant-isolation invariant tests** | Seed two stores; for each tenant-scoped service method, assert store A never sees store B's rows. Catches P0-2 before shipping. | M | [P0-2](./02-BUGS-P0-CRITICAL.md) |
| E4 | **ESLint rule banning bare mutating `fetch`** | Enforces `fetchWithCsrf` for all non-GET calls from the frontend. Catches P1-9 at lint time. | S | [P1-9](./03-BUGS-P1-HIGH.md) |
| E5 | **Boot-time subsystem report** | One log line per optional subsystem: `configured` / `disabled — reason`. Today a dead feature (email, AI, storage, search) looks identical to a live one in the logs. | S | [P1-10](./03-BUGS-P1-HIGH.md), [P1-11](./03-BUGS-P1-HIGH.md) |
| E6 | **Redis-backed rate limiting** | The 4 limiters in `middlewares/index.ts:306-344` are in-memory: they reset on restart and don't share state across instances. Move to Redis for global, restart-surviving limits. | M | [P2-22](./04-BUGS-P2-MEDIUM.md) |
| E7 | **Rotate secrets to 64 chars at launch** | `PD_JWT_SECRET` is 35 chars and `PD_COOKIE_SECRET` is 38 — thin for HS256. Fold into the pre-launch rotation. | XS | — |
| E8 | **CSP reporting** | `/api/csp-report` already exists. Point `report-to` at it and act on real violation data instead of guessing. | S | [P2-21](./04-BUGS-P2-MEDIUM.md) |
| E9 | **`SELECT *` audit on PII tables** | `pd_gamified_lead`, `pd_storefront_customer*`, `pd_verification_documents` should have explicit column lists, so a future schema addition cannot silently widen an API response. | M | [P0-2](./02-BUGS-P0-CRITICAL.md) |

---

## Performance

| # | Idea | Why | Effort | Related |
| --- | --- | --- | --- | --- |
| E10 | **Cache middleware status checks** | Removes up to ~2 s of blocking latency from every storefront page view. Highest user-visible win. | S | [P2-15](./04-BUGS-P2-MEDIUM.md), [Guide D](./09-IMPLEMENTATION-GUIDES.md#guide-d--cache-and-parallelize-middleware) |
| E11 | **Investigate the 1023 ms Postgres latency** | Measured on `/ready` through the Supabase pooler (`:6543`, eu-central-1) from Render. Check region colocation and whether transaction-mode pooling is right for a long-lived pool of 8. | M | — |
| E12 | **Index the hot foreign keys** | ~20 of 69 unindexed FKs sit on the query hot path (orders, cart, storefront lookups). | S | [P2-19](./04-BUGS-P2-MEDIUM.md), [Guide G](./09-IMPLEMENTATION-GUIDES.md#guide-g--index-the-hot-foreign-keys) |
| E13 | **Cursor pagination on large lists** | Admin products/orders and the hub feed use `LIMIT/OFFSET`, which degrades badly past a few thousand rows. | M | — |
| E14 | **Move image serving off Postgres** | The DB-blob fallback (`main.ts:228-264`) is load-bearing and puts image bandwidth on your DB connection. R2 fixes this. | L | [M7](./06-MISSING-WORK.md) |

---

## Architecture & maintainability

| # | Idea | Why | Effort | Related |
| --- | --- | --- | --- | --- |
| E15 | **Split `admin.route.ts`** | 6,882 lines / 225 routes → `admin/{ads,stores,users,kyc,analytics,settings}.route.ts`. Mechanical, high payoff. | M | [P3](./05-BUGS-P3-HYGIENE.md) |
| E16 | **Split `analytics.service.ts`** | 203 KB in a single file. | M | [P3](./05-BUGS-P3-HYGIENE.md) |
| E17 | **Deduplicate the two page builders** | 99.3% identical. Collapse to one component with a `mode` prop. | L | [P3](./05-BUGS-P3-HYGIENE.md) |
| E18 | **Timestamp migration prefixes** | Makes prefix collisions impossible going forward. | S | [P1-12](./03-BUGS-P1-HIGH.md), [Guide F](./09-IMPLEMENTATION-GUIDES.md#guide-f--migration-preflight) |
| E19 | **Advisory lock + fail-hard migrations** | Prevents concurrent-boot races and serving on a half-migrated schema. | M | [P2-18](./04-BUGS-P2-MEDIUM.md) |
| E20 | **Consolidate the nine planning docs** | One `docs/STATUS.md`; archive the rest. | S | [P3](./05-BUGS-P3-HYGIENE.md) |
| E21 | **Generate an API client from Swagger** | `/api/docs` already serves a spec. A generated typed client eliminates the entire class of frontend/backend URL drift. | M | [P1-6](./03-BUGS-P1-HIGH.md), E2 |
| E22 | **Split `hub/dashboard/products/page.tsx`** | >6,900 lines in one client component — where seller-facing regressions will hide. | L | [P3](./05-BUGS-P3-HYGIENE.md) |

---

> [!TIP]
> If you only do three things from this file: **E10** (latency), **E2 + E3** (the two tests that would have caught a
> P0 and multiple P1s). Everything else is genuinely optional until after launch.
