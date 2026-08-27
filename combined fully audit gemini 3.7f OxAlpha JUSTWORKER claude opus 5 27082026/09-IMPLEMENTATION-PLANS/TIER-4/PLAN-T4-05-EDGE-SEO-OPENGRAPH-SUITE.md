# Engineering Specification: PLAN-T4-05
## Dynamic Edge OpenGraph Social Cards & Automated XML Sitemaps

- **Target Task:** [T4-05](../../00-MASTER-CHECKLIST/TIER-4-GROWTH-ROADMAP.md)
- **Severity:** 💡 Organic Traffic & Social Sharing Conversion
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Edge OG Image Generator, Sitemap Route, Product SSR.

---

### 1. Summary & Business Impact
Sharing product links on Facebook, Instagram, and WhatsApp currently displays generic marketplace previews or broken images. Dynamic Edge OpenGraph generation renders high-impact social share cards displaying the product image, merchant logo, price in TND, and promotional badges directly into the link preview image.

---

### 2. Implementation Details
1. Edge runtime route: `frontend/src/app/api/og/product/route.tsx` using `@vercel/og`.
2. Dynamically renders 1200x630 branded card with product photography and price.
3. Automated multi-tenant XML sitemaps at `/sitemap.xml` indexing all verified products and stores.

---

### 3. Verification Plan
```bash
npm run test -w frontend -- src/__tests__/edge-og.test.tsx
```
