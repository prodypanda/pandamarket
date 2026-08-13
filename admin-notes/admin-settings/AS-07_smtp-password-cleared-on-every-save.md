# AS-07 — Sending Empty SMTP Password May Unintentionally Clear Saved Credentials

**Severity:** 🔴 Bug  
**Area:** Superadmin Settings — Email Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 1363–1383  
**Impact:** When an admin opens the email settings tab and clicks "Save Email Config" **without entering a new password**, an empty `smtp_pass: ""` is sent to the backend. Depending on backend logic, this may clear the saved SMTP password — breaking all transactional email delivery silently with no warning.

---

## Root Cause

```ts
// settings/page.tsx:1354–1383
async function handleSmtpSave() {
  // ...
  const res = await fetchWithCsrf('/api/pd/admin/smtp-config', {
    method: 'PUT',
    body: JSON.stringify(smtpForm),   // ← smtpForm.smtp_pass is "" when not changed
  });
  if (res.ok) {
    setSmtpSaved(true);
    if (smtpForm.smtp_pass) {         // ← only clears the field if a new password was typed
      setSmtpPasswordSet(true);
      setSmtpForm((prev) => ({ ...prev, smtp_pass: '' }));
    }
```

The issue is that `smtpForm.smtp_pass === ""` is sent to the API. The backend must distinguish between "admin intentionally cleared the password" vs "admin saved without changing the password."

---

## Fix Checklist

### Part 1 — Frontend: Omit empty password from payload

- [ ] **Step 1 — Strip empty `smtp_pass` from the save payload**  
  In `handleSmtpSave`, before the fetch call:
  ```ts
  const smtpPayload: Partial<SmtpFormData> = { ...smtpForm };
  if (!smtpPayload.smtp_pass) {
    delete smtpPayload.smtp_pass;   // ← omit the key entirely when empty
  }

  const res = await fetchWithCsrf('/api/pd/admin/smtp-config', {
    method: 'PUT',
    body: JSON.stringify(smtpPayload),   // ← send without smtp_pass if unchanged
  });
  ```

- [ ] **Step 2 — Add a UX indicator for the password field**  
  Since the password is never returned from the API (security), show the "password set" state clearly:
  ```tsx
  <div className="space-y-1.5">
    <label>SMTP Password</label>
    <div className="relative">
      <input
        type={smtpShowPassword ? 'text' : 'password'}
        value={smtpForm.smtp_pass}
        placeholder={smtpPasswordSet ? '••••••••  (leave blank to keep current)' : 'Enter SMTP password'}
        onChange={(e) => updateSmtpField('smtp_pass', e.target.value)}
        className="..."
      />
    </div>
    {smtpPasswordSet && !smtpForm.smtp_pass && (
      <p className="text-xs font-bold text-emerald-600">
        ✓ A password is currently saved. Leave blank to keep it unchanged.
      </p>
    )}
    {smtpPasswordSet && smtpForm.smtp_pass && (
      <p className="text-xs font-bold text-amber-600">
        ⚠ A new password will replace the saved one when you save.
      </p>
    )}
    {!smtpPasswordSet && (
      <p className="text-xs font-medium text-slate-400">
        No password is currently saved.
      </p>
    )}
  </div>
  ```

### Part 2 — Backend verification

- [ ] **Step 3 — Check the backend SMTP save handler**  
  Open the backend handler for `PUT /api/pd/admin/smtp-config`.  
  Verify that it **only updates `smtp_pass` when the key is present in the request body**.  
  If it currently sets `smtp_pass = ""` when the key is missing or empty, add:
  ```ts
  // backend pseudo-code
  if (body.smtp_pass !== undefined && body.smtp_pass !== '') {
    config.smtp_pass = await hashOrEncrypt(body.smtp_pass);
  }
  // else: leave existing smtp_pass unchanged
  ```

- [ ] **Step 4 — Test the fix**  
  - Configure valid SMTP credentials including a password.  
  - Save → credentials work, `smtp_pass_set: true` is returned.  
  - Open settings again, change only `smtp_from_name`.  
  - Save without touching the password field.  
  - Send a test email → it must still work (password was not cleared).

- [ ] **Step 5 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "fix(admin/settings): omit empty smtp_pass from save payload to prevent accidental credential clear"
  ```

---

## Acceptance Criteria
- Saving email settings without entering a password does NOT clear the saved SMTP password.
- The password field shows a clear indicator of whether a password is currently saved.
- Test email delivery works after saving other fields without re-entering the password.
