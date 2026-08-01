# PandaMarket Storefront Gap Analysis

> **Audit date:** 2026-08-01  
> **Status:** Engineering planning document; no implementation is implied by this file  
> **Scope:** Vendor storefronts, storefront buyer journeys, seller storefront-management tools, and the backend/platform capabilities required to operate them safely  
> **Companion documents:**
> - `docs/STOREFRONT_IMPLEMENTATION_TODO.md`
> - `docs/STOREFRONT_EXTERNAL_AI_AGENT_PROMPTS.md`
> - `docs/AGENT_CHECKPOINT_2026-05-06.md`
> - `docs/PAGE_BUILDER_ULTRA_URGENT_IMPLEMENTATION_PLAN.md`

## 1. Purpose

PandaMarket already has a meaningful storefront foundation, but it is not yet a complete Shopify-style storefront product. This document records the work that is missing, incomplete, inconsistent, unsafe, or insufficiently tested.

It covers more than visual theme settings. A seller cannot successfully manage a storefront unless the platform also provides:

- Safe public APIs and assets.
- Correct checkout, payment, inventory, and fulfillment flows.
- A complete storefront buyer account.
- Store-scoped navigation, headers, mega menus, pages, footers, and menus.
- Theme entitlements, previews, drafts, and consistent rendering.
- Product discovery, variants, cards, filters, and SEO.
- Storefront customer management in the seller dashboard.
- Domain verification, publishing, cache invalidation, analytics, accessibility, and release tests.

The current source code is the authority. Older roadmap or handoff statements may no longer describe the implementation accurately.

## 2. Audit method and terminology

### 2.1 Evidence labels

- **Verified:** Directly observed in the repository as of the audit date.
- **Inferred impact:** A likely runtime or operational consequence that was not reproduced in a live deployment during this documentation task.
- **Recommended:** Proposed target behavior or architecture, not an existing contract.

### 2.2 Priorities

| Priority | Meaning |
|---|---|
| **P0** | Security, privacy, payment, inventory, or cross-tenant issue that blocks unrestricted production storefront traffic. |
| **P1** | Broken core buyer/seller journey, publication integrity issue, or foundational storefront-management capability. |
| **P2** | Important completeness, UX, SEO, accessibility, performance, analytics, or operational improvement. |
| **P3** | Maintainability, consistency, localization, advanced customization, or polish. |

### 2.3 Main code areas reviewed

- Public storefront routes: `frontend/src/app/store/[storeHost]/**`
- Storefront themes: `frontend/src/components/themes/**`
- Storefront components and routing: `frontend/src/components/store/**`, `frontend/src/lib/store-*.ts`, `frontend/src/middleware.ts`
- Seller dashboard: `frontend/src/app/hub/dashboard/**`
- Storefront APIs and services: `backend/src/api/**`, `backend/src/services/**`
- Database migrations: `backend/src/migrations/sql/**`
- Shared contracts: `packages/types/src/**`
- Existing frontend/backend tests and E2E files

## 3. Executive assessment

### 3.1 What exists

PandaMarket already includes:

- Host-aware central Hub versus storefront routing.
- Store subdomains and a basic custom-domain field.
- Twenty registered storefront themes.
- Seller theme selection, color presets/custom colors, grid density, hero style, and some layout variation controls.
- Store branding, logos, contact information, social links, map URL, shipping mode, policies, maintenance mode, email templates, and security settings.
- Store-scoped cart behavior.
- Public product, cart, checkout, login, register, maintenance, error, custom page, and Page Builder homepage routes.
- Storefront customer registration/login and backend order-list/detail endpoints.
- Product/category management and Page Builder draft, preview, publish, versions, SEO, and navigation/footer flags.
- Payment-provider integration, order persistence, analytics, assets, Caddy on-demand TLS authorization, and outgoing webhook foundations.

### 3.2 Why the storefront is still incomplete

The largest gaps are not merely cosmetic:

1. **Production safety:** public file and record exposure, payment binding, inventory concurrency, tenant isolation, and multi-vendor authorization require hardening.
2. **Checkout correctness:** order creation, payment initialization, shipping totals, gateway availability, callback routing, Mandat, digital products, serial products, and variants are incomplete or inconsistent.
3. **Storefront structure:** there is no store-scoped global navigation/header/mega-menu/footer model. Themes hardcode links and duplicate storefront chrome.
4. **Seller management:** there are no dedicated storefront menus, header, footer, customer, SEO, scripts/integrations, domain lifecycle, or publishing-center tools.
5. **Buyer self-service:** authentication exists, but account, profile, addresses, orders, downloads, licenses, password recovery, and logout UI are incomplete or absent.
6. **Quality:** product discovery stops at 100 items, some controls are inert, fake demo products can appear on live empty stores, metadata is incomplete, and accessibility/responsive/performance coverage is insufficient.

### 3.3 High-level capability matrix

| Capability | Current state | Required direction |
|---|---|---|
| Public storefront safety | **Unsafe/partial** | Explicit public projections, protected assets, strict tenant derivation, payment/inventory hardening. |
| Checkout/payments | **Partial and launch-blocking** | Idempotent checkout/payment attempts, server quotes, storefront callbacks, complete offline-payment flows. |
| Buyer account | **Authentication foundation only** | Profile, addresses, orders, downloads/licenses, sessions, password recovery, consent and deletion flows. |
| Theme system | **Broad theme inventory, shallow management** | Server entitlements, full preview/drafts, shared shell, consistent settings, no live demo data. |
| Header/navigation/mega menu | **Missing as seller-managed content** | Store-scoped menu model, locations, hierarchy, references, scheduling, responsive rendering. |
| Product cards/catalog | **Partial** | Functional filters/sort/pagination/search, variants, configurable cards and empty states. |
| Pages | **Strong Page Builder foundation, partial storefront integration** | Global chrome integration, functional forms/widgets, safer sanitization, publication consistency. |
| Footer/footer menus | **Missing as global model** | Footer columns/blocks, legal/contact/social/newsletter/menu locations and shared rendering. |
| Seller customer management | **Missing** | Store-scoped list, detail, search, segments, notes, exports and privacy actions. |
| Domains/publishing | **Basic assignment only** | DNS ownership, status/SSL lifecycle, entitlement, readiness checks, atomic publish/revalidation. |
| SEO/localization | **Partial** | Store defaults, catalog/product metadata, canonical/sitemap/robots/schema, redirects, locale/currency rules. |
| Accessibility/performance/tests | **Partial** | WCAG-focused remediation, responsive QA, image/font/code optimization, real-host E2E and release gates. |

---

# 4. P0 — Production and commerce blockers

## GAP-P0-001 — Unauthenticated mock file upload/download can expose private assets

**Verified evidence**

- `backend/src/api/files.route.ts` exposes mock upload/download routes without the ownership checks used by the protected asset flow.
- `backend/src/middlewares/csrf.middleware.ts` exempts the mock upload path.
- `backend/src/main.ts` mounts the file router without an observed production-only guard for these mock routes.
- `backend/src/migrations/sql/048_create_pd_file_blobs_table.sql` persists fallback blobs.

**Risk / inferred impact**

- Anonymous storage abuse.
- Disclosure of KYC, Mandat receipts, delivery proofs, digital products, or other private objects when fallback storage is active.
- Filename fallback behavior weakens exact-key authorization.

**Required outcome**

- Disable mock routes outside an explicit local/test mode, or protect them with short-lived, exact-key signed tokens.
- Bind upload/download to tenant, owner, purpose, content type, size, checksum, expiry, and nonce.
- Remove fuzzy filename lookup.
- Add anonymous, cross-tenant, expired-token, oversized-file, and exact-key tests.

## GAP-P0-002 — Public store/product endpoints expose raw internal records

**Verified evidence**

- `backend/src/api/store.route.ts` includes an unauthenticated store-by-ID path backed by `StoreService.getById`.
- `backend/src/services/store.service.ts` uses broad store selection for that service path.
- Store records can include ownership, payment configuration, status, subscription, and internal settings.
- `backend/src/api/product.route.ts` includes public product reads backed by broad product projections in `backend/src/services/product.service.ts`.
- Product records can include moderation/internal data and digital object keys.
- Safer storefront projection helpers already exist in parts of `backend/src/api/store.route.ts`, but are not the only public path.

**Risk / inferred impact**

- Exposure of private payment configuration, ownership metadata, drafts/rejected products, moderation fields, exact stock, or digital file keys.

**Required outcome**

- Create explicit `StorefrontStorePublic`, `StorefrontProductPublic`, `StorefrontVariantPublic`, and public asset DTOs.
- Select only public columns in SQL; do not rely on deleting fields after `SELECT *`.
- Require product publication and store publication for every anonymous product/page response.
- Add response-contract tests that fail if private fields appear.

## GAP-P0-003 — Payment captures are not strongly bound to the initialized local payment attempt

**Verified evidence**

- `backend/src/services/payment.service.ts` stores a gateway reference on the order, but webhook processing accepts a caller/provider-supplied local order ID.
- The webhook path does not consistently compare the verified provider reference with the order's initialized reference.
- Verified amount, currency, and merchant account are not all enforced before `OrderService.markPaid`.
- The PayPal route in `backend/src/api/payment.route.ts` calculates signature validity but the audited flow does not reject every invalid-signature case before processing.
- `pd_payment_event` provides delivery idempotency, but event idempotency is not equivalent to payment-to-order binding.

**Risk / inferred impact**

- A valid payment could be associated with the wrong local order.
- Underpayment, wrong-currency payment, or wrong merchant credentials could be accepted.

**Required outcome**

- Introduce immutable payment attempts containing local order, gateway, provider reference, expected amount in minor units, currency, merchant account, status, and timestamps.
- Resolve capture through the payment attempt, never through an untrusted local order ID alone.
- Require valid signatures, exact provider reference, amount, currency, merchant, and expected provider order/custom reference.
- Make capture a transactional compare-and-set operation.

## GAP-P0-004 — Checkout and payment initialization are not atomic or durably idempotent

**Verified evidence**

- `frontend/src/app/store/[storeHost]/checkout/page.tsx` creates the order before it initializes an online payment.
- `backend/src/services/order.service.ts` persists order/items and mutates inventory/serial allocation during checkout.
- If payment initialization fails, the frontend leaves the cart actionable and can submit again.
- `backend/src/api/order.route.ts` does not require a durable storefront checkout idempotency key.

**Risk / inferred impact**

- Duplicate orders after retry, browser timeout, or network loss.
- Repeated stock decrements or serial allocation.
- Orphaned unpaid orders without a clear reservation expiry/release lifecycle.

**Required outcome**

- Require an `Idempotency-Key` for storefront checkout.
- Use a durable checkout/payment attempt state machine.
- Either initialize payment within one server orchestration or return/reuse the existing attempt on retry.
- Reserve inventory and serials with expiry; capture or release them deterministically.
- Never rely on frontend cart clearing as transaction integrity.

## GAP-P0-005 — Concurrent checkout can oversell product and variant inventory

**Verified evidence**

- `backend/src/services/order.service.ts` reads product/variant inventory before decrement without a complete guarded-update strategy.
- Inventory decrement does not consistently require `inventory_quantity >= requested_quantity` in the mutation itself.
- No audited database nonnegative inventory constraint prevents negative values.

**Risk / inferred impact**

- Two concurrent buyers can both pass availability checks and oversell.

**Required outcome**

- Use guarded atomic updates or deterministic row locks inside one transaction for products and variants.
- Require exactly one updated row per item.
- Add nonnegative constraints after data cleanup.
- Add real-database concurrency tests.

## GAP-P0-006 — A vendor can reach a global multi-vendor cancellation path

**Verified evidence**

- `backend/src/api/order.route.ts` includes a vendor cancellation path that can call global order cancellation after checking that the vendor owns at least one item.
- `backend/src/services/order.service.ts` global cancellation affects all order items.
- A store-scoped cancellation implementation also exists and should be the seller boundary.

**Risk / inferred impact**

- One seller can cancel/restock another seller's fulfillment in a multi-vendor order.

**Required outcome**

- Vendors may cancel only their store fulfillment and store-allocated refund amount.
- Whole-order cancellation remains buyer/platform controlled under explicit status rules.
- Add multi-vendor authorization and restock-isolation tests.

---

# 5. P1 — Core storefront and seller-management gaps

## 5.1 Tenant, authentication, and publication integrity

### GAP-P1-001 — Storefront tenant identity can depend on caller-provided identifiers

**Verified**

- `backend/src/api/order.route.ts` allows optional `store_id` in the shared checkout body.
- `requireStorefrontCustomer` and order checkout checks are strongest when that optional store identifier is present.
- Storefront order list/detail logic must avoid leaking items from another store in a multi-store parent order.

**Required outcome**

- Derive store exclusively from validated hostname plus storefront session/token.
- Remove `store_id` from public storefront checkout/payment/customer resource bodies.
- Return store-scoped order representations only.
- Apply the same boundary to addresses, wishlist, reviews, downloads, receipts, and account resources.

### GAP-P1-002 — Storefront customer auth is incomplete and status checks are insufficient

**Verified**

- `backend/src/api/storefront-auth.route.ts` provides register, login, me, and logout.
- Registration does not provide the complete public-store eligibility and account lifecycle expected for a production buyer account.
- Token validation does not provide a complete current-session/account-status revocation model.
- There are no complete storefront email verification, forgot/reset password, password change, refresh rotation, session list/revoke, profile update, consent, or deletion flows.

**Required outcome**

- Add public-store eligibility checks.
- Add short-lived access tokens plus revocable/rotating sessions.
- Add verification, password recovery/change, profile, consent/export/delete, and session management.
- Ensure disabled/deleted customers cannot continue using old tokens.

### GAP-P1-003 — Public Page Builder reads do not consistently bind page visibility to store visibility

**Verified**

- `backend/src/services/page-builder.service.ts` checks page publication for public page methods.
- The audited service methods do not all join store state to require a publicly available store.
- Frontend routes perform some store checks, but backend public data should enforce the policy independently.

**Required outcome**

- Every anonymous page/homepage read must require a public, verified store and respect maintenance/suspension policy.
- Preview remains token-scoped, no-store, and noindex.
- Add state-matrix tests for draft, maintenance, verified, suspended, and deleted stores.

## 5.2 Checkout, payment methods, and fulfillment

### GAP-P1-004 — Storefront payment callbacks return buyers to Hub routes

**Verified**

- `backend/src/services/payment.service.ts` builds success/failure URLs under `/hub/checkout`.
- The storefront has no complete branded payment return/verification route.
- Parameter naming between payment callback and the Hub success page is inconsistent.

**Required outcome**

- Persist the canonical storefront origin used for checkout.
- Generate signed storefront success/failure URLs.
- Add storefront return pages that verify order/payment status server-side before displaying success.
- Keep central Hub and custom-domain/subdomain behavior separate.

### GAP-P1-005 — Manual Mandat cannot be completed by a storefront buyer

**Verified**

- The storefront checkout advertises receipt upload.
- Offline checkout clears the cart and displays generic success without a storefront receipt workflow.
- Existing receipt upload authorization is built for central authenticated buyers, not `storefront_customer_id`.

**Required outcome**

- Add storefront Mandat instructions, recipient data, receipt upload, validation state, resubmission, status timeline, and notifications.
- Protect receipt files by storefront customer and store.
- Do not track payment as completed until reviewed/captured.

### GAP-P1-006 — Payment gateway availability is not a storefront quote contract

**Verified**

- `frontend/src/app/store/[storeHost]/checkout/page.tsx` hardcodes five methods.
- Online provider initialization checks platform settings only after order creation.
- Offline paths can bypass provider initialization.

**Required outcome**

- Add a server checkout-capabilities/quote endpoint returning enabled methods, restrictions, fees, currency, and seller/platform credential readiness.
- Reject disabled methods before order/inventory mutation.
- Render only currently usable methods.

### GAP-P1-007 — Displayed shipping totals can differ from backend order totals

**Verified**

- Cart and checkout use a hardcoded storefront shipping amount.
- `backend/src/services/order.service.ts` computes shipping from platform settings, city rates, thresholds, store count, and physical goods.

**Required outcome**

- Use a server quote as the single source of totals.
- Requote when address, items, quantities, or payment method changes.
- Display subtotal, discounts, shipping, tax, fees, and total with currency/rounding rules.
- Reject stale quotes safely.

### GAP-P1-008 — Digital and serial fulfillment is not available to storefront customers

**Verified**

- Storefront orders can include digital/serial products.
- Existing download authorization is primarily central-account based.
- Serial keys can be allocated, but no storefront account page exposes entitlements.

**Required outcome**

- Add store-scoped digital entitlements and license-key APIs/UI.
- Release entitlements only after qualifying payment state.
- Support expiry, download limits, audit logging, revoke/refund behavior, and secure signed downloads.

### GAP-P1-009 — Product variants are loaded but not selectable on storefront product pages

**Verified**

- Backend public product logic can load active variants.
- `frontend/src/app/store/[storeHost]/product/[slug]/page.tsx` does not provide a complete variant selector before `AddToCartButton`.

**Required outcome**

- Render option groups, available combinations, price/media/stock/SKU changes, disabled combinations, and required selection.
- Persist selected `variant_id` in cart and validate it in checkout.
- Add variant URL/state and accessibility tests.

## 5.3 Theme correctness and storefront links

### GAP-P1-010 — Empty live stores render fake products in themes

**Verified**

- All registered theme components contain fallback demo product arrays when the real product list is empty; `frontend/src/components/themes/ClassicTheme.tsx` is one explicit example.
- Demo items are rendered as normal product links.

**Required outcome**

- Remove demo data from live rendering.
- Keep demo content only in an isolated theme-preview fixture.
- Add seller-configurable empty-state content and CTA.
- Add a contract test across all registered themes.

### GAP-P1-011 — Relative Hub links break on storefront subdomains/custom domains

**Verified**

- Themes and storefront error/checkout/cart states contain relative `/hub` or `/hub/login` links.
- `frontend/src/middleware.ts` rewrites storefront-origin paths under the store route, so central Hub paths on the storefront origin do not resolve as intended.
- `StorefrontMaintenancePage` demonstrates an absolute marketplace URL pattern that can be generalized.

**Required outcome**

- Add one shared absolute Hub URL helper.
- Add shared storefront account/login URL helpers.
- Replace all hardcoded cross-origin links.
- Test central `/store/:host`, subdomain, and custom-domain contexts.

### GAP-P1-012 — Host classification is duplicated and has drifted

**Verified**

- Hub/storefront host logic exists in both `frontend/src/middleware.ts` and `frontend/src/lib/store-hosts.ts` with different special cases/environment inputs.

**Required outcome**

- Define one serializable host-classification policy used by middleware and application helpers.
- Add table-driven tests for localhost, central production host, `www`, preview/render hosts, subdomains, and custom domains.

## 5.4 Global storefront structure: header, menus, pages, and footer

### GAP-P1-013 — No store-scoped global menu/navigation model exists

**Verified**

- `ThemeProps` in `frontend/src/components/themes/shared.ts` contains branding/products/children but no menu data.
- Themes hardcode links such as home, product anchors, login, About, Support, or other assumed slugs.
- Page Builder provides `show_in_navigation`, `show_in_footer`, and `sort_order`, but these flags are not a complete menu system.
- Marketplace admin mega-menu settings are Hub-owned and are not a seller storefront menu.

**Missing capabilities**

- Multiple locations: utility/top bar, primary header, mega menu, mobile menu, footer columns, legal menu.
- Internal page/product/category/collection links and safe external links.
- Custom labels, icons/images, hierarchy, ordering, target, nofollow, locale, visibility schedule, audience/device rules.
- Draft/published revisions and preview.
- Broken-link validation and automatic handling of deleted referenced resources.

**Required outcome**

- Add store menu/menu-item entities and seller APIs/UI.
- Render the same published navigation contract across every theme and every storefront route.

### GAP-P1-014 — Header and top-menu management is missing

**Verified**

- Each theme owns duplicated fixed header markup.
- Seller settings contain no dedicated header/top-bar/menu manager.
- Existing customization is limited to colors/layout/grid/hero and theme-specific fixed behavior.

**Required outcome**

- Create shared storefront shell primitives and configurable header variants.
- Support announcement/promo bar, logo alignment/size, sticky behavior, search, account, wishlist, cart, language/currency, contact/social links, primary navigation, and mobile drawer behavior.
- Define theme defaults while allowing supported seller overrides.

### GAP-P1-015 — Seller storefront mega-menu management is missing

**Verified**

- No store-scoped mega-menu schema/API/UI was found.
- Seller categories exist, but they are not connected to a configurable global mega-menu contract.

**Required outcome**

- Support simple dropdown and mega-menu item modes.
- Support category groups, nested links, featured products, images/banners, promotional cards, column layouts, and mobile fallback.
- Add keyboard, focus, hover-intent, touch, and lazy-image behavior.

### GAP-P1-016 — Page navigation/footer links render inconsistently across routes

**Verified**

- Page Builder homepage override renders eligible navigation/footer pages.
- Normal themed homepages do not receive the same page-link contract.
- `frontend/src/app/store/[storeHost]/pages/[slug]/page.tsx` calculates navigation/footer data that is not fully rendered.
- Theme hardcoded page slugs can 404.

**Required outcome**

- Global storefront chrome must wrap homepage, catalog, product, custom pages, cart, account, and appropriate checkout routes consistently.
- Custom pages must not define one-off global navigation behavior.

### GAP-P1-017 — No global footer/footer-menu model exists

**Verified**

- Themes duplicate footer markup.
- Page Builder `show_in_footer` flags and page-local footer blocks are not a configurable global footer.
- Seller settings have contact/social data, but no footer composition manager.

**Required outcome**

- Add global footer revisions with columns and block types: menu, text/about, contact, social, newsletter, payment/shipping badges, app links, legal, copyright, trust badges, and optional map.
- Add footer menu locations, ordering, responsive accordion behavior, and per-theme styling.

## 5.5 Seller dashboard storefront management

### GAP-P1-018 — Storefront settings information architecture is too shallow

**Verified**

- `frontend/src/app/hub/dashboard/settings/page.tsx` is a large page containing store, security, theme, domain, shipping, email, and maintenance concerns.
- Dedicated routes do not exist for menus, header, footer, customers, global SEO, scripts/integrations, or publishing.

**Required outcome**

- Add a clear “Online Store” section in seller navigation with dedicated routes for Overview/Publishing, Themes, Customize, Navigation, Pages, Domains, SEO, Integrations, and Customers.
- Preserve deep links and unsaved-change protection.
- Avoid one unbounded settings component.

### GAP-P1-019 — Seller dashboard lacks mobile navigation

**Verified**

- The main sidebar in `frontend/src/app/hub/dashboard/layout.tsx` is hidden below the medium breakpoint.
- No equivalent complete mobile navigation was found.

**Required outcome**

- Add accessible mobile drawer/bottom navigation using the same navigation source.
- Include focus management, Escape/backdrop close, active item, scroll lock, and account/store switching.

### GAP-P1-020 — Dashboard setup progress is hardcoded to 0/5

**Verified**

- `frontend/src/app/hub/dashboard/layout.tsx` fetches onboarding/product/KYC data but creates a five-item array of literal `false` values.

**Required outcome**

- Derive progress from persisted onboarding plus live store/payment/shipping/product/publication state.
- Define stable completion criteria server-side or in one shared helper.
- Add tests and remove misleading progress.

## 5.6 Themes, entitlements, domains, and schema integrity

### GAP-P1-021 — Theme entitlement/purchase backend is disconnected and bypassable

**Verified**

- Theme listing/access/purchase foundations exist in `backend/src/api/theme.route.ts` and `backend/src/services/theme.service.ts`.
- Seller UI hardcodes free/premium classifications in `frontend/src/app/hub/dashboard/settings/page.tsx`.
- Store theme updates do not provide complete existence/activity/purchase/plan enforcement.
- Theme purchase accepts a weak payment-reference contract.

**Required outcome**

- Use server theme catalog/access APIs in the dashboard.
- Verify captured purchase or plan entitlement before applying a premium theme.
- Validate active theme IDs and add database referential integrity.
- Support ownership/access display, purchase flow, preview-before-buy, and safe fallback if a theme is retired.

### GAP-P1-022 — Custom domains lack ownership, DNS, SSL, and entitlement lifecycle

**Verified**

- Seller UI stores one domain string and offers generic CNAME text without the actual target/status.
- Backend normalization/uniqueness and Caddy authorization foundations exist.
- No dedicated domain record, ownership token, DNS check status, SSL status, retry/removal lifecycle, or complete subscription enforcement was found.

**Required outcome**

- Add store domain entities with pending/verified/failed and SSL lifecycle states.
- Display exact CNAME/TXT instructions and diagnostics.
- Require plan entitlement and verified ownership before Caddy authorization.
- Support retry, primary domain, redirect policy, removal, and audit history.

### GAP-P1-023 — Marketplace `show_in_megamenu` has migration drift

**Verified**

- Runtime marketplace category code references `show_in_megamenu`.
- The audited migration set does not clearly create that column.

**Required outcome**

- Add an idempotent migration/schema test.
- Keep this Hub marketplace field separate from the new seller storefront menu model.

### GAP-P1-024 — Vendor webhooks need SSRF defenses

**Verified**

- Seller webhook creation accepts HTTPS URLs.
- Delivery workers fetch configured URLs without a complete private/reserved network, DNS rebinding, and redirect policy.

**Required outcome**

- Validate resolved addresses at registration and delivery.
- Reject private/reserved IPv4/IPv6, localhost, metadata endpoints, and unsafe redirects.
- Apply egress controls and add SSRF tests.

### GAP-P1-025 — Core publication events, webhooks, search, and revalidation are incomplete

**Verified**

- Event names/subscribers/workers exist, but normal store/product/order transitions do not consistently emit the corresponding events.
- Theme/customization updates explicitly call frontend revalidation, while domain/maintenance and other publishing changes are inconsistent.
- No atomic store revision/outbox contract coordinates settings, navigation, footer, pages, search, cache, and webhooks.

**Required outcome**

- Add transactional outbox events for store/content/product/order transitions.
- Publish immutable storefront revisions.
- Revalidate all known hosts, refresh search/sitemap, and send webhooks idempotently.
- Surface publish status/failures in the seller dashboard.

---

# 6. P2 — Completeness and user-experience gaps

## 6.1 Buyer account and seller customer management

### GAP-P2-001 — Storefront buyer account UI is missing

**Verified**

- Public login/register routes exist.
- No complete storefront account area was found for profile, logout, addresses, order history/detail, returns/cancellations, downloads, licenses, password/security, consents, or deletion.
- Backend storefront order list/detail endpoints already provide a partial foundation.

**Required outcome**

- Add a theme-aware `/account` area with store-scoped navigation and authorization.
- Add order status/timeline, payment instructions, receipt state, fulfillment/tracking, invoices, downloads/licenses, and support contact.

### GAP-P2-002 — Seller storefront customer management is missing

**Verified**

- Seller orders expose some customer data and analytics computes unique/repeat customers.
- No seller route/API was found for store customer list/detail/search/segments/notes/tags/export/account actions.
- Hub buyer administration is a different identity and tenancy concern.

**Required outcome**

- Define customer aggregation/deduplication rules for storefront and relevant Hub identities.
- Add tenant-safe list/detail, search/filter, lifecycle metrics, orders, LTV, notes/tags, segments, consent, export, block/unblock, and privacy request handling.
- Mask data by role and audit sensitive access/exports.

### GAP-P2-003 — Wishlist, reviews, recently viewed, and recommendations are not storefront-complete

**Verified**

- Wishlist/review backend foundations are tied mainly to central authentication.
- Storefront product “favorite” controls are incomplete/no-op.
- No complete storefront-specific wishlist/review/account integration was found.

**Required outcome**

- Add store-scoped wishlist and review authorization or define deliberate cross-Hub identity linking.
- Add recently viewed and recommendation extension points with consent/privacy constraints.

## 6.2 Catalog, search, cards, and product detail

### GAP-P2-004 — Product discovery is capped at 100 products

**Verified**

- Storefront homepage/catalog/Page Builder context fetches use `limit=100` without a complete pagination path.
- Category filtering can occur in memory after that truncated fetch.

**Required outcome**

- Add server-driven pagination or cursor loading.
- Use backend category/search/sort/price/availability filters.
- Keep URL query state, canonical rules, loading/empty/error states, and analytics.

### GAP-P2-005 — Catalog filter and sort controls are inert

**Verified**

- `frontend/src/components/themes/ThemeLayout.tsx` renders category, price, and sort controls without complete handlers/state/query integration.

**Required outcome**

- Build one shared catalog controller consumed by themes.
- Add functional category, subcategory, price, product type, availability, tag/attribute, rating, and sort controls.
- Provide mobile filter drawer and removable filter chips.

### GAP-P2-006 — Product card customization is missing

**Verified**

- Each theme defines its own card markup.
- Seller control is largely limited to grid density; no card-content/style schema exists.

**Missing settings**

- Image ratio/fit/hover image.
- Border, radius, shadow, padding, alignment.
- Title line clamp, category/vendor/reference visibility.
- Price/compare-at/discount/tax labels.
- Stock, new/sale/sold-out/custom badges.
- Rating/review count.
- Quick add, quick view, wishlist, variant swatches.
- Button style and mobile behavior.

**Required outcome**

- Define validated shared product-card settings and a shared accessible card primitive with theme slots/tokens.
- Keep all commerce behavior consistent across themes.

### GAP-P2-007 — Product detail lacks complete commerce content

**Verified**

- Variant selection is incomplete.
- Some product fields are loaded but not displayed consistently.
- Favorite behavior is incomplete.

**Required outcome**

- Add gallery/zoom/video, variant options, quantity limits, inventory messages, SKU/reference, attributes/specifications, digital delivery notice, shipping/returns, trust/payment badges, share, wishlist, reviews, related/recommended products, and sticky mobile add-to-cart.
- Sanitize rich descriptions and add product structured data.

### GAP-P2-008 — Search is theme-local rather than a complete storefront search experience

**Verified**

- Some themes filter their currently loaded product array.
- No dedicated seller storefront search route/suggestions/no-results analytics contract was found.

**Required outcome**

- Add store-scoped search API/route, autocomplete, recent searches, keyboard behavior, result filters, typo/no-result handling, and search analytics.

## 6.3 Theme customization and preview

### GAP-P2-009 — Theme customizer settings are incomplete and inconsistent across themes

**Verified**

- `ThemeCustomizer` exposes layout variation, grid density, hero style, and colors.
- Not every theme consumes every exposed variation consistently.
- “Video” hero options render placeholders in themes without a configurable video source.

**Missing common controls**

- Typography families/sizes/weights/line height.
- Container width, spacing scale, section gaps.
- Buttons, form controls, badges, borders, radius, shadows.
- Announcement bar, header, navigation, mega menu, card, footer, and mobile controls.
- Hero content/media/overlay/height/alignment/CTAs/slides.
- Section ordering and per-section visibility.
- Custom CSS with safe scoping, if supported.

**Required outcome**

- Publish a versioned theme-settings schema with capability flags/defaults.
- Hide unsupported controls or implement them across every theme.
- Validate contrast and values server-side.

### GAP-P2-010 — Theme preview is not a real storefront draft preview

**Verified**

- The seller “live preview” is a small palette/chrome swatch.
- Page Builder has tokenized preview, but theme settings do not have a complete draft/live separation.

**Required outcome**

- Save theme customization as draft.
- Open responsive full-store preview using real products/pages/navigation/footer without changing live content.
- Support desktop/tablet/mobile, representative empty/loading/error states, custom-domain context, compare/revert, and publish.

### GAP-P2-011 — No global theme revision, history, rollback, or scheduled publish

**Required outcome**

- Version theme/settings/navigation/footer together.
- Record publisher, timestamp, diff/summary, and published revision.
- Allow restore-to-draft and republish.
- Optionally schedule publication after the basic revision model is reliable.

### GAP-P2-012 — Theme import/export and seller template library are missing

**Required outcome**

- Export signed, versioned theme/settings/pages/menu/footer manifests without secrets/private customer data.
- Validate signatures, compatibility, referenced assets, and sanitized content on import.
- Preview diffs before applying.

## 6.4 Header, mega menu, and mobile behavior details

### GAP-P2-013 — Header variants and behaviors are not configurable

**Required outcomes**

- Variants: classic, centered, split, minimal, transparent overlay, sticky/condensed.
- Configurable rows, logo size, navigation alignment, search style, icons/labels, sticky threshold, transparency, and scroll behavior.
- Mobile menu with nested navigation, focus trap, Escape/back handling, scroll lock, and account/cart shortcuts.

### GAP-P2-014 — Announcement/promo/utility bar is missing as managed content

**Required outcomes**

- Multiple messages, links, schedule, dismissibility, locale, colors, optional countdown, and mobile behavior.
- Persist dismissal by message revision.
- Avoid inaccessible moving content.

### GAP-P2-015 — Mega-menu merchandising is missing

**Required outcomes**

- Featured image/product/banner blocks, menu columns, badges, promotion dates, lazy images, and analytics.
- Validate referenced resources and hide unpublished products/categories safely.

## 6.5 Pages and content

### GAP-P2-016 — Page Builder interactive blocks remain placeholders or inert

**Verified**

- Several advanced blocks such as video, countdown, carousel, blog, map, and Instagram are not complete production integrations.
- Contact/newsletter forms are neutralized by sanitization and do not submit.

**Required outcome**

- Implement safe native widgets rather than arbitrary seller JavaScript.
- Add store-scoped contact/newsletter submission APIs, spam protection, consent, notifications, storage/export, and success/error states.
- Complete video/carousel/countdown/map/social blocks with CSP and privacy controls.

### GAP-P2-017 — Blog/content collections are missing

**Required outcome**

- If blog is in product scope, add store-scoped posts, authors, categories/tags, drafts, scheduling, SEO, listing/detail templates, sitemap entries, related content, and editor/dashboard flows.
- If not in scope, remove placeholder blog promises from UI/templates.

### GAP-P2-018 — URL redirects and slug history are missing

**Required outcome**

- Record previous product/page/category slugs.
- Add store-scoped validated redirects with loop detection and safe status codes.
- Provide seller redirect management and 404 analytics.

## 6.6 Footer details

### GAP-P2-019 — Newsletter/footer form capability is missing

**Required outcome**

- Add consent-aware subscription endpoint, double opt-in where configured, suppression/unsubscribe, rate limiting, bot protection, and seller export/integration.

### GAP-P2-020 — Footer legal/trust/payment content lacks managed contracts

**Required outcome**

- Configure legal page references, business identity, tax/registration text, copyright, payment/shipping badges, accepted methods, security/trust statements, and localization.
- Never display a method/badge that is disabled or unavailable.

## 6.7 SEO, localization, and integrations

### GAP-P2-021 — Store-level SEO defaults are missing

**Verified**

- Page Builder SEO exists for pages.
- No complete seller-facing store SEO/default OG/favicon editor was found.
- A favicon value is consumed in theme props, but seller favicon management is incomplete.

**Required outcome**

- Add store title template, default description, default OG image, favicon, social handles, robots policy, verification tags, locale, and canonical-domain settings.
- Define precedence: resource override → store default → platform fallback.

### GAP-P2-022 — Product/catalog metadata and structured data are incomplete

**Verified**

- Product forms save SEO fields, but storefront metadata does not consistently use them.
- Catalog lacks complete route metadata.
- Multiple legacy/pretty/central/subdomain/custom-domain URLs can represent the same content.

**Required outcome**

- Use saved product SEO fields.
- Add canonical URLs, product/breadcrumb/organization/website structured data, catalog metadata, sanitized descriptions, OG/Twitter images, and noindex rules for transactional/auth/preview/filter combinations.

### GAP-P2-023 — Storefront sitemap, robots, canonical domain, and redirects are incomplete

**Required outcome**

- Generate per-store sitemap data for products, pages, categories, and optional posts.
- Add host-aware robots and canonical origin.
- Redirect alternate subdomain/custom/central paths according to seller primary-domain policy.

### GAP-P2-024 — Storefront localization/currency strategy is incomplete

**Verified**

- Buyer copy is mixed across French and English.
- Price formatting is broadly hardcoded to TND in theme helpers.

**Required outcome**

- Define supported storefront locales, default locale, URL strategy, translations, RTL, locale-aware formatting, currency policy, and seller content localization.
- Move all storefront strings to translation resources.

### GAP-P2-025 — Store analytics/pixels/scripts lack a safe seller integration model

**Verified**

- No complete seller-facing GA4/GTM/Meta Pixel/script manager was found.
- Arbitrary scripts conflict with CSP/security expectations.

**Required outcome**

- Prefer structured integrations over raw JavaScript.
- Validate IDs/domains, load only on storefront hosts, add consent categories, and centralize commerce events.
- If custom head tags are allowed, use a strict tag/attribute/domain allowlist; block scripts by default.

### GAP-P2-026 — Analytics integrity and event coverage are incomplete

**Verified**

- Storefront/Page Builder analytics foundations exist.
- Public events can be inflated and do not provide a complete session/deduplication/bot model.
- Core lifecycle emissions are incomplete.

**Required outcome**

- Define event taxonomy and versioned payloads.
- Add anonymous session IDs, idempotency/deduplication, bot filtering, consent, attribution, and server-confirmed purchase events.
- Distinguish views, unique visitors, sessions, and conversions.

## 6.8 Domains, publishing, and operations

### GAP-P2-027 — No unified storefront publishing/readiness center exists

**Verified**

- Store status, maintenance, theme, pages, domain, products, KYC, payments, and shipping are managed in separate places.

**Required outcome**

- Add readiness checks for identity/KYC, products, theme, navigation, policies, payments, shipping, domain, SEO, accessibility warnings, and unresolved errors.
- Explain store status versus page publication.
- Provide preview, publish/unpublish, maintenance, rollback, and last-publish status in one place.

### GAP-P2-028 — Publishing is not an atomic storefront revision

**Required outcome**

- Publish a revision referencing validated theme settings, navigation, footer, page versions, SEO, and domain/canonical policy.
- Use optimistic concurrency and an outbox.
- Revalidate all hosts and surface partial downstream failures without corrupting the published revision.

## 6.9 Media, performance, and reliability

### GAP-P2-029 — Store asset lifecycle is incomplete

**Verified**

- Presign and store media listing foundations exist.
- No complete finalize/checksum/scan/reference/delete/orphan-cleanup lifecycle was found.

**Required outcome**

- Add initiate → upload → finalize states.
- Validate ownership, MIME, magic bytes, size, dimensions, checksum, and scan state.
- Track references before deletion and clean abandoned assets.
- Separate private keys from public URLs.

### GAP-P2-030 — Storefront images/fonts/code are not sufficiently optimized

**Verified**

- Themes widely use raw `<img>`.
- Root layout loads Page Builder CSS and multiple font families globally.
- Theme imports/data-fetch helpers are duplicated in storefront routes.

**Required outcome**

- Use responsive optimized images with correct sizes/priority.
- Load fonts and editor CSS only where needed.
- Dynamically load selected theme where practical.
- Deduplicate storefront data/context fetching and measure Core Web Vitals.

### GAP-P2-031 — Storefront caching and invalidation are incomplete

**Required outcome**

- Define cache tags by store/resource/revision.
- Revalidate theme, settings, menus, footer, pages, product publication, domains, maintenance, and store status.
- Add stale-while-revalidate/ETag strategy where appropriate.
- Ensure previews and account/checkout are never publicly cached.

## 6.10 Accessibility and responsive behavior

### GAP-P2-032 — Checkout/auth/cart controls have accessibility gaps

**Verified examples**

- Checkout labels and payment options lack complete native label/radio semantics.
- Cart icon buttons need accessible names.
- Auth inputs rely heavily on placeholders.
- Cart updates/errors/success lack complete live-region behavior.

**Required outcome**

- Meet WCAG 2.2 AA for keyboard, semantics, focus, labels, errors, status announcements, target size, contrast, zoom, and reduced motion.

### GAP-P2-033 — Theme mobile menus lack robust dialog behavior

**Verified**

- Theme drawers are duplicated and do not consistently provide dialog semantics, focus trap, Escape handling, expanded state, or focus restoration.

**Required outcome**

- Use one shared accessible mobile navigation primitive across themes.

### GAP-P2-034 — Responsive storefront layouts require systematic testing

**Verified/inferred examples**

- Cart rows are dense non-wrapping flex layouts.
- Page Builder homepage navigation lacks a complete mobile collapse.
- Twenty themes increase responsive-regression risk.

**Required outcome**

- Define supported viewport matrix and visual regression coverage for header, mega menu, cards, product, cart, checkout, account, pages, and footer.

---

# 7. P3 — Maintainability and advanced improvements

## GAP-P3-001 — Storefront DTOs and settings schemas drift across layers

**Verified**

- Frontend uses many local interfaces.
- `packages/types` does not fully represent storefront customer, navigation, footer, versioned settings, domain, and public context contracts.
- Store settings update accepts a broad JSON record while shared DTOs describe a different shape.

**Required outcome**

- Add versioned shared contracts plus runtime Zod schemas at API boundaries.
- Migrate legacy settings deliberately and enforce size/key limits.

## GAP-P3-002 — Theme chrome and behavior are duplicated across twenty components

**Required outcome**

- Extract shared shell, announcement bar, header, navigation, mobile drawer, card, empty state, and footer primitives.
- Preserve visual theme slots/tokens without duplicating commerce/navigation logic.

## GAP-P3-003 — Storefront route fetching and product mapping are duplicated

**Required outcome**

- Add one server-side storefront context/data access layer.
- Centralize host resolution, public projection, route context, cache tags, canonical origin, and error mapping.

## GAP-P3-004 — Theme capabilities are not machine-readable

**Required outcome**

- Declare theme-supported sections/settings/variants in the theme registry.
- Use the registry to drive the customizer, validation, previews, migration, and tests.

## GAP-P3-005 — Seller settings need dirty-state, conflict, and autosave conventions

**Required outcome**

- Add dirty-state indicators, leave protection, optimistic concurrency/version conflicts, field-level errors, save status, and reset/revert behavior across storefront management.

## GAP-P3-006 — Language and design-system use are inconsistent

**Required outcome**

- Move seller and storefront text to locale files.
- Standardize shared form, feedback, modal, drawer, sortable tree, preview, and status components.

## GAP-P3-007 — Advanced merchandising and personalization are missing

**Recommended later scope**

- Collections/manual merchandising.
- Product badges and scheduled promotions.
- Recently viewed.
- Related/complementary products.
- Personalized recommendations with explicit privacy controls.
- Search merchandising and synonym management.
- A/B testing only after analytics integrity is reliable.

---

# 8. Proposed target architecture

The following is recommended architecture, not an existing API contract.

## 8.1 Published storefront context

```ts
interface StorefrontContextV1 {
  schema_version: 1;
  revision: string;
  canonical_origin: string;
  store: StorefrontStorePublic;
  settings: StorefrontSettingsV1;
  theme: StorefrontThemePublic;
  navigation: StoreNavigationPublic;
  footer: StoreFooterPublic;
  capabilities: StorefrontCapabilities;
}
```

A public context endpoint should derive the tenant from a validated hostname, return only a published revision, and never expose payment credentials, owner IDs, internal moderation, or arbitrary settings.

## 8.2 Versioned settings

```ts
interface StorefrontSettingsV1 {
  schema_version: 1;
  branding: BrandingSettings;
  localization: LocalizationSettings;
  layout: LayoutSettings;
  header: HeaderSettings;
  catalog: CatalogSettings;
  product_card: ProductCardSettings;
  product_page: ProductPageSettings;
  seo: StoreSeoSettings;
  integrations: StructuredIntegrationSettings;
  contact: ContactSettings;
  social: SocialSettings;
}
```

- Validate server-side.
- Store drafts separately from the published revision.
- Add migration functions for future schema versions.
- Keep secrets/credentials in encrypted dedicated storage, not this public object.

## 8.3 Navigation and footer

Recommended entities:

- `pd_store_menu`
- `pd_store_menu_revision`
- `pd_store_menu_item`
- `pd_store_footer`
- `pd_store_footer_revision`
- `pd_store_footer_block`

Menu items need parent, location, type, referenced resource or safe URL, localized label, target/rel, icon/image, visibility dates, order, and draft/published revision.

## 8.4 Atomic storefront revisions

```ts
interface StorefrontRevision {
  id: string;
  store_id: string;
  settings_revision_id: string;
  menu_revision_ids: string[];
  footer_revision_id: string;
  page_revision_ids: string[];
  published_by: string;
  published_at: string;
}
```

Publication should create an outbox event used to:

- Revalidate all storefront hosts.
- Update search documents.
- Refresh sitemap/robots data.
- Send seller webhooks.
- Update preview/publish status.

## 8.5 Shared storefront shell

```text
StorefrontShell
├── AnnouncementBar
├── StorefrontHeader
│   ├── UtilityMenu
│   ├── PrimaryNavigation
│   ├── MegaMenu
│   └── MobileNavigation
├── Route content
└── StorefrontFooter
    ├── FooterBlocks
    ├── FooterMenus
    └── LegalBar
```

Themes should provide visual tokens/slots; they should not each reimplement routing, account URLs, cart behavior, menus, accessibility, or footer data rules.

## 8.6 Storefront checkout contract

- Tenant derived from host/session.
- Required `Idempotency-Key`.
- Server quote before order mutation.
- Integer bounded quantities.
- Payment attempt bound to order/reference/amount/currency/merchant.
- Inventory reservation/capture/release state machine.
- Storefront-specific callback origin.
- Store-scoped order response.

## 8.7 Customer and seller CRM boundary

Storefront account APIs should use storefront sessions. Seller customer-management APIs should use seller/store authorization and return only customers who interacted with that store. Platform buyer administration must remain separate unless a deliberate identity-linking policy is designed.

---

# 9. Recommended delivery sequence

1. **Security containment and public projections** — close file/public-record/payment/cancellation issues.
2. **Checkout integrity** — idempotency, inventory concurrency, payment attempts, quote/gateway/shipping correctness.
3. **Storefront account and fulfillment** — callbacks, Mandat, orders, downloads/licenses, variants.
4. **Tenant and host foundation** — derive tenant from host, unify host classification, fix cross-origin links.
5. **Versioned storefront context and publishing** — shared contracts, draft/live revisions, outbox/revalidation.
6. **Navigation/header/mega-menu/footer backend** — migrations, services, APIs, validation, revisions.
7. **Seller “Online Store” dashboard** — information architecture, menus, header/footer editor, preview, publishing center.
8. **Shared storefront shell across all themes/routes** — remove hardcoded links/demo data and unify accessibility.
9. **Catalog/product experience** — pagination, filters, search, cards, variants, reviews/wishlist.
10. **Customer management** — seller CRM plus buyer self-service completeness.
11. **SEO/domains/integrations** — canonical domain, sitemap/robots/schema, DNS/SSL, analytics/consent.
12. **Quality/release hardening** — responsive/a11y/performance/visual/E2E/load/security testing and observability.

Do not begin broad visual customization before P0 and checkout correctness are resolved. Attractive storefronts that can leak data, oversell, or mis-handle payments are not production-ready.

# 10. Key dependencies and risks

- Navigation/footer/header work should depend on a versioned public context and draft/publish model; otherwise themes will be rewritten twice.
- Buyer account/download work depends on a complete storefront auth/session boundary.
- Product cards depend on shared catalog/product-card contracts, not twenty separate settings implementations.
- Domain activation depends on plan entitlements, DNS ownership verification, Caddy authorization, cookies/CORS, and canonical SEO behavior.
- Analytics/pixels depend on consent and CSP decisions.
- Forms/newsletters depend on spam protection, consent, storage, notifications, and seller data access.
- Custom scripts are a high-risk feature; structured integrations should be preferred.
- Existing Page Builder plans remain relevant, but global storefront chrome must not be implemented as page-local builder content.

# 11. Validation gaps observed

Existing relevant tests cover parts of cart behavior, Page Builder sanitization/dynamic blocks, services, and Hub checkout. The following release-critical coverage is missing or insufficient:

- Public response redaction.
- Mock/private file authorization.
- Payment reference/amount/currency/merchant/signature binding.
- Checkout idempotency and payment-init retry.
- Real database inventory concurrency.
- Multi-vendor cancellation isolation.
- Storefront cross-tenant attempts.
- Gateway availability and server quote parity.
- Storefront Mandat, callbacks, downloads, serials, and variants.
- Empty product rendering across all themes.
- Header/menu/footer consistency across all storefront routes.
- Subdomain/custom-domain host routing and absolute Hub links.
- Buyer account E2E.
- Theme entitlement and draft/publish/rollback.
- Domain DNS/SSL lifecycle.
- Catalog pagination/filter/search.
- Product/catalog metadata/canonical/sitemap/robots/schema.
- Mobile dashboard navigation and setup progress.
- Automated accessibility and visual regression across the theme matrix.

# 12. Audit limitations

- This was primarily a static repository audit; not every issue was reproduced against a deployed custom domain or real payment provider.
- Deployment configuration, production database drift, provider dashboards, DNS, Caddy state, and private object storage policies were not independently inspected.
- Some older documentation reports work as complete; this analysis uses the current audited code paths where they disagree.
- Before implementing any task, re-read the referenced files and inspect current diffs because the repository may have changed after 2026-08-01.
