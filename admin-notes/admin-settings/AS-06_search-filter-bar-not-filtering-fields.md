# AS-06 — Settings Search Bar Does Not Filter Individual Fields

**Severity:** 🔴 Bug (Dead Feature)  
**Area:** Superadmin Settings — Sticky Header  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 1460–1481  
**Impact:** The settings page has a search bar in the sticky header that says "Search setting (e.g. logo, aramex, flouci, theme, hero, smtp)...". The `searchQuery` state is wired and updated — but it is **never used to filter any of the rendered setting fields**. The search bar is completely non-functional: typing in it has zero visible effect on the settings content.

---

## Root Cause

```tsx
// settings/page.tsx:1460–1481
const [searchQuery, setSearchQuery] = useState('');

// The searchQuery state is set but NEVER READ anywhere in the render logic.
// No tab content conditionally hides/shows fields based on searchQuery.
```

The `searchQuery` is only used to control the clear button's visibility:
```tsx
{searchQuery && (
  <button onClick={() => setSearchQuery('')}>✕</button>
)}
```

No field rendering checks `searchQuery`.

---

## Fix Checklist

### Part 1 — Make the search bar filter across tabs

- [x] **Step 1 — Build a flat search index of all settings**  
- [x] **Step 2 — Compute search results**  
- [x] **Step 3 — Show search results panel when query is active**  
- [x] **Step 4 — Add `id` attributes to field containers for scroll-targeting**  
- [x] **Step 5 — Test the search**  
  - Type "logo" → see Logo URL, Logo Light, Logo Dark fields in results.  
  - Click a result → the correct tab activates and the view scrolls to the field.  
  - Type "smtp" → see email configuration fields.  
  - Type "aramex" → see the Aramex shipping fields.

- [x] **Step 6 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): implement settings search bar — filter fields and navigate to tab on click"
  ```

---

## Acceptance Criteria
- Typing in the search bar shows a dropdown list of matching settings.
- Clicking a search result navigates to the correct tab and scrolls to the field.
- Typing "logo" returns all logo-related fields.
- Clearing the search restores the normal tab view.
