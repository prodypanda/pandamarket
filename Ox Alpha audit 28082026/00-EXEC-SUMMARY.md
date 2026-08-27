# 00 — Executive Summary

> PandaMarket is an unusually mature codebase for its stage: RLS enabled on all 126 tables, 203/203 FKs indexed, parameterized SQL throughout (no injection found), CSRF + SSRF guards, Redis-backed rate limiting with per-client keying, Sentry wired, CI blocking on lint+typecheck+unit tests, near-perfect i18n key parity (3046 keys × 3 locales), server-authoritative checkout quotes, and a sanitized page-builder. Both workspaces typecheck clean.
>
> **The dangerous gap is financial correctness.** Three independent payment-capture paths skip the wallet/commission pipeline entirely (P0-1/2/3). Payouts are wallet debits with no real-world rail and no payout entity. Payments run on sandbox credentials. Transactional email is structurally broken in production.

---

## Top findings at a glance

| ID | Finding | Impact | Effort |
|----|---------|--------|--------|
| **P0-1** | Online payments never credit vendor wallets (Flouci/Konnect/PayPal capture emits no event) | Sellers never paid for card sales; no commission; no serial keys; no notifications | ~2h |
| **P0-2** | Storefront Mandat receipt review bypasses the entire payment pipeline (raw SQL) | Same as P0-1 via storefront path + no idempotency/gateway checks | ~3h |
| **P0-3** | COD delivery never credits vendor wallets | COD sellers never paid | ~1h |
| **P0-4** | `nodemailer` not installed → prod email structurally broken | Password resets / OTPs can never send once SMTP is added | ⚡ |
| **P0-5** | Webhook HMAC enforcement skipped outside `production` env | Staging/preview accepts forged payment confirmations | ~1h |
| **P0-6** | `env-vars.json` committed to git with live secrets (JWT/cookie/encryption/DB/Redis/WhatsApp) | Secret leak in repo history | ⚡ + rotation |
| **P0-7** | Two XSS sinks rendering unsanitized AI HTML (`dangerouslySetInnerHTML`) | Session theft in seller/admin contexts | ⚡ |
| P1-x | 21 high-priority bugs — Docker build broken, socket dead for post-login users, client-side coupon engine, AI token leaks, config fallbacks to hardcoded prod URL / localhost ×48, ISR revalidate scoping… | see file 02 | varies |
| P2-x | Medium bugs: RTL/Lang SSR flash, untranslated dashboards (hundreds of FR strings), dead links in shipped templates, silent catch blocks… | see file 03 | varies |
| MW-x | Missing vs PRD: guest checkout, order tracking timeline, email verification, real payouts rail, onboarding wizard steps 2–7, marketplace-order fraud queue… | see file 04 | varies |

## Dedicated-pass headline findings (files 09–12)

| ID | Finding | Impact |
|----|---------|--------|
| **STF-P1** 🔴 | **Premium theme purchase requires no payment** — an optional, client-supplied, unvalidated `payment_reference` inserts a paid purchase. 615 TND of themes free per store | revenue |
| **AI-1** 🔴 | **Free AI on an empty wallet** — `assertEnough` failure swallowed, LLM runs anyway; `/category-pick-batch` = 50 free calls per request, unlimited | platform cost |
| **AI-S8** 🔴 | **No AI rate limiting** — ~5,000 provider calls/min reachable from one seller account (100 req/min × 50 batch) | platform cost / abuse |
| **AI-S3** 🔴 | **Prompt injection unmitigated** — attacker-controlled text reaches the JSON contract, then `marketplace_category_id` is written to up to 50 products via `apply_automatically` | data integrity |
| **AI-S5** 🔴 | **SSRF via AI image URLs** — `image_url` not even `.url()`-validated, fetched server-side; `utils/ssrf.ts` exists and is not applied | infra |
| **AI-M1** | **The AI "sandbox tester" is fake** — a `setTimeout` returning hardcoded success; admins will trust it to validate API keys | ops trust |
| **AI-M7** | Only 5 of 12 AI endpoints create job rows → **the whole cost dashboard is unreconcilable**; platform cost is a hardcoded `tokens × 0.005` | reporting |
| **CMS-1** 🔴 | **Superadmin cannot reach the CMS** — `/cms` has no sidebar/dashboard link anywhere; the backend is complete. This is the owner's reported symptom | usability |
| **CMS §5** 🔴 | **The marketplace has zero legal pages** — `pd_platform_page` is empty and terms/privacy/refund/cookie/help/contact all point at `/hub/search` | compliance |
| **CMS-4** | Editor's SEO/noindex/nav fields are silently discarded (no columns, zod strips them) → invisible write-loss loop | SEO |
| **STF-M1** 🔴 | **All 20 themes render the same skeleton** — hero + grid only; zero testimonials/newsletter/banner/collections sections (the page-builder has 14) | product |
| **STF-3/4** | 3 of 4 layout variations are no-ops on most themes; 4 of 7 `ThemeConfig` fields are dead — the customizer advertises far more than it delivers | product |
| **STF-1/2** | Fullscreen preview shows stale settings and the unsaved-changes guard can never fire — almost certainly what "templates don't work" feels like | UX |
| **SET-B1/B2** | 13 settings controls cannot be saved at all; 15 keys owned by two tabs cause self-inflicted 409 conflicts | data safety |
| **SET-B4** | Saving Email from the Settings tab silently downgrades transport to `smtp`, breaking a Brevo-configured platform | deliverability |
| **SET §2** | Two full copies of the 238-key settings interface + defaults (5 values drifted), theme picker and layout selector each rendered twice, Email and Plans editors duplicated as whole pages | duplication |
| **SET §3** | 19 backend keys with no UI (incl. **mandat bank name/RIB/IBAN** — the fields buyers need to pay), 15 toggles with no runtime consumer | missing settings |

## Live health snapshot (2026-08-26)

```
GET /health  → {"status":"ok"}
GET /ready   → {"status":"ready","checks":{"postgres":{"status":"ok","latency_ms":1065},
               "redis":{"status":"ok","latency_ms":45},
               "meilisearch":{"status":"degraded"},     ← expected (owner will provision)
               "s3":{"status":"degraded"}}}             ← running on Postgres-blob fallback
Frontend     → HTTP 200 on www.garbage.team
Render plan  → FREE tier (cold starts, no worker split, SMTP ports blocked)
Render env   → no PD_SMTP_*, no PD_FLOUCI_*/PD_KONNECT_* (sandbox hatch set), no PD_MEILI_*, no PD_S3_*, no Gemini key
DB           → 126 tables; only 5 wallet transactions ever; the single captured order was Mandat-path
               (confirms P0-1: zero online-payment wallet credits)
Typecheck    → backend ✅ frontend ✅
```

## What previous audits already fixed (do not redo)

Per `tabitoken opus 5 audit 24082026/08-TODO-CHECKLIST.md` (29 items closed 2026-08-25): gamified-spin exploit, gamified-leads scoping, hub CMS chain (sanitizers, versions/restore/preview), sandbox-payment fail-fast (+escape hatch), CORS tightening, CSP filtering, middleware caching, advisory-locked migrations, FK indexing 100%, RLS, Redis rate limiting + proxy-hop keying fix, lint 0 errors, i18n parity test, `/hub/products` redirect, Sentry wiring, admin.route.ts split phase 1, page-builder dedup.

**Carried-forward open items from that audit** (still valid): SMTP credentials [M5], worker split [M13], revalidate hostname scoping, admin-notes sweep JOIN version, migration placeholder `047`, real coupon engine [M6], Meilisearch provisioning [M8] *(owner-scheduled)*, object storage/R2 [M7], E2E-in-CI blocking [M14], route-manifest test [E2], tenant-isolation invariant tests [E3], cursor pagination [E13], analytics.service split [E16], products-page split [E22], typed API client [E21], secret rotation [E7].

## Recommended execution order

1. **Phase 0 (this week)** — all of file `01-BUGS-CRITICAL-P0.md` **plus the four revenue/abuse holes from the dedicated passes** (STF-P1 free premium themes, AI-1 free AI, AI-S8 no rate limit, AI-S3/AI-S5 injection+SSRF) and the two ⚡ CMS fixes that make marketplace pages usable at all (CMS-1, CMS-2). Nothing else matters until money and abuse surfaces are closed.
2. **Phase 1 (next 2 weeks)** — file `02-BUGS-HIGH-P1.md` correctness batch + AI billing accounting + CMS data-integrity migration + storefront "make advertised options real" + settings data-safety.
3. **Phase 2 (this month)** — platform completion from file `04-MISSING-WORK.md` plus the storefront **sections engine** (the real missing template work), the 9 seeded legal pages, and the settings deduplication/IA pass.
4. **Phase 3 (backlog)** — quality debt, test suites per area, and the idea waves in file `13-NEW-IDEAS-ROADMAP.md` §6.

## Reading order for the dedicated passes

- AI + AI-costs page → [09-AI-FUNCTIONALITY-DEEP-AUDIT.md](./09-AI-FUNCTIONALITY-DEEP-AUDIT.md) (20 bugs, 11 security, 7 missing, dead schema, 4-tier checklist)
- Marketplace pages / platform CMS → [10-MARKETPLACE-PAGES-CMS-AUDIT.md](./10-MARKETPLACE-PAGES-CMS-AUDIT.md) (13 broken, 12 missing, store-parity table, legal-page content gap)
- Storefront templates → [11-STOREFRONT-TEMPLATES-AUDIT.md](./11-STOREFRONT-TEMPLATES-AUDIT.md) (20-theme matrix, 9 broken, dead customization, premium-flow hole)
- Superadmin settings → [12-SUPERADMIN-SETTINGS-AUDIT.md](./12-SUPERADMIN-SETTINGS-AUDIT.md) (tab map, duplication analysis, missing settings, proposed 8-tab IA)
- New functionality & ideas → [13-NEW-IDEAS-ROADMAP.md](./13-NEW-IDEAS-ROADMAP.md) (72 proposals, sequenced into 5 waves)
