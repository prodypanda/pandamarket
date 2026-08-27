# 11 — Verification Gaps & Corrections

The boundaries of this audit, stated plainly. Everything in the bug documents was verified; this document lists what
was **not** confirmed, and two working assumptions that turned out to be wrong.

Back to [README](./README.md) · [Evidence & Method](./10-EVIDENCE-AND-METHOD.md)

---

## What could not be verified

| Area | Why not | Consequence for the audit |
| --- | --- | --- |
| **Backend test suite** | `npm test -w backend` needs `scripts/check-test-services.ts` to find live Postgres + Redis. Not run. | Backend behaviour claims come from reading code and probing the live API, not from tests. |
| **Playwright E2E** | Not run. | Buyer/seller flows not exercised end to end. |
| **Large services (partial reads)** | `order.service.ts` (102 KB), `analytics.service.ts` (203 KB), `ads.service.ts` (66 KB), `subscription-payment.service.ts` (60 KB), `store.service.ts` (53 KB), `category.service.ts` (50 KB), `shipping.service.ts` (42 KB) were grepped for patterns, not read end to end. | **There is more to find in the order, subscription, and payout flows.** |
| **UI/UX & visual quality** | No browser rendering performed. | Nothing in this audit is a design judgement. |
| **Seller & buyer flows end to end** | Routes enumerated and confirmed present; onboarding, KYC, checkout not walked interactively. | The `testing-onboarding` skill in `.agents/skills/` is built for exactly this and is the natural next step. |
| **Whether `pd_rt` survives the proxy** | The refresh cookie is path-scoped to `/api/pd/auth`; `next.config.ts:28-29` rewrites `/api/pd/:path*` same-origin, so it *should*. Refresh flow in `lib/api.ts:56-79` is well built (deduplicated, single retry, excludes auth endpoints). | Not confirmed against a live logged-in session. |

> [!IMPORTANT]
> The most valuable unverified area is the **order / subscription / payout** path. Those three services are the largest
> in the codebase and were only pattern-searched. If a follow-up audit happens, start there.

---

## Two corrections to earlier working assumptions

Recorded so nobody chases a problem that does not exist.

> [!NOTE]
> **1. There is no migration drift.**
> The 120 `.sql` files in `backend/src/migrations/sql/` break down as **95 up-migrations + 25 `.down.sql`**.
> `pd_migrations` contains exactly **95 rows**, and a set-difference in both directions is empty. **The schema is fully
> applied.** The real migration problems are the 12 duplicated numeric prefixes and the one 10-byte placeholder — see
> [P1-12](./03-BUGS-P1-HIGH.md).

> [!NOTE]
> **2. `platformConfigService.getSettings()` is properly cached.**
> A 30 s in-process memory cache sits in front of a 60 s Redis cache with `withRedisTimeout`
> (`platform-config.service.ts:904-957`). The earlier concern that `wishlist.route.ts` calls it per request is
> **unfounded** — that code is fine.

---

## How to close the gaps

| Gap | Next step |
| --- | --- |
| Backend tests | Stand up local Postgres + Redis (or point `check-test-services.ts` at the dev instances), then `npm test -w backend`. |
| E2E | Run the existing Playwright suite; wire it into CI ([M14](./06-MISSING-WORK.md)). |
| Large services | Full read of `order.service.ts`, `subscription-payment.service.ts`, and the payout flow. |
| Onboarding/KYC/checkout | Use the `testing-onboarding` skill to walk the flows interactively. |
| Refresh over proxy | Log in against the live deployment and confirm `pd_rt` round-trips through the Vercel rewrite. |
