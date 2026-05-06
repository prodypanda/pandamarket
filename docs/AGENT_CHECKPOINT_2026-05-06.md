# Agent Checkpoint — PandaMarket Storefront Theming Pass

> **Date:** 2026-05-06  
> **Purpose:** Fast handoff for a new AI agent/session. Start here before changing code.

## 1. Project summary

PandaMarket is a Tunisia-first **Marketplace as a Service** platform:

- **Central Hub:** marketplace experience on the main host (`pandamarket.tn`, local `pandamarket.local` / `localhost:3000`) where buyers discover products from all vendors.
- **Vendor storefronts:** Shopify-style individual stores on vendor subdomains or custom domains.
- **Vendor dashboard:** sellers manage products, categories, media, themes, Page Builder pages, orders, and settings.
- **Admin panel:** platform administration for marketplace settings, users, vendors, payments, and moderation.

The immediate engineering goal in the last session was to make **all storefront pages and themes obey the selected seller dashboard theme/custom colors**, and to make **cart/checkout behavior store-scoped and correct**.

## 2. Current user objective

The user wants future agents to continue without re-explaining the project. Respect these priorities:

1. Keep storefront subdomain pages visually consistent with the seller-selected theme.
2. Avoid hardcoded cart links, fake cart counts, and central-domain navigation on storefront pages.
3. Keep central Hub marketplace routes separate from storefront subdomain routes.
4. Fix bugs at the root cause and validate with targeted TypeScript, ESLint, and tests.
5. Do not add unrelated features while doing storefront/theming work.

## 3. Routing model to preserve

Key files:

- `frontend/src/middleware.ts`
- `frontend/src/lib/store-hosts.ts`
- `frontend/src/lib/store-routing.ts`
- `frontend/src/app/store/[storeHost]/**`

Rules:

- **Hub/marketplace host:** central routes are marketplace-owned. `/store/:storeHost` on the central host renders marketplace seller pages or redirects to Hub equivalents where appropriate.
- **Storefront subdomain/custom domain:** middleware rewrites the host to `/store/[storeHost]`; storefront links should generally be relative: `/`, `/cart`, `/checkout`, etc.
- Use `getStoreRouteContext(storeHost)` for route-level pages that need to know if they are being rendered as marketplace or storefront.
- Use `storePathBase` only when a storefront route must render correctly under central `/store/:storeHost`; otherwise subdomain storefront pages should remain relative.

## 4. Storefront theming architecture

Key files:

- `frontend/src/lib/themes.ts`
- `frontend/src/components/themes/shared.ts`
- `frontend/src/components/themes/*.tsx`
- `frontend/src/components/themes/StorefrontThemeCartLink.tsx`
- `frontend/src/components/store/StoreCartIcon.tsx`

Important contracts:

- `ThemeCustomization` lives in `store.settings.themeCustomization`.
- `resolveThemeColors(theme, customization)` merges theme default colors, selected preset, and custom colors.
- `useThemeCustomization(theme, branding)` is the shared helper for theme templates.
- Theme components should use dynamic colors from `useThemeCustomization`, not fixed Tailwind color strings for core chrome.
- Storefront theme cart links should use `StorefrontThemeCartLink` or `StoreCartIcon` so cart counts are live and store-scoped.
- Product links in themes should use `getStorefrontProductPath(product, storePathBase)`.

Currently registered storefront themes in `frontend/src/lib/themes.ts`:

- `minimal`, `classic`, `modern`, `boutique`, `artisan`, `techhub`, `flavor`
- `elegance`, `neon`, `sahara`, `medina`, `coastal`, `urban`, `garden`
- `studio`, `luxe`, `fresh`, `craft`, `digital`, `kids`

## 5. Work completed in the latest storefront pass

### Shared cart and checkout behavior

- Added store-scoped cart removal support:
  - `frontend/src/lib/cart-utils.ts`
  - `frontend/src/contexts/CartContext.tsx`
- Checkout now removes only the current store's cart items after successful order/payment init:
  - `frontend/src/app/store/[storeHost]/checkout/page.tsx`
- Cart tests include store-scoped removal coverage:
  - `frontend/src/__tests__/cart-context.test.tsx`

### Theme templates

All storefront theme templates were patched to use the shared storefront cart/cart-count components and dynamic seller theme colors where needed:

- `StorefrontThemeCartLink`
- `StoreCartIcon`
- `useThemeCustomization`
- `colorVars`
- `getStorefrontProductPath`

Themes audited/patched include:

- Minimal, Classic, Modern, Boutique, Coastal, Fresh, Kids
- Artisan, Flavor, TechHub, Neon, Digital
- Urban, Studio, Craft, Garden, Sahara
- Elegance, Medina, Luxe

### Route-level storefront pages

Route-level pages that bypass the theme templates were patched for theme-aware chrome/colors:

- `frontend/src/app/store/[storeHost]/cart/page.tsx`
  - Uses selected theme font/background/header colors.
  - Cart cards, summary panels, and text colors are theme-aware.
  - Store cart items are filtered by `store.id`.
  - Central marketplace host redirects to `/hub/cart`.

- `frontend/src/app/store/[storeHost]/checkout/page.tsx`
  - Uses selected theme font/background/header/footer/surface colors.
  - Form labels/payment cards respect dynamic colors.
  - Checkout only clears current store items via `removeStoreItems(store.id)`.
  - Central marketplace host redirects to `/hub/checkout`.

- `frontend/src/app/store/[storeHost]/product/[slug]/page.tsx`
  - Uses `StoreCartIcon`.
  - Product sections, related-product cards, and dividers respect selected colors.
  - Description uses `ProductDescriptionRenderer`.

- `frontend/src/app/store/[storeHost]/page.tsx`
  - Default path renders selected theme component.
  - Page Builder homepage override now uses selected theme font/background/header/footer colors.
  - Page Builder homepage override uses `StoreCartIcon` instead of a plain `Panier` link.

- `frontend/src/app/store/[storeHost]/pages/[slug]/page.tsx`
  - Custom Page Builder pages use selected theme font/background/header/footer colors.
  - Custom page chrome uses `StoreCartIcon`.
  - Marketplace central route redirects back to `/store/${storeHost}`.

- `frontend/src/app/store/[storeHost]/products/page.tsx`
  - Already delegates to the selected theme component and passes branding/products.

## 6. Validation already run

These checks passed after the latest storefront route patches:

```powershell
# From c:\tek\pandamarket\frontend
npx tsc --noEmit --types vitest/globals --pretty false

npx eslint src/app/store src/components/store/StoreCartIcon.tsx src/contexts/CartContext.tsx src/lib/cart-utils.ts --no-error-on-unmatched-pattern

npm test -- src/__tests__/cart-context.test.tsx
```

Results:

- TypeScript: passed.
- Targeted ESLint: `0` errors; only existing Next `<img>` warnings.
- Cart tests: `12/12` passed.

## 7. Known warnings / not blockers

Targeted ESLint still reports `@next/next/no-img-element` warnings in some storefront files. They were pre-existing/accepted in this pass and are not functional blockers.

If a future agent chooses to replace `<img>` with `next/image`, do it as a separate focused change and validate layout carefully.

## 8. Important files for next agent

Read these first for storefront work:

- `frontend/src/lib/themes.ts`
- `frontend/src/components/themes/shared.ts`
- `frontend/src/components/themes/StorefrontThemeCartLink.tsx`
- `frontend/src/components/store/StoreCartIcon.tsx`
- `frontend/src/contexts/CartContext.tsx`
- `frontend/src/lib/cart-utils.ts`
- `frontend/src/lib/store-routing.ts`
- `frontend/src/lib/store-hosts.ts`
- `frontend/src/app/store/[storeHost]/page.tsx`
- `frontend/src/app/store/[storeHost]/cart/page.tsx`
- `frontend/src/app/store/[storeHost]/checkout/page.tsx`
- `frontend/src/app/store/[storeHost]/product/[slug]/page.tsx`
- `frontend/src/app/store/[storeHost]/pages/[slug]/page.tsx`
- `frontend/src/app/store/[storeHost]/products/page.tsx`

Read these for marketplace theme/HUB work:

- `frontend/src/lib/marketplace-theme.ts`
- `frontend/src/lib/marketplace-settings.ts`
- `frontend/src/hooks/useMarketplaceTheme.ts`
- `frontend/src/components/hub/HubNavbar.tsx`
- `frontend/src/components/hub/HubHomeContent.tsx`
- `frontend/src/components/hub/AliExpressHomeContent.tsx`

Read these for product descriptions:

- `frontend/src/components/product/ProductDescription.tsx`
- `backend/src/utils/sanitize-html.ts`
- `backend/src/services/product.service.ts`

## 9. How the next agent should work

- Start with this checkpoint, then inspect current `git diff` before editing.
- Do not assume central `/store/:storeHost` and real storefront subdomain behavior are the same.
- Prefer shared helpers over per-theme duplicated logic.
- For theme changes, update all affected themes or create/extend a shared helper.
- For cart changes, keep store scoping intact.
- For checkout changes, never call `clearCart()` from a storefront checkout success path unless intentionally clearing all stores.
- Use targeted validation after changes:

```powershell
# Frontend typecheck
npx tsc --noEmit --types vitest/globals --pretty false

# Targeted lint examples
npx eslint src/app/store src/components/themes src/components/store src/contexts src/lib --no-error-on-unmatched-pattern

# Cart tests
npm test -- src/__tests__/cart-context.test.tsx
```

## 10. Suggested next checks

No blocking storefront theming task remains from the last pass. Useful optional follow-ups:

1. Manually test a real storefront subdomain/custom host with several theme presets/custom colors.
2. Manually test central marketplace `/store/:storeHost` behavior to ensure it remains marketplace-styled.
3. Convert remaining storefront `<img>` warnings to `next/image` only if layout impact is acceptable.
4. Add visual regression tests for theme chrome/cart counts if the project adopts E2E/screenshot testing.
5. Continue auditing non-storefront Hub/vendor/admin pages only if the user explicitly asks for broader UI polish.
