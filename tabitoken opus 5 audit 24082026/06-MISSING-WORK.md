# 06 · Missing & Unfinished Work

**Audit date:** 2026-08-24 · **Commit:** `898bca6` · [← Index](./README.md)

Distinct from bugs. These are features that were started and not completed, or wired on one side only. Effort scale:
**XS** < 1 hr · **S** < 1 day · **M** 1–3 days · **L** > 3 days.

| # | Item | Effort | Related |
| --- | --- | --- | --- |
| [M1](#m1--platform-cms-versioning--preview-backend) | Platform CMS versioning + preview backend | M | P1-6 |
| [M2](#m2--platform-cms-htmlcss-sanitization) | Platform CMS HTML/CSS sanitization | S | P1-5 |
| [M3](#m3--outbox-worker-startup) | Outbox worker startup | XS | P1-11 |
| [M4](#m4--server-authoritative-gamified-prize-engine) | Server-authoritative gamified prize engine | M | P0-1 |
| [M5](#m5--email-delivery) | Email delivery | S (config) | P1-10 |
| [M6](#m6--a-real-coupon-system) | A real coupon system | L | — |
| [M7](#m7--object-storage) | Object storage (R2) | M | deferred |
| [M8](#m8--search-indexing) | Search indexing | S | deferred |
| [M9](#m9--observability) | Observability | M | P1-10 |
| [M10](#m10--hubproducts-index-route) | `/hub/products` index route | S | — |
| [M11](#m11--i18n-parity) | i18n parity | S | — |
| [M12](#m12--ai-tagger-worker) | ai-tagger worker decision | XS | P1-11 |
| [M13](#m13--separate-worker-process) | Separate worker process | M | P2-17 |
| [M14](#m14--playwright-e2e-in-ci) | Playwright E2E in CI | M | — |

---
## M1 ✅ DONE (2026-08-25) — Platform CMS versioning + preview backend

~~Three endpoints are called by the frontend and do not exist ([P1-6](./03-BUGS-P1-HIGH.md)). `pd_platform_page_version` table does not exist.~~

**Delivered:** migration `084_platform_page_versions.sql` (`pd_platform_page_version`, mirroring the store table
minus `store_id`) + `GET /:id/versions`, `POST /:id/versions/:versionId/restore`, `POST /:id/preview`
(admin-guarded, in `platform-cms.route.ts`) + publish-time version snapshots with 20-version retention inside
`updatePage` + slug-bound signed preview tokens (`platform_page_preview` type) resolved publicly at
`GET /slug/:slug/preview?pb_preview=…`. The hub CMS page accepts `?pb_preview=` and renders drafts through
`SafePageRenderer`; the platform editor's preview path was corrected from the cloned `/store/<host>/pages/…`
to `/hub/pages/<slug>`. Restore re-sanitizes content on the way back in.

---

## M2 · Platform CMS HTML/CSS sanitization

Sanitizers exist for store pages (`page-builder.service.ts:92-203`) and are never applied to platform pages
([P1-5](./03-BUGS-P1-HIGH.md)). **Effort:** S — reuse, do not rewrite. Guide:
[09](./09-IMPLEMENTATION-GUIDES.md#guide-b--platform-cms-sanitization).

---

## M3 ✅ DONE (2026-08-25) — Outbox worker startup

~~Built, tested, never called ([P1-11](./03-BUGS-P1-HIGH.md)).~~ ✅ **Fully resolved 2026-08-25:** worker wired in
`main.ts` (`11ef9d0`) and `FRONTEND_URL=https://www.garbage.team` set on Render via API. Remaining follow-up:
the revalidate-secret hardening ([P2-16](./04-BUGS-P2-MEDIUM.md)).

---

## M4 · Server-authoritative gamified prize engine

The client currently decides its own prize ([P0-1](./02-BUGS-P0-CRITICAL.md)). No prize-config table exists.
**Effort:** M. **Deliverable:** `pd_gamified_prize` table, weighted server-side draw, server-generated coupon codes.
Full migration and service code in [02-BUGS-P0-CRITICAL.md](./02-BUGS-P0-CRITICAL.md#step-3--make-the-server-authoritative-about-the-prize).

---

## M5 · Email delivery

No SMTP config anywhere; password reset and verification are silently inert ([P1-10](./03-BUGS-P1-HIGH.md)).
**Effort:** S — this is configuration plus verifying `nodemailer` is a real backend dependency ([P2-24](./04-BUGS-P2-MEDIUM.md)).

**Steps:**
1. Set `PD_SMTP_HOST`, `PD_SMTP_PORT`, `PD_SMTP_USER`, `PD_SMTP_PASS`, `PD_MAIL_FROM` on Render.
2. Move `nodemailer` from root `package.json` into `backend/dependencies`.
3. Send a real password-reset end to end and confirm receipt.
4. Add the boot-time subsystem log ([E5](./07-ENHANCEMENTS.md)) so "email disabled" is visible.

---

## M6 · A real coupon system

The single largest gap. Five coupons are `if (couponCode === 'PANDA10')` literals in
[`checkout-quote.service.ts:481-506`](file:///c:/tek/pandamarket/backend/src/services/checkout-quote.service.ts#L481-L506):

```ts
if (couponCode === 'CHANCE5DT') { productDiscount = Math.min(subtotal, 5); ... }
else if (couponCode === 'LIVRAISON_ZERO') { ... }
else if (couponCode === 'PANDA10') { productDiscount = roundTnd(subtotal * 0.1); ... }
else if (couponCode === 'SUPER15') { couponRecognized = subtotal >= 80; ... }
else if (couponCode === 'FIDELITE5') { ... }
```

There is **no `pd_coupon` table** — only `pd_ads_coupon` and `pd_ads_coupon_redemption`, which serve the ads
subsystem, not general promotions. There is no admin UI, no expiry, no usage limits, and no per-user caps.

> [!IMPORTANT]
> Every new promotion currently requires a **backend deploy**. There is no expiry, no usage cap, and no audit trail
> of who redeemed what. This becomes the bottleneck on your growth team well before it becomes a bug — the first
> time marketing asks for a time-boxed code with a redemption limit, this design cannot answer.

**Effort:** L. **Deliverable sketch:**

```sql
CREATE TABLE pd_coupon (
  id             VARCHAR(64) PRIMARY KEY,
  store_id       VARCHAR(64) REFERENCES pd_store(id) ON DELETE CASCADE,  -- NULL = platform-wide
  code           VARCHAR(64) NOT NULL,
  discount_type  VARCHAR(16) NOT NULL CHECK (discount_type IN ('percentage','fixed','free_shipping')),
  discount_value NUMERIC(10,3) NOT NULL DEFAULT 0,
  min_subtotal   NUMERIC(10,3) NOT NULL DEFAULT 0,
  max_redemptions        INTEGER,           -- NULL = unlimited
  max_per_user           INTEGER,
  starts_at      TIMESTAMP,
  expires_at     TIMESTAMP,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, code)
);

CREATE TABLE pd_coupon_redemption (
  id          VARCHAR(64) PRIMARY KEY,
  coupon_id   VARCHAR(64) NOT NULL REFERENCES pd_coupon(id) ON DELETE CASCADE,
  user_id     VARCHAR(64),
  order_id    VARCHAR(64),
  redeemed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Then replace the `if`-ladder in `checkout-quote.service.ts` with a single lookup against `pd_coupon` (validating
`is_active`, date window, `min_subtotal`, and redemption counts), keep the `pd_seller_broadcast` fallback, seed the
five existing literals as rows so nothing breaks, and add an admin CRUD UI. This is also where the gamified coupons
from [M4](#m4--server-authoritative-gamified-prize-engine) should be redeemed from — unifying the two closes the
[P0-1](./02-BUGS-P0-CRITICAL.md) future-risk permanently.

---

## M7 · Object storage

S3 unset; images served from Postgres blobs via `main.ts:228-264` fallback. **Deliberately deferred to Cloudflare
R2** — listed here for completeness only, not as a bug. **Effort:** M when undertaken. Until then the DB-blob path
is load-bearing and puts image bandwidth on your database connection ([E14](./07-ENHANCEMENTS.md)).

---

## M8 · Search indexing

Meilisearch unset **by design**. The Postgres path (`productService.searchPublished`) works and is live
(`/api/pd/search?q=shirt` → 200, total 124). The separate broken fallback is [P1-8](./03-BUGS-P1-HIGH.md).
**Effort:** S when Meili is configured — just provisioning + `PD_MEILI_*` env vars; the `search.worker.ts` and
`indexProduct` subscriber already exist.

---

## M9 · Observability

No Sentry DSN, `/metrics` → 404, no dashboards, no alerting. You cannot currently tell if production is broken.
**Effort:** M. **Deliverable:** set `PD_SENTRY_DSN`, set `PD_METRICS_ENABLED=true`, wire one alert on 5xx rate, and
add the boot-time subsystem log ([E5](./07-ENHANCEMENTS.md)) so disabled subsystems are legible.

---

## M10 · `/hub/products` index route

404 live; referenced by two test files. `/hub/search` and `/hub/category/[slug]` cover the underlying need, but
`/hub/products` is the URL a user types. **Effort:** S — add `frontend/src/app/hub/products/page.tsx` that renders
the existing product-grid component with default filters, or redirect to `/hub/search`.

---

## M11 · i18n parity

Locale files are at `frontend/src/i18n/messages/{en,fr,ar}.json` (not `locales/`). Key counts: **EN 3039 · FR 3035
· AR 3033.**

**Missing in FR (11):**
`ads.proof`, `ads.captured`, `ads.pendingReview`, `ads.rejected`, `ads.viewProof`, `ads.refillDesc`,
`sellerLoyalty.searchSubscribers`, `sellerLoyalty.filterAll`, `sellerLoyalty.filterVerified`,
`sellerLoyalty.joinedDate`, `sellerLoyalty.actions`

**Missing in AR (6):**
`ads.proof`, `ads.captured`, `ads.pendingReview`, `ads.rejected`, `ads.viewProof`, `ads.refillDesc`

**Orphaned in FR (7)** — present in FR, absent in EN, so they drifted:
`sellerLoyalty.subtitle`, `.newThisWeek`, `.verifiedBuyers`, `.growthRate`, `.governoratesDistribution`,
`.searchPlaceholder`, `.verifiedOnly`

**Effort:** S. Fill the 17 missing keys, remove the 7 orphaned FR keys, and add a parity test that fails CI when the
three files' key sets diverge ([E2](./07-ENHANCEMENTS.md) family).

---

## M12 · ai-tagger worker

[`ai-tagger.worker.ts`](file:///c:/tek/pandamarket/backend/src/workers/ai-tagger.worker.ts) exports
`startAiTaggerWorker` and is never started ([P1-11](./03-BUGS-P1-HIGH.md) neighbour). **Effort:** XS — a decision,
not a build: wire it into `main.ts` alongside the outbox worker if wanted, or delete it. Note it is inert regardless
until an AI key is configured ([P1-10](./03-BUGS-P1-HIGH.md)).

---

## M13 · Separate worker process

Runners exist in `backend/package.json` (`worker:ai`, `worker:email`, `worker:payment-reconciliation`), but there
is no Render worker service ([P2-17](./04-BUGS-P2-MEDIUM.md)). **Effort:** M — add a Render background worker
service, set `PD_RUN_WORKERS_IN_PROCESS=false` on web, move the three timers into the worker process.

---

## M14 · Playwright E2E in CI

`frontend/playwright-report/` exists, so E2E has been run locally; it is not gitignored ([P3](./05-BUGS-P3-HYGIENE.md))
and not in CI. **Effort:** M. There is a purpose-built asset for exactly this next step: the `testing-onboarding`
skill in `.agents/skills/`, which covers seller onboarding, dashboard welcome dismissal, store-basics persistence,
theme selection, and KYC end-to-end. Wire those into CI as the first E2E gate.
