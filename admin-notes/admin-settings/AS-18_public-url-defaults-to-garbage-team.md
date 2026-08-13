# AS-18 — `marketplace_public_url` Defaults to a Development Domain

**Severity:** 🔴 Bug  
**Area:** Superadmin Settings — Marketplace Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 245  
**Impact:** `DEFAULT_SETTINGS.marketplace_public_url` is set to `'https://garbage.team'` — the Vercel preview/test domain used during development. If an operator deploys PandaMarket without explicitly setting this field, every email template, OG canonical URL, vendor invitation link, and sharing URL will point to `https://garbage.team` instead of their real domain. This is a production-breaking default.

---

## Root Cause

```ts
// settings/page.tsx:245
const DEFAULT_SETTINGS: PlatformSettings = {
  // ...
  marketplace_public_url: 'https://garbage.team',   // ← dev artifact, must not ship as default
```

---

## Fix Checklist

- [ ] **Step 1 — Change the default to an empty string**  
  ```ts
  marketplace_public_url: '',   // ← no default; force operator to configure
  ```

- [ ] **Step 2 — Add a prominent "required" indicator on the field**  
  In the Marketplace tab render, when `marketplace_public_url` is empty or equals a known dev domain, show a warning:
  ```tsx
  {/* Public URL field with required warning */}
  <div className="space-y-2">
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
      Marketplace Public URL
      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">
        REQUIRED
      </span>
    </label>
    <input
      type="text"
      value={settings.marketplace_public_url}
      placeholder="https://your-domain.com"
      onChange={(e) => updateSetting('marketplace_public_url', e.target.value)}
      className={`w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none transition-all
        focus:ring-2 ${
          !settings.marketplace_public_url
            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/15'
            : 'border-slate-200 bg-stone-50 focus:border-[#B91C1C] focus:ring-[#B91C1C]/15'
        }`}
    />
    {!settings.marketplace_public_url && (
      <p className="text-xs font-bold text-red-600">
        ⚠ This field is required. Email templates, canonical URLs, and sharing links will break
        until this is configured.
      </p>
    )}
    {settings.marketplace_public_url?.includes('garbage.team') && (
      <p className="text-xs font-bold text-amber-700">
        ⚠ You appear to be using the development preview domain. Update this to your production domain.
      </p>
    )}
  </div>
  ```

- [ ] **Step 3 — Add a URL format validator**  
  ```ts
  // In buildSettingsPayload
  const publicUrl = String(payload.marketplace_public_url || '').trim();
  if (publicUrl && !/^https?:\/\/.+/.test(publicUrl)) {
    // Invalid URL — revert to empty string, backend will also validate
    payload.marketplace_public_url = '';
  } else {
    // Strip trailing slash
    payload.marketplace_public_url = publicUrl.replace(/\/$/, '');
  }
  ```

- [ ] **Step 4 — Add a global "Setup Required" banner if key fields are unconfigured**  
  Show a dismissible banner at the top of the settings page when critical fields are empty:
  ```tsx
  {(!settings.marketplace_public_url || settings.marketplace_public_url.includes('garbage.team')) && (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4">
      <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-black text-amber-900">Initial Setup Required</p>
        <p className="text-xs text-amber-700 mt-1">
          Your <strong>Marketplace Public URL</strong> is not configured.
          This field is critical for email delivery and SEO canonical URLs.
          <button onClick={() => setActiveTab('marketplace')} className="ml-1 underline font-bold">
            Configure now →
          </button>
        </p>
      </div>
    </div>
  )}
  ```

- [ ] **Step 5 — Search for other hardcoded dev domains in DEFAULT_SETTINGS**  
  Audit `DEFAULT_SETTINGS` for any other values that reference dev-specific domains or placeholders:
  - `marketplace_support_email: 'support@pandamarket.tn'` — acceptable default  
  - `marketplace_public_url: 'https://garbage.team'` — **must be empty string** ← this fix  
  - `mandat_proof_email: 'billing@pandamarket.tn'` — acceptable default  
  - `marketplace_public_url` in `DEFAULT_SMTP_FORM.smtp_from_email: 'noreply@pandamarket.tn'` — acceptable default

- [ ] **Step 6 — Test**  
  - On a fresh install (empty DB), open the settings page.  
  - "Initial Setup Required" banner should appear.  
  - Public URL field should show red border and warning.  
  - Enter a valid URL → warning disappears.  
  - Save → verify the URL is stored correctly.

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "fix(admin/settings): change marketplace_public_url default to empty string, add required-field warnings"
  ```

---

## Acceptance Criteria
- `DEFAULT_SETTINGS.marketplace_public_url` is `''` (empty string).
- The field shows a red border and warning when empty.
- A "garbage.team" value triggers an amber "dev domain" warning.
- An "Initial Setup Required" banner appears when critical fields are unconfigured.
