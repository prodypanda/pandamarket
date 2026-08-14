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

- [x] **Step 1 — Validate `rewards_widget_prizes_json` before sending to the backend**  
  In `buildSettingsPayload`:
  ```ts
  try {
    const parsed = JSON.parse(payload.rewards_widget_prizes_json || '[]');
    if (!Array.isArray(parsed) || parsed.length === 0) {
      payload.rewards_widget_prizes_json = DEFAULT_SETTINGS.rewards_widget_prizes_json;
    }
  } catch {
    payload.rewards_widget_prizes_json = DEFAULT_SETTINGS.rewards_widget_prizes_json;
  }
  ```

- [x] **Step 2 — Show a visible parse error in the UI before saving**  
- [x] **Step 3 — Parse the JSON into an array of prize objects**  
- [x] **Step 4 — Render each prize as an editable row**  
- [x] **Step 5 — Add an "Add Prize" and "Remove Prize" button**  
- [x] **Step 6 — Test with malformed JSON**  
- [x] **Step 7 — Commit**  
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
