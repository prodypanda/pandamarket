# Engineering Specification: PLAN-P0-04
## Prevent Custom Domain Hijacking & Validate DNS Verification for TLS

- **Target Bug:** [P0-4](../../02-BUGS-AND-PROBLEMS/P0-CRITICAL/P0-04-DOMAIN-TLS-HIJACKING.md)
- **Severity:** 🔴 P0 (TLS Hijacking / Domain Spoofing)
- **Estimated Effort:** 🛠 2 hours
- **Impacted Systems:** Domain Verification Service, Store Route, Internal TLS Allowed Route, Subscription Service.

---

### 1. Summary & Business Impact
In `domain-verification.service.ts:45`, a mock bypass string `token.startsWith('pd-verify-')` allows any seller to mark a custom domain as verified without executing a DNS TXT query. Furthermore, `PUT /me/domain` does not verify that the seller's subscription plan has `has_custom_domain` enabled. 
Any seller on a Free tier can bind an arbitrary domain (e.g. `google.tn` or a competitor's domain) and trigger automated TLS certificate generation through the Caddy edge server via `/internal/tls-allowed`.

---

### 2. Root Cause & Blast Radius
- **Root Cause:**
  - `backend/src/services/domain-verification.service.ts:45`: Development mock bypass left enabled in production code path.
  - `backend/src/api/store.route.ts:1140`: Returns raw verification token in the response, enabling immediate self-verification.
  - `backend/src/api/store.route.ts:1145`: Omits subscription plan limit assertion `has_custom_domain`.
- **Blast Radius:** Reputational damage, TLS certificate abuse, arbitrary domain takeover on the platform.

---

### 3. Proposed Changes & Exact Diffs

#### A. Modify `backend/src/services/domain-verification.service.ts`
```diff
--- a/backend/src/services/domain-verification.service.ts
+++ b/backend/src/services/domain-verification.service.ts
@@ -42,9 +42,6 @@ export class DomainVerificationService {
   async verifyDnsTxtRecord(domain: string, expectedToken: string): Promise<boolean> {
-    if (expectedToken.startsWith('pd-verify-') && config.env !== 'production') {
-      return true;
-    }
     try {
       const records = await dns.promises.resolveTxt(`_pandamarket-challenge.${domain}`);
       const flat = records.flat();
```

#### B. Enforce Plan Limits in `backend/src/api/store.route.ts`
```diff
--- a/backend/src/api/store.route.ts
+++ b/backend/src/api/store.route.ts
@@ -1140,6 +1140,10 @@ router.put(
   '/me/domain',
   requireAuth,
   requireStore,
+  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
+    await subscriptionService.assertLimit(req.user!.store_id!, 'has_custom_domain');
+    next();
+  }),
   validate(updateDomainSchema),
   asyncHandler(async (req: Request, res: Response) => {
     // Require existing verified domain record in pd_store_domain
```

---

### 4. Concurrency, Security & Edge Cases
- **DNS Propagation Latency:** The verification endpoint must return specific TXT instructions (`_pandamarket-challenge.<domain>` with value `pd-verify-<hash>`).
- **Domain Squatting:** Ensure unique index on `pd_store_domain.domain` prevents two merchants from claiming the same domain.

---

### 5. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/domain-verification.test.ts
```

---

### 6. Manual Verification Procedure
1. Attempt to add a custom domain from a Free store:
```bash
curl -i -X PUT http://localhost:9000/api/pd/me/domain \
  -H "Authorization: Bearer $FREE_SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"custom_domain":"mybrand.com"}'
```
*Expected Output:* `HTTP 403 Forbidden` (`FEATURE_LOCKED: Plan upgrade required for custom domains`).

---

### 7. Rollback Strategy
Revert commit on failure:
```bash
git checkout HEAD -- backend/src/services/domain-verification.service.ts backend/src/api/store.route.ts
```
