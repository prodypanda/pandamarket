# Engineering Specification: PLAN-B-20
## Secure Public `/metrics` Endpoint & Remove `store_id` Oracle from `/internal/tls-allowed`

- **Target Bug:** [B-20](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-17-TO-B-21-SECURITY-INFRA.md#b-20)
- **Severity:** 🟠 P1 (Public Information Disclosure & Domain Enumeration Oracle)
- **Estimated Effort:** ⚡ 45 minutes
- **Impacted Systems:** Prometheus Metrics Endpoint, Internal TLS Allowed Route, Caddy Edge Server.

---

### 1. Summary & Business Impact
1. `GET /metrics` is mounted on the public `app` before authentication or rate limiting. Any external scraper can pull 106 KB of internal latency metrics, business KPIs (registered users, payment counts), and memory stats.
2. `GET /api/pd/internal/tls-allowed?domain=...` is public on `apiRouter` and returns `{"allowed":true, "store_id":"..."}`, exposing internal merchant IDs and acting as a domain enumeration oracle.

---

### 2. Proposed Changes & Exact Diffs

#### A. Secure `/metrics` in `backend/src/main.ts`
```diff
--- a/backend/src/main.ts
+++ b/backend/src/main.ts
@@ -148,4 +148,8 @@ app.use(express.json({ limit: '10mb' }));
-app.get('/metrics', asyncHandler(async (_req, res) => {
+app.get('/metrics', asyncHandler(async (req, res) => {
+  const authHeader = req.headers['authorization'];
+  if (!config.metricsSecret || authHeader !== `Bearer ${config.metricsSecret}`) {
+    return res.status(401).json({ error: 'Unauthorized metrics access' });
+  }
   res.setHeader('Content-Type', 'text/plain');
   res.send(await getMetrics());
 }));
```

#### B. Drop `store_id` in `backend/src/api/internal.route.ts`
```diff
--- a/backend/src/api/internal.route.ts
+++ b/backend/src/api/internal.route.ts
@@ -40,3 +40,3 @@ router.get('/tls-allowed', asyncHandler(async (req, res) => {
-    return res.json({ allowed: true, store_id: store.id });
+    return res.json({ allowed: true });
```

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/internal-routes.test.ts
```
