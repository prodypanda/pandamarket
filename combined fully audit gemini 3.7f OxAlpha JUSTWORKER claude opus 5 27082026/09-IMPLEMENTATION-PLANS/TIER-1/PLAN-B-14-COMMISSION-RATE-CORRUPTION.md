# Engineering Specification: PLAN-B-14
## Eliminate Commission Rate Fraction vs Percentage Mathematical Ambiguity

- **Target Bug:** [B-14](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-11-TO-B-16-COMMERCE-GAPS.md#b-14)
- **Severity:** 🟠 P1 (Financial Corruption on Low Commission Rates)
- **Estimated Effort:** ⚡ 30 minutes
- **Impacted Systems:** Admin Stats Route, Plan Service, Commission Calculations.

---

### 1. Summary & Business Impact
In `backend/src/api/admin/stats.routes.ts:104-107`:
```ts
const commissionRate = Number(req.body.commission_rate) > 1
  ? Number(req.body.commission_rate) / 100
  : Number(req.body.commission_rate);
```
If an admin sets a promotional commission of `1%`, `Number(1) > 1` is false, so it stores `1` (**100% commission**). If they set `0.5%`, it stores `0.5` (**50% commission**).

---

### 2. Proposed Changes & Exact Diffs

#### Modify `backend/src/api/admin/stats.routes.ts`
```diff
--- a/backend/src/api/admin/stats.routes.ts
+++ b/backend/src/api/admin/stats.routes.ts
@@ -103,7 +103,3 @@ router.post('/plans', requireAuth, requireSuperAdmin, asyncHandler(async (req, res
-    const commissionRate = Number(req.body.commission_rate) > 1
-      ? Number(req.body.commission_rate) / 100
-      : Number(req.body.commission_rate);
+    // Wire format is explicitly percentage (0-100), stored as fraction (0.00-1.00)
+    const commissionRate = Math.max(0, Math.min(100, Number(req.body.commission_rate))) / 100;
```

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/commission-rates.test.ts
```
