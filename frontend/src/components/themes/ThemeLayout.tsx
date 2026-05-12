/**
 * ThemeLayout — Reusable layout wrapper for storefront themes.
 * ─────────────────────────────────────────────────────────────
 * Handles layout variations (default, sidebar, full-width, magazine)
 * and renders an optional category sidebar for the 'sidebar' variation.
 *
 * Usage in any theme component:
 *   <ThemeLayout variation={layoutVariation} layout={layout} categories={cats}>
 *     <ProductGrid ... />
 *   </ThemeLayout>
 */

import React from 'react';
import type { ResolvedColors } from '../../lib/themes';

interface ThemeLayoutProps {
  variation: string;
  layout: {
    container: string;
    hasSidebar: boolean;
    sidebarWidth: string;
    mainWidth: string;
  };
  colors: ResolvedColors;
  categories?: string[];
  activeCategory?: string;
  onCategoryChange?: (cat: string) => void;
  children: React.ReactNode;
}

export function ThemeLayout({
  layout,
  colors,
  categories = [],
  activeCategory,
  children,
}: ThemeLayoutProps) {
  if (!layout.hasSidebar) {
    return <div className={layout.container}>{children}</div>;
  }

  // Sidebar layout
  return (
    <div className={`${layout.container} flex gap-8`}>
      {/* Sidebar */}
      <aside className={`${layout.sidebarWidth} hidden lg:block`}>
        <div
          className="sticky top-24 rounded-xl p-5"
          style={{ backgroundColor: colors.secondary, color: colors.text }}
        >
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: colors.accent }}>
            Catégories
          </h3>
          <nav className="space-y-1">
            <SidebarLink
              label="Tous les produits"
              active={!activeCategory}
              colors={colors}
            />
            {categories.map((cat) => (
              <SidebarLink
                key={cat}
                label={cat}
                active={activeCategory === cat}
                colors={colors}
              />
            ))}
          </nav>

          {/* Filter section placeholder */}
          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: colors.accent }}>
              Prix
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="number"
                placeholder="Min"
                className="w-full px-2 py-1.5 rounded-md border text-xs"
                style={{ borderColor: `${colors.accent}30`, backgroundColor: colors.background, color: colors.text }}
              />
              <span style={{ color: colors.text }}>—</span>
              <input
                type="number"
                placeholder="Max"
                className="w-full px-2 py-1.5 rounded-md border text-xs"
                style={{ borderColor: `${colors.accent}30`, backgroundColor: colors.background, color: colors.text }}
              />
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: colors.accent }}>
              Tri
            </h3>
            <select
              className="w-full px-2 py-1.5 rounded-md border text-xs"
              style={{ borderColor: `${colors.accent}30`, backgroundColor: colors.background, color: colors.text }}
            >
              <option>Plus récents</option>
              <option>Prix croissant</option>
              <option>Prix décroissant</option>
              <option>Populaires</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={layout.mainWidth}>{children}</div>
    </div>
  );
}

function SidebarLink({
  label,
  active,
  colors,
}: {
  label: string;
  active: boolean;
  colors: ResolvedColors;
}) {
  return (
    <button
      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
      style={{
        backgroundColor: active ? `${colors.primary}15` : 'transparent',
        color: active ? colors.primary : colors.text,
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}
