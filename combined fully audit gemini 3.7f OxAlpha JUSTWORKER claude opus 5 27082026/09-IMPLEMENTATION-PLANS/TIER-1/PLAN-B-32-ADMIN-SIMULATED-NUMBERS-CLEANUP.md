# Engineering Specification: PLAN-B-32
## Replace Hardcoded Simulated Metrics & Demo Catalogs with Real Analytics

- **Target Bug:** [B-32](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-27-TO-B-33-FRONTEND-DATA.md#b-32)
- **Severity:** 🟠 P1 (Operator Misinformation / Fake Data in Production Admin)
- **Estimated Effort:** 🛠 3 hours
- **Impacted Systems:** Platform Analytics Intelligence Tab, Subscription Radar.

---

### 1. Summary & Business Impact
Several admin screens render hardcoded demo data:
1. `IntelligenceTab.tsx:99` hardcodes `baselineMonthlyGmv = 145000`, `baselineTakeRate = 8.5`.
2. `analytics.service.ts:4230` computes cohorts via pure mathematical exponential formula (`100 * 0.75^idx`).
3. `subscription-lifecycle.routes.ts` injects a 16-item `MOCK_CATALOG` when database rows are low.

---

### 2. Proposed Changes & Exact Diffs
1. Source simulator baseline GMV and take rate directly from `analyticsService.getGlobalOverview`.
2. Delete `MOCK_CATALOG` or gate strictly behind `?demo=true`.
3. Compute genuine user retention cohorts from `pd_order` purchase dates.

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/analytics-service.test.ts
```
