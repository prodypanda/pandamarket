# 🐼 PandaMarket — Project Status & Task Plan

> **Audit date:** 2026-05-02
> **Auditor:** PandaArchitect
> **Scope:** Full repository against every spec in `ai instructions/`
> **Legend:** `[x]` = production-ready · `[~]` = partial / needs polish · `[ ]` = missing / TODO · `🔴` = security gap

---

## 0. Executive Summary

| Area | Status | Completion |
| :--- | :--- | :---: |
| Backend — Infrastructure (DB, Redis, S3, BullMQ, logger, errors, JWT, crypto) | ✅ Strong | **95%** |
| Backend — Domain services (Store, Wallet, Credits, KYC, Mandat, AI, Subscription, Order, Product, Notification, ApiKey) | ✅ Strong | **90%** |
| Backend — Payment providers (Flouci, Konnect, COD, Manual) | ✅ Real implementations exist | **80%** |
| Backend — API routes wired in `main.ts` | ⚠️ Many stubs / mocks | **45%** |
| Backend — Admin routes (`/api/pd/admin/*`) | ❌ Entirely missing | **0%** |
| Backend — External vendor API (`/api/pd/vendor/*` with API-key auth) | ❌ Service exists, routes missing | **10%** |
| Backend — Subscribers / event handlers | ⚠️ Files exist, mostly empty | **20%** |
| Backend — Tests | ❌ No tests written | **0%** |
| Frontend — Multi-tenant middleware | ✅ Working | **80%** |
| Frontend — Hub central pages | ⚠️ 3 hard-coded pages | **15%** |
| Frontend — Storefront themes (Minimal/Classic/Modern) | ⚠️ Skeletons only, no API wiring | **20%** |
| Frontend — Vendor dashboard | ⚠️ Layout + 3 mock pages | **10%** |
| Frontend — Admin panel | ❌ Not started | **0%** |
| Frontend — Auth pages (login/register/forgot/reset) | ❌ Not started | **0%** |
| Frontend — Page Builder (GrapesJS / Craft.js) | ❌ Not started | **0%** |
| Infrastructure — Docker Compose | ✅ Complete | **100%** |
| Infrastructure — Caddyfile (wildcard SSL + on-demand TLS) | ✅ Configured | **90%** |
| Infrastructure — CI/CD (GitLab) | ⚠️ Default SAST/Secret only | **20%** |
| Security posture | 🔴 Several CRITICAL gaps | **~50%** |

**Bottom line:** the core backend domain layer is high-quality and production-grade; **the application is NOT finished**. The HTTP surface, the entire admin panel, all auth UI, the page builder, the vendor external API, real payment-webhook signature checks, and the test suite are all missing or stubbed. There are also **5 critical security defects that must be fixed before any production exposure** (see §13).

---

## 1. Phase 1 — Core Backend

### 1.1 Infrastructure & bootstrapping

- [x] PostgreSQL pool + transaction helper (`backend/src/db/pool.ts`)
- [x] Redis client (`backend/src/db/redis.ts`)
- [x] Pino structured logger with request-id child loggers (`backend/src/utils/logger.ts`)
- [x] AES-256-GCM encryption + SHA-256 hashing + `pd_<entity>_<nano>` ID generator (`backend/src/utils/crypto.ts`)
- [x] JWT access (15m) + refresh (7d) signing with rotation (`backend/src/utils/jwt.ts`)
- [x] S3 / MinIO client with presigned URL helpers (`backend/src/utils/s3.ts`)
- [x] Money helpers (TND 3-decimal rounding, millimes ↔ TND for Konnect) (`backend/src/utils/money.ts`)
- [x] Plan ranking & defaults (`backend/src/utils/plans.ts`)
- [x] Subdomain validation + slugify (`backend/src/utils/subdomain.ts`)
- [x] BullMQ queues: `ai-queue`, `email-queue`, `payout-queue`
- [x] Custom error classes (`Pd*Error`) + structured error response (`backend/src/errors/`)
- [x] Express bootstrap with helmet, cors, cookie-parser, request-id, access log, rate-limit, error handler (`backend/src/main.ts`)
- [x] Zod-based `validate()` middleware
- [x] `requireAuth`, `optionalAuth`, `requireRole`, `requireAdmin`, `requireVendor`, `requireStore`, `requireApiKey` middlewares
- [x] `.env.example` covers all `PD_*` variables (DB, Redis, S3, JWT, Flouci, Konnect, Gemini, Meili)
- [x] Health check `GET /health`
- [ ] Graceful shutdown (SIGTERM → drain queues + close DB pool) — **MISSING**
- [ ] OpenTelemetry / Sentry instrumentation — **MISSING** (mentioned in security-guide)

### 1.2 Database schema (`backend/src/migrations/sql/001_initial_schema.sql`)

- [x] `pd_user`, `pd_store`, `pd_subscription_limits`
- [x] `pd_product`, `pd_product_image`, `pd_product_variant`
- [x] `pd_order`, `pd_order_item`, `pd_fulfillment` (order-splitting per store)
- [x] `pd_vendor_wallet`, `pd_wallet_transaction` (append-only)
- [x] `pd_vendor_credits` (AI tokens, supports unlimited = -1)
- [x] `pd_verification_documents` (KYC: RC + CIN + phone)
- [x] `pd_mandat_proofs`
- [x] `pd_reports`
- [x] `pd_api_keys` (SHA-256 hash storage)
- [x] `pd_ai_jobs` (BullMQ tracking)
- [x] `pd_notifications`
- [x] `pd_refresh_tokens` (with revocation)
- [x] `pd_theme` catalogue
- [x] All recommended indexes from `database-schema.md`
- [x] `updated_at` trigger function applied to mutable tables
- [ ] Seed file `backend/data/seed.ts` referenced by `npm run seed` — **FILE NOT IN REPO** (script exists in package.json but `data/` folder is missing) 🔴
- [ ] Subscription-limits seed rows (free/starter/regular/agency/pro/golden/platinum) — **NOT SEEDED**, schema FK on `pd_store.subscription_plan` → `pd_subscription_limits.plan_id` will break store creation until seeded

### 1.3 Domain services (in `backend/src/services/`)

- [x] `auth.service.ts` — register, login, issueTokens, refresh-with-rotation, logout (revokes all refresh tokens)
- [x] `store.service.ts` — create, getById, getBySubdomain, getByCustomDomain, resolveByHostname, updateSettings/Theme/CustomDomain/ShippingMode, **encrypted payment-config** (Pro+ gate enforced), markVerified, suspend, list
- [x] `subscription.service.ts` — getLimits (in-memory cache), assertCanCreateProduct, assertCanAddImage, changePlan with downgrade-block, plan listing
- [x] `wallet.service.ts` — create, getByStore, **creditPending with retention**, **releaseDueFunds (background job)**, **withdraw (atomic, FOR UPDATE locking)**, setPayoutMode, listTransactions
- [x] `credits.service.ts` — create, assertEnough, **atomic consume (FOR UPDATE)**, refill, setForPlan, supports unlimited (-1)
- [x] `kyc.service.ts` — submit (with re-submission after rejection), getByStore, listByStatus (admin queue), approve (transactional → marks store verified), reject, markPhoneVerified
- [x] `mandat.service.ts` — uploadProof (with conflict detection), listByStatus, approve (triggers `markPaid` + emits `pd.payment.captured`), reject
- [x] `order.service.ts` — checkout with **per-store fulfillment split**, stock decrement, variant support, listByCustomer, listByStore, fulfill (per-store), cancel + restock, markPaid (idempotent)
- [x] `product.service.ts` — create with **quota check** + verified/unverified status routing, getById, update, archive, delete, listByStore, listPublished, **admin approve/reject**, addImage with quota, deleteImage, assertOwnership
- [x] `notification.service.ts` — create + WebSocket emit, list, unreadCount, markRead/All
- [x] `api-key.service.ts` — create (returns full key once), list, revoke, verify (with last_used_at), assertScope
- [x] `payment.service.ts` — exists but **uses mocks** (returns `flouci_<timestamp>` URLs and skips real verification) ⚠️ — **the real providers in `plugins/payment/` are not wired in**
- [x] `search.service.ts` — Meilisearch client, init filters/sortable, indexProduct, searchProducts
- [x] `report.service.ts` — file present (not inspected in detail)
- [ ] **Service that wires `plugins/payment/*Provider` (Flouci/Konnect real impl) into `payment.service`** — **NOT DONE**, the real axios-based providers exist but the service still calls mocks
- [ ] **Webhook signature verification** for Flouci/Konnect inbound webhooks — **NOT DONE** 🔴
- [ ] Outgoing webhook delivery service (HMAC signing, 3-attempt retry) — **NOT DONE** (specified in §12 of api-endpoints.md)

### 1.4 Workers (`backend/src/workers/`)

- [x] `ai.worker.ts` — full sharp compression + Gemini SEO generation, atomic token consumption, S3 upload, status updates, event emit
- [x] `ai-runner.ts` — entrypoint (`npm run worker:ai`)
- [x] `email.worker.ts` + `email-runner.ts` — present (not inspected in detail)
- [x] `payout.worker.ts` + `payout-runner.ts` — present
- [ ] Worker that periodically calls `walletService.releaseDueFunds()` (cron-style) — **NOT WIRED**
- [ ] Worker that periodically warns about expiring subscriptions (7d before expiry, per `notifications-system.md`) — **NOT DONE**
- [ ] Stock-low watcher (`stock.low` event per spec) — **NOT DONE**

### 1.5 Subscribers (event handlers in `backend/src/subscribers/`)

- [x] Files exist: `ai.subscriber.ts`, `kyc.subscriber.ts`, `mandat.subscriber.ts`, `order.subscriber.ts`, `product.subscriber.ts`, `wallet.subscriber.ts`
- [ ] `order.subscriber` → on `pd.payment.captured` should compute commission and call `walletService.creditPending` — **needs verification**
- [ ] `product.subscriber` → on `pd.product.published` should call `searchService.indexProduct` — **needs verification**
- [ ] All notification triggers from `notifications-system.md` (KYC, mandat, AI, wallet, stock-low, suspension, subscription expiry) — **needs full audit**

### 1.6 Tests

- [ ] Vitest configured in `package.json` but **0 test files** in repo — **CRITICAL GAP** for a money-handling platform
- [ ] Required minimum suite (per `testing-strategy.md`): wallet, credits, payment-capture idempotency, order-split, KYC state machine, mandat state machine, subscription quota enforcement, JWT refresh-rotation

---

## 2. Phase 2 — Multi-Tenant Frontend

### 2.1 Project & middleware

- [x] Next.js 16 + App Router scaffold (`frontend/`)
- [x] Tailwind CSS v4 configured
- [x] `frontend/src/middleware.ts` — hostname detection (Hub vs subdomain vs custom domain)
- [ ] Middleware does **not** call backend `/api/pd/stores/by-host/:hostname` to resolve theme/settings — currently does only string-based subdomain stripping
- [ ] No support for production hostname `pandamarket.tn` vs `*.pandamarket.tn` distinction beyond a hard-coded list — **needs to use the env-configurable `NEXT_PUBLIC_HUB_DOMAIN`**

### 2.2 Themes (`frontend/src/components/themes/`)

- [x] `MinimalTheme.tsx`, `ClassicTheme.tsx`, `ModernTheme.tsx` skeletons
- [x] `themes.ts` registry
- [ ] Themes consume **mocked store data** (`getStoreByHost` simulates a network request) — **no real backend call**
- [ ] Themes do not render real products / categories / cart — **placeholder content only**
- [ ] No use of `store.settings.colors / logo_url / favicon_url` from spec
- [ ] No favicon switching per store
- [ ] No `theme_id` driven dynamic load

### 2.3 Hub (central marketplace)

- [x] Hub homepage `frontend/src/app/hub/page.tsx` (hard-coded categories + 4 trending products)
- [x] `HubNavbar.tsx`, `SearchBar.tsx` shells
- [ ] Search results page (`/hub/search`) — **MISSING**
- [ ] Category browsing (`/hub/category/[slug]`) — **MISSING**
- [ ] Product detail page (`/hub/product/[id]`) — **MISSING**
- [ ] Multi-vendor cart page — **MISSING** (only checkout shell)
- [ ] Real Meilisearch wiring — **MISSING**
- [ ] SEO meta tags / sitemap / Open Graph — **MISSING**

### 2.4 Vendor dashboard (`frontend/src/app/hub/dashboard/`)

- [x] Layout with sidebar navigation
- [x] Overview page (mocked stats)
- [x] Products page (mocked table, no Add/Edit form, no API call)
- [x] Orders page (basic skeleton)
- [ ] Wallet page — **MISSING**
- [ ] AI Tools page — **MISSING**
- [ ] Settings page (theme selector, colors, logo upload, custom-domain config) — **MISSING**
- [ ] KYC submission page — **MISSING**
- [ ] Subscription / plan upgrade page — **MISSING**
- [ ] API Keys management page (Agency+ only) — **MISSING**
- [ ] Notification bell / dropdown + WebSocket subscription — **MISSING**

### 2.5 Checkout flow

- [x] Pages exist: `/hub/checkout`, `/hub/checkout/mandat-upload`, `/hub/checkout/success`
- [ ] Real cart + address + payment-method selection — **NEEDS API WIRING**
- [ ] Mandat upload uses presigned-URL flow — **NEEDS BACKEND ENDPOINT TO GENERATE PRESIGNED URL**

### 2.6 Admin panel

- [ ] **Entire admin panel is missing.** No `/admin/*` routes, no KYC queue UI, no Mandat queue UI, no product approval UI, no reports UI, no plans config UI, no themes UI.

### 2.7 Auth UI

- [ ] **No login, register, forgot-password, reset-password, or vendor onboarding pages.**

### 2.8 Page Builder

- [ ] GrapesJS / Craft.js integration — **NOT STARTED** (Phase 2/Regular+ requirement)

---

## 3. Phase 3 — Marketplace Hub & Search

- [x] Meilisearch service (init, indexProduct, searchProducts) — `backend/src/services/search.service.ts`
- [x] Meilisearch in `docker-compose.yml`
- [ ] Subscriber that pushes `published` products into Meilisearch on `pd.product.published` / `pd.product.updated` — **needs to be verified/implemented**
- [ ] Bulk re-index script (CLI) — **MISSING**
- [ ] Search-as-you-type endpoint (`/api/pd/search/suggest`) — **MISSING** (only `/search` exists)
- [ ] Filterable attributes include `store_id`, `category`, `price` but spec also asks for `status` — partially done
- [ ] Hub search UI — **MISSING**
- [ ] Multi-vendor cart logic on the frontend — **MISSING**

---

## 4. Phase 4 — Local Payments & Shipping

### 4.1 Payment providers

- [x] `flouci.provider.ts` — real axios call to `developers.flouci.com/api/generate_payment` + `verify_payment`
- [x] `konnect.provider.ts` — real axios call to `api.konnect.network/api/v2/payments/init-payment` + status check
- [x] `manual-mandat.provider.ts` exists
- [x] `cod.provider.ts` exists
- [x] `payment-provider.interface.ts` defines `PaymentInitContext` / `PaymentInitResult` / `PaymentVerifyResult`
- [x] Konnect millimes conversion handled (`tndToMillimes` / `millimesToTnd`)
- [x] Vendor-credentials path for **Direct Mode** (Pro+) supported in providers via `ctx.vendor_credentials`
- [ ] **`payment.service.ts` still uses mocks** instead of calling these providers 🔴
- [ ] **Webhook signature verification** for Flouci/Konnect inbound POSTs — **MISSING** (`payment.route.ts` comment says “In production, verify Flouci signature here”) 🔴
- [ ] **Idempotency check** on payment captures (prevent double-capture from replayed webhooks) — partially done (`markPaid` SQL filters `payment_status != 'captured'`) ✅ but not on the gateway-reference uniqueness
- [ ] Payment-config decryption + use in `payment.service` for Direct Mode — **NOT WIRED**

### 4.2 Wallet & escrow

- [x] Retention period model (`retention_days`, `available_at`)
- [x] `creditPending` + `releaseDueFunds` implemented
- [x] Withdraw with row-lock + min-withdrawal check
- [x] `WalletTransaction` audit trail
- [ ] Order subscriber that calls `creditPending` on `pd.payment.captured` (with commission deducted per plan) — **needs verification**
- [ ] Cron / scheduled trigger of `releaseDueFunds()` — **NOT WIRED**
- [ ] Automatic payout mode (vs on-demand) execution — **NOT IMPLEMENTED**

### 4.3 Mandat Minute

- [x] Service is fully implemented (upload → admin queue → approve/reject → markPaid)
- [x] Buyer/vendor uploader distinction
- [ ] Presigned-URL endpoint to generate upload URL **before** the client PUTs the image — **MISSING** (`payment.route.ts` accepts a raw `image_url` from client, which is unsafe — client could pass any URL)
- [ ] Admin queue UI — **MISSING**

### 4.4 Shipping & Order Splitting

- [x] One `pd_fulfillment` per store per order ✅
- [x] Per-store shipping computed (currently flat 7 TND placeholder)
- [ ] Aramex API integration — **NOT STARTED**
- [ ] La Poste TN integration — **NOT STARTED**
- [ ] Self-managed vs platform-unified shipping mode used at checkout — **NOT WIRED IN FRONTEND**

---

## 5. Phase 5 — AI & Workers

- [x] BullMQ AI queue + worker with concurrency 4
- [x] Image compression: download → sharp resize → WebP @ 82% → S3 upload → return savings stats
- [x] SEO generation: Gemini Pro JSON prompt → write `seo_title` / `seo_description` / `tags` to product
- [x] Atomic token consumption with unlimited-plan handling
- [x] AI job lifecycle (queued → processing → completed/failed)
- [x] Event emission on completion/failure
- [x] WebSocket gateway exists (`backend/src/realtime/socket-gateway.ts`)
- [ ] **`ai.route.ts` is `// TODO`** — vendors cannot trigger AI jobs from the API yet 🔴 (worker is unreachable)
- [ ] WebSocket auth (JWT verify on connect) — **needs to be verified**
- [ ] Frontend WebSocket client + UI updates — **MISSING**
- [ ] AI history page in dashboard — **MISSING**
- [ ] Token-pack purchase flow — **MISSING**

---

## 6. Phase 6 — API, Sync & Polish

- [x] `api-key.service.ts` (create / verify / revoke / scopes)
- [x] `requireApiKey` middleware reads `x-pd-api-key` header
- [ ] **`/api/pd/vendor/products`, `/api/pd/vendor/products/:id/stock`, `/api/pd/vendor/orders` routes** — **MISSING** (no router uses `requireApiKey`)
- [ ] **`/api/pd/vendor/api-keys` (POST/GET/DELETE) routes** — **MISSING**
- [ ] CSV / Excel import + export of products/stock — **NOT STARTED**
- [ ] Outgoing webhook delivery (`pd.order.placed`, `pd.stock.updated`, etc.) with HMAC + 3-attempt retry — **NOT STARTED**
- [ ] Digital products: time-limited download URLs + license-key pool — **NOT STARTED**
- [ ] Public Swagger / OpenAPI documentation — **NOT STARTED**
- [ ] Load tests — **NOT STARTED**
- [ ] Production deployment scripts — **NOT STARTED**

---

## 7. Routes — Wiring Status (`backend/src/api/`)

| Router | Implemented endpoints | Status |
| :--- | :--- | :--- |
| `auth.route.ts` | register / login / refresh / logout | ✅ Functional (per service review) |
| `store.route.ts` | POST `/`, GET `/`, GET `/by-host/:h`, GET `/:id`, PUT `/me/settings`, `/me/theme`, `/me/domain`, `/me/shipping` | ✅ Functional but **missing `/me/payment-config` (Pro+ direct mode)** |
| `product.route.ts` | POST `/`, GET `/public`, GET `/me`, GET `/:id`, PUT `/:id`, DELETE `/:id` | 🔴 **BUG**: hard-codes `store_plan: 'free' as any` and `store_is_verified: true` — bypasses verification gate; missing image upload route, import/export |
| `order.route.ts` | (not inspected — assume basic checkout/list) | ⚠️ Needs review |
| `payment.route.ts` | `/init`, `/mandat/upload`, `/webhook/flouci`, `/webhook/konnect` | 🔴 Mocks; webhooks unsigned; no presigned URL endpoint for mandat upload |
| `wallet.route.ts` | GET `/me`, GET `/me/transactions`, POST `/me/withdraw`, PUT `/me/payout-mode` | ✅ Functional |
| `subscription.route.ts` | (not inspected) | ⚠️ Needs review |
| `verification.route.ts` | **`// TODO: Implement Verification routes`** | 🔴 EMPTY |
| `ai.route.ts` | **`// TODO: Implement AI routes`** | 🔴 EMPTY |
| `report.route.ts` | **`// TODO: Implement Report routes`** | 🔴 EMPTY |
| `search.route.ts` | (not inspected) | ⚠️ Needs review |
| `/api/pd/admin/*` | — | 🔴 ENTIRELY MISSING (KYC approve/reject, mandat approve/reject, product approve/reject, reports, plans) |
| `/api/pd/vendor/*` (API-key auth) | — | 🔴 ENTIRELY MISSING |
| `/api/pd/notifications/*` | — | 🔴 MISSING (service exists) |
| `/api/pd/credits/*` | — | 🔴 MISSING (service exists) |
| `/api/pd/internal/tls-allowed` (Caddy on-demand TLS check) | — | 🔴 MISSING — Caddyfile references it but it doesn't exist |

---

## 8. Frontend — Page Inventory

| Spec page | Built? |
| :--- | :---: |
| Hub homepage | ✅ (mocked) |
| Hub search results | ❌ |
| Hub category page | ❌ |
| Hub product detail | ❌ |
| Hub cart | ❌ |
| Hub checkout (4 steps) | ⚠️ Skeleton |
| Mandat upload page | ⚠️ Skeleton |
| Storefront homepage (per theme) | ⚠️ Skeleton |
| Storefront catalogue / PDP | ❌ |
| Vendor dashboard — Overview | ✅ (mocked) |
| Vendor dashboard — Products | ⚠️ (mocked) |
| Vendor dashboard — Orders | ⚠️ (mocked) |
| Vendor dashboard — Wallet | ❌ |
| Vendor dashboard — AI Tools | ❌ |
| Vendor dashboard — Settings | ❌ |
| Vendor dashboard — KYC | ❌ |
| Vendor dashboard — API Keys | ❌ |
| Vendor dashboard — Subscription/Plans | ❌ |
| Admin — Dashboard | ❌ |
| Admin — KYC queue | ❌ |
| Admin — Mandat queue | ❌ |
| Admin — Product approval | ❌ |
| Admin — Reports | ❌ |
| Admin — Plans/Pricing config | ❌ |
| Admin — Themes catalogue | ❌ |
| Auth — Login | ❌ |
| Auth — Register (multi-step vendor) | ❌ |
| Auth — Forgot/Reset password | ❌ |
| Pricing page | ❌ |
| Notification centre | ❌ |

**Summary:** ~6/30 pages exist, most as static mocks. **Frontend is at MVP-skeleton stage, not production.**

---

## 9. Infrastructure

- [x] `docker-compose.yml` (Postgres 16, Redis 7, Meilisearch 1.8, MinIO + auto-bucket setup) ✅
- [x] `Caddyfile` (wildcard `*.pandamarket.tn`, on-demand TLS for custom domains, security headers on Hub)
- [ ] `Caddyfile`'s `on_demand_tls.ask` calls `http://localhost:9000/api/pd/internal/tls-allowed` — **endpoint does not exist** ⚠️ (will block all custom-domain SSL provisioning)
- [ ] Production `docker-compose.prod.yml` / Kubernetes manifests — **MISSING**
- [ ] Backup automation (Postgres + MinIO) — **MISSING**
- [ ] Log aggregation (Loki/CloudWatch) — **MISSING**
- [ ] `.gitlab-ci.yml` only enables default SAST + Secret-Detection — **NO BUILD/TEST/LINT/DEPLOY JOBS** for the actual app

---

## 10. Cross-cutting compliance with `coding-conventions.md`

- [x] `pd_` prefix on entity IDs ✅
- [x] `PD_` prefix on env vars ✅
- [x] `/api/pd/` prefix on routes ✅
- [x] `pd.` prefix on events ✅
- [x] kebab-case for service files, PascalCase for classes, `I*` for interfaces ✅
- [x] Custom error hierarchy ✅
- [x] Pino logger (no `console.log`) — **mostly OK**, no `console.log` found in backend
- [x] Zod validation on inspected routes ✅
- [ ] One `as any` cast found in `product.route.ts` — **violates the no-`any` rule** 🔴

---

## 11. Compliance with `permissions-matrix.md`

- [x] Role enum (customer / vendor / admin / super_admin) defined and enforced via `requireRole`
- [x] `requireStore` enforces vendor isolation on store-scoped routes
- [x] `assertOwnership` on product mutations
- [x] Plan gate on payment-config (Pro+) via `PdPlanRequiredError`
- [ ] `vendor_verified` role distinction at the JWT level — **NOT IMPLEMENTED** (current code only has `vendor`; the verified status is on the store, not the JWT)
- [ ] Plan gate on API-key creation (Agency+) — **NOT ENFORCED** (route doesn't exist)
- [ ] Plan gate on Page Builder (Regular+) — **N/A** (Page Builder not built)
- [ ] Order/wallet/notification routes do not yet enforce **store-scope filtering** beyond the auth check — needs end-to-end audit

---

## 12. Compliance with `notifications-system.md`

- [x] `pd_notifications` table + service
- [x] WebSocket gateway (Socket.io) skeleton
- [x] BullMQ email queue
- [ ] Email templates (`welcome_*`, `order_confirmed`, `kyc_*`, `mandat_*`, `wallet_*`, …) — **NONE in repo**
- [ ] SMTP configured but **no actual email worker logic** found beyond the runner skeleton
- [ ] WebSocket events (`new_order`, `payment_received`, `ai_job_done`, `stock_alert`, `kyc_pending`, `mandat_pending`, `new_report`, …) — only `notification` event is emitted from `notification.service.ts`
- [ ] Notification REST endpoints (`GET /notifications`, `unread-count`, mark read) — **MISSING** (service exists but no router)

---

## 13. 🔴 SECURITY AUDIT — Findings

> Ranked by severity. Each item maps to a section of `security-guide.md`.

### CRITICAL (must fix before any production deployment)

1. **🔴 Verification flow bypass in `product.route.ts`**
   The route hard-codes `store_is_verified: true`, so EVERY product gets published immediately, regardless of the vendor's KYC status. This breaks the entire approval gate for unverified vendors. Same line also passes `store_plan: 'free' as any`, meaning quota enforcement uses the wrong plan limits.
   **Fix:** load the store inside the route, derive `store_plan` and `store_is_verified` from it, and pass them to `productService.create`.

2. **🔴 Unsigned payment webhooks (`/api/pd/payments/webhook/flouci|konnect`)**
   Webhooks accept any POST body and call `markPaid` without verifying the gateway's signature/HMAC. An attacker who knows an order ID can mark it as paid by hitting the webhook directly.
   **Fix:** require Flouci `apppublic`/`appsecret` echo-verification (or signed redirect) and Konnect signature header. Re-fetch payment status from the gateway in the verifier (the providers already have `verify()` — wire them in).

3. **🔴 `payment.service.ts` returns mock checkout URLs**
   Customers click a link to `https://flouci.com/checkout/flouci_<timestamp>` which 404s. No real money flow exists end-to-end.
   **Fix:** delete the mocks and call `flouciProvider.init()` / `konnectProvider.init()` from `plugins/payment/`. They exist and are correct.

4. **🔴 Mandat upload endpoint accepts an arbitrary `image_url` from the client**
   `payment.route.ts` `POST /mandat/upload` takes whatever URL the client sends. A malicious customer can post a URL pointing to a fake receipt hosted anywhere on the internet, or attempt SSRF when the admin previews the proof.
   **Fix:** generate a presigned PUT URL server-side, force the upload through it (`pd-private-files` bucket), then accept only the resulting key/URL on a follow-up confirm endpoint.

5. **🔴 No rate-limit on auth endpoints in `main.ts`**
   The `authRateLimit` middleware is exported but **never applied**. Only the global 100/min limit exists. Per `security-guide.md` login should be 5/15min, register 3/h, forgot-password 3/h.
   **Fix:** mount `authRateLimit` on `/api/pd/auth/login`, `/register`, `/forgot-password`, `/reset-password`.

6. **🔴 `Caddyfile` references a non-existent `/api/pd/internal/tls-allowed` endpoint** for on-demand TLS
   Without this, custom-domain SSL provisioning is **either disabled or, worse, allows ANY domain to request a cert from your server**, which can be abused as a free wildcard cert factory.
   **Fix:** implement the endpoint that responds 200 only if the requested host matches an existing `pd_store.custom_domain`.

### HIGH

7. **🔴 Default placeholder `PD_ENCRYPTION_KEY=000…0`**
   A 32-byte all-zero AES key is the default in `.env.example`. Anyone copying it as-is will encrypt vendor payment credentials with a known key. Add a startup check that aborts the process if the key is `000…0` or shorter than 64 hex chars in production.

8. **🔴 Default placeholder `PD_JWT_SECRET=change_this_dev_jwt_secret_in_production`**
   Same risk for JWT signing. Add a fail-fast guard.

9. **🔴 No CSP / strict security headers on the API server**
   `helmet()` defaults are loose; `security-guide.md` requires explicit CSP, HSTS, X-Frame-Options, etc. Caddy applies them only on the Hub host, not on `api.pandamarket.tn`.

10. **🔴 No CSRF protection** on cookie-based auth (the code accepts JWT from `pd_at` cookie). Either disable cookie auth for state-changing routes or add a double-submit token.

11. **🔴 Vendor-credential decryption path (Direct Mode)** is missing — payment-config is encrypted on write but never decrypted-and-used. As soon as it IS used, ensure secrets are wiped from logs / errors.

12. **🔴 No `npm audit` / Dependabot job** in `.gitlab-ci.yml` despite the security guide mandating it.

### MEDIUM

13. ⚠️ `cors()` uses `[...adminCors, ...storeCors]` — fine in dev, but vendor-custom-domain entries must be added dynamically; otherwise vendors using `ma-boutique.com` will get CORS-blocked when calling the API.

14. ⚠️ `apiRateLimit` keys by `req.ip` for anonymous traffic — make sure `app.set('trust proxy', 1)` is correct for your topology (it is set, ✅) but verify behind Caddy.

15. ⚠️ Refresh-token storage hashes the token (good) but the rotation re-uses the same `pd_refresh_tokens` row insertion path inside a transaction — verify there's no race that lets a single refresh token be used twice in parallel requests.

16. ⚠️ `axios` calls in payment providers have a 10s timeout (good) but no circuit breaker — repeated outages from Flouci/Konnect will block worker threads.

17. ⚠️ No length cap on `notes`, `description`, `rejection_reason` columns at the API layer — Zod schemas should enforce reasonable maxima (DB allows arbitrarily long TEXT).

18. ⚠️ `bullmq` jobs do not set `removeOnComplete`/`removeOnFail` retention; Redis will grow unbounded.

19. ⚠️ `socketGateway.emitToUser()` is called from multiple services but the gateway file's auth/room logic was not inspected — needs a security review.

### LOW / Hygiene

20. `frontend/package.json` uses `next 16.2.4` (extremely recent) and `react 19.2.4` — verify both are GA, not a typo for 14/19.

21. `README.md` test accounts (`admin@pandamarket.tn` / `Admin123!`) suggest a weak default seed — even if dev-only, never commit easy passwords; require seeding from env.

22. `.gitlab-ci.yml` has `SECRET_DETECTION_ENABLED: '[REDACTED]'` — the value should be `"true"`/`"false"`, not a redaction marker; this likely disables the scan.

23. No `.well-known/security.txt` published for vulnerability disclosure.

---

## 14. Recommended Next-Steps Roadmap (priority-ordered)

### Sprint 1 — Stop the bleeding (security + correctness)
1. Fix CRITICAL items 1–6 above.
2. Seed `pd_subscription_limits` (otherwise no store can be created).
3. Add the missing `data/seed.ts` with the 7 plan rows + admin user + 2 demo vendors.
4. Wire real Flouci/Konnect providers into `payment.service`.
5. Implement webhook signature verification.
6. Implement presigned-URL endpoint for mandat upload.
7. Add `authRateLimit` to `/auth/*`.
8. Add startup guards for placeholder JWT/encryption keys.

### Sprint 2 — Fill the API surface
9. Implement `verification.route.ts`, `ai.route.ts`, `report.route.ts`, `notifications` router, `credits` router.
10. Implement the `/api/pd/admin/*` namespace (KYC approve/reject, mandat approve/reject, product approve/reject, reports, plans CRUD).
11. Implement the `/api/pd/vendor/*` namespace with `requireApiKey` (products, stock update, orders).
12. Implement `/api/pd/internal/tls-allowed` for Caddy on-demand TLS.
13. Wire all subscribers (search index sync, wallet credit on payment-captured, notifications matrix).
14. Add presigned upload endpoint for product images + KYC docs.

### Sprint 3 — Frontend foundations
15. Build auth pages (login, register multi-step, forgot/reset).
16. Build the full vendor dashboard (Wallet, AI Tools, Settings, KYC, Subscription, API Keys).
17. Wire the existing dashboard pages to the real API.
18. Wire themes to real `store.settings` from the backend.

### Sprint 4 — Hub & Search
19. Build search results, category, product detail, and multi-vendor cart pages.
20. Implement Meilisearch sync subscriber + bulk re-index CLI.
21. SEO meta + sitemap.

### Sprint 5 — Admin panel
22. Build the entire admin UI (KYC, Mandats, Products, Reports, Plans, Themes, Stores).

### Sprint 6 — Tests + polish
23. Vitest suite for wallet / payment / auth / quotas / order-split / KYC / Mandat state machines.
24. Outgoing webhooks + CSV import/export + digital products + Swagger.
25. GitLab CI: lint + type-check + test + build + Docker image + deploy.
26. Production deployment guide.

---

## 15. Conclusion

> **The application is NOT finished and is NOT secure for production.**
>
> It has a strong, well-architected backend domain layer (≈90 % done at the service tier) and a solid infrastructure footprint, but the public HTTP surface is roughly half-implemented, the entire admin panel and most of the frontend (auth, dashboards, hub catalogue, page builder) are missing, payment flows are still mocked, several critical security controls are absent or bypassed, and there is **zero automated test coverage** on a money-handling platform.
>
> Estimate to MVP-production-ready (one full-stack engineer): **8–12 weeks** focused on the priority list above.
