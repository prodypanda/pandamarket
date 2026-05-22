# PandaMarket Important Implementation Plan TODO

**Purpose:** This is the main current-state implementation plan for PandaMarket after the Windsurf to Antigravity migration review. Use it before starting new feature work.

**Status date:** 2026-05-18

**Scope of this file:**
- Verifies the real code progress of the highest-priority pending features.
- Separates already implemented work from still-missing work.
- Keeps one consolidated list of additional missing feature groups.
- Does not authorize implementation by itself; wait for explicit user confirmation before coding.

**Primary rule:** Prefer actual code state over older roadmap checkboxes. Several older docs are stale or partially superseded.

---

## Current verified priority order

1. **P1 — Finish Onboarding Wizard / Guided Tour**
2. **P1 — Build Seller/Admin Support Ticket System**
3. **P1 — Build full Social Media Integrations / Auto-posting**
4. **P1 — Complete Storefront Analytics and Tracking Taxonomy**
5. **P1 — Expand Hub Templates toward Alibaba/Amazon-style marketplace UX**
6. **P2+ — Additional missing feature groups** listed later in this file

---

## 1. P1 — Onboarding Wizard / Guided Tour

**Real status:** Partially implemented. The backend persistence foundation and first seller-dashboard surfaces exist, but the full guided wizard/tour is not finished.

### Implemented / advancement verified in code

- Backend onboarding step IDs exist in `backend/src/api/auth.route.ts`:
  - `welcome`
  - `store_basics`
  - `theme`
  - `kyc`
  - `first_product`
  - `payment_shipping`
  - `publish_store`
  - `buyer_welcome`
- Backend endpoints exist:
  - `GET /api/pd/auth/onboarding`
  - `PATCH /api/pd/auth/onboarding`
- Progress is stored in `pd_user.onboarding_state` as JSONB and updated with `jsonb_set`.
- Frontend helper exists in `frontend/src/lib/onboarding.ts`:
  - `fetchOnboardingState()`
  - `updateOnboardingStep()`
- Seller dashboard loads onboarding state and shows a welcome modal/checklist when needed.
- Seller dashboard computes launch-readiness steps from current store/product/payment/KYC state.
- Settings page has a real Store basics onboarding card with progress for:
  - store name
  - subdomain
  - logos
  - colors
- Saving store settings updates `store_basics` onboarding metadata.
- Theme customization save can also update `store_basics` completion when colors become complete.
- Seller type and language controls exist inside settings, but they are not a dedicated wizard step.

### Still missing / not finished

- No dedicated multi-step onboarding wizard page or route.
- No route/state machine that advances sellers through every step in order.
- Store basics exists as an embedded settings card, not a complete guided step with next/back/skip behavior.
- Theme picker exists in settings, but choosing a theme does not appear to persist the separate `theme` onboarding step.
- KYC, first product, payment/shipping, and publish-store steps are detected from existing product state but are not implemented as guided wizard steps.
- No buyer onboarding UI for `buyer_welcome` despite the backend step ID existing.
- No coachmark/tour overlay system for dashboard features.
- No persistent onboarding progress header across seller dashboard pages beyond current dashboard/settings surfaces.
- No clear publish-store guided flow tying verification, maintenance mode, products, shipping, and payment readiness together.
- No centralized onboarding checklist component shared across dashboard pages.
- No tests covering onboarding persistence and UI flow.

### Recommended next implementation slice

Build the **Store basics guided step** first because the data model and settings form already exist. Then connect it to a reusable wizard shell and mark `theme`, `kyc`, `first_product`, `payment_shipping`, and `publish_store` as real guided steps.

---

## 2. P1 — Seller/Admin Support Ticket System

**Real status:** Not implemented as a true support ticket system. Some adjacent systems exist, especially reports/moderation and chat-related infrastructure, but there is no support-ticket product flow.

### Implemented / related foundation verified

- Admin report/moderation routes exist and can likely be reused for patterns around statuses, messages, attachments, and admin queues.
- Chat/message infrastructure exists elsewhere in the platform and may be reusable for notifications or live-chat integration.
- Platform settings include support contact fields such as support email, phone, WhatsApp, and help/contact URLs.
- Documentation already identifies a future special category for custom-template service requests.

### Still missing / not finished

- No dedicated support ticket tables such as `pd_support_ticket`, `pd_support_ticket_message`, `pd_support_ticket_attachment`, or SLA tables.
- No seller-facing ticket creation/list/detail pages.
- No admin support queue for tickets.
- No ticket statuses, categories, priorities, assignment, internal notes, SLA timers, or escalation rules.
- No seller/admin attachment upload flow for support tickets.
- No ticket notification workflow over email, in-app notification, or WebSocket.
- No integration from custom-template-service requests into tickets.
- No integration from RMA/returns or offline live chat into tickets.
- No support ticket audit trail.
- No tests for ticket creation, admin response, status transitions, or notifications.

### Recommended next implementation slice

Start with the database and API foundation:
1. ticket tables and migrations
2. seller create/list/detail/reply endpoints
3. admin list/detail/reply/status endpoints
4. basic seller and admin UI
5. notification hooks after the core flow works

---

## 3. P1 — Social Media Integrations / Auto-posting

**Real status:** Partially implemented for public profile/social links only. Full social-account integration, scheduling, and auto-posting are not implemented.

### Implemented / advancement verified in code

- Seller settings page lets sellers save public social links in `store.settings.social` for:
  - Facebook
  - Instagram
  - X
  - TikTok
  - YouTube
  - LinkedIn
  - WhatsApp
  - Telegram
  - Pinterest
  - Snapchat
- Seller settings also save contact/location profile fields:
  - contact email
  - contact phone
  - address
  - city
  - country
  - Google Maps embed URL
- `StorefrontSocialLinks` safely renders only valid `http`/`https` social links.
- Storefront theme/shared branding includes social/contact/location fields.
- Marketplace/admin platform settings include marketplace-level social URLs.
- Existing storefront footers and marketplace seller surfaces can display public social/contact profile information.

### Still missing / not finished

- No encrypted social account connection table, for example `pd_social_account`.
- No social post/schedule table, for example `pd_social_post`.
- No OAuth/token handling for Facebook, Instagram, TikTok, X, YouTube, LinkedIn, etc.
- No `social-post.worker.ts` or BullMQ queue for scheduled publishing.
- No product-publish auto-posting workflow.
- No social caption composer.
- No reusable caption templates.
- No AI-assisted social captions tied to the existing AI/Gemini infrastructure.
- No media selection/cropping workflow for social posts.
- No social content calendar.
- No per-network publish status/error display.
- No retry/backoff/failure notification flow.
- No social analytics ingestion or display.
- No admin controls for enabling/disabling social integrations per plan or platform policy.
- No tests around connected accounts, scheduling, worker processing, or failed publishes.

### Recommended next implementation slice

Keep public profile links as completed foundation. Next build a narrow MVP for scheduled posts:
1. `pd_social_account` and `pd_social_post`
2. one provider abstraction with mocked/manual provider first if OAuth is not ready
3. composer UI
4. scheduler worker
5. optional product-publish hook

---

## 4. P1 — Storefront Analytics and Tracking Taxonomy

**Real status:** Partially implemented. Marketplace-level analytics injection and seller sales analytics exist, but per-store storefront tracking and ecommerce event taxonomy are not complete.

### Implemented / advancement verified in code

- Superadmin/global platform settings validate and store:
  - GA4 enabled + measurement ID
  - GTM enabled + container ID
  - Meta Pixel enabled + pixel ID
  - Google Search Console verification
- Root frontend layout injects marketplace-level GA4, GTM, and Meta Pixel scripts when enabled.
- Marketplace settings loader exposes public analytics configuration to the frontend.
- Vendor analytics API exists at `GET /api/pd/analytics/store` with:
  - revenue trend
  - order status breakdown
  - top products by revenue
  - revenue by day
  - KPIs such as revenue, orders, AOV, repeat customer rate, growth
- Seller dashboard analytics page consumes `/api/pd/analytics/store`.
- Page Builder analytics event endpoint exists at `POST /api/pd/analytics/page-builder/event` for:
  - page views
  - CTA clicks
  - product clicks
- Page Builder analytics stores visitor hashes and avoids raw visitor IDs.

### Still missing / not finished

- No per-store GA4/GTM/Meta Pixel settings.
- No storefront-only analytics injection scoped by store/domain.
- No sanitized per-store custom head/snippet allow-list.
- No central analytics client/helper for consistent event names.
- No ecommerce event taxonomy implemented across Hub/storefront flows:
  - `view_item`
  - `select_item`
  - `add_to_cart`
  - `remove_from_cart`
  - `view_cart`
  - `begin_checkout`
  - `add_shipping_info`
  - `add_payment_info`
  - `purchase`
  - `refund`
  - `sign_up`
  - `login`
  - `search`
  - `generate_lead`
- No distinction between marketplace-owner analytics and seller/store-owned analytics.
- No consent/cookie-mode integration for analytics scripts.
- No server-side purchase event bridge.
- No seller analytics settings UI for tracking IDs.
- No test coverage for analytics script injection or emitted ecommerce events.

### Recommended next implementation slice

Add a storefront analytics configuration layer before adding every event:
1. per-store analytics fields in `store.settings` or a dedicated table
2. safe storefront-only injection based on resolved store host
3. shared event helper
4. implement `view_item`, `add_to_cart`, `begin_checkout`, and `purchase` first

---

## 5. P1 — Alibaba/Amazon-style Hub Template Expansion

**Real status:** Partially implemented. The platform has configurable marketplace themes/layouts and a strong AliExpress2 premium-deals homepage, but the full Alibaba/Amazon-style template expansion remains incomplete.

### Implemented / advancement verified in code

- Marketplace theme type supports:
  - `panda`
  - `aliexpress`
  - `aliexpress2`
- Hub homepage layout setting supports:
  - `theme_default`
  - `classic`
  - `deals`
  - `premium_deals`
- Hub home route chooses between:
  - `HubHomeContent`
  - `AliExpressHomeContent`
  - `AliExpress2HomeContent`
- `AliExpress2HomeContent` exists and includes:
  - dark premium-deals visual system
  - hero area
  - category side navigation
  - flash deals grid
  - featured category grid
  - trust badges
  - promo banner
  - recommended products section
- Marketplace settings include hub banner title/subtitle/CTA/image and featured category slugs.
- Hub navbar/footer consume marketplace theme/settings.

### Still missing / not finished

- No complete Alibaba-style template as a distinct configurable template.
- No Amazon-style full template as a distinct configurable template.
- No utility bar with language/currency/account/orders/deals shortcuts.
- No full mega-category sidebar with nested departments and hover panels.
- No robust hero carousel managed by admin settings.
- No deals countdown engine tied to real campaign/discount data.
- No top-sellers carousel/rail based on seller performance.
- No sponsored brands rail backed by sponsorship/admin data.
- No recently-viewed products section using cookie/localStorage.
- No personalized recommendations hook beyond basic product slices.
- No footer mega-grid for marketplace departments/service links.
- No configurable header variants connected to Theme Customizer.
- No mega-menu variant system shared across Hub templates.
- Some template images still need normalization and `next/image` standardization where practical.
- No tests/snapshots for theme/layout selection and critical Hub template sections.

### Recommended next implementation slice

Continue from the current AliExpress2 foundation:
1. add recently viewed and recommendations placeholder hook
2. add utility bar and richer category sidebar
3. add admin-configurable carousel/deal sections
4. extract reusable Hub template primitives before adding Alibaba/Amazon variants

---

## Additional missing feature groups

These are lower-priority or broader feature groups from current planning docs. They should remain visible, but should not distract from the five P1 groups above.

### Platform extension / seller growth features

- **Header styles and mega menu variants**
  - classic, centered, split, minimal, transparent-overlay, sticky-condensed headers
  - configurable mega menu with category groups, featured banner/product slot, promo strip, mobile bottom sheet
  - Theme Customizer integration

- **Secure theme/template import and export**
  - signed `.pmtheme` export/import
  - version compatibility checks
  - HTML/CSS/JS sanitization allow-list
  - preview before apply
  - private seller template library
  - optional `pd_seller_template` table

- **Vendor API keys page enhancements**
  - key name/prefix/scopes/created/last-used/last-IP display
  - request counts for 24h/7d/30d
  - per-key rate-limit tier and scopes
  - rotate/revoke confirmations
  - IP allow-list
  - webhook secret management
  - authenticated OpenAPI/docs shortcut
  - curl/Node/Python snippets

- **Email marketing paid add-on**
  - dashboard Add-ons / Paid Services section
  - independent add-on billing model
  - audiences, templates, campaigns, automations
  - deliverability dashboard
  - per-store sending domain + DKIM/SPF wizard
  - tables for audiences/templates/campaigns/sends/events
  - `email-marketing.worker.ts`
  - unsubscribe, GDPR consent, suppression list

- **Plugin mechanism and plugin marketplace**
  - `plugin.json` manifest
  - sandboxed capability-based runtime
  - CSP-safe signed frontend bundles
  - hooks for products, orders, checkout, dashboard, product editor, storefront footer
  - plugin/version/install/review tables
  - submission/admin-review and seller install/configure flows
  - free/paid model, audit logs, Ed25519 signing, global kill switch

- **Cloudflare CDN and DNS integration**
  - document Cloudflare in front of Caddy with Full Strict SSL
  - cache rules for APIs, `_next/static`, product images, themes
  - SaaS custom-domain rules/workers
  - optional Cloudflare API automation for vendor domains
  - token storage through Docker Secrets

- **Custom template service workflow**
  - seller brief form
  - references/budget/deadline/preferred contact
  - ticket category `custom_template`
  - admin quote, seller acceptance, invoice, kickoff workflow

### Strategic product add-ons

- **Advanced security**
  - TOTP
  - WebAuthn/passkeys
  - recovery codes
  - trusted devices
  - role-based enforcement
  - step-up authentication for payouts, payment config, plugin installs

- **Customer support live chat on storefronts**
  - per-store chat widget
  - office hours and away message
  - auto-create support ticket when seller is offline

- **Loyalty and referrals**
  - points per purchase
  - tiers and rewards
  - referral codes with double-sided incentives
  - per-store and marketplace-wide toggles

- **Returns and RMA workflow**
  - buyer return requests
  - seller approve/reject
  - labels
  - refund/replacement path
  - order detail and support ticket integration

- **Inventory and multi-warehouse**
  - multiple stock locations per store
  - low-stock thresholds and reorder points
  - supplier notes
  - CSV/XLSX inventory import/export

- **Promotions and discounts engine**
  - coupons
  - automatic discounts
  - BOGO, bundles, tiered pricing, customer-group pricing
  - stackability and expiry rules
  - marketplace-wide promotions with seller opt-in

- **Reviews moderation and photo reviews**
  - image/video review attachments
  - AI-assisted moderation
  - explicit verified-purchase badge

- **Search improvements**
  - FR/AR/EN synonyms
  - typo tolerance tuning
  - personalized ranking
  - seller search analytics
  - zero-result query tracking

- **PWA and mobile app shell**
  - installable Hub
  - installable storefronts
  - WebPush subscriptions on login

- **Accessibility and localization audit**
  - WCAG 2.2 AA audit for Hub, seller dashboard, admin dashboard
  - full FR/AR/EN coverage audit
  - RTL audit across all themes

### Operations, compliance, and developer experience

- **Observability upgrades**
  - per-tenant metrics dashboards
  - trace IDs in error pages/admin tools
  - synthetic checks for checkout and login

- **Backup, disaster recovery, and data export**
  - per-tenant data export
  - scheduled off-site backups
  - restore drills
  - point-in-time recovery documentation

- **Compliance center**
  - data-subject request workflow
  - consent log
  - cookie banner configuration
  - DPA download page
  - processor list page

- **Developer portal**
  - public API documentation site
  - plugin SDK documentation
  - sandbox tenant generator for partners

- **Dashboard AI assistant**
  - sidebar AI helper
  - product listing quality prompts
  - policy-writing prompts
  - sales-analysis prompts
  - Gemini reuse with AI credits/quotas

- **Technical polish and documentation maintenance**
  - standardize storefront images with `normalizePublicAssetUrl` and `next/image` where possible
  - centralize PostgreSQL numeric coercion helper
  - extract shared dashboard layout primitives
  - add `docs/adr/` architecture decision records
  - keep deep docs/wiki/AI instructions synchronized when features ship
  - archive or clearly mark stale roadmap/audit rows
  - keep migration counts and API route counts synchronized with real code

---

## Suggested execution sequence

### Phase 1 — Complete seller activation

1. Finish Onboarding Wizard / Guided Tour.
2. Build Support Ticket System foundation.
3. Connect custom-template service requests to tickets.

### Phase 2 — Add seller growth tools

4. Build Social Media Integrations MVP.
5. Complete per-store analytics and ecommerce event taxonomy.
6. Expand Hub template sections from the existing AliExpress2 foundation.

### Phase 3 — Platform extension ecosystem

7. Header/mega-menu variants.
8. Theme import/export.
9. Vendor API-key dashboard enhancements.
10. Email marketing paid add-on.
11. Plugin marketplace.

### Phase 4 — Strategic maturity

12. Security upgrades.
13. Live chat, loyalty/referrals, RMA, inventory, promotions, reviews v2.
14. Search/PWA/accessibility/i18n.
15. Observability/backups/compliance/developer portal/AI assistant.

---

## Validation baseline for future implementation work

Use targeted validation for the files touched by each feature. Do not rely only on typechecking; run focused checks.

- Backend type check from `backend` when backend files change.
- Frontend TypeScript check from `frontend` when frontend files change.
- Focused ESLint for touched frontend/backend files.
- Focused unit/integration tests for changed flows when available.
- `git diff --check` before handing off.
- Manual browser QA for UI-heavy flows after implementation, especially onboarding, storefront analytics injection, and Hub templates.

---

## Important project constraints to preserve

- Keep Hub marketplace routes and storefront subdomain/custom-domain routes separate.
- Preserve store-scoped cart behavior.
- Use shared theme helpers and shared cart/theme components rather than per-template duplication.
- Use `/api/pd/*` and `fetchWithCsrf` for protected/mutating frontend calls.
- Do not introduce an ORM; backend currently uses raw SQL with `pg` and Zod validation.
- Inspect current diffs before editing.
- Do not begin coding from this plan until the user explicitly confirms the next feature to implement.
