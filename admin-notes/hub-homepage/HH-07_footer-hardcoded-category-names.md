# HH-07 — Footer Marketplace Column Has Hardcoded English Category Names

**Severity:** 🔴 Bug  
**Area:** Hub Footer  
**File:** `frontend/src/components/hub/HubFooter.tsx`  
**Line:** 136–141  
**Impact:** The footer "Marketplace" column always shows "Electronics", "Fashion", and "Home" regardless of:
1. The active locale (shows English to Arabic/French users)
2. The actual platform categories (may not have these exact slugs)
This breaks trust for non-English users and creates dead links if those categories don't exist.

---

## Root Cause

```tsx
// HubFooter.tsx:135–141
<div>
  <h4>Marketplace</h4>
  <ul>
    <li><Link href="/hub/search">{t('nav.explore')}</Link></li>
    <li><Link href="/hub/search?category=Electronics">Electronics</Link></li>  {/* ← hardcoded EN */}
    <li><Link href="/hub/search?category=Fashion">Fashion</Link></li>           {/* ← hardcoded EN */}
    <li><Link href="/hub/search?category=Home">Home</Link></li>                 {/* ← hardcoded EN */}
    <li><Link href="/hub/pricing">{t('nav.pricing')}</Link></li>
  </ul>
</div>
```

The links are hardcoded with English category names that are not guaranteed to exist on the platform.

---

## Fix Checklist

### Option A — Use i18n keys (Quick Fix, Medium Impact)

- [x] **Step 1 — Add translation keys for these category names**  
- [x] **Step 2 — Replace hardcoded strings with `t()` calls**  

### Option B — Dynamically use real platform categories (Full Fix, High Impact)

- [x] **Step 3 — Pass top categories as a prop to `HubFooter`**  
  In `hub/page.tsx`, after loading `categories`, slice the top 3 non-default ones:
  ```ts
  const footerCategories = orderedCategories.filter(c => !c.is_default).slice(0, 3);
  ```

- [x] **Step 4 — Extend `HubFooter` props to accept categories**  
  ```ts
  export function HubFooter(props: MarketplaceThemeSettings & { topCategories?: Array<{name: string; slug: string}> }) {
    const { topCategories = [] } = props;
    // ...
  }
  ```

- [x] **Step 5 — Render dynamic category links in the footer**  
  ```tsx
  {dynamicCategories.map(cat => (
    <li key={cat.slug}>
      <Link href={`/hub/search?category=${encodeURIComponent(cat.slug)}`} className={linkClass}>
        {cat.name}
      </Link>
    </li>
  ))}
  ```

- [x] **Step 6 — Pass the prop at the call site**  
  In `hub/page.tsx`:
  ```tsx
  <HubFooter {...marketplaceSettings} topCategories={footerCategories} />
  ```

- [x] **Step 7 — Test in all locales**  
  - Switch to French → category names should be in French.  
  - Switch to Arabic → category names should be in Arabic.  
  - Remove the "Electronics" category from the DB → link should disappear gracefully.

- [x] **Step 8 — Commit**  
  ```
  git add frontend/src/components/hub/HubFooter.tsx frontend/src/app/hub/page.tsx
  git commit -m "fix(hub): replace hardcoded English footer category names with dynamic/localized values"
  ```

---

## Acceptance Criteria
- Footer category links show the platform's actual category names.
- Category names are displayed in the user's active locale.
- No broken category links when category slugs don't exist on the platform.
