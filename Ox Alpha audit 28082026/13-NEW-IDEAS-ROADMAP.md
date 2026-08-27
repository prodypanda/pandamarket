# 13 — New Ideas, Enhancements & Improvements Roadmap

> Additive to `06-ENHANCEMENTS-IDEAS.md`. This file focuses on the four areas of the dedicated pass: **AI**, **marketplace pages/CMS**, **storefront templates**, **superadmin settings** — plus cross-cutting platform ideas. Items marked ⭐ are high-impact / low-effort for the Tunisian market.

---

## 1. AI — 28 proposals

### 1.1 Cost & governance (fix the blind spot first)
1. **Real cost ledger** — store `prompt_tokens`, `completion_tokens`, `model`, `provider_cost_usd`, `charged_credits` per job; replace the `tokens × 0.005` guess. Enables true margin reporting (charged credits revenue − provider cost).
2. **Per-store AI budgets & alerts** ⭐ — monthly cap per store, soft-warn at 80%, hard-stop at 100%, admin override. Mirrors the Ads budget model that already exists.
3. **Platform-wide daily spend circuit breaker** — auto-disable AI features when daily provider cost exceeds a threshold; surfaces on `/ready` as `degraded`.
4. **Model router with price/quality tiers** — cheap model for tagging/classification, mid for descriptions, premium for hero copy; per-purpose tier choice with cost preview in the admin UI.
5. **Cost export (CSV/JSON) + monthly AI invoice per store** — the `Download` icon is already imported and unused.
6. **Anomaly detection on AI usage** — flag a store whose token consumption jumps >5σ (abuse or a loop bug).
7. **Prompt cost estimator** — show estimated tokens/credits before the seller clicks generate.

### 1.2 Reliability & correctness
8. **Reserve→settle credit protocol** with idempotency keys (fixes AI-14 permanently and enables safe retries).
9. **Provider health board** — per-provider success rate, p95 latency, error taxonomy, last-success timestamp; auto-demote a failing provider in the cascade.
10. **Real provider connectivity test** replacing the fake sandbox (AI-M1): sends a 5-token ping, shows raw response + latency + resolved model.
11. **Evaluation harness** — a fixture set of 20 products with expected category/attributes; run on prompt or model change, report accuracy delta. Prevents silent prompt regressions (which AI-8 currently causes).
12. **Prompt playground with diffing & versioning** — edit → run on 5 sample products → side-by-side old/new output → publish with a version row and rollback.
13. **Stuck-job reaper + BullMQ-backed queue health** (replaces DB-derived queue metrics).
14. **Structured-output enforcement** — use provider JSON modes / function calling instead of regex-extracting `{...}` in 8 places.

### 1.3 New seller-facing AI features
15. **Bulk catalog onboarding** ⭐ — upload photos or a supplier CSV/PDF → AI extracts title, category, attributes, price band, FR+AR descriptions → human confirmation grid. Biggest time-saver for Tunisian merchants migrating from Facebook/Instagram commerce.
16. **Darija-aware content** ⭐ — descriptions and support replies in Tunisian Arabic (Latin + Arabic script), with a normalization dictionary; also Darija query expansion for search.
17. **AI translation matrix** — one product → FR/EN/AR variants with per-locale SEO fields (pairs with the multi-locale gap in CMS and themes).
18. **Photo studio v2** — background replace (already stubbed), shadow/reflection, model mockups, batch processing, and a "brand kit" (fonts/colors from theme) applied to generated banners.
19. **Listing quality score** — 0-100 with concrete fixes ("add 2 more images", "description too short", "missing size attribute"), recomputed nightly; drives a seller leaderboard.
20. **Smart repricer** — suggest price from internal percentile data by category + competitor signals; opt-in per product with guardrails.
21. **AI review reply drafts** — sellers respond to reviews in 1 click, tone-controlled.
22. **Storefront RAG assistant** — pgvector over catalog + policies + shipping; Pro/Platinum only, credit-metered; falls back to human chat (chat system already exists).
23. **AI ad creative generator** — headline + description + image variants for the existing ads engine, with A/B split delivery.

### 1.4 New admin-facing AI features
24. **AI analyst** ⭐ — natural-language questions over platform analytics ("which categories grew last month?") answered from pre-aggregated rollups (never raw SQL from the model).
25. **AI moderation queue** — auto-triage products/reviews/reports with confidence scores; admin only sees the uncertain middle band.
26. **Fraud copilot** — cluster signals (same device, same IP, velocity, refund rate) into a ranked case list with a plain-language rationale.
27. **Prompt-injection detector** — classify seller free-text before it enters a prompt; quarantine suspicious inputs (directly mitigates AI-S3).
28. **AI usage transparency page for sellers** — what data is sent, to which provider, retention; needed for the compliance center (MW-24).

---

## 2. Marketplace pages / Platform CMS — 12 proposals

1. **Legal pack generator** ⭐ — one click seeds Terms, Privacy, Refund, Cookie, Contact, About, FAQ, Seller Guide from Tunisia-aware templates with merge fields (`{{marketplace_name}}`, `{{support_email}}`, `{{company_address}}`), marked "requires legal review".
2. **CMS-page picker everywhere** — settings link fields, footer builder, nav builder select from published pages instead of free-text URLs (kills the `/hub/search` default class of bug).
3. **Multi-locale pages** — `locale` column + `(slug, locale)` unique, locale switcher in the editor, `hreflang` alternates in metadata (marketplace categories already have per-locale columns — follow that precedent).
4. **Scheduling** — `publish_at`/`unpublish_at` with a worker; essential for campaign landing pages and policy effective dates.
5. **Hub navigation & footer builders** — `pd_platform_menu`, `pd_platform_footer_block` mirroring the store versions; ends hardcoded footer categories.
6. **Page analytics** — views, scroll depth, CTA clicks per marketplace page (store pages already have this).
7. **Reusable content blocks / partials** — one "Shipping policy" block embedded in several pages, edited once.
8. **Landing-page templates library** for campaigns (Ramadan, Black Friday, seller recruitment) with UTM presets.
9. **A/B testing on marketplace landing pages** — two variants, traffic split, conversion goal = signup or order.
10. **Approval workflow** — editor drafts → superadmin approves → publish (useful once you have staff admins; note the current authorization gap SET-B12).
11. **Redirects manager** — `pd_redirect(from, to, status)` for renamed slugs; prevents 404s after slug changes (which the UI can't even do today, CMS-M1).
12. **Public sitemap + JSON-LD per page type** (Article/FAQPage/ContactPage) — SEO win, currently absent.

---

## 3. Storefront templates — 18 proposals

1. **Sections engine** ⭐ — the single highest-leverage change: ordered, typed, per-store `sections[]` (hero, featured collection, testimonials, newsletter, banner, trust row, FAQ, video, brand logos, countdown) rendered by every theme. Turns 20 near-identical skins into a real page system.
2. **Theme = tokens + sections, not 20 forks** — extract one `ThemeShell` + design tokens (colors, radius, spacing, fonts, shadows, density); each theme becomes a token preset + section defaults. Kills the copy-paste clusters and makes new themes cheap.
3. **Font customization** ⭐ — Google Fonts subset picker (Latin + **Arabic**) with per-store heading/body choice; the i18n keys already exist with no control.
4. **Hero content model** — image/video/title/subtitle/CTA/overlay/position; reuse the page-builder's existing shape (removes the fake play button in all 20 themes).
5. **Real product cards** — badges (sale %, new, low stock), wishlist, quick view, quick add-to-cart, rating; one shared component.
6. **Storefront RTL + AR support** ⭐ — `dir` from store locale, mirrored spacing, Arabic-safe fonts; currently 0/20 themes support RTL despite a 174 KB `ar.json`.
7. **Per-store dark mode toggle** with proper token pairs (today only shared chrome has `dark:` classes and nothing sets the class).
8. **Theme marketplace v2** — designer accounts, revenue share, signed `.pmtheme` import/export, screenshots, changelog, ratings (requires fixing the free-purchase hole STF-P1 first).
9. **Live preview with device frames** — real iframe + width control + "preview as: new visitor / returning / mobile Ramadan campaign".
10. **Theme versioning & rollback** — snapshot on publish, one-click revert (stores already have page versions; reuse the pattern).
11. **Section scheduling** — show a promo banner only during a date window; per-section visibility rules (logged-in only, first-time visitor, cart value).
12. **Custom CSS with scoped sanitization** — allow advanced sellers a token-aware CSS box, compiled and scoped like page-builder CSS.
13. **Storefront speed budget** — per-theme LCP/CLS budget checked in CI on a seeded store; block a theme release that regresses.
14. **Conversion kit per theme** — sticky add-to-cart, exit-intent coupon, free-shipping progress bar, recently-viewed rail, "X people viewing" (settings already exist for some of these on the PDP; extend to storefront).
15. **Storefront onboarding wizard** — "pick theme → pick preset → upload logo → choose sections" in 4 steps, generating a complete storefront in minutes (ties into MW-16).
16. **Accessibility certification per theme** — axe run in CI, badge in the gallery; differentiator no local competitor offers.
17. **Theme-aware transactional emails** — reuse store colors/logo in order emails (email template system exists but is unrelated to `theme_id`).
18. **Storefront PWA per store** — manifest + service worker generated from theme tokens (offline catalog browse, add-to-home).

---

## 4. Superadmin settings — 14 proposals

1. **Declarative field registry** ⭐ — one source `{key, tab, section, control, label, description, validate, danger, superadminOnly}`; the UI, search index, zod picks, tab ownership and docs all generate from it. Structurally prevents the entire drift class found in file 12.
2. **Settings diff & history** — every save stores before/after; timeline view with "revert this change"; ties into the audit-log diff gap (SET-B9).
3. **Environments & staged rollout** — draft settings → preview on a canary host → publish; avoids editing live branding in production.
4. **Settings export/import (JSON)** — snapshot a full platform config, diff two snapshots, restore.
5. **Danger Zone with typed confirmation** and an ops log of who flipped what when.
6. **Config health panel** ⭐ — boot-time subsystem report surfaced in the UI: SMTP configured?, Meilisearch?, S3?, payment creds real or sandbox?, AI keys present?, webhook secrets set? Each row links to the setting that fixes it. This is the missing operational dashboard.
7. **Validation with reachability checks** — legal/social URLs pinged on save (HEAD, 5s timeout) with a warning badge; IP/CIDR, ISO-4217, ISO-3166, ISO-8601 validators.
8. **Per-plan commission matrix editor** live from the plans API (replaces the hardcoded `'0%'` table).
9. **Feature-flag registry** with rollout percentage and per-store overrides, replacing the ad-hoc boolean toggles (several of which have no consumer at all).
10. **Scheduled settings changes** — "enable maintenance at 02:00", "switch homepage layout for the campaign week".
11. **Settings search v2** — fuzzy search over the registry, keyboard-first (⌘K), jumps to and highlights the field, shows current vs default value.
12. **"Reset to default" per field** with an inline "modified" indicator (which fields differ from factory).
13. **Multi-admin presence** — show "Ahmed is editing the Finance tab" via the existing socket layer; prevents the 409 surprise.
14. **Ops runbook links inline** — each dangerous setting links to the relevant runbook section (`docs/runbook.md` exists).

---

## 5. Cross-cutting platform ideas (new in this pass)

1. **Money-flow observability board** — funnel `checkout_started → payment_initialized → webhook_received → captured → wallet_credited → payout_paid` per gateway; would have surfaced P0-1 instantly.
2. **Config drift detector** — CI job comparing Render/Vercel env keys against the documented contract; fails on missing required keys per environment.
3. **Seller trust & quality score** ⭐ combining KYC, listing quality (AI #19), ship time, RTO rate, review score, storefront health → drives search ranking, badge display, and payout retention length.
4. **Unified notification center** across email/in-app/WhatsApp/SMS with per-event templates and per-user channel preferences (pieces exist separately today).
5. **Tunisia compliance pack** — PDP 2004-63 consent log, DSAR workflow, invoice legal requirements, tax export for the accountant; sold as a Platinum differentiator.
6. **Marketplace operations console** — one screen: pending KYC, pending mandats, pending products, open reports, failed payments, stuck AI jobs, queue depth. Replaces jumping between 8 admin pages.
7. **Seller mobile web app** (PWA) for orders/inventory/chat — Tunisian sellers are mobile-first.
8. **Public status page** driven by `/ready` + synthetic checks; builds seller trust.
9. **Sandbox tenant generator** — one command creates a fully seeded demo store for support/demos/screenshots (also unblocks real visual-regression testing).
10. **Playbook automation** — when a store's KYC is approved, auto-enable publishing, send WhatsApp welcome, seed 3 sample sections in their theme.

---

## 6. Suggested sequencing of ideas (after Phase 0/1 bug fixes)

| Wave | Items | Why now |
|---|---|---|
**W1** | Settings field registry (#4.1) · Config health panel (#4.6) · AI cost ledger (#1.1) · Legal pack generator (#2.1) · CMS nav entry & picker (#2.2) | Each removes a whole class of current defects |
**W2** | Sections engine (#3.1) · Theme tokens refactor (#3.2) · Hero model (#3.4) · Product cards (#3.5) | The real "missing template work" |
**W3** | Per-store AI budgets (#1.2) · Model router (#1.4) · Bulk catalog onboarding (#1.15) · Darija (#1.16) | Monetizable AI with cost control |
**W4** | Storefront RTL/AR (#3.6) · Multi-locale CMS (#2.3) · Fonts (#3.3) | Unlocks the Arabic market properly |
**W5** | Trust score (#5.3) · Ops console (#5.6) · Money-flow board (#5.1) · Status page (#5.8) | Operational maturity before scale |
