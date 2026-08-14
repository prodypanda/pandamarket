# AS-14 — No Per-Tab Reset Button to Discard Unsaved Changes

**Severity:** 🟡 Enhancement  
**Area:** Superadmin Settings — All Tabs  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Impact:** Once an admin edits settings in a tab, there is no "Reset" or "Discard" button to revert to the last saved values. The only recovery option is to manually undo each field change or reload the page (which loses all in-progress changes on all tabs). A per-tab reset button would allow quick recovery from accidental edits.

---

## Enhancement Checklist

- [x] **Step 1 — Add a "Reset" button to the sticky header action row**  
- [x] **Step 2 — Implement `handleReset` / `resetActiveSection`**  
- [x] **Step 3 — Add an optional "Reset to Factory Defaults" button**  
- [x] **Step 4 — Confirm reset with dirty indicator**  
- [x] **Step 5 — Test the Discard Changes flow**  
- [x] **Step 6 — Test the Reset to Defaults flow**  
- [x] **Step 7 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): add Discard Changes and Reset to Defaults buttons per tab"
  ```

---

## Acceptance Criteria
- A "Discard Changes" button appears in the sticky header when the current tab has unsaved changes.
- Clicking "Discard Changes" reverts only the current tab's fields to their last saved values.
- A "Reset to factory defaults" option exists inside a collapsible Danger Zone section.
- Neither reset action persists to the DB without an explicit Save.
