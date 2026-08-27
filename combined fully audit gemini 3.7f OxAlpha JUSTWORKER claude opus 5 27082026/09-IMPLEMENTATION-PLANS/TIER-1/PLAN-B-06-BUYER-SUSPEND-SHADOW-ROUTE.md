# Engineering Specification: PLAN-B-06
## Delete Duplicate Shadowed Buyer Suspension Route in `reports.routes.ts`

- **Target Bug:** [B-06](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-06-TO-B-10-CORE-FLOWS.md#b-06)
- **Severity:** 🟠 P1 (Security-Relevant / Session Revocation Bypass)
- **Estimated Effort:** ⚡ 15 minutes
- **Impacted Systems:** Admin Reports Router, Admin Vendors Router, Buyer Account Security.

---

### 1. Summary & Business Impact
`PUT /admin/buyers/:id/suspend` and `/reactivate` are defined in both `reports.routes.ts:185` and `vendors.routes.ts:164`. Because `admin.route.ts` mounts `reportsRoutes` at line 40 before `vendorsRoutes` at line 42, Express resolves all buyer suspensions to the version in `reports.routes.ts`. The reports version only updates the database row but **does not call `authService.logout(id)`**, while the vendors version does. Consequently, suspended buyers retain active 15-minute JWT access tokens and can continue placing orders or posting reviews until natural token expiration.

---

### 2. Proposed Changes & Exact Diffs

#### Modify `backend/src/api/admin/reports.routes.ts`
Remove lines 183 to 225:
```diff
--- a/backend/src/api/admin/reports.routes.ts
+++ b/backend/src/api/admin/reports.routes.ts
@@ -182,45 +182,4 @@ router.get('/metrics', requireAuth, requireAdmin, asyncHandler(async (req, res)
-router.put(
-  '/buyers/:id/suspend',
-  requireAuth,
-  requireAdmin,
-  asyncHandler(async (req: Request, res: Response) => {
-    const { id } = req.params;
-    await query('UPDATE pd_user SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
-    res.json({ message: 'Buyer suspended successfully' });
-  })
-);
-
-router.put(
-  '/buyers/:id/reactivate',
-  requireAuth,
-  requireAdmin,
-  asyncHandler(async (req: Request, res: Response) => {
-    const { id } = req.params;
-    await query('UPDATE pd_user SET is_active = true, updated_at = NOW() WHERE id = $1', [id]);
-    res.json({ message: 'Buyer reactivated successfully' });
-  })
-);
```

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/admin-routes.test.ts
```

---

### 4. Manual Verification Procedure
Suspend a test buyer account via `PUT /api/pd/admin/buyers/:id/suspend`. Verify in Redis that session tokens are revoked and that the buyer's subsequent authenticated API requests return `401 Unauthorized`.
