# AS-05 — Rewards Prizes Edited as Raw JSON With No Validation

**Severity:** 🔴 Bug  
**Area:** Superadmin Settings — Commerce Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 749 (in `SETTINGS_TAB_KEYS.commerce`)  
**Impact:** The `rewards_widget_prizes_json` field stores a JSON array that powers the spinning-wheel gamification widget. It is edited as a raw `<textarea>` with no JSON validation, no schema enforcement, and no visual editor. A single malformed JSON entry silently breaks the entire rewards widget for all buyers on the live platform.

---

## Root Cause

```ts
// DEFAULT_SETTINGS:333
rewards_widget_prizes_json: '[{"label":"5 DT Offerts","code":"CHANCE5DT",...},...]',
```

This 6-prize JSON array is rendered as `renderTextAreaInput('rewards_widget_prizes_json', ...)` — a plain `<textarea>` that accepts arbitrary text.

---

## Fix Checklist

### Part 1 — Immediate: Add JSON validation on save

- [ ] **Step 1 — Validate `rewards_widget_prizes_json` before sending to the backend**  
  In `buildSettingsPayload` (around line 871), add:
  ```ts
  // Validate rewards_widget_prizes_json is valid JSON array
  try {
    const parsed = JSON.parse(payload.rewards_widget_prizes_json || '[]');
    if (!Array.isArray(parsed)) {
      payload.rewards_widget_prizes_json = DEFAULT_SETTINGS.rewards_widget_prizes_json;
    }
  } catch {
    payload.rewards_widget_prizes_json = DEFAULT_SETTINGS.rewards_widget_prizes_json;
  }
  ```

- [ ] **Step 2 — Show a visible parse error in the UI before saving**  
  Replace the raw `renderTextAreaInput` call with a custom block that validates on change:
  ```tsx
  {/* Rewards prizes JSON editor with validation */}
  <div className="md:col-span-2 space-y-2">
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
      Rewards Prizes (JSON Array)
    </label>
    <textarea
      rows={6}
      value={settings.rewards_widget_prizes_json}
      onChange={(e) => {
        updateSetting('rewards_widget_prizes_json', e.target.value);
      }}
      className={`w-full rounded-xl border px-4 py-3 text-xs font-mono outline-none transition-all
        focus:ring-2 ${
          (() => {
            try { JSON.parse(settings.rewards_widget_prizes_json); return true; } catch { return false; }
          })()
            ? 'border-slate-200 bg-stone-50 focus:border-[#B91C1C] focus:ring-[#B91C1C]/15'
            : 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/15'
        }`}
    />
    {(() => {
      try { JSON.parse(settings.rewards_widget_prizes_json); return null; }
      catch (e: any) {
        return (
          <p className="text-xs font-bold text-red-600">
            ⚠ Invalid JSON: {e.message} — this field will not be saved until fixed.
          </p>
        );
      }
    })()}
  </div>
  ```

### Part 2 — Full Fix: Build a Prize Editor UI

- [ ] **Step 3 — Parse the JSON into an array of prize objects**  
  ```ts
  interface Prize {
    label: string;
    code: string;
    disc: number;
    icon: string;
    color: string;
    desc: string;
  }

  function parsePrizes(json: string): Prize[] {
    try { return JSON.parse(json); } catch { return []; }
  }
  ```

- [ ] **Step 4 — Render each prize as an editable row**  
  Build a list-editor component where each prize is a card with inputs for each field:
  ```tsx
  {parsePrizes(settings.rewards_widget_prizes_json).map((prize, idx) => (
    <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
      <div className="flex gap-2">
        <input value={prize.label} onChange={...} placeholder="Label" className="..." />
        <input value={prize.code}  onChange={...} placeholder="Coupon Code" className="..." />
        <input value={prize.icon}  onChange={...} placeholder="Emoji" className="w-16" />
      </div>
      <div className="flex gap-2">
        <input type="number" value={prize.disc} onChange={...} placeholder="Discount" />
        <input type="color" value={prize.color} onChange={...} />
        <input value={prize.desc} onChange={...} placeholder="Description" />
      </div>
      <button onClick={() => removePrize(idx)} className="...">Remove</button>
    </div>
  ))}
  <button onClick={addPrize} className="...">+ Add Prize</button>
  ```
  When changes are made, `JSON.stringify(prizes)` back into `settings.rewards_widget_prizes_json`.

- [ ] **Step 5 — Add an "Add Prize" and "Remove Prize" button**  
  Maintain a local `prizes` state and sync it back to the JSON string on every change.

- [ ] **Step 6 — Test with malformed JSON**  
  - Manually type invalid JSON → red border + error message appears.  
  - Save button should be disabled (or save should skip this field) when JSON is invalid.

- [ ] **Step 7 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "fix(admin/settings): add JSON validation and prize editor UI for rewards_widget_prizes_json"
  ```

---

## Acceptance Criteria
- Invalid JSON in the prizes field shows a red border and error message immediately.
- The field is not saved if it contains invalid JSON.
- Ideally, prizes are editable via a structured form (not raw JSON).
- The rewards widget on the live Hub is never broken by a misconfigured JSON string.
