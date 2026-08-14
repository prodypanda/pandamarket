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

- [x] **Step 1 — Add an `Organization` JSON-LD script to the hub page**  
- [x] **Step 2 — Build an `ItemList` schema from `trendingProducts`**  
- [x] **Step 3 — Add JSON-LD script tags to the page return**  
- [x] **Step 4 — Add `alternates.canonical` to the metadata**  
- [x] **Step 5 — Validate with Google's Rich Results Test**  
- [x] **Step 6 — Add `breadcrumb` schema for inner pages (separate task)**  
- [x] **Step 7 — Commit**  
  ```
  git add frontend/src/app/hub/page.tsx
  git commit -m "feat(hub): add Organization and ItemList JSON-LD structured data to hub homepage"
  ```

---

## Acceptance Criteria
- Hub homepage HTML contains `<script type="application/ld+json">` with Organization and ItemList schemas.
- Google Rich Results Test passes with no errors.
- The canonical URL points to the correct production domain.
