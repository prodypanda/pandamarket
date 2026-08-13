# AS-09 — Theme Selector Buried in Long Scrollable Tab

**Severity:** 🟡 Enhancement  
**Area:** Superadmin Settings — Marketplace Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Line:** 1203–1257 (`renderMarketplaceThemeSelector`)  
**Impact:** The marketplace theme selector (Panda Classic / AliExpress / AliExpress 2.0) is a visually rich component but is buried inside the Marketplace tab alongside 40+ other fields. Admins who want to change the theme must scroll past logos, URLs, locales, contact info, and social links to find it. This is the most impactful visual setting and deserves top-of-tab prominence.

---

## Enhancement Checklist

- [ ] **Step 1 — Move the theme selector to the TOP of the Marketplace tab**  
  In the Marketplace tab render section, restructure so the theme selector is the first visible section — before logo, branding, or any other settings.

- [ ] **Step 2 — Add a prominent `SectionHeader` for the theme card**  
  ```tsx
  <SectionHeader
    icon={<LayoutGrid className="h-5 w-5" />}
    title="Marketplace Theme & Layout"
    description="Choose the visual identity and homepage layout of your marketplace. This affects all buyers."
  />
  ```

- [ ] **Step 3 — Add a visual "currently active" badge to the selected theme**  
  In `renderMarketplaceThemeSelector`, add a badge to the selected card:
  ```tsx
  {selected && (
    <span className="absolute top-3 right-3 rounded-full bg-[#B91C1C] px-2 py-0.5
                     text-[10px] font-black text-white uppercase">
      Active
    </span>
  )}
  ```

- [ ] **Step 4 — Add the homepage layout selector immediately after the theme selector**  
  The `hub_homepage_layout` select (currently a plain `<select>` elsewhere in the tab) should become a visual card grid similar to the theme selector. See note **AS-11** for implementation of visual layout cards.

- [ ] **Step 5 — Group the entire "Appearance" block with a collapsible section**  
  Wrap the theme + layout + color pickers in a named section that can be collapsed:
  ```tsx
  <details open className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
    <summary className="flex cursor-pointer items-center gap-3 p-6 font-black text-slate-900">
      <LayoutGrid className="h-5 w-5 text-[#B91C1C]" />
      Appearance
    </summary>
    <div className="border-t border-slate-100 p-6 space-y-6">
      {renderMarketplaceThemeSelector()}
      {/* homepage layout cards */}
      {/* color pickers */}
    </div>
  </details>
  ```

- [ ] **Step 6 — Also add a "quick change theme" shortcut on the main settings header card**  
  The header card (lines 1423–1445) shows "Theme: panda". Make this clickable:
  ```tsx
  <button
    onClick={() => setActiveTab('marketplace')}
    className="..."
  >
    <p className="text-xs font-bold uppercase tracking-wider text-amber-100">Theme</p>
    <p className="mt-2 text-lg font-black capitalize">{settings.marketplace_theme}</p>
    <p className="text-[10px] text-white/50 mt-1">Click to change →</p>
  </button>
  ```

- [ ] **Step 7 — Test visual ordering**  
  Open admin settings → click "Marketplace & Hero" tab → the theme selector should be the first section visible without scrolling.

- [ ] **Step 8 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): elevate theme selector to top of Marketplace tab with Appearance section"
  ```

---

## Acceptance Criteria
- The theme selector is the first section visible in the Marketplace tab (no scrolling required).
- A clear "Active" badge highlights the currently selected theme.
- The color pickers are grouped in the same Appearance section as the theme selector.
