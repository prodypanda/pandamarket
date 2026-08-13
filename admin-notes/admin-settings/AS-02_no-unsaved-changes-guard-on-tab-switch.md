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

- [ ] **Step 1 — Add a confirmation state**  
  ```ts
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  ```

- [ ] **Step 2 — Intercept the tab click**  
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

  // In JSX, replace onClick={() => setActiveTab(tab.id)}
  // with: onClick={() => handleTabClick(tab.id)}
  ```

- [ ] **Step 3 — Render the confirmation dialog**  
  Add an inline confirmation dialog (no library needed):
  ```tsx
  {showUnsavedDialog && pendingTab && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-[2rem] border border-amber-200 bg-white p-8 shadow-2xl">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-black text-slate-900">Unsaved Changes</h3>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          You have unsaved changes in the <strong>{activeTab}</strong> tab.
          If you leave now, your changes will be lost.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setShowUnsavedDialog(false);
              setPendingTab(null);
            }}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Stay & Save
          </button>
          <button
            type="button"
            onClick={() => {
              // Revert this tab's changes before switching
              setSettings((prev) => ({
                ...prev,
                ...Object.fromEntries(
                  SETTINGS_TAB_KEYS[activeTab as PlatformSettingsTab].map(
                    (k) => [k, savedSettings[k as keyof PlatformSettings]]
                  )
                ),
              }));
              setActiveTab(pendingTab!);
              setShowUnsavedDialog(false);
              setPendingTab(null);
            }}
            className="flex-1 rounded-xl bg-[#B91C1C] py-2.5 text-sm font-bold text-white hover:bg-[#991B1B]"
          >
            Discard & Switch
          </button>
        </div>
      </div>
    </div>
  )}
  ```

- [ ] **Step 4 — Add a `beforeunload` browser guard**  
  To protect against page navigation (browser back, reload, closing tab):
  ```ts
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedPlatformChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedPlatformChanges]);
  ```

- [ ] **Step 5 — Test the dialog**  
  - Edit a field in Marketplace tab.  
  - Click Finance tab → dialog should appear.  
  - Click "Stay & Save" → dialog closes, edit is preserved, tab does NOT switch.  
  - Click Finance tab again → dialog appears again.  
  - Click "Discard & Switch" → Finance tab activates, Marketplace edit is reverted.

- [ ] **Step 6 — Test the browser unload guard**  
  - Edit a field in any tab.  
  - Try to close the browser tab → browser should show "Leave site?" confirmation.

- [ ] **Step 7 — Commit**  
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
