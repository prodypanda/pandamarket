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

- [ ] **Step 1 — Build a flat search index of all settings**  
  Create a constant that maps every setting key to its human-readable label and description:
  ```ts
  const SETTINGS_SEARCH_INDEX: Array<{
    key: keyof PlatformSettings;
    tab: PlatformSettingsTab;
    label: string;
    description: string;
    keywords: string[];
  }> = [
    {
      key: 'marketplace_name',
      tab: 'marketplace',
      label: 'Marketplace Name',
      description: 'The display name of your marketplace',
      keywords: ['name', 'brand', 'title'],
    },
    {
      key: 'marketplace_logo_url',
      tab: 'marketplace',
      label: 'Logo URL',
      description: 'Main logo for light backgrounds',
      keywords: ['logo', 'image', 'brand'],
    },
    // ... add all ~100 settings
  ];
  ```

- [ ] **Step 2 — Compute search results**  
  ```ts
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return SETTINGS_SEARCH_INDEX.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.includes(q)) ||
        item.key.includes(q)
    );
  }, [searchQuery]);
  ```

- [ ] **Step 3 — Show search results panel when query is active**  
  ```tsx
  {searchQuery && searchResults.length > 0 && (
    <div className="rounded-[2rem] border border-amber-100 bg-white p-6 shadow-xl">
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
        {searchResults.length} settings found
      </p>
      <div className="space-y-3">
        {searchResults.map((result) => (
          <button
            key={result.key}
            type="button"
            onClick={() => {
              setActiveTab(result.tab);
              setSearchQuery('');
              // Optionally scroll to the field
              setTimeout(() => {
                document.getElementById(`setting-${result.key}`)?.scrollIntoView({
                  behavior: 'smooth', block: 'center',
                });
              }, 100);
            }}
            className="flex w-full items-start gap-3 rounded-2xl border border-slate-100
                       bg-stone-50 p-4 text-left hover:border-amber-200 hover:bg-amber-50/50"
          >
            <div>
              <p className="text-sm font-bold text-slate-900">{result.label}</p>
              <p className="text-xs text-slate-500">{result.description}</p>
              <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5
                               text-[10px] font-black uppercase text-slate-500">
                {result.tab}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )}

  {searchQuery && searchResults.length === 0 && (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-6 text-center">
      <p className="text-sm text-slate-500">No settings match "<strong>{searchQuery}</strong>"</p>
    </div>
  )}
  ```

- [ ] **Step 4 — Add `id` attributes to field containers for scroll-targeting**  
  For each rendered setting field, add `id={`setting-${key}`}` to its wrapper div.

- [ ] **Step 5 — Test the search**  
  - Type "logo" → see Logo URL, Logo Light, Logo Dark fields in results.  
  - Click a result → the correct tab activates and the view scrolls to the field.  
  - Type "smtp" → see email configuration fields.  
  - Type "aramex" → see the Aramex shipping fields.

- [ ] **Step 6 — Commit**  
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
