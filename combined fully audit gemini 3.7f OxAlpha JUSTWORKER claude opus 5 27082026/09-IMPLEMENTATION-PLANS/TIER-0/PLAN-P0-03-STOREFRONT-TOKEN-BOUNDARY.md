# Engineering Specification: PLAN-P0-03
## Enforce Storefront Customer Token Isolation & Tenant Boundary Protection

- **Target Bug:** [P0-3](../../02-BUGS-AND-PROBLEMS/P0-CRITICAL/P0-03-STOREFRONT-TOKEN-BOUNDARY.md)
- **Severity:** 🔴 P0 (Tenant Boundary Violation / Unauthorized Store Access)
- **Estimated Effort:** 🛠 2.5 hours
- **Impacted Systems:** Storefront Authentication Service, JWT Utility, Auth Middleware, Socket Gateway.

---

### 1. Summary & Business Impact
Storefront customers register on an individual vendor's store (e.g. `sarra-boutique.pandamarket.tn`). In `storefront-auth.service.ts:586`, the access token is generated via `signAccessToken({ sub: customer.id, role: UserRole.Customer, store_id: customer.store_id })`.
Because this token uses the generic marketplace format and carries `store_id`, marketplace `requireAuth` treats the storefront customer as an authenticated marketplace user with that `store_id`. Consequently:
1. Storefront customers can access internal vendor file branches.
2. In `socket.gateway.ts`, the socket joins the store's private broadcast room, intercepting internal vendor notifications.

---

### 2. Root Cause & Blast Radius
- **Root Cause:**
  - In `backend/src/services/storefront-auth.service.ts:586`, tokens are minted without a distinguishing `token_type`.
  - In `backend/src/middlewares/index.ts:83`, `requireAuth` does not check `token_type`, allowing storefront customers into hub seller routes.
  - In `backend/src/gateways/socket.gateway.ts`, rooms are joined using `socket.data.user.store_id` without verifying that `user.id` actually owns the store in `pd_store`.
- **Blast Radius:** Critical cross-tenant boundary breach. Any customer can eavesdrop on store notifications and access store endpoints.

---

### 3. Proposed Changes & Exact Diffs

#### A. Modify `backend/src/services/storefront-auth.service.ts`
```diff
--- a/backend/src/services/storefront-auth.service.ts
+++ b/backend/src/services/storefront-auth.service.ts
@@ -583,9 +583,11 @@ export class StorefrontAuthService {
 
   issueAccessToken(customer: PublicStorefrontCustomer): string {
-    return signAccessToken({
+    return jwt.sign({
       sub: customer.id,
-      role: UserRole.Customer,
+      role: 'storefront_customer',
+      token_type: 'storefront_customer',
       store_id: customer.store_id,
-    });
+    }, config.jwtSecret, { expiresIn: '15m' });
   }
 }
```

#### B. Modify `backend/src/middlewares/index.ts`
```diff
--- a/backend/src/middlewares/index.ts
+++ b/backend/src/middlewares/index.ts
@@ -83,6 +83,11 @@ export const requireAuth = asyncHandler(async (req: Request, res: Response, next
     throw new PdAuthenticationError(PdErrorCode.AUTH_UNAUTHORIZED, 'Authentication required');
   }
 
+  // Reject storefront customer tokens attempting to access marketplace routes
+  if ((decoded as any).token_type === 'storefront_customer' || (decoded as any).role === 'storefront_customer') {
+    throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Storefront customer token cannot access marketplace APIs');
+  }
+
   req.user = decoded;
   next();
 });
@@ -120,6 +125,10 @@ export const requireStorefrontCustomer = asyncHandler(async (req: Request, res:
   if (!decoded || (decoded as any).token_type !== 'storefront_customer') {
     throw new PdAuthenticationError(PdErrorCode.AUTH_UNAUTHORIZED, 'Valid storefront customer token required');
   }
```

#### C. Modify `backend/src/gateways/socket.gateway.ts`
```diff
--- a/backend/src/gateways/socket.gateway.ts
+++ b/backend/src/gateways/socket.gateway.ts
@@ -85,12 +85,22 @@ export function setupSocketIO(server: http.Server): SocketGateway {
     if (user.store_id) {
-      socket.join(`store:${user.store_id}`);
+      // Assert user is genuinely the owner or authorized staff of the store
+      const { rows } = await query(
+        `SELECT id FROM pd_store WHERE id = $1 AND owner_id = $2`,
+        [user.store_id, user.id]
+      );
+      if (rows.length > 0) {
+        socket.join(`store:${user.store_id}`);
+      } else {
+        logger.warn({ userId: user.id, storeId: user.store_id }, '[Socket] Unauthorized store room join attempt blocked');
+      }
     }
```

---

### 4. Concurrency, Security & Edge Cases
- **Token Type Isolation:** Tokens minted for the marketplace have no `token_type` (or `token_type: 'marketplace_user'`); storefront customer tokens strictly have `token_type: 'storefront_customer'`.
- **Storefront Context Verification:** On storefront customer routes, verify that `decoded.store_id` matches the store host being queried.

---

### 5. Automated Verification Plan
Run auth middleware tests:
```bash
npm run test -w backend -- src/__tests__/auth-middleware.test.ts
```

---

### 6. Manual Verification Procedure
1. Obtain a storefront customer token by logging into a storefront:
```bash
SF_TOKEN=$(curl -s -X POST http://localhost:9000/api/pd/storefront/auth/login \
  -H "Content-Type: application/json" \
  -d '{"store_id":"pd_store_123","email":"customer@test.com","password":"Password123!"}' | jq -r '.data.access_token')
```
2. Attempt to hit a vendor endpoint with this token:
```bash
curl -i -X GET http://localhost:9000/api/pd/me/store \
  -H "Authorization: Bearer $SF_TOKEN"
```
*Expected Output:* `HTTP 403 Forbidden` (`PERM_FORBIDDEN: Storefront customer token cannot access marketplace APIs`).

---

### 7. Rollback Strategy
Revert commit on failure:
```bash
git checkout HEAD -- backend/src/services/storefront-auth.service.ts backend/src/middlewares/index.ts backend/src/gateways/socket.gateway.ts
```
