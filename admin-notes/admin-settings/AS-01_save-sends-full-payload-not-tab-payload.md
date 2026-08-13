# AS-01 — `handleSave` Ignores Tab Scope — Sends All Keys on Every Save

**Severity:** 🔴 Bug (Data Loss Risk)  
**Area:** Superadmin Settings Page  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 1328–1329  
**Impact:** Every time the admin clicks "Save Changes", the **entire** `PlatformSettings` object (~100 keys) is sent to the backend — regardless of which tab is active. This means:
1. Editing only the "Shipping" tab and saving will also overwrite every Marketplace, Commerce, Finance, and Security setting with whatever is currently in the form state.
2. The `buildSettingsPayload(settings, tab)` overload that scopes the payload to the active tab **exists and is implemented**, but is never called.

---

## Root Cause

```ts
// settings/page.tsx:1322–1352
async function handleSave() {
  if (!isPlatformSettingsTab(activeTab)) return;

  setSaving(true);
  try {
    const payload = buildSettingsPayload(settings);     // ← no tab argument!
    //              ↑ should be: buildSettingsPayload(settings, activeTab)
    const res = await fetchWithCsrf(`/api/pd/admin/settings`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
```

The `buildSettingsPayload` function signature is:
```ts
function buildSettingsPayload(
  current: PlatformSettings,
  tab?: PlatformSettingsTab    // ← optional tab scope exists
): Partial<PlatformSettings>
```

When `tab` is omitted, it returns the full payload. When `tab` is provided, it returns only the keys for that tab.

---

## Fix Checklist

- [ ] **Step 1 — Open the file**  
  Open `frontend/src/app/(admin)/settings/page.tsx` and navigate to the `handleSave` function (around line 1322).

- [ ] **Step 2 — Add the `activeTab` argument to `buildSettingsPayload`**  
  ```ts
  // BEFORE
  const payload = buildSettingsPayload(settings);

  // AFTER
  const payload = buildSettingsPayload(settings, activeTab);
  ```

- [ ] **Step 3 — Update the post-save state merge to preserve other tabs' unsaved edits**  
  Currently after save, the state is replaced with the server's full response:
  ```ts
  const nextSettings = { ...DEFAULT_SETTINGS, ...(data.data || { ...settings, ...payload }) };
  setSettings(nextSettings);
  setSavedSettings(nextSettings);
  ```
  This is correct because `savedSettings` should reflect what is persisted, but `settings` (the form state) should only update the keys that were saved:
  ```ts
  // Only mark the saved tab's keys as "clean" in savedSettings
  const savedKeys = SETTINGS_TAB_KEYS[activeTab];
  setSavedSettings((prev) => ({
    ...prev,
    ...Object.fromEntries(savedKeys.map((k) => [k, (data.data ?? settings)[k as keyof PlatformSettings]])),
  }));
  // Leave settings (form state) for other tabs untouched
  ```

- [ ] **Step 4 — Verify `SETTINGS_TAB_KEYS` covers all tab keys**  
  Confirm that `SETTINGS_TAB_KEYS[activeTab]` lists every key rendered in that tab.  
  If a key is rendered in the UI but missing from `SETTINGS_TAB_KEYS`, it will never be saved when using tab-scoped saves.

- [ ] **Step 5 — Verify the backend accepts partial updates**  
  Open `backend/src/api/admin.route.ts` and find the `PUT /api/pd/admin/settings` handler.  
  Confirm it performs a **merge** (`UPDATE ... SET key=value WHERE key IN (...)`) rather than a full replace.  
  If it replaces the entire settings object, you must send all keys or implement a PATCH endpoint.

- [ ] **Step 6 — Test the fix**  
  - Open admin settings.  
  - Change a Marketplace setting AND a Finance setting.  
  - Stay on the Marketplace tab and click "Save Changes".  
  - Navigate to Finance tab → the Finance change should still be present in the form (unsaved).  
  - Save Finance tab → Finance change is now persisted.  
  - Reload the page → both changes are saved.

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "fix(admin/settings): scope handleSave payload to active tab using buildSettingsPayload(settings, activeTab)"
  ```

---

## Acceptance Criteria
- Saving the "Shipping" tab does not overwrite Marketplace, Finance, or Security settings.
- Unsaved edits on inactive tabs are preserved in form state after saving another tab.
- The backend receives only the keys belonging to the active tab.
