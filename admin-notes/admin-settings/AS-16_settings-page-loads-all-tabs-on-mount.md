# AS-16 — Settings Page Loads All 9 Tabs Simultaneously on Mount

**Severity:** 🟢 Improvement (Performance)  
**Area:** Superadmin Settings — Page Load  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 1259–1283  
**Impact:** On mount, the settings page fetches the full 100+ key `PlatformSettings` object and the SMTP configuration simultaneously, regardless of which tab the admin will use. For a superadmin on a slow connection, this can delay the page becoming interactive. Additionally, all 9 tabs' JSX is rendered in the DOM (with `hidden` CSS class) even when not visible, increasing initial paint time.

---

## Improvement Checklist

### Part 1 — Lazy-render inactive tab content

- [ ] **Step 1 — Replace the `hidden` CSS pattern with conditional rendering**  
  Currently tabs use CSS to hide/show:
  ```tsx
  <section className={`${activeTab === 'operations' ? '' : 'hidden'} ...`}>
  ```
  
  Replace with conditional rendering so inactive tabs are not in the DOM at all:
  ```tsx
  {activeTab === 'operations' && (
    <section className="...">
      {/* operations tab content */}
    </section>
  )}
  ```
  
  This prevents React from rendering 8 tabs' worth of JSX when only 1 is active.

  > **Warning:** Before applying this change, ensure the `hasUnsavedPlatformChanges` dirty check  
  > still works correctly. Since it reads from the `settings` state (not from DOM), it will.

- [ ] **Step 2 — Apply conditional rendering to all 9 tab sections**  
  Wrap each `<section className={activeTab === 'X' ? '' : 'hidden'}>` block with `{activeTab === 'X' && (...)}`.

### Part 2 — Defer the SMTP load until the Email tab is active

- [ ] **Step 3 — Move the SMTP fetch to only trigger when the Email tab is activated**  
  ```ts
  // BEFORE — fetches SMTP on every page load
  useEffect(() => {
    fetchSmtpConfig();
  }, []);

  // AFTER — only fetches when Email tab is first opened
  const [smtpFetched, setSmtpFetched] = useState(false);

  useEffect(() => {
    if (activeTab === 'email' && !smtpFetched) {
      fetchSmtpConfig().then(() => setSmtpFetched(true));
    }
  }, [activeTab, smtpFetched]);
  ```

- [ ] **Step 4 — Show a loading skeleton in the Email tab until SMTP data arrives**  
  ```tsx
  {activeTab === 'email' && smtpLoading && (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  )}
  ```

### Part 3 — Measure the improvement

- [ ] **Step 5 — Measure time-to-interactive before and after**  
  Use Chrome DevTools → Performance → record a page load of `/dashboard/settings`.  
  Note the "Time to Interactive" metric before and after the change.

- [ ] **Step 6 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "perf(admin/settings): lazy-render inactive tabs and defer SMTP fetch to Email tab activation"
  ```

---

## Acceptance Criteria
- Only the active tab's JSX is rendered in the DOM.
- Switching to the Email tab for the first time triggers the SMTP config fetch.
- A skeleton placeholder shows while the SMTP config loads.
- No functional difference in behavior — settings still save and load correctly.
