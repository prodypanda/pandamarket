# PandaMarket Frontend

Next.js App Router frontend for PandaMarket: central Hub marketplace, vendor storefronts, vendor dashboard, and admin panel.

## Start here

If you are a new agent/session, read these first:

- [`../docs/AGENT_CHECKPOINT_2026-05-06.md`](../docs/AGENT_CHECKPOINT_2026-05-06.md)
- [`AGENTS.md`](./AGENTS.md)
- [`../wiki/01-project-overview.md`](../wiki/01-project-overview.md)

## Local development

From `c:\tek\pandamarket\frontend`:

```powershell
npm run dev
```

Default local URLs:

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:9000`

The frontend proxies `/api/pd/*` to the backend via `next.config.ts` rewrites.

## Key directories

- `src/app/hub/` — central marketplace Hub pages.
- `src/app/store/[storeHost]/` — storefront and central `/store/:storeHost` routes.
- `src/app/hub/dashboard/` — vendor dashboard.
- `src/app/(admin)/` — admin panel.
- `src/components/themes/` — storefront theme templates.
- `src/components/store/` — shared storefront/cart components.
- `src/components/hub/` — shared Hub marketplace UI.
- `src/contexts/CartContext.tsx` — cart state and store-scoped cart actions.
- `src/lib/themes.ts` — theme registry and customization resolution.
- `src/lib/store-routing.ts` and `src/lib/store-hosts.ts` — central-vs-storefront route behavior.

## Storefront theming rules

- Use `resolveThemeColors()` / `useThemeCustomization()` for theme colors.
- Use `StorefrontThemeCartLink` or `StoreCartIcon` for storefront cart links/counts.
- Use `getStorefrontProductPath(product, storePathBase)` for storefront product links.
- Keep real storefront subdomain links relative where possible: `/`, `/cart`, `/checkout`.
- Do not clear the whole multi-store cart from storefront checkout; use `removeStoreItems(store.id)`.

## Targeted validation

From this directory:

```powershell
npx tsc --noEmit --types vitest/globals --pretty false
npx eslint src/app/store src/components/themes src/components/store src/contexts src/lib --no-error-on-unmatched-pattern
npm test -- src/__tests__/cart-context.test.tsx
```
