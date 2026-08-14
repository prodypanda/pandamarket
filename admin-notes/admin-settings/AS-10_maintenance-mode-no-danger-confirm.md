# AS-10 — Maintenance Mode Toggle Has No Confirmation Dialog

**Severity:** 🟡 Enhancement (Safety UX)  
**Area:** Superadmin Settings — Operations Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 1555–1562  
**Impact:** The `maintenance_enabled` toggle takes the **entire marketplace offline** for all buyers and vendors when flipped. It currently uses the same `renderToggle` UI as non-critical settings like `reviews_enabled`. An accidental click or mistouch on mobile can take the platform down. This needs a "danger zone" confirmation interaction.

---

## Enhancement Checklist

- [x] **Step 1 — Add a confirmation state for maintenance mode**  
- [x] **Step 2 — Replace the `renderToggle` call for `maintenance_enabled` with a custom danger toggle**  
- [x] **Step 3 — Build the confirmation dialog**  
- [x] **Step 4 — Add a visible "MAINTENANCE IS ACTIVE" banner in the admin header**  
- [x] **Step 5 — Test**  
- [x] **Step 6 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): add confirmation dialog for maintenance_enabled to prevent accidental outages"
  ```

---

## Acceptance Criteria
- Enabling maintenance mode requires clicking through a confirmation dialog with explicit warning text.
- Disabling maintenance mode (going back online) requires no confirmation.
- When maintenance is active and saved, a persistent red banner is shown in the admin panel.
