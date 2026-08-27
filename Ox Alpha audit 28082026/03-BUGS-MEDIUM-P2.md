# 03 — Medium Bugs & Problems (P2)

---

## [P2-1] Arabic users get LTR French flash; wrong `lang` in initial HTML
- **Evidence:** `<html lang="fr" dir="ltr">` hardcoded SSR (`frontend/src/app/layout.tsx:142`); RTL applied client-post-mount only (`LocaleContext.tsx:81-86`); admin sidebar manually mirrors RTL margins (`(admin)/layout.tsx:569-571`).
- **Fix steps:** read locale from cookie/URL segment in the root server layout (Next 16 allows reading cookies in layout) → set `lang`/`dir` server-side → remove client-side flip. Verify all 20 themes under AR.

## [P2-2] Hundreds of untranslated strings — dashboards/admin effectively French-only
- **Evidence (spot counts):** admin settings ×127, products page ×90, subscription-orders ×62, AiCostsDashboard ×62, PageBuilderEditorCore ×61, seller orders ×44, hub orders ("Signaler le vendeur" `hub/orders/page.tsx:369,405,415`), RoleScopedLoginPage :69-72, storefront checkout button :782. Plus untranslated `'Fraud Radar & Chargebacks'` inside translated nav (`(admin)/layout.tsx:302`). Mixed currency formatting (`toFixed(3)+' TND'` vs `t('common.currency')`).
- **Fix plan:** extract namespace-by-namespace (start with checkout + orders + auth surfaces buyers see), add keys to en/fr/ar, extend `i18n-parity.test.ts` with a "no raw sentence-length literals in changed files" lint experiment. Track burn-down in this folder.

## [P2-3] Middleware dead config blocks invite drift
- **Evidence:** `HUB_DOMAINS`, `ADMIN_DOMAINS`, `PLATFORM_BASES` declared but unused (`middleware.ts:29-55`).
- **Fix:** delete them; single source = `lib/store-hosts.ts#classifyHost`. Also move mid-file import at :103 to top.

## [P2-4] Private IPs always classify as hub
- **Evidence:** `PRIVATE_HOST_PATTERN` (`store-hosts.ts:34-35,97`) — a custom-domain store pointing at a LAN IP renders the hub.
- **Fix:** only treat loopback/dev hosts as hub in non-production; log+404 otherwise.

## [P2-5] Middleware matcher skips file-like paths entirely
- **Evidence:** matcher excludes any first segment matching `[\w-]+\.\w+` (`middleware.ts:13`) — bypasses maintenance/auth UX rewrites.
- **Fix:** narrow exclusion to real static extensions list (`\.(png|jpg|...|map)$`).

## [P2-6] Subscription-limits cache never invalidated cross-instance
- **Evidence:** in-memory Map cache (`subscription.service.ts:39-59`); admin edits invalidate only serving process.
- **Fix:** publish invalidation over existing Redis pub/sub (pattern already used for settings per admin-notes B22) or TTL-cap at 60s.

## [P2-7] `handleRelease` notifies ALL vendors on any payout release
- **Evidence:** `payout.worker.ts:55-72` queries every wallet when any release occurs (currently inert — no subscriber registered — but a landmine).
- **Fix:** scope notification to wallets whose funds became available in that run.

## [P2-8] Provider integration nits
- PayPal FX default hardcoded `0.30` (`paypal.provider.ts:48`) → require explicit config.
- Konnect init hardcodes customer name `'Customer'` (`konnect.provider.ts:43-44`) → pass buyer name.

## [P2-9] Check-then-insert uniqueness races return 500 instead of 409
- **Evidence:** subdomain check (`store.service.ts:314-321`), email check (`auth.service.ts:175-182`).
- **Fix:** catch Postgres unique-violation error code `23505` → map to 409 with friendly message.

## [P2-10] Silent `catch {}` swallowing data errors
- **Evidence:** e.g. `online-store/customers/page.tsx:33-35`, `kyc/page.tsx:64-66`; several dashboard pages.
- **Fix:** replace with `catch (e) { setError(...) }` + toast; add ESLint `no-empty` re-escalation for new code.

## [P2-11] ~25 dead `href="#"` links ship inside page-builder templates
- **Evidence:** `templates.ts:406-1715`, `PageBuilderEditorCore.tsx:311-2124`.
- **Fix:** point template links at real placeholder anchors (`/pages/contact` etc.) or make them editable-required before publish validation.

## [P2-12] Cart sync token never expires/rotates; optional PII sent
- **Evidence:** forever-localStorage `sess_...` keying guest cart sync with optional email/phone (`CartContext.tsx:45-53`).
- **Fix:** rotate token per session (sessionStorage + server-side expiry), drop PII from sync payload (quote already carries it server-side).

## [P2-13] Withdrawals have no payout entity — free-text debits only
- **Evidence:** DB shows wallet txns type `payout`, descriptions like `'pk_350'` / `'Vendor withdrawal'`; no `pd_payout*` table exists.
- **Why it matters:** no status lifecycle, no proof attachment, no admin review object, no reconciliation against bank reality.
- **Fix:** design + migrate `pd_payout(id, wallet_id, amount, method, destination, status[pending/approved/paid/rejected], proof_file_id, requested_by, reviewed_by, reviewed_at, external_ref)`; wallet debit becomes a payout-linked transaction; admin withdrawals page reads the entity. Blocks MW-4 (real payouts rail).

## [P2-14] Event-name drift: raw string instead of enum
- **Evidence:** `eventBus.emit('pd.payment.captured', ...)` string literal at `mandat.service.ts:149` vs `PdEvent.PAYMENT_CAPTURED` elsewhere.
- **Fix:** use enum everywhere; add test asserting enum values match subscriber registrations.

## [P2-15] Repo hygiene
- Root scratch scripts left: `check-all.ts`, `check-blobs.ts`, `check-logos.ts`, `cleanup-images.ts`, `fix-logo-final.ts`, `fix-logos.ts`; stray file `h -c git diff --stat 2&1`; untracked `eslint-fe.json` duplicates (root + frontend). Carried from prior audit P3: gitignore `playwright-report/`, `test-results/`.
- **Fix:** delete scratch files after confirming unused; commit intended ones; tidy ignores.

## [P2-16] Config/env contract undocumented
- **Evidence:** env vars referenced in code but absent from `.env.example`: `PD_RUN_WORKERS_IN_PROCESS`, `PD_PAYOUTS_AUTO_ENABLED`, `PD_USE_PG_SEARCH`, `PD_KEEP_ALIVE_*`, `PD_ALLOW_SANDBOX_PAYMENTS`, `PD_OPENAI_*`, `PD_SHIPPING_*`, `GEMINI_API_KEY`/`GOOGLE_API_KEY` fallbacks; frontend has NO `.env.example` at all (contract includes `BACKEND_URL`, `NEXT_PUBLIC_HUB_URL`, `PD_REVALIDATE_SECRET`, `PD_CSP_*`, `PD_S3_PUBLIC_PROXY_URL`…).
- **Fix:** write both `.env.example`s as complete annotated contracts; add boot-time subsystem report (prior-audit E5) logging configured/disabled+reason per optional subsystem.

## [P2-17] Swagger security schemes defined but route annotations sparse
- **Evidence:** `src/swagger.ts`; most routes lack JSDoc operation tags.
- **Fix:** annotate top-20 public/admin routes first (auth, products, orders, payments, subscriptions) to unlock typed-client generation (E-15).

## Progress tracker (P2)

| ID | Summary | Status |
|----|---------|--------|
| P2-1 | SSR lang/dir | ☐ |
| P2-2 | i18n dashboards sweep | ☐ |
| P2-3 | middleware dead code | ☐ |
| P2-4 | private-IP host classification | ☐ |
| P2-5 | matcher file-path bypass | ☐ |
| P2-6 | limits cache invalidation | ☐ |
| P2-7 | release notification scoping | ☐ |
| P2-8 | provider nits (FX/customer name) | ☐ |
| P2-9 | unique-violation → 409 | ☐ |
| P2-10 | silent catches | ☐ |
| P2-11 | template dead links | ☐ |
| P2-12 | cart token rotation | ☐ |
| P2-13 | pd_payout entity | ☐ |
| P2-14 | event enum drift | ☐ |
| P2-15 | repo hygiene | ☐ |
| P2-16 | .env contracts | ☐ |
| P2-17 | swagger annotations | ☐ |
