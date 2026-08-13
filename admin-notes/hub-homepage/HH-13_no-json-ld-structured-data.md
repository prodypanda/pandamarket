# HH-13 — Missing JSON-LD Structured Data for Hub SEO

**Severity:** 🟡 Enhancement (SEO)  
**Area:** Hub Homepage — Metadata  
**File:** `frontend/src/app/hub/page.tsx`  
**Line:** 15–38 (`generateMetadata`)  
**Impact:** The hub homepage has basic OpenGraph tags but no JSON-LD structured data. Adding `ItemList` and `Organization` schemas would:
1. Enable Google rich results (product carousels in search)
2. Improve Google Shopping indexing
3. Add knowledge panel data for the marketplace brand

---

## Current State

```ts
// hub/page.tsx:27–37
return {
  title: `Hub — ${marketplaceName}`,
  description,
  openGraph: {
    title, description, type: 'website', url: '/hub',
    images: [{ url: ogImageUrl, width: 1200, height: 630, alt: ... }],
  },
};
// ← no JSON-LD, no structured data at all
```

---

## Enhancement Checklist

### Part 1 — Organization Schema

- [ ] **Step 1 — Add an `Organization` JSON-LD script to the hub page**  
  In `hub/page.tsx`, below `generateMetadata`, create a server component that injects a `<script type="application/ld+json">` tag:

  ```tsx
  // In the HubHomepage component return, add to <head> via Next.js Script or inline:
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": marketplaceName,
    "url": marketplaceSettings.marketplace_public_url || 'https://pandamarket.tn',
    "logo": ogImageUrl,
    "description": tagline,
    "contactPoint": {
      "@type": "ContactPoint",
      "email": marketplaceSettings.marketplace_support_email,
      "contactType": "customer support"
    }
  };
  ```

### Part 2 — ItemList Schema for Trending Products

- [ ] **Step 2 — Build an `ItemList` schema from `trendingProducts`**  
  ```tsx
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Trending Products on ${marketplaceName}`,
    "itemListElement": trendingProducts.slice(0, 10).map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${marketplaceSettings.marketplace_public_url}/hub/products/${product.slug || product.id}`,
      "name": product.title,
    })),
  };
  ```

### Part 3 — Inject the schemas

- [ ] **Step 3 — Add JSON-LD script tags to the page return**  
  Next.js App Router supports `<script>` tags in server components:
  ```tsx
  return (
    <div className={...}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <HubNavbar ... />
      {/* ... rest of page */}
    </div>
  );
  ```

- [ ] **Step 4 — Add `alternates.canonical` to the metadata**  
  ```ts
  return {
    title: ...,
    description,
    alternates: {
      canonical: `${marketplaceSettings.marketplace_public_url}/hub`,
    },
    openGraph: { ... },
  };
  ```

- [ ] **Step 5 — Validate with Google's Rich Results Test**  
  Visit https://search.google.com/test/rich-results and test the hub URL.  
  Fix any warnings reported by the validator.

- [ ] **Step 6 — Add `breadcrumb` schema for inner pages (separate task)**  
  This note covers only the homepage. A follow-up note should cover product/category pages.

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/app/hub/page.tsx
  git commit -m "feat(hub): add Organization and ItemList JSON-LD structured data to hub homepage"
  ```

---

## Acceptance Criteria
- Hub homepage HTML contains `<script type="application/ld+json">` with Organization and ItemList schemas.
- Google Rich Results Test passes with no errors.
- The canonical URL points to the correct production domain.
