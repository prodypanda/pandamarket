# PandaMarket Consolidated Planned Work TODO

> **Created:** 2026-05-16
> **Purpose:** Consolidated todo file generated after reviewing project Markdown documentation for unfinished work, future work, and planning guidance.
> **Scope:** Project Markdown files outside dependency/build folders (`node_modules`, `.git`, `.next`, `dist`, `coverage`).

---

## Source-of-Truth Rules

- **Use newer handoffs over older roadmap/audit rows.** `docs/pandamarket-deep-documentation-brief.md` explicitly says older `AUDIT_REPORT.md`, root `README.md` roadmap rows, and parts of `implementation_plan.md` are stale.
- **Start from new planned work.** Page Builder Phase 9 QA, storefront theming/cart optional follow-ups, and audit-log follow-ups are intentionally skipped in this backlog per user direction.
- **Ship each backlog item as an isolated change.** `docs/pandamarket-enhancements-todo.md` says not to bundle unrelated features.
- **Always inspect actual code before implementation.** Docs are intent and context; the current codebase is the final authority.
- **Keep Hub and storefront routing separate.** Preserve the central marketplace vs storefront subdomain/custom-domain distinction.
- **Use project conventions.** Raw parameterized SQL, `pd_` table prefix, Zod validation, `fetchWithCsrf`, tenant isolation, audit logging for admin/seller writes, encrypted credentials, and targeted validation.

---

## Reviewed Markdown Sources

### Root

- [x] `README.md`
- [x] `AUDIT_REPORT.md`
- [x] `implementation_plan.md`
- [x] `tasklist.md`
- [x] `todo.md`
- [x] `memories-summary.md`

### Current docs and handoffs

- [x] `docs/AGENT_CHECKPOINT_2026-05-06.md`
- [x] `docs/PAGE_BUILDER_ULTRA_URGENT_IMPLEMENTATION_PLAN.md`
- [x] `docs/pandamarket-deep-documentation-brief.md`
- [x] `docs/pandamarket-enhancements-todo.md`
- [x] `docs/runbook.md`
- [x] `docs/secrets-setup.md`
- [x] `.windsurf/handoff/checkpoint-audit-log-and-branding.md`
- [x] `.windsurf/workflows/review.md`
- [x] `.agents/workflows/reviewcodechanges.md`

### AI instruction specs

- [x] `ai instructions/api-endpoints.md`
- [x] `ai instructions/architecture.md`
- [x] `ai instructions/business-model.md`
- [x] `ai instructions/coding-conventions.md`
- [x] `ai instructions/database-schema.md`
- [x] `ai instructions/deployment-guide.md`
- [x] `ai instructions/design-system.md`
- [x] `ai instructions/documentation.md`
- [x] `ai instructions/environment-setup.md`
- [x] `ai instructions/error-codes.md`
- [x] `ai instructions/glossary.md`
- [x] `ai instructions/integrations-guide.md`
- [x] `ai instructions/notifications-system.md`
- [x] `ai instructions/permissions-matrix.md`
- [x] `ai instructions/roadmap.md`
- [x] `ai instructions/security-guide.md`
- [x] `ai instructions/spécifications fonctionnelles (PRD).md`
- [x] `ai instructions/testing-strategy.md`
- [x] `ai instructions/user-stories.md`
- [x] `ai instructions/wireframes.md`

### Wiki and frontend agent docs

- [x] `wiki/README.md`
- [x] `wiki/01-project-overview.md`
- [x] `wiki/02-prerequisites-windows.md`
- [x] `wiki/03-local-setup.md`
- [x] `wiki/04-environment-variables.md`
- [x] `wiki/05-database-migrations.md`
- [x] `wiki/06-running-the-project.md`
- [x] `wiki/07-production-deployment.md`
- [x] `wiki/08-dns-domain-setup.md`
- [x] `wiki/09-troubleshooting.md`
- [x] `wiki/10-api-reference.md`
- [x] `wiki/11-security-guide.md`
- [x] `wiki/12-testing-guide.md`
- [x] `wiki/13-local-urls-auth-dashboard.md`
- [x] `wiki/14-agent-checkpoint-current-state.md`
- [x] `frontend/AGENTS.md`
- [x] `frontend/CLAUDE.md`
- [x] `frontend/README.md`

---

## New Planned Work Backlog

### Foundation and platform configuration

#### P0 — Superadmin Settings Backbone

**Source:** `docs/pandamarket-enhancements-todo.md` §1

- [x] Create/extend database-backed `pd_platform_config` as the single source of truth.
- [x] Add typed `platform-config.service.ts` getters.
- [x] Build grouped admin settings API: `GET /api/pd/admin/settings`.
- [x] Build section update API: `PUT /api/pd/admin/settings/:section`.
- [x] Add Zod validation for every settings section.
- [x] Add audit-log entries for every admin setting change.
- [x] Add Redis cache and pub/sub invalidation for config updates.
- [x] Build tabbed Superadmin Settings UI with dirty-state warning and sticky save.
- [x] Cover branding: marketplace name, slogan, dark/light logo, favicon, OG image, colors, default/supported languages, RTL.
- [x] Cover contact/legal: support email/phone/WhatsApp/address/hours, terms, privacy, refund, cookie policy.
- [x] Cover commerce: currency, tax mode/default tax, rounding, free-plan commission, retention days, payout schedule, order splitting, auto-cancel unpaid window.
- [x] Cover payments: gateway toggles, sandbox mode, platform credentials, Mandat recipient information.
- [x] Cover shipping: carriers, zones, default rates.
- [x] Cover search/catalog: featured categories, default sort, hub homepage layout, banners.
- [x] Cover notifications: SMTP, SMS provider, push/WS toggles.
- [x] Cover security: lockout thresholds, password policy, 2FA enforcement, allowed custom-domain rules.
- [x] Cover feature flags: reviews, wishlist, AI tools, Page Builder, plugins marketplace, email marketing.
- [x] Cover integrations: GA4, GTM, Meta Pixel, Search Console, Cloudflare.
- [x] Consolidate plan settings under Superadmin Settings where appropriate.

#### P1 — Dual Logo Support

**Source:** `docs/pandamarket-enhancements-todo.md` §6

- [x] Add dark and light logo URLs for marketplace config (a image selectore from he image gallery).
- [x] Add dark and light logo URLs for stores (a image selectore from he image gallery).
- [x] Keep existing `logo_url` as fallback.
- [x] Add helper to select logo by light/dark context.
- [x] Update upload UI with previews on light and dark backgrounds.
- [x] Apply dual-logo logic to Hub header/footer, admin login/header, storefront themes, emails, and OG fallback.

#### P1 — Maintenance / Under-Construction Mode

**Source:** `docs/pandamarket-enhancements-todo.md` §10

- [x] Add marketplace-wide maintenance toggle with title/message/illustration/IP allow-list/ETA.
- [x] Add middleware handling for Hub maintenance with admin/health exceptions.
- [x] Add optional toggle to also block all vendor storefronts.
- [x] Add per-storefront maintenance status and page support.
- [ ] Default new stores to maintenance until seller publishes if business rule is approved.
- [x] Let sellers edit a Page Builder-driven maintenance page.
- [x] Ensure custom domains render the maintenance page correctly.

#### P1 — User Activity, Sessions, and Security Tracking

**Source:** `docs/pandamarket-enhancements-todo.md` §8

- [x] Add `pd_user_session` table.
- [x] Add `pd_user_login_event` table.
- [x] Track active sessions, login/logout/failure/password/2FA events.
- [x] Track recent IPs, device, user agent, and optional Geo-IP.
- [x] Add buyer/seller Security page with active sessions and recent login history.
- [x] Add revoke-session and revoke-all-other-sessions actions.
- [x] Add email alerts for new device/IP login.
- [ ] Add superadmin per-user activity timeline and anomaly flags.

### High-impact seller and buyer UX

#### P1 — Seller Orders Page Overhaul

**Source:** `docs/pandamarket-enhancements-todo.md` §7

- [x] Add advanced filters: status, payment, fulfillment, date range, customer, product, channel, country, payment method, has-dispute.
- [x] Add saved seller filter presets.
- [x] Add bulk actions: print labels, mark shipped, send tracking, export CSV/Excel.
- [x] Add inline quick-view drawer.
- [x] Add column visibility/order persistence.
- [x] Add detail timeline with created/paid/picked/shipped/delivered/refunded/disputed events.
- [x] Add customer card with previous orders and lifetime value.
- [x] Add shipping panel with carrier, tracking, label PDF, and delivery proof.
- [x] Add refund/partial-refund flow with reason codes.
- [x] Add notes and customer messages tabs.
- [x] Add print-friendly invoice and delivery slip.
- [x] Add stats strip for today/7d/30d revenue, AOV, refund rate, and fulfillment SLA.

#### P1 — Onboarding Wizard and Guided Tour

**Source:** `docs/pandamarket-enhancements-todo.md` §11

- [ ] Add first-time seller welcome modal.
- [ ] Guide through seller type, language, country.
- [ ] Guide through store basics: name, subdomain, logos, colors.
- [ ] Guide through theme picker.
- [ ] Prompt KYC upload.
- [ ] Prompt first product creation.
- [ ] Prompt payment and shipping configuration.
- [ ] Prompt store publishing.
- [ ] Persist progress in `pd_user.onboarding_state` JSONB.
- [ ] Add dashboard header progress until complete.
- [ ] Add accessible coachmarks/tooltips and replay from Help.
- [ ] Add lighter buyer onboarding on first login.
- [ ] Add first-visit tooltips for products, orders, wallet, AI tools, and Page Builder.

#### P1 — Seller Ticket / Support System

**Source:** `docs/pandamarket-enhancements-todo.md` §12

- [ ] Add `pd_ticket`, `pd_ticket_message`, `pd_ticket_attachment`, and `pd_ticket_event` tables.
- [ ] Support statuses: open, awaiting_seller, awaiting_admin, resolved, closed.
- [ ] Support categories: billing, KYC, payments, technical, abuse, feature request, other.
- [ ] Support priorities with admin override.
- [ ] Add seller dashboard ticket list, detail, create ticket, attachments, close rating.
- [ ] Add admin queue with filters, assignee, SLA timer, internal notes, canned responses, merge.
- [ ] Add email and WebSocket notifications for ticket updates.
- [ ] Evaluate reusing existing reports/case tables where reasonable.

#### P1 — Social Media Integrations and Auto-Posting

**Source:** `docs/pandamarket-enhancements-todo.md` §3 and §15

- [ ] Add store social profile settings for Facebook, Instagram, X, TikTok, YouTube, LinkedIn, WhatsApp, Telegram, Pinterest, Snapchat.
- [ ] Add marketplace social profile settings in superadmin settings.
- [ ] Store seller links under `store.settings.social` initially where possible.
- [ ] Add shared `SocialLinks` component for theme footers.
- [ ] Add Google Map embed support with strict CSP allow-list.
- [ ] Add `pd_social_account` table for encrypted platform credentials.
- [ ] Add `pd_social_post` table for post status and scheduling.
- [ ] Add `social-post` queue and worker.
- [ ] Enqueue auto-posting on `product.published` for enabled platforms.
- [ ] Add caption template editor with variables.
- [ ] Add social composer with FB/IG/X/LinkedIn previews.
- [ ] Add calendar view and drag-to-reschedule.
- [ ] Add CSV bulk import for posts.
- [ ] Add AI caption/hashtag/image-alt/best-time helper.
- [ ] Pull back per-post analytics where platform APIs allow.

#### P1 — Marketplace and Storefront Analytics / Meta / Tag Manager

**Source:** `docs/pandamarket-enhancements-todo.md` §4

- [ ] Add marketplace-level GA4, GTM, Meta Pixel, Search Console verification, hreflang, default OG settings.
- [ ] Inject marketplace analytics from server-side config in `frontend/src/app/layout.tsx`.
- [ ] Add per-store GA4, GTM, Meta Pixel, and sanitized custom head snippets.
- [ ] Inject store analytics only on storefront subdomain/custom-domain pages.
- [ ] Add strict allow-list sanitizer for custom head tags.
- [ ] Centralize event taxonomy in `frontend/src/lib/analytics.ts`.
- [ ] Track `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `sign_up`, and `search`.

#### P1 — Amazon/Alibaba-Style Hub Template

**Source:** `docs/pandamarket-enhancements-todo.md` §2

- [ ] Add a second prebuilt Hub homepage layout.
- [ ] Create `frontend/src/components/hub/templates/AlibabaTemplate/`.
- [ ] Add superadmin setting `hub.homepage.template = 'panda' | 'alibaba'`.
- [ ] Reuse existing Hub homepage data fetches and switch component only.
- [ ] Add utility bar with language, currency, ship-to, support.
- [ ] Add mega-category sidebar with hover panels.
- [ ] Add hero carousel.
- [ ] Add deals countdown strip.
- [ ] Add category tile grid.
- [ ] Add trending horizontal scroll.
- [ ] Add top sellers spotlight.
- [ ] Add sponsored brands rail.
- [ ] Add recently viewed via cookie/localStorage.
- [ ] Add placeholder hook for future personalized recommendations.
- [ ] Add footer mega-grid.
- [ ] Normalize all images with `normalizePublicAssetUrl` and use `next/image` where possible.

### Platform extensions and paid services

#### P2 — Header Styles and Mega Menu Variants

**Source:** `docs/pandamarket-enhancements-todo.md` §16

- [ ] Add header variants: classic, centered, split, minimal, transparent-overlay, sticky-condensed.
- [ ] Add mega menu with category groups, featured product/banner slot, promo strip, and mobile bottom sheet.
- [ ] Make header/mega-menu configurable in Theme Customizer.

#### P2 — Secure Theme / Template Import and Export

**Source:** `docs/pandamarket-enhancements-todo.md` §17

- [ ] Export store theme, customizations, Page Builder pages, and assets as signed `.pmtheme` archive.
- [ ] Import with signature validation and version compatibility checks.
- [ ] Sanitize imported HTML/CSS/JS with an allow-list.
- [ ] Add preview before applying imports.
- [ ] Add private seller template library.
- [ ] Add `pd_seller_template` table if required.

#### P2 — Vendor API Keys Page Enhancements

**Source:** `docs/pandamarket-enhancements-todo.md` §9

- [ ] Show key name, prefix/last four, scopes, created date, last used date, last IP.
- [ ] Show request count for 24h/7d/30d.
- [ ] Add per-key rate-limit tier.
- [ ] Add per-key scopes.
- [ ] Add rotate/revoke confirmation flow.
- [ ] Add optional IP allow-list.
- [ ] Surface webhook secret management.
- [ ] Add authenticated Open API Reference shortcut to `/api/docs`.
- [ ] Add curl, Node, and Python snippets for common endpoints.

#### P2 — Email Marketing Paid Add-On

**Source:** `docs/pandamarket-enhancements-todo.md` §14

- [ ] Add dashboard Add-ons / Paid Services section.
- [ ] Define add-on billing model independent from base subscription.
- [ ] Add audiences: store buyers, newsletter opt-ins, custom segments.
- [ ] Add email templates with drag-and-drop or MJML-like editor.
- [ ] Add campaigns: one-shot and recurring.
- [ ] Add automations: welcome, abandoned cart, post-purchase, win-back.
- [ ] Add deliverability dashboard: sent/opened/clicked/bounced/complained.
- [ ] Add per-store sending domain and DKIM/SPF setup wizard.
- [ ] Add tables: `pd_email_audience`, `pd_email_template`, `pd_email_campaign`, `pd_email_send`, `pd_email_event`.
- [ ] Add separate `email-marketing.worker.ts`.
- [ ] Add unsubscribe, GDPR consent tracking, and suppression list.

#### P2 — Plugin Mechanism and Plugin Marketplace

**Source:** `docs/pandamarket-enhancements-todo.md` §13

- [ ] Design plugin manifest (`plugin.json`) with id, name, version, author, scopes, hooks, settings schema, UI entry points.
- [ ] Implement sandboxed runtime with capability-based API and no direct DB access.
- [ ] Decide frontend plugin loading strategy with CSP-safe signed bundles.
- [ ] Add initial hooks: product before/after, order paid/shipped, checkout before payment, dashboard menu, product editor tab, storefront footer.
- [ ] Add tables: `pd_plugin`, `pd_plugin_version`, `pd_plugin_install`, `pd_plugin_review`.
- [ ] Add plugin submission and admin review flow.
- [ ] Add seller browse/install/configure/enable/disable/uninstall flow.
- [ ] Add free vs paid plugin model.
- [ ] Add audit logs for every plugin lifecycle action.
- [ ] Add Ed25519 bundle signing and global kill-switch.

#### P2 — Cloudflare CDN and DNS Integration

**Source:** `docs/pandamarket-enhancements-todo.md` §5

- [ ] Document Cloudflare in front of Caddy with Full Strict SSL.
- [ ] Add cache rules: bypass `/api/pd/*`, cache `_next/static`, product images, themes.
- [ ] Define Page Rules/Workers for SaaS custom domains.
- [ ] Optionally automate vendor custom-domain DNS/SSL bootstrap through Cloudflare API.
- [ ] Store Cloudflare token via Docker Secrets.

#### P2 — Custom Template Service Request

**Source:** `docs/pandamarket-enhancements-todo.md` §18

- [ ] Add dashboard form for template service brief, references, budget, deadline, preferred contact.
- [ ] Create a special ticket category `custom_template`.
- [ ] Add admin quote workflow: send quote, seller accepts, invoice, kickoff.

### Strategic add-ons

#### P2 — Two-Factor Authentication

**Source:** `docs/pandamarket-enhancements-todo.md` §19

- [ ] Add TOTP support.
- [ ] Add WebAuthn/passkey support.
- [ ] Add recovery codes.
- [ ] Add trusted devices.
- [ ] Add role-based enforcement through platform settings.
- [ ] Add step-up authentication for payouts, payment config, and plugin installs.

#### P2 — Customer Support Live Chat on Storefronts

**Source:** `docs/pandamarket-enhancements-todo.md` §20

- [ ] Add per-store live chat widget reusing existing chat tables.
- [ ] Add office hours and away message.
- [ ] Auto-create support ticket when seller is offline.

#### P2 — Loyalty and Referral Program

**Source:** `docs/pandamarket-enhancements-todo.md` §21

- [ ] Add points per purchase.
- [ ] Add loyalty tiers and rewards.
- [ ] Add referral codes with double-sided incentives.
- [ ] Add per-store and marketplace-wide toggles.

#### P2 — Returns and RMA Workflow

**Source:** `docs/pandamarket-enhancements-todo.md` §22

- [ ] Let buyers request returns.
- [ ] Let sellers approve/reject returns.
- [ ] Add return label workflow.
- [ ] Add refund/replacement path.
- [ ] Connect RMA to order detail and support tickets.

#### P2 — Inventory and Multi-Warehouse

**Source:** `docs/pandamarket-enhancements-todo.md` §23

- [ ] Add multiple stock locations per store.
- [ ] Add low-stock thresholds and reorder points.
- [ ] Add supplier notes.
- [ ] Add bulk inventory CSV/XLSX import/export.

#### P2 — Promotions and Discounts Engine

**Source:** `docs/pandamarket-enhancements-todo.md` §24

- [ ] Add coupons.
- [ ] Add automatic discounts.
- [ ] Add BOGO, bundles, tiered pricing, customer-group pricing.
- [ ] Add stackability and expiry rules.
- [ ] Add marketplace-wide promotions with seller opt-in.

#### P2 — Reviews Moderation and Photo Reviews

**Source:** `docs/pandamarket-enhancements-todo.md` §25

- [ ] Add image/video attachments to reviews.
- [ ] Add AI-assisted moderation for toxicity and fake-review heuristics.
- [ ] Make verified-purchase badge explicit.

#### P2 — Search Improvements

**Source:** `docs/pandamarket-enhancements-todo.md` §26

- [ ] Add FR/AR/EN synonyms.
- [ ] Tune typo tolerance.
- [ ] Add personalized ranking.
- [ ] Add seller search analytics dashboard.
- [ ] Track queries leading to seller products and zero-result queries.

#### P2 — PWA and Mobile App Shell

**Source:** `docs/pandamarket-enhancements-todo.md` §27

- [ ] Make Hub PWA-installable.
- [ ] Make storefronts PWA-installable.
- [ ] Add WebPush subscriptions on login.

#### P2 — Accessibility and Localization Audit

**Source:** `docs/pandamarket-enhancements-todo.md` §28

- [ ] Run WCAG 2.2 AA audit on Hub.
- [ ] Run WCAG 2.2 AA audit on seller dashboard.
- [ ] Run WCAG 2.2 AA audit on admin dashboard.
- [ ] Audit full FR/AR/EN translation coverage.
- [ ] Audit RTL behavior on every theme.

#### P2 — Observability Upgrades

**Source:** `docs/pandamarket-enhancements-todo.md` §29

- [ ] Add per-tenant metrics dashboards.
- [ ] Surface trace IDs in error pages and admin tools.
- [ ] Add synthetic checks for checkout and login.

#### P2 — Backup, Disaster Recovery, and Data Export

**Source:** `docs/pandamarket-enhancements-todo.md` §30

- [ ] Add per-tenant data export for portability/GDPR.
- [ ] Schedule off-site backups.
- [ ] Run and document restore drills.
- [ ] Document point-in-time recovery.

#### P2 — Compliance Center

**Source:** `docs/pandamarket-enhancements-todo.md` §31

- [ ] Add data subject request workflow.
- [ ] Add consent log.
- [ ] Add cookie banner configuration through platform settings.
- [ ] Add DPA download page.
- [ ] Add processor list page.

#### P2 — Developer Portal

**Source:** `docs/pandamarket-enhancements-todo.md` §32

- [ ] Add public documentation site for API.
- [ ] Add plugin SDK documentation.
- [ ] Add sandbox tenant generator for partners.

#### P2 — AI Assistant in Dashboard

**Source:** `docs/pandamarket-enhancements-todo.md` §33

- [ ] Add sidebar AI helper in dashboard.
- [ ] Support prompts for product listing quality, policy writing, and sales analysis.
- [ ] Reuse Gemini integration.
- [ ] Respect AI credits and quotas.

### Technical debt and documentation

#### P2 — Refactor and Tech Debt Watchlist

**Source:** `docs/pandamarket-enhancements-todo.md` §34

- [ ] Standardize storefront images to `next/image` with `normalizePublicAssetUrl`.
- [ ] Centralize PostgreSQL numeric-to-number coercion helper.
- [ ] Extract repeated dashboard layout primitives into `@/components/dashboard/*`.
- [ ] Add `docs/adr/` for architectural decision records.

#### P2 — Documentation Maintenance

**Source:** `docs/pandamarket-enhancements-todo.md`, `docs/pandamarket-deep-documentation-brief.md`, wiki docs

- [ ] Update `docs/pandamarket-deep-documentation-brief.md` when major features ship.
- [ ] Update wiki pages when APIs, setup, or operational flows change.
- [ ] Update AI instruction docs when product behavior changes materially.
- [ ] Mark stale roadmap/audit rows clearly or archive them to reduce confusion.
- [ ] Keep migration counts and API route counts synchronized with actual code.

---

## Suggested Execution Order

1. **Build foundation settings**
   - Superadmin Settings Backbone, dual logos, maintenance mode, user sessions/security tracking.
2. **Improve seller operations**
   - Orders overhaul, onboarding wizard, ticket/support system.
3. **Add growth/integration features**
   - Social integrations/scheduler, analytics/meta tags, Alibaba-style Hub template.
4. **Add platform extensions**
   - API key improvements, theme import/export, header/mega-menu variants, email marketing, plugin marketplace.
5. **Schedule strategic add-ons by quarter**
   - 2FA, live chat, loyalty, RMA, multi-warehouse, promotions, PWA, compliance, developer portal, dashboard AI assistant.

---

## Validation Baseline for Future Work

- [ ] Backend TypeScript: `npm run type-check` from `backend`.
- [ ] Frontend TypeScript: `./node_modules/.bin/tsc.cmd --noEmit --types vitest/globals,node --pretty false` from `frontend`.
- [ ] Focused ESLint for touched backend/frontend files.
- [ ] Focused Vitest/Playwright tests for the changed flow.
- [ ] `git diff --check` for touched files.
- [ ] Explicit trailing-whitespace check for new/untracked files.
- [ ] Manual browser QA for UI-heavy or Page Builder changes.

---

## Notes on Stale or Superseded Docs

- `AUDIT_REPORT.md` is documented as outdated and should not drive current planning.
- Root `README.md` roadmap rows are documented as stale.
- Older rows in `implementation_plan.md`, `tasklist.md`, and `todo.md` include completed MVP/post-MVP items; use their latest sections only as historical context.
- `ai instructions/roadmap.md` and some original specs describe the intended product from 2026-05-02, but many items are already implemented according to newer handoffs and actual code.
