# AS-03 — `DEFAULT_SETTINGS` Primary Color Is Red but Hub Renders Green

**Severity:** 🔴 Bug  
**Area:** Superadmin Settings — Marketplace Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 247–248  
**Impact:** A fresh install or a reset to defaults sets `marketplace_primary_color` to `#B91C1C` (deep red) and `marketplace_secondary_color` to `#C6922E` (gold). But the entire Hub frontend is hardcoded with `#16C784` (green) as its primary brand color across 50+ Tailwind class strings. This creates a visual mismatch: the settings say "red primary" but the Hub renders green. New operators who deploy without changing this will have contradictory brand configuration.

---

## Root Cause

```ts
// settings/page.tsx:247–248
const DEFAULT_SETTINGS: PlatformSettings = {
  marketplace_primary_color: '#B91C1C',    // ← red (admin panel's own accent color)
  marketplace_secondary_color: '#C6922E',  // ← gold
  // ...
};
```

The admin panel itself uses red/gold as its **interface colors** (not the marketplace's brand colors). The defaults were copied from the admin panel's own CSS, not from the Hub's actual colors.

Additionally, `marketplace_primary_color` and `marketplace_secondary_color` are stored in settings but the **Hub frontend never reads them** — Tailwind classes are hardcoded strings, not CSS variables driven by settings.

---

## Fix Checklist

### Part 1 — Correct the default values

- [ ] **Step 1 — Update the `DEFAULT_SETTINGS` colors**  
  ```ts
  marketplace_primary_color: '#16C784',    // ← Hub's actual green
  marketplace_secondary_color: '#0f9f6e',  // ← Hub's darker green variant
  ```

### Part 2 — Make the Hub actually use the color settings (Full Fix)

- [ ] **Step 2 — Inject CSS custom properties from the settings into the Hub page**  
  In `frontend/src/app/hub/page.tsx`, add an inline `<style>` tag that sets CSS variables:
  ```tsx
  const cssVars = `
    :root {
      --pd-primary: ${marketplaceSettings.marketplace_primary_color || '#16C784'};
      --pd-secondary: ${marketplaceSettings.marketplace_secondary_color || '#0f9f6e'};
    }
  `;

  return (
    <div ...>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      ...
    </div>
  );
  ```

- [ ] **Step 3 — Replace hardcoded color values in `HubHomeContent.tsx` with CSS variables**  
  This is a large refactor. Start with the most visible elements:
  ```tsx
  // BEFORE
  className="text-[#16C784]"
  // AFTER
  className="text-[var(--pd-primary)]"

  // BEFORE
  className="bg-[#16C784]"
  // AFTER
  className="bg-[var(--pd-primary)]"
  ```
  
  > **Priority files to update:**  
  > - `HubHomeContent.tsx` — hero, product cards, category cards  
  > - `HubNavbar.tsx` — hover colors, active states  
  > - `HubFooter.tsx` — icon colors, social link hovers

- [ ] **Step 4 — Add the color variables to Tailwind config (optional but clean)**  
  In `frontend/tailwind.config.ts`:
  ```ts
  theme: {
    extend: {
      colors: {
        'pd-primary':   'var(--pd-primary)',
        'pd-secondary': 'var(--pd-secondary)',
      }
    }
  }
  ```
  Then use `text-pd-primary` instead of `text-[var(--pd-primary)]`.

- [ ] **Step 5 — Test color customization**  
  - Set `marketplace_primary_color` to `#3B82F6` (blue) in settings.  
  - Visit `/hub` → product card prices, icons, and hover states should turn blue.  
  - Revert to `#16C784` and confirm the green returns.

- [ ] **Step 6 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git add frontend/src/app/hub/page.tsx
  git add frontend/src/components/hub/HubHomeContent.tsx
  git commit -m "fix(admin/settings): correct default primary color to match Hub green, inject CSS vars for theming"
  ```

---

## Acceptance Criteria
- `DEFAULT_SETTINGS.marketplace_primary_color` is `#16C784`.
- The Hub homepage visually reflects the `marketplace_primary_color` setting.
- Changing the color in admin settings and saving updates the Hub appearance.
