# AS-12 — Global Commission Rate Can Conflict With Per-Plan Rates Silently

**Severity:** 🟡 Enhancement  
**Area:** Superadmin Settings — Finance Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 766 (in `SETTINGS_TAB_KEYS.finance`)  
**Impact:** The Finance tab has a `platform_commission_rate` field (default: 15%) that sets a platform-wide commission. However, the subscription plans (7 tiers) also have their own commission rates (e.g. Free = 15%, all paid plans = 0%). When these conflict, it's unclear which takes priority. Admins can set the global rate to 10% while all paid plans are at 0%, creating an undefined behavior that may cause incorrect commission calculations.

---

## Enhancement Checklist

- [x] **Step 1 — Understand how commission rate is resolved in the backend**  
- [x] **Step 2 — Add a contextual info box next to the commission rate field**  
- [x] **Step 3 — Add an effective-rate display per plan**  
- [x] **Step 4 — Add validation that clamps the global rate to 0–100%**  
- [x] **Step 5 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): add commission rate conflict warning and per-plan rate summary card"
  ```

---

## Acceptance Criteria
- The commission rate field has a contextual warning explaining its scope (Free plan fallback).
- A "Commission Rate by Plan" summary table shows the effective rate for each tier.
- Clicking the plans link in the warning navigates to the Plans tab.
- The rate is validated to be between 0–100%.
