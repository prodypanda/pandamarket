# AS-14 — No Per-Tab Reset Button to Discard Unsaved Changes

**Severity:** 🟡 Enhancement  
**Area:** Superadmin Settings — All Tabs  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Impact:** Once an admin edits settings in a tab, there is no "Reset" or "Discard" button to revert to the last saved values. The only recovery option is to manually undo each field change or reload the page (which loses all in-progress changes on all tabs). A per-tab reset button would allow quick recovery from accidental edits.

---

## Enhancement Checklist

- [ ] **Step 1 — Add a "Reset" button to the sticky header action row**  
  The sticky header already has "Save Changes". Add a reset button that appears only when there are unsaved changes:
  ```tsx
  {hasUnsavedPlatformChanges && (
    <button
      type="button"
      onClick={handleReset}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white
                 px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm
                 hover:border-amber-200 hover:bg-amber-50 transition-all"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      Discard Changes
    </button>
  )}
  ```

- [ ] **Step 2 — Implement `handleReset`**  
  ```ts
  function handleReset() {
    if (!isPlatformSettingsTab(activeTab)) return;

    // Revert only the current tab's keys to their last saved values
    const tabKeys = SETTINGS_TAB_KEYS[activeTab];
    setSettings((prev) => ({
      ...prev,
      ...Object.fromEntries(
        tabKeys.map((k) => [k, savedSettings[k as keyof PlatformSettings]])
      ),
    }));
  }
  ```

- [ ] **Step 3 — Add an optional "Reset to Factory Defaults" button (separate, in Danger Zone)**  
  This is a more destructive action — reset an individual field or an entire tab to `DEFAULT_SETTINGS` values:
  ```tsx
  {/* In a "Danger Zone" collapsible section at the bottom of each tab */}
  <details className="mt-8">
    <summary className="cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-600">
      ▸ Reset tab to factory defaults
    </summary>
    <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4">
      <p className="text-xs text-red-700 mb-3">
        This will overwrite all {activeTab} settings with their default values.
        This action only takes effect after you click Save.
      </p>
      <button
        type="button"
        onClick={() => {
          if (!isPlatformSettingsTab(activeTab)) return;
          const tabKeys = SETTINGS_TAB_KEYS[activeTab];
          setSettings((prev) => ({
            ...prev,
            ...Object.fromEntries(
              tabKeys.map((k) => [k, DEFAULT_SETTINGS[k as keyof PlatformSettings]])
            ),
          }));
        }}
        className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs
                   font-bold text-red-700 hover:bg-red-100"
      >
        Reset {activeTab} tab to defaults
      </button>
    </div>
  </details>
  ```

- [ ] **Step 4 — Confirm reset with dirty indicator**  
  After reset, `hasUnsavedPlatformChanges` will become `true` (form now differs from saved state, now matching defaults). The sticky header should show "Unsaved changes" until the admin saves.

- [ ] **Step 5 — Test the Discard Changes flow**  
  - Edit 3 fields in the Marketplace tab.  
  - Click "Discard Changes" → all 3 fields revert to their saved values.  
  - Confirm `hasUnsavedPlatformChanges` becomes `false`.

- [ ] **Step 6 — Test the Reset to Defaults flow**  
  - Click "Reset marketplace tab to defaults".  
  - Confirm fields like `marketplace_name` revert to "PandaMarket".  
  - **Do NOT save** → reload page → confirm original values are restored (reset was only form-level).  
  - **Save** → reload page → confirm the reset defaults are now persisted.

- [ ] **Step 7 — Commit**  
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
