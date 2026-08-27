# 04 — Missing Work (unfinished vs PRD/spec)

> Consolidated from the functional PRD (`ai instructions/spécifications fonctionnelles (PRD).md`), business model doc, prior audit open items (M-series), and planning docs (`IMPORTANT_IMPLEMENTATION_PLAN_TODO.md`, `PROJECT_PLANNED_WORK_TODO.md`, Ads plan, PLATFORM_IDEAS_ENHANCED.md). Deduplicated against everything already fixed through 2026-08-25.

---

## A. Payments & money
- [ ] **MW-1 — SMTP live + transactional email end-to-end.** Code is ready & fails loudly (commit `bd54a28`); blocked on credentials/relay (Render trial blocks SMTP ports). Use Brevo HTTP transport path as immediate unblock; then set `PD_SMTP_*`+`PD_MAIL_FROM`; send real password reset. *(carried M5)*
- [ ] **MW-2 — Real Flouci/Konnect production credentials** on Render; remove `PD_ALLOW_SANDBOX_PAYMENTS` hatch; confirm webhook signing scheme (feeds P0-5).
- [ ] **MW-3 — Payout rail.** Integrate a bank transfer provider (or manual-transfer workflow with proof upload) before enabling `PD_PAYOUTS_AUTO_ENABLED`. Requires P2-13 entity first.
- [ ] **MW-4 — Admin payout approvals screen** beyond the current withdrawals list (approve/reject/proof/mark-paid lifecycle).
- [ ] **MW-5 — Email verification flow** for new accounts (flagged missing since Aug-3 report; prerequisite for loyalty program & fraud controls).
- [ ] **MW-6 — Mandat re-upload after rejection** (PRD F6.3 6b) — part of P0-2 fix.
- [ ] **MW-7 — D17 interim manual method** (receipt upload/confirm like Mandat) until API partnership; full QR/instant later. *(IDEAS D1)*
- [ ] **MW-8 — COD risk tooling:** verify `pd_cod_verification` + `pd_courier_settlement` tables are wired end-to-end (RTO reason codes/rate tracking, OTP-confirm on high-risk orders). *(IDEAS D2)*
- [ ] **MW-9 — COD driver mobile-web console** (QR scan, cash collection, status sync). *(IDEAS D3)*

## B. Buyer experience
- [ ] **MW-10 — Guest checkout** (hub requires login at quote step: `hub/checkout/page.tsx:142-146`; storefront verifies session pre-submit :297-299). Implement guest cart→email-capture→order flow with post-purchase account claim.
- [ ] **MW-11 — Order-tracking timeline UI** (list + status chips only today; storefront orders is a basic modal list).
- [ ] **MW-12 — Consolidate buyer surfaces** `/hub/account` vs `/hub/profile` (overlapping responsibility).
- [ ] **MW-13 — Reviews photo/video attachments** + AI-assisted moderation (toxicity/fake heuristics). *(ENH §25)*
- [ ] **MW-14 — Returns/RMA workflow** (request→approve→label→refund/replacement, linked to orders+tickets). *(ENH §22)*
- [ ] **MW-15 — Storefront live-chat widget** (office hours/away message → offline creates ticket). *(ENH §20)*

## C. Seller experience
- [ ] **MW-16 — Finish onboarding wizard steps 2–7** (theme→KYC→first product→payment/shipping→publish), persisted progress bar, replayable coachmarks, buyer onboarding tooltips. *(IMP §1 partial)*
- [ ] **MW-17 — Serial-license-key ops:** vendor visibility of key pool counts/status; cancellation/refund/reissue workflow for captured keys. *(memories-summary residual risk)*
- [ ] **MW-18 — API-keys page enhancements:** last-used/IP/request counts, per-key scopes & rate tiers, rotate confirmations, IP allow-list, curl/Node/Python snippets. *(ENH §9)*
- [ ] **MW-19 — Payout receipts/invoices (PDF)** in wallet UI.

## D. Superadmin / platform management
- [ ] **MW-20 — Marketplace-order fraud queue** (fraud-radar currently covers subscription chargebacks only): flag velocity/anomaly patterns on marketplace orders, link to reports system.
- [ ] **MW-21 — Settings-page data-loss guards** (admin-notes AS series): unsaved-changes guard (beforeunload/route/tab switch), failed-load protection against overwriting DB with defaults, per-tab save + per-tab reset, functional field-search filter, rewards JSON editor with validation, maintenance danger confirm, aspect-ratio validation, lazy tabs, audit-link after save, mandat copy buttons, garbage.team default URL fix, commission conflict surfacing.
- [ ] **MW-22 — Missing admin capabilities** (B-series): featured/curated product picker; announcement-bar editor (text/link/schedule); hub nav-menu editor; campaign scheduling windows for banners/blocks/slides; layout A/B or preview-as-draft; per-locale content variants; per-page SEO overrides; JSON-LD controls.
- [ ] **MW-23 — Platform engineering for settings:** typed/jsonb storage + write-time validation; multi-instance cache invalidation pub/sub; cache-control headers on public settings endpoint; dedicated "appearance" permission; audit-log diffs (store previous value); consistent `.strict()` validators. *(B21–B26)*
- [ ] **MW-24 — Compliance center (Tunisia PDP 2004-63 / GDPR):** consent log, cookie-consent banner gating analytics scripts, DSAR workflow, processor list, account anonymization jobs. *(ENH §31)*

## E. Hub & storefront
- [ ] **MW-25 — Complete Alibaba/Amazon hub template parity:** utility bar behaviors, nested mega-sidebar w/ hover panels, admin-managed hero carousel wiring to real slides engine, deals countdown driven by real campaign data, top-sellers rail, data-backed sponsored-brands rail, recently-viewed on homepage, footer mega-grid, tests. *(IMP §5 partial)*
- [ ] **MW-26 — AliExpress2HomeContent repair:** ~30 hardcoded strings → i18n; RTL/dir support; honor `hub_homepage_blocks`; unlock hard-locked dark theme. *(admin-notes A2)*
- [ ] **MW-27 — Sponsored rails locale bug:** pass activeLocale not default locale. *(A1)*
- [ ] **MW-28 — Type drift:** add `'alibaba' | 'amazon'` to `hub_homepage_layout` union. *(A22)*
- [ ] **MW-29 — Homepage blocks schema safety + cross-layout faithful draft preview** (open themes from admin-notes README).
- [ ] **MW-30 — HH-series homepage polish:** cart-badge zero flash, real total stats, pagination-style setting implementation, auth-link hydration flash, localized footer categories, add-to-cart on trending cards, sponsored-rail skeletons, category icons, hero-dots keyboard a11y, JSON-LD completeness, noscript fallback, ISR tuning. *(HH-01…18 minus already-fixed)*

## F. AI
- [ ] **MW-31 — Decide `ai-tagger.worker.ts`: wire or delete.** If wire → fix token/job accounting (P1-7/P1-8). *(carried M12)*
- [ ] **MW-32 — Verify AI provider keys exist in prod** (`pd_ai_provider_config` platform-level encrypted rows) — no Gemini/OpenAI key present in Render env; confirm AI features aren't silently degraded.
- [ ] **MW-33 — Idea backlog (see 06):** catalog-onboarding extraction, photo studio, smart repricer, banner/reels generator, RAG chatbot, voice search.

## G. Analytics
- [ ] **MW-34 — Per-store GA4/GTM/Meta Pixel settings** + storefront-only injection + sanitized head-snippet allow-list. *(IMP §4 partial)*
- [ ] **MW-35 — Centralized event taxonomy** (`view_item`…`purchase`) + consent gating + server-side purchase bridge + seller tracking-ID settings UI + tests.
- [ ] **MW-36 — Event/log retention & archival worker** (>90d → object storage). *(IDEAS A5)*
- [ ] **MW-37 — Platform analytics page completion:** GMV north star, funnel/cohorts tabs, period comparison, CSV export. *(IDEAS A1)*

## H. Ads (from its own plan — 4 unchecked boxes)
- [ ] **MW-38 — E2E ads pipeline tests** (refill/campaign/moderation/delivery/conversion) + staging migration & rollback verification.
- [ ] **MW-39 — Ads monitoring:** spend accuracy, delivery latency, error rates, fraud indicators dashboards/alerts.
- [ ] **MW-40 — Next ad products:** brand banners, autocomplete ads, flash-sale boost; keyword auctions; pacing/auto-bid; click-fraud dedup MVP; wallet auto-top-up *charging*; Meta Conversions API retargeting. *(IDEAS B1–B6)*

## I. Infra / DevOps
- [ ] **MW-41 — Worker split:** separate Render service; `PD_RUN_WORKERS_IN_PROCESS=false`; remove keep-alive self-ping afterwards. *(carried M13/P2-17)*
- [ ] **MW-42 — Meilisearch provisioning** (`PD_MEILI_*`) — owner-scheduled; PG fallback stays. *(carried M8)*
- [ ] **MW-43 — Object storage:** point S3 vars at real store or execute planned R2 migration; move images off Postgres-blob fallback (DB bloat risk). *(carried M7)*
- [ ] **MW-44 — Make Playwright E2E CI blocking** after first green run (remove continue-on-error). *(carried M14)*
- [ ] **MW-45 — Sentry alert rule** (2-click UI task; legacy API rejected mail actions). *(carried M9 remainder)*
- [ ] **MW-46 — Secret rotation pre-launch:** JWT/cookie secrets → 64-char random; rotate Supabase DB password; rotate everything in P0-6 file. *(carried E7)*
- [ ] **MW-47 — Synthetic monitoring:** hourly checkout/auth E2E subset + gateway health probes + alerts. *(IDEAS I4)*
- [ ] **MW-48 — Redis resilience:** paid instance, separate bounded app-cache connection from BullMQ, reconnect-storm alerting. *(IDEAS J2)*
- [ ] **MW-49 — Backup/DR:** scheduled off-site backups, PITR documentation, restore drills, per-tenant data export. *(ENH §30)*
- [ ] **MW-50 — Cloudflare CDN/DNS in front of Caddy:** cache rules, custom-domain DNS/SSL automation, edge bot protection. *(ENH §5)*

## J. Tests & code quality (carried)
- [ ] **MW-51 — Payment-capture wallet test** (would have caught P0-1) + receipt-review suite + COD-delivery suite.
- [ ] **MW-52 — Route-manifest test** (frontend fetch literals ↔ mounted Express routes). *(E2)*
- [ ] **MW-53 — Tenant-isolation invariant tests** across tenant-scoped services. *(E3)*
- [ ] **MW-54 — Split `analytics.service.ts`** (>4,000 lines). *(E16)*
- [ ] **MW-55 — Split `hub/dashboard/products/page.tsx`** (~7,850 lines / 415KB chunk). *(E22)*
- [ ] **MW-56 — Typed API client generated from Swagger** + gate `/api/docs` behind auth in prod. *(E21)*
- [ ] **MW-57 — Burn down lint-warning debt** (~430 tracked warnings documented in eslint.config.mjs); re-escalate tiered rules gradually.
- [ ] **MW-58 — Frontend perf pass:** split monolith client pages (settings 336KB, orders 225KB, AiCosts 175KB), per-locale i18n loading (442KB bundled), next/image migration on all 20 themes (currently `unoptimized`) + 24 raw `<img>` files, defer SocketProvider for anonymous users.
- [ ] **MW-59 — Test coverage expansion:** e2e for KYC review, mandat upload, wallet/withdrawals, maintenance mode, RTL visuals; include `src/app/**` in coverage config.

---

### Progress snapshot
| Area | Items |
|------|-------|
| Payments/money | 9 |
| Buyer | 6 |
| Seller | 4 |
| Admin/platform | 5 |
| Hub/storefront | 6 |
| AI | 3 |
| Analytics | 4 |
| Ads | 3 |
| Infra/devops | 10 |
| Tests/quality | 9 |
| **Total** | **59** |
