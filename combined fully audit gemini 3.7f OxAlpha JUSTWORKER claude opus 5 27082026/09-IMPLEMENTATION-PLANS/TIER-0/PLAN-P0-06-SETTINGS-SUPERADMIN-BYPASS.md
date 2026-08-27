# Engineering Specification: PLAN-P0-06
## Enforce SuperAdmin Guard on Platform Settings & Eliminate Route Bypass

- **Target Bug:** [P0-6](../../02-BUGS-AND-PROBLEMS/P0-CRITICAL/P0-06-SETTINGS-SUPERADMIN-BYPASS.md)
- **Severity:** 🔴 P0 (Privilege Escalation / Security & Financial Settings Bypass)
- **Estimated Effort:** 🛠 1.5 hours
- **Impacted Systems:** Platform Config Service, Admin Settings Router, Superadmin Command Center.

---

### 1. Summary & Business Impact
In `backend/src/api/admin/settings.routes.ts`, the granular route `PUT /admin/settings/:section` checks if `section === 'finance' || section === 'security'` and enforces `requireSuperAdmin`. 
However, the legacy endpoint `PUT /admin/settings` accepts a raw, flat settings object and directly invokes `platformConfigService.updateSettings` with **no section checks**. Any low-privileged admin user can update payout bank coordinates, encryption keys, and commission rates by posting to the legacy route.

---

### 2. Root Cause & Blast Radius
- **Root Cause:** Section ACLs were implemented at the HTTP routing level on one specific endpoint, but omitted from the underlying domain service `platformConfigService.updateSettings` and completely missing on the legacy `PUT /admin/settings` endpoint.
- **Blast Radius:** Critical privilege escalation. Plain admins can divert Mandat funds or modify marketplace commission rates without audit trail or SuperAdmin authorization.

---

### 3. Proposed Changes & Exact Diffs

#### A. Move Section ACLs to `backend/src/services/platform-config.service.ts`
```diff
--- a/backend/src/services/platform-config.service.ts
+++ b/backend/src/services/platform-config.service.ts
@@ -140,6 +140,15 @@ export class PlatformConfigService {
-  async updateSettings(settings: Record<string, unknown>, userId: string): Promise<void> {
+  async updateSettings(settings: Record<string, unknown>, user: { id: string; role: string }): Promise<void> {
+    const restrictedSections = ['finance', 'security'];
+    for (const key of Object.keys(settings)) {
+      const section = this.findSectionForKey(key);
+      if (restrictedSections.includes(section) && user.role !== 'super_admin') {
+        throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, `SuperAdmin privilege required to update ${section} settings`);
+      }
+    }
```

#### B. Deprecate / Secure Flat Route in `backend/src/api/admin/settings.routes.ts`
```diff
--- a/backend/src/api/admin/settings.routes.ts
+++ b/backend/src/api/admin/settings.routes.ts
@@ -35,11 +35,4 @@ router.put(
   '/settings',
   requireAuth,
-  requireAdmin,
+  requireSuperAdmin, // Enforce SuperAdmin on flat updates, or reject entirely
   validate(flatSettingsSchema),
   asyncHandler(async (req: Request, res: Response) => {
-    await platformConfigService.updateSettings(req.body, req.user!.id);
+    await platformConfigService.updateSettings(req.body, { id: req.user!.id, role: req.user!.role });
     res.json({ message: 'Settings updated successfully' });
   })
 );
```

---

### 4. Concurrency, Security & Edge Cases
- **Optimistic Concurrency:** `pd_platform_config.updated_at` must be verified during updates to prevent concurrent save overwrites (409 Conflict).
- **Audit Logging:** Every setting change must record the updated keys and actor ID to `pd_audit_log`.

---

### 5. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/settings-routes.test.ts
```

---

### 6. Manual Verification Procedure
1. Attempt to update `mandat_bank_rib` as a standard admin:
```bash
curl -i -X PUT http://localhost:9000/api/pd/admin/settings \
  -H "Authorization: Bearer $PLAIN_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mandat_bank_rib":"12345678901234567890"}'
```
*Expected Output:* `HTTP 403 Forbidden` (`PERM_FORBIDDEN: SuperAdmin privilege required`).

---

### 7. Rollback Strategy
Revert commit on failure:
```bash
git checkout HEAD -- backend/src/services/platform-config.service.ts backend/src/api/admin/settings.routes.ts
```
