# M-07 to M-18 · Platform Features & Operations
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
