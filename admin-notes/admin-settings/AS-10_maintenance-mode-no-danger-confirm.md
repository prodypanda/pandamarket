# AS-10 — Maintenance Mode Toggle Has No Confirmation Dialog

**Severity:** 🟡 Enhancement (Safety UX)  
**Area:** Superadmin Settings — Operations Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 1555–1562  
**Impact:** The `maintenance_enabled` toggle takes the **entire marketplace offline** for all buyers and vendors when flipped. It currently uses the same `renderToggle` UI as non-critical settings like `reviews_enabled`. An accidental click or mistouch on mobile can take the platform down. This needs a "danger zone" confirmation interaction.

---

## Enhancement Checklist

- [ ] **Step 1 — Add a confirmation state for maintenance mode**  
  ```ts
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  ```

- [ ] **Step 2 — Replace the `renderToggle` call for `maintenance_enabled` with a custom danger toggle**  
  ```tsx
  {/* Maintenance Mode — custom danger toggle, not the standard renderToggle */}
  <div className={`flex items-center justify-between gap-4 rounded-2xl border-2 p-5 transition-all
    ${settings.maintenance_enabled
      ? 'border-red-300 bg-red-50 shadow-lg shadow-red-500/10'
      : 'border-slate-200 bg-white'
    }`}
  >
    <div className="pr-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold text-slate-900">Enable Maintenance Mode</p>
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black
                         uppercase text-red-700">
          DANGER
        </span>
      </div>
      <p className="mt-1 text-xs font-medium text-slate-500 leading-relaxed">
        Block all non-admin access to the marketplace. This takes your platform OFFLINE immediately.
      </p>
    </div>
    <button
      type="button"
      onClick={() => {
        if (!settings.maintenance_enabled) {
          // Turning ON requires confirmation
          setShowMaintenanceConfirm(true);
        } else {
          // Turning OFF is safe — no confirmation needed
          updateSetting('maintenance_enabled', false);
        }
      }}
      className={`relative h-7 w-14 shrink-0 rounded-full transition-all duration-300 shadow-inner
        ${settings.maintenance_enabled
          ? 'bg-red-600 shadow-red-900/20'
          : 'bg-slate-200'
        }`}
    >
      <span
        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300
          ${settings.maintenance_enabled ? 'translate-x-7' : 'translate-x-0'}`}
      />
    </button>
  </div>
  ```

- [ ] **Step 3 — Build the confirmation dialog**  
  ```tsx
  {showMaintenanceConfirm && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-[2rem] border-2 border-red-200 bg-white p-8 shadow-2xl">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-black text-red-900">Enable Maintenance Mode?</h3>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          This will <strong>immediately block all buyers and vendors</strong> from accessing
          the marketplace. Only admin accounts will be able to log in.
        </p>
        <p className="mt-3 text-sm font-bold text-red-700">
          Are you sure you want to take the platform offline?
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setShowMaintenanceConfirm(false)}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold
                       text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              updateSetting('maintenance_enabled', true);
              setShowMaintenanceConfirm(false);
            }}
            className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white
                       hover:bg-red-700"
          >
            Yes, Take Platform Offline
          </button>
        </div>
      </div>
    </div>
  )}
  ```

- [ ] **Step 4 — Add a visible "MAINTENANCE IS ACTIVE" banner in the admin header**  
  When `settings.maintenance_enabled` is `true` and it is also the `savedSettings` value (i.e., confirmed saved to DB), show a persistent banner:
  ```tsx
  {savedSettings.maintenance_enabled && (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3
                    bg-red-600 py-2 text-xs font-black text-white uppercase tracking-widest">
      <AlertTriangle className="h-4 w-4 animate-pulse" />
      MAINTENANCE MODE IS ACTIVE — Marketplace is offline
      <AlertTriangle className="h-4 w-4 animate-pulse" />
    </div>
  )}
  ```

- [ ] **Step 5 — Test**  
  - Toggle maintenance ON → confirmation dialog appears.  
  - Click "Cancel" → toggle remains OFF.  
  - Click "Yes, Take Platform Offline" → toggle turns ON.  
  - Save → maintenance is now active.  
  - Toggle OFF → no confirmation (safe action), toggle turns OFF immediately.

- [ ] **Step 6 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): add confirmation dialog for maintenance_enabled to prevent accidental outages"
  ```

---

## Acceptance Criteria
- Enabling maintenance mode requires clicking through a confirmation dialog with explicit warning text.
- Disabling maintenance mode (going back online) requires no confirmation.
- When maintenance is active and saved, a persistent red banner is shown in the admin panel.
