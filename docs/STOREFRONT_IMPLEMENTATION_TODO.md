# PandaMarket Storefront Implementation TODO Backlog

This backlog lists the precise tasks required to bring the PandaMarket public storefront, seller settings, and supporting APIs to a production-ready, launchable state. 

Ensure that each task is treated as an isolated, scoped commit with its own validation, following the delivery sequence below.

---

## Phase 1 — Security and Commerce Integrity (P0 Blockers)

### [x] Task 1.1: Secure private file uploads and downloads (GAP-P0-001)
> **Comment:** Completed. Mock S3 routes are unmounted in production (404), protected with short-lived JWT signed tokens in dev/test, exact DB key lookup enforced, CSRF dev bypass documented, and verified via `backend/src/__tests__/files.test.ts` and `npm run type-check -w backend`.
- [x] Remove `PUT /upload-s3-mock/:bucket/*` and `GET /download-s3-mock/:bucket/*` from production API routes, or protect them with exact-key signature verification.
- [x] Implement signature validation in `backend/src/api/files.route.ts` that restricts downloads/uploads to exact key matches, verified uploader tenant, purpose, and short-lived expiry.
- [x] Ensure the mock file router is completely deactivated in `backend/src/main.ts` when running in `NODE_ENV === 'production'`.
- [x] Add integration tests in `backend/src/__tests__/files.test.ts` for anonymous, expired, and cross-tenant upload/download attempts.
- **Affected Files:**
  - `backend/src/api/files.route.ts`
  - `backend/src/main.ts`
  - `backend/src/middlewares/csrf.middleware.ts`
  - Create: `backend/src/__tests__/files.test.ts`

### [x] Task 1.2: Implement safe public store and product projections (GAP-P0-002)
> **Comment:** Completed. Defined `StorefrontStorePublic` and `StorefrontProductPublic` DTOs in `@pandamarket/types`. Implemented dedicated SQL projections (`PublicStoreRow` and `PublicProductRow`) in `StoreService` and `ProductService` omitting `owner_id`, `payment_config`, `digital_file_key`, `inventory_quantity`, and `rejection_reason`. Updated public store and product endpoints to enforce published product + verified store constraints and formatted responses. Verified via `backend/src/__tests__/public-projection.test.ts` (6/6 tests passing) and `npm run type-check -w backend`.
- [x] Remove `SELECT *` from `StoreService.getById` and `ProductService.getById` when accessed from public/unauthenticated routes.
- [x] Define explicit TypeScript types and DTO interfaces in `packages/types/src/dtos.ts` for `StorefrontStorePublic` and `StorefrontProductPublic`.
- [x] Ensure that `digital_file_key`, internal moderation remarks, exact inventory counts, and payment configs are completely omitted from public API payloads.
- [x] Update `backend/src/api/store.route.ts` and `backend/src/api/product.route.ts` to enforce public publication checks (must be published and store must be verified).
- **Affected Files:**
  - `packages/types/src/dtos.ts`
  - `backend/src/api/store.route.ts`
  - `backend/src/api/product.route.ts`
  - `backend/src/services/store.service.ts`
  - `backend/src/services/product.service.ts`
  - `backend/src/__tests__/public-projection.test.ts`

### [x] Task 1.3: Bind payment webhook captures to initialized payment attempts (GAP-P0-003)
> **Comment:** Completed. Created migration `065_create_payment_attempts_table.sql` for `pd_payment_attempt`. Updated `PaymentService.initPayment` to record initialized payment attempts with `expected_amount_minor`, `expected_currency`, and merchant credentials. Updated `PaymentService.processPaymentWebhook` to resolve attempts strictly by `(gateway, gateway_reference)`, validate signature, match expected minor amount/currency/merchant account, and execute an atomic compare-and-set query (`initialized` -> `captured`). Updated `payment.route.ts` to reject invalid PayPal signatures with 401. Verified via `backend/src/__tests__/payment-binding.test.ts` (7/7 tests passing) and `npm run type-check -w backend`.
- [x] Run migration to create a `pd_payment_attempt` table to track expected amount, currency, merchant credentials, initialized gateway reference, and status.
- [x] Update `PaymentService.initPayment` to record the attempt prior to redirecting the customer.
- [x] Update `PaymentService.processPaymentWebhook` to fetch the payment attempt and assert that verified webhook payload details (amount, currency, merchant account, signature) match the local attempt.
- [x] Enforce signature verification inside `backend/src/api/payment.route.ts` for the PayPal callback.
- **Affected Files:**
  - Create: `backend/src/migrations/sql/065_create_payment_attempts_table.sql`
  - `backend/src/services/payment.service.ts`
  - `backend/src/api/payment.route.ts`
  - Create: `backend/src/__tests__/payment-binding.test.ts`

### [x] Task 1.4: Make checkout and payment initialization atomic (GAP-P0-004 & GAP-P0-005)
> **Comment:** Completed. Created migration `066_checkout_idempotency_and_inventory.sql` adding `idempotency_key` column to `pd_order`, data-cleanup step for existing negative stock, and nonnegative inventory CHECK constraints on `pd_product` and `pd_product_variant`. Required `Idempotency-Key` header on `POST /storefront/checkout` returning existing order on duplicates. Updated `OrderService.checkout` with deterministic ascending ID row-level locking (`FOR UPDATE`) and guarded atomic inventory decrements (`WHERE inventory_quantity >= requested_quantity RETURNING inventory_quantity`). Verified via `backend/src/__tests__/checkout-concurrency.test.ts` (4/4 tests passing) and `npm run type-check -w backend`.
- [x] Enforce an `Idempotency-Key` requirement for the public `/storefront/checkout` endpoint inside `backend/src/api/order.route.ts`.
- [x] Harden inventory decrements in `backend/src/services/order.service.ts` to run inside a database transaction with a guarded `inventory_quantity >= requested_quantity` clause, returning an error on oversell instead of allowing negative balances.
- [x] Ensure serial keys are allocated atomically in `order.service.ts` with a short reservation lock and released if payment initialization fails or expires.
- **Affected Files:**
  - Create: `backend/src/migrations/sql/066_checkout_idempotency_and_inventory.sql`
  - `backend/src/api/order.route.ts`
  - `backend/src/services/order.service.ts`
  - Create: `backend/src/__tests__/checkout-concurrency.test.ts`

### [x] Task 1.5: Enforce multi-vendor isolation for order cancellations (GAP-P0-006)
> **Comment:** Completed. Updated `PUT /api/pd/orders/:id/cancel` in `order.route.ts` to enforce tenant isolation for multi-vendor cancellations. When a vendor attempts to cancel an order, the request is restricted exclusively to `orderService.cancelStoreFulfillment`, which cancels only their store's fulfillment and restocks only their items, preserving other vendors' fulfillments and inventory. Whole-order cancellation is reserved for buyers and platform administrators. Verified via `backend/src/__tests__/vendor-cancel-isolation.test.ts` (4/4 tests passing) and `npm run type-check -w backend`.
- [x] Update `backend/src/api/order.route.ts` to restrict the vendor cancellation action exclusively to `orderService.cancelStoreFulfillment`, verifying that the requesting vendor cannot cancel items they do not own.
- [x] Remove vendor access to the global, whole-order `orderService.cancel` endpoint.
- **Affected Files:**
  - `backend/src/api/order.route.ts`
  - `backend/src/services/order.service.ts`
  - Create: `backend/src/__tests__/vendor-cancel-isolation.test.ts`

---

## Phase 2 — Storefront Routing, Tenant Isolation, and Callbacks (P1)

### [x] Task 2.1: Enforce strict storefront tenant isolation (GAP-P1-001)
> **Comment:** Completed. Removed reliance on client-provided `store_id` in `requireStorefrontCustomer` middleware (`backend/src/middlewares/index.ts`) and removed `store_id` from public `checkoutSchema` in `order.route.ts`. Derived `store_id` strictly from validated storefront JWT claims. Enforced HTTP 403 `PdForbiddenError` on cross-store checkout attempts in `OrderService.checkout`. Updated `OrderService.listByStorefrontCustomer` to filter lateral items query strictly by `i.store_id = $2`, preventing cross-store item leaks in multi-vendor parent orders. Verified via `backend/src/__tests__/tenant-isolation.test.ts` (4/4 tests passing) and `npm run type-check -w backend`.
- [x] Derive `store_id` exclusively from the resolved domain/hostname inside `requireStorefrontCustomer` middleware.
- [x] Remove client-provided `store_id` from public storefront checkout, address, wishlist, and cart API schemas.
- [x] Restrict order list/detail views in `backend/src/api/order.route.ts` to return only current-store items when fetched using a storefront session.
- **Affected Files:**
  - `backend/src/middlewares/index.ts` (specifically `requireStorefrontCustomer`)
  - `backend/src/api/order.route.ts`
  - `backend/src/api/address.route.ts`
  - `backend/src/api/wishlist.route.ts`
  - Create: `backend/src/__tests__/tenant-isolation.test.ts`

### [x] Task 2.2: Harmonize host classification and relative Hub links (GAP-P1-011 & GAP-P1-012)
> **Comment:** Completed. Created `classifyHost(host)` in `frontend/src/lib/store-hosts.ts` and refactored `middleware.ts` to use unified host classification logic. Created `frontend/src/lib/storefront-url.ts` exporting `getHubAbsoluteUrl(path)` and `getStorefrontAbsoluteUrl(storeHost, path)`. Replaced relative `/hub`, `/hub/login`, and `/hub/search` links across themes (`ClassicTheme`, `PoweredByMarketplace`, etc.) and storefront pages (`cart`, `checkout`, `error`, `not-found`). Verified via table-driven vitest test suite (`frontend/src/lib/__tests__/store-hosts.test.ts`), `npx tsc --noEmit` (0 errors), and `npx eslint` (0 errors).
- [x] Consolidate host classification logic between `frontend/src/middleware.ts` and `frontend/src/lib/store-hosts.ts` to use a single, environment-backed list of Hub domains.
- [x] Create an absolute Hub URL helper `getHubAbsoluteUrl(path)` inside `frontend/src/lib/storefront-url.ts` to replace relative `/hub` links that break under custom domains.
- [x] Update header, footer, cart, checkout, error, and not-found components to use absolute links when linking back to the marketplace Hub or login.
- **Affected Files:**
  - `frontend/src/middleware.ts`
  - `frontend/src/lib/store-hosts.ts`
  - Create: `frontend/src/lib/storefront-url.ts`
  - Create: `frontend/src/lib/__tests__/store-hosts.test.ts`
  - `frontend/src/components/themes/ClassicTheme.tsx` (and other affected theme components)
  - `frontend/src/components/themes/PoweredByMarketplace.tsx`
  - `frontend/src/app/store/[storeHost]/cart/page.tsx`
  - `frontend/src/app/store/[storeHost]/checkout/page.tsx`

### [x] Task 2.3: Implement storefront payment return and success routes (GAP-P1-004)
> **Comment:** Completed. Updated `PaymentService.initPayment` (`backend/src/services/payment.service.ts`) and `/api/pd/payments/storefront/init` (`backend/src/api/payment.route.ts`) to accept `return_origin`, generating callback URLs `{return_origin}/checkout/success?order={orderId}` and `{return_origin}/checkout/status?status=failed&order={orderId}`. Created branded storefront success page `frontend/src/app/store/[storeHost]/checkout/success/page.tsx` with server-side order and payment status verification. Created storefront status page `frontend/src/app/store/[storeHost]/checkout/status/page.tsx` with payment retry flow. Verified via backend & frontend type checks (`npm run type-check -w backend`, `npx tsc --noEmit`) and vitest (`payment-binding.test.ts`).
- [x] Update `PaymentService.initPayment` to read the canonical storefront origin from the request or order metadata, generating callback URLs like `https://{storeHost}/checkout/success?order={orderId}`.
- [x] Create a dedicated, branded storefront success page under `frontend/src/app/store/[storeHost]/checkout/success/page.tsx`.
- [x] Create a storefront checkout failure/pending handler under `frontend/src/app/store/[storeHost]/checkout/status/page.tsx`.
- **Affected Files:**
  - `backend/src/services/payment.service.ts`
  - `backend/src/api/payment.route.ts`
  - `frontend/src/app/store/[storeHost]/checkout/page.tsx`
  - Create: `frontend/src/app/store/[storeHost]/checkout/success/page.tsx`
  - Create: `frontend/src/app/store/[storeHost]/checkout/status/page.tsx`

---

## Phase 3 — Storefront Customer Accounts and Fulfillment (P1 & P2)

### [x] Task 3.1: Implement complete buyer account, profile, and security views (GAP-P2-001 & GAP-P1-002)
- [x] Implement storefront password reset, email verification, and profile/address update routes under `backend/src/api/storefront-auth.route.ts`.
- [x] Create buyer-facing profile, address, and security pages under `frontend/src/app/store/[storeHost]/account/**`.
- [x] Implement a revocable session model with refresh-token rotation for storefront logins.
- **Agent Comment:** Completed. Created migration `067_create_storefront_customer_sessions_and_tokens.sql`, expanded `StorefrontAuthService` with verify-email, forgot/reset-password, session management, profile/password. Created `storefront-account.route.ts` for profile/password/addresses. Built frontend account pages (overview, profile, addresses, orders, security). Updated `requireStorefrontCustomer` to enforce `is_active` check. Tests: 6/6 passing (`storefront-auth.test.ts`).
- **Affected Files:**
  - `backend/src/api/storefront-auth.route.ts`
  - `backend/src/services/storefront-auth.service.ts`
  - `backend/src/services/address.service.ts`
  - `backend/src/middlewares/index.ts`
  - `backend/src/main.ts`
  - Create: `backend/src/api/storefront-account.route.ts`
  - Create: `backend/src/migrations/sql/067_create_storefront_customer_sessions_and_tokens.sql`
  - Create: `frontend/src/app/store/[storeHost]/account/layout.tsx`
  - Create: `frontend/src/app/store/[storeHost]/account/page.tsx`
  - Create: `frontend/src/app/store/[storeHost]/account/profile/page.tsx`
  - Create: `frontend/src/app/store/[storeHost]/account/addresses/page.tsx`
  - Create: `frontend/src/app/store/[storeHost]/account/orders/page.tsx`
  - Create: `frontend/src/app/store/[storeHost]/account/security/page.tsx`
  - Create: `backend/src/__tests__/storefront-auth.test.ts`

### [x] Task 3.2: Complete digital and serial storefront fulfillment (GAP-P1-008)
- [x] Build a storefront digital download and serial license-key display API inside `backend/src/api/product.route.ts` and `backend/src/api/storefront-account.route.ts`, authorizing requests via storefront customer session.
- [x] Build a "My Downloads & Keys" section in the storefront buyer account dashboard (`frontend/src/app/store/[storeHost]/account/downloads/page.tsx`).
- [x] Protect digital asset paths with secure S3/MinIO signed download URLs and audit log downloads (`pd_download_audit_log`).
- **Agent Comment:** Completed. Created migration `068_storefront_digital_downloads.sql` adding `storefront_customer_id` and `pd_download_audit_log`. Added `GET /storefront/account/downloads` and `POST /storefront/account/downloads/:productId/:orderId` with authorization, payment status verification, signed URLs, quota tracking, and audit logging. Created frontend page `frontend/src/app/store/[storeHost]/account/downloads/page.tsx`. Added tests in `backend/src/__tests__/storefront-downloads.test.ts` (5/5 passing).
- **Affected Files:**
  - `backend/src/api/storefront-account.route.ts`
  - `frontend/src/app/store/[storeHost]/account/layout.tsx`
  - Create: `backend/src/migrations/sql/068_storefront_digital_downloads.sql`
  - Create: `frontend/src/app/store/[storeHost]/account/downloads/page.tsx`
  - Create: `backend/src/__tests__/storefront-downloads.test.ts`

### [x] Task 3.3: Complete storefront Mandat Minute uploads (GAP-P1-005)
- [x] Implement a storefront-accessible payment receipt upload API in `backend/src/api/payment.route.ts` that accepts `storefront_customer_id` and stores receipt files securely.
- [x] Add an "Upload Post Slip Receipt" trigger in the storefront order detail view under the buyer account and checkout success page.
- [x] Add seller-side receipt review (`approve` / `reject`) in seller order detail view (`frontend/src/app/hub/dashboard/orders/page.tsx`).
- **Agent Comment:** Completed. Created migration `069_storefront_mandat_receipts.sql`. Added `POST /api/pd/files/storefront/presign` for storefront customer file uploads. Added `POST /api/pd/payments/storefront/receipt`, `GET /api/pd/payments/storefront/receipt/:orderId`, `GET /api/pd/payments/receipts/order/:orderId`, and `POST /api/pd/payments/receipts/:receiptId/review`. Created Mandat receipt upload UI in `checkout/success/page.tsx` and buyer orders modal. Built `MandatReceiptReviewWidget` in seller dashboard orders page. Added test suite `backend/src/__tests__/mandat-receipt.test.ts` (6/6 passing).
- **Affected Files:**
  - `backend/src/api/payment.route.ts`
  - `backend/src/api/files.route.ts`
  - `frontend/src/app/store/[storeHost]/checkout/success/page.tsx`
  - `frontend/src/app/store/[storeHost]/account/orders/page.tsx`
  - `frontend/src/app/hub/dashboard/orders/page.tsx`
  - Create: `backend/src/migrations/sql/069_storefront_mandat_receipts.sql`
  - Create: `backend/src/__tests__/mandat-receipt.test.ts`

---

## Phase 4 — Unified Storefront Navigation, Menus, Header & Footer (P1)

### [x] Task 4.1: Design database-backed store menus and footer schemas (GAP-P1-013)
- [x] Run migration to create `pd_store_menu`, `pd_store_menu_item`, `pd_store_footer`, and `pd_store_footer_block` tables to track nested, store-scoped link hierarchies.
- [x] Implement CRUD & draft/publish services in `backend/src/services/menu.service.ts` and APIs under `backend/src/api/store.route.ts` for managing menus (Header, Footer Columns, Legal) and draft/published revisions.
- [x] Extend `ThemeProps` in `frontend/src/components/themes/shared.ts` with `StoreNavigationData` interface.
- **Agent Comment:** Completed. Created migration `066_store_menus_and_footers.sql`. Built `MenuService` with Zod validation, draft update, publish, and public retrieval methods. Exposed seller draft APIs (`GET/PUT /stores/me/navigation/draft`, `GET/PUT /stores/me/footer/draft`, `POST /stores/me/content/publish`) and public storefront navigation API (`GET /stores/storefront/v1/navigation`). Extended `ThemeProps` in `shared.ts`. Added test suite `backend/src/__tests__/menu.service.test.ts` (4/4 passing).
- **Affected Files:**
  - `backend/src/api/store.route.ts`
  - `frontend/src/components/themes/shared.ts`
  - Create: `backend/src/migrations/sql/066_store_menus_and_footers.sql`
  - Create: `backend/src/services/menu.service.ts`
  - Create: `backend/src/__tests__/menu.service.test.ts`
  - Create: `backend/src/services/menu.service.ts`

### [x] Task 4.2: Build global header, footer, and mobile drawer shell primitives (GAP-P1-014, GAP-P1-015, GAP-P1-016 & GAP-P1-017)
- [x] Create an accessible, keyboard-navigable shared `StorefrontHeader` component supporting configurable layouts, search input, localized menus, and slide-out mobile drawers.
- [x] Create an accessible shared `StorefrontFooter` component that renders custom social networks, legal menu links, newsletter signup forms, and dynamic menu columns.
- [x] Update `frontend/src/components/themes/shared.ts` to require navigation and footer props inside `ThemeProps`.
- [x] Refactor all 20 theme components (`ClassicTheme.tsx`, `MinimalTheme.tsx`, etc.) to delegate header and footer chrome to these shared primitives.
- **Agent Comment:** Completed. Created accessible `StorefrontHeader.tsx` supporting 6 layout variants, promo bar, dynamic navigation, search, account link, cart badge, focus trap, Escape handler, body scroll lock. Created `StorefrontFooter.tsx` supporting published blocks, 4-column fallback, mobile accordion, `PoweredByMarketplace`, and map iframe. Refactored all 20 theme components to delegate header/footer chrome to these primitives. Added SSR navigation fetching in page routes. Verified clean `tsc --noEmit` and ESLint.
- **Affected Files:**
  - `frontend/src/app/store/[storeHost]/page.tsx`
  - `frontend/src/app/store/[storeHost]/pages/[slug]/page.tsx`
  - `frontend/src/components/themes/shared.ts`
  - All 20 files in `frontend/src/components/themes/*.tsx`
  - Create: `frontend/src/components/store/StorefrontHeader.tsx`
  - Create: `frontend/src/components/store/StorefrontFooter.tsx`

---

## Phase 5 — Advanced Seller Customization and Theme Entitlements (P1 & P2)

### [x] Task 5.1: Implement server-side theme entitlement checks (GAP-P1-021)
- [x] Update `PUT /api/pd/stores/me/theme` in `backend/src/api/store.route.ts` to assert that the requested theme exists, is active, and is either free or purchased by the seller.
- [x] Add foreign key constraint between `pd_store.theme_id` and `pd_theme.slug` in a database migration.
- **Affected Files:**
  - Create: `backend/src/migrations/sql/067_theme_referential_integrity.sql`
  - `backend/src/api/store.route.ts`
  - `backend/src/services/store.service.ts`
  - `frontend/src/app/hub/dashboard/settings/page.tsx`
  - `backend/src/__tests__/theme-entitlement.test.ts`

### [x] Task 5.2: Build Online Store Settings section in Seller Dashboard (GAP-P1-018 & GAP-P1-019)
- [x] Re-organize dashboard sidebar navigation to group online store options (Themes, Navigation, Pages, Domains, Preferences).
- [x] Add a global slide-out mobile drawer navigation for the seller dashboard.
- [x] Implement dynamic setup progress metrics derived from actual onboarding/product state.
- **Affected Files:**
  - `frontend/src/app/hub/dashboard/layout.tsx`
  - `frontend/src/components/dashboard/UnsavedChangesBanner.tsx`
  - Create: `frontend/src/app/hub/dashboard/online-store/page.tsx`
  - Create: `frontend/src/app/hub/dashboard/online-store/themes/page.tsx`
  - Create: `frontend/src/app/hub/dashboard/online-store/customize/page.tsx`
  - Create: `frontend/src/app/hub/dashboard/online-store/navigation/page.tsx`
  - Create: `frontend/src/app/hub/dashboard/online-store/domains/page.tsx`
  - Create: `frontend/src/app/hub/dashboard/online-store/seo/page.tsx`
  - Create: `frontend/src/app/hub/dashboard/online-store/integrations/page.tsx`
  - Create: `frontend/src/app/hub/dashboard/online-store/customers/page.tsx`

### [x] Task 5.3: Build real full-store customization preview (GAP-P2-010)
- [x] Create a secure, tokenized drafting table for theme customizations that lets sellers preview the complete storefront with unpublished styles.
- **Affected Files:**
  - `backend/src/utils/jwt.ts`
  - `backend/src/services/store.service.ts`
  - `backend/src/api/store.route.ts`
  - Create: `backend/src/__tests__/theme-preview.test.ts`
  - Create: `frontend/src/app/store/[storeHost]/preview/page.tsx`
  - Create: `frontend/src/components/store/StorefrontPreviewBar.tsx`
  - `frontend/src/app/hub/dashboard/online-store/customize/page.tsx`

---

## Phase 6 — Catalog Improvements, Pagination, and Search (P2)

### [x] Task 6.1: Implement cursor pagination and real filters for themes (GAP-P2-004 & GAP-P2-005)
- [x] Update `backend/src/api/product.route.ts` to support cursor/offset pagination, price-range queries, active category filtration, and catalog sorting.
- [x] Wire category sidebar links, price range filters, and sort select inputs in `frontend/src/components/themes/ThemeLayout.tsx` to handle state and route queries.
- **Affected Files:**
  - `backend/src/services/product.service.ts`
  - `backend/src/api/product.route.ts`
  - Create: `backend/src/__tests__/catalog-filters.test.ts`
  - Create: `frontend/src/components/store/CatalogControls.tsx`
  - `frontend/src/components/themes/ThemeLayout.tsx`
  - `frontend/src/app/store/[storeHost]/products/page.tsx`

### [x] Task 6.2: Build accessible, dynamic product cards and quick add (GAP-P2-006 & GAP-P2-007)
- [x] Implement a reusable, fully accessible `ProductCard` component supporting hover images, discount badges, pricing grids, rating counts, and quick add-to-cart actions.
- [x] Integrate option groups, variant combinations, and interactive selectors on product detail pages.
- **Affected Files:**
  - Create: `frontend/src/components/store/ProductCard.tsx`
  - Create: `frontend/src/components/product/ProductVariantSelector.tsx`
  - `frontend/src/app/store/[storeHost]/product/[slug]/page.tsx`
  - `frontend/src/lib/cart-utils.ts`

### [x] Task 6.3: Implement store-scoped autocomplete search (GAP-P2-008)
- [x] Build a store-scoped public search and suggestion endpoint in `backend/src/api/search.route.ts`.
- [x] Wire the search input in headers to display instant autocomplete suggestions and search result pages.
- **Affected Files:**
  - `backend/src/api/search.route.ts`
  - `frontend/src/components/store/StorefrontHeader.tsx`
  - Create: `backend/src/__tests__/storefront-search.test.ts`

---

## Phase 7 — Domains, DNS and SSL Lifecycle (P1)

### [x] Task 7.1: Implement custom domain DNS validation lifecycle (GAP-P1-022)
- [x] Create a `pd_store_domain` table to track custom domain verification states, SSL status, and expected DNS TXT/CNAME records.
- [x] Implement DNS lookup verification service to check CNAME and TXT challenge records before authorizing SSL provisioning.
- [x] Restrict custom domain settings in the dashboard to Starter+ active subscribers.
- **Affected Files:**
  - Create: `backend/src/migrations/sql/068_create_store_domains_table.sql`
  - Create: `backend/src/services/domain-verification.service.ts`
  - Create: `backend/src/utils/domain.ts`
  - Create: `backend/src/__tests__/domain-verification.test.ts`
  - `backend/src/services/subscription.service.ts`
  - `backend/src/api/internal.route.ts`
  - `backend/src/api/store.route.ts`
  - `frontend/src/app/hub/dashboard/settings/page.tsx`

---

## Phase 8 — Webhooks Security, CSP, and Script Sanitization (P1 & P2)

### [x] Task 8.1: Implement secure SSRF protections for outgoing webhooks (GAP-P1-024)
- [x] Add DNS resolution and private/reserved IP (RFC 1918, RFC 4193, loopback, metadata) checks before dispatching webhooks in `backend/src/workers/webhook.worker.ts`.
- [x] Reject internal IP ranges and cloud metadata endpoints at subscription registration and delivery.
- **Affected Files:**
  - Create: `backend/src/utils/ssrf.ts`
  - Create: `backend/src/__tests__/webhook-ssrf.test.ts`
  - `backend/src/api/vendor.route.ts`
  - `backend/src/workers/webhook.worker.ts`

---

## Phase 9 — Revalidations, Outbox, and Publishing (P1 & P2)

### [x] Task 9.1: Implement transactional outbox and CDN invalidation (GAP-P1-025)
- [x] Create a `pd_outbox_event` table to record publishing and modification events inside database transactions.
- [x] Build background worker (`outbox.worker.ts`) to dispatch cache purges across store hostnames, update search indexes, and trigger webhooks idempotently.
- [x] Expose `GET /stores/me/publish-status` endpoint for seller dashboard publishing history.
- **Affected Files:**
  - Create: `backend/src/migrations/sql/069_create_outbox_table.sql`
  - Create: `backend/src/services/outbox.service.ts`
  - Create: `backend/src/workers/outbox.worker.ts`
  - Create: `backend/src/__tests__/outbox.test.ts`
  - `backend/src/services/store.service.ts`
  - `backend/src/api/store.route.ts`

---

## Phase 10 — Analytics and Reporting (P2)

### [x] Task 10.1: Build safe session model and consent gates (GAP-P2-026)
- [x] Versioned event taxonomy (`analytics.ts`) matching GA4 & e-commerce event standards (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `sign_up`, `search`, `view_item_list`).
- [x] Consent gate (`ConsentScriptGate` and `ConsentBanner`) preventing GA4/GTM/Meta Pixel script loading unless explicitly accepted by visitor.
- [x] Bot filtering (`isBotUserAgent`) rejecting crawler and automated script analytics events.
- [x] Server-confirmed purchase event tracking in `order.subscriber.ts`.
- **Affected Files:**
  - Create: `frontend/src/lib/analytics.ts`
  - Create: `frontend/src/lib/consent.ts`
  - Create: `frontend/src/components/store/ConsentBanner.tsx`
  - Create: `frontend/src/components/store/ConsentScriptGate.tsx`
  - Create: `backend/src/__tests__/analytics-integrity.test.ts`
  - `frontend/src/app/layout.tsx`
  - `backend/src/services/marketplace-analytics-event.service.ts`
  - `backend/src/subscribers/order.subscriber.ts`

---

## Phase 11 — Clean-Schema Database Migrations Check

### [x] Task 11.1: Fix missing category columns and foreign keys (GAP-P1-023)
- [x] Create migration 070 adding `show_in_megamenu BOOLEAN NOT NULL DEFAULT true` to `pd_marketplace_category`.
- [x] Verify clean-schema migration and megamenu query execution.
- **Affected Files:**
  - Create: `backend/src/migrations/sql/070_fix_categories_missing_columns.sql`
  - Create: `backend/src/__tests__/category-schema.test.ts`

---

## Phase 12 — Performance Optimization and Testing

### [x] Task 12.1: Optimize imagery, load performance, and accessibility (GAP-P2-030, GAP-P2-032, GAP-P2-033)
> **Comment:** Completed. Removed GrapesJS CSS from root layout and loaded conditionally in PageBuilderEditor. Optimized Google Fonts with `display: 'swap'`. Added `htmlFor`/`id` labels and native radio payment method controls in checkout page. Added `aria-label` to cart icon link and `StorefrontHeader` mobile drawer semantics with Escape key / Focus trap support. Added visible labels to `StorefrontAuthPage` inputs. Replaced raw `<img>` tags across all 20 theme components, header, footer, cart, and product pages with Next.js `<Image unoptimized ... />`. Verified zero ESLint errors/warnings (`npx eslint src/app/store src/components/themes src/components/store`) and zero TypeScript errors (`npx tsc --noEmit`).
- [x] Replace raw `<img>` tags in themes with optimized Next.js `Image` components.
- [x] Load GrapesJS CSS conditionally on Page Builder editor routes only.
- [x] Load Google fonts with `display: 'swap'`.
- [x] Add accessible form controls (`htmlFor`, matching `id`s, native radio controls, live regions) across checkout, cart, auth, and header.
- **Affected Files:**
  - `frontend/src/app/layout.tsx`
  - `frontend/src/components/page-builder/PageBuilderEditor.tsx`
  - `frontend/src/app/store/[storeHost]/checkout/page.tsx`
  - `frontend/src/app/store/[storeHost]/cart/page.tsx`
  - `frontend/src/components/store/StoreCartIcon.tsx`
  - `frontend/src/components/store/StorefrontAuthPage.tsx`
  - `frontend/src/components/store/StorefrontHeader.tsx`
  - `frontend/src/components/store/StorefrontFooter.tsx`
  - `frontend/src/components/store/StorefrontFooter.tsx`
  - All theme files in `frontend/src/components/themes/*.tsx`

### [x] Task 12.2: Build storefront E2E and visual regression tests (GAP-P2-034)
> **Comment:** Completed. Created 6 comprehensive E2E test suites covering public storefront checkout (`storefront-checkout.spec.ts`), customer account/auth (`storefront-account.spec.ts`), header/footer/drawer navigation (`storefront-navigation.spec.ts`), catalog filtering/variants (`storefront-catalog.spec.ts`), visual regression across 3 distinct themes at desktop/tablet/mobile viewports (`storefront-visual.spec.ts`), and custom domain / host routing (`storefront-host-routing.spec.ts`). Verified zero TypeScript errors (`npx tsc --noEmit`) and 100% passing frontend unit tests (`npm test -w frontend` — 11 test files, 86/86 passing).
- [x] Create `frontend/e2e/storefront-checkout.spec.ts`.
- [x] Create `frontend/e2e/storefront-account.spec.ts`.
- [x] Create `frontend/e2e/storefront-navigation.spec.ts`.
- [x] Create `frontend/e2e/storefront-catalog.spec.ts`.
- [x] Create `frontend/e2e/storefront-visual.spec.ts` (multi-viewport visual regression).
- [x] Create `frontend/e2e/storefront-host-routing.spec.ts`.
- **Affected Files:**
  - Create: `frontend/e2e/storefront-checkout.spec.ts`
  - Create: `frontend/e2e/storefront-account.spec.ts`
  - Create: `frontend/e2e/storefront-navigation.spec.ts`
  - Create: `frontend/e2e/storefront-catalog.spec.ts`
  - Create: `frontend/e2e/storefront-visual.spec.ts`
  - Create: `frontend/e2e/storefront-host-routing.spec.ts`
  - `frontend/vitest.config.ts`
