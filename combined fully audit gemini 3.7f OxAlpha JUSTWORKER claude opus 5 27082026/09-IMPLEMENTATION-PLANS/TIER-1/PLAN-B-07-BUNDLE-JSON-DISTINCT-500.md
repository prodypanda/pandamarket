# Engineering Specification: PLAN-B-07
## Fix `SELECT DISTINCT` Over `json` Column in Bundle Cross-Sell Widget

- **Target Bug:** [B-07](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-06-TO-B-10-CORE-FLOWS.md#b-07)
- **Severity:** 🟠 P1 (Live 500 Internal Server Error / 173 System Log Errors)
- **Estimated Effort:** ⚡ 15 minutes
- **Impacted Systems:** Product Service, Bundle Cross-Promotion Widget, PDP Page.

---

### 1. Summary & Business Impact
In `backend/src/services/product.service.ts:2276-2287` (`getBundlesContainingProduct`), the SQL query selects `DISTINCT p.id, ..., COALESCE(img.images, '[]'::json) AS images`. PostgreSQL cannot compare the `json` data type for equality in `DISTINCT` clauses, causing immediate `500 Internal Server Error` with message:
`could not identify an equality operator for type json`
This has occurred **173 times** in production (`pd_system_log`), crashing the cross-sell bundle widget on every product page where a product participates in a bundle.

---

### 2. Proposed Changes & Exact Diffs

#### Modify `backend/src/services/product.service.ts`
```diff
--- a/backend/src/services/product.service.ts
+++ b/backend/src/services/product.service.ts
@@ -2276,8 +2276,8 @@ export class ProductService {
     const { rows } = await query(
-      `SELECT DISTINCT p.id, p.title, p.slug, p.price, p.compare_at_price,
+      `SELECT p.id, p.title, p.slug, p.price, p.compare_at_price,
               p.tags, p.attributes, p.metadata, p.store_id,
-              COALESCE(img.images, '[]'::json) AS images
+              COALESCE(img.images, '[]'::jsonb) AS images
        FROM pd_product p
        JOIN pd_bundle_item bi ON bi.bundle_id = p.id
        LEFT JOIN LATERAL (...) img ON true
        WHERE bi.product_id = $1 AND p.status = 'published'
+       GROUP BY p.id, img.images`,
       [productId]
     );
```

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/product-bundles.test.ts
```

---

### 4. Manual Verification Procedure
Hit the live bundle endpoint for a bundle-participating product:
```bash
curl -i "http://localhost:9000/api/pd/products/by-product/pd_prod_ZuQyAJ6CBfQTW5rZ/bundles"
```
*Expected Output:* `HTTP 200 OK` with JSON bundle array (no 500 error).
