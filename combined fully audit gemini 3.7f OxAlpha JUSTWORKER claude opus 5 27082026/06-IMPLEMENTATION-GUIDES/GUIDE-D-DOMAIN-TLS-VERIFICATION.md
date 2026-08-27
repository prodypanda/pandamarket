## Guide D · Custom Domain Verification & TLS Hijack Fix (P0-4)
**Files:** `backend/src/services/domain-verification.service.ts`, `backend/src/api/store.route.ts`

1. In `backend/src/api/store.route.ts`: Remove `mock_token` branch; do not return raw verification token in API responses.
2. In `backend/src/services/domain-verification.service.ts`: Remove `startsWith('pd-verify-')` bypass.
3. In `PUT /me/domain`: Require verified row in `pd_store_domain` and verify `subscriptionService.assertLimit(storeId, 'has_custom_domain')`.

---
