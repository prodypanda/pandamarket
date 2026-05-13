# PandaMarket System Memories Summary

This document contains all system-retrieved memories from the PandaMarket project workspace.

---

## Memory 1c966cf0-41f6-4ec9-9c9c-b27d342d7dac
**Date:** 2026-05-13

**Seller Orders Overhaul Slice**

Backend `backend/src/api/order.route.ts` now validates seller order list query filters for `payment_status`, `fulfillment_status`, `date_from`, and `date_to` in addition to existing `status/search/page/limit`, and passes them to `orderService.listByStore`. Backend `backend/src/services/order.service.ts` now supports those filters and returns `meta.summary` with total/open/to_ship/shipped/delivered/cancelled/refunded/captured counts plus captured revenue, today/7d/30d revenue, and AOV. Frontend `frontend/src/app/hub/dashboard/orders/page.tsx` now sends the new filters, renders revenue/order KPI cards, payment and fulfillment filters, date-range filters, active filter count/reset control, refresh action, and payment status badges. Validation passed: backend `npm run type-check`, backend targeted ESLint for order route/service, frontend targeted ESLint for seller orders page, frontend `npx tsc --noEmit --pretty false --types vitest/globals,node`, and `git diff --check` for touched order files.

---

## Memory 9c5a70b8-0e75-4019-904d-391280837c4d

**Frontend Error UI Components**

Frontend now has a reusable styled error UI component at `frontend/src/components/ErrorStatePage.tsx`. App Router error pages added: `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/(admin)/not-found.tsx`, `src/app/(admin)/error.tsx`, `src/app/hub/not-found.tsx`, `src/app/hub/error.tsx`, and `src/app/store/[storeHost]/error.tsx`. Existing store not-found page was restyled to match the same PandaMarket error design.

---

## Memory 2c318b63-83ad-4887-8bb2-a849a7ce8b64
**Date:** 2026-05-06

**Production UI/API Audit Fixes**

Previously stubbed reports API/UI was completed: `backend/src/api/report.route.ts` supports customer `POST /api/pd/reports` and vendor `GET /api/pd/reports/store`; `backend/src/services/report.service.ts` enriches report lists and adds `listByStore`; admin/vendor report pages use real endpoints. Admin KYC and Mandat queue pages were converted from mock data to real APIs using admin pending/approve/reject routes plus authenticated private file access via `backend/src/api/files.route.ts` `GET /api/pd/files/access?key=...`, scoped to admins or owners. Vendor KYC upload and customer Mandat proof upload now use real presigned upload flows. Customer orders page calls `/api/pd/orders/me`, with optional status filtering in `orderService.listByCustomer`. Admin plans page reads `data.plans || data.data`, backend exposes `PUT /api/pd/admin/plans/:planId`, and admin AI costs has `/api/pd/admin/ai-stats` alias with frontend-expected shape.

Additional local fixes in the current audit: `backend/src/api/vendor.route.ts` now implements store-scoped vendor webhook CRUD and delivery log routes under `/api/pd/vendor/webhooks`, backed by `pd_webhook_subscription`/`pd_webhook_delivery`, HTTPS URL validation, supported backend-forwarded events only, one-time signing secret creation, and tenant-isolated delivery listing. `frontend/src/app/hub/dashboard/webhooks/page.tsx` now offers only events the backend forwards and displays the one-time webhook secret. Storefront homepage no longer fabricates a fake development store if `/stores/by-host/:host` fails; `frontend/src/app/store/[storeHost]/cart/page.tsx` and `checkout/page.tsx` now show a clear unavailable-store state instead of silently treating failed store resolution as an empty cart. `backend/src/api/ai.route.ts` now enforces product ownership and subscription feature flags before queueing image compression or SEO AI jobs, preventing cross-tenant product updates by the AI worker. Vendor order dashboard filtering is now server-side: `backend/src/api/order.route.ts` validates `status`/`search` query params for `/api/pd/orders/store`, `orderService.listByStore` applies those filters before pagination, and `frontend/src/app/hub/dashboard/orders/page.tsx` requests filtered results instead of filtering only the current page. Shipping/checkout fixes: vendor shipping settings UI now uses backend-supported `self_managed`/`platform_unified`; checkout addresses are normalized and validated as `first_name`/`last_name`/`address_line_1`; shipping route address schemas normalize `line1` to `address_line_1`; cart checkout now preserves/sends optional `variant_id`. Customer profile addresses are now real: new migration `backend/src/migrations/sql/010_customer_addresses.sql`, `backend/src/services/address.service.ts`, `backend/src/api/address.route.ts`, route mounted as `/api/pd/addresses`, and `/hub/profile` lists/adds/deletes/sets default authenticated customer addresses. Direct payment config now uses `subscriptionService.getLimits(plan).has_direct_payment` on the backend and the dashboard reads `/subscriptions/current` limits instead of hardcoded plan names.

Validation after these fixes passed locally: backend TypeScript, frontend TypeScript, targeted backend ESLint for touched API/service files, and targeted frontend ESLint for touched pages all exited 0; frontend storefront lint still has pre-existing Next `<img>` warnings only. DB migration `010_customer_addresses.sql` was created but not applied automatically. No git push/pull/merge was performed.

---

## Memory 434a205b-7b7f-4873-8b7a-092f45db50d2

**Vendor Product Dashboard 404s and Storefront Theming**

In PandaMarket, vendor product dashboard 404s were addressed by adding stable store-scoped product aliases under `/api/pd/stores/me/products` for list/create/update/delete and `/api/pd/stores/me/products/:id/images` for image association, then switching dashboard product APIs away from `/api/pd/products/me` and `/api/pd/products`. Store media library is exposed via `/api/pd/stores/me/media`; storefront categories support vendor management at `/hub/dashboard/categories`; marketplace/storefront categories support image/description/position metadata. Product permalinks are store-scoped: backend `/api/pd/products/by-store/:storeId/:slug` resolves published products; storefront product links use `getStorefrontProductPath`; Hub/cart/wishlist/search/dashboard/sitemap links use `getHubProductHref` when `slug` and `store_subdomain` are present. Central-host `/store/:storeHost` routing is marketplace-owned via `frontend/src/lib/store-hosts.ts` and `frontend/src/lib/store-routing.ts`; real storefront subdomains remain storefront-owned via middleware rewrite and use relative links like `/`, `/cart`, `/checkout`. Storefront theme headers use `StorefrontThemeCartLink`/`StoreCartIcon` for live store-scoped cart counts and relative cart navigation; theme colors come from seller customization via `useThemeCustomization`/`colorVars` rather than hardcoded `branding.primary_color` fallbacks. Storefront checkout uses `removeStoreItems(store.id)` so successful checkout removes only the current store's cart items. Route-level storefront pages are also theme-aware: `frontend/src/app/store/[storeHost]/cart/page.tsx`, `checkout/page.tsx`, `product/[slug]/page.tsx`, root homepage Page Builder override, and `pages/[slug]/page.tsx` apply selected theme font/background/header/footer/surface colors; Page Builder homepage/custom page chrome uses `StoreCartIcon` instead of plain cart links. Recent storefront checks passed: `npx tsc --noEmit --types vitest/globals --pretty false`; `npm test -- src/__tests__/cart-context.test.tsx`; targeted ESLint over storefront route/cart files exits 0 with only Next `<img>` warnings. Documentation handoff was added on 2026-05-06: primary checkpoint `docs/AGENT_CHECKPOINT_2026-05-06.md`, wiki handoff `wiki/14-agent-checkpoint-current-state.md`, and links/updates in root README, frontend README/AGENTS, wiki index/project overview, AI architecture/documentation, runbook, tasklist/todo, and implementation_plan. Docs-only `git diff --check` passed for those files.

---

## Memory 30454cd3-3402-4640-95b0-1b42bd95ff53

**Chat System Implementation**

PandaMarket chat system was implemented with backend migration `backend/src/migrations/sql/020_chat_system.sql`, service `backend/src/services/chat.service.ts`, API routes `backend/src/api/chat.route.ts`, and registration under `/api/pd/chats` in `backend/src/main.ts`. Frontend includes reusable `frontend/src/components/chat/ChatInbox.tsx` and `ContactSellerButton.tsx`, pages `/hub/messages`, `/hub/dashboard/messages`, and admin `/messages`. Buyer product/order pages can start seller chats; seller order page can start buyer chats; seller inbox can start seller-admin support chats; marketplace storefront product detail includes contact seller. Navigation/protection were updated in `HubNavbar`, buyer account, seller/admin layouts, auth next safelists, middleware, and `SocketContext` counts `chat_message` events.

---

## Memory 269abe59-3f01-476a-8e00-56f6f9ae53d9
**Date:** 2026-05-07/08

**Marketplace Admin/Seller/Buyer Dashboard Separation and Auth UI**

Superadmin login is `/login/admin` and successful admin login redirects to `/dashboard`; admin layout verifies `/api/pd/auth/me` and only permits `admin`/`super_admin`, redirecting vendors to `/hub/dashboard` and buyers to `/hub`. Seller login is `/login/seller` and seller dashboard remains `/hub/dashboard`. Marketplace buyer login is `/login` or `/login/buyer`, registration is `/register/buyer`, and buyer landing/dashboard is `/hub/account`, with links to `/hub/profile` for profile/address edits, `/hub/orders` for orders/downloads, `/hub/wishlist`, and `/hub/cart`. `/hub/account` includes a buyer logout button calling `/api/pd/auth/logout` via `fetchWithCsrf`, clearing `pd_access_token`, then redirecting to `/login/buyer`. `HubNavbar` sends non-vendor buyers to `/hub/account`, vendors to `/hub/dashboard`, admins to `/dashboard`; middleware protects `/hub/account` and redirects unauthenticated users to `/login/buyer`. Auth UI enhancement work made buyer, seller, and admin login/register screens visually distinct: buyer login/register use green marketplace styling, seller login/register use orange seller/vendor styling, and admin login uses a custom dark zero-trust vault UI through `RoleScopedLoginPage` when `variant="admin"`. The admin login page copy presents `/login/admin` as `Superadmin vault access`, with restricted command center language for governance, audit, finance, vendors, and platform-critical controls. Latest admin login direction: avoid adding extra informational content/panels; focus on style, motion, atmosphere, and premium interaction polish. The current admin variant is leaner, with the core hero, subtitle, and login form only, plus animated CSS in `frontend/src/app/globals.css`: drifting grid, dotted tactical overlay, floating cyan/fuchsia orbs, rotating vault rings, breathing lock glow, scanline shine across the card, rise-in entrance animations, animated gradient submit button, hover lift/depth, focus glow on Fingerprint/KeyRound inputs, and reduced-motion support. Previously added content-heavy metric cards, security cards, signal chips, clearance sequence panel, authorization readiness/progress, and warning panel were removed because they made the page feel busier rather than more alive. Buyer login restricts `next` redirects to buyer-safe hub routes only. Seller registration posts to `/api/pd/auth/register/vendor`, safely parses JSON, uses `credentials: 'include'` for subsequent store creation at `/api/pd/stores`, and adds a bearer token only when the register response includes `tokens.access_token`, avoiding token/header crashes. Focused validation for the latest admin animation pass returned exit 0 for frontend TypeScript (`npx tsc --noEmit --types vitest/globals --pretty false`), focused ESLint for `RoleScopedLoginPage` and admin login page, and `git diff --check` for `RoleScopedLoginPage`, admin login page, and `globals.css`. CSS was not included in ESLint because the project ESLint config ignores `globals.css`. For LAN testing, middleware treats private IPv4 LAN hosts (`10.x.x.x`, `127.x.x.x`, `172.16-31.x.x`, `192.168.x.x`) as hub hosts, fixing `http://192.168.1.48:3000/` being misdetected as a custom storefront domain. Public image URLs were fixed for LAN by defaulting backend `PD_S3_PUBLIC_BASE_URL` fallback to `/pd-product-images`, allowing `publicUrl()` to emit same-origin paths, adding frontend rewrites for `/pd-product-images/:path*` and `/pd-themes/:path*` to the storage endpoint (`PD_S3_PUBLIC_PROXY_URL`/`PD_S3_ENDPOINT`/`NEXT_PUBLIC_S3_PUBLIC_PROXY_URL`/`http://localhost:9100`), excluding those paths from middleware, and adding `frontend/src/lib/public-assets.ts` to normalize existing absolute `http://localhost:9100/pd-product-images/...` or `127.0.0.1:9100` asset URLs to same-origin `/pd-product-images/...`. Hub homepage, AliExpress homepage, and HubNavbar use `normalizePublicAssetUrl` for product/category/logo images.

---

## Memory 119faaa0-c929-4788-9e74-5b1e5c77e85c

**Marketplace Theme Work and Superadmin Dashboard Polish**

PandaMarket marketplace theme work: backend exposes public `/api/pd/marketplace/settings` via `backend/src/api/marketplace.route.ts`, mounted in `backend/src/main.ts`, and admin settings validation accepts `marketplace_theme` (`panda`/`aliexpress`) plus `marketplace_logo_url`. Admin settings page uses `MarketplaceAssetPicker` for marketplace logo and theme selection. Frontend shared theme utilities live in `frontend/src/lib/marketplace-theme.ts`, `frontend/src/lib/marketplace-settings.ts`, and `frontend/src/hooks/useMarketplaceTheme.ts`. Hub homepage fetches marketplace settings and renders either `HubHomeContent` or `AliExpressHomeContent`; `HubNavbar` accepts marketplace name/logo/theme and auto-fetches settings when props are absent so shared Hub pages inherit AliExpress header/search styling. Hub search/category/product pages consume marketplace theme settings and apply AliExpress red/orange accents/backgrounds. Cart, checkout, checkout success, mandat upload, wishlist, AddToCartButton, WishlistButton, HubFooter, HubNavbar, SearchBar, and ReviewSection are theme-aware. Hub account/seller pages `/hub/pricing`, `/hub/vendor-signup`, `/hub/orders`, `/hub/profile` use shared navbar/footer, `useMarketplaceTheme` or server `getMarketplaceSettings`, themed panels/buttons/inputs/pagination, and red/orange AliExpress accents when `marketplace_theme` is `aliexpress`. The Hub single product page `/hub/products/[id]` was enhanced with shared `getMarketplaceThemeClasses`, AliExpress deal strip, themed breadcrumbs/gallery shell/product info/price panel/trust badges/seller card/description/details/reviews/similar products, and passes AliExpress accent color into `ProductGallery`/`SellerHoverCard`. Review UX checks `/api/pd/auth/me`, shows logged-out login/register prompt, accepts `marketplaceTheme`, and submits to `/api/pd/reviews` without trailing slash. Superadmin dashboard polish: `(admin)/layout.tsx` has an improved glass header/sidebar and top `Go to Hub` button; `globals.css` includes scoped `.admin-shell` input/textarea/select text/background rules to fix white-on-white visibility across all superadmin pages; `(admin)/dashboard/page.tsx` has a premium hero, stat cards, and urgent-action cards. Vendor dashboard numeric crashes were fixed by accepting PostgreSQL numeric fields as `number | string | null` and formatting through safe `toNumber`/`formatPrice`: `frontend/src/app/hub/dashboard/page.tsx` handles wallet/order numeric fields and reads order totals from `total_amount ?? total`; `frontend/src/app/hub/dashboard/wallet/page.tsx` handles wallet balances and transaction amounts as number/string/null, converts with `toNumber`, and avoids `price.toFixed is not a function` at `/hub/dashboard/wallet`. Recent checks for the wallet fix passed: frontend `npx eslint "src/app/hub/dashboard/wallet/page.tsx" --max-warnings=0`, frontend `npx tsc --noEmit --types vitest/globals --pretty false`, and `git diff --check -- frontend/src/app/hub/dashboard/wallet/page.tsx`. Broader recent checks passed: targeted ESLint for product/admin/vendor dashboard files passes with only existing Next `<img>` warnings in product image components/pages.

---

## Memory e1a8ea84-6a09-4fb2-b9c1-30aa2c3e0b57

**Superadmin Vendor Management Page**

The superadmin Vendor Management page lives at `frontend/src/app/(admin)/users/page.tsx` and is labeled from `admin.sidebar.vendors`. It calls `GET /api/pd/admin/vendors` with `page`, `limit`, `search`, `status`, `seller_type`, and `pending_seller_type_request` filters. Backend `backend/src/api/admin.route.ts` routes this to `storeService.listForAdmin`, which returns enriched vendor rows with store fields, owner email/name/last login/active status, product counts, published product count, order counts, pending order count, captured revenue from order item subtotals, open report count, KYC status/timestamps, and summary metrics. Admin actions include `PUT /api/pd/admin/vendors/:id/verify`, `PUT /api/pd/admin/vendors/:id/reactivate`, `PUT /api/pd/admin/vendors/:id/suspend`, `PUT /api/pd/admin/vendors/:id/seller-type`, `PUT /api/pd/admin/vendors/:id/seller-type-request/approve`, and `PUT /api/pd/admin/vendors/:id/seller-type-request/reject`. The page UI uses KPI cards, search/status/seller-type/pending filters, vendor detail cards, direct seller-type override, pending seller-type approve/reject workflow, verify/reactivate/suspend controls, and localized English/French/Arabic strings under `admin.vendorsPage`.

---

## Memory 20796eaa-b5c2-4b82-95b8-4c908fa5aa30

**Seller Type Support**

PandaMarket seller type support uses `wholesaler`, `retailer`, and `hybrid`. Seller dashboard settings sends changes through `PUT /api/pd/stores/me/settings` with top-level `seller_type`; backend `backend/src/api/store.route.ts` calls `storeService.requestSellerTypeChange`. Seller-side type changes now always create a pending request for superadmin approval and do not immediately change `pd_store.seller_type`. Sellers cannot create another request while one is pending; they can cancel via `POST /api/pd/stores/me/seller-type-request/cancel`, which marks `settings.seller_type_change_request.status = cancelled`, stores `seller_type_change_last_cancelled_at`, and enforces a 24-hour retry cooldown. Approved seller type changes store `seller_type_change_last_approved_at` and vendor requests are blocked for 30 days after approval. Superadmin direct changes via admin vendor endpoints remain unrestricted and clear pending requests. Seller settings UI (`frontend/src/app/hub/dashboard/settings/page.tsx`) shows a pending request card, cancel action, localized cooldown/monthly-limit copy, and RTL-aware layout. Wholesale tier pricing UI is localized in `frontend/src/i18n/messages/{en,fr,ar}.json` under `productWholesale`; dashboard product form and public product detail pages use these keys.

---

## Memory 9fea2f80-3f15-4341-831e-7c92433228b7

**Optional Account 2FA**

PandaMarket optional account 2FA was added using backend TOTP utilities. Migration `backend/src/migrations/sql/017_account_security_2fa.sql` adds `two_factor_enabled`, encrypted `two_factor_secret`, recovery code hashes, and timestamps to `pd_user`. Backend endpoints under `/api/pd/auth/2fa/*` support status, setup, confirm, disable, and login challenge verification; login endpoints return `requires_2fa` + `challenge_id` instead of tokens when 2FA is enabled. Frontend uses reusable `frontend/src/components/AccountTwoFactorPanel.tsx` in buyer profile, vendor dashboard settings, and admin settings. The setup panel renders scan-compatible local SVG QR codes for the `otpauth://` URI via `frontend/src/lib/qr-code.ts`, backed by the `qrcode` package and `@types/qrcode` in the frontend workspace. Buyer, seller, and admin login UIs handle second-step 2FA verification. Superadmin Vendor Management includes owner status/2FA/payment badges and controls for vendor subscription override, owner suspend/reactivate, owner 2FA reset, payment config clearing, and custom domain clearing via admin routes.

---

## Memory 7121507e-b16e-4221-bf26-08ab6c5c8c66

**Reports Case Management**

PandaMarket now extends reports into case management using pd_report_messages, pd_report_attachments, and pd_report_events. Visibility scopes are buyer_admin, seller_admin, all_parties, and admin_internal. New report statuses include awaiting_buyer and awaiting_seller. Backend APIs include buyer cases at /api/pd/reports/me, /api/pd/reports/:id, /api/pd/reports/:id/messages; seller private case APIs at /api/pd/reports/store/:id and /api/pd/reports/store/:id/messages; admin APIs at /api/pd/admin/reports/:id and /api/pd/admin/reports/:id/messages. Report evidence uploads use /api/pd/files/presign with purpose report_evidence and private file access is checked through reportService.canAccessAttachmentKey.

---

## Memory edb01950-ab12-4af5-8292-d87ae4cb6aa4

**Superadmin Audit Log**

In prodypanda1/pandamarket, the superadmin audit-log work updated backend `backend/src/api/admin.route.ts` to align `/api/pd/admin/audit-log` with the real `pd_audit_log` schema (`actor_id`, `actor_role`, `ip`, `user_agent`, `metadata`) and added `/api/pd/admin/audit-log/summary`. The frontend page `frontend/src/app/(admin)/audit-log/page.tsx` now consumes the corrected contract with summary cards, advanced filters, top action/resource sidebars, pagination, error/loading states, and a details modal showing metadata, path, actor, IP, user agent, method/status/duration.

---

## Memory 377ea326-52e8-440c-a775-59ec4954f36b
**Date:** 2026-05-12

**Seller Reports Dashboard List Page**

On 2026-05-12 in prodypanda1/pandamarket, the seller reports dashboard list page `frontend/src/app/hub/dashboard/reports/page.tsx` was upgraded from a basic client-side filtered list to a richer case-management page. It now uses `/api/pd/reports/store?page=&limit=&status=` for server-side filtering/pagination, reads `meta.summary`, renders a command-center hero, KPI cards for total/open/investigating/high-priority/action-required cases, status filter pills, richer report cards with status, priority, category, buyer email, order ref, admin notes, quick view, and open-case CTA, plus pagination controls and better loading/error states. Validation passed: targeted ESLint for the page, frontend TypeScript `npx tsc --noEmit --pretty false --types vitest/globals,node`, and `git diff --check` for the page.

---

## Memory 71952f98-4827-449d-b6f8-7fa531ec9c36
**Date:** 2026-05-12

**Seller Social/Profile Integration**

On 2026-05-12 in prodypanda1/pandamarket, seller social/profile integration was implemented on the frontend. `frontend/src/app/hub/dashboard/settings/page.tsx` now lets sellers edit address, city, country, Google Maps embed URL, and social links under `store.settings.social` for facebook, instagram, x, tiktok, youtube, linkedin, whatsapp, telegram, pinterest, and snapchat. Storefront shared theme branding types in `frontend/src/components/themes/shared.ts` include contact/location/map/social fields. New `frontend/src/components/themes/StorefrontSocialLinks.tsx` safely renders http(s) social links plus optional contact/location links. `PoweredByMarketplace` renders social links in theme footers; storefront root/products branding passes social/contact settings; marketplace seller page renders social/contact chips and safe Google Maps embed; storefront product/custom/Page Builder footers render contact/social links. Validation passed: targeted frontend ESLint, frontend `npx tsc --noEmit --pretty false --types vitest/globals,node`, custom page ESLint with `--quiet`, and `git diff --check` with only LF/CRLF warnings.

---

## Memory 95cc5d9d-8216-4b54-b9e6-6c51dd965a7f

**Backend HTML 404 Fix**

In PandaMarket backend, misleading HTML 404s on protected/mutating routes such as `/api/pd/auth/me`, `/api/pd/auth/login`, `/api/pd/reports/store`, and `/api/pd/admin/reports` were caused by disabled Sentry error middleware swallowing errors. `backend/src/utils/sentry.ts` had `sentryErrorHandler()` return a no-op error middleware that called `next()` without the error when Sentry was disabled, so auth/CSRF/validation errors fell through to Express HTML 404. Fix: when Sentry is disabled, return `(err, _req, _res, next) => next(err)` so the custom JSON `errorHandler` responds with proper 401/403/etc.

---

## Memory 86f2bf70-1287-41df-b795-a25718f3b82d

**Wholesale Tier Pricing**

PandaMarket now supports wholesale tier pricing for seller product add/edit flows. Wholesaler and Hybrid sellers configure `wholesale_min_quantity` and `wholesale_price_tiers` in `frontend/src/app/hub/dashboard/products/page.tsx`; Hybrid keeps the normal 1-quantity retail price and adds wholesale tiers, while Wholesaler minimum quantity is enforced. Backend product schemas in `backend/src/api/store.route.ts` and `backend/src/api/product.route.ts` accept these fields, and `backend/src/services/product.service.ts` stores rules under `pd_product.metadata.wholesale_pricing` (no DB migration needed because `metadata` JSONB already exists). Checkout pricing is authoritative in `backend/src/services/order.service.ts`, which recalculates unit price by quantity and enforces wholesaler minimum quantities. Frontend cart pricing helpers live in `frontend/src/lib/cart-utils.ts` and update cart totals/tier unit price; buyer product pages show wholesale tiers and pass metadata into add-to-cart components. Seller type pending message translations now say seller requested type in `frontend/src/i18n/messages/{en,fr,ar}.json`. Validation passed: backend TypeScript, frontend TypeScript, backend ESLint, frontend ESLint `--quiet` for touched files, cart utility Vitest test, and `git diff --check` (only LF-to-CRLF warning for MarketplaceStoreProductDetail.tsx).

---

## Memory c828cbf7-f7ec-41fc-8000-76f0afd34890

**Reports Management**

Reports Management is implemented across backend and frontend. New migration `backend/src/migrations/sql/014_reports_management.sql` expands `pd_reports` with nullable `store_id`, `target_type` (`seller`/`buyer`), `target_user_id`, `source` (`buyer`/`admin`), `priority` (`low`/`medium`/`high`/`critical`), `category`, and `updated_at`, with indexes. Shared enums are in `packages/types/src/enums.ts`: `ReportTargetType`, `ReportSource`, and `ReportPriority`. Backend `backend/src/services/report.service.ts` now supports buyer-to-seller reports via `createBuyerSellerReport`, superadmin-created reports against sellers or buyers via `create`, enriched listing with summary metrics via `list`, target lookup via `listTargets`, vendor scoped listing via `listByStore`, and status/notes updates via `updateStatus`. Public buyer reports use `POST /api/pd/reports`; vendor dashboard uses `GET /api/pd/reports/store`; admin routes include `GET/POST /api/pd/admin/reports`, `GET /api/pd/admin/reports/targets`, and `PUT /api/pd/admin/reports/:id/status`. Superadmin reports UI is `frontend/src/app/(admin)/reports/page.tsx` with KPI cards, search/status/target/source/priority filters, create marketplace report form, target search, notes/status management, seller suspension action, and buyer audit hint. Buyer order page `frontend/src/app/hub/orders/page.tsx` has a per-order-item "report seller" modal posting `store_id`, `order_id`, category, and reason to `/api/pd/reports`. Report and vendor compact-list translations live under `admin.reportsPage` and `admin.vendorsPage` in `frontend/src/i18n/messages/{en,fr,ar}.json`.

---

## Memory 5e77da02-9d5f-4dad-b1f1-7b1c54fb84b4

**Hub Homepage Amazon/Alibaba Template**

PandaMarket Hub homepage now uses an Amazon/Alibaba-inspired marketplace template in `frontend/src/components/hub/HubHomeContent.tsx`. It keeps the existing `trendingProducts` and `categories` props, filters default categories, and renders: department rail, large dark hero/search panel, top-pick product cards, seller CTA tile, service trust badges, feature cards, image-backed category tiles, daily deals strip, denser trending product grid via reusable `ProductCard`, and category showcase cards. `frontend/src/app/hub/page.tsx` now fetches 16 public products and includes `is_default` in `MarketplaceCategory`. Targeted lint for `HubHomeContent.tsx` and `app/hub/page.tsx` passes; `/hub` returned HTTP 200 locally.

---

## Memory e630de60-92c8-49bb-870e-e48510e6215b

**Documentation Authority**

After a deeper reread of project-authored Markdown docs in prodypanda1/pandamarket, treat `todo.md`, `tasklist.md`, `implementation_plan.md` latest sections, `docs/AGENT_CHECKPOINT_2026-05-06.md`, `wiki/14-agent-checkpoint-current-state.md`, and `.windsurf/handoff/checkpoint-audit-log-and-branding.md` as more authoritative than older `AUDIT_REPORT.md`, older README roadmap rows, and early roadmap/PRD status tables. The project is documented as 99%+ MVP complete/no production blockers, with the newest handoffs focusing on storefront theming/cart scoping and superadmin audit-log/dynamic branding. Key rules: preserve Hub vs storefront routing separation; use store-scoped cart helpers; use dynamic theme/marketplace branding helpers; use `fetchWithCsrf` for frontend authenticated/mutating API calls; backend uses raw parameterized SQL, Zod validation, asyncHandler, `pdId(prefix)`, and no ORM.

---

## Memory a1139e19-bef5-47d4-bc93-870f-8b32d8d912b6
**Date:** 2026-05-12

**Seller Dashboard Improvements**

On 2026-05-12, seller dashboard improvements were implemented in prodypanda1/pandamarket. Added `frontend/src/app/hub/dashboard/media/page.tsx` as a functional seller media library using `/api/pd/stores/me/media` and `/api/pd/files/presign`. Updated seller dashboard layout (`frontend/src/app/hub/dashboard/layout.tsx`) with active sidebar styling, a Media nav item, and setup progress bar. Enhanced overview (`frontend/src/app/hub/dashboard/page.tsx`) with command-center hero, quick actions, launch readiness checklist, store health cards, and richer KPI hints. Improved orders (`frontend/src/app/hub/dashboard/orders/page.tsx`) by replacing `window.prompt()` fulfillment with a modal and later adding rich order details. Backend order enhancements: `backend/src/services/order.service.ts` now has store-scoped enriched order list rows and `getStoreOrderDetail(orderId, storeId)` returning store totals, fulfillment fields, customer fields, and store-scoped item JSON. `backend/src/api/order.route.ts` exposes `GET /api/pd/orders/store/:id` for tenant-isolated seller order details. Validation passed: backend `npm run type-check`, targeted backend ESLint for order route/service, frontend orders ESLint, frontend `npx tsc --noEmit --pretty false --types vitest/globals,node`, and `git diff --check` for changed order files.

---

## Memory 1a634e18-6ccf-4b93-870f-8b32d8d912b6

**Chat System Extensions**

In prodypanda1/pandamarket, chat supports `buyer_seller`, `seller_admin`, `buyer_admin`, and `seller_seller`. Buyer-admin conversations use nullable `pd_chat_conversation.store_id`; seller-seller conversations target another store via `store_id`, store owner via `seller_id`, and initiator via `created_by`. Migrations include `020_chat_system.sql`, `021_buyer_admin_chat.sql`, and `022_seller_seller_chat.sql`. Backend routes include `POST /api/pd/chats/buyer-admin`, `POST /api/pd/chats/store/admin`, `POST /api/pd/chats/store/seller`, `POST /api/pd/chats/admin/seller`, `POST /api/pd/chats/admin/buyer`, `GET /api/pd/chats/admin/targets/search`, and `GET /api/pd/chats/limits`. All user modes can close/reopen accessible chats. Buyer seller-chat creation supports `check_existing` and `force_new`: `check_existing` detects any open buyer-seller chat for the target store and returns `{ existing: true }`; `force_new` creates a new context, closing only an exact duplicate context if needed. `InstantChatLauncher` is portaled to `document.body` and supports resume/new prompts. `ContactSellerButton` also prompts resume/new. `ChatInbox` supports seller_seller labels/filters, close/reopen controls, admin metadata chips, smart admin compose target search, and image-only chat attachments for buyer/seller/admin modes. Chat image uploads use private `chat_image` presigned uploads under `chat/{user_id}/`, only allow JPEG/PNG/WebP/GIF, and are downloaded through `/api/pd/files/access` after `chatService.canAccessAttachmentKey` confirms participant/store/admin-support access. Chat limits are configurable in `pd_platform_config` and the Superadmin Settings UI under Chat Security: `chat_message_rate_limit_per_minute`, `chat_max_images_per_message`, `chat_max_image_size_mb`, and `chat_max_message_length`. Backend enforces these limits when sending messages. Admin Stores page exposes store/owner IDs and "Chat store owner"; Admin Vendor Accounts page shows account IDs and links to chat center/manage stores.

---

## Memory 227a0f41-475f-4643-8ed7-2cc1d59ec71e

**Product Description Editor**

PandaMarket product descriptions now use `frontend/src/components/product/ProductDescription.tsx`, which exports `ProductDescriptionEditor` for the vendor product dashboard and `ProductDescriptionRenderer` for Hub/store product pages. The editor uses a constrained contenteditable toolbar (bold/italic/underline/headings/lists/quote/link/clear), DOMPurify client-side sanitization, and paste sanitization. Hub dashboard product form imports it in `frontend/src/app/hub/dashboard/products/page.tsx`; Hub product detail and storefront product detail render descriptions with `ProductDescriptionRenderer`. Backend product description writes are sanitized by `backend/src/utils/sanitize-html.ts`, imported in `backend/src/services/product.service.ts`; product create/update schemas allow `description` up to 20000 chars in `product.route.ts` and `store.route.ts`.

---

## Memory 62528495-9416-479d-9800-e33372dd2c2f

**Review Service Type Casting Fix**

A buyer POST to /api/pd/reviews was returning PD_INTERNAL_ERROR because backend ReviewService.recalculateRating used the same untyped Postgres parameter $1 both in the SELECT list for pd_product_rating.product_id and in the WHERE product_id comparison. PostgreSQL inferred inconsistent parameter types (text versus character varying), producing error code 42P08: 'inconsistent types deduced for parameter $1'. Fix in backend/src/services/review.service.ts: cast $1 as varchar in both places ($1::varchar) and cast COUNT(*) aggregates to int before inserting into pd_product_rating integer columns. Validation used a rollback-only insert/recalculate probe, targeted backend ESLint for review service/route, backend type-check, and git diff --check for review.service.ts.

---

## Memory 86eb4792-9b11-4a58-8497-498177c8b83b
**Date:** 2026-05-07

**Product-Type Fulfillment Integration**

On 2026-05-07, PandaMarket product-type fulfillment integration was completed and validated. Backend changes: physical-only shipping/COD/stock/fulfillment logic; serial license keys accepted by product create/update schemas in product.route.ts and store.route.ts; product.service.ts normalizes/deduplicates license_keys, persists them to pd_license_key, rejects keys for non-serial products, and requires keys before publishing serial products; order.service.ts checks and atomically reserves unassigned serial keys during checkout, releases unpaid reservations on cancellation, and uses physical-only fulfillments; order.subscriber.ts marks reserved serial keys used on payment capture; product download endpoint returns license_keys array plus legacy license_key. Frontend changes: hub/store checkout conditionally hides shipping and COD for non-physical carts; add-to-cart and product details only enforce/show stock for physical products; hub orders display multiple license keys; vendor dashboard product form uploads digital files and shows serial-only license key textarea, submitting one key per line. Validation: backend and frontend TypeScript passed; backend full lint exits 0 without file warnings after typing API key scopes, page-builder duplicate-slug errors, and theme DB rows (only the TypeScript parser version banner remains). Frontend full lint exits with 0 errors; non-image warnings were cleaned on 2026-05-07 by removing unused variables/imports, fixing hook dependencies, and aliasing the Lucide Image icon to ImageIcon; remaining frontend lint output is 78 existing @next/next/no-img-element warnings only. Scoped git diff --check over fulfillment/useSocket, backend lint-cleanup, and frontend changes passed (one Git LF-to-CRLF warning for MarketplaceStoreProductDetail.tsx only). Remaining risks: vendors can add/replenish serial keys but cannot view key pool counts/status; captured serial-key cancellation/refund/reissue workflow is not implemented; broad Next Image migration is still pending if desired.

---

## Memory b1a7f6c8-c052-4b1d-ba71-dba27df41590

**Superadmin Plans Management**

Superadmin Plans management was completed in prodypanda1/pandamarket. Backend now validates dynamic plan IDs via backend/src/utils/plan-id.ts and supports admin POST /api/pd/admin/plans, PUT /api/pd/admin/plans/:planId, and DELETE /api/pd/admin/plans/:planId with free-plan protection, replacement-plan handling for stores, cache invalidation, and vendor credit quota reset to replacement plan tokens. Runtime plan checks now use DB plan limits instead of fixed enum assumptions across subscription, credits, store, product, validators, order subscriber, and subscription worker. Shared entity types now use string for dynamic plan IDs. Frontend Superadmin Plans page supports creating, editing, duplicating, deleting plans with replacement selection, dirty tracking, save-all/reset, metrics, and dynamic styling. Admin Stores subscription override fetches dynamic plans, and seller subscription upgrade/downgrade labels compare yearly_price dynamically. Validation passed: backend TypeScript, frontend TypeScript, focused backend ESLint, focused frontend ESLint, and git diff --check (only CRLF warning for frontend/src/app/(admin)/plans/page.tsx).

---

## Memory 3bb8a1a1-ab0e-409b-a04a-32b8a7ed093f

**Subscription Plan Availability Flow and Marketplace Branding**

Completed subscription plan availability flow and marketplace branding consistency work. Enabled-plan public flow uses dynamic enabled plans for hub vendor signup/pricing and seller registration. Dynamic marketplace branding now uses MarketplaceBrand/PoweredByMarketplace with marketplace settings-driven name/logo across hub/admin/dashboard shells, storefront home/page-builder overrides, product, checkout, custom page footers, default storefront theme footers, store SEO metadata, and page-builder footer templates. Validation passed: frontend TypeScript (`.\node_modules\.bin\tsc.cmd --noEmit --types vitest/globals --pretty false`), ESLint error-only for `src/app/store`, `src/components/themes`, and `src/components/page-builder/PageBuilderEditor.tsx`, focused ESLint for `PoweredByMarketplace.tsx` and `PageBuilderEditor.tsx`, and `git diff --check` for relevant frontend paths (only Git CRLF warnings on existing files).

---

## Memory 286fbe8a-a370-4a67-87b6-68f08f80d177

**System Logs**

PandaMarket has persistent backend server-error and operational logging. Migration backend/src/migrations/sql/018_system_logs.sql creates pd_system_log with level, source, event_type, message, request_id, method, path, status_code, user_id/user_role, ip, user_agent, error_name/error_code, stack, metadata, and created_at plus indexes. backend/src/services/system-log.service.ts provides create(), captureError(), list(), summary(), deleteById(), and clear(); it clamps text fields, redacts sensitive metadata keys (password/token/cookie/authorization/secret/api_key/etc.), supports filters for level, event_type, source, status_code, request_id, has_stack, from/to, and broad search, and summary includes info, errors, warnings, fatal, last_hour, last_24h, unresolved_500s, and manual_logs. clear() supports deleting by IDs, pruning logs older than N days, clearing by filters, or clearAll; destructive bulk deletion is guarded by API validation requiring confirm='CLEAR LOGS'. The global backend errorHandler in backend/src/middlewares/index.ts calls systemLogService.captureError for handled PdError 5xx and unknown/unhandled errors, so superadmins can correlate PD_INTERNAL_ERROR responses by request_id. Admin routes under /api/pd/admin/system-logs and /api/pd/admin/system-logs/summary expose filtered logs and counts; POST /api/pd/admin/system-logs creates manual operational logs; POST /api/pd/admin/system-logs/clear clears filtered/old/all logs with confirmation; DELETE /api/pd/admin/system-logs/:id deletes one log entry. frontend/src/app/(admin)/system-logs/page.tsx is the superadmin UI with summary cards, advanced filters, pagination, request context, metadata, stack traces, a Create log panel, Clear logs cleanup panel (current filters, older-than retention prune, all logs), confirmation input requiring CLEAR LOGS, and per-entry delete buttons. frontend/src/app/(admin)/layout.tsx includes a Server Logs sidebar link, and frontend/src/middleware.ts includes /system-logs in ADMIN_ROUTE_PREFIXES so localhost routes to the admin page instead of /hub/system-logs. Local DB was updated by applying 018_system_logs.sql directly, creating pd_system_log; since the migration SQL is idempotent, the normal migration runner can still record it later. Related frontend review fix: frontend/src/components/hub/ReviewSection.tsx treats ProductRating numeric fields as number|string|null and converts via toNumber before avg.toFixed and rating bars, fixing avg.toFixed is not a function after PostgreSQL numeric fields are returned as strings.

---

## Memory 57967d02-4422-4ef0-87a4-f947c0af45b1

**Multi-Store Support**

PandaMarket seller accounts support multiple stores via pd_store.owner_id while pd_user.store_id remains the first/default store. Active vendor dashboard context uses the httpOnly pd_selected_store_id cookie validated by requireStore; /api/pd/stores/mine returns owned stores, selected-store state, can_create_free_store, and free_store_limit_reached. /api/pd/stores/select selects a store; /api/pd/stores creates a store and selects it, but backend StoreService.createForUser now enforces only one free store per owner/account by rejecting a second SubscriptionPlan.Free store. Storefront marketplace pages get store-scoped seller_score/seller_review_count from pd_review by store_id via StoreService.getSellerScore and /api/pd/stores/by-host, so the score is not owner-global. Vendor notifications are store-scoped for selected-store dashboards by resolving the selected store in notification.route.ts and filtering notification data->>'store_id'; store-scoped notification producers now include store_id for new_order, payment_captured, stock_low, payout_completed, KYC, AI, and subscription events. Legacy store-scoped notification types without data.store_id are intentionally hidden from selected vendor store views to prevent cross-store leaks, while buyer/admin/global notification types remain visible. Frontend /hub/dashboard/create-store checks /stores/mine eligibility, disables creation when free limit is reached, and slugifies the full store name until the subdomain is manually edited, fixing the first-letter subdomain bug. Dashboard layout shows a top Create free store button only when storeCount === 1 and can_create_free_store is true, and Switch store for multiple stores. Superadmin now separates vendor accounts and stores: /api/pd/admin/vendor-accounts lists account-level metrics/actions; frontend /users is vendor-account management (suspend/reactivate/reset account 2FA, multi-store/free-slot metrics, link to stores); /stores preserves the store-level management UI for seller type, subscription, verification, payments, domains, and store suspension. Targeted validation passed after these changes: backend type-check, frontend tsc, targeted backend/frontend ESLint, and git diff --check (only CRLF warnings on two frontend files).

---

## Memory e2570a72-db51-4642-9fb5-c493fe682368

**Superadmin Chat Bubble Controls and Plans Management Enhancement**

Superadmin chat bubble controls were implemented in prodypanda1/pandamarket: backend public marketplace settings now include `chat_bubble_enabled` and `chat_bubble_position`, admin settings validation accepts them, and the Superadmin Settings UI exposes an Instant Chat Bubble toggle plus bottom-right/bottom-left selector. `InstantChatLauncher` fetches `/api/pd/marketplace/settings`, waits for settings before rendering to prevent disabled-bubble flash, and positions itself with `left-5` or `right-5`. Plans management was enhanced: backend admin routes expose `GET /api/pd/admin/plans` with store/verified/suspended counts, `PUT /api/pd/admin/plans/:planId` supports all plan fields and `ai_tokens_included = -1`, and normalizes commission percentages >1 to fractions. The Superadmin Plans page now uses the admin plans API and provides cards with KPIs, dirty tracking, per-plan/all save, reset, all numeric fields, all feature toggles, unlimited `-1` inputs, and subscriber counts. Validation passed: backend ESLint for admin/marketplace routes, backend TS (`npx tsc -p backend/tsconfig.json --noEmit --pretty false`), frontend TS (`npx tsc -p frontend/tsconfig.json --noEmit --types vitest/globals --pretty false`), focused frontend ESLint via `node frontend/node_modules/eslint/bin/eslint.js -c frontend/eslint.config.mjs ...`, and `git diff --check` for touched files. The frontend ESLint command from repo root emits a harmless Next `Pages directory cannot be found` warning but exits 0.

---

## Memory 64212f78-f9e5-40d1-8479-faaa27343bb3

**Login Spinner/Failure Fix**

Login spinner/failure across buyer, seller, and admin was fixed by addressing shared dependencies. `fetchWithCsrf` in `frontend/src/lib/api.ts` no longer warms CSRF via `/api/pd/search?limit=1` (which can hang/fail if search/Meili is slow); it now calls lightweight `GET /api/pd/auth/csrf`. `backend/src/api/auth.route.ts` exposes that endpoint, relying on existing CSRF middleware to set the `pd_csrf` cookie. `backend/src/services/auth.service.ts` now prevents request/response login from waiting indefinitely on Redis lockout checks: login Redis operations use `LOGIN_REDIS_TIMEOUT_MS = 750`, `withLoginRedisTimeout`, and `getLoginRedisIfReady`; if Redis is not ready, lockout read/write/delete operations are skipped/fail-open while DB password verification and refresh-token storage still proceed. Validation passed for backend ESLint on auth route/service, frontend ESLint for `frontend/src/lib/api.ts` (with the known harmless Next pages warning), backend TypeScript, frontend TypeScript, and `git diff --check` for auth/api files.

---

## Memory 8badecde-df00-426e-8163-414dcdb890c7

**Local Development Configuration**

PandaMarket local development uses frontend http://localhost:3000 and backend http://localhost:9000. Frontend must proxy /api/pd/* to backend via frontend/next.config.ts rewrites. Backend CSRF middleware requires mutating requests to include X-CSRF-Token matching pd_csrf cookie. Super admin seed credentials are admin@pandamarket.tn / Admin123!, and backend returns role values like admin and super_admin.

---

## Memory 46e4d461-bbfd-4a06-a8dd-eedcc53f44b8

**Git Operations Restriction**

For PandaMarket work, the user requested that no git push, pull, or merge operations be attempted by the assistant. All work should stay on the local computer, and the user will decide whether to push changes later.

---

*End of Memories Summary*
