# AS-02 — No Confirmation Dialog When Switching Tabs With Unsaved Changes

**Severity:** 🔴 Bug (Data Loss Risk)  
**Area:** Superadmin Settings Page  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 1417–1419, 1510  
**Impact:** When an admin edits several fields in the "Marketplace" tab and then clicks the "Finance" tab, all unsaved edits are silently abandoned. There is no warning, no prompt, and no way to recover the lost changes. This is a serious UX and data-loss risk for complex configurations.

---

## Root Cause

```tsx
// settings/page.tsx:1503–1527
{SETTINGS_TABS.map((tab) => (
  <button
    key={tab.id}
    type="button"
    onClick={() => setActiveTab(tab.id)}   // ← immediately switches, no guard
    ...
  >
```

`hasUnsavedPlatformChanges` is computed and shown as a warning label in the sticky header, but **tab click handlers do not check it before switching**.

---

## Fix Checklist

- [x] **Step 1 — Add a confirmation state**  
  ```ts
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  ```

- [x] **Step 2 — Intercept the tab click**  
  ```tsx
  function handleTabClick(tabId: SettingsTab) {
    if (
      tabId !== activeTab &&
      isPlatformSettingsTab(activeTab) &&
      hasUnsavedPlatformChanges
    ) {
      setPendingTab(tabId);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(tabId);
    }
  }
  ```

- [x] **Step 3 — Render the confirmation dialog**  
  Add an inline confirmation dialog:
  ```tsx
  {showUnsavedDialog && pendingTab && ( ... )}
  ```

- [x] **Step 4 — Add a `beforeunload` browser guard**  
  To protect against page navigation (browser back, reload, closing tab):
  ```ts
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyUnsavedPlatformChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasAnyUnsavedPlatformChanges]);
  ```

- [x] **Step 5 — Test the dialog**  
  - Edit a field in Marketplace tab.  
  - Click Finance tab → dialog appears.  
  - Click "Stay & Save" → dialog closes, edit is preserved, tab does NOT switch.  
  - Click "Discard & Switch" → Finance tab activates, Marketplace edit is reverted.

- [x] **Step 6 — Test the browser unload guard**  
  - Edit a field in any tab.  
  - Try to close the browser tab → browser shows "Leave site?" confirmation.

- [x] **Step 7 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "fix(admin/settings): add unsaved-changes confirmation dialog on tab switch and beforeunload guard"
  ```

---

## Acceptance Criteria
- Clicking a different tab while unsaved changes exist shows a confirmation dialog.
- "Stay & Save" closes the dialog without switching tabs.
- "Discard & Switch" reverts the current tab's changes and switches to the target tab.
- Closing/reloading the browser with unsaved changes triggers the native `beforeunload` prompt.
