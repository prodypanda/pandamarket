# AS-17 — No Link to Audit Log Entry After Saving Settings

**Severity:** 🟢 Improvement  
**Area:** Superadmin Settings — Save Action  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 1342–1344  
**Impact:** When the admin saves settings, they see "Saved Successfully!" for 3 seconds and then nothing. The platform has a dedicated audit log page (`/dashboard/audit-log`) that records every settings change. But after saving, there is no way to immediately verify what was recorded — the admin must manually navigate to the audit log and find the entry. Adding a "View in audit log" link to the save confirmation improves accountability and traceability.

---

## Improvement Checklist

- [ ] **Step 1 — Check the audit log API response**  
  After a successful settings save (`PUT /api/pd/admin/settings`), check if the response body includes an audit log entry ID or timestamp.  
  If not, check `GET /api/pd/admin/audit-log?limit=1` immediately after save to get the latest entry.

- [ ] **Step 2 — Add an `auditLogUrl` state**  
  ```ts
  const [auditLogUrl, setAuditLogUrl] = useState<string | null>(null);
  ```

- [ ] **Step 3 — Set the audit log URL after a successful save**  
  ```ts
  // After a successful save in handleSave:
  setSaved(true);

  // Optionally fetch the latest audit log entry to link to it:
  try {
    const auditRes = await fetch('/api/pd/admin/audit-log?limit=1&action=settings_update', {
      credentials: 'include',
    });
    if (auditRes.ok) {
      const auditData = await auditRes.json();
      const latestEntry = auditData.data?.[0];
      if (latestEntry?.id) {
        setAuditLogUrl(`/dashboard/audit-log?highlight=${latestEntry.id}`);
      }
    }
  } catch { /* non-critical, ignore */ }

  setTimeout(() => {
    setSaved(false);
    setAuditLogUrl(null);
  }, 8000);  // keep confirmation visible a bit longer when link is shown
  ```

- [ ] **Step 4 — Show the link in the save confirmation button area**  
  ```tsx
  <div className="flex items-center gap-3">
    <button
      onClick={...}
      className="..."
    >
      {saved ? '✓ Saved!' : 'Save Changes'}
    </button>
    {saved && auditLogUrl && (
      <a
        href={auditLogUrl}
        target="_blank"
        rel="noopener"
        className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
      >
        View in audit log →
      </a>
    )}
  </div>
  ```

- [ ] **Step 5 — Alternative: Show a toast notification with the link**  
  If the project has a toast/notification system, use it to show a dismissible message:
  ```
  ✓ Settings saved — <a href="/dashboard/audit-log">View audit log</a>
  ```

- [ ] **Step 6 — Test**  
  - Save any settings change.  
  - "Saved Successfully!" appears with a "View in audit log →" link.  
  - Clicking the link opens the audit log page with the most recent entry visible.

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): add View in audit log link to save confirmation"
  ```

---

## Acceptance Criteria
- After a successful settings save, a "View in audit log" link appears next to the save confirmation.
- The link navigates to the audit log page, ideally highlighting the new entry.
- The link disappears after 8 seconds (same as the "Saved!" confirmation timeout).
