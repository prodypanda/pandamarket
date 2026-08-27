# Engineering Specification: PLAN-P0-01
## Fix Backend TypeScript Compilation Failure & Rewards Lead Validator

- **Target Bug:** [P0-1](../../02-BUGS-AND-PROBLEMS/P0-CRITICAL/P0-01-BACKEND-BUILD-FAILURE.md)
- **Severity:** 🔴 P0 (Blocks Compilation & Deployment)
- **Estimated Effort:** ⚡ 15 minutes
- **Impacted Systems:** Express backend startup router, gamified lead capture API, frontend rewards widget.

---

### 1. Summary & Business Impact
An uncommitted local commit in `backend/src/main.ts` mounted `apiRouter.use('/retention', retentionRouter);` at line 345, but the developer omitted the import statement for `retentionRouter`. Running `npx tsc --noEmit -w backend` fails with `TS2304: Cannot find name 'retentionRouter'`. This breaks automated CI/CD builds on Render and GitHub Actions. Furthermore, `backend/src/api/retention.route.ts` defined `rewardsLeadSchema` and imported `validate`, but never applied them to the `POST /rewards-lead` handler. Finally, the consumer widget `GamifiedRewardsWidget.tsx` uses bare `fetch` which fails CSRF validation (403) in production.

---

### 2. Root Cause & Blast Radius
- **File 1:** `backend/src/main.ts:345`
  - *Cause:* Missing `import retentionRouter from './api/retention.route';`.
  - *Blast Radius:* Entire backend project fails TypeScript compilation; zero backend deployments possible.
- **File 2:** `backend/src/api/retention.route.ts:12,17,32`
  - *Cause:* `rewardsLeadSchema` and `validate` declared but unused (`TS6133`). Unvalidated payloads reach `cartService.recordGamifiedLead`.
  - *Blast Radius:* Potential SQL errors or uncaught exceptions on malformed lead input.
- **File 3:** `frontend/src/components/retention/GamifiedRewardsWidget.tsx:334`
  - *Cause:* Bare `fetch` instead of `fetchWithCsrf`. CSRF token cookie omitted.
  - *Blast Radius:* All customer scratch-card / spin-wheel submissions rejected with 403 Forbidden.

---

### 3. Proposed Changes & Exact Diffs

#### A. Modify `backend/src/main.ts`
```diff
--- a/backend/src/main.ts
+++ b/backend/src/main.ts
@@ -55,6 +55,7 @@ import sellerRoutes from './api/seller.route';
 import storeRoutes from './api/store.route';
 import internalRoutes from './api/internal.route';
 import searchRoutes from './api/search.route';
+import retentionRouter from './api/retention.route';
 import { setupSocketIO } from './gateways/socket.gateway';
 import { startWorkers } from './workers';
```

#### B. Modify `backend/src/api/retention.route.ts`
```diff
--- a/backend/src/api/retention.route.ts
+++ b/backend/src/api/retention.route.ts
@@ -30,6 +30,7 @@ const rewardsLeadSchema = z.object({
 
 router.post(
   '/rewards-lead',
+  validate(rewardsLeadSchema),
   asyncHandler(async (req: Request, res: Response) => {
     const result = await cartService.recordGamifiedLead({
       store_id: req.body.store_id,
```

#### C. Modify `frontend/src/components/retention/GamifiedRewardsWidget.tsx`
```diff
--- a/frontend/src/components/retention/GamifiedRewardsWidget.tsx
+++ b/frontend/src/components/retention/GamifiedRewardsWidget.tsx
@@ -10,6 +10,7 @@ import { useState } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { Gift, Sparkles, X, ChevronRight, Trophy } from 'lucide-react';
 import confetti from 'canvas-confetti';
+import { fetchWithCsrf } from '@/lib/api';
 
 interface GamifiedRewardsWidgetProps {
   storeId?: string;
@@ -331,10 +332,9 @@ export function GamifiedRewardsWidget({ storeId }: GamifiedRewardsWidgetProps) {
     setIsSubmitting(true);
     setError(null);
     try {
-      const res = await fetch('/api/pd/retention/rewards-lead', {
+      const res = await fetchWithCsrf('/api/pd/retention/rewards-lead', {
         method: 'POST',
-        headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           email: email.trim(),
           phone: phone.trim() || undefined,
```

---

### 4. Concurrency, Security & Edge Cases
- **Device Fingerprint Spam:** Ensure `device_fingerprint` in `rewardsLeadSchema` has a max length limit (`z.string().max(255).optional()`).
- **CSRF Token Freshness:** `fetchWithCsrf` automatically fetches `/api/pd/auth/csrf-token` if missing or expired.
- **Strict Validation:** Uncaught extra fields are stripped by Zod.

---

### 5. Automated Verification Plan
Run backend typecheck:
```bash
npm run type-check -w backend
```
*Expected Output:* `Found 0 errors. Watching for file changes.` or clean exit code 0.

Run frontend lint & typecheck:
```bash
npm run type-check -w frontend
```

---

### 6. Manual Verification Procedure
1. Boot backend locally or test against Render staging:
```bash
curl -i -X POST http://localhost:9000/api/pd/retention/rewards-lead \
  -H "Content-Type: application/json" \
  -d '{"email":"lead_test@pandamarket.tn","game_type":"scratch_card"}'
```
*Expected Output:* `HTTP 201 Created` with `{"data":{"id":"...","status":"recorded"}}`.

2. Test invalid schema:
```bash
curl -i -X POST http://localhost:9000/api/pd/retention/rewards-lead \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","game_type":123}'
```
*Expected Output:* `HTTP 400 Bad Request` with field validation errors.

---

### 7. Rollback Strategy
If issues arise, revert the commit:
```bash
git checkout HEAD -- backend/src/main.ts backend/src/api/retention.route.ts frontend/src/components/retention/GamifiedRewardsWidget.tsx
```
