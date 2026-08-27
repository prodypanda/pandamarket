# Engineering Specification: PLAN-B-25
## Add `isPublicStore` Guard to Storefront `/products` Catalog Pages

- **Target Bug:** [B-25](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-22-TO-B-26-WORKERS-AND-ADS.md#b-25)
- **Severity:** 🟠 P1 (Unverified/Private Stores Render Public Catalog)
- **Estimated Effort:** ⚡ 30 minutes
- **Impacted Systems:** Storefront Catalog SSR, Maintenance Mode Routing.

---

### 1. Summary & Business Impact
`frontend/src/app/store/[storeHost]/products/page.tsx:172` only checks if `status === 'suspended'`. It does not check `isPublicStore(store)`. 
Testing `https://sarra-boutique.garbage.team/products` returns HTTP 200 with full navigation and header for an unverified store.

---

### 2. Proposed Changes & Exact Diffs

#### Modify `frontend/src/app/store/[storeHost]/products/page.tsx`
```diff
--- a/frontend/src/app/store/[storeHost]/products/page.tsx
+++ b/frontend/src/app/store/[storeHost]/products/page.tsx
@@ -171,4 +171,4 @@ export default async function StoreProductsPage({ params }: Props) {
-  if (store.status === 'suspended') {
+  if (!isPublicStore(store)) {
     return <StorefrontMaintenancePage store={store} />;
   }
```

---

### 3. Automated Verification Plan
```bash
npm run test -w frontend -- src/__tests__/storefront-public-gate.test.tsx
```
