# Engineering Specification: PLAN-B-15
## Add Missing Mandat Bank Keys to Finance Settings Section & Admin UI

- **Target Bug:** [B-15](../../02-BUGS-AND-PROBLEMS/P1-HIGH/B-11-TO-B-16-COMMERCE-GAPS.md#b-15)
- **Severity:** 🟠 P1 (Placeholder Bank Details Served to Customers)
- **Estimated Effort:** ⚡ 30 minutes
- **Impacted Systems:** Platform Config Service, Admin Finance Settings Tab, Storefront Checkout.

---

### 1. Summary & Business Impact
Four configuration keys (`mandat_bank_name`, `mandat_bank_rib`, `mandat_bank_iban`, `mandat_recipient_phone`) are defined in `config.defaults.ts` with dummy strings (`'10 000 0000000000000 00'`, `'STB'`). However, they belong to no section in `PLATFORM_SETTING_SECTION_KEYS`. The admin panel cannot view or edit them, so live buyers paying by Mandat Minute are shown fake placeholder postal bank coordinates.

---

### 2. Proposed Changes & Exact Diffs

#### A. Add to `PLATFORM_SETTING_SECTION_KEYS.finance` in `platform-config.service.ts`
```diff
--- a/backend/src/services/platform-config.service.ts
+++ b/backend/src/services/platform-config.service.ts
@@ -45,6 +45,10 @@ export const PLATFORM_SETTING_SECTION_KEYS = {
     'mandat_recipient_name',
     'mandat_recipient_cin',
+    'mandat_bank_name',
+    'mandat_bank_rib',
+    'mandat_bank_iban',
+    'mandat_recipient_phone',
```

#### B. Render Fields in `frontend/src/app/(admin)/settings/page.tsx`
Add input fields for RIB, IBAN, Bank Name, and Recipient Phone in the Finance Tab under "Instructions Mandat".

---

### 3. Automated Verification Plan
```bash
npm run test -w backend -- src/__tests__/platform-config.test.ts
```
