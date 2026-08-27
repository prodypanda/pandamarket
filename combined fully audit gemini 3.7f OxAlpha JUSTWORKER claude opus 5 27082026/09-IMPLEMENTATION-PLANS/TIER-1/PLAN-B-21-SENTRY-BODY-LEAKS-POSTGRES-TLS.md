# Engineering Specification: PLAN-B-21
## Scrub Sentry Request Payloads & Pin Supabase PostgreSQL TLS Certificate

- **Target Bug:** [B-21](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-17-TO-B-21-SECURITY-INFRA.md#b-21)
- **Severity:** 🟠 P1 (PII/Secret Leak to Sentry & Unvalidated Database TLS)
- **Estimated Effort:** 🛠 1 hour
- **Impacted Systems:** Sentry SDK Integration, Database Pooler Connection.

---

### 1. Summary & Business Impact
1. `backend/src/utils/sentry.ts` attaches request bodies to error reports. A 500 error on login or settings ships plaintext passwords or API keys to Sentry cloud.
2. `backend/src/db/pool.ts:18` sets `ssl: { rejectUnauthorized: false }`, leaving PostgreSQL connections vulnerable to man-in-the-middle attacks on public cloud routing.

---

### 2. Proposed Changes & Exact Diffs

#### A. Redact Sentry Bodies in `backend/src/utils/sentry.ts`
```diff
--- a/backend/src/utils/sentry.ts
+++ b/backend/src/utils/sentry.ts
@@ -58,4 +58,6 @@ Sentry.init({
   beforeSend(event) {
     if (event.request) {
       delete event.request.data;
       delete event.request.cookies;
     }
     return event;
   },
```

#### B. Pin Database TLS in `backend/src/db/pool.ts`
```diff
--- a/backend/src/db/pool.ts
+++ b/backend/src/db/pool.ts
@@ -16,3 +16,3 @@ export const pool = new Pool({
-  ssl: config.env === 'production' ? { rejectUnauthorized: false } : undefined,
+  ssl: config.env === 'production' ? { rejectUnauthorized: true, ca: config.db.caCert } : undefined,
```

---

### 3. Automated Verification Plan
```bash
npm run type-check -w backend
```
