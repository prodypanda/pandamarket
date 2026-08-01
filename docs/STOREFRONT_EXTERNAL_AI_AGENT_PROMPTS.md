# PandaMarket Storefront — External AI Agent Prompt Pack

> **Created:** 2026-08-01  
> **Purpose:** Ready-to-paste prompts for an external AI coding agent. Each prompt is self-contained and references exact file paths, gap IDs, and acceptance criteria.  
> **Companion documents:**  
> - `docs/STOREFRONT_GAP_ANALYSIS.md` (why each task exists)  
> - `docs/STOREFRONT_IMPLEMENTATION_TODO.md` (checkable backlog)  
> - `docs/AGENT_CHECKPOINT_2026-05-06.md` (routing/theming rules to preserve)

## How to use this document

1. Execute prompts in order. Later phases depend on contracts and migrations introduced earlier.
2. Each prompt is designed to be copied into a fresh agent session. The agent does not share your conversation history, so every prompt includes the full context needed.
3. After each prompt completes, run the validation commands listed before moving on.
4. If a prompt uncovers a new issue, do not expand scope. Note it and continue.
5. Never ask the agent to implement visual customization before Phase 1 (security/commerce blockers) is complete.

## Global rules every agent must follow

- Read `docs/AGENT_CHECKPOINT_2026-05-06.md` before touching routing or theme files.
- Keep Hub marketplace routes and storefront subdomain routes separate.
- Use shared theme helpers (`useThemeCustomization`, `colorVars`, `getStorefrontProductPath`, `StorefrontThemeCartLink`, `StoreCartIcon`) — never duplicate cart/navigation logic per theme.
- Preserve store-scoped cart behavior; never call `clearCart()` from a storefront success path.
- Use raw parameterized SQL, `pd_` table prefix, Zod validation, `fetchWithCsrf`, tenant isolation, and audit logging for admin/seller writes.
- Ship each task as an isolated change with its own validation. Do not bundle unrelated features.
- Inspect current code before implementing; the repository is the final authority, not these documents.

## Validation commands reference

```powershell
# Backend
cd backend && npm run type-check && npm run lint && npm test

# Frontend
cd frontend && npx tsc --noEmit --types vitest/globals --pretty false
cd frontend && npx eslint src/app/store src/components/themes src/components/store src/contexts src/lib --no-error-on-unmatched-pattern
cd frontend && npm test -- src/__tests__/cart-context.test.tsx

# Migrations (from backend)
cd backend && npm run migrate
```

---

## Phase 1 — Security and Commerce Integrity (P0)

### Prompt 1.1 — Secure private file uploads and downloads (GAP-P0-001)

You are working in the PandaMarket monorepo (`pandamarket/`). The backend is in `backend/`, frontend in `frontend/`, shared types in `packages/types/`.

**Problem:** The backend exposes unauthenticated mock file upload/download routes (`PUT /upload-s3-mock/:bucket/*` and `GET /download-s3-mock/:bucket/*`) in `backend/src/api/files.route.ts`. These routes accept up to 110 MB, write to local storage, persist blobs in `pd_file_blobs`, and are exempt from CSRF in `backend/src/middlewares/csrf.middleware.ts`. Download falls back to fuzzy filename matching instead of exact-key authorization. The router is mounted unconditionally in `backend/src/main.ts`.

**Task:** Secure these routes so they cannot be abused in production.

**Requirements:**
1. In `backend/src/main.ts`, mount the mock file routes only when `NODE_ENV !== 'production'`. In production, these routes must not exist.
2. If the routes are enabled (dev/test only), require a short-lived signed token bound to: exact bucket, normalized key, asset owner/store/customer, purpose, max size, content type, and expiry. Remove fuzzy filename lookup entirely.
3. Remove the CSRF exemption for the upload path unless a documented dev-only reason remains.
4. Write tests in a new file `backend/src/__tests__/files.test.ts` covering: anonymous upload rejected, anonymous download rejected, cross-tenant download rejected, expired token rejected, oversized upload rejected, and valid signed download succeeds.

**Files to read first:**
- `backend/src/api/files.route.ts`
- `backend/src/main.ts`
- `backend/src/middlewares/csrf.middleware.ts`
- `backend/src/migrations/sql/048_create_pd_file_blobs_table.sql`
- `backend/src/services/file-asset.service.ts` (for the protected presign pattern to mirror)

**Acceptance criteria:**
- `npm run type-check -w backend` passes.
- `npm test -w backend` passes including new file tests.
- In a production-mode boot, the mock routes return 404.
- No fuzzy filename matching remains anywhere in the codebase.

---

### Prompt 1.2 — Implement safe public store and product projections (GAP-P0-002)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Public, unauthenticated store and product endpoints use `SELECT *` / `p.*` and return internal fields including `owner_id`, `payment_config`, `settings`, moderation status, rejection reasons, exact inventory, and `digital_file_key`.

- `backend/src/api/store.route.ts` exposes `GET /api/pd/stores/:id` backed by `StoreService.getById` which uses `SELECT *`.
- `backend/src/api/product.route.ts` exposes `GET /api/pd/products/:id` backed by `ProductService.getById` which selects `p.*`.
- `ProductService.getPublishedByStoreSlug` also selects `p.*`.
- Safer projection helpers (`publicStorefrontStore`, `publicStorefrontSettings`) already exist in `store.route.ts` but are not the only public path.

**Task:** Ensure every public/unauthenticated store and product response returns only safe, explicitly selected columns.

**Requirements:**
1. Define `StorefrontStorePublic` and `StorefrontProductPublic` interfaces in `packages/types/src/dtos.ts`. A store public response must include only: `id`, `name`, `subdomain`, `custom_domain`, `theme_id`, `seller_type`, `description`, `is_verified`, `status`, and the `publicStorefrontSettings` allowlist. A product public response must include: `id`, `store_id`, `title`, `slug`, `description`, `price`, `currency`, `thumbnail`, `media`, `variants`, `availability`, and `seo` fields — never `digital_file_key`, exact `inventory_quantity`, cost data, or moderation fields.
2. Add dedicated SQL projection queries in `StoreService` and `ProductService` for public lookups. Do not sanitize after `SELECT *`.
3. Require published product + verified/public store for every anonymous product response.
4. Write response-contract tests in `backend/src/__tests__/public-projection.test.ts` that fail if any private field appears in the JSON response.

**Files to read first:**
- `backend/src/api/store.route.ts`
- `backend/src/api/product.route.ts`
- `backend/src/services/store.service.ts`
- `backend/src/services/product.service.ts`
- `packages/types/src/dtos.ts`
- `packages/types/src/entities.ts` (documents that payment_config must never be returned)

**Acceptance criteria:**
- `npm run build -w @pandamarket/types` passes.
- `npm run type-check -w backend` passes.
- New projection tests pass and assert absence of `owner_id`, `payment_config`, `digital_file_key`, `rejection_reason`, and exact `inventory_quantity`.

---

### Prompt 1.3 — Bind payment webhook captures to initialized payment attempts (GAP-P0-003)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** `PaymentService.processPaymentWebhook` accepts a caller/provider-supplied local `order_id`, verifies the provider event, but does not compare the verified provider reference with the order's initialized `payment_reference`. It does not compare `verifyResult.amount` with `order.total`, nor verify expected currency or merchant account. The PayPal route in `backend/src/api/payment.route.ts` computes `signatureValid` but still calls `processPaymentWebhook` when the signature is invalid.

**Task:** Make payment capture strongly bound to the initialized local payment attempt.

**Requirements:**
1. Create migration `backend/src/migrations/sql/065_create_payment_attempts_table.sql` with a `pd_payment_attempt` table containing: `id`, `order_id`, `gateway`, `gateway_reference` (unique), `expected_amount_minor` (bigint), `expected_currency`, `merchant_account_id`, `status` (`initialized` / `captured` / `failed` / `expired`), `created_at`, `updated_at`.
2. In `PaymentService.initPayment`, insert a payment attempt row before returning the redirect URL.
3. In `PaymentService.processPaymentWebhook`, resolve the payment attempt by `(gateway, gateway_reference)` rather than trusting the webhook `order_id`. Require: valid signature, exact provider reference match, exact amount match (`verifyResult.amount` vs `expected_amount_minor`), exact currency match, and correct merchant account. Use a transactional compare-and-set from `initialized` to `captured`.
4. In `backend/src/api/payment.route.ts`, reject PayPal callbacks with invalid signatures before calling `processPaymentWebhook`.
5. Write tests in `backend/src/__tests__/payment-binding.test.ts` covering: wrong reference, underpayment, wrong currency, invalid PayPal signature, duplicate delivery, and valid capture.

**Files to read first:**
- `backend/src/services/payment.service.ts`
- `backend/src/api/payment.route.ts`
- `backend/src/services/order.service.ts` (for `markPaid`)
- `backend/src/migrations/sql/002_payment_idempotency_and_webhooks.sql`
- `backend/src/plugins/payment/payment-provider.interface.ts`

**Acceptance criteria:**
- Migration applies cleanly on a fresh database.
- `npm run type-check -w backend` passes.
- New payment-binding tests pass.
- Invalid signatures are rejected with 401/403.
- Underpayment does not mark the order paid.

---

### Prompt 1.4 — Make checkout idempotent and prevent inventory overselling (GAP-P0-004 & GAP-P0-005)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Storefront checkout creates the order and mutates inventory/serial allocation before online payment initialization. If payment init fails, the cart remains actionable and a retry creates another order. `backend/src/api/order.route.ts` does not require an idempotency key. Inventory decrement in `backend/src/services/order.service.ts` does not use a guarded `inventory_quantity >= requested_quantity` clause, so concurrent checkouts can oversell.

**Task:** Make storefront checkout durably idempotent and inventory mutation concurrency-safe.

**Requirements:**
1. Require an `Idempotency-Key` header on `POST /api/pd/orders/storefront/checkout`. If the key was already used, return the existing order/attempt instead of creating a new one.
2. Wrap product/variant inventory reads and decrements in one transaction. Use guarded atomic updates:
   ```sql
   UPDATE pd_product
   SET inventory_quantity = inventory_quantity - $1
   WHERE id = $2 AND inventory_quantity >= $1
   RETURNING inventory_quantity;
   ```
   Require exactly one returned row per line item. Apply the same pattern to variants. Lock rows in deterministic order to avoid deadlocks.
3. Add a nonnegative inventory constraint via migration after documenting a data-cleanup step for any existing negative values.
4. Reserve serial keys with `FOR UPDATE SKIP LOCKED` (pattern already exists in `order.service.ts`) and release them if payment initialization fails or the reservation expires.
5. Write tests in `backend/src/__tests__/checkout-concurrency.test.ts` using a real PostgreSQL connection to simulate two concurrent checkouts of the same last-item.

**Files to read first:**
- `backend/src/api/order.route.ts`
- `backend/src/services/order.service.ts`
- `backend/src/validators/index.ts` (unused shared validator with integer/max-100 quantity)
- `backend/src/migrations/sql/001_initial_schema.sql`

**Acceptance criteria:**
- Duplicate `Idempotency-Key` returns the original order.
- Concurrent checkout of the last item: one succeeds, one gets a clear out-of-stock error.
- `npm run type-check -w backend` and `npm test -w backend` pass.

---

### Prompt 1.5 — Enforce multi-vendor cancellation isolation (GAP-P0-006)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** `backend/src/api/order.route.ts` permits a vendor to cancel an entire multi-vendor order if they own at least one line item, then calls global `OrderService.cancel` which cancels the parent order and restocks every item. A correct store-scoped implementation `OrderService.cancelStoreFulfillment` already exists and is exposed at `order.route.ts:316`.

**Task:** Remove vendor access to global cancellation; restrict to store-scoped fulfillment cancellation.

**Requirements:**
1. Remove the vendor-accessible global cancellation route, or change it so a vendor request only calls `orderService.cancelStoreFulfillment(orderId, req.user.store_id)`.
2. Whole-order cancellation remains available only to the buyer or platform support under explicit status rules.
3. Vendor refunds must be store-level allocated amounts with an auditable refund record.
4. Write tests in `backend/src/__tests__/vendor-cancel-isolation.test.ts`: Vendor A cancels their item in a multi-vendor order; Vendor B's fulfillment and inventory are unchanged.

**Files to read first:**
- `backend/src/api/order.route.ts` (lines around 316 and 335-353)
- `backend/src/services/order.service.ts` (`cancel` and `cancelStoreFulfillment`)

**Acceptance criteria:**
- A vendor cannot restock or cancel another vendor's items.
- `npm test -w backend` passes including the new isolation test.

---

## Phase 2 — Tenant Isolation, Host Routing, and Payment Callbacks (P1)

### Prompt 2.1 — Enforce strict storefront tenant isolation (GAP-P1-001)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Storefront checkout accepts an optional client-provided `store_id` in `backend/src/api/order.route.ts`. `requireStorefrontCustomer` only compares stores when the request includes a store identifier. A Store A customer token could omit `store_id`, buy Store B products, and receive cross-store order details.

**Task:** Derive `store_id` exclusively from the validated hostname plus storefront session; remove client-provided `store_id` from public storefront bodies.

**Requirements:**
1. In `requireStorefrontCustomer` (`backend/src/middlewares/index.ts`), resolve and attach `store_id` from the request host (or a signed token claim) — never from the request body or query.
2. Remove `store_id` from `checkoutSchema` and all public storefront checkout/payment/address/wishlist/cart schemas.
3. `OrderService.listByStorefrontCustomer` must return only current-store items.
4. Apply the same boundary to addresses, wishlist, reviews, downloads, receipts, and account resources.
5. Write a test in `backend/src/__tests__/tenant-isolation.test.ts`: Store A storefront token attempts Store B checkout, order list, address, and download — all must fail.

**Files to read first:**
- `backend/src/middlewares/index.ts`
- `backend/src/api/order.route.ts`
- `backend/src/api/address.route.ts`
- `backend/src/api/wishlist.route.ts`
- `backend/src/services/order.service.ts`

**Acceptance criteria:**
- Cross-store checkout returns 403.
- Cross-store order list returns only Store A items.
- `npm test -w backend` passes.

---

### Prompt 2.2 — Harmonize host classification and fix relative Hub links (GAP-P1-011 & GAP-P1-012)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Hub/storefront host classification exists in both `frontend/src/middleware.ts` and `frontend/src/lib/store-hosts.ts` with different special cases, so the same request can be classified differently. Themes and storefront error/checkout/cart states contain relative `/hub` or `/hub/login` links that break on storefront subdomains/custom domains because middleware rewrites them under the store route.

**Task:** Unify host classification and replace all relative Hub links with absolute URLs.

**Requirements:**
1. Create one serializable host-classification function in `frontend/src/lib/store-hosts.ts` (e.g. `classifyHost(host): 'hub' | 'storefront' | 'localhost'`). Use it in both `middleware.ts` and application helpers. Support: localhost, central production host, `www`, preview/render hosts, subdomains, and custom domains. Drive special cases from environment variables.
2. Create `getHubAbsoluteUrl(path)` and `getStorefrontAbsoluteUrl(host, path)` helpers in `frontend/src/lib/storefront-url.ts` that build absolute URLs using the configured Hub domain.
3. Replace every relative `/hub` link in themes, cart, checkout, error, not-found, and `PoweredByMarketplace` with the absolute helper.
4. Add table-driven tests for host classification.

**Files to read first:**
- `frontend/src/middleware.ts`
- `frontend/src/lib/store-hosts.ts`
- `frontend/src/lib/store-routing.ts`
- `frontend/src/components/themes/PoweredByMarketplace.tsx`
- `frontend/src/components/themes/ClassicTheme.tsx` (example of hardcoded `/hub/login`)
- `frontend/src/app/store/[storeHost]/cart/page.tsx`
- `frontend/src/app/store/[storeHost]/checkout/page.tsx`
- `frontend/src/app/store/[storeHost]/error.tsx`
- `frontend/src/app/store/[storeHost]/not-found.tsx`
- `frontend/src/components/store/StorefrontMaintenancePage.tsx` (correct absolute-URL pattern to mirror)

**Acceptance criteria:**
- `npx tsc --noEmit --types vitest/globals --pretty false` passes.
- `npx eslint src/app/store src/components/themes src/components/store src/lib --no-error-on-unmatched-pattern` reports 0 errors.
- On a storefront subdomain, `/hub/login` is no longer generated; an absolute Hub URL is used.

---

### Prompt 2.3 — Implement storefront payment return and success routes (GAP-P1-004)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** `PaymentService.initPayment` always generates Hub callbacks (`/hub/checkout/success?order=...` and `/hub/checkout?order=...&status=failed`) even for storefront orders. The Hub success page reads `order_id` while the payment service sends `order`, and it claims success without verifying order/payment status. "View Order Status" is a button with no handler.

**Task:** Generate storefront-branded callback URLs and add storefront success/failure pages that verify status server-side.

**Requirements:**
1. In `PaymentService.initPayment`, accept a `return_origin` parameter (the canonical storefront origin). Generate `success_url` as `{return_origin}/checkout/success?order={id}` and `fail_url` as `{return_origin}/checkout?status=failed&order={id}`.
2. The storefront checkout page must pass its own origin as `return_origin` when calling the payment init endpoint.
3. Create `frontend/src/app/store/[storeHost]/checkout/success/page.tsx` that reads `order` from the query, fetches order/payment status from the backend, and only shows success if the order is paid or pending confirmation. Show pending/instructions for Mandat/COD.
4. Create `frontend/src/app/store/[storeHost]/checkout/status/page.tsx` for failure/pending states.
5. Keep Hub callbacks for Hub checkout unchanged.

**Files to read first:**
- `backend/src/services/payment.service.ts`
- `backend/src/api/payment.route.ts` (storefront init endpoint)
- `frontend/src/app/store/[storeHost]/checkout/page.tsx`
- `frontend/src/app/hub/checkout/success/page.tsx` (Hub reference, do not break it)

**Acceptance criteria:**
- Storefront payment returns to the storefront origin, not Hub.
- Success page does not claim success for unpaid orders.
- `npx tsc --noEmit` passes.

---

## Phase 3 — Storefront Buyer Accounts and Fulfillment (P1 & P2)

### Prompt 3.1 — Implement complete buyer account, profile, and security flows (GAP-P1-002 & GAP-P2-001)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Storefront auth (`backend/src/api/storefront-auth.route.ts`) provides register/login/me/logout only. There are no email verification, forgot/reset password, password change, refresh rotation, session list/revoke, profile update, consent, or deletion flows. The frontend has no `/account` area.

**Task:** Add complete storefront buyer account flows.

**Requirements:**
1. Add backend endpoints: `/storefront-auth/verify-email`, `/storefront-auth/forgot-password`, `/storefront-auth/reset-password`, `/storefront-auth/refresh`, `/storefront-auth/sessions` (list/revoke), `/storefront/account/profile`, `/storefront/account/password`, `/storefront/account/addresses`.
2. Use short-lived access tokens plus rotating refresh tokens stored in a revocable session table. Disabled/deleted customers must not keep using old tokens.
3. Add public-store eligibility checks to registration and auth.
4. Create frontend pages under `frontend/src/app/store/[storeHost]/account/**`: overview, profile, addresses, orders, security/sessions.
5. Add a storefront logout control.
6. Write tests for verification, reset, refresh rotation, logout revocation, and disabled-account token rejection.

**Files to read first:**
- `backend/src/api/storefront-auth.route.ts`
- `backend/src/services/storefront-auth.service.ts`
- `backend/src/migrations/sql/012_storefront_customers.sql`
- `frontend/src/components/store/StorefrontAuthPage.tsx`

**Acceptance criteria:**
- A storefront buyer can register, verify email, reset password, log in, view orders, update profile/addresses, view/revoke sessions, and log out.
- Disabled account tokens are rejected.
- `npm test -w backend` passes.

---

### Prompt 3.2 — Complete digital and serial storefront fulfillment (GAP-P1-008)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Storefront orders can include digital/serial products, but the download endpoint in `backend/src/api/product.route.ts` requires central `requireAuth` and authorizes via `order.customer_id`, not `storefront_customer_id`. Serial keys can be allocated during checkout but no storefront page exposes them.

**Task:** Add store-scoped digital entitlements and license-key access.

**Requirements:**
1. Add `/storefront/account/downloads` endpoint that returns entitlements for the current storefront customer, keyed by store and order, only after qualifying payment state.
2. Generate secure short-lived signed download URLs for digital files.
3. Add a "My Downloads & Licenses" page under `frontend/src/app/store/[storeHost]/account/downloads/page.tsx` showing product, license key (for serial products), download button, expiry, and download limits.
4. Add audit logging for downloads.
5. Write tests for unauthorized access, cross-store access, unpaid order, and valid download.

**Files to read first:**
- `backend/src/api/product.route.ts` (existing digital download endpoint)
- `backend/src/services/order.service.ts` (serial allocation)
- `backend/src/migrations/sql/011_digital_downloads.sql`

**Acceptance criteria:**
- Storefront customer can download paid digital products and view serial keys.
- Cross-store and unpaid access are rejected.
- `npm test -w backend` passes.

---

### Prompt 3.3 — Complete storefront Mandat Minute receipt uploads (GAP-P1-005)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Storefront checkout advertises Mandat receipt upload but offline checkout clears the cart and shows generic success without a receipt workflow. The existing receipt-upload API requires central `requireAuth` and authorizes via `order.customer_id`, not `storefront_customer_id`.

**Task:** Add a storefront-accessible Mandat receipt upload and verification flow.

**Requirements:**
1. Add a storefront receipt upload endpoint that accepts `storefront_customer_id` and stores receipt files securely (protected by P0-1 fixes).
2. Do not mark the order as paid until the receipt is reviewed/captured by the seller or platform.
3. Add a "Upload Receipt" action in the storefront order detail page.
4. Add seller-side receipt review in the existing seller orders page.
5. Write tests for unauthorized upload, cross-store upload, and valid upload.

**Files to read first:**
- `backend/src/api/payment.route.ts` (existing receipt upload)
- `backend/src/services/order.service.ts`
- `frontend/src/app/store/[storeHost]/checkout/page.tsx` (current offline success behavior)
- `frontend/src/app/hub/dashboard/orders/page.tsx` (seller order management)

**Acceptance criteria:**
- Storefront buyer can upload a Mandat receipt from their account.
- Order remains `payment_required` until reviewed.
- `npm test -w backend` passes.

---

## Phase 4 — Storefront Navigation, Menus, Header, and Footer (P1)

### Prompt 4.1 — Design database-backed store menus and footer schemas (GAP-P1-013)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** There is no store-scoped menu/navigation/footer schema. `ThemeProps` in `frontend/src/components/themes/shared.ts` has branding/products/children but no menu data. Themes hardcode links. Page Builder `show_in_navigation`/`show_in_footer` flags are not a complete menu system.

**Task:** Create store-scoped menu and footer database models, services, and APIs.

**Requirements:**
1. Create migration `backend/src/migrations/sql/066_store_menus_and_footers.sql` with tables:
   - `pd_store_menu` (store_id, location: `header`|`footer`|`mobile`|`utility`, draft/published revision)
   - `pd_store_menu_item` (menu_id, parent_id, type: `page`|`product`|`category`|`collection`|`custom_url`, reference_id, url, localized label, target, rel, icon, image, visibility_start/end, sort_order, is_active)
   - `pd_store_footer` (store_id, draft/published revision)
   - `pd_store_footer_block` (footer_id, type: `menu`|`text`|`contact`|`social`|`newsletter`|`payment_badges`|`legal`|`map`, content JSONB, sort_order)
2. Create `backend/src/services/menu.service.ts` with CRUD, draft/publish, and public read methods.
3. Add seller APIs: `GET/PUT /stores/me/navigation/draft`, `GET/PUT /stores/me/footer/draft`, `POST /stores/me/content/publish`, `GET /storefront/v1/navigation` (public).
4. Add Zod validation for every field.
5. Write service tests.

**Files to read first:**
- `backend/src/migrations/sql/005_page_builder.sql` (draft/publish pattern)
- `backend/src/services/page-builder.service.ts` (revision/preview pattern)
- `frontend/src/components/themes/shared.ts` (ThemeProps to extend)

**Acceptance criteria:**
- Migration applies cleanly.
- Seller can create, edit, publish, and preview navigation and footer.
- Public endpoint returns published navigation/footer.
- `npm test -w backend` passes.

---

### Prompt 4.2 — Build shared header, footer, and mobile drawer shell (GAP-P1-014, GAP-P1-015, GAP-P1-016, GAP-P1-017)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Each of the 20 theme components owns duplicated header/footer markup with hardcoded links. Seller settings have no dedicated header/footer/menu manager. Custom page routes fetch navigation/footer data but do not render it consistently.

**Task:** Create shared, accessible storefront shell primitives and refactor all themes to use them.

**Requirements:**
1. Create `frontend/src/components/store/StorefrontHeader.tsx`:
   - Configurable variants (classic, centered, split, minimal, transparent-overlay, sticky-condensed).
   - Announcement/promo bar, logo, primary navigation from published menu data, search, account link, cart icon, language/currency switcher, mobile drawer.
   - Accessible: keyboard navigation, focus trap in mobile drawer, Escape to close, `aria-expanded`, scroll lock, focus restoration.
2. Create `frontend/src/components/store/StorefrontFooter.tsx`:
   - Renders published footer blocks: menu columns, text/about, contact, social, newsletter, payment/shipping badges, legal, copyright, optional map.
   - Responsive accordion on mobile.
3. Extend `ThemeProps` in `frontend/src/components/themes/shared.ts` to accept `navigation` and `footer` props.
4. Refactor all 20 theme components to delegate header/footer chrome to these shared primitives instead of duplicating markup and links.
5. Ensure all storefront routes (home, products, product detail, cart, checkout, account, custom pages) render the same shared chrome.
6. Remove all hardcoded `/pages/about`, `/hub/login`, `#products` links from themes.

**Files to read first:**
- `frontend/src/components/themes/shared.ts`
- `frontend/src/components/themes/ThemeLayout.tsx`
- `frontend/src/components/themes/ClassicTheme.tsx` (representative theme)
- `frontend/src/components/themes/PoweredByMarketplace.tsx`
- `frontend/src/components/themes/StorefrontSocialLinks.tsx`
- `frontend/src/app/store/[storeHost]/page.tsx` (Page Builder homepage chrome)
- `frontend/src/app/store/[storeHost]/pages/[slug]/page.tsx` (unused navigation data)

**Acceptance criteria:**
- `npx tsc --noEmit` passes.
- `npx eslint src/app/store src/components/themes src/components/store --no-error-on-unmatched-pattern` reports 0 errors.
- All 20 themes render shared header/footer.
- No hardcoded page slugs remain in theme components.
- Mobile drawer has focus trap and Escape handling.

---

## Phase 5 — Theme Entitlements and Seller Customization (P1 & P2)

### Prompt 5.1 — Enforce server-side theme entitlement checks (GAP-P1-021)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Seller UI hardcodes free/premium theme classification in `frontend/src/app/hub/dashboard/settings/page.tsx`. `PUT /api/pd/stores/me/theme` only checks that the theme ID is non-empty. `StoreService.updateTheme` writes any ID without checking existence, activity, purchase, or ownership. `pd_store.theme_id` has no foreign key.

**Task:** Enforce theme existence, activity, purchase/plan entitlement before applying.

**Requirements:**
1. Add migration `backend/src/migrations/sql/067_theme_referential_integrity.sql`: add FK from `pd_store.theme_id` to `pd_theme.id`, add unique `(store_id, theme_id)` to `pd_theme_purchase`.
2. Update `StoreService.updateTheme` to call `themeService.canUseTheme(storeId, themeId)` and reject unauthorized premium themes.
3. Update `PUT /api/pd/stores/me/theme` to validate theme exists and is active.
4. Replace hardcoded theme list in seller settings with a call to the theme listing API (`backend/src/api/theme.route.ts`).
5. Add purchase flow integration (or "Contact to upgrade" if purchase is not ready).
6. Write tests for: applying free theme succeeds, applying premium without purchase fails, applying inactive theme fails.

**Files to read first:**
- `backend/src/api/theme.route.ts`
- `backend/src/services/theme.service.ts`
- `backend/src/services/store.service.ts` (`updateTheme`)
- `backend/src/api/store.route.ts` (`PUT /stores/me/theme`)
- `backend/src/migrations/sql/004_theme_purchases.sql`
- `frontend/src/app/hub/dashboard/settings/page.tsx` (hardcoded themeList)

**Acceptance criteria:**
- Unauthorized premium theme application is rejected.
- `npm test -w backend` passes.

---

### Prompt 5.2 — Build Online Store settings section and mobile navigation (GAP-P1-018, GAP-P1-019, GAP-P1-020)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Seller settings is one large page. No dedicated routes exist for menus, header, footer, customers, SEO, scripts, or publishing. The dashboard sidebar is hidden below `md` with no mobile navigation. Setup progress is hardcoded to `0/5` using literal `false` values.

**Task:** Reorganize the seller dashboard for storefront management.

**Requirements:**
1. Add an "Online Store" navigation group in `frontend/src/app/hub/dashboard/layout.tsx` with routes: Overview/Publishing, Themes, Customize, Navigation, Pages, Domains, SEO, Integrations, Customers.
2. Create a mobile drawer/bottom navigation using the same navigation source, with focus trap, Escape/backdrop close, scroll lock, and active-item highlighting.
3. Replace the hardcoded `0/5` setup progress in `fetchSetupProgress` with real derivation from onboarding state, product count, KYC status, branding/logo, custom colors, and store publication status.
4. Add dirty-state indicators and unsaved-change protection to the new settings sub-pages.
5. Keep existing deep links (`?tab=theme`) working via redirects.

**Files to read first:**
- `frontend/src/app/hub/dashboard/layout.tsx`
- `frontend/src/app/hub/dashboard/settings/page.tsx`
- `frontend/src/lib/onboarding.ts`

**Acceptance criteria:**
- Mobile dashboard navigation is accessible and usable.
- Setup progress reflects real state.
- `npx tsc --noEmit` passes.

---

### Prompt 5.3 — Build real full-store theme preview (GAP-P2-010)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** The seller "live preview" in `ThemeCustomizer` is only a color/chrome swatch. Page Builder has tokenized preview but theme settings do not have draft/live separation. There is no full-storefront preview using real products/pages/navigation.

**Task:** Add a full-storefront theme draft preview.

**Requirements:**
1. Save theme customization as a draft (separate from published).
2. Create a preview route `frontend/src/app/store/[storeHost]/preview/page.tsx` that accepts a short-lived signed token, loads draft theme/navigation/footer/settings, and renders the full storefront with real products and pages.
3. Support desktop/tablet/mobile viewport switching.
4. Support compare/revert and "Publish" from preview.
5. Add noindex to preview pages.

**Files to read first:**
- `frontend/src/components/dashboard/ThemeCustomizer.tsx`
- `frontend/src/app/hub/dashboard/settings/page.tsx` (`saveThemeCustomization`)
- `backend/src/services/page-builder.service.ts` (preview token pattern)

**Acceptance criteria:**
- Seller can preview the full storefront with unpublished theme changes.
- Preview does not affect live store.
- `npx tsc --noEmit` passes.

---

## Phase 6 — Catalog, Search, and Product Experience (P2)

### Prompt 6.1 — Implement pagination and real catalog filters (GAP-P2-004 & GAP-P2-005)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Storefront homepage/catalog/Page Builder context fetch products with `limit=100` and no pagination. Category filtering happens in memory after the truncated fetch. `ThemeLayout.tsx` renders category, price, and sort controls with no handlers.

**Task:** Add server-driven pagination and functional filters/sort.

**Requirements:**
1. Update `backend/src/api/product.route.ts` public endpoint to support cursor/offset pagination, category filter, price range, product type, availability, tag/attribute, rating, and sort.
2. Build a shared catalog controller in `frontend/src/components/store/CatalogControls.tsx` that manages URL query state for category, price, sort, and page.
3. Wire `ThemeLayout.tsx` sidebar controls to this controller.
4. Add loading/empty/error states, removable filter chips, and mobile filter drawer.
5. Add analytics for filter/sort/search usage.

**Files to read first:**
- `backend/src/api/product.route.ts`
- `frontend/src/app/store/[storeHost]/products/page.tsx`
- `frontend/src/components/themes/ThemeLayout.tsx`

**Acceptance criteria:**
- Stores with >100 products can browse all pages.
- Filters and sort actually change the displayed products.
- `npm test -w backend` passes.

---

### Prompt 6.2 — Build accessible product cards and variant selection (GAP-P2-006, GAP-P2-007, GAP-P1-009)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Each theme defines its own card markup; seller control is limited to grid density. Product detail page does not render variant selectors. Wishlist/favorite is a no-op.

**Task:** Create a shared product card primitive and complete variant selection.

**Requirements:**
1. Create `frontend/src/components/store/ProductCard.tsx` with slots for: image (ratio/fit/hover), title, price/compare-at/discount, badges (new/sale/sold-out/custom), rating, quick-add, quick-view, wishlist, variant swatches, and button style. Accessible (keyboard, labels, contrast).
2. Update product detail page to render option groups, available combinations, price/media/stock changes, disabled combinations, and required selection before add-to-cart.
3. Persist selected `variant_id` in cart; validate in checkout.
4. Add wishlist backend support for storefront customers (or deliberately disable the UI with a clear message if out of scope).

**Files to read first:**
- `frontend/src/app/store/[storeHost]/product/[slug]/page.tsx`
- `frontend/src/components/store/AddToCartButton.tsx`
- `frontend/src/components/themes/shared.ts` (StoreProduct type)

**Acceptance criteria:**
- Variant selection works and updates price/availability.
- Product card is consistent across themes.
- `npx tsc --noEmit` passes.

---

### Prompt 6.3 — Implement store-scoped search (GAP-P2-008)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Theme search boxes filter the currently loaded product array (max 100). No dedicated store-scoped search route/suggestions/no-results analytics exists.

**Task:** Add store-scoped search with autocomplete.

**Requirements:**
1. Add `/storefront/search` endpoint in `backend/src/api/search.route.ts` returning paginated product results for a store, with filters and sort.
2. Add `/storefront/search/suggest` for autocomplete.
3. Wire header search input to display instant suggestions and navigate to a search results page.
4. Add no-results handling and search analytics.

**Files to read first:**
- `backend/src/api/search.route.ts`
- `backend/src/services/search.service.ts`
- `frontend/src/components/store/StorefrontHeader.tsx` (from Phase 4)

**Acceptance criteria:**
- Search returns results beyond the first 100 products.
- Autocomplete works with keyboard navigation.
- `npm test -w backend` passes.

---

## Phase 7 — Domains, DNS, and SSL Lifecycle (P1)

### Prompt 7.1 — Implement custom domain DNS validation lifecycle (GAP-P1-022)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Seller UI stores one domain string and offers generic CNAME text without the actual target/status. Backend normalization/uniqueness and Caddy authorization exist, but no dedicated domain record, ownership verification, DNS check, SSL status, retry/removal, or subscription enforcement exists.

**Task:** Add full custom-domain lifecycle.

**Requirements:**
1. Create migration `backend/src/migrations/sql/068_create_store_domains_table.sql` with `pd_store_domain`: `id`, `store_id`, `hostname` (unique), `is_primary`, `verification_status` (`pending`/`verified`/`failed`), `verification_token_hash`, `verified_at`, `ssl_status` (`pending`/`issuing`/`active`/`failed`), `certificate_expires_at`, `attempts`, `created_at`, `updated_at`.
2. Implement `backend/src/services/domain-verification.service.ts`: generate verification token, check DNS TXT/CNAME, update status, retry, removal, make-primary.
3. APIs: `POST /stores/me/domains`, `POST /stores/me/domains/:id/verify`, `POST /stores/me/domains/:id/make-primary`, `DELETE /stores/me/domains/:id`.
4. Enforce subscription `has_custom_domain` limit.
5. Caddy authorization (`backend/src/api/internal.route.ts`) must require verified ownership and non-failed SSL state.
6. Seller UI: show exact CNAME target, verification status, SSL status, retry, and remove.
7. Write tests for duplicate, invalid, unverified, and verified flows.

**Files to read first:**
- `backend/src/services/store.service.ts` (`updateCustomDomain`)
- `backend/src/api/internal.route.ts` (`/internal/domain-allowed`)
- `backend/src/api/store.route.ts` (`PUT /stores/me/domain`)
- `frontend/src/app/hub/dashboard/settings/page.tsx` (domain tab)
- `Caddyfile`

**Acceptance criteria:**
- Seller sees exact DNS instructions and verification/SSL status.
- Unverified domains are not TLS-authorized.
- `npm test -w backend` passes.

---

## Phase 8 — Webhooks SSRF and Script Sanitization (P1 & P2)

### Prompt 8.1 — Implement SSRF protections for outgoing webhooks (GAP-P1-024)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Vendor webhook creation accepts HTTPS URLs and `deliverWebhook` calls `fetch(sub.url)` without private/reserved IP, DNS rebinding, redirect, or egress policy.

**Task:** Add SSRF defenses.

**Requirements:**
1. At registration and delivery, resolve the hostname and reject private/reserved IPv4/IPv6 ranges, loopback, link-local, and cloud metadata addresses (`169.254.169.254`, etc.).
2. Disable redirects or revalidate redirect targets.
3. Apply an outbound egress allow policy if the deployment supports it.
4. Write tests covering private IPv4/IPv6, DNS rebinding, redirects, and metadata endpoints.

**Files to read first:**
- `backend/src/api/vendor.route.ts` (`webhookCreateSchema`)
- `backend/src/workers/webhook.worker.ts` (`deliverWebhook`)

**Acceptance criteria:**
- Webhooks to private/metadata endpoints are rejected.
- `npm test -w backend` passes.

---

## Phase 9 — Publishing, Outbox, and Revalidation (P1 & P2)

### Prompt 9.1 — Implement transactional outbox and cache invalidation (GAP-P1-025)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Theme/customization updates call frontend revalidation explicitly, but domain/maintenance and other publishing changes are inconsistent. No atomic store revision/outbox coordinates settings, navigation, footer, pages, search, cache, and webhooks.

**Task:** Add a transactional outbox and atomic storefront revisions.

**Requirements:**
1. Create migration `backend/src/migrations/sql/069_create_outbox_table.sql` with `pd_outbox_event`: `id`, `event_type`, `aggregate_id`, `revision`, `payload` (JSONB), `idempotency_key` (unique), `status`, `attempts`, `next_attempt_at`, `created_at`.
2. Create `backend/src/services/outbox.service.ts` to enqueue events inside the same transaction as publishing changes.
3. Create a worker that consumes outbox events to: revalidate all storefront hosts, update search documents, refresh sitemap/robots, and send webhooks idempotently.
4. Create `StorefrontRevision` referencing settings/menu/footer/page revisions.
5. Emit events for: store publish/unpublish, theme change, navigation/footer change, page publish/unpublish, product publish/unpublish, domain change, maintenance change.
6. Surface publish status/failures in the seller dashboard.

**Files to read first:**
- `frontend/src/app/api/storefront/revalidate/route.ts` (existing revalidation)
- `frontend/src/lib/store-cache.ts`
- `backend/src/events/event-bus.ts`
- `backend/src/subscribers/webhook.subscriber.ts`
- `backend/src/workers/webhook.worker.ts`

**Acceptance criteria:**
- Publishing a store emits one outbox event that revalidates all hosts.
- `npm test -w backend` passes.

---

## Phase 10 — Analytics Integrity (P2)

### Prompt 10.1 — Build safe session model and consent gates (GAP-P2-026)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Public storefront events can be spoofed. Page views count rows rather than unique visitors. Core lifecycle events are not consistently emitted. GA4/GTM/Meta Pixel load from root layout without a consent gate.

**Task:** Add analytics integrity and consent.

**Requirements:**
1. Define a versioned event taxonomy in `frontend/src/lib/analytics.ts`: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `sign_up`, `search`, `view_item_list`.
2. Add anonymous storefront session IDs via HttpOnly cookies with idempotency/deduplication for page views.
3. Use server-confirmed purchase events (not client-side only).
4. Add a consent gate for GA4/GTM/Meta Pixel scripts in `frontend/src/app/layout.tsx`.
5. Add bot filtering (basic user-agent/behavioral).
6. Distinguish views, unique visitors, sessions, and conversions in analytics dashboards.

**Files to read first:**
- `frontend/src/app/layout.tsx` (analytics script injection)
- `frontend/src/lib/marketplace-analytics.ts`
- `backend/src/api/analytics.route.ts`
- `backend/src/migrations/sql/031_page_builder_analytics.sql`

**Acceptance criteria:**
- Analytics scripts do not load without consent.
- Purchase events are server-confirmed.
- `npm test -w backend` passes.

---

## Phase 11 — Schema Repair (P1)

### Prompt 11.1 — Fix missing category columns and clean-schema drift (GAP-P1-023)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Runtime marketplace category code references `show_in_megamenu` but the column is absent from all migration SQL. A clean database will fail category/megamenu queries.

**Task:** Add the missing column and verify clean-schema migration.

**Requirements:**
1. Create migration `backend/src/migrations/sql/070_fix_categories_missing_columns.sql` adding `show_in_megamenu BOOLEAN NOT NULL DEFAULT false` to `pd_marketplace_category`.
2. Run the full migration suite on a fresh database and execute representative category/megamenu queries to confirm they succeed.
3. Add a migration smoke test if one does not already exist.

**Files to read first:**
- `backend/src/services/category.service.ts`
- `backend/src/api/admin.route.ts` (megamenu validation)
- `backend/src/migrations/sql/007_product_categories.sql`
- `backend/src/migrations/sql/043_marketplace_category_hierarchy.sql`
- `backend/src/migrations/sql/045_category_multilingual_support.sql`
- `backend/src/__tests__/migrations.run.test.ts`

**Acceptance criteria:**
- Fresh database migration succeeds.
- Category/megamenu queries work.
- `npm test -w backend` passes.

---

## Phase 12 — Performance, Accessibility, and Release Testing (P2 & P3)

### Prompt 12.1 — Optimize imagery, fonts, code loading, and accessibility (GAP-P2-030, GAP-P2-032, GAP-P2-033)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Themes use raw `<img>` globally. Root layout imports GrapesJS CSS and multiple Google font families on all pages, including buyer storefront pages. Theme drawers lack dialog semantics. Checkout labels lack `htmlFor`. Cart icon buttons lack accessible names. Auth inputs rely on placeholders.

**Task:** Optimize storefront performance and accessibility.

**Requirements:**
1. Replace raw `<img>` in theme components with `next/image` where layout impact is acceptable; verify layout carefully per theme.
2. Load GrapesJS CSS only on Page Builder editor routes, not in root layout.
3. Load fonts with `next/font` and only the weights/families needed; preload critical fonts.
4. Add `htmlFor` + matching `id` to checkout labels.
5. Replace clickable `<div>` payment options with native radio/button controls.
6. Add `aria-label` to icon-only cart/remove buttons.
7. Add visible labels (not just placeholders) to auth fields.
8. Add `role="dialog"`, `aria-modal`, focus trap, and Escape handling to all theme mobile drawers.
9. Add live-region announcements for cart changes, add-to-cart feedback, and checkout errors/success.
10. Run targeted ESLint and fix all `@next/next/no-img-element` errors in storefront components.

**Files to read first:**
- `frontend/src/app/layout.tsx`
- `frontend/src/app/store/[storeHost]/checkout/page.tsx`
- `frontend/src/app/store/[storeHost]/cart/page.tsx`
- `frontend/src/components/store/StoreCartIcon.tsx`
- `frontend/src/components/store/StorefrontAuthPage.tsx`
- All `frontend/src/components/themes/*.tsx` (drawers and images)

**Acceptance criteria:**
- `npx eslint src/app/store src/components/themes src/components/store --no-error-on-unmatched-pattern` reports 0 errors and 0 `<img>` warnings.
- `npx tsc --noEmit` passes.
- Lighthouse accessibility score >= 95 on checkout and product detail pages.

---

### Prompt 12.2 — Build storefront E2E and visual regression tests (GAP-P2-034)

You are working in the PandaMarket monorepo (`pandamarket/`).

**Problem:** Existing E2E is Hub-focused. No public-storefront checkout/payment, payment-init failure, Mandat, gateway-policy, shipping-parity, digital/serial, variant, login/register/account, maintenance, subdomain/custom-domain, or theme-matrix tests exist.

**Task:** Add storefront E2E and visual regression coverage.

**Requirements:**
1. Create `frontend/e2e/storefront-checkout.spec.ts` covering: add to cart, checkout, payment init, success, and failure/retry.
2. Create `frontend/e2e/storefront-account.spec.ts` covering: register, login, orders, downloads, logout.
3. Create `frontend/e2e/storefront-navigation.spec.ts` covering: header navigation, mobile drawer, footer links, custom page navigation.
4. Create `frontend/e2e/storefront-catalog.spec.ts` covering: pagination, filters, sort, search, variant selection.
5. Add a visual regression setup (e.g. Playwright screenshot comparison) for at least 3 themes at desktop/tablet/mobile widths.
6. Add a subdomain/custom-domain host-routing test.

**Files to read first:**
- `frontend/e2e/checkout-flow.spec.ts` (existing Hub test)
- `frontend/e2e/auth-flow.spec.ts`
- `frontend/playwright.config.ts`

**Acceptance criteria:**
- New E2E tests pass in CI.
- Visual regression captures baseline screenshots.
- `npm test -w frontend` passes.

---

## Post-implementation checklist

After all phases are complete, verify:

- [ ] No `SELECT *` on any public store/product/order/customer endpoint.
- [ ] No unauthenticated file upload/download.
- [ ] Invalid payment signatures rejected.
- [ ] Concurrent checkout cannot oversell.
- [ ] Storefront tokens cannot cross stores.
- [ ] Vendors cannot cancel other vendors' fulfillments.
- [ ] Theme/domain entitlements enforced server-side.
- [ ] Domain ownership verified before TLS.
- [ ] Webhook destinations cannot reach private networks.
- [ ] Customer sessions revocable; disabled accounts rejected.
- [ ] Page HTML survives an XSS corpus and CSP.
- [ ] Publishing is atomic and emits idempotent outbox/revalidation events.
- [ ] No hardcoded demo products on live stores.
- [ ] No relative `/hub` links on storefront.
- [ ] All 20 themes use shared header/footer/navigation.
- [ ] Catalog pagination/filters/sort functional beyond 100 products.
- [ ] Product SEO fields used in metadata; canonical/sitemap/robots present.
- [ ] Storefront buyer account complete: profile, addresses, orders, downloads, sessions, password reset.
- [ ] Storefront payment callbacks return to storefront, not Hub.
- [ ] Lighthouse accessibility >= 95 on key pages.
- [ ] E2E covers checkout, account, navigation, catalog, and custom-domain routing.
