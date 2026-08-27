# Engineering Specification: PLAN-B-26
## Route Storefront Customer 401 Refresh Requests to `/storefront/auth/refresh`

- **Target Bug:** [B-26](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-22-TO-B-26-WORKERS-AND-ADS.md#b-26)
- **Severity:** 🟠 P1 (Storefront Customers Logged Out Every 15 Minutes)
- **Estimated Effort:** 🛠 2 hours
- **Impacted Systems:** Frontend API Client (`lib/api.ts`), Storefront Auth Service.

---

### 1. Summary & Business Impact
In `frontend/src/lib/api.ts:107-113`, when `fetchWithCsrf` receives a 401, it attempts to refresh by calling `/api/pd/auth/refresh` (the marketplace hub endpoint). However, storefront customers hold a `pd_storefront_rt` cookie and must be refreshed via `/api/pd/storefront/auth/refresh`. Consequently, every storefront customer is kicked to login 15 minutes after authentication.

---

### 2. Proposed Changes & Exact Diffs

#### Modify `frontend/src/lib/api.ts`
```diff
--- a/frontend/src/lib/api.ts
+++ b/frontend/src/lib/api.ts
@@ -107,3 +107,7 @@ export async function fetchWithCsrf(url: string, options: RequestInit = {}) {
     if (res.status === 401) {
+      const isStorefront = url.includes('/api/pd/storefront/') || window.location.pathname.startsWith('/store/');
+      const refreshUrl = isStorefront ? '/api/pd/storefront/auth/refresh' : '/api/pd/auth/refresh';
-      const refreshRes = await fetch('/api/pd/auth/refresh', { method: 'POST' });
+      const refreshRes = await fetch(refreshUrl, { method: 'POST' });
       if (refreshRes.ok) {
```

---

### 3. Automated Verification Plan
```bash
npm run test -w frontend -- src/__tests__/token-refresh.test.ts
```
