# 09 — Master Actionable TODO Checklist

> **Tracking Standard:** Mark items `[x]` with commit hash when executed.
> **Risk/Effort Index:** ⚡ = Quick win (<1 hour). 🛠 = Engineering task (1–3 hours). 🏗 = Architectural feature (>3 hours).

---

## 🔴 Tier 0 — Financial Correctness & Critical Blockers (Days 1–2)

- [ ] **[P0-4]** ⚡ **Fix Backend Build:** Add missing `import retentionRouter from './api/retention.route';` in `backend/src/main.ts` and apply `validate(rewardsLeadSchema)` in `retention.route.ts`. Verify with `npm run type-check -w backend`.
- [ ] **[P0-1]** 🛠 **Credit Wallets on Webhook Capture:** Emit `PdEvent.PAYMENT_CAPTURED` in `payment.service.ts:993` and `payment-reconciliation.service.ts:325`. Add idempotency check in `order.subscriber.ts`.
- [ ] **[P0-2]** 🛠 **Fix Storefront Mandat Receipt Review:** Refactor `POST /receipts/:receiptId/review` to call `markPaidInTransaction`, verify gateway, allow re-upload on reject, and emit `PAYMENT_CAPTURED`.
- [ ] **[P0-3]** ⚡ **Credit Wallets on COD Delivery:** Emit `PdEvent.PAYMENT_CAPTURED` when COD delivery completes in `order.service.ts:1748`.
- [ ] **[P0-5]** ⚡ **Install `nodemailer`:** Run `npm install nodemailer -w backend`.
- [ ] **[P0-6]** ⚡ **Enforce Webhook HMAC in All Environments:** Remove `config.env === 'production'` condition in `payment.route.ts:216,247`. Add dedicated webhook secrets.
- [ ] **[P0-7]** ⚡ **Sanitize AI HTML XSS Sinks:** Wrap `smartFillSuggestions` in `dashboard/products/page.tsx:6923` and `selectedJob.output` in `AiCostsDashboard.tsx:3080` with `DOMPurify.sanitize`.
- [ ] **[P0-8]** ⚡ **Untrack Secret File:** Run `git rm --cached env-vars.json` and add to `.gitignore`. Rotate credentials pre-production.

---

## 🟠 Tier 1 — Platform Stability & Bug Fixes (Week 1)

- [ ] **[P1-1]** ⚡ In `frontend/next.config.ts`, set `output: 'standalone'` to fix the Docker build.
- [ ] **[P1-2]** 🛠 In `SocketContext.tsx`, re-fetch socket token upon user login and token refresh.
- [ ] **[P1-3]** 🛠 In `useSocket.ts`, buffer pre-connection event listeners in a pending queue and flush on connect.
- [ ] **[P1-4]** 🏗 Migrate `pd_coupon` table and move coupon validation from client-side `CartContext.tsx` to server-side quote engine.
- [ ] **[P1-5]** ⚡ Remove hardcoded `SHIPPING_PER_VENDOR = 7` in `StoreCartPage.tsx`; fetch dynamically from `/api/pd/shipping/rates`.
- [ ] **[P1-6]** ⚡ In `payment.route.ts:192`, enforce `order.payment_gateway === 'manual_mandat'` on receipt upload.
- [ ] **[P1-7]** ⚡ In `ai.worker.ts:227`, remove early return for `product_tagging` to fix jobs stuck in `processing`.
- [ ] **[P1-8]** 🛠 Implement two-phase credit reservation in `credits.service.ts` before queuing AI jobs.
- [ ] **[P1-9]** ⚡ Stop overwriting store default `retention_days` in `wallet.service.ts:117`.
- [ ] **[P1-10]** ⚡ In `verification.route.ts:70`, bind KYC phone OTP verification to the legal representative's submitted phone number.
- [ ] **[P1-11]** ⚡ Add `last_warning_sent_at` to `pd_store_subscription` to deduplicate 7-day expiry warnings.
- [ ] **[P1-12]** ⚡ In `requireStore` middleware, return `409 PD_STORE_SELECTION_REQUIRED` if a multi-store merchant has no active store context.
- [ ] **[P1-13]** 🛠 Maintain a Redis `pd:user_version:${userId}` check for instant session revocation on sensitive routes.
- [ ] **[P1-14]** ⚡ Enforce `req.ip` over spoofable raw `X-Forwarded-For` in rate limiter key generator.
- [ ] **[P1-15]** ⚡ Replace broad `includes('/callback')` substring matching in `csrf.middleware.ts` with strict prefix matching.
- [ ] **[P1-16]** 🛠 Pin Supabase CA certificate via `PD_DATABASE_CA_CERT` and set `rejectUnauthorized: true`.
- [ ] **[P1-17]** ⚡ Throw explicit error in `ai-config.service.ts` on decryption failure instead of returning raw ciphertext.
- [ ] **[P1-18]** ⚡ Throw build error in production if `NEXT_PUBLIC_HUB_URL` is unset, preventing `garbage.team` SEO fallback.
- [ ] **[P1-19]** 🛠 Consolidate 48 scattered backend URL fallbacks into a single unified `backend-base.ts` module.
- [ ] **[P1-20]** 🛠 In `api/storefront/revalidate`, verify store ownership of hostnames and use `crypto.timingSafeEqual`.
- [ ] **[P1-21]** 🛠 Renumber duplicate SQL migration prefixes (025, 026, 027, etc.) sequentially.

---

## 🟡 Tier 2 — Feature Completion & PRD Requirements (Weeks 2–3)

### Buyer Experience
- [ ] **[MW-1]** 🏗 Implement Guest Checkout on Hub and Storefronts with name, phone, address capture and post-purchase account claim.
- [ ] **[MW-2]** 🛠 Build visual Order Tracking Timeline on `/hub/orders` and storefront customer order modals.
- [ ] **[MW-3]** 🏗 Build Buyer Returns & RMA request modal in `/hub/orders` connected to `pd_store_order_refund`.
- [ ] **[MW-4]** 🛠 Add Storefront Direct Live-Chat widget for visitor-merchant inquiries.

### Seller Experience
- [ ] **[MW-5]** 🏗 Wire guided Onboarding Wizard steps 2–7 (theme, KYC, product, payments, shipping, publish) with persistent progress tracking.
- [ ] **[MW-6]** 🛠 Build Serial Key Pool console in vendor dashboard (inspect inventory, view burned keys, reissue).
- [ ] **[MW-7]** 🛠 Enhance API Keys console with IP allowlisting, usage graphs, and cURL snippets.
- [ ] **[MW-8]** 🛠 Auto-generate downloadable PDF payout statements and tax receipts.

### Superadmin & Platform Management
- [ ] **[MW-9]** 🏗 Implement Marketplace Order Fraud Queue in Superadmin.
- [ ] **[MW-10]** 🛠 Add unsaved-changes protection and live preview to Superadmin Settings page.
- [ ] **[MW-11]** 🛠 Implement Tunisian Personal Data Protection Law (PDP 2004-63) cookie consent banner and DSAR data export.

### Frontend Polish & i18n
- [ ] **[P2-1]** 🛠 Resolve Arabic RTL SSR layout flash by reading locale cookie in root server layout.
- [ ] **[P2-2]** 🛠 Extract remaining ~400 hardcoded French strings into `en.json`, `fr.json`, and `ar.json`.
- [ ] **[P2-16]** 🛠 Remove `unoptimized` flag on `next/image` across all 20 storefront themes.

---

## 🔵 Tier 3 — Architecture Refactoring & Quality Debt (Month 1)

- [ ] **[ENH-1]** 🏗 Implement double-entry wallet ledger (`pd_wallet_ledger`) with nightly automated reconciliation.
- [ ] **[ENH-2a]** 🏗 Decompose `frontend/src/app/hub/dashboard/products/page.tsx` (7,848 lines) into modular sub-components.
- [ ] **[ENH-2b]** 🏗 Decompose `frontend/src/app/(admin)/settings/page.tsx` (6,246 lines) into isolated tab modules.
- [ ] **[ENH-2c]** 🏗 Decompose `backend/src/services/analytics.service.ts` (4,677 lines) into specialized domain services.
- [ ] **[ENH-3]** 🛠 Route domain events through PostgreSQL `pd_outbox_event` table for transactional atomicity.
- [ ] **[P2-13]** 🛠 Create `pd_payout` entity and connect to admin withdrawal approval screen.
- [ ] **[P2-6]** ⚡ Wire Redis pub/sub invalidation for `subscriptionService.getLimits` cache.
- [ ] **[P2-11]** ⚡ Replace 25 dead `href="#"` links in Page Builder templates with valid routes.
- [ ] **[MW-14]** 🏗 Split Render backend web service and BullMQ worker service into distinct deployments.

---

## 🟣 Tier 4 — Growth Backlog & Innovation (Month 2)

- [ ] **[ENH-4]** 🛠 Implement automated WhatsApp order updates using the existing Evolution API gateway.
- [ ] **[ENH-5]** 🛠 Build Seller "Money Flow" visual transparency tracker in vendor wallet.
- [ ] **[ENH-6]** 🛠 Implement Progressive Web App (PWA) manifest and Web Push notifications for sales and delivery alerts.
- [ ] **[ENH-7]** ⚡ Deploy shared `<SafeAiHtml>` wrapper component across all frontend AI text renders.
- [ ] **[ENH-8]** 🛠 Add D17 & La Poste Tunisienne payment receipt upload and verification.
- [ ] **[ENH-9]** 🏗 Build lightweight mobile-web driver console (`/delivery/scan`) for COD courier proof of delivery.
- [ ] **[ENH-10]** 🛠 Implement Storefront Health Score & daily automated uptime pings.
- [ ] **[MW-12]** 🛠 Create end-to-end automated test suite for the Ads pipeline.
- [ ] **[MW-13]** 🏗 Implement Keyword Auctions & Dynamic Auto-Bidding on `/hub/search`.
- [ ] **[MW-15]** 🏗 Complete Meilisearch provisioning and catalog synchronization.
- [ ] **[MW-16]** 🏗 Execute object storage migration from local MinIO to Cloudflare R2.
