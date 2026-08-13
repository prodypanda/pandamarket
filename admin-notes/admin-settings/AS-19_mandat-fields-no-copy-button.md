# AS-19 — Mandat Payment Fields Have No Copy-to-Clipboard Button

**Severity:** 🟢 Improvement  
**Area:** Superadmin Settings — Finance Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Lines:** 400–403 (in DEFAULT_SETTINGS), Finance tab render  
**Impact:** When buyers pay via mandat postal (cash transfer), the support team frequently needs to share the mandat recipient details (`mandat_recipient_name`, `mandat_recipient_cin`, `mandat_recipient_city`, `mandat_proof_email`) with buyers via chat or email. Currently these are plain text inputs with no copy button — support agents must manually select and copy the text. A one-click copy button saves time and prevents transcription errors.

---

## Improvement Checklist

- [ ] **Step 1 — Create a reusable `CopyableField` component**  
  Add a small inline component (can be in the same file or a shared UI component):
  ```tsx
  function CopyableField({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
      navigator.clipboard.writeText(value).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }

    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-slate-200 bg-stone-50 px-4 py-3
                          text-sm font-bold text-slate-700 select-all">
            {value || <span className="text-slate-400 font-normal">Not configured</span>}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            title="Copy to clipboard"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                       border border-slate-200 bg-white text-slate-500 transition-all
                       hover:border-[#B91C1C] hover:bg-[#B91C1C] hover:text-white
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copied
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              : <Copy className="h-4 w-4" />
            }
          </button>
        </div>
        {copied && (
          <p className="text-[11px] font-bold text-emerald-600 ml-1">Copied!</p>
        )}
      </div>
    );
  }
  ```

  > **Import needed:** Add `Copy` and `CheckCircle2` from lucide-react to the imports at the top.

- [ ] **Step 2 — Use `CopyableField` for the mandat details**  
  Find where `mandat_recipient_name`, `mandat_recipient_cin`, `mandat_recipient_city`, and `mandat_proof_email` are rendered in the Finance tab and replace the plain `renderTextInput` calls:

  ```tsx
  {/* Mandat Payment Details */}
  <div className="md:col-span-2 rounded-[2rem] border border-slate-200 bg-white p-6 space-y-4">
    <SectionHeader
      icon={<Wallet className="h-5 w-5" />}
      title="Mandat Recipient Details"
      description="These details are shown to buyers who choose to pay via mandat postal.
                   Click the copy button to quickly share them with buyers via support chat."
    />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Editable inputs for saving */}
      {renderTextInput('mandat_recipient_name', 'Recipient Name', 'PandaMarket SARL')}
      {renderTextInput('mandat_recipient_cin', 'CIN / Tax ID', '01234567')}
      {renderTextInput('mandat_recipient_city', 'City', 'Tunis')}
      {renderTextInput('mandat_proof_email', 'Proof of Payment Email', 'billing@pandamarket.tn')}
    </div>

    {/* Read-only copyable summary for support staff */}
    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-5 space-y-3">
      <p className="text-xs font-black uppercase tracking-wider text-amber-700">
        Quick Copy for Support
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CopyableField label="Recipient Name" value={settings.mandat_recipient_name} />
        <CopyableField label="CIN / Tax ID"   value={settings.mandat_recipient_cin} />
        <CopyableField label="City"           value={settings.mandat_recipient_city} />
        <CopyableField label="Proof Email"    value={settings.mandat_proof_email} />
      </div>
      <CopyableField
        label="Full Payment Instructions (all fields)"
        value={[
          `Recipient: ${settings.mandat_recipient_name}`,
          `CIN: ${settings.mandat_recipient_cin}`,
          `City: ${settings.mandat_recipient_city}`,
          `Send proof to: ${settings.mandat_proof_email}`,
        ].filter(Boolean).join(' | ')}
      />
    </div>
  </div>
  ```

- [ ] **Step 3 — Import `Copy` from lucide-react**  
  At the top of `settings/page.tsx`, add `Copy` to the lucide imports:
  ```ts
  import { ..., Copy } from 'lucide-react';
  ```

- [ ] **Step 4 — Test the copy buttons**  
  - Click "Copy to clipboard" next to "Recipient Name" → "Copied!" feedback appears.  
  - Paste in a text editor → correct value is pasted.  
  - Click the "Full Payment Instructions" copy button → all fields are pasted as a single line.

- [ ] **Step 5 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): add copy-to-clipboard buttons to mandat payment detail fields"
  ```

---

## Acceptance Criteria
- Each mandat field has a one-click copy button.
- A "Full Payment Instructions" compound copy field lets support agents copy everything at once.
- Clicking copy shows a brief "Copied!" confirmation and reverts after 2 seconds.
- Copying works in all modern browsers via the Clipboard API.
