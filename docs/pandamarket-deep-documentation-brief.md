# PandaMarket Deep Documentation Brief

This brief summarizes the deeper reread of the PandaMarket Markdown documentation, including long audit/status files, current handoffs, wiki files, AI instruction specs, README files, runbooks, and workflow notes.

## 1. Authoritative Documentation Order

The documentation has multiple generations of truth. Some files are historical and conflict with newer files.

### Most authoritative current sources

Use these first:

- **`todo.md`**
  - Latest MVP completion status.
  - Says **99%+ MVP complete**, **no production blockers**.
  - Includes v18/v19/v20/v21 audit notes and post-MVP features completed.

- **`tasklist.md`**
  - Phase-by-phase checklist.
  - Says all major phases are complete or mostly complete.
  - Confirms storefront theming/cart scoping, Page Builder, search, payments, AI, workers, security, tests, deployment docs.

- **`implementation_plan.md`**
  - Very long historical audit plan.
  - Latest sections are useful, but earlier sections are old.
  - Best used by reading from latest audit notes and resolved sections, not old sprint plans.

- **`docs/AGENT_CHECKPOINT_2026-05-06.md`**
  - Current handoff for storefront theming/cart/checkout work.
  - Critical for future frontend/storefront tasks.

- **`wiki/14-agent-checkpoint-current-state.md`**
  - Index/shortcut pointing to the checkpoint.
  - Summarizes current focus and next-agent rules.

- **`.windsurf/handoff/checkpoint-audit-log-and-branding.md`**
  - Current May 12 handoff for dynamic marketplace branding and superadmin audit log work.
  - Important for admin/audit/branding tasks.

### Historical or less authoritative sources

Use these as background only:

- **`AUDIT_REPORT.md`**
  - Says project was about 40% complete.
  - This is outdated. Most items listed there are now marked resolved in newer files.

- **Early `roadmap.md` and PRD status assumptions**
  - Useful for original intent.
  - Not reliable for current implementation status.

- **Root `README.md` roadmap rows**
  - Some rows still show old WIP/planned states.
  - But its top-level overview, project structure, and handoff links are useful.

## 2. What PandaMarket Is

PandaMarket is a Tunisia-first **Marketplace as a Service** platform.

It combines two business models:

- **Central marketplace Hub**
  - Amazon/Alibaba-style.
  - Buyers discover products from all vendors.
  - Main domain: `pandamarket.tn`.
  - Local dev: `localhost:3000`, `pandamarket.local`.

- **Individual vendor storefronts**
  - Shopify-style SaaS stores.
  - Each seller can have a subdomain like `shop.pandamarket.tn`.
  - Custom domains are supported.
  - Storefronts use themes, seller colors, Page Builder, and store-scoped cart/checkout behavior.

The platform is designed specifically for the Tunisian market:

- **Currency:** TND.
- **Payments:** Flouci, Konnect, Mandat Minute, COD.
- **Logistics:** Aramex / La Poste TN / self-managed delivery.
- **Languages:** French, English, Arabic with RTL support according to latest TODO notes.

## 3. Main User Roles

### Buyer / Customer

Buyers can:

- Browse the central Hub.
- Search products with Meilisearch.
- Filter by category, price, vendor.
- Visit individual vendor storefronts.
- Use cart, wishlist, checkout, profile, orders.
- Pay with local payment methods.
- Upload Mandat Minute proof.
- Download digital products / license keys.
- Submit reviews and reports/cases.

### Vendor / Seller

Vendors can:

- Register and create a store.
- Pick a plan.
- Manage products, media, categories, stock.
- Manage physical, digital, serial/license, service products.
- Customize store theme, colors, logo, favicon.
- Use Page Builder.
- Manage orders, fulfillment, wallet, payouts.
- Submit KYC.
- Configure direct payment credentials on Pro+.
- Use AI tools.
- Manage API keys and webhooks.
- Use notifications and dashboard tools.

### Superadmin

Superadmins can:

- Manage vendors/stores.
- Approve/reject KYC.
- Approve/reject Mandat proofs.
- Moderate reports/cases.
- Manage products needing approval.
- Manage plans and platform settings.
- View audit logs.
- View system/server logs.
- Configure SMTP.
- View AI costs.
- Manage withdrawals.
- Manage marketplace branding/settings.

## 4. Business Model

The platform uses a **7-tier subscription model**.

### Plans

- **Free**
  - 0 TND/year.
  - 15% commission.
  - 10 products.
  - No AI.
  - No direct payment.

- **Starter**
  - 300 TND/year.
  - 0% commission.
  - 50 products.
  - Basic AI.

- **Regular**
  - 600 TND/year.
  - 100 products.
  - Page Builder enabled.

- **Agency**
  - 1,200 TND/year.
  - 300 products.
  - API keys / advanced integrations.

- **Pro**
  - 2,400 TND/year.
  - Unlimited products.
  - Unlimited AI.
  - Direct payment enabled.

- **Golden**
  - 4,800 TND/year.
  - Pro-like but with higher limits/features.

- **Platinum**
  - 9,600 TND/year.
  - White label.
  - Premium features.

### Revenue sources

- Free-plan commissions.
- Paid yearly subscriptions.
- AI token packs.
- Premium themes.
- Optional add-ons.
- Potential marketplace service fees.

## 5. Tech Stack

### Backend

- **Runtime:** Node.js 20.
- **Language:** TypeScript.
- **Framework:** Express.js, MedusaJS-style architecture.
- **Database:** PostgreSQL.
- **SQL style:** Raw parameterized SQL.
- **Important rule:** **Do not add an ORM.**
- **Validation:** Zod schemas.
- **Error handling:** Custom `PdError` hierarchy.
- **Routes:** `/api/pd/*`.
- **Workers:** BullMQ + Redis.
- **Realtime:** WebSocket / Socket.IO gateway.

### Frontend

- **Framework:** Next.js App Router.
- **React:** Modern React.
- **Styling:** Tailwind CSS.
- **Design system:** Panda Green, Panda Black, Inter, Lucide icons, spacing/radius/shadow tokens.
- **Routing:** Hostname-aware middleware.
- **Frontend API rule:** Use same-origin `/api/pd/*` proxy paths.
- **Mutation/auth API rule:** Use `fetchWithCsrf`.

### Infrastructure

- **PostgreSQL 16**
- **Redis 7**
- **Meilisearch**
- **MinIO / S3-compatible storage**
- **Caddy**
- **Docker Compose**
- **Docker Secrets / `_FILE` env var support**
- **GitLab CI/CD**
- **Sentry**
- **Prometheus metrics**

## 6. Monorepo Structure

Important folders:

- **`backend/`**
  - `src/api/` — REST route files.
  - `src/services/` — business logic.
  - `src/workers/` — BullMQ workers.
  - `src/queues/` — queue definitions.
  - `src/subscribers/` — event subscribers.
  - `src/plugins/payment/` — payment providers.
  - `src/middlewares/` — auth, CSRF, audit log, rate limiting.
  - `src/migrations/sql/` — SQL migrations.
  - `src/validators/` — Zod schemas.
  - `data/seed.ts` — seed data.

- **`frontend/`**
  - `src/app/hub/` — central marketplace.
  - `src/app/hub/dashboard/` — vendor dashboard.
  - `src/app/(admin)/` — admin panel.
  - `src/app/(auth)/` — auth pages.
  - `src/app/store/[storeHost]/` — storefront/central store routes.
  - `src/components/themes/` — storefront themes.
  - `src/lib/` — API, routing, theme, marketplace helpers.
  - `src/middleware.ts` — multi-tenant routing.

- **`packages/types/`**
  - Shared TypeScript types.

- **`ai instructions/`**
  - Original specs: PRD, architecture, business model, security, API, DB, testing, etc.

- **`wiki/`**
  - Setup, deployment, security, testing, API reference, troubleshooting, current state.

- **`docs/`**
  - Agent checkpoint, runbook, secrets guide.

## 7. Architecture Summary

### Request flow

- Frontend calls API via `/api/pd/*`.
- Next.js proxy forwards backend API requests to `localhost:9000/api/pd/*`.
- Mutating requests require CSRF.
- Backend validates input with Zod.
- Backend uses service layer + raw SQL.
- Events trigger subscribers/workers.
- Workers process background jobs via BullMQ/Redis.

### Multi-tenancy

Hostname determines behavior:

- **Hub hosts**
  - `pandamarket.tn`
  - `pandamarket.local`
  - `localhost:3000`
  - LAN private IPs in newer middleware behavior.

- **Admin hosts**
  - `admin.pandamarket.tn`
  - `admin.pandamarket.local`

- **Vendor subdomains**
  - `*.pandamarket.tn`
  - `*.pandamarket.local`

- **Custom domains**
  - Non-platform hostnames can resolve to stores.

Important rule from handoff:

- **Do not treat central `/store/:storeHost` and real storefront subdomain behavior as identical.**
- Central marketplace routes are marketplace-owned.
- Real storefront subdomain/custom-domain pages should use relative links like `/`, `/cart`, `/checkout`.

## 8. Core Backend Systems

### Auth

Implemented/documented features:

- Register/login/logout.
- Refresh token rotation.
- Forgot/reset password.
- Email verification.
- Login lockout.
- Optional 2FA in newer context.
- JWT access tokens.
- Refresh token hash storage.
- CSRF support for cookie-based flows.

### Store service

Manages:

- Store CRUD.
- Subdomain uniqueness.
- Custom domain.
- Status verification/suspension.
- Theme and settings.
- Payment config.
- Seller-type changes in newer context.

### Product service

Supports:

- Product CRUD.
- Quotas by subscription plan.
- Image limit checks.
- Draft/pending/published workflow.
- Physical/digital/service/serial product handling.
- Description sanitization in newer context.
- Wholesale pricing in newer context.
- Store-scoped product aliases in newer context.

### Order service

Supports:

- Checkout.
- Multi-vendor order splitting.
- Store-level fulfillments.
- Stock decrement.
- Payment capture handling.
- Cancellation and restocking.
- Digital downloads/license keys.
- Physical-only shipping logic in newer context.

### Payment service

Supports:

- Provider registry.
- Flouci.
- Konnect.
- Manual Mandat.
- COD.
- Escrow.
- Direct payment for Pro+.
- Webhook HMAC verification.
- Idempotency through `pd_payment_event`.
- Wallet crediting after capture.

### Wallet service

Supports:

- Available and pending balances.
- Retention period.
- Transactions.
- Withdrawals.
- Payout mode.
- Atomic `FOR UPDATE` locking.
- TND rounding.

### KYC / Mandat / Reports

- KYC is manual superadmin approval.
- Mandat proofs use private file upload + admin review.
- Reports evolved into case management in newer context with messages/attachments/events.

## 9. Frontend Systems

### Hub

The Hub includes:

- Homepage.
- Search.
- Categories.
- Product details.
- Cart.
- Checkout.
- Wishlist.
- Profile.
- Orders.
- Pricing.
- Vendor signup.
- Buyer account in newer context.

Newer context indicates the Hub homepage now uses an Amazon/Alibaba-inspired marketplace template with:

- Department rail.
- Hero/search panel.
- Product sections.
- Deals strip.
- Trust/service badges.
- Dense product grid.

### Storefront

Storefront includes:

- Store home.
- Product listing.
- Product detail.
- Cart.
- Checkout.
- Custom pages.
- Page Builder homepage override.
- Theme-aware 404.

Current checkpoint focus:

- All storefront theme templates should use dynamic seller theme colors.
- Route-level storefront pages must also use theme chrome/colors.
- Cart links/counts must be live and store-scoped.
- Checkout must remove only current store items.

Important helpers:

- `resolveThemeColors`
- `useThemeCustomization`
- `StorefrontThemeCartLink`
- `StoreCartIcon`
- `getStorefrontProductPath`
- `getStoreRouteContext`
- `storePathBase`

### Vendor dashboard

Documented pages include:

- Overview.
- Products.
- Categories.
- Media.
- Orders.
- Wallet.
- KYC.
- Settings.
- Subscription.
- AI.
- API keys.
- Webhooks.
- Payment config.
- Notifications.
- Reports/cases.
- Page Builder.

### Superadmin panel

Documented pages include:

- Dashboard.
- KYC.
- Mandats.
- Reports.
- Vendors/users.
- Withdrawals.
- Plans.
- Settings.
- Audit log.
- System logs in newer context.
- SMTP config.
- AI costs.
- Messages/chat in newer context.

## 10. Storefront Themes and Page Builder

### Themes

Docs confirm 20 themes:

- Minimal
- Classic
- Modern
- Boutique
- Artisan
- TechHub
- Flavor
- Elegance
- Neon
- Sahara
- Medina
- Coastal
- Urban
- Garden
- Studio
- Luxe
- Fresh
- Craft
- Digital
- Kids

Themes include:

- Dynamic colors.
- Theme customization.
- Font selection.
- Layout variations.
- Grid density.
- Hero styles.
- Color presets.
- Premium/free distinctions.

### Page Builder

The Page Builder is GrapesJS-based and includes:

- Store pages table.
- Vendor dashboard page builder.
- Published public pages.
- Homepage override.
- Plan gating.
- Tenant isolation.
- Size validation.
- Duplicate page.
- 20 templates.
- Many reusable blocks.
- Responsive template CSS.
- Preview modal/device previews.

## 11. Payments and Financial Flow

### Payment gateways

- **Flouci**
  - REST API.
  - HMAC webhook verification.
  - Supports platform or vendor credentials.

- **Konnect**
  - Amounts use millimes.
  - 1 TND = 1000 millimes.
  - HMAC verification.

- **Mandat Minute**
  - Manual.
  - Buyer uploads proof.
  - Admin approves/rejects.
  - Creates payment-required order until approved.

- **COD**
  - Cash on delivery.
  - Physical carts only in newer fulfillment context.

### Escrow mode

Flow:

1. PandaMarket collects payment.
2. Commission is calculated.
3. Vendor wallet receives net amount as pending.
4. Funds become available after retention.
5. Vendor withdraws or automatic payout runs.

### Direct mode

Flow:

1. Pro+ vendor enters own Flouci/Konnect credentials.
2. Credentials are encrypted.
3. Payment provider uses vendor credentials.
4. Money goes directly to vendor.

## 12. AI and Workers

AI features:

- Image compression with `sharp`.
- SEO title/description generation with Gemini.
- Token system.
- Unlimited plan bypass.
- BullMQ async jobs.
- Job history/status.
- Notifications when complete.

Workers documented:

- AI worker.
- Email worker.
- Payout worker.
- Subscription worker.
- Webhook worker.
- Search worker.

Subscribers documented:

- AI.
- KYC.
- Mandat.
- Order.
- Product.
- Stock-low.
- Wallet.
- Webhook.
- Index/registration.

## 13. Search and SEO

### Search

- Meilisearch is used for Hub search.
- Product index has searchable/filterable/sortable attributes.
- Search suggest endpoint exists.
- Product updates/publishing sync to index.
- Search worker can reindex.

### SEO

Docs indicate:

- `robots.ts`.
- `sitemap.ts`.
- OG metadata.
- Dynamic product/store/category metadata.
- Store SEO includes marketplace settings in latest branding work.

## 14. Security Model

Security is heavily documented and mostly marked complete.

Key rules:

- bcrypt password hashing.
- JWT access + refresh tokens.
- Refresh token rotation.
- Redis-backed lockout.
- CSRF double-submit cookie.
- Zod validation.
- HMAC webhooks.
- Payment idempotency.
- Tenant isolation.
- Rate limiting.
- Helmet CSP/HSTS.
- PII redaction.
- Sentry with PII stripping.
- Audit log middleware.
- System logs in newer context.
- File-based Docker secrets.

Important no-log list:

- Passwords.
- Tokens.
- Cookies.
- API keys.
- Payment secrets.
- KYC document content.

## 15. API Surface

Base docs:

- **Production backend:** `https://api.pandamarket.tn`
- **Local backend:** `http://localhost:9000`
- **Prefix:** `/api/pd/`

Major endpoint groups:

- `/auth`
- `/stores`
- `/products`
- `/orders`
- `/payments`
- `/wallet`
- `/subscriptions`
- `/verification`
- `/ai`
- `/credits`
- `/search`
- `/categories`
- `/notifications`
- `/reports`
- `/vendor`
- `/shipping`
- `/themes`
- `/page-builder`
- `/files`
- `/admin`
- `/internal`
- `/health`
- `/ready`
- `/metrics`
- `/api/docs`

Important frontend rule:

- Client-side frontend should use `/api/pd/*`, not hardcoded backend URLs.

## 16. Database and Migrations

Docs show a progression:

- Earlier wiki says 5 migrations.
- Later `todo.md` and `implementation_plan.md` mention at least migration 006 for reviews/wishlist.
- Newer context mentions further migrations for 2FA, logs, chat, case management, etc.

Core tables include:

- `pd_user`
- `pd_store`
- `pd_product`
- `pd_order`
- `pd_order_item`
- `pd_fulfillment`
- `pd_subscription_limits`
- `pd_vendor_wallet`
- `pd_wallet_transaction`
- `pd_vendor_credits`
- `pd_mandat_proof`
- `pd_verification_document`
- `pd_report`
- `pd_api_key`
- `pd_notification`
- `pd_theme`
- `pd_store_page`
- `pd_payment_event`
- `pd_webhook_subscription`
- `pd_webhook_delivery`
- `pd_audit_log`
- `pd_review`
- `pd_product_rating`
- `pd_wishlist_item`

Newer context adds:

- `pd_system_log`
- chat tables.
- report case messages/attachments/events.
- 2FA columns.

## 17. Local Development

### Requirements

- Node.js 20+.
- npm 10+.
- Docker Desktop.
- Git.
- PowerShell on Windows.
- Windows Developer Mode recommended for npm workspace symlinks.

### Common setup

```powershell
npm install
docker compose up -d
npm run migrate -w backend
npm run seed -w backend
npm run dev
```

### Local URLs

- **Frontend / Hub:** `http://localhost:3000`
- **Backend:** `http://localhost:9000`
- **API via frontend:** `http://localhost:3000/api/pd`
- **Health:** `http://localhost:9000/health`
- **Ready:** `http://localhost:9000/ready`
- **Swagger:** `http://localhost:9000/api/docs`
- **Meilisearch:** `http://localhost:7700`
- **MinIO console:** `http://localhost:9101`

### Local hosts file

For multi-tenant local testing:

```text
127.0.0.1 pandamarket.local
127.0.0.1 admin.pandamarket.local
127.0.0.1 boutique1.pandamarket.local
```

## 18. Test Accounts

After seed:

- **Super Admin**
  - `admin@pandamarket.tn`
  - `Admin123!`

- **Vendor Pro**
  - `vendor.pro@test.tn`
  - `Test123!`

- **Vendor Free**
  - `vendor.free@test.tn`
  - `Test123!`

- **Customer**
  - `customer@test.tn`
  - `Test123!`

Newer auth context indicates role-specific login routes:

- **Buyer login:** `/login` or `/login/buyer`
- **Seller login:** `/login/seller`
- **Admin login:** `/login/admin`

## 19. Testing and Validation

Testing docs mention:

- Backend Vitest.
- Frontend Vitest + React Testing Library.
- Playwright E2E.
- k6 load tests.
- GitLab CI stages.

Common validation commands:

```powershell
npm run type-check -w backend
npm run lint -w backend
npm run test -w backend
```

Frontend:

```powershell
npx tsc --noEmit --types vitest/globals --pretty false
npm run lint -w frontend
npm run test -w frontend
```

Storefront checkpoint validation:

```powershell
npx tsc --noEmit --types vitest/globals --pretty false
npx eslint src/app/store src/components/themes src/components/store src/contexts src/lib --no-error-on-unmatched-pattern
npm test -- src/__tests__/cart-context.test.tsx
```

Known warning:

- Some storefront files still have accepted `@next/next/no-img-element` warnings.
- Convert to `next/image` only as a separate careful change.

## 20. Deployment and Operations

### Production

Deployment docs target:

- Ubuntu VPS.
- Docker.
- Caddy.
- systemd services.
- PostgreSQL/Redis/Meilisearch/MinIO.
- Production `.env`.
- Real payment credentials.
- Docker Secrets.

### DNS

Expected domains:

- `pandamarket.tn`
- `www.pandamarket.tn`
- `admin.pandamarket.tn`
- `api.pandamarket.tn`
- `search.pandamarket.tn`
- `*.pandamarket.tn`
- vendor custom domains.

### Runbook

Incident levels:

- **SEV-1:** platform down, payments broken, data loss.
- **SEV-2:** major feature broken.
- **SEV-3:** minor feature broken.
- **SEV-4:** cosmetic/non-critical.

Runbook covers:

- Backend down.
- DB errors.
- Redis down.
- Payment failures.
- Meilisearch down.
- MinIO/S3 issues.
- SSL issues.
- BullMQ worker stalls.
- Backup/restore.
- Post-incident template.

## 21. Latest Storefront Handoff Rules

From `docs/AGENT_CHECKPOINT_2026-05-06.md`:

- **Preserve Hub/storefront separation.**
- **Do not assume central `/store/:storeHost` equals subdomain storefront.**
- **Use shared helpers rather than per-theme duplicated logic.**
- **For theme changes, update all affected themes or shared helper.**
- **For cart changes, keep store scoping intact.**
- **Never call `clearCart()` from storefront checkout success unless intentionally clearing all stores.**
- **Use targeted validation after changes.**

Important files for storefront work:

- `frontend/src/lib/themes.ts`
- `frontend/src/components/themes/shared.ts`
- `frontend/src/components/themes/StorefrontThemeCartLink.tsx`
- `frontend/src/components/store/StoreCartIcon.tsx`
- `frontend/src/contexts/CartContext.tsx`
- `frontend/src/lib/cart-utils.ts`
- `frontend/src/lib/store-routing.ts`
- `frontend/src/lib/store-hosts.ts`
- `frontend/src/app/store/[storeHost]/**`

## 22. Latest Audit Log and Branding Handoff

From `.windsurf/handoff/checkpoint-audit-log-and-branding.md`:

### Dynamic marketplace branding

Recent work replaced hardcoded PandaMarket branding with settings-driven branding.

Important component:

- `frontend/src/components/themes/PoweredByMarketplace.tsx`

Important additions to `StoreBranding`:

- `marketplace_name`
- `marketplace_logo_url`

Important behavior:

- Storefront/theme footers should use dynamic marketplace branding.
- Store SEO should use current marketplace settings.
- Page Builder text should avoid hardcoded PandaMarket where marketplace branding is configurable.

### Superadmin audit log

Important backend details:

- API route: `/api/pd/admin/audit-log`
- Summary route: `/api/pd/admin/audit-log/summary`
- Actual schema fields:
  - `actor_id`
  - `actor_role`
  - `action`
  - `resource_type`
  - `resource_id`
  - `ip`
  - `user_agent`
  - `metadata`
  - `created_at`

Important caveat:

- Older frontend expected wrong fields like `admin_id`, `details`, `ip_address`.
- Current code should align with real `pd_audit_log` schema.

Frontend audit log page includes:

- Summary cards.
- Advanced filters.
- Search.
- Method/status filters.
- Top actions/resources.
- Pagination.
- Details modal.
- Metadata viewer.

## 23. Coding Conventions and Work Rules

### Backend

- Use raw parameterized SQL.
- Do not introduce ORM.
- Use `query()` from `backend/src/db/pool.ts`.
- Use Zod schemas and `validate()`.
- Use `asyncHandler`.
- Use custom `PdError` classes.
- Use `pdId(prefix)` for IDs.
- Respect `pd_` database/entity prefix.
- Keep tenant isolation on every store-scoped query.
- Avoid logging sensitive information.

### Frontend

- Use App Router patterns.
- Use shared components/helpers.
- Use `/api/pd/*` proxy path.
- Use `fetchWithCsrf` for mutating/authenticated calls.
- Keep Hub routes and storefront routes separate.
- Prefer shared theme/cart/routing helpers.
- Respect marketplace theme/branding settings.
- Be careful with PostgreSQL numeric strings; normalize before `toFixed`.

### Git / process

- Conventional commits are documented.
- No pushing/pulling/merging unless explicitly asked.
- Inspect current diff before edits.
- Validate with targeted tests.
- Do not add unrelated features.

## 24. Important Contradictions / Caveats

### Caveat 1: `AUDIT_REPORT.md` is outdated

It says:

- 40% complete.
- Admin panel missing.
- Tests missing.
- Security gaps.

Newer docs say those are resolved.

### Caveat 2: Root `README.md` has stale roadmap rows

The root README still shows old WIP/planned roadmap statuses. Do not use those rows as current truth.

### Caveat 3: `implementation_plan.md` contains both old and new truth

The latest sections are useful, but older sprint plans and “remaining” lists may be superseded later in the same file.

### Caveat 4: Migration counts differ by document

Some docs say 5 migrations. Later status notes mention 6+ migrations. Actual code should be checked before migration work.

### Caveat 5: Tech stack docs differ slightly

Older AI docs mention MedusaJS as the backend core. Current handoff describes actual backend as Express.js + TypeScript + PostgreSQL with MedusaJS-style architecture. For code work, trust actual code and current handoff.

## 25. Practical Guidance for Future Work

When asked to modify code:

- **Start with current handoff files** if work touches storefront, branding, admin audit log, auth, or dashboard.
- **Inspect actual code and diff** before changing.
- **Use docs as intent, not as proof** when old and new docs conflict.
- **Prioritize root-cause fixes.**
- **Keep changes scoped.**
- **Run targeted validation.**
- **Do not change protected/core files casually**, especially:
  - audit log middleware
  - payment idempotency migration
  - admin layout
  - API helper
  - DB pool
  - crypto utilities

## 26. Final Current-State Summary

PandaMarket is documented as a **nearly complete, production-ready Tunisian marketplace/SaaS platform** with:

- Central marketplace Hub.
- Multi-tenant vendor storefronts.
- 20 themes.
- Page Builder.
- Local Tunisian payments.
- Escrow/direct payment.
- Vendor wallet.
- KYC.
- Mandat proof review.
- Search.
- AI tools.
- Webhooks/API keys.
- Notifications/realtime.
- Reviews/wishlist.
- Multi-language support.
- Strong security hardening.
- CI/CD, tests, runbook, deployment docs.
- Current handoffs for storefront theming/cart behavior and superadmin audit log/dynamic branding.

The key operational truth is: **newer task/status/handoff documents supersede older audit/roadmap docs**.
