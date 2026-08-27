# P0-06 · SETTINGS-SUPERADMIN-BYPASS

### P0-6 · PUT /admin/settings Bypasses SuperAdmin Guard
- **Files:** `backend/src/api/admin/settings.routes.ts:38`, `backend/src/services/platform-config.service.ts`
- **Evidence:** Legacy flat route accepts raw settings with no section ACL checks.
- **Root Cause:** Route missing section-level middleware enforcement.
- **Fix Guide:** See [Guide F](../../06-IMPLEMENTATION-GUIDES/GUIDE-F-SETTINGS-SECURITY-GUARD.md).
