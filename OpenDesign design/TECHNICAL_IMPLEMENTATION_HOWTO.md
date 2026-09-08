# OpenDesign Technical Implementation How-To Guide

This technical guide provides step-by-step instructions for engineering teams to integrate the **OpenDesign Design System** into the Next.js and Tailwind CSS codebase without data loss across all 71 pages.

---

## 1. CSS Variables & Tailwind Setup

### Step 1: Register Tokens in `src/styles/globals.css`
Add the OpenDesign token layer into `globals.css`:

```css
@layer base {
  /* OpenDesign Base Tokens */
  :root[data-theme="opendesign"],
  [data-seller-theme="opendesign"],
  [data-admin-theme="opendesign"] {
    --bg: #ffffff;
    --surface: #f5f5f5;
    --fg: #111111;
    --muted: #949494;
    --border: #dedede;
    --accent: #ad0505;

    --ink-2: color-mix(in oklch, var(--fg) 55%, var(--muted));
    --ink-3: color-mix(in oklch, var(--fg) 32%, var(--muted));
    --accent-soft: color-mix(in oklch, var(--accent) 10%, transparent);
    --accent-deep: color-mix(in oklch, var(--accent) 86%, #111111);
    --line-ink: color-mix(in oklch, var(--bg) 18%, transparent);
    --glass: color-mix(in oklch, #ffffff 80%, transparent);

    --shadow-s: 0 1px 2px color-mix(in oklch, var(--fg) 5%, transparent);
    --r: 8px;
    --font: 'Inter', system-ui, -apple-system, sans-serif;
  }

  /* Dark Variant */
  [data-theme="opendesign"].dark,
  [data-seller-theme="opendesign"].dark,
  [data-admin-theme="opendesign"].dark {
    --bg: #0f0f0f;
    --surface: #181818;
    --fg: #f3f3f3;
    --muted: #787878;
    --border: #282828;
    --glass: color-mix(in oklch, #181818 80%, transparent);
  }

  /* Color Accent Variations */
  .acc-ocre { --accent: #c25e2e; }
  .acc-olive { --accent: #5a7d36; }
  .acc-bleu { --accent: #1e6091; }
  .acc-prune { --accent: #7b2cbf; }
  .acc-charbon { --accent: #343a40; }
}
```

### Step 2: Extend `tailwind.config.js`
Expose the OpenDesign tokens as Tailwind utility classes:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'od-bg': 'var(--bg)',
        'od-surface': 'var(--surface)',
        'od-fg': 'var(--fg)',
        'od-muted': 'var(--muted)',
        'od-border': 'var(--border)',
        'od-accent': 'var(--accent)',
        'od-ink-2': 'var(--ink-2)',
        'od-ink-3': 'var(--ink-3)',
        'od-accent-soft': 'var(--accent-soft)',
        'od-accent-deep': 'var(--accent-deep)',
      },
      borderRadius: {
        'od': 'var(--r)',
      },
      boxShadow: {
        'od-s': 'var(--shadow-s)',
      }
    }
  }
}
```

---

## 2. Dual-Dashboard Theme Provider Implementation

### Step 1: Create `src/contexts/DashboardThemeProvider.tsx`

```tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type SellerTheme = 'bento' | 'classique' | 'opendesign';
type AdminTheme = 'mission-control' | 'enterprise' | 'opendesign';
type AccentColor = 'rouge' | 'ocre' | 'olive' | 'bleu' | 'prune' | 'charbon';
type Density = 'compact' | 'standard' | 'airy';

interface ThemeContextType {
  sellerTheme: SellerTheme;
  setSellerTheme: (theme: SellerTheme) => void;
  adminTheme: AdminTheme;
  setAdminTheme: (theme: AdminTheme) => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  density: Density;
  setDensity: (density: Density) => void;
}

const DashboardThemeContext = createContext<ThemeContextType | null>(null);

export function DashboardThemeProvider({
  children,
  initialSellerTheme = 'bento',
  initialAdminTheme = 'mission-control',
}: {
  children: React.ReactNode;
  initialSellerTheme?: SellerTheme;
  initialAdminTheme?: AdminTheme;
}) {
  const [sellerTheme, setSellerThemeState] = useState<SellerTheme>(initialSellerTheme);
  const [adminTheme, setAdminThemeState] = useState<AdminTheme>(initialAdminTheme);
  const [accent, setAccent] = useState<AccentColor>('rouge');
  const [density, setDensity] = useState<Density>('standard');

  const setSellerTheme = (t: SellerTheme) => {
    setSellerThemeState(t);
    document.cookie = `pm_seller_theme=${t}; path=/; max-age=31536000`;
    localStorage.setItem('pm_seller_theme', t);
  };

  const setAdminTheme = (t: AdminTheme) => {
    setAdminThemeState(t);
    document.cookie = `pm_admin_theme=${t}; path=/; max-age=31536000`;
    localStorage.setItem('pm_admin_theme', t);
  };

  return (
    <DashboardThemeContext.Provider
      value={{
        sellerTheme,
        setSellerTheme,
        adminTheme,
        setAdminTheme,
        accent,
        setAccent,
        density,
        setDensity,
      }}
    >
      <div
        data-seller-theme={sellerTheme}
        data-admin-theme={adminTheme}
        className={`acc-${accent} den-${density === 'compact' ? 'comp' : density === 'airy' ? 'air' : 'standard'}`}
      >
        {children}
      </div>
    </DashboardThemeContext.Provider>
  );
}

export const useDashboardTheme = () => {
  const context = useContext(DashboardThemeContext);
  if (!context) throw new Error('useDashboardTheme must be used within DashboardThemeProvider');
  return context;
};
```

---

## 3. Reusable React UI Primitives

### A. `<OpenDesignCard>`
```tsx
export function OpenDesignCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-od border border-od-border bg-od-bg p-4 shadow-od-s ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between border-b border-od-border/60 pb-2.5">
          <div>
            {title && <h3 className="text-sm font-bold text-od-fg">{title}</h3>}
            {subtitle && <p className="text-xs text-od-ink-2">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
```

### B. `<OpenDesignKpiHero>`
```tsx
export function OpenDesignKpiHero({
  label,
  value,
  delta,
  isPositive,
  sparklineData,
}: {
  label: string;
  value: string;
  delta?: string;
  isPositive?: boolean;
  sparklineData?: number[];
}) {
  return (
    <div className="rounded-od border border-od-border bg-od-bg p-3.5 shadow-od-s flex flex-col justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wider text-od-ink-2">{label}</span>
      <div className="my-1 text-2xl font-black tracking-tight text-od-fg tabular-nums">{value}</div>
      {delta && (
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            isPositive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
          }`}>
            {delta}
          </span>
          <span className="text-[10px] text-od-ink-3">vs période précédente</span>
        </div>
      )}
    </div>
  );
}
```

### C. `<OpenDesignAmtBox>` (Tunisian Dinar Formatter)
```tsx
export function OpenDesignAmtBox({ millimes }: { millimes: number }) {
  const dinars = Math.floor(millimes / 1000);
  const remainder = String(millimes % 1000).padStart(3, '0');

  return (
    <span className="inline-flex items-baseline font-mono tabular-nums font-bold text-od-fg">
      <span className="text-base">{dinars}</span>
      <span className="text-xs text-od-ink-2">.{remainder}</span>
      <span className="ml-1 text-[10px] font-semibold text-od-ink-3">TND</span>
    </span>
  );
}
```

---

## 4. Enforcing the 8-Layer Anatomical Layout Wrapper

Create `src/components/dashboard/DashboardPageWrapper.tsx` to automatically structure every page:

```tsx
export function DashboardPageWrapper({
  breadcrumbs,
  headerTitle,
  headerIcon: HeaderIcon,
  statusBadge,
  primaryAction,
  secondaryAction,
  alertBanner,
  kpiStrip,
  filterToolbar,
  mainContent,
  drawer,
  modals,
}: {
  breadcrumbs: Array<{ label: string; href?: string }>;
  headerTitle: string;
  headerIcon?: React.ComponentType<{ className?: string }>;
  statusBadge?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  alertBanner?: React.ReactNode;
  kpiStrip?: React.ReactNode;
  filterToolbar?: React.ReactNode;
  mainContent: React.ReactNode;
  drawer?: React.ReactNode;
  modals?: React.ReactNode;
}) {
  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Layer 1: Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-od-ink-2">
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-od-border">/</span>}
            {b.href ? (
              <a href={b.href} className="hover:text-od-fg transition-colors">{b.label}</a>
            ) : (
              <span className="font-bold text-od-fg">{b.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Layer 2: Page Header Bar */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-od-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          {HeaderIcon && <HeaderIcon className="w-5 h-5 text-od-accent" />}
          <h1 className="text-xl font-black tracking-tight text-od-fg">{headerTitle}</h1>
          {statusBadge && (
            <span className="rounded-full bg-od-accent-soft px-2 py-0.5 text-[10px] font-extrabold uppercase text-od-accent">
              {statusBadge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {secondaryAction}
          {primaryAction}
        </div>
      </header>

      {/* Layer 3: Critical Alert Banner (Conditional) */}
      {alertBanner && <div>{alertBanner}</div>}

      {/* Layer 4: Telemetry & KPI Cards Strip */}
      {kpiStrip && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{kpiStrip}</div>}

      {/* Layer 5: Control Bar & Filter Toolbar */}
      {filterToolbar && <div className="rounded-od border border-od-border bg-od-bg p-2 shadow-od-s">{filterToolbar}</div>}

      {/* Layer 6: Main Operational Working Area */}
      <main>{mainContent}</main>

      {/* Layer 7: Detail Inspection Drawer */}
      {drawer}

      {/* Layer 8: Focus-Trapped Modals */}
      {modals}
    </div>
  );
}
```
