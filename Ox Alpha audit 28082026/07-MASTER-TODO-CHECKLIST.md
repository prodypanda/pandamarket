# 07 — Master TODO Checklist (working document)

> Ordered by **risk removed ÷ effort spent**. ⚡ = under ~1 hour. Mark `[x]` + bold commit hash when done, then update the progress table at the bottom.
> Links: `[P0-x]` → 01 · `[P1-x]` → 02 · `[P2-x]` → 03 · `[MW-x]` → 04 · `[E-x]` → 06 · `[AI-x]` → 09 · `[CMS-x]` → 10 · `[STF-x]` → 11 · `[SET-x]` → 12 · ideas → 13. Step-by-step guides for Phase 0/1 in [08-IMPLEMENTATION-GUIDES.md](./08-IMPLEMENTATION-GUIDES.md).

---

## Tier 0 — Money & security (this week) 🔴

- [ ] Emit `PAYMENT_CAPTURED` in webhook capture path + reconciliation sweep; regression test asserting wallet credit — [P0-1] *(Guide 1)*
- [ ] Route storefront receipt review through `markPaidInTransaction` + gateway/state checks + re-upload-after-reject — [P0-2] *(Guide 2)*
- [ ] Route COD delivery capture through same pipeline with COD retention rule — [P0-3] *(Guide 3)*
- [ ] ⚡ `npm install nodemailer -w backend` + smoke check — [P0-4]
- [ ] Enforce webhook HMAC in all envs; add `PD_FLOUCI_WEBHOOK_SECRET` / `PD_KONNECT_WEBHOOK_SECRET` config; test-mode only behind explicit flag — [P0-5] *(Guide 5)*
- [ ] Untrack `env-vars.json`, purge history (coordinate parallel agents), add gitleaks CI — [P0-6] *(Guide 6)*
- [ ] ⚡ Sanitize the two AI HTML XSS sinks (+ grep sweep for other sinks) — [P0-7] / [AI-S1] [AI-S2] *(Guide 7)*
- [ ] 🔴 **Gate premium theme purchase behind real payment** — any seller currently obtains 615 TND of themes free — [STF-P1]
- [ ] 🔴 **Remove the free-AI swallow** (`canDeductTokens`) — unlimited platform-cost AI, ×50 via batch — [AI-1]
- [ ] 🔴 Stop charging credits for failed photo-studio calls; delete the Unsplash stock fallback — [AI-3]
- [ ] 🔴 Apply existing `utils/ssrf.ts` to AI image URLs (3 schemas + worker loader) — [AI-S5]
- [ ] 🔴 Add AI rate limiting; make `/category-pick-batch` async — ~5,000 provider calls/min reachable today — [AI-S8]
- [ ] 🔴 Never auto-apply fallback/low-confidence categories to products — [AI-20]
- [ ] Entitlement check in `publishThemeDraft` + blacklist theme keys in `updateSettings` — [STF-P3]
- [ ] ⚡ CSRF skip-list exact-match fix — [P1-15] *(Guide 8)*
- [ ] ⚡ Remove AI-key plaintext fallback (throw + needs_reinput flag) — [P1-17] / [AI-S4]
- [ ] Mandat upload/approve gateway enforcement — [P1-6]
- [ ] Prompt-injection hardening + output ID validation before any DB write — [AI-S3]

## Tier 1 — Correctness (next 2 weeks) 🟠

### Platform
- [ ] Config hygiene: single backend-base module; remove hardcoded prod URL fallback + 48× localhost fallbacks; ESLint ban on literals — [P1-19] *(Guide 9)*
- [ ] Socket auth lifecycle: token refetch on login/refresh, reconnect on expiry, disconnect on logout — [P1-2][P1-3]
- [ ] Server-authoritative coupons: build minimal `pd_coupon` validation in checkout-quote service; client displays only server discounts — [P1-4]
- [ ] Buyer-facing shipping rates endpoint consumed by cart UIs; delete constants — [P1-5]
- [ ] Wallet retention per-txn metadata (stop clobbering default) — [P1-9]
- [ ] KYC phone OTP binding — [P1-10]
- [ ] Subscription warning dedup per threshold — [P1-11]
- [ ] `requireStore` explicit selection for multi-store vendors — [P1-12]
- [ ] Session-version Redis check on sensitive routes — [P1-13]
- [ ] SSR locale/dir resolution (kills AR LTR flash) — [P2-1]
- [ ] Docker: set `output:'standalone'` and verify, or retire frontend Dockerfile — [P1-1]
- [ ] Revalidate hostname scoping + timing-safe compare — [P1-20]
- [ ] Migration prefix cleanup + delete placeholder 047 — [P1-21]
- [ ] DB TLS pinned CA — [P1-16]
- [ ] metadataBase/base-URL prod guards — [P1-18]
- [ ] Rate-limit proxy contract assertion — [P1-14]

### AI billing & correctness
- [ ] Reserve→settle credit protocol + idempotency keys (incl. `buy-tokens`) — [AI-14][AI-M6]
- [ ] Create job rows for photo studio / batch / tagging; add type CHECK; migrate mislabeled rows — [AI-6][AI-7][AI-M7]
- [ ] Record real provider usage + cost (`prompt_tokens`, `completion_tokens`, `model`, `provider_cost`) — replaces the `×0.005` guess — [AI §6]
- [ ] Fix seller credit-balance mapping (`ai_tokens`) — [AI-2]
- [ ] `generateSeo` zod validation — [AI-4]; Claude max_tokens per provider — [AI-10]; provider capability filter — [AI-12]; wire/delete `config.openai` — [AI-11]
- [ ] Decide tagger worker: delete or own queue — [AI-5] (closes prior-audit M12)
- [ ] Stop prompt re-seeding on read; move seeds to migrations; remove runtime DDL; remove writes-on-GET — [AI-8][AI-15][AI-16]
- [ ] Always persist `input_meta` on failure — [AI-13]; per-feature plan flags — [AI-17]; DELETE plan check — [AI-18]; `/jobs/:id` error contract — [AI-19]; single `page_copy` price — [AI-9]
- [ ] Stuck-job sweeper + exclude unfinished jobs from latency metrics
- [ ] Restrict AI job inspection to superadmin or redact `input_meta` — [AI-S6]; zod on admin AI writes — [AI-S9]

### Marketplace pages (makes the feature usable — half a day)
- [ ] ⚡ Add `/cms` to admin sidebar + dashboard Quick Jump + i18n keys — [CMS-1]
- [ ] ⚡ Swap both CMS pages to `fetchWithCsrf` + explicit error state — [CMS-2]
- [ ] `validate()` middleware + unique-violation → 409 on slug — [CMS-3]
- [ ] ⚡ Fix platform media endpoint path — [CMS-6]; guard store fetches + hide AI panel — [CMS-11][CMS-12]; fix social-preview URL — [CMS-13]; normalize PUT contract — [CMS-8]
- [ ] Migration: SEO columns + `draft_*` + `published_at`; extend zod + SET list; public metadata reads real columns — [CMS-4][CMS-5][CMS-M2][CMS-M3]
- [ ] Restore-into-draft + full snapshot columns — [CMS-9]
- [ ] Platform cache tags + revalidate branch — [CMS-7]

### Storefront templates (make advertised options real)
- [ ] `onChange` on `ThemeCustomizer`; fix stale preview + `isDirty` — [STF-1][STF-2]
- [ ] Theme gallery: prices, locks, purchase CTA from `/themes` + `/purchases/mine` — [STF-P2]; consolidate the 3 theme-change surfaces
- [ ] Wrap all 20 grids in `ThemeLayout`; delete hardcoded `max-w-*` — [STF-3][STF-4]
- [ ] Shared `filterStoreProducts`; move category filtering to URL/server — [STF-5][STF-6]
- [ ] Mount loading provider on `/products`; remove duplicate paginator — [STF-7]
- [ ] Implement or delete dead customization fields (radius, headerStyle, productGrid, `theme.colors`, headingFont) — [STF §4]

### Settings (data safety)
- [ ] Add the 13 `image_size_*` keys to tab list + zod (currently unsavable) — [SET-B1]
- [ ] Make section key ownership disjoint (fixes cross-tab 409) — [SET-B2]
- [ ] Fix Email save clobbering `email_transport` → Brevo platforms break — [SET-B4]
- [ ] Per-field validation errors instead of silent coercion — [SET-B6][SET-B7]
- [ ] Mask PayPal secrets — [SET §6]
- [ ] ⚡ Add the 4 orphan mandat/bank keys to the UI — [SET §3.1]
- [ ] Decide authorization: superadmin-gate maintenance/commerce/operations — [SET-B12]
- [ ] Route-change unsaved-changes interception — [SET AS-02 remainder]

## Tier 2 — Platform completion (this month) 🟡

### Payments & email
- [ ] SMTP live (Brevo HTTP first if ports blocked) + password-reset E2E — [MW-1]
- [ ] Real Flouci/Konnect creds; remove sandbox hatch; confirm webhook signing — [MW-2] *(then run the "money drill" from 06-C10)*
- [ ] `pd_payout` entity + migration + wallet-debit linkage — [P2-13]
- [ ] Admin payout approvals screen — [MW-4]
- [ ] Email verification flow — [MW-5]

### Buyer
- [ ] Guest checkout (hub + storefront) — [MW-10]
- [ ] Order-tracking timeline UI — [MW-11]
- [ ] Merge `/hub/account` + `/hub/profile` — [MW-12]

### Seller
- [ ] Onboarding wizard steps 2–7 + coachmarks — [MW-16]
- [ ] Serial-key pool visibility + refund/reissue workflow — [MW-17]

### Admin/platform
- [ ] Marketplace-order fraud queue — [MW-20]
- [ ] Settings data-loss guards batch + deduplication pass — [MW-21] / [SET §2]
- [ ] **Seed the 9 legal/standard marketplace pages + repoint the 6 settings URLs + CMS-slug dropdown** — [CMS §5]
- [ ] i18n sweep phase 1: buyer-facing surfaces (checkout/orders/auth) — [P2-2 partial]

### Storefront (the real "missing template work")
- [ ] Sections library (testimonials/newsletter/banner/trust/collections/FAQ) + ordered `sections` in customization, wired into all 20 — [STF-M1] / idea 13-§3.1
- [ ] Hero content model (image/video/title/subtitle/CTA) + customizer controls — [STF-M2][STF-M3]
- [ ] Shared `ThemeProductCard` (badge/wishlist/quick-add/rating) — [STF-M5]
- [ ] Theme-ize cart/checkout/account/404/500 — [STF-M6]
- [ ] Render `mobile`/`utility` menus + nested drawer items — [STF-M8]
- [ ] Preserve theme shell when page-builder homepage exists — [STF INC-9]

### Infra
- [ ] Worker split to separate service (needs paid plan); then remove self-ping — [MW-41]
- [ ] Object storage: real S3 now or R2 migration plan — [MW-43]
- [ ] Meilisearch provisioning *(owner-scheduled)* — [MW-42]
- [ ] Sentry alert rule (UI task) — [MW-45]
- [ ] E2E CI blocking after first green — [MW-44]

## Tier 3 — Quality debt & hardening

- [ ] Payment-capture/receipt-review/COD test suites — [MW-51]
- [ ] AI test suites: `credits.service`, 22-endpoint supertest, worker registration, prompt-injection, SSRF, frontend AI — [AI §7]
- [ ] Settings invariant + route + parity test suites — [SET §8]
- [ ] CMS service/route/component/e2e/migration-parity tests — [CMS T1–T6]
- [ ] Theme tests: parameterized render suite, registry↔component contract, real visual regression with baselines, a11y — [STF §8]
- [ ] Route-manifest test — [MW-52]; tenant-isolation invariant tests — [MW-53]
- [ ] Split analytics.service.ts — [MW-54]; split products page — [MW-55]; split settings page per tab — [SET-B14]; split `ai.route.ts` + AI dashboard — [AI §6]
- [ ] Typed API client + gate `/api/docs` in prod — [MW-56]
- [ ] i18n full sweep: dashboards, admin, **all 20 themes**, AI dashboard — [P2-2][STF INC-2][AI Q-6]
- [ ] Storefront RTL/AR support — [STF-M6 area] / idea 13-§3.6
- [ ] Frontend perf pass (page splits, per-locale bundles, drop `unoptimized` on 20 themes, defer socket for guests) — [MW-58]
- [ ] A11y passes: AI dashboard, 20 themes, settings — [AI §6][STF Q-2]
- [ ] Env contracts (.env.example both workspaces incl. undocumented AI vars) + boot subsystem report — [P2-16][AI §8]
- [ ] Swagger annotations top-20 routes — [P2-17]
- [ ] Repo hygiene cleanup — [P2-15]; lint-warning burn-down — [MW-57]
- [ ] P2 remainder: [P2-3..P2-12], [P2-14]; storefront [STF §5 INC-3..INC-13]; CMS parity [CMS §4]

## Tier 4 — Growth backlog
- [ ] Ads E2E suite + monitoring — [MW-38][MW-39]
- [ ] Analytics: per-store injection, taxonomy, retention worker — [MW-34..36]
- [ ] Compliance center — [MW-24]
- [ ] **Ideas Wave 1** (file 13 §6): settings field registry · config health panel · AI cost ledger · legal pack generator · CMS picker
- [ ] **Ideas Wave 2**: sections engine · theme tokens refactor · hero model · product cards
- [ ] **Ideas Wave 3**: per-store AI budgets · model router · bulk catalog onboarding · Darija
- [ ] **Ideas Wave 4**: storefront RTL/AR · multi-locale CMS · font customization
- [ ] **Ideas Wave 5**: trust score · ops console · money-flow board · status page
- [ ] Remaining idea roadmap per 06-B and 13-§1..§5

---

## Progress tracker

| Tier | Items | Done |
|------|-------|------|
| 0 — Money & security | 18 | 0 |
| 1 — Correctness | 47 | 0 |
| 2 — Completion | 24 | 0 |
| 3 — Quality debt | 20 | 0 |
| 4 — Growth | 10+ | 0 |

### Implementation log
| Date | Commit(s) | Items closed | Notes |
|------|-----------|--------------|-------|
| 2026-08-26 | — | audit created | ox-alpha full-platform audit; read-only |
| 2026-08-26 | — | dedicated passes added | AI + AI-costs (file 09), marketplace CMS (10), storefront templates (11), superadmin settings (12), ideas roadmap (13); checklist re-tiered |
