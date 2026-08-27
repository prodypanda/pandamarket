# Engineering Specification: PLAN-P0-08
## Move `nodemailer` to Production Dependencies in `backend/package.json`

- **Target Bug:** [P0-8](../../02-BUGS-AND-PROBLEMS/P0-CRITICAL/P0-08-NODEMAILER-DEPENDENCY.md)
- **Severity:** 🔴 P0 (Production Worker Runtime Crash)
- **Estimated Effort:** ⚡ 15 minutes
- **Impacted Systems:** Email Worker, Background Jobs, Container Deployment.

---

### 1. Summary & Business Impact
In `backend/package.json:115`, the `nodemailer` package is listed under `devDependencies`. During Docker/Render production builds running `npm install --omit=dev`, `nodemailer` is skipped. When the background email worker (`email.worker.ts`) boots and attempts to initialize the SMTP transport, it throws `Error: Cannot find module 'nodemailer'`, crashing the background worker process.

---

### 2. Root Cause & Blast Radius
- **Root Cause:** Misclassification in `package.json` dependencies.
- **Blast Radius:** All background email jobs crash, halting password resets, order notifications, and KYC updates.

---

### 3. Proposed Changes & Exact Diffs

#### Execute in Terminal
```bash
npm install nodemailer -w backend --save-prod
```

#### Exact Diff in `backend/package.json`
```diff
--- a/backend/package.json
+++ b/backend/package.json
@@ -62,6 +62,7 @@
     "ioredis": "^5.4.1",
     "jsonwebtoken": "^9.0.2",
     "multer": "^1.4.5-lts.1",
+    "nodemailer": "^6.9.16",
     "pg": "^8.13.1",
     "sharp": "^0.33.5",
     "zod": "^3.23.8"
@@ -115,7 +116,6 @@
     "@types/node": "^22.10.1",
     "@types/nodemailer": "^6.4.17",
     "@types/pg": "^8.11.10",
-    "nodemailer": "^6.9.16",
     "typescript": "^5.7.2"
   }
```

---

### 4. Concurrency, Security & Edge Cases
- Ensure `@types/nodemailer` remains in `devDependencies`.
- Re-generate and verify lockfile integrity.

---

### 5. Automated Verification Plan
```bash
npm run type-check -w backend
```

---

### 6. Manual Verification Procedure
Simulate production install in a clean environment:
```bash
npm prune --omit=dev -w backend
node -e "require('nodemailer'); console.log('Nodemailer loads successfully in production mode!');"
```
*Expected Output:* `Nodemailer loads successfully in production mode!`.

---

### 7. Rollback Strategy
```bash
git checkout HEAD -- backend/package.json package-lock.json
```
