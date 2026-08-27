# 01 — Multi-Tenant Edge Middleware & Host Routing

## 1. Edge Host Routing (`frontend/src/middleware.ts`)

Next.js 16 Edge Middleware intercepts all incoming requests to determine whether the visitor is accessing the **Central Hub**, the **Superadmin Dashboard**, or an **Individual Vendor Storefront**.

```mermaid
flowchart TD
    Req[Incoming Request] --> Matcher{Path Matcher Excludes?}
    Matcher -- Yes --> Next[Serve Static / API Asset]
    Matcher -- No --> Classify[classifyHost(hostname)]

    Classify -->|hub| HubCheck{Is Protected Route?}
    HubCheck -- Yes & No Cookie --> LoginRedirect[Redirect to /login/buyer or /login/seller]
    HubCheck -- No or Authed --> HubRewrite[Rewrite to /hub/*]

    Classify -->|admin| AdminCheck{Has Admin Cookie?}
    AdminCheck -- No --> AdminLogin[Redirect to /login/admin]
    AdminCheck -- Yes --> AdminRewrite[Rewrite to /(admin)/*]

    Classify -->|store| StoreFetch[Fetch Maintenance & Store Status in Parallel]
    StoreFetch --> StoreCheck{Store Exists & Verified?}
    StoreCheck -- No --> StoreNotFound[Render Store 404 Page]
    StoreCheck -- Yes --> StoreRewrite[Rewrite to /store/storeHost/*]
```

---

## 2. Low-Latency Parallel Cache Architecture

To prevent adding round-trip latency to every storefront page load:
- **Audit Optimization:** Middleware previously fetched maintenance status and store status sequentially (adding ~1-2 seconds of latency).
- **Current Optimized Pipeline:**
  1. Both statuses are fetched simultaneously using `Promise.all([getMaintenanceStatus(req), getStorefrontStatus(storeHost, req)])`.
  2. Statuses are cached in memory using isolate `Map` with a **30-second TTL** for hits and **5-second TTL** for misses.
  3. Max cache entries are capped at `1,000` to prevent Vercel Edge isolate memory exhaustion.

---

## 3. Storefront URL Context & Routing Rules

Storefront pages must never use absolute `/hub/*` links. A set of routing utilities in `frontend/src/lib/store-routing.ts` ensures proper link scoping:

```typescript
// frontend/src/lib/store-routing.ts
export function getStoreRouteContext(storeHost: string) {
  return {
    isStorefront: true,
    storeHost,
    // Relative paths on storefront subdomain
    homePath: '/',
    cartPath: '/cart',
    checkoutPath: '/checkout',
    productPath: (slug: string) => `/product/${slug}`,
    categoryPath: (slug: string) => `/category/${slug}`,
  };
}
```

---

## 4. Edge Middleware Checklist

- [x] Host header classification (<5ms overhead).
- [x] Parallel status fetching for maintenance & store verification.
- [x] Memory-bounded cache (max 1,000 entries, 30s TTL).
- [x] Clean maintenance mode bypass for administrators.
- [ ] Add Redis-backed edge KV store for distributed multi-region cache invalidation.
