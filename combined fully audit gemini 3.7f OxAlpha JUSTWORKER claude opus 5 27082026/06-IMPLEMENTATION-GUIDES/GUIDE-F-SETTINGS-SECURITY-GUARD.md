## Guide F · Secure `PUT /admin/settings` Route (P0-6)
**Files:** `backend/src/services/platform-config.service.ts`, `backend/src/api/admin/settings.routes.ts`

1. In `platform-config.service.ts`: Move section ACL checks directly into `updateSettings`.
2. In `settings.routes.ts`: Delete the deprecated flat `PUT /admin/settings` endpoint.

---
