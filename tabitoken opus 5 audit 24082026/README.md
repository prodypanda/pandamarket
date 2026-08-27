# PandaMarket — Deep Platform Audit

**Audit date:** 2026-08-24
**Auditor:** Tabitoken Opus 5
**Commit audited:** `898bca6 feat(checkout): harden quote versions and concurrent idempotency`
**Mode:** read-only investigation. No project source file was modified during the audit.

> [!NOTE]
> **Remediation status (2026-08-25):** Tier 0 complete; Tier 1 **10/11** (only SMTP credentials remain); Tier 2
> **13/17** — all security items closed (both P0s, P2-14/16/20/21/22; plus P2-13/15/18/19/23/24, M10/M11) + M9 done (Sentry live, /metrics live). Lint: 0 errors both sides, blocking CI gate active.
> Live tracking: [08-TODO-CHECKLIST.md](./08-TODO-CHECKLIST.md) (✅ marks + implementation log).
> Commits: `a445120`, `11ef9d0`, `bc7c456`, `bd54a28`, `779d923`, `106eb39`, `3d9eb2f`, `d60fc84`, `83efe40`,
> `ca9ad71`, `4d087b6`, `f81639e`, `17eda50`, `a41b9b6`, `14c25e7`, `a825c6f`.

---

## What this is

A full-platform audit of PandaMarket — backend, frontend, marketplace hub, tenant storefronts, admin console,
seller dashboard, and buyer flows. Every finding below was **verified**, either by reading the code, running a
command, or probing the live deployment. Nothing is inferred from documentation.

**Totals:** 2 P0 Â· 10 P1 Â· 12 P2 Â· 1 P3 cluster = **24 bugs** Â· **14 missing/unfinished items** Â· **22 enhancements**

---

## Scope

### In scope
Platform behaviour: backend services and routes, frontend rendering and routing, authentication, authorization,
multi-tenancy isolation, payments, checkout, search, CMS, workers, database schema, deployment configuration,
build/lint/test health.

### Explicitly out of scope
- **Content.** Nonsense product titles, products filed in wrong categories, test accounts, and placeholder copy are
  expected during development and are **not** reported as defects.
- **Meilisearch not being configured.** Intentional. Reported only where the *fallback path* is itself broken.
- **S3 → Cloudflare R2 migration.** Deliberately deferred. Listed for completeness in missing work, not as a bug.
- **Visual design and UX quality.** No browser rendering was performed.

### Environment framing
`PD_NODE_ENV=production` is set on Render, but this is understood to be the **development/staging** environment.
Infrastructure findings are therefore written as **launch-readiness gaps**, not live production incidents. The one
exception is P0-1, which was reproduced against the live deployment and wrote a real row to the live database.

---

## Read in this order

| # | Document | Read this if you want… |
| --- | --- | --- |
| 00 | [Executive Summary](./00-EXECUTIVE-SUMMARY.md) | The 5-minute version. Start here. |
| 01 | [Architecture Map](./01-ARCHITECTURE.md) | To understand how the system fits together |
| 02 | [P0 — Critical Bugs](./02-BUGS-P0-CRITICAL.md) | **Fix today.** Confirmed exploitable + PII leak |
| 03 | [P1 — High Bugs](./03-BUGS-P1-HIGH.md) | Broken features and security-relevant defects |
| 04 | [P2 — Medium Bugs](./04-BUGS-P2-MEDIUM.md) | Correctness, performance, operational risk |
| 05 | [P3 — Hygiene](./05-BUGS-P3-HYGIENE.md) | Repo cleanliness, dead code, stale docs |
| 06 | [Missing & Unfinished Work](./06-MISSING-WORK.md) | Features started but not completed |
| 07 | [Enhancements & Ideas](./07-ENHANCEMENTS.md) | Improvements worth making |
| 08 | [Master TODO Checklist](./08-TODO-CHECKLIST.md) | **The working document.** Every task, prioritised |
| 09 | [Implementation Guides](./09-IMPLEMENTATION-GUIDES.md) | Copy-paste-ready code for the top fixes |
| 10 | [Evidence & Method](./10-EVIDENCE-AND-METHOD.md) | Every command run, every probe result |
| 11 | [Verification Gaps](./11-VERIFICATION-GAPS.md) | What I could **not** confirm, and corrections |
| 12 | [Already Correct](./12-ALREADY-CORRECT.md) | What is done right — **do not regress these** |

---

## The three-sentence version

The commerce core is genuinely solid — clean type-checks on both sides, 417 passing frontend tests, real HMAC webhook
verification, httpOnly cookie auth with deduplicated refresh, CSRF double-submit, and checkout with quote versioning
plus payment idempotency. The problems cluster in three places: the **Platform CMS subsystem** is broken end-to-end,
the **gamified coupon endpoint** is confirmed exploitable without authentication, and the **Render deployment** runs on
11 environment variables so email, AI, storage, real payment credentials, and all observability are silently inert.
Fix the two P0s today, the CMS and email gaps this week, and the platform is in credible pre-launch shape.

---

## Severity definitions

| Level | Meaning | Response time |
| --- | --- | --- |
| **P0** | Exploitable now, or actively leaking data | Same day |
| **P1** | A feature is broken, or a security control is missing | This week |
| **P2** | Correctness, performance, or operational risk | This month |
| **P3** | Maintainability and hygiene | Backlog |

---

## Immediate action required

> [!CAUTION]
> **A live database row was created during this audit while proving P0-1.** Delete it before anything else:
> ```sql
> DELETE FROM pd_gamified_lead WHERE id = 'pd_lead_hsYAEUKxrxyqpnhU';
> ```
> It carries `coupon_code = 'AUDITPROBE1'` and `discount_value = 99999.000`. It is not currently redeemable
> (see [P0-1](./02-BUGS-P0-CRITICAL.md)), but it is junk in a production table and should not stay there.

---

## Two corrections to earlier assumptions

Recorded so nobody chases a problem that does not exist:

1. **There is no migration drift.** The 120 `.sql` files in `backend/src/migrations/sql/` break down as 95
   up-migrations + 25 `.down.sql`. `pd_migrations` contains exactly 95 rows, and a set-difference in both directions
   is empty. **The schema is fully applied.** The real migration problems are 12 duplicated numeric prefixes and one
   10-byte placeholder file — see [P1-12](./03-BUGS-P1-HIGH.md).
2. **`platformConfigService.getSettings()` is properly cached** — a 30 s in-process memory cache in front of a 60 s
   Redis cache with `withRedisTimeout`. The concern that `wishlist.route.ts` calls it per request is unfounded; that
   code is fine.
