# 06 · Missing Work

[← Index](./00-README.md) · Prev: [05 P2 Medium](./05-BUGS-P2-MEDIUM.md) · Next: [07 Enhancements](./07-ENHANCEMENTS.md)

**Scope:** Capabilities promised by the PRD and functional specifications that are not yet built. 18 items (M-01 through M-18).

| # | Item | Scope & Impact | Target Sprint |
| --- | --- | --- | --- |
| [M-01](#m-01) | Email delivery | Brevo HTTP API integration; unblocks resets, orders, KYC | Tier 1 |
| [M-02](#m-02) | Object storage | S3 → Cloudflare R2 migration; offloads 547 blobs from Postgres | Tier 3 |
| [M-03](#m-03) | Meilisearch | Search query path routing through `searchService` | Tier 3 |
| [M-04](#m-04) | A real coupon system | `pd_coupon` + `pd_coupon_redemption`; retirement of literals | Tier 2 |
| [M-05](#m-05) | Withdrawal approval workflow | `pd_withdrawal_request`; admin approval queue with typed confirmation | Tier 2 |
| [M-06](#m-06) | Refund execution | Real gateway refund dispatch, wallet debits, commission reversals | Tier 2 |
| [M-07](#m-07) | Admin vs SuperAdmin capability model | Granular `requireCapability` middleware across destructive routes | Tier 2 |
| [M-08](#m-08) | Order detail route for seller dashboard | Dedicated `/hub/dashboard/orders/[id]` or deep-linkable drawer | Tier 2 |
| [M-09](#m-09) | Phone/OTP verification wiring | Connect `verification.route.ts` to KYC seller UI | Tier 3 |
| [M-10](#m-10) | Digital products and license keys | End-to-end testing and inventory management console | Tier 3 |
| [M-11](#m-11) | Worker process split | Dedicated worker container; isolate BullMQ from web process | Tier 3 |
| [M-12](#m-12) | Platform CMS content | Author legal pages (Terms, Privacy, Refund, Help) | Tier 3 |
| [M-13](#m-13) | White Label (Platinum plan) | Implement storefront branding suppression | Tier 3 |
| [M-14](#m-14) | Vendor API scope enforcement | Wire `read:customers` scope enforcement | Tier 3 |
| [M-15](#m-15) | Sentry alert rules + observability | Configure alert rules, DLQ size, pool metrics, Redis fail-open alerts | Tier 2 |
| [M-16](#m-16) | Plan catalogue reconciliation | Reconcile `PLAN_DEFAULTS` ↔ DB ↔ `business-model.md` | Tier 3 |
| [M-17](#m-17) | Data retention and cleanup jobs | Scheduled purges for tokens, audit log, system log, churn transactions | Tier 3 |
| [M-18](#m-18) | Stuck-job and orphan-state reapers | AI lease timeouts, payment_required auto-cancellation, unpaid alert | Tier 2 |

---

## PART 2 — MISSING WORK

Ordered by how much of the product proposition is blocked.

---

### M-01 · Email delivery (blocks password reset, order confirmation, KYC result, everything)
**Status:** `PD_SMTP_*` and `PD_MAIL_FROM` are **not set on Render** (verified — only 16 env vars exist and none are SMTP). `email.worker.ts:618-644` correctly fails loudly with `email_not_delivered` in production rather than lying. Known blocker: Render's trial plan blocks outbound SMTP ports.

**How to finish**
1. Use an HTTP-API provider instead of SMTP — the code already supports `email_transport: 'brevo_api'` with `brevo_api_key` (`admin/smtp-config.routes.ts:28-29`). Brevo, Resend and Postmark all have free tiers and HTTP APIs that work on Render's trial.
2. Configure it through the standalone `/smtp-config` admin page (**not** the Settings→Email tab — see B-74, which would clobber it).
3. Fix B-49 (HTML escaping) before sending anything with vendor-controlled variables.
4. Send a real password reset end to end, and a real order confirmation once B-02 is fixed.
5. Add a delivery-outcome metric and an alert on `email_not_delivered > 0`.

---

### M-02 · Object storage (S3 → Cloudflare R2)
**Status:** deferred by you. Current state: `PD_S3_*` unset, so `publicBaseUrl` defaults to the relative path `/pd-product-images`, and `files.route.ts` + `main.ts:260-298` persist every upload into `pd_file_blobs` as a Postgres `bytea` column. Live: **547 blobs, 34 MB, the largest table in a 101 MB database**. Every cache miss after a deploy triggers a DB read + a disk write + possible `sharp` re-encode.

**How to finish (when you're ready)**
1. Create the R2 bucket + API token; set `PD_S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com`, `PD_S3_ACCESS_KEY`, `PD_S3_SECRET_KEY`, `PD_S3_FORCE_PATH_STYLE=false`, `PD_S3_REGION=auto`, `PD_S3_PUBLIC_BASE_URL=https://cdn.<domain>`.
2. Write a one-shot migration script that streams `pd_file_blobs` → R2 and rewrites `pd_file_asset.url`, then drop the blob restore middleware at `main.ts:262-298`.
3. Fix B-52 (presigned size limits) in the same pass — R2 supports presigned POST with `content-length-range`.
4. Add `*.r2.cloudflarestorage.com` (already in the CSP `imgSrc` at `main.ts:165`) and the CDN host to `next.config.ts` `remotePatterns`.
5. Keep the `pd_file_blobs` table read-only for a rollback window, then drop it.

---

### M-03 · Meilisearch
**Status:** deferred by you. Note the finding that matters regardless of when you configure it: **the search query path never calls `searchService`** (B-77). Enabling Meili today would change nothing user-visible — it would index products that nothing queries. Decide the architecture before provisioning.

---

### M-04 · A real coupon system
**Status:** five hardcoded literals in `checkout-quote.service.ts:481-506`, duplicated in three other places (B-11), plus a `pd_seller_broadcast` lookup. The gamified spin mints `SPIN-XXXXXX` codes into `pd_gamified_lead` that **no redemption path reads** — they are decorative. Admin Settings has a "Gamified prizes" editor (`settings/page.tsx:1543-1585`) configuring prizes that the server-authoritative catalog (`cart.service.ts:59-64`) ignores.

**How to finish**
1. `pd_coupon`: `code` (unique, uppercase), `type` (`percentage|fixed|free_shipping`), `value`, `scope` (`order|store|product|category`), `store_id?`, `min_subtotal`, `max_discount`, `starts_at`, `expires_at`, `max_redemptions`, `max_per_customer`, `is_active`.
2. `pd_coupon_redemption`: `coupon_id`, `order_id` (unique together), `customer_id|storefront_customer_id`, `amount`, `redeemed_at`.
3. Resolve in `checkout-quote.service.calculateTotals` only; consume in `orderService.checkout` inside the transaction with a `FOR UPDATE` on the coupon row so `max_redemptions` can't be raced.
4. Migrate the 5 literals as seeded rows; point the gamified draw at `pd_coupon` so spin codes become real; make the admin prize editor the source of the catalog.
5. Delete the client-side and `cart.service.ts` coupon logic.

---

### M-05 · Withdrawal / payout approval workflow
**Status:** none (B-18). Business-model §3.2 specifies 7-day (Flouci/Konnect), 14-day (Mandat) and delivery-confirmed (COD) retention, plus a vendor choice between automatic and on-demand payout. Live wallets sit at `retention_days = 2` for 6 of 7 stores.

**How to finish**
1. `pd_withdrawal_request`: `store_id`, `amount`, `status` (`requested|approved|rejected|paid|failed`), `requested_by`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `payout_reference`, `idempotency_key` (unique).
2. Vendor `POST /wallet/me/withdrawals` creates a `requested` row and moves funds to a `reserved` bucket (so the balance can't be double-spent while pending).
3. Admin queue with approve/reject + typed confirmation; approval debits the wallet and writes the ledger row inside one transaction keyed by `idempotency_key`.
4. Rename the current admin page "Payout Ledger" and add the new queue beside it.
5. Implement per-gateway retention properly and stop `sync-retention` from flattening it.

---

### M-06 · Refund execution
See B-19. This is the single largest gap in the money flow: a seller can *request* a refund and nothing happens.

---

### M-07 · Admin vs SuperAdmin capability model
`requireSuperAdmin` exists and is used **zero times**. The only granularity attempt (the finance/security section guard) is bypassable (B-05). Actions that should require SuperAdmin but require only Admin: plan deletion (mass-reassigns live stores), audit-log purge, system-log clear, owner suspend / reset-2FA / clear-payment-config / clear-domain, `wallets/sync-retention`, bulk subscription-intent delete, `webhook-resolver`.

**How to finish:** define capabilities (`audit.purge`, `plans.delete`, `secrets.manage`, `wallet.admin`, `user.security`, `settings.finance`, `settings.security`), a `requireCapability(cap)` middleware resolving from role, apply it to those routes, and mirror it in the admin UI (which currently hardcodes the "Superadmin" badge and an `A` avatar for everyone).

---

### M-08 · Order detail route for the seller dashboard
`dashboard/page.tsx:645` links every recent order to `/hub/dashboard/orders/${order.id}` — a route that does not exist. Order detail is a drawer inside the 4,214-line list page. Either add `orders/[id]/page.tsx` or link to `?order=<id>` and have the list open the drawer from the param.

---

### M-09 · Phone/OTP verification wiring
`verification.route.ts:51-81` implements send/verify OTP. No UI calls them. `Verification.phone_verified` is displayed but can never become true. Depends on M-01/B-17 for actual delivery. PRD §F9.1 lists phone verification as a P0 KYC step.

---

### M-10 · Digital products and license keys
The schema, assignment logic (`order.subscriber.ts:268-324`, correctly using `FOR UPDATE SKIP LOCKED`), expiring download links and the account Downloads page all exist. Live: `pd_license_key` 0 rows, `pd_digital_download` 0 rows. PRD §F5.1 P1. Untested end to end — needs a seeded serial product and a full purchase→download run.

---

### M-11 · Worker process split
`PD_RUN_WORKERS_IN_PROCESS` defaults to `true` (`config.ts:84`) and is unset on Render, so every web instance runs 10 BullMQ workers + the outbox poller + the ads timer + the reminder sweep. The `*-runner.ts` entrypoints exist. Blocked on a paid Render plan. Note that B-22, B-24 and B-43 all get **worse** at 2 instances and B-02's in-process bus breaks **entirely** once workers are separate — fix the outbox path first.

---

### M-12 · Platform CMS content
0 rows in `pd_platform_page`. `/hub/pages/about` → 404 live. The versioning/restore/preview backend was built in the prior audit round; nothing has been authored. Also fix B-66 (no navbar/footer) before publishing anything.

---

### M-13 · White Label (Platinum plan)
`has_white_label` exists in `PLAN_DEFAULTS` and `pd_subscription_limits`. Grep across the codebase: it is read **nowhere**. The Platinum tier's headline differentiator (business-model §4) is unimplemented.

---

### M-14 · Vendor API scope enforcement
`read:customers` is offered in the UI and exists as `ApiKeyScope.ReadCustomers`, but no `/api/pd/vendor/*` endpoint checks it — only products and orders are scoped. A key created with that scope grants nothing.

---

### M-15 · Sentry alert rule + observability gaps
`PD_SENTRY_DSN` is set and the pipeline is verified, but there is **no alert rule** (a 2-click UI task the legacy API rejected). Not instrumented at all: queue depth / wait time / failed-job counts / DLQ size for any of the 10 queues (despite the `metrics.ts` header comment claiming otherwise); outbox lag and `failed` count; DB pool saturation and the slow-query counter that `pool.ts:52-54` already computes as a log line; Redis fail-open counters (so a Redis outage silently disabling rate limiting and login lockout is invisible); email delivery outcomes; auth security signals (failed logins, lockouts, `2fa_disabled`, refresh reuse, webhook auto-disable, `pd_ads_blocked_ip` insertions).

---

### M-16 · Plan catalogue divergence from the business model
| Plan | Doc price | DB price | Doc max products | DB max products |
| --- | --- | --- | --- | --- |
| Starter | 300 | **168** | 50 | 50 |
| Regular | 600 | **326** | 100 | 100 |
| Agency | 1200 | **790** | 300 | **250** |
| Pro | 2400 | **1860** | ∞ | **650** |
| Golden | 4800 | **3470** | ∞ | **1600** |
| Platinum | 9600 | **7140** | ∞ | **5000** |

`utils/plans.ts` `PLAN_DEFAULTS` still carries the doc values (300/600/1200/2400/4800/9600, `-1` for unlimited) while the DB carries the current ones. `PLAN_DEFAULTS` is documented as "fallbacks" but is a divergent second source of truth. Decide which is canonical, update the other, and update `business-model.md`.

---

### M-17 · Data retention and cleanup jobs
Nothing prunes: 1,281 expired refresh tokens, 3,779 audit-log rows, 733 system-log rows, 60,368 ads transactions (B-24), 392 analytics events, 81 cart rows (0 marked abandoned despite an `is_abandoned` column and an abandoned-cart concept). Add scheduled purges with configurable windows and an admin-visible summary.

---

### M-18 · Stuck-job and orphan-state reapers
11 stuck AI jobs (10 queued since May, 1 processing since Aug 18). 12 orders stuck `payment_required` since August. 2 orders `fulfilled` with `payment_status='pending'` (one for 342,954 TND). No reaper for any of them. Add: AI `processing` lease timeout, `payment_required` expiry → cancel + restock (`cancelUnstartedPaymentOrder` already exists and is well written — it just isn't scheduled), and an admin alert on fulfilled-but-unpaid orders.

---
