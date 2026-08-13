# AS-11 — Homepage Layout Selector Has No Visual Preview of Each Layout

**Severity:** 🟡 Enhancement  
**Area:** Superadmin Settings — Marketplace Tab  
**File:** `frontend/src/app/(admin)/settings/page.tsx`  
**Impact:** The `hub_homepage_layout` setting selects between 6 distinct homepage templates (theme_default, classic, deals, premium_deals, alibaba, amazon). The current UI is a plain `<select>` dropdown with text-only option labels. Admins have no way of knowing what each layout looks like without switching it live. The marketplace theme selector already has a visual card picker — the homepage layout should match this UX.

---

## Enhancement Checklist

- [ ] **Step 1 — Create a layout preview data structure**  
  ```ts
  const HOMEPAGE_LAYOUT_OPTIONS: Array<{
    id: PlatformSettings['hub_homepage_layout'];
    name: string;
    description: string;
    previewColors: [string, string, string];
    badge?: string;
  }> = [
    {
      id: 'theme_default',
      name: 'Theme Default',
      description: 'Automatically uses the layout that matches your selected theme.',
      previewColors: ['#16C784', '#0f9f6e', '#f8fffb'],
    },
    {
      id: 'classic',
      name: 'Classic Hub',
      description: 'Clean green marketplace with hero, category grid, and trending products.',
      previewColors: ['#16C784', '#1EE69A', '#f8fffb'],
    },
    {
      id: 'deals',
      name: 'AliExpress Deals',
      description: 'Red/orange deal-focused layout with flash sales and category rail.',
      previewColors: ['#FF4747', '#FF7A00', '#FFF3E8'],
    },
    {
      id: 'premium_deals',
      name: 'AliExpress 2.0 — Super Deals',
      description: 'Dark ultra-modern glassmorphism aesthetic with premium deal cards.',
      previewColors: ['#FF4747', '#FF8A00', '#09090b'],
      badge: 'Premium',
    },
    {
      id: 'alibaba',
      name: 'Alibaba B2B',
      description: 'Professional wholesale layout with supplier cards and B2B inquiry forms.',
      previewColors: ['#E02020', '#FF6600', '#FFF8F0'],
    },
    {
      id: 'amazon',
      name: 'Amazon Style',
      description: 'Dense product-focused layout with departments sidebar and deal rows.',
      previewColors: ['#FF9900', '#232F3E', '#FEBD69'],
    },
  ];
  ```

- [ ] **Step 2 — Replace the `<select>` with a visual card grid**  
  Using the same card pattern as `renderMarketplaceThemeSelector`:
  ```tsx
  function renderHomepageLayoutSelector() {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {HOMEPAGE_LAYOUT_OPTIONS.map((layout) => {
          const selected = settings.hub_homepage_layout === layout.id;
          return (
            <button
              type="button"
              key={layout.id}
              onClick={() => updateSetting('hub_homepage_layout', layout.id)}
              className={`relative rounded-[1.5rem] border-2 p-5 text-left transition-all
                ${selected
                  ? 'border-[#B91C1C] bg-amber-50/60 shadow-lg shadow-red-900/10'
                  : 'border-slate-100 bg-white hover:border-amber-200 hover:shadow-md'
                }`}
            >
              {layout.badge && (
                <span className="absolute right-4 top-4 rounded-full bg-amber-500 px-2 py-0.5
                                 text-[9px] font-black uppercase text-white">
                  {layout.badge}
                </span>
              )}
              {/* Color swatch preview */}
              <div className="mb-4 overflow-hidden rounded-xl border border-white/70 bg-white shadow-sm">
                <div className="flex h-10 items-center gap-1 px-3"
                     style={{ backgroundColor: layout.previewColors[2] }}>
                  {layout.previewColors.map((color) => (
                    <span key={color} className="h-4 flex-1 rounded-md"
                          style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-2">
                  <span className="h-6 rounded-lg bg-slate-100" />
                  <span className="h-6 rounded-lg bg-slate-100" />
                  <span className="h-6 rounded-lg bg-slate-100" />
                  <span className="col-span-3 h-4 rounded-lg bg-slate-100" />
                </div>
              </div>
              <p className={`font-bold text-sm ${selected ? 'text-[#7F1D1D]' : 'text-slate-900'}`}>
                {layout.name}
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                {layout.description}
              </p>
              {selected && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full
                                 bg-[#B91C1C] px-2 py-0.5 text-[9px] font-black uppercase text-white">
                  ✓ Active
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
  ```

- [ ] **Step 3 — Replace the current `<select>` render call**  
  Find where `hub_homepage_layout` is currently rendered (as a select in the Marketplace tab) and replace with `{renderHomepageLayoutSelector()}`.

- [ ] **Step 4 — Add a warning when layout and theme conflict**  
  ```tsx
  {settings.hub_homepage_layout === 'theme_default' && (
    <p className="text-xs font-bold text-amber-600 mt-2">
      ℹ "Theme Default" will automatically use the {settings.marketplace_theme === 'aliexpress2'
        ? 'AliExpress 2.0' : settings.marketplace_theme === 'aliexpress'
        ? 'AliExpress Deals' : 'Classic Hub'} layout based on your selected theme above.
    </p>
  )}
  ```

- [ ] **Step 5 — Test all 6 layout options**  
  For each layout: select it, save, open `/hub` in a new tab, confirm the correct template renders.

- [ ] **Step 6 — Commit**  
  ```
  git add frontend/src/app/(admin)/settings/page.tsx
  git commit -m "feat(admin/settings): replace hub_homepage_layout select with visual card picker grid"
  ```

---

## Acceptance Criteria
- All 6 homepage layouts are shown as visual cards with color swatches and descriptions.
- The active layout shows an "Active" badge.
- A contextual note explains what "Theme Default" will resolve to based on the current theme.
- The layout selector is positioned directly below the theme selector in the Appearance section.
