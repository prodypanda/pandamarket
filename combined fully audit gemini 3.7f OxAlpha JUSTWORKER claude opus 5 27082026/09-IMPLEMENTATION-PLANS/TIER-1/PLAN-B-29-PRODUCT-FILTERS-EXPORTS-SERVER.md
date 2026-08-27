# Engineering Specification: PLAN-B-29
## Implement Server-Side Filtering, Pagination & CSV Exports

- **Target Bug:** [B-29](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-27-TO-B-33-FRONTEND-DATA.md#b-29)
- **Severity:** 🟠 P1 (Truncated Exports & False Metrics Shown to Sellers)
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Vendor Products Table, Orders Table, CSV Exporter.

---

### 1. Summary & Business Impact
In `products/page.tsx`, category and type filters are applied client-side to only the 20 products returned for page 1, while the pagination footer displays the total store count. Furthermore, clicking "Export All CSV" exports only the current 20 items on screen rather than the seller's catalog.

---

### 2. Proposed Changes & Exact Diffs
1. Push `category_id`, `type`, and `status` search parameters into `GET /api/pd/me/products`.
2. Add dedicated streaming CSV export endpoint: `GET /api/pd/me/products/export` that streams the full dataset using Postgres cursors.

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/product-export.test.ts
```
