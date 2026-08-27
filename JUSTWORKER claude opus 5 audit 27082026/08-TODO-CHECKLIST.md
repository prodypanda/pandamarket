# 08 · Master Actionable TODO Checklist

[← Index](./00-README.md) · Prev: [07 Enhancements](./07-ENHANCEMENTS.md) · Next: [09 Guides](./09-IMPLEMENTATION-GUIDES.md)

**Tracking Standard:** Mark items `[x]` with commit hash when executed.
**Effort / Complexity Index:** ⚡ = Quick win (<1 hour). 🛠 = Engineering task (1–3 hours). 🏗 = Architectural feature (>3 hours).

## PART 4 — TODO CHECKLIST

Ordered by **risk removed ÷ effort**. ⚡ = under an hour.

### Tier 0 — before the next push

- [ ] ⚡ **B-00** Add the missing `retentionRouter` import to `main.ts`; apply `rewardsLeadSchema`; switch `GamifiedRewardsWidget` to `fetchWithCsrf`. Verify `npm run type-check -w backend` is clean.
- [ ] ⚡ **B-90** Fix the failing `admin-ads-page.test.tsx` assertion (CI blocks on it).
- [ ] ⚡ **B-06** Delete the duplicate `/buyers/:id/suspend|reactivate` pair from `reports.routes.ts`.
- [ ] ⚡ **B-07** Remove `SELECT DISTINCT` in `getBundlesContainingProduct`; use `GROUP BY p.id`. Verify the live 500 clears.
- [ ] **B-01** Add a `type:'storefront'` claim; reject it in `requireAuth`; reject its absence in `requireStorefrontCustomer`; resolve socket rooms from the DB; require Vendor role on the chat store-branch ACL.
- [ ] **B-03** Delete the `mock_token` branch; stop returning the raw token; remove the `startsWith('pd-verify-')` clause; gate `PUT /me/domain` on a verified `pd_store_domain` row + plan; drop the `isDomainTlsAllowed` legacy fallback.
- [ ] **B-04** Remove the balance mutation from `checkAndTriggerAutoRefill`; reject `auto_refill_enabled=true` until a real charge path exists.
- [ ] **B-05** Move the section ACL into `platformConfigService.updateSettings`; delete `PUT /admin/settings`; add an `ads` section.
- [ ] ⚡ **B-20** Gate `/metrics` behind a token or a private port; add an internal-secret header to `/internal/tls-allowed` and drop `store_id` from the response.

### Tier 1 — this week

- [ ] **B-02** Emit `ORDER_PLACED`, `PAYMENT_CAPTURED`, `ORDER_FULFILLED`, `ORDER_DELIVERED`, `ORDER_CANCELLED`, `PRODUCT_CREATED`, `KYC_APPROVED`, `KYC_REJECTED`. Add the emitter-coverage test (**E-06**).
- [ ] ⚡ **B-08** Central escaped `<JsonLd>` component; validate the colour setting.
- [ ] ⚡ **B-10** Verify payment status on the success page; fix the dead CTA; add `noindex`.
- [ ] ⚡ **B-12a** Onboarding logo → `purpose:'store_asset'`, `folder:'branding'`.
- [ ] ⚡ **B-12b** Onboarding shipping fee → `PUT /me/settings`.
- [ ] ⚡ **B-12c** Publish toggle → compare `'verified'`.
- [ ] **B-12d** KYC step completes only on `approved`; gate step navigation; one shared progress helper.
- [ ] ⚡ **B-15** Add the four `mandat_bank_*` / `mandat_recipient_phone` keys to the `finance` section + schema + UI.
- [ ] ⚡ **B-16** Add the 13 image keys to `SETTINGS_TAB_KEYS.operations`. Add the parity test (**E-04**).
- [ ] ⚡ **B-14** Fix the commission-rate percent/fraction ambiguity; add boundary tests.
- [ ] **B-09** Distinguish "missing" from "error" in all four server-fetch pages; `throw` on error; `noindex` on soft-404.
- [ ] ⚡ **B-25** Add the `isPublicStore` gate to storefront `products` and `products/[...segments]`.
- [ ] ⚡ **B-26a** Route storefront 401 retries to `/storefront/auth/refresh`.
- [ ] ⚡ **B-26b** Stop returning `verify_token` from storefront register.
- [ ] ⚡ **B-68** Fix the wishlist `/auth/login` 404.
- [ ] **B-11** Drive both cart pages from `POST /cart/quote`; delete the client and `cart.service.ts` coupon logic.
- [ ] **B-13** Fetch plan limits in the dashboard layout; gate AI, themes, domains, API keys in the UI.
- [ ] ⚡ **B-28** Check `res.ok` on the three image-write helpers; surface quota errors.
- [ ] **B-21** Restrict Sentry request capture and scrub `data`/`cookies`; ship the Supabase CA and set `rejectUnauthorized:true`.
- [ ] **B-17** Implement the `whatsapp_gateway` SMS provider; stop logging the OTP; throw in production on `console`.
- [ ] **M-01** Configure Brevo (or Resend) HTTP API via `/smtp-config`; fix **B-49** escaping first; send a real reset + order confirmation.
- [ ] ⚡ **B-27** Swap `sanitizeHtmlInitial` for `isomorphic-dompurify`; decode entities before URL checks.
- [ ] ⚡ **B-59** Persist the suspension reason; add zod to `PUT /vendors/:id/suspend`.
- [ ] ⚡ **B-61** Fix the `\n` in the audit-log CSV export.
- [ ] **B-24** Move the ads lifecycle sweep to a locked BullMQ repeatable job with incremental reconciliation; then archive the 60,337 churn rows.

### Tier 2 — this month

- [ ] **B-22** Atomic outbox claim (`FOR UPDATE SKIP LOCKED` + `RETURNING`), `claimed_at` lease + reaper, throw on failed revalidation, DLQ view + alert.
- [ ] **B-23** Server-derived session hash + `event_key`; validated client IP for `ipHash`; expiring blocklist entries; enforce a minimum bid.
- [ ] **B-43** Split the Redis connections (per Worker / Queues / app).
- [ ] **B-44** Fix rate-limit key derivation; bounded memory fallback; fail closed on login.
- [ ] **B-45 / B-46 / B-47** 2FA attempt limit + stronger recovery codes + TOTP replay guard + password on enrol/disable; access-token revocation check incl. `/socket-token`; refresh-reuse detection.
- [ ] **B-29** Server-side product filters + real export endpoints; drive all charts from the analytics service.
- [ ] **B-30** Paginate `/me/media` and the admin twin; persist image dimensions at upload.
- [ ] **B-31** Logical-property RTL in the dashboard shell; `lang`/`dir` server-side; translate `products` and `onboarding`.
- [ ] **B-32** Remove or ground every simulated number; branch on `email_sent`; delete the fake card form and magic-link button.
- [ ] **B-33** Renumber the 12 duplicate migration prefixes; resolve `047_…aliexpress_taxonomy.sql`; fail the preflight on *new* collisions.
- [ ] ⚡ **B-35** Index the 7 remaining FKs. ⚡ **B-36** Enable RLS on the 5 `admin_note*` tables.
- [ ] **B-37 / B-38 / M-18** Reserve AI credits before the call; add a stuck-job reaper; one consumer per queue; schedule `cancelUnstartedPaymentOrder`; alert on fulfilled-but-unpaid.
- [ ] **B-39 / B-40 / B-41 / B-42** Per-subscription webhook jobs + timestamped signatures + encrypted secrets; targeted payout notifications + payout idempotency; paginated digest with `jobId`; deduped expiry warnings; Redis-backed plan-limit cache.
- [ ] **B-50 / B-53 / B-54** Exact-prefix CSRF exemptions; support-attachment visibility; chat limit caching + GIN index + explicit query build.
- [ ] **B-55** Ownership-scope the storefront revalidate route.
- [ ] **B-56 / B-57 / B-58** Validate theme customization; project preview data; `draft_title`/`draft_slug`; gate public page-builder reads on plan + status; throttle page analytics.
- [ ] **B-60** Zod on all ~12 unvalidated admin endpoints; SuperAdmin + strict schema on `webhook-resolver`.
- [ ] **B-65 / B-66 / B-67** Server-shell hub search with URL-synced state; fix `hub/pages/[slug]` caching + chrome; add `loading.tsx` and parallel homepage fetches.
- [ ] **M-04** Build `pd_coupon` + `pd_coupon_redemption`; retire the five literals; make spin codes redeemable.
- [ ] **M-05** Withdrawal request/approval workflow + per-gateway retention.
- [ ] **M-06** Refund execution: gateway call, wallet debit, commission reversal, optional restock.
- [ ] **M-07** Capability model; apply `requireSuperAdmin`/`requireCapability` to the 8 destructive route groups.
- [ ] ⚡ **M-08** Order detail route or `?order=` deep link.
- [ ] **M-15** Sentry alert rule; queue/outbox/pool/Redis/email/auth metrics.

### Tier 3 — backlog

- [ ] **E-01** Make the outbox the only fan-out mechanism (do this *before* M-11).
- [ ] **M-11** Split workers onto their own Render service; `PD_RUN_WORKERS_IN_PROCESS=false` on web; remove the keep-alive self-ping.
- [ ] **M-02** Migrate `pd_file_blobs` → Cloudflare R2; add presigned size limits; drop the blob restore middleware.
- [ ] **M-03** Decide the search architecture (**B-77**) before provisioning Meilisearch.
- [ ] **M-09** Wire phone OTP into the KYC UI.
- [ ] **M-10** End-to-end test digital products + license keys.
- [ ] **M-12** Author platform CMS pages; add hub chrome first.
- [ ] **M-13** Implement White Label. **M-14** Enforce or remove `read:customers`.
- [ ] **M-16** Reconcile `PLAN_DEFAULTS` ↔ DB ↔ `business-model.md`.
- [ ] **M-17** Retention/purge jobs for tokens, audit log, system log, ads transactions, analytics events, carts.
- [ ] **E-02** Generate a typed API client; retire the 394 hand-written call sites.
- [ ] **E-03** Split `analytics.service.ts`, `products/page.tsx`, `(admin)/settings/page.tsx`.
- [ ] **E-05 / E-07 / E-08** Route-manifest test; tenant-isolation suite; blocking E2E across all 15 specs.
- [ ] **B-74** Consolidate the duplicate wallet / domains / themes / SMTP surfaces; fix the Brevo-clobber.
- [ ] **B-79 / B-78** Split the product drawer; server-side bulk fulfilment.
- [ ] **B-81** Integer minor units for all money math with explicit residual allocation.
- [ ] **B-85 / B-88 / B-64** Delete duplicate robots/sitemap handlers; add PDP + category JSON-LD; fix tracking-param `noindex`.
- [ ] **B-92** `git rm` root scratch files incl. `h -c git diff --stat 2?&1`; remove `.gitlab-ci.yml`; dedupe `eslint-fe.json`.
- [ ] ⚡ **E-07** Rotate `PD_JWT_SECRET` (35 chars) and `PD_COOKIE_SECRET` (38 chars) to 64 chars during pre-launch rotation.
- [ ] **E-11 → E-35** Product and platform enhancements, prioritised against your roadmap.

---
