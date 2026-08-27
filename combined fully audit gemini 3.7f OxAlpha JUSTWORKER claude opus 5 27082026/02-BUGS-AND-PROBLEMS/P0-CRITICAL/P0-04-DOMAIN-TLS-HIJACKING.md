# P0-04 · DOMAIN-TLS-HIJACKING

### P0-4 · Custom Domain Verification & TLS Hijacking
- **Files:** `backend/src/services/domain-verification.service.ts:45`, `backend/src/api/store.route.ts`
- **Evidence:** `startsWith('pd-verify-')` allows unverified domain hijacking and automated Caddy TLS certificate generation.
- **Root Cause:** Development bypass left in production path.
- **Fix Guide:** See [Guide D](../../06-IMPLEMENTATION-GUIDES/GUIDE-D-DOMAIN-TLS-VERIFICATION.md).
