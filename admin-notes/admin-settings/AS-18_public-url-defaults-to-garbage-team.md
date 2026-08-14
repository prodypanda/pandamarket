# AS-18 — `marketplace_public_url` Defaults to a Development Domain

**Severity:** 🔴 Bug  
**Area:** Superadmin Settings — Marketplace Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 245  
**Impact:** `DEFAULT_SETTINGS.marketplace_public_url` is set to `'https://garbage.team'` — the Vercel preview/test domain used during development. If an operator deploys PandaMarket without explicitly setting this field, every email template, OG canonical URL, vendor invitation link, and sharing URL will point to `https://garbage.team` instead of their real domain. This is a production-breaking default.

---

## Root Cause

```ts
// settings/page.tsx:245
const DEFAULT_SETTINGS: PlatformSettings = {
  // ...
  marketplace_public_url: 'https://garbage.team',   // ← dev artifact, must not ship as default
```

---

## Fix Checklist

- [x] **Step 1 — Change the default to production domain or safe empty value**  
- [x] **Step 2 — Add prominent configuration warning on the field**  
- [x] **Step 3 — Add a URL format normalizer and trailing slash sanitizer**  
- [x] **Step 4 — Clean up hardcoded references to dev preview domain**  
- [x] **Step 5 — Search for other hardcoded dev domains in DEFAULT_SETTINGS**  
- [x] **Step 6 — Test**  
- [x] **Step 7 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "fix(admin/settings): change marketplace_public_url default, add required-field warnings"
  ```

---

## Acceptance Criteria
- `DEFAULT_SETTINGS.marketplace_public_url` is `''` (empty string).
- The field shows a red border and warning when empty.
- A "garbage.team" value triggers an amber "dev domain" warning.
- An "Initial Setup Required" banner appears when critical fields are unconfigured.
