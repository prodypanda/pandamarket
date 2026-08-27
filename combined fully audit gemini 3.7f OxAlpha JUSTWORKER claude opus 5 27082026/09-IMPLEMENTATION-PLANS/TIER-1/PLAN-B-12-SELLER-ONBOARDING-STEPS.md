# Engineering Specification: PLAN-B-12
## Repair Three Broken Seller Onboarding Steps & Harmonize KYC Status Logic

- **Target Bug:** [B-12](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-11-TO-B-16-COMMERCE-GAPS.md#b-12)
- **Severity:** 🟠 P1 (Merchant Onboarding Blocked / Cannot Launch Store)
- **Estimated Effort:** 🛠 2 hours
- **Impacted Systems:** Seller Onboarding Wizard, File Upload Validator, Store Settings.

---

### 1. Summary & Business Impact
In `frontend/src/app/hub/dashboard/onboarding/page.tsx`, 3 of 7 onboarding steps are impossible to complete:
1. **Branding Step (Logo):** Calls upload with `purpose: 'store_logo'`. The backend schema `presignUploadSchema.purpose` only accepts `store_asset`, causing **HTTP 400** on every logo upload.
2. **Shipping Step:** PUTs to `/stores/me/shipping` with `{ shipping_flat_fee }`. The backend schema requires `shipping_mode`, causing **HTTP 400**.
3. **Publish Step:** Checks `store.status === 'published'`. In the database enum, valid statuses are `unverified | verified | suspended | maintenance`. The button always says "🔴 Offline / Private" and can never switch to online.
4. **KYC Verification:** Marked complete on submission instead of admin approval.

---

### 2. Proposed Changes & Exact Diffs

#### A. Fix Logo Upload Purpose
```diff
--- a/frontend/src/app/hub/dashboard/onboarding/page.tsx
+++ b/frontend/src/app/hub/dashboard/onboarding/page.tsx
@@ -881,3 +881,3 @@ export default function OnboardingPage() {
-      const res = await handleFileUpload(file, 'store_logo');
+      const res = await handleFileUpload(file, 'store_asset', 'branding');
```

#### B. Fix Shipping Settings Save
```diff
@@ -439,5 +439,5 @@ export default function OnboardingPage() {
-      await fetchWithCsrf('/api/pd/stores/me/shipping', {
-        method: 'PUT',
-        body: JSON.stringify({ shipping_flat_fee: fee }),
+      await fetchWithCsrf('/api/pd/me/settings', {
+        method: 'PUT',
+        body: JSON.stringify({ settings: { shipping_flat_fee: fee } }),
       });
```

#### C. Fix Publish Status Check
```diff
@@ -648,3 +648,3 @@ export default function OnboardingPage() {
-      const isOnline = store?.status === 'published';
+      const isOnline = store?.status === 'verified' && store?.is_verified;
```

---

### 3. Automated Verification Plan
```bash
npm run test -w frontend -- src/__tests__/seller-onboarding.test.tsx
```
