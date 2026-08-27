# 10 — Evidence & Method

Every claim in this audit was **verified**, not inferred — by reading code, running a command, or probing the live
deployment. This document records exactly what was run so any finding can be reproduced or challenged.

Back to [README](./README.md) · [Verification Gaps](./11-VERIFICATION-GAPS.md)

**Commit audited:** `898bca6 feat(checkout): harden quote versions and concurrent idempotency`
**Audit date:** 2026-08-24 · **Mode:** read-only (no project source file modified).

---

## Local commands run

| Command | Result |
| --- | --- |
| `npm run type-check -w backend` | **PASS** — 0 errors |
| `npx tsc --noEmit -p frontend/tsconfig.json` | **PASS** — 0 errors |
| `npx vitest run --root frontend` | 44 files / **417 tests passed** (many `act()` warnings) |
| `npx eslint "src/**/*.ts" --quiet` (backend) | **21 errors** |
| `npm run lint` (frontend) | 1004 problems — **475 errors, 529 warnings** |
| `git log -n 15 --oneline` / `git status --porcelain` | clean working tree at `898bca6` |

---

## Live infrastructure probed

| Surface | Identifier |
| --- | --- |
| Backend (Render) | `srv-d9qjrth42hec73efhoa0` → `https://pandamarket-backend-fjom.onrender.com` |
| Frontend (Vercel) | `prj_f0I1YhUlcTCSY8MZ8KV4M6b5Ob3J` → `https://www.garbage.team` |
| Database (Supabase) | project `lwmagicgoqbvkxsyahgu`, Management API SQL |

> [!NOTE]
> Production credentials were used with the owner's explicit permission for a deeper audit. They are slated for
> rotation before real production. Nothing in this audit exfiltrated or persisted any secret value.

---

## Live probe results

| Probe | Result | Finding |
| --- | --- | --- |
| `GET /health` | `200 {"status":"ok"}` | — |
| `GET /ready` | **503 `not_ready`** — postgres ok (**1023 ms**), redis ok (45 ms), meilisearch `error`, s3 `degraded` | [P2-13](./04-BUGS-P2-MEDIUM.md), [E11](./07-ENHANCEMENTS.md) |
| `GET /api/pd/search?q=shirt` | `200`, `total: 124` (Postgres path, not Meili) | [P1-8](./03-BUGS-P1-HIGH.md) |
| `GET /api/pd/admin/ads` (no auth) | **401** ✅ | admin router properly guarded |
| `POST /api/pd/cart/gamified-spin` (no auth) | **201 — accepted `discount_value: 99999`** ❌ | [P0-1](./02-BUGS-P0-CRITICAL.md) |
| `GET /api/pd/marketplace/cms/public` | `200` | — |
| `GET /api/pd/marketplace/cms/abc/versions` | **404 — endpoint does not exist** | [P1-6](./03-BUGS-P1-HIGH.md) |
| `https://www.garbage.team/hub/pages/about` | **404** | [P1-3](./03-BUGS-P1-HIGH.md) |
| `https://www.garbage.team/hub/products` | **404** (only `/hub/products/[id]` exists) | [M10](./06-MISSING-WORK.md) |
| `/metrics` | `404` (metrics disabled) | [M9](./06-MISSING-WORK.md) |
| `/robots.txt`, `/sitemap.xml` | `200` ✅ | [Already Correct](./12-ALREADY-CORRECT.md) |
| Supabase PostgREST without key | `401` ✅ | not publicly exposed |

> [!CAUTION]
> The `POST /cart/gamified-spin` probe wrote a **real row** to the live database
> (`pd_lead_hsYAEUKxrxyqpnhU`, `coupon_code='AUDITPROBE1'`, `discount_value=99999`). It is not currently redeemable,
> but it must be deleted — see the Tier 0 item in [08-TODO-CHECKLIST.md](./08-TODO-CHECKLIST.md).

---

## Database state (from Supabase Management API SQL)

| Metric | Value |
| --- | --- |
| `pd_*` tables | **120** |
| Users | 13 |
| Stores | 7 |
| Products | 132 |
| Orders | 15 |
| Platform CMS pages | **0** |
| Gamified leads | 11 |
| Outbox table | empty |
| Primary keys | every table has one ✅ |
| Row-Level Security | **enabled on 0/120 tables** |
| Unindexed foreign keys | **69** |
| Migrations applied (`pd_migrations`) | **95 rows** |
| Migration `.sql` files | 120 (95 up + 25 down) |

> [!NOTE]
> The 0/120 RLS figure is framed as an **architecture choice, not a bug** — see the discussion at
> [P2-20](./04-BUGS-P2-MEDIUM.md). Tenant isolation is enforced in the service layer; the P0-2 leak is a *gap* in that
> enforcement, not an argument for RLS.

---

## i18n key counts

| Locale | Keys |
| --- | --- |
| EN | 3039 |
| FR | 3035 (11 missing vs EN, 7 orphaned) |
| AR | 3033 (6 missing vs EN) |

Concentrated in `ads.*` and `sellerLoyalty.*` — see [M11](./06-MISSING-WORK.md).
