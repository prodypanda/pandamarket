# HH-15 — RTL Support Incomplete in Footer Social Links

**Severity:** 🟡 Enhancement (Internationalization)  
**Area:** Hub Footer  
**File:** `frontend/src/components/hub/HubFooter.tsx`  
**Line:** 124–129  
**Impact:** When Arabic (`ar`) locale is active and RTL is enabled, the footer's social links row uses `flex-wrap` without `dir="rtl"` or logical CSS properties. Physical properties (`left`, `right`, `ml-*`, `mr-*`) in `StorefrontSocialLinks` will mirror incorrectly, with link order appearing reversed relative to reading direction.

---

## Root Cause

```tsx
// HubFooter.tsx:124–129
<StorefrontSocialLinks
  branding={marketplaceBranding}
  showContact
  className="mt-4 flex flex-wrap items-center gap-3"   // ← no dir, no RTL class
  linkClassName={socialLinkClass}
/>
```

The `HubFooter` component uses `useMarketplaceTheme(props)` which provides `settings` including RTL, but the RTL status is not passed down to `StorefrontSocialLinks`.

---

## Enhancement Checklist

- [ ] **Step 1 — Check if `HubFooter` has access to the RTL flag**  
  The footer uses `useMarketplaceTheme(props)` which returns `settings`. Check if `settings.marketplace_rtl_enabled` is accessible:
  ```ts
  const { settings, classes, isAliExpress, isAliExpress2 } = useMarketplaceTheme(props);
  const isRtl = settings.marketplace_rtl_enabled === true || settings.marketplace_rtl_enabled === 'true';
  ```

- [ ] **Step 2 — Add `dir` attribute to the `StorefrontSocialLinks` container**  
  ```tsx
  <StorefrontSocialLinks
    branding={marketplaceBranding}
    showContact
    className={`mt-4 flex flex-wrap items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}
    linkClassName={socialLinkClass}
    dir={isRtl ? 'rtl' : 'ltr'}
  />
  ```

  Or, if `StorefrontSocialLinks` doesn't accept a `dir` prop, wrap it:
  ```tsx
  <div dir={isRtl ? 'rtl' : undefined} className="mt-4">
    <StorefrontSocialLinks
      branding={marketplaceBranding}
      showContact
      className="flex flex-wrap items-center gap-3"
      linkClassName={socialLinkClass}
    />
  </div>
  ```

- [ ] **Step 3 — Check `StorefrontSocialLinks` for physical margin/padding properties**  
  Open `frontend/src/components/themes/StorefrontSocialLinks.tsx`.  
  Search for `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`.  
  Replace with logical equivalents: `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`.

- [ ] **Step 4 — Apply the same check to the footer's main grid**  
  The footer uses `grid grid-cols-2 md:grid-cols-4 gap-8`. In RTL, grid columns flow right-to-left by default with `dir="rtl"`. Ensure the footer's root `<footer>` element has the correct `dir` attribute.  
  Add to `HubFooter.tsx`:
  ```tsx
  <footer
    dir={isRtl ? 'rtl' : undefined}
    className={...}
  >
  ```

- [ ] **Step 5 — Test with Arabic locale**  
  - In admin settings → set `marketplace_default_locale` to `ar`.  
  - Set `marketplace_rtl_enabled` to `true`.  
  - Visit `/hub` → footer columns should mirror (Support on the left, Brand on the right in RTL).  
  - Social icons should be ordered right-to-left.

- [ ] **Step 6 — Commit**  
  ```
  git add frontend/src/components/hub/HubFooter.tsx
  git add frontend/src/components/themes/StorefrontSocialLinks.tsx
  git commit -m "i18n(hub): fix RTL layout in footer social links and grid for Arabic locale"
  ```

---

## Acceptance Criteria
- With RTL enabled, the footer grid mirrors correctly.
- Social link icons are ordered right-to-left in Arabic mode.
- No physical CSS properties (`ml-`, `mr-`) remain in RTL-sensitive components.
