# PandaMarket Enhancements & Post-MVP TODO

> **Status:** Backlog of platform enhancements beyond the current MVP.
> **Source:** User-provided ideas (2026-05-12) + agent-suggested follow-ups.
> **Authoritative current state:** see `docs/pandamarket-deep-documentation-brief.md`.
> **Rule:** Each item below should ship as an isolated, scoped change with its own validation. Do not bundle unrelated features.

---

## Legend

- **Priority:** P0 (foundation, blocks others) · P1 (high impact) · P2 (nice to have).
- **Effort:** S (≤1 day) · M (2–5 days) · L (1–2 weeks) · XL (>2 weeks).
- **Scope:** BE (backend) · FE (frontend) · DB (migration) · OPS (infra) · DOC.

---

## 1. Superadmin Dashboard — Make the Marketplace Fully Configurable

**Goal:** Move every hardcoded marketplace setting into a database-backed `pd_platform_config` (or extend the existing one) and expose it through a structured Superadmin Settings UI.

**Priority:** P0 · **Effort:** L · **Scope:** BE + FE + DB

### 1.1 Settings domains to cover
- **Branding**
  - Marketplace name, slogan, dark logo, light logo, favicon, OG image.
  - Primary/secondary colors, accent, CTA color.
  - Default language, supported languages, default locale, RTL flag.
- **Contact & legal**
  - Support email, support phone, WhatsApp, address, business hours.
  - Terms, Privacy, Refund policy, Cookie policy (Markdown editor).
- **Commerce**
  - Default currency, currency symbol, tax mode, default tax %, rounding rule.
  - Free-plan commission %, default retention days, payout schedule.
  - Order splitting toggle, auto-cancel-unpaid window.
- **Payments**
  - Per-gateway enable/disable, sandbox toggle, credentials, retention days.
  - Mandat recipient info (name, RIB, bank, branch, instructions).
- **Shipping**
  - Default carrier, available carriers, shipping zones, default rates.
- **Search & catalog**
  - Featured categories, default sort, hub homepage layout, banners.
- **Notifications**
  - SMTP config (already exists, surface it here).
  - SMS provider config.
  - Push/WS toggles.
- **Security**
  - Login lockout thresholds, password policy, 2FA enforcement per role.
  - Allowed domains for vendor custom domains.
- **Feature flags**
  - Reviews, wishlist, AI tools, Page Builder, plugins marketplace, email marketing, etc.
- **Maintenance**
  - Marketplace under-construction toggle (see §10).
- **Integrations**
  - Google Analytics ID, GTM ID, Meta Pixel, Search Console verification, Cloudflare account.
- **Plans**
  - Already exists; consolidate under Settings.

### 1.2 Implementation notes
- Single source of truth: `pd_platform_config` keyed by `key` (string) + `value` (JSONB).
- Backend service: `platform-config.service.ts` with typed getters.
- Frontend: tabbed settings layout with sticky save, dirty-state warning, audit-log entry per change.
- All writes pass through Zod validation + audit middleware.
- Cache in Redis with pub/sub invalidation on update.
- Add `GET /api/pd/admin/settings` (grouped) + `PUT /api/pd/admin/settings/:section`.

---

## 2. New Amazon/Alibaba-Style Hub Template

**Goal:** Add a second pre-built hub homepage layout that the superadmin can switch between (current Hub layout vs. new template) from §1.

**Priority:** P1 · **Effort:** M · **Scope:** FE

### 2.1 Sections
- Top utility bar (language, currency, ship-to, support).
- Mega-category sidebar with hover panels (Amazon-style).
- Hero carousel with full-bleed banners.
- "Deals of the day" countdown strip.
- Category tile grid (image-backed).
- Trending now (horizontal scroll, lazy-load).
- Top sellers spotlight.
- Sponsored brands rail.
- Recently viewed (cookie/localStorage).
- Personalized recommendations (placeholder hook for future ML).
- Footer mega-grid (help, sell, payments, social).

### 2.2 Implementation notes
- New component tree: `frontend/src/components/hub/templates/AlibabaTemplate/`.
- Driven by superadmin setting `hub.homepage.template = 'panda' | 'alibaba'`.
- Reuse existing data fetch in `frontend/src/app/hub/page.tsx`; switch component only.
- All images via `normalizePublicAssetUrl` and `next/image` where possible.

---

## 3. Social Media Integrations & Auto-Posting

**Priority:** P1 · **Effort:** L · **Scope:** BE + FE + DB + Worker

### 3.1 Storefront footer & profile
- Seller can add: Facebook, Instagram, X/Twitter, TikTok, YouTube, LinkedIn, WhatsApp, Telegram, Pinterest, Snapchat.
- Same for marketplace (superadmin in §1).
- Stored under `store.settings.social` (JSON).
- Theme footers render available links via shared `<SocialLinks />` component.

### 3.2 Google Map embed
- Storefront setting: address + lat/lng OR raw embed URL.
- Render via iframe with strict CSP allow-list.

### 3.3 Auto-post on product publish
- Per-store toggle: "Auto-share new products on social media".
- Per-platform credentials (encrypted with AES-256-GCM):
  - Facebook Page token + page ID.
  - Instagram business account ID + token.
  - X/Twitter API keys.
  - LinkedIn token.
  - TikTok (where API allows).
- New table `pd_social_account` (vendor_id, store_id, platform, encrypted_credentials, status, last_used_at).
- New table `pd_social_post` (id, store_id, platform, status, scheduled_at, posted_at, external_post_id, error, payload).
- New BullMQ queue/worker `social-post`.
- Subscriber on `product.published` event → enqueue post per enabled platform.
- Template editor for caption (with variables: `{title}`, `{price}`, `{link}`, `{store}`).

### 3.4 Scheduled posts & AI assist (see also §14)
- UI to compose post, attach media, pick platforms, schedule date/time.
- AI helper: generate caption + hashtags from product or free prompt (Gemini).
- Calendar view (month/week) of scheduled posts.

---

## 4. Google Analytics, Meta Tags & Tag Manager

**Priority:** P1 · **Effort:** M · **Scope:** FE + BE

### 4.1 Marketplace level
- Superadmin enters GA4 ID, GTM ID, Meta Pixel, Search Console verification, hreflang, default OG.
- Injected once in `frontend/src/app/layout.tsx` via server component reading config.

### 4.2 Storefront level
- Per-store fields: GA4 ID, GTM ID, Meta Pixel, custom `<head>` snippet (sanitized allow-list of tags only).
- Injected only on storefront subdomain/custom domain pages — never on Hub.
- Strict sanitization to prevent XSS; document allowed tags in §23 of brief.

### 4.3 Event taxonomy
- Standard events: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `sign_up`, `search`.
- Centralize in `frontend/src/lib/analytics.ts`.

---

## 5. Cloudflare CDN & DNS Integration

**Priority:** P2 · **Effort:** M · **Scope:** OPS + BE

- Document Cloudflare in front of Caddy (proxy mode, "Full (strict)" SSL).
- Cache rules: bypass `/api/pd/*`, cache `_next/static`, `pd-product-images`, `pd-themes`.
- Page Rules / Workers for vendor custom domain SaaS pattern.
- Optional: Cloudflare API integration so superadmin can add a vendor custom domain and we automate DNS + SSL bootstrap.
- Add `cloudflare.token` to Docker Secrets, never to repo env.

---

## 6. Dual Logo (Dark / Light) for Marketplace and Storefronts

**Priority:** P1 · **Effort:** S · **Scope:** BE + FE + DB

- DB: add `logo_dark_url`, `logo_light_url` columns to platform config and `pd_store`.
- Keep existing `logo_url` as backward-compatible fallback.
- Frontend helper `pickLogo({ dark, light, fallback }, mode)`:
  - If both provided → pick by current theme mode.
  - If only one provided → use it for both modes.
- Update upload UI to accept both with previews on dark and light backgrounds.
- Apply to: Hub header, Hub footer, admin login/header, storefront themes, emails, OG image fallback.

---

## 7. Seller Orders Page Overhaul

**Priority:** P1 · **Effort:** M · **Scope:** FE + BE

### 7.1 List view
- Filters: status, payment status, fulfillment status, date range, customer, product, channel, country, payment method, has-dispute.
- Saved filter presets per seller.
- Bulk actions: print labels, mark as shipped, send tracking, export CSV/Excel.
- Inline quick view (drawer) without leaving list.
- Column visibility & order persistence.

### 7.2 Detail view
- Timeline (created, paid, picked, shipped, delivered, refunded, disputed) with audit entries.
- Customer card with previous orders & lifetime value.
- Shipping panel with carrier, tracking, label PDF, delivery proof.
- Refund/partial refund flow with reason codes.
- Notes (internal) & messages (to customer) tabs.
- Print-friendly invoice + delivery slip.

### 7.3 Stats strip
- Today / 7d / 30d revenue, AOV, refund rate, fulfillment SLA.

---

## 8. User Activity & Security Tracking

**Priority:** P1 · **Effort:** M · **Scope:** BE + FE + DB

### 8.1 Sessions & login history
- New table `pd_user_session` (id, user_id, ip, user_agent, device, geo_country, geo_city, created_at, last_seen_at, revoked_at).
- New table `pd_user_login_event` (id, user_id, type [login|logout|failed|password_change|2fa], ip, user_agent, created_at, metadata).
- Capture last 5 (configurable) IPs per user with timestamps.
- Geo-IP lookup via local MaxMind DB or Cloudflare headers.

### 8.2 Buyer & seller dashboards
- "Security" page: active sessions (revoke each / revoke all others), recent logins, recent IPs, suspicious activity warnings.
- Email alert on new device/IP login.

### 8.3 Superadmin
- Per-user activity timeline.
- Anomaly flags (impossible travel, repeated failed logins, password spraying).

---

## 9. Vendor API Keys Page Enhancements

**Priority:** P2 · **Effort:** S · **Scope:** FE + BE

- Show: key name, prefix (last 4), scopes, created_at, last_used_at, last_ip, request count (24h/7d/30d), rate-limit tier.
- Per-key scopes (read products, write products, read orders, write orders, webhooks, files).
- Rotate / revoke buttons with confirmation.
- Per-key IP allow-list (optional).
- Webhook secrets management surfaced here.
- Embedded "Open API Reference" button → opens Swagger UI (`/api/docs`) authenticated with the seller's key in a new tab.
- Code snippets (curl, Node, Python) for top endpoints.

---

## 10. Maintenance / Under-Construction Mode

**Priority:** P1 · **Effort:** M · **Scope:** BE + FE + DB

### 10.1 Marketplace-wide
- Superadmin toggle: `marketplace.maintenance.enabled`, custom title/message/illustration, allow-list of IPs/roles (admins always pass), ETA.
- Middleware short-circuits all hub routes (except `/login/admin`, `/api/pd/admin/*`, health) to a 503 maintenance page.

### 10.2 Marketplace + all storefronts
- Separate toggle to also block vendor subdomains.

### 10.3 Per-storefront
- Each store has `status: draft | maintenance | published | suspended`.
- New stores default to `maintenance` until seller publishes.
- Seller can edit a Page Builder-driven maintenance page (logo, message, countdown, social, mailing list opt-in).
- Custom domains continue to resolve, render maintenance page.

### 10.4 Implementation
- DB: extend `pd_store.status` enum + add `pd_store.maintenance_page_id` (FK to `pd_store_page`).
- Middleware checks status before rendering storefront routes.

---

## 11. Onboarding Wizard & Step-by-Step Guide

**Priority:** P1 · **Effort:** M · **Scope:** FE

- First-time seller flow on dashboard load:
  1. Welcome modal → choose seller type, language, country.
  2. Store basics → name, subdomain, logo (light/dark), colors.
  3. Theme picker.
  4. KYC upload prompt.
  5. Add first product.
  6. Configure payment & shipping.
  7. Publish store.
- Persistent progress bar in dashboard header until completed.
- Coachmark/tooltip tour using a tiny library (e.g., `driver.js` or custom React component) — keyboard accessible, dismissible, replayable from Help menu.
- Per-step state stored in `pd_user.onboarding_state` (JSONB).
- Same pattern (lighter) for buyers on first login.
- Tooltips also for first visit to: products list, orders, wallet, AI tools, Page Builder.

---

## 12. Seller Ticket / Support System

**Priority:** P1 · **Effort:** M · **Scope:** BE + FE + DB

- New tables: `pd_ticket`, `pd_ticket_message`, `pd_ticket_attachment`, `pd_ticket_event`.
- Statuses: open, awaiting_seller, awaiting_admin, resolved, closed.
- Categories: billing, KYC, payments, technical, abuse, feature request, other.
- Priorities: low/normal/high/urgent (admin-only override).
- Seller dashboard: list, detail, new ticket, attach files, ratings on close.
- Admin dashboard: queue with filters, assignee, SLA timer, internal notes, canned responses, merge tickets.
- Email + WS notifications on updates.
- Optional: integrate with existing case/report system to avoid duplicates — share core tables if reasonable.

---

## 13. Plugin Mechanism & Plugin Marketplace

**Priority:** P2 · **Effort:** XL · **Scope:** BE + FE + DB + OPS

### 13.1 Plugin model
- Plugins are scoped extensions (server hooks + optional UI panels) — NOT arbitrary code execution.
- Manifest (`plugin.json`): id, name, version, author, scopes, hooks, settings schema (Zod-compatible), UI entry points.
- Sandboxed runtime: execute plugin server logic in a worker thread with capability-based API (no direct DB access; only allowed RPCs).
- Frontend plugins load as remote React components via Module Federation or signed bundles, gated by CSP.

### 13.2 Hooks (initial)
- `product.beforeCreate`, `product.afterPublish`.
- `order.afterPaid`, `order.afterShipped`.
- `checkout.beforePayment`.
- `dashboard.menu`, `dashboard.productEditor.tab`, `storefront.footer`.

### 13.3 Marketplace
- New tables: `pd_plugin`, `pd_plugin_version`, `pd_plugin_install`, `pd_plugin_review`.
- Submission flow: developer uploads bundle → automated checks (size, manifest, signature, secrets scan) → admin manual review → publish.
- Sellers browse, install, configure, enable/disable per store, uninstall.
- Free vs paid plugins (revenue share with platform).
- Audit log on every install/enable/disable/config change.

### 13.4 Security
- Signed bundles only (Ed25519).
- Strict permission scopes shown at install time.
- Kill-switch (admin can disable a plugin globally).

---

## 14. Email Marketing — Paid Add-on Service

**Priority:** P2 · **Effort:** L · **Scope:** BE + FE + DB

- New "Add-ons / Paid Services" section in dashboard with billing model independent from base subscription.
- Email Marketing module:
  - Audiences (buyers of a store, opted-in newsletter, custom segments).
  - Templates (drag-and-drop or MJML-based).
  - Campaigns (one-shot, recurring).
  - Automations (welcome, abandoned cart, post-purchase, win-back).
  - Deliverability dashboard (sent, opened, clicked, bounced, complained).
  - Per-store sending domain + DKIM/SPF setup wizard.
- Tables: `pd_email_audience`, `pd_email_template`, `pd_email_campaign`, `pd_email_send`, `pd_email_event`.
- Worker: `email-marketing.worker.ts` (separate from transactional email worker).
- Compliance: unsubscribe links, GDPR consent tracking, suppression list.

---

## 15. Social Media Scheduler with AI (consolidated with §3)

**Priority:** P1 · **Effort:** M · **Scope:** FE + BE

- See §3 for foundation. This section adds the dedicated UI:
  - Composer with platform-specific previews (FB, IG, X, LinkedIn).
  - Calendar view, drag to reschedule.
  - Bulk import (CSV) of posts.
  - AI assistant: caption generator, hashtag suggester, image alt-text generator, best-time-to-post suggestion.
  - Per-post analytics pulled back from each platform (where API permits).

---

## 16. Header Styles & Mega Menu Variants

**Priority:** P2 · **Effort:** M · **Scope:** FE

- Add header variants per theme: `classic`, `centered`, `split`, `minimal`, `transparent-overlay`, `sticky-condensed`.
- Mega menu component:
  - Multi-column with category groups.
  - Featured product/banner slot.
  - Promo strip.
  - Mobile bottom-sheet variant.
- Configurable in Theme Customizer (extend `ThemeCustomization`).

---

## 17. Secure Theme/Template Import & Export

**Priority:** P2 · **Effort:** M · **Scope:** BE + FE + DB

- Export: a store theme + customization + Page Builder pages → signed `.pmtheme` archive (JSON + assets).
- Import: validate signature, version compatibility, sanitize HTML/CSS/JS (allow-list), preview before applying.
- Sellers can save private themes to "My Templates" library and reuse across their stores.
- Optional marketplace later (tied to §13 plugin marketplace).
- Tables: `pd_seller_template` (id, owner_user_id, name, version, manifest, asset_count, signature, created_at).

---

## 18. Custom Template Service Request

**Priority:** P2 · **Effort:** S · **Scope:** FE + BE

- Form in dashboard: brief, references, budget range, deadline, preferred contact.
- Creates a special ticket in §12 with category `custom_template`.
- Admin queue with quoting workflow (send quote → seller accepts → invoice → kickoff).

---

# Agent-Suggested Additional Improvements

The following ideas are not in the original list but cleanly extend the platform.

## 19. Two-Factor Authentication (TOTP + WebAuthn)

- Enforce per role from §1 settings.
- Recovery codes, trusted devices, step-up auth on sensitive actions (payouts, payment config, plugin install).

## 20. Customer Support Live Chat (Storefront-side)

- Per-store live chat widget reusing the existing chat tables.
- Office hours, away message, automatic ticket creation when offline.

## 21. Loyalty & Referral Program

- Points per purchase, tiers, rewards, referral codes with double-sided incentives.
- Per-store toggle, marketplace-wide toggle.

## 22. Returns & RMA Workflow

- Buyer requests return → seller approves → return label → refund/replacement.
- Tied to orders detail (§7) and tickets (§12).

## 23. Inventory & Multi-Warehouse

- Multiple stock locations per store.
- Low-stock thresholds (already partially exists), reorder points, supplier notes.
- Bulk inventory import/export (CSV, XLSX).

## 24. Promotions & Discounts Engine

- Coupons, automatic discounts, BOGO, bundle deals, tiered pricing, customer-group pricing.
- Stackability rules and expiry.
- Marketplace-wide superadmin promos (e.g., "Tunisian National Day sale") that seller stores can opt in.

## 25. Reviews Moderation & Photo Reviews

- Allow image/video attachments in reviews.
- AI-assisted moderation (toxicity, fake-review heuristics).
- Verified-purchase badge already implied — make explicit.

## 26. Search Improvements

- Synonyms (FR/AR/EN), typo tolerance tuning, personalized ranking.
- Search analytics dashboard for sellers (queries leading to their products, zero-result queries).

## 27. PWA & Mobile App Shell

- Make hub + storefront PWA-installable.
- Push notifications via WebPush (subscribe on login).

## 28. Accessibility & Localization Audit

- WCAG 2.2 AA pass on hub, dashboard, admin.
- Full translation coverage audit (FR/AR/EN), RTL pass on every theme.

## 29. Observability Upgrades

- Per-tenant metrics dashboards.
- Trace IDs surfaced in error pages and admin tools.
- Synthetic checks on checkout and login.

## 30. Backup, DR & Data Export

- Per-tenant data export (GDPR / portability).
- Scheduled off-site backups with restore drills.
- Point-in-time recovery documented.

## 31. Compliance Center

- GDPR/Tunisian data law: data subject requests, consent log, cookie banner config in §1.
- DPA download, processor list page.

## 32. Developer Portal

- Public docs site for API + plugin SDK.
- Sandbox tenant generator for partners.

## 33. AI Assistant in Dashboard (Cross-Cutting)

- Sidebar AI helper: "What's wrong with this product listing?", "Write me a return policy", "Why did sales drop last week?".
- Reuses Gemini integration; respects credits/quotas.

## 34. Refactor & Tech Debt Watchlist

- Standardize all storefront `<img>` to `next/image` with `normalizePublicAssetUrl`.
- Centralize PG numeric → number coercion in a shared helper.
- Extract repeated dashboard layout primitives into `@/components/dashboard/*`.
- Add an architectural decision record (ADR) folder under `docs/adr/`.

---

# Suggested Execution Order

1. **Foundation (P0)**
   - §1 Superadmin settings backbone.
   - §6 Dual logos.
   - §10 Maintenance mode.
   - §8 Activity & sessions.
2. **High-impact UX (P1)**
   - §7 Orders overhaul.
   - §11 Onboarding wizard.
   - §12 Ticket system.
   - §3/§15 Social integrations + scheduler.
   - §4 Analytics/meta tags.
   - §2 Alibaba template.
3. **Platform extensions (P2)**
   - §16 Header & mega menu.
   - §17 Theme import/export.
   - §9 API keys page polish.
   - §14 Email marketing add-on.
   - §13 Plugin marketplace.
   - §5 Cloudflare integration.
   - §18 Custom template service.
4. **Strategic add-ons** (§19–§34) scheduled per quarter based on business priorities.

---

# Cross-Cutting Rules (apply to every item above)

- **Database:** new tables use `pd_` prefix; FK columns use `VARCHAR(64)`; add indexes for any column used in WHERE/ORDER BY.
- **Backend:** raw parameterized SQL only; Zod validation; `asyncHandler`; audit-logged for admin/seller writes; tenant isolation enforced.
- **Frontend:** use `fetchWithCsrf`; respect Hub vs storefront routing separation; use shared theme/cart helpers; never hardcode marketplace branding (use settings from §1).
- **Security:** secrets via Docker Secrets; encrypted credentials via AES-256-GCM; rate-limit new endpoints; CSP-safe injections for user-provided HTML/JS.
- **Testing:** add Vitest unit tests for services, Playwright E2E for any new user flow, k6 script for any new high-traffic endpoint.
- **Docs:** update `docs/pandamarket-deep-documentation-brief.md`, the wiki, and AI instructions when a feature ships.
