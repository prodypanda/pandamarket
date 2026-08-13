# HH-18 — No `<noscript>` Fallback for JS-Disabled Buyers

**Severity:** 🟢 Improvement (Accessibility / SEO)  
**Area:** Hub Homepage  
**Files:**  
- `frontend/src/app/hub/page.tsx`  
- `frontend/src/components/hub/HubHomeContent.tsx`  
**Impact:** `HubHomeContent` is a `'use client'` component. When JavaScript is disabled (e.g. bot crawlers with limited JS, corporate proxies, or accessibility tools), buyers see a blank main content area. This hurts:
1. **SEO** — crawlers that don't execute JS miss the product grid.
2. **Accessibility** — screen readers using non-JS browsing modes see empty content.

---

## Root Cause

```tsx
// HubHomeContent.tsx:1
'use client';
// All rendering is client-side — no SSR output visible without JS
```

Next.js App Router server components render HTML on the server, but `'use client'` components that use hooks (`useState`, `useEffect`) are hydrated client-side. While Next.js does hydrate them during SSR, the `useEffect`-based carousel and block resolution mean some content won't appear in the initial HTML payload.

---

## Improvement Checklist

### Part 1 — Add a `<noscript>` static fallback in `hub/page.tsx`

- [ ] **Step 1 — Create a static product grid server component**  
  In `hub/page.tsx`, add a minimal server-rendered product listing:
  ```tsx
  function StaticProductGrid({ products, currency }: { products: Product[]; currency: string }) {
    return (
      <noscript>
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="text-2xl font-black text-gray-900 mb-8">Trending Products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 8).map((product) => (
              <a
                key={product.id}
                href={`/hub/products/${product.slug || product.id}`}
                className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                {product.images?.[0]?.url && (
                  <img
                    src={product.images[0].url}
                    alt={product.title}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                )}
                <p className="mt-2 font-bold text-sm text-gray-900 line-clamp-2">{product.title}</p>
                <p className="mt-1 font-black text-[#16C784] text-sm">{Number(product.price).toFixed(3)} {currency}</p>
              </a>
            ))}
          </div>
        </div>
      </noscript>
    );
  }
  ```

- [ ] **Step 2 — Render the static grid inside the hub page return**  
  ```tsx
  return (
    <div className={...}>
      <HubNavbar ... />
      {/* Static fallback — only visible when JS is disabled */}
      <StaticProductGrid
        products={trendingProducts}
        currency={marketplaceSettings.default_currency || 'TND'}
      />
      {/* JS-rendered content — hidden when JS is disabled */}
      <SponsoredAdsRail ... />
      {homeContent}
      ...
    </div>
  );
  ```

  > **Note:** `<noscript>` tags are ignored by browsers with JS enabled.  
  > They are only rendered to browsers/crawlers with JS disabled.

### Part 2 — Ensure SSR output includes initial HTML

- [ ] **Step 3 — Audit which parts of `HubHomeContent` require `useState`**  
  The hero slides carousel and block ordering use `useState`/`useMemo`. Consider extracting the static parts (categories grid, deals spotlight) into server components and keeping only the interactive parts (carousel, infinite scroll) as client components.

- [ ] **Step 4 — Test with JS disabled**  
  In Chrome DevTools → Settings → Preferences → Debugger → Disable JavaScript.  
  Visit `/hub` → the `<noscript>` product grid should be visible.

- [ ] **Step 5 — Test with Googlebot simulation**  
  Use Google Search Console → URL Inspection → "Test Live URL" to see what Googlebot renders.

- [ ] **Step 6 — Commit**  
  ```
  git add frontend/src/app/hub/page.tsx
  git commit -m "feat(hub): add noscript static product grid fallback for JS-disabled crawlers and users"
  ```

---

## Acceptance Criteria
- With JavaScript disabled, the hub homepage shows a basic product grid.
- Google Search Console shows product content in the rendered HTML.
- No visual change for JavaScript-enabled users.
