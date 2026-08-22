# PandaMarket Storefront Platform Remediation Checklist

> **Status:** Active development checklist  
> **Owner:** PandaMarket engineering  
> **Created:** 2026-08-20  
> **Scope:** Platform behavior and production readiness of the Hub, tenant storefronts, buyer checkout, seller operations, and marketplace services.  
> **Out of scope:** Test products, placeholder copy, demo accounts, category/content suitability, and other development fixtures.

This is the canonical execution checklist for the current remediation backlog. Older planning documents remain historical references; current code, migrations, and tests take precedence. Every item must have an owner, a migration/rollback story where data is involved, focused automated coverage, and an explicit acceptance check before it is marked complete.

## Working rules

- Never trust prices, discounts, shipping, tax, inventory, payment availability, or seller ownership supplied by the browser.
- Keep Hub routes and tenant storefront routes separate while sharing contracts and domain services.
- Preserve store-scoped cart behavior. A tenant checkout must not clear another store's cart lines.
- Use additive migrations and backwards-compatible API responses. Document rollout order and rollback behavior.
- Run focused type-check, lint, unit/integration tests, and a manual smoke check for every affected surface.
- Commit and push each major milestone to `github/main`; verify the relevant Render/Vercel deployment after the push.
- Do not commit credentials, production data exports, screenshots, generated audit logs, or temporary test artifacts.
- Meilisearch is intentionally deferred until it is configured. Do not make it a prerequisite for checkout or storefront correctness.
- Object storage is planned to move from the generic S3 abstraction to Cloudflare R2. Treat this as a separate migration milestone with dual-read/rollback support.

## Priority and status legend

- **P0:** launch-blocking integrity or security risk.
- **P1:** high-risk correctness, accessibility, discoverability, or operations gap.
- **P2:** important completeness, scale, or quality improvement.
- Statuses: `[ ]` planned, `[-]` in progress, `[x]` verified complete, `[~]` intentionally deferred.

## Milestone index

| Milestone | Scope | Exit gate | Status |
| --- | --- | --- | --- |
| M0 | Canonical checklist and dependency map | Checklist committed and pushed | [x] |
| M1 | Authoritative cart/order quote | Quote parity and stale rejection tests pass | [-] |
| M2 | Payment capability and compensation | Unsupported methods rejected before order persistence | [-] |
| M3 | Checkout semantics and keyboard accessibility | Form and focus tests pass on Hub and tenant flows | [ ] |
| M4 | Tenant URL state, authentication recovery, and SEO | Canonical/robots/sitemap/JSON-LD/noindex matrix verified | [ ] |
| M5 | Security headers, CSP, consent, and step-up auth | Header and policy regression suite passes | [ ] |
| M6 | Shipping carriers and fulfillment lifecycle | Quote/create/track/cancel/reconcile adapters pass | [ ] |
| M7 | Inventory, returns, refunds, and tax compliance | State-machine and concurrency acceptance suite passes | [ ] |
| M8 | Support operations and analytics | SLA jobs and consent-aware event taxonomy verified | [ ] |
| M9 | Hub expansion and merchandising scale | Configurable layout regression suite passes | [ ] |
| M10 | Storage migration and image delivery | R2 dual-read, variants, CORS, rollback verified | [~] |

## P0 — checkout and payment integrity

### P0-01 — Authoritative cart and order quotes

- [-] Define a versioned quote contract: `quote_id`, `quote_version`, `issued_at`, `expires_at`, currency, normalized lines, per-line prices/discounts, coupon breakdown, shipping by fulfillment group, tax, and grand total. The v1 response is implemented; expose `issued_at` explicitly and document forward-version rejection before closing this item.
- [x] Add a server quote endpoint that accepts only product/variant IDs, quantities, destination, store context, and coupon code. Re-read catalog, seller rules, promotions, shipping configuration, and inventory from the database.
- [-] Store a tamper-evident quote snapshot or digest. Do not use browser totals as an input to order persistence. A stable SHA-256 snapshot digest is implemented; decide and test keyed HMAC protection if privileged database tampering is in scope.
- [x] Persist applied coupon code and a structured discount breakdown on the order and order items.
- [-] Add quote expiry and reject expired, unknown, already-consumed, or version-mismatched quotes with a machine-readable error. Unknown, expired, consumed, and stale quotes are covered; explicit unsupported-version handling still needs coverage.
- [x] Revalidate the quote in the same transaction that reserves inventory and creates the order. Recheck price, promotion, shipping, tax, seller/store state, and line availability.
- [-] Make quote consumption idempotent so retries cannot create a second order or consume a discount twice. Sequential retries are protected; identical concurrent submissions still need a deterministic existing-order response test.
- [x] Return a refreshed quote path when address, quantity, coupon, or payment method changes. Address, quantity, and coupon changes refresh automatically; payment-sensitive changes are represented by the P0-02 capability version and stale-capability rejection.
- [ ] Acceptance: adversarial tests prove that changed client prices, shipping, coupon values, deleted products, and stale quotes cannot alter the persisted total.

**Dependencies:** inventory reservation, shipping capability, tax policy.  
**Affected areas:** `backend/src/services/cart.service.ts`, `backend/src/services/order.service.ts`, order/cart routes, Hub checkout, tenant checkout, migrations.

**Milestone evidence (2026-08-20):** Backend quote contract and migration are in `33e69ed`. Hub and tenant checkout now submit identifier-only carts with `quote_id` and a stable `Idempotency-Key`, display only authoritative totals, refresh stale/near-expiry quotes without losing buyer input, preserve carts on payment-initialization failure, and keep tenant cart clearing store-scoped. Frontend type-check, changed-file ESLint, production build, Impeccable detector, and 19 focused tests pass.

### P0-02 — Payment method availability and initialization

- [x] Add a store/cart-scoped gateway capability contract that evaluates platform toggles, seller plan, direct credentials, escrow/direct mode, store state, product types, destination, COD rules, shipping mode, currency, and provider readiness.
- [x] Expose capabilities to both checkout surfaces, including disabled reasons safe for buyers and a deterministic capability/configuration version.
- [x] Validate the selected capability again immediately before order persistence; never create a pending order for an unavailable gateway. The transaction locks affected stores/subscription rows and refreshes finance/shipping settings under section locks.
- [x] Add payment-attempt idempotency keys and bind attempts to the quote/order total and currency. Migration `081_payment_attempt_idempotency.sql` adds an order-scoped unique key, immutable request fingerprint, quote/currency/amount/capability binding, provider response replay, and initialization state tracking; both payment-init routes require `Idempotency-Key`.
- [x] Add compensation for payment initialization failures: classify definite provider rejection versus unknown transport state, mark the attempt accordingly, release only an unstarted order/inventory hold, and enqueue reconciliation when provider state is unknown.
- [x] Add retry/backoff and a reconciliation job for provider timeouts and browser interruptions, including provider amount/currency binding, manual-review escalation, and deterministic queue deduplication.
- [-] Acceptance: focused unsupported-gateway, changed-capability, duplicate-submit, provider-timeout, compensation, reconciliation, and callback-replay tests pass; route-level duplicate-submit coverage and a disposable database migration run remain before closing the item.

**Milestone evidence (2026-08-20):** Capability DTOs/reason codes, migration `080_payment_capabilities`, quote exposure on Hub and tenant endpoints, deterministic `pcv1_<sha256>` versions, checkout-time re-evaluation, and persisted order versions are implemented. Hub and tenant checkout disable unavailable methods, show buyer-safe reasons, submit the capability version, and reject stale capability versions. Focused backend coverage is 41 passing tests across 7 files; the frontend quote suite is 7 passing tests. Backend/frontend builds and changed-file lint pass. Full backend lint remains blocked by the repository's pre-existing unrelated lint errors; payment-attempt idempotency, compensation, retries, reconciliation, and their acceptance cases remain open.

**Payment-attempt integrity evidence (2026-08-20):** Migration `081_payment_attempt_idempotency.sql` and `PaymentService.initPayment()` now reserve one immutable attempt per order/key, replay a stored provider session without a second provider call, reject key/detail conflicts and concurrent in-progress duplicates, persist initialization failures, bind quote ID/version, amount, currency, gateway, merchant account, and capability version, and pass the key to PayPal's `PayPal-Request-Id`. Hub and tenant checkout propagate a bounded payment-init key. Focused payment/provider/capability coverage is 71 passing tests; backend/frontend type-checks and changed-source lint pass (two pre-existing `any` warnings remain in webhook raw-body handling). Provider-timeout unknown-state reconciliation, order/hold compensation, retry/backoff, and full route-level duplicate-submit acceptance remain open.

**Payment compensation/reconciliation evidence (2026-08-21):** Migration `082_payment_reconciliation.sql` adds provider-state, reconciliation, compensation, retry, and provider-binding columns with partial indexes and a rollback migration. Provider initialization now distinguishes definite rejection from ambiguous transport failure; unknown states retain the provider response/reference when available, enqueue reconciliation, and reject a second session until the state is resolved. Definite failures compensate only payment-required/pending orders with no active attempt or shipped/delivered fulfillment, restoring inventory and serial assignments transactionally. Webhook and reconciliation capture lock the order and update the attempt/order atomically; a capture race against a different already-paid attempt enters manual review and is returned to the caller as manual review. A recurring sweep, retry/backoff, compensation queue, in-process worker, standalone worker command, and deterministic per-attempt job IDs are included. Focused payment, capability, provider, webhook, and reconciliation coverage is 80 passing tests; backend type-check and changed-source lint pass. Route-level duplicate-submit coverage and a disposable database migration run remain open.

**Migration/rollout notes:** Apply `080_payment_capabilities.sql` after `079_checkout_quotes.sql`, then apply `081_payment_attempt_idempotency.sql`; the new order/attempt columns are nullable for legacy clients and old records. Roll back `080_payment_capabilities.down.sql` or `081_payment_attempt_idempotency.down.sql` only before relying on persisted versions/attempt bindings, or use a forward migration after deployment. Do not expose capability versions, request fingerprints, or payment-attempt metadata as secrets; they are non-secret integrity records, while provider credentials remain internal.

## P1 — frontend correctness, accessibility, and discoverability

### P1-04 — Frontend security headers and CSP

- [x] Add environment-aware HSTS, `Content-Security-Policy`, `X-Content-Type-Options`, frame policy, referrer policy, and permissions policy at the frontend boundary.
- [x] Build an explicit source inventory for API, payment redirect, analytics, image, font, Page Builder, and R2 domains; keep preview/localhost policy usable.
- [x] Add CSP report-only rollout, report collection, and a tested enforcement switch.
- [-] Add regression tests around Page Builder embeds, payment initialization/redirects, image delivery, and tenant custom domains. Static policy/source and report-endpoint contracts pass; browser-level header checks on deployed preview/custom domains remain.

**Frontend security-header evidence (2026-08-22):** `frontend/next.config.ts` now applies an environment-aware policy to every browser response, including Hub, tenant/custom-domain rewrites, admin, previews, API routes, and static assets. `frontend/src/lib/security-headers.ts` inventories backend/WebSocket, analytics, payment, Google Maps, font, image, storage, and local-development sources; production emits HSTS and `upgrade-insecure-requests`, while preview/local development avoids HSTS and permits local Next/WebSocket tooling and loopback assets. `PD_CSP_REPORT_ONLY=true` switches to report-only mode, and `/api/csp-report` accepts bounded reports while stripping query strings before logging. Explicit `PD_CSP_IMAGE_SOURCES` and `PD_CSP_MEDIA_SOURCES` allow approved deployment-specific CDNs without falling back to a wildcard HTTPS source. `safeGoogleMapEmbedUrl()` now accepts only HTTPS embeds from the CSP-approved `www.google.com`, `maps.google.com`, and `maps.googleapis.com` hosts. The focused suite passed 6 files/27 tests (`security-headers`, `csp-report`, `next-security-config`, `MarketplaceStorefront`, `dynamic-blocks`, and `page-builder-renderer-analytics`); frontend TypeScript passed; changed-source ESLint passed with one pre-existing `publicStorageUrl` warning; and `npm run build` passed with 101 generated pages including `/api/csp-report`. A built-server boundary check on `http://127.0.0.1:3100/favicon.ico` confirmed CSP, HSTS, `nosniff`, frame, referrer, and permissions headers; a POST to `/api/csp-report` returned `204` with `Cache-Control: no-store` and redacted query strings. Deployed browser checks on preview/custom domains remain open before closing P1-04.

### P1-06 — Semantic checkout forms

- [x] Use real `form`, `fieldset`, `legend`, labels, `name`, `autocomplete`, `inputMode`, `required`, and `aria-invalid` semantics for address/contact fields. Structural, native, and field-level error semantics are implemented on both checkout surfaces.
- [x] Use one accessible radio group for payment methods with visible focus and a clear selected state.
- [x] Connect field errors to controls and move focus to the first invalid field without losing the user's input.
- [x] Cover keyboard navigation, payment-group focus, loading/disabled states, and screen-reader labels on Hub and tenant checkout. Full deployed-browser/device matrix remains a release acceptance check.

**Checkout accessibility evidence (2026-08-22):** `frontend/src/lib/checkout-quote.ts` now exposes one shared address error contract and deterministic first-invalid ordering, and `isCheckoutAddressComplete()` uses the same rules. Hub and tenant checkout preserve native `required`/autocomplete/input-mode semantics while wiring `aria-invalid`, `aria-describedby`, inline field messages, native `onInvalid` handling, first-invalid focus, preserved values, payment-group error focus, `aria-busy`, and disabled processing states. Payment radios remain one named, labelled group with visible focus styling and disabled unavailable methods. The rendered accessibility suite passed 10 Hub/tenant tests; the quote/helper suite passed 8 tests; the combined focused frontend/security regression run passed 8 files/45 tests; frontend TypeScript and changed-source ESLint passed with no new warnings; and `git diff --check` passed. Deployed browser/device and screen-reader acceptance remain open.

### P1-07 — One URL-driven search/category state model

- [x] Extract a shared parser/serializer for query, category, sort, page, and filter state.
- [x] Make every theme consume the same URL state and preserve it across pagination, navigation, refresh, and back/forward.
- [x] Replace per-theme URL parsing and category/search mutations with the shared storefront catalog adapter; contract tests cover normalization, canonical serialization, filter/page transitions, and all registered themes now use the adapter.

**P1-07 evidence (2026-08-22):** `frontend/src/lib/storefront-catalog-state.ts` is the canonical parser, serializer, page-reset policy, sort allowlist, and `in_stock=1` normalizer. `CatalogControls`, `ThemeLayout`, and `StorefrontHeader` use the same updater while preserving unrelated query parameters. The 20 registered themes consume `useStorefrontCatalogFilters`, which keeps only a shared search draft and synchronizes it from URL state after refresh/back/forward; category changes commit through the shared header/sidebar URL writer. Search submission preserves existing category/sort/price/stock parameters. `frontend/src/lib/storefront-catalog-state.test.ts` passed 5 focused contract tests; frontend TypeScript, changed-source ESLint (no new errors), production build (101 generated pages), and `git diff --check` passed.

### P1-08 — Tenant authentication recovery

- [x] Add tenant-aware forgot-password, reset-password, email-verification, resend, expiry, and invalid-token UI.
- [x] Preserve tenant host/store ID through every auth link and redirect; prevent cross-tenant token use.
- [x] Add rate limits, generic responses, audit events, and tests for token replay/tenant mismatch.

**P1-08 evidence (2026-08-22):** Tenant routes now exist at `/store/[storeHost]/forgot-password`, `/reset-password`, and `/verify-email`, with a shared recovery component that loads the current store, rejects `store_id`/host mismatches before token submission, preserves safe `next` redirects, handles missing/expired tokens, and offers rate-limited verification resend. Registration redirects into tenant email verification, and login exposes tenant-aware password recovery. Backend recovery links resolve the store custom domain/subdomain, include the tenant `store_id`, and remain bound by the existing hashed token queries. Verification, forgot, resend, and reset endpoints use generic responses where enumeration matters; verification is now rate-limited. Recovery actions write redacted append-only audit rows without storing raw tokens. Focused backend auth tests passed 9 tests; focused frontend recovery/catalog/checkout tests passed 26 tests; backend build/type-check, frontend TypeScript, frontend targeted ESLint, production frontend build (101 pages), and `git diff --check` passed.

### P1-09 — Tenant SEO metadata

- [x] Emit tenant canonical URLs using the resolved host and path, including custom domains.
- [x] Generate tenant robots and sitemaps with store status, visibility, and product/page URLs.
- [x] Add Product JSON-LD on PDPs and Organization/OnlineStore JSON-LD on tenant homepages.
- [x] Apply `noindex` to preview, maintenance, suspended, and empty stores; test canonical and alternate-host behavior.

**P1-09 evidence (2026-08-22):** `frontend/src/lib/storefront-seo.ts` now owns canonical host resolution, public/empty-store policy, query-bearing catalog detection, Organization/Product JSON-LD contracts, and safe JSON-LD serialization. Tenant home, catalog, pretty-category, product, and Page Builder metadata emit canonical URLs and noindex preview, non-public, suspended, empty, and filtered/paginated variants. Product JSON-LD is emitted on both standard themed and marketplace-style PDPs; Organization JSON-LD is emitted on default, Page Builder, and marketplace-style tenant home branches. Dynamic tenant `/robots.txt` and `/sitemap.xml` routes exclude private paths and noindex content. Root metadata routes inspect the request host so custom domains and storefront subdomains receive tenant robots/sitemap output while marketplace hosts retain marketplace output. The SEO contract suite passed 4 tests; changed SEO sources type-check and lint with zero errors; frontend production build passed with 99 generated routes; and `git diff --check` passed. Deployed custom-domain and crawler acceptance checks remain a release verification step.

### P1-10 — Real carrier integrations

- [x] Define a carrier adapter interface for rates, label creation, tracking, cancellation, health checks, webhook verification, and normalized payload parsing. Provider-specific auth headers/prefixes are environment-configurable.
- [x] Replace simulated shipment creation with feature-flagged HTTP adapters and explicit fallback behavior. Simulation is enabled by default only outside production and can be disabled in development.
- [x] Add retry/backoff, idempotent shipment creation, cancellation compensation, tracking sync, immutable webhook event deduplication, and BullMQ/in-process reconciliation jobs.
- [-] Add return-to-origin state persistence and COD risk/confirmation handling. RTO fields, carrier-returned transitions, COD verification, OTP, and courier settlement persistence are implemented; carrier-specific return reason mapping, operational dashboards, and end-to-end delivery acceptance remain.

**P1-10 evidence (2026-08-22):** `carrier-adapter.ts` provides a typed HTTP adapter contract with rates, shipment/label creation, tracking, cancellation, health checks, HMAC webhook verification, normalized payload parsing, bounded timeout/retry behavior, redirect refusal, idempotency keys, and configurable provider auth headers. `ShippingService` persists provider references, immutable shipment events, sync state, fallback metadata, COD settlement rows, and RTO transitions; routes expose cancellation and signed carrier webhooks. Migration `083_shipping_integrations_and_cod.sql` adds shipment reconciliation/event state, RTO columns, and the COD verification/settlement tables with rollback support. Focused carrier tests pass; backend type-check/build and changed-source lint pass. The complete migration chain applied successfully in disposable PostgreSQL 16, and migration 083 rolled back successfully. Deployment acceptance remains for each carrier's sandbox credentials, endpoint mappings, auth/signature format, rate/label payload contract, and webhook replay.

## P2 — storefront scale and test health

### P2-01 — Intentional product merchandising limits

- [x] Replace silent `limit=100` storefront loads with an intentional 24-product merchandising window; keep `/products` server-paginated at 24 items per page.
- [x] Expose exact `from`/`to` range and `next_page`/`prev_page` metadata, preserve URL-driven filters, and prevent query state from overriding store scope or page size.
- [x] Add large-catalog pagination regression coverage, including multi-page sitemap collection, first/middle/final/empty ranges, and deterministic sort tie-breakers.

**P2-01 evidence (2026-08-22):** `frontend/src/lib/public-products.ts` centralizes authoritative storefront requests and walks the backend's 100-item maximum for sitemap generation. Storefront home, preview, Page Builder, and catalog routes use the helper; tenant and marketplace sitemaps no longer request unsupported `limit=1000`. `ProductService.listPublished()` adds stable `p.id` tie-breakers and exact range/navigation metadata. Focused frontend helper tests (4/4), backend catalog/search tests (9/9), frontend/backend type-checks, and changed-source lint pass; backend tests emit only the existing unavailable-local-Redis connection warnings.

**P2-01 continuation evidence (2026-08-22):** Storefront home pages no longer stop at the initial 24 products without a continuation affordance. A shared, tenant-scoped client provider keeps the server-owned `limit=24`, preserves URL filters, deduplicates appended products, rejects duplicate in-flight requests, and supports seller-selected numbered pagination, click-to-load-more, or IntersectionObserver infinite loading with visible retry/fallback states. Controls are portaled into each theme's existing `main#products` section and inherit the theme CSS variables, keeping Hub product loading separate. Seller settings now expose an accessible radio group under the Store tab; legacy/invalid values normalize to `load_more`, and the backend validates supported modes before persisting JSONB settings. Focused frontend loading-mode/provider tests (6/6), backend store settings tests (26/26), frontend/backend type-checks, and changed-source lint pass.

### P2-02 — Follow-button test isolation

- [ ] Configure deterministic DOM cleanup after each test.
- [ ] Scope multi-instance assertions to their render container and explicitly unmount intentional repeated renders.
- [ ] Keep adversarial isolation tests and add a regression for leaked listeners/state.

### P2-03 — Stable full backend test runs

- [ ] Record the supported Node/Vitest runtime and enforce it in CI.
- [ ] Investigate worker exits, open handles, database/Redis teardown, and parallel resource pressure.
- [ ] Add a serial diagnostic command and make the normal CI run deterministic with bounded workers.

## Commerce and fulfillment completion

- [ ] Multi-warehouse inventory model, allocation rules, split fulfillment, and warehouse-aware shipping.
- [ ] Inventory reservation/hold expiry for long checkout sessions, with release on quote expiry/payment failure.
- [ ] Returns/RMA state machine with eligibility, labels, inspection, restock, partial returns, and seller/admin permissions.
- [ ] Refund and replacement workflows tied to order/payment/fulfillment state, including idempotent provider refunds.
- [ ] Invoice numbering, tax calculation, consumer-policy disclosures, and Tunisia-specific legal verification.
- [ ] Reconciliation dashboards for orders, payments, inventory, shipments, COD collections, refunds, and payouts.

## Support and operations

- [ ] Support-ticket SLA policy model (priority/channel/store plan), first-response and resolution timers, business hours, pause reasons, breach jobs, escalation routing, and audit trail.
- [ ] Link order, shipment, payment, RMA, and refund context into support tickets without leaking cross-tenant data.
- [ ] Add operational runbooks, alert thresholds, dead-letter handling, and replay procedures.

## Analytics and consent

- [ ] Add per-store analytics configuration with platform allow-listing and environment separation.
- [ ] Add consent categories (necessary, preferences, analytics, marketing), persisted choices, withdrawal, and region-aware defaults.
- [ ] Load analytics only after the applicable consent decision; never send payment/contact secrets.
- [ ] Standardize the ecommerce event taxonomy: `view_item`, `select_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_payment_info`, `purchase`, `refund`, and `search`.
- [ ] Define event schemas, deduplication keys, currency/value rules, tenant/store identifiers, and server/client ownership for each event.

## Marketplace Hub expansion

- [ ] Complete configurable mega-category navigation with admin-managed hierarchy, visibility, ordering, and mobile behavior.
- [ ] Finish robust admin-managed hero carousel with scheduling, accessibility, safe media, and fallback selection.
- [ ] Add top-seller rails based on real, time-windowed metrics with privacy and stock safeguards.
- [ ] Add recently viewed products with consent/storage limits and tenant isolation.
- [ ] Define recommendation contracts, ranking inputs, explanation labels, fallback behavior, and experiment/version metadata.
- [ ] Add configurable header variants and a marketplace footer mega-grid with responsive keyboard navigation.
- [ ] Add layout-selection regression tests for every supported Hub template.

## Security and compliance hardening

- [ ] Add step-up authentication for payouts, payment configuration, API-key rotation, and ownership transfer.
- [ ] Review seller-provided HTML/CSS/JS in Page Builder: sanitize, isolate, enforce CSP, block SSRF/navigation escapes, and log moderation decisions.
- [ ] Threat-model tenant custom domains, preview links, payment callbacks, file uploads, webhooks, and admin impersonation.
- [ ] Add dependency, secret, migration, and permission checks to CI.

## Cloudflare R2 migration (deferred infrastructure decision)

- [ ] Replace MinIO-only readiness probes with `HeadBucket` or a signed sentinel-object check.
- [ ] Add R2 endpoint/bucket/public-domain configuration without exposing credentials to the browser.
- [ ] Define private/public policy, signed upload/download URLs, CORS, lifecycle rules, and abuse limits.
- [ ] Standardize image variants and responsive delivery; update Next image domains and CSP sources.
- [ ] Run dual-read/dual-write migration, checksum verification, rollback, and orphan cleanup before cutover.

## Definition of done

- [ ] Acceptance criteria and negative-path tests pass.
- [ ] Database migrations are applied in a disposable environment and have a documented rollback or forward-fix plan.
- [ ] Hub and tenant behavior are both verified, including custom-domain/preview/maintenance states where relevant.
- [ ] Type-check, lint, focused tests, and the relevant build pass.
- [ ] No secrets or production data were added to the diff.
- [ ] Milestone commit is pushed to `github/main`; remote deployment status and health are recorded in the milestone notes.
