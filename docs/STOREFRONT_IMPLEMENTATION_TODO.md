# PandaMarket Storefront Implementation TODO Backlog

This backlog lists the precise tasks required to bring the PandaMarket public storefront, seller settings, and supporting APIs to a production-ready, launchable state. 

Ensure that each task is treated as an isolated, scoped commit with its own validation, following the delivery sequence below.

---

## Phase 1 — Security and Commerce Integrity (P0 Blockers)

### [ ] Task 1.1: Secure private file uploads and downloads (GAP-P0-001)
- [ ] Remove `PUT /upload-s3-mock/:bucket/*` and `GET /download-s3-mock/:bucket/*` from production API routes, or protect them with exact-key signature verification.
- [ ] Implement signature validation in `backend/src/api/files.route.ts` that restricts downloads/uploads to exact key matches, verified uploader tenant, purpose, and short-lived expiry.
- [ ] Ensure the mock file router is completely deactivated in `backend/src/main.ts` when running in `NODE_ENV === 'production'`.
- [ ] Add integration tests in `backend/src/__tests__/files.test.ts` for anonymous, expired, and cross-tenant upload/download attempts.
- **Affected Files:**
  - `backend/src/api/files.route.ts`
  - `backend/src/main.ts`
  - `backend/src/middlewares/csrf.middleware.ts`
  - Create: `backend/src/__tests__/files.test.ts`

### [ ] Task 1.2: Implement safe public store and product projections (GAP-P0-002)
- [ ] Remove `SELECT *` from `StoreService.getById` and `ProductService.getById` when accessed from public/unauthenticated routes.
- [ ] Define explicit TypeScript types and DTO interfaces in `packages/types/src/dtos.ts` for `StorefrontStorePublic` and `StorefrontProductPublic`.
- [ ] Ensure that `digital_file_key`, internal moderation remarks, exact inventory counts, and payment configs are completely omitted from public API payloads.
- [ ] Update `backend/src/api/store.route.ts` and `backend/src/api/product.route.ts` to enforce public publication checks (must be published and store must be verified).
- **Affected Files:**
  - `packages/types/src/dtos.ts`
  - `backend/src/api/store.route.ts`
  - `backend/src/api/product.route.ts`
  - `backend/src/services/store.service.ts`
  - `backend/src/services/product.service.ts`

### [ ] Task 1.3: Bind payment webhook captures to initialized payment attempts (GAP-P0-003)
- [ ] Run migration to create a `pd_payment_attempt` table to track expected amount, currency, merchant credentials, initialized gateway reference, and status.
- [ ] Update `PaymentService.initPayment` to record the attempt prior to redirecting the customer.
- [ ] Update `PaymentService.processPaymentWebhook` to fetch the payment attempt and assert that verified webhook payload details (amount, currency, merchant account, signature) match the local attempt.
- [ ] Enforce signature verification inside `backend/src/api/payment.route.ts` for the PayPal callback.
- **Affected Files:**
  - Create: `backend/src/migrations/sql/065_create_payment_attempts_table.sql`
  - `backend/src/services/payment.service.ts`
  - `backend/src/api/payment.route.ts`
  - Create: `backend/src/__tests__/payment-binding.test.ts`

### [ ] Task 1.4: Make checkout and payment initialization atomic (GAP-P0-004 & GAP-P0-005)
- [ ] Enforce an `Idempotency-Key` requirement for the public `/storefront/checkout` endpoint inside `backend/src/api/order.route.ts`.
- [ ] Harden inventory decrements in `backend/src/services/order.service.ts` to run inside a database transaction with a guarded `inventory_quantity >= requested_quantity` clause, returning an error on oversell instead of allowing negative balances.
- [ ] Ensure serial keys are allocated atomically in `order.service.ts` with a short reservation lock and released if payment initialization fails or expires.
- **Affected Files:**
  - `backend/src/api/order.route.ts`
  - `backend/src/services/order.service.ts`
  - Create: `backend/src/__tests__/checkout-concurrency.test.ts`

### [ ] Task 1.5: Enforce multi-vendor isolation for order cancellations (GAP-P0-006)
- [ ] Update `backend/src/api/order.route.ts` to restrict the vendor cancellation action exclusively to `orderService.cancelStoreFulfillment`, verifying that the requesting vendor cannot cancel items they do not own.
- [ ] Remove vendor access to the global, whole-order `orderService.cancel` endpoint.
- **Affected Files:**
  - `backend/src/api/order.route.ts`
  - `backend/src/services/order.service.ts`
  - Create: `backend/src/__tests__/vendor-cancel-isolation.test.ts`

---

## Phase 2 — Storefront Routing, Tenant Isolation, and Callbacks (P1)

### [ ] Task 2.1: Enforce strict storefront tenant isolation (GAP-P1-001)
- [ ] Derive `store_id` exclusively from the resolved domain/hostname inside `requireStorefrontCustomer` middleware.
- [ ] Remove client-provided `store_id` from public storefront checkout, address, wishlist, and cart API schemas.
- [ ] Restrict order list/detail views in `backend/src/api/order.route.ts` to return only current-store items when fetched using a storefront session.
- **Affected Files:**
  - `backend/src/middlewares/index.ts` (specifically `requireStorefrontCustomer`)
  - `backend/src/api/order.route.ts`
  - `backend/src/api/address.route.ts`
  - `backend/src/api/wishlist.route.ts`

### [ ] Task 2.2: Harmonize host classification and relative Hub links (GAP-P1-011 & GAP-P1-012)
- [ ] Consolidate host classification logic between `frontend/src/middleware.ts` and `frontend/src/lib/store-hosts.ts` to use a single, environment-backed list of Hub domains.
- [ ] Create an absolute Hub URL helper `getHubAbsoluteUrl(path)` inside `frontend/src/lib/storefront-url.ts` to replace relative `/hub` links that break under custom domains.
- [ ] Update header, footer, cart, checkout, error, and not-found components to use absolute links when linking back to the marketplace Hub or login.
- **Affected Files:**
  - `frontend/src/middleware.ts`
  - `frontend/src/lib/store-hosts.ts`
  - Create: `frontend/src/lib/storefront-url.ts`
  - `frontend/src/components/themes/ClassicTheme.tsx` (and other affected theme components)
  - `frontend/src/components/themes/PoweredByMarketplace.tsx`
  - `frontend/src/app/store/[storeHost]/cart/page.tsx`
  - `frontend/src/app/store/[storeHost]/checkout/page.tsx`

### [ ] Task 2.3: Implement storefront payment return and success routes (GAP-P1-004)
- [ ] Update `PaymentService.initPayment` to read the canonical storefront origin from the request or order metadata, generating callback URLs like `https://{storeHost}/checkout/success?order={orderId}`.
- [ ] Create a dedicated, branded storefront success page under `frontend/src/app/store/[storeHost]/checkout/success/page.tsx`.
- [ ] Create a storefront checkout failure/pending handler.
- **Affected Files:**
  - `backend/src/services/payment.service.ts`
  - Create: `frontend/src/app/store/[storeHost]/checkout/success/page.tsx`
  - Create: `frontend/src/app/store/[storeHost]/checkout/status/page.tsx`

---

## Phase 3 — Storefront Customer Accounts and Fulfillment (P1 & P2)

### [ ] Task 3.1: Implement complete buyer account, profile, and security views (GAP-P2-001 & GAP-P1-002)
- [ ] Implement storefront password reset, email verification, and profile/address update routes under `backend/src/api/storefront-auth.route.ts`.
- [ ] Create buyer-facing profile, address, and security pages under `frontend/src/app/store/[storeHost]/account/**`.
- [ ] Implement a revocable session model with refresh-token rotation for storefront logins.
- **Affected Files:**
  - `backend/src/api/storefront-auth.route.ts`
  - `backend/src/services/storefront-auth.service.ts`
  - Create: `frontend/src/app/store/[storeHost]/account/page.tsx`
  - Create: `frontend/src/app/store/[storeHost]/account/addresses/page.tsx`
  - Create: `frontend/src/app/store/[storeHost]/account/orders/page.tsx`

### [ ] Task 3.2: Complete digital and serial storefront fulfillment (GAP-P1-008)
- [ ] Build a storefront digital download and serial license-key display API inside `backend/src/api/product.route.ts`, authorizing requests via storefront customer session.
- [ ] Build a "My Downloads & Keys" section in the storefront buyer account dashboard.
- [ ] Protect digital asset paths with secure S3/MinIO signed download URLs.
- **Affected Files:**
  - `backend/src/api/product.route.ts`
  - Create: `frontend/src/app/store/[storeHost]/account/downloads/page.tsx`

### [ ] Task 3.3: Complete storefront Mandat Minute uploads (GAP-P1-005)
- [ ] Implement a storefront-accessible payment receipt upload API in `backend/src/api/payment.route.ts` that accepts `storefront_customer_id` and stores receipt files securely.
- [ ] Add an "Upload Post Slip Receipt" trigger in the storefront order detail view under the buyer account.
- **Affected Files:**
  - `backend/src/api/payment.route.ts`
  - Create: `frontend/src/app/store/[storeHost]/account/orders/[id]/page.tsx`

---

## Phase 4 — Unified Storefront Navigation, Menus, Header & Footer (P1)

### [ ] Task 4.1: Design database-backed store menus and footer schemas (GAP-P1-013)
- [ ] Run migration to create `pd_store_menu`, `pd_store_menu_item`, and `pd_store_footer` tables to track nested, store-scoped link hierarchies.
- [ ] Implement CRUD APIs under `backend/src/api/store.route.ts` for managing menus (Header, Footer Columns, Legal) and draft/published revisions.
- **Affected Files:**
  - Create: `backend/src/migrations/sql/066_store_menus_and_footers.sql`
  - `backend/src/api/store.route.ts`
  - Create: `backend/src/services/menu.service.ts`

### [ ] Task 4.2: Build global header, footer, and mobile drawer shell primitives (GAP-P1-014, GAP-P1-015, GAP-P1-016 & GAP-P1-017)
- [ ] Create an accessible, keyboard-navigable shared `StorefrontHeader` component supporting configurable layouts, search input, localized menus, and slide-out mobile drawers.
- [ ] Create an accessible shared `StorefrontFooter` component that renders custom social networks, legal menu links, newsletter signup forms, and dynamic menu columns.
- [ ] Update `frontend/src/components/themes/shared.ts` to require navigation and footer props inside `ThemeProps`.
- [ ] Refactor all 20 theme components (`ClassicTheme.tsx`, `MinimalTheme.tsx`, etc.) to delegate header and footer chrome to these shared primitives.
- **Affected Files:**
  - Create: `frontend/src/components/store/StorefrontHeader.tsx`
  - Create: `frontend/src/components/store/StorefrontFooter.tsx`
  - `frontend/src/components/themes/shared.ts`
  - All files in `frontend/src/components/themes/*.tsx` (20 files)

---

## Phase 5 — Advanced Seller Customization and Theme Entitlements (P1 & P2)

### [ ] Task 5.1: Implement server-side theme entitlement checks (GAP-P1-021)
- [ ] Update `PUT /api/pd/stores/me/theme` in `backend/src/api/store.route.ts` to assert that the requested theme exists, is active, and is either free or purchased by the seller.
- [ ] Add foreign key constraint between `pd_store.theme_id` and `pd_theme.id` in a database migration.
- **Affected Files:**
  - Create: `backend/src/migrations/sql/067_theme_referential_integrity.sql`
  - `backend/src/api/store.route.ts`
  - `backend/src/services/store.service.ts`

### [ ] Task 5.2: Build Online Store Settings section in Seller Dashboard (GAP-P1-018 & GAP-P1-019)
- [ ] Re-organize dashboard sidebar navigation to group online store options (Themes, Navigation, Pages, Domains, Preferences).
- [ ] Add a global slide-out mobile drawer navigation for the seller dashboard.
- [ ] Implement dynamic setup progress metrics derived from actual onboarding/product state.
- **Affected Files:**
  - `frontend/src/app/hub/dashboard/layout.tsx`
  - Create: `frontend/src/app/hub/dashboard/online-store/page.tsx`
  - Create: `frontend/src/app/hub/dashboard/online-store/navigation/page.tsx`

### [ ] Task 5.3: Build real full-store customization preview (GAP-P2-010)
- [ ] Create a secure, tokenized drafting table for theme customizations that lets sellers preview the complete storefront with unpublished styles.
- **Affected Files:**
  - `backend/src/api/store.route.ts`
  - Create: `frontend/src/app/store/[storeHost]/preview/page.tsx`

---

## Phase 6 — Catalog Improvements, Pagination, and Search (P2)

### [ ] Task 6.1: Implement cursor pagination and real filters for themes (GAP-P2-004 & GAP-P2-005)
- [ ] Update `backend/src/api/product.route.ts` to support cursor/offset pagination, price-range queries, active category filtration, and catalog sorting.
- [ ] Wire category sidebar links, price range filters, and sort select inputs in `frontend/src/components/themes/ThemeLayout.tsx` to handle state and route queries.
- **Affected Files:**
  - `backend/src/api/product.route.ts`
  - `frontend/src/components/themes/ThemeLayout.tsx`
  - `frontend/src/app/store/[storeHost]/products/page.tsx`

### [ ] Task 6.2: Build accessible, dynamic product cards and quick add (GAP-P2-006 & GAP-P2-007)
- [ ] Implement a reusable, fully accessible `ProductCard` component supporting hover images, discount badges, pricing grids, rating counts, and quick add-to-cart actions.
- [ ] Integrate option groups, variant combinations, and interactive selectors on product detail pages.
- **Affected Files:**
  - Create: `frontend/src/components/store/ProductCard.tsx`
  - `frontend/src/app/store/[storeHost]/product/[slug]/page.tsx`

### [ ] Task 6.3: Implement store-scoped autocomplete search (GAP-P2-008)
- [ ] Build a store-scoped public search and suggestion endpoint in `backend/src/api/search.route.ts`.
- [ ] Wire the search input in headers to display instant autocomplete suggestions and search result pages.
- **Affected Files:**
  - `backend/src/api/search.route.ts`
  - `frontend/src/components/store/StorefrontHeader.tsx`

---

## Phase 7 — Domains, DNS and SSL Lifecycle (P1)

### [ ] Task 7.1: Implement custom domain DNS validation lifecycle (GAP-P1-022)
- [ ] Create a `pd_store_domain` table to track custom domain verification states, SSL status, and expected DNS TXT/CNAME records.
- [ ] Implement background check workers that run `dig` queries to verify custom DNS pointings before authorizing SSL provisioning.
- [ ] Restrict custom domain settings in the dashboard to Starter+ active subscribers.
- **Affected Files:**
  - Create: `backend/src/migrations/sql/068_create_store_domains_table.sql`
  - Create: `backend/src/services/domain-verification.service.ts`
  - `backend/src/api/internal.route.ts`

---

## Phase 8 — Webhooks Security, CSP, and Script Sanitization (P1 & P2)

### [ ] Task 8.1: Implement secure SSRF protections for outgoing webhooks (GAP-P1-024)
- [ ] Add DNS resolution and private/reserved IP (RFC 1918, RFC 4193, loopback, metadata) checks before dispatching webhooks in `backend/src/workers/webhook.worker.ts`.
- [ ] Sanitize and restrict custom scripts or pixel snippets uploaded by sellers to prevent XSS.
- **Affected Files:**
  - `backend/src/workers/webhook.worker.ts`
  - `backend/src/utils/sanitize-html.ts`

---

## Phase 9 — Revalidations, Outbox, and Publishing (P1 & P2)

### [ ] Task 9.1: Implement transactional outbox and CDN invalidation (GAP-P1-025)
- [ ] Create a `pd_outbox_event` table to record publishing and modification events inside database transactions.
- [ ] Build background workers to dispatch cache purges, update Meilisearch indexes, and trigger webhooks.
- **Affected Files:**
  - Create: `backend/src/migrations/sql/069_create_outbox_table.sql`
  - Create: `backend/src/services/outbox.service.ts`

---

## Phase 10 — Analytics and Reporting (P2)

### [ ] Task 10.1: Build safe session model and consent gates (GAP-P2-026)
- [ ] Implement anonymous storefront visitor session IDs using secure, HttpOnly cookies.
- [ ] Build server-confirmed checkout conversion triggers to register reliable sales KPIs.
- **Affected Files:**
  - `backend/src/api/analytics.route.ts`
  - `frontend/src/lib/analytics.ts`

---

## Phase 11 — Clean-Schema Database Migrations Check

### [ ] Task 11.1: Fix missing category columns and foreign keys (GAP-P1-023)
- [ ] Add `show_in_megamenu` boolean to `pd_marketplace_category` inside database migrations to ensure clean installations succeed.
- **Affected Files:**
  - Create: `backend/src/migrations/sql/070_fix_categories_missing_columns.sql`

---

## Phase 12 — Performance Optimization and Testing

### [ ] Task 12.1: Optimize imagery, load performance, and accessibility (GAP-P2-030)
- [ ] Replace raw `<img>` tags in themes with optimized `next/image` components.
- [ ] Build storefront-wide E2E tests covering multi-vendor carts, custom domains, and concurrent checkouts.
- **Affected Files:**
  - All files in `frontend/src/components/themes/*.tsx`
  - Create: `frontend/e2e/storefront-checkout.spec.ts`
