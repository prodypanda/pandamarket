# 04 — Medium Bugs & Inconsistencies (P2)

> **Priority Standard:** Defects affecting internationalization (i18n), theme performance, frontend UX polish, error resilience, and code hygiene.

---

### [P2-1] Arabic RTL SSR Layout Flash (`<html lang="fr" dir="ltr">`)
- **Forensic Evidence:** `frontend/src/app/layout.tsx:142` hardcodes:
  ```html
  <html lang="fr" ...>
  ```
  `dir="rtl"` is only applied via client-side DOM mutation inside `LocaleContext.tsx:81-86` after hydration.
- **Impact:** Arabic-speaking visitors experience a visible flash of unstyled LTR content on every page load, causing text and cards to jump from left to right.
- **How to Fix:** In Next.js Server Component root layout, read the locale from the `NEXT_LOCALE` cookie and render `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>` during SSR.

---

### [P2-2] Over 400 Untranslated French Strings Across Dashboards
- **Forensic Evidence:**
  - `(admin)/settings/page.tsx`: ~127 hardcoded French labels.
  - `hub/dashboard/products/page.tsx`: ~90 hardcoded French labels.
  - `hub/orders/page.tsx:48-57`: Hardcoded French status labels (`'En attente'`, `'Paiement requis'`, `'Expédié'`, `'Livré'`).
  - `(admin)/layout.tsx:302`: Untranslated string `'Fraud Radar & Chargebacks'` inside translated sidebar navigation.
- **Impact:** Arabic and English merchants and customers see an incomplete mixture of French and their selected language.
- **How to Fix:** Extract all raw strings into namespaces inside `frontend/src/i18n/messages/{en,fr,ar}.json` and wrap with `t('...')`.

---

### [P2-3] Dead Configuration Sets in `middleware.ts`
- **Forensic Evidence:** `frontend/src/middleware.ts:29-55` declares `HUB_DOMAINS`, `ADMIN_DOMAINS`, and `PLATFORM_BASES`. At line 103, `classifyHost` is imported from `./lib/store-hosts` which performs the actual routing, leaving the sets in `middleware.ts` completely unused.
- **Impact:** Invites configuration drift when developers update domain lists in `middleware.ts` without realizing they have no effect.
- **How to Fix:** Delete the dead declarations from `middleware.ts` and ensure `store-hosts.ts` is the single source of truth. Move line 103 import to the top of `middleware.ts`.

---

### [P2-4] Private IPs Always Classify as Marketplace Hub
- **Forensic Evidence:** In `frontend/src/lib/store-hosts.ts:34-35,97`:
  `PRIVATE_HOST_PATTERN` classifies any private IP (`10.x`, `192.168.x`, `172.16.x`) as Marketplace Hub.
- **Impact:** In production, if a custom-domain store points at an internal or private address, it serves the main marketplace rather than a 404 or store error.
- **How to Fix:** Restrict `PRIVATE_HOST_PATTERN` check to `process.env.NODE_ENV !== 'production'`.

---

### [P2-5] Middleware Matcher Skips File-Like Paths Entirely
- **Forensic Evidence:** `frontend/src/middleware.ts:13`:
  ```
  '/((?!api/|_next/|_static/|_vercel|pd-product-images/|pd-themes/|[\\w-]+\\.\\w+).*)'
  ```
  `[\\w-]+\\.\\w+` excludes any route containing a dot in the first path segment.
- **Impact:** URLs such as `/theme.custom.css`, `/store.info`, or custom pages containing dots bypass tenant host resolution and maintenance mode guards.
- **How to Fix:** Replace generic regex with an explicit file extension allowlist (`\.(ico|png|jpg|jpeg|svg|webp|css|js|map|txt|xml)$`).

---

### [P2-6] Subscription Limits In-Memory Cache Invalidation
- **Forensic Evidence:** In `backend/src/services/subscription.service.ts:39`:
  ```typescript
  private cache: Map<string, ISubscriptionLimits> = new Map();
  ```
  Updating a plan in Superadmin (`PUT /api/pd/admin/plans/:planId`) clears only the local process cache.
- **Impact:** In multi-instance or clustered backend deployments, other instances serve stale quotas and commission rates indefinitely.
- **How to Fix:** Publish cache invalidations to Redis pub/sub (`PLATFORM_CONFIG_INVALIDATION_CHANNEL`) or set a 60-second TTL on cached entries.

---

### [P2-7] Payout Worker Queries All Wallets Without Scoping
- **Forensic Evidence:** In `backend/src/workers/payout.worker.ts:55-72`:
  The payout release handler executes an unscoped query across all wallets whenever any payout release occurs.
- **Impact:** Unnecessary database I/O and potential notification spam to uninvolved merchants.
- **How to Fix:** Scope the query specifically to wallets with transactions maturing in the current timestamp window.

---

### [P2-8] Payment Provider Integration Discrepancies
- **Forensic Evidence:**
  - In `backend/src/plugins/payment/paypal.provider.ts:48`: Default foreign exchange rate is hardcoded as `0.30`.
  - In `backend/src/plugins/payment/konnect.provider.ts:43-44`: Customer name is hardcoded as `'Customer'`.
- **How to Fix:** Require explicit FX rate in platform configuration; pass actual buyer name from `pd_order` to Konnect payload.

---

### [P2-9] Unique Constraint Violations Return 500 Instead of 409
- **Forensic Evidence:** `store.service.ts` (subdomain collision) and `auth.service.ts` (email collision) catch PostgreSQL error code `23505` and let it bubble to the default error handler, resulting in a 500 Internal Server Error.
- **How to Fix:** Map PostgreSQL error `23505` to `PdConflictError(PdErrorCode.ALREADY_EXISTS)` with user-friendly error messages.

---

### [P2-10] Silent `catch {}` Blocks Swallowing Errors
- **Forensic Evidence:** Several dashboard pages (e.g. `online-store/customers/page.tsx:33-35`, `kyc/page.tsx:64-66`) contain empty catch blocks: `catch { /* ignore */ }`.
- **Impact:** Network failures or API validation rejections fail silently, leaving merchants staring at frozen buttons or infinite spinners.
- **How to Fix:** Replace empty catch blocks with `catch (e) { setError(e.message); toast.error(...); }`.

---

### [P2-11] ~25 Dead `href="#"` Links in Page Builder Templates
- **Forensic Evidence:** `frontend/src/components/page-builder/templates.ts:406-1715` contains multiple dummy `#` anchor links in navigation menus, buttons, and footers.
- **Impact:** Shipped merchant storefronts have non-functional links that reload the page or do nothing.
- **How to Fix:** Replace with sensible relative paths (`/pages/contact`, `/products`, `/categories`) or make them required fields during Page Builder publish validation.

---

### [P2-12] Cart Sync Token Never Expires or Rotates
- **Forensic Evidence:** `frontend/src/contexts/CartContext.tsx:45-53` generates a permanent `sess_...` token stored in `localStorage`.
- **Impact:** Shared computers or public terminals link future shoppers to prior anonymous cart sync payloads.
- **How to Fix:** Use `sessionStorage` or rotate the token upon user login/checkout completion.

---

### [P2-13] Withdrawals Have No Dedicated `pd_payout` Entity
- **Forensic Evidence:** `backend/src/services/wallet.service.ts:220-232` handles withdrawals by immediately subtracting `pd_vendor_wallet.balance` and creating a `pd_wallet_transaction` with type `'payout'` and note `'Vendor withdrawal'`. No `pd_payout` table exists.
- **Impact:** No audit trail for bank transfer destinations (RIB/IBAN), no admin payout approval state machine, no bank receipt attachment, and no rejection refund flow.
- **How to Fix:** Create `pd_payout` table (`id`, `wallet_id`, `store_id`, `amount`, `bank_name`, `iban_rib`, `status`, `proof_file_key`, `reviewed_by`, `reviewed_at`) and link withdrawals directly to payout entities.

---

### [P2-14] Event Name String Drift
- **Forensic Evidence:** `backend/src/services/mandat.service.ts:149` uses literal `'pd.payment.captured'` while the rest of the codebase references `PdEvent.PAYMENT_CAPTURED`.
- **How to Fix:** Refactor all event emissions to use the `PdEvent` enum.

---

### [P2-15] Default Legal and Support URLs Redirect to `/hub/search`
- **Forensic Evidence:** In `backend/src/services/platform-config.service.ts:45-50`:
  ```typescript
  marketplace_help_url: '/hub/search',
  marketplace_terms_url: '/hub/search',
  marketplace_privacy_url: '/hub/search',
  marketplace_contact_url: '/hub/search',
  ```
- **Impact:** Shoppers or merchants clicking footer links for "Conditions d'utilisation" (Terms of Service) or "Politique de confidentialité" (Privacy Policy) are redirected to the product search page.
- **How to Fix:** Seed default CMS pages (`/pages/terms`, `/pages/privacy`, `/pages/help`) and update default URLs.

---

### [P2-16] All 20 Storefront Themes Use `unoptimized` on `next/image`
- **Forensic Evidence:** In `frontend/src/components/themes/*.tsx` (Artisan, Boutique, Classic, Coastal, Craft, Digital, Elegance, Flavor, Fresh, Garden, Kids, Luxe, Medina, Minimal, Modern, Neon, Sahara, Studio, TechHub, Urban):
  Every product card passes `unoptimized` to `<Image ... unoptimized />`.
- **Impact:** Next.js automated image optimization (WebP transcoding, quality compression, resizing) is bypassed. Shoppers on mobile devices download original full-resolution merchant uploads (often 3–8 MB each), causing severe mobile performance degradation.
- **How to Fix:** Remove the `unoptimized` prop and ensure S3/CDN hostnames are registered under `images.remotePatterns` in `frontend/next.config.ts`.
