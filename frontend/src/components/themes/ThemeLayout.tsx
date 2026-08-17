'use client';

/**
 * ThemeLayout — Reusable layout wrapper for storefront themes.
 * ─────────────────────────────────────────────────────────────
 * Handles layout variations (default, sidebar, full-width, magazine)
 * and renders functional category, price, and sort sidebar controls.
 */

import React, { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { ResolvedColors } from '../../lib/themes';

export interface ThemeCategoryItem {
  id?: string;
  name: string;
  slug?: string;
  children?: ThemeCategoryItem[];
}

interface ThemeLayoutProps {
  variation: string;
  layout: {
    container: string;
    hasSidebar: boolean;
    sidebarWidth: string;
    mainWidth: string;
  };
  colors: ResolvedColors;
  categories?: (string | ThemeCategoryItem)[];
  activeCategory?: string;
  onCategoryChange?: (cat: string) => void;
  children: React.ReactNode;
}

export function ThemeLayout({
  layout,
  colors,
  categories = [],
  activeCategory,
  onCategoryChange,
  children,
}: ThemeLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCategoryParam = searchParams.get('category') || activeCategory;
  const activeSortParam = searchParams.get('sort') || 'newest';
  const [priceMinInput, setPriceMinInput] = useState(searchParams.get('price_min') || '');
  const [priceMaxInput, setPriceMaxInput] = useState(searchParams.get('price_max') || '');

  const updateParam = (key: string, val: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === null || val === '') {
      params.delete(key);
    } else {
      params.set(key, val);
    }
    params.delete('page');
    const targetUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(targetUrl, { scroll: false });
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (priceMinInput.trim()) params.set('price_min', priceMinInput.trim());
    else params.delete('price_min');

    if (priceMaxInput.trim()) params.set('price_max', priceMaxInput.trim());
    else params.delete('price_max');

    params.delete('page');
    const targetUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(targetUrl, { scroll: false });
  };

  if (!layout.hasSidebar) {
    return <div className={layout.container}>{children}</div>;
  }

  // Sidebar layout
  return (
    <div className={`${layout.container} flex gap-8`}>
      {/* Sidebar */}
      <aside className={`${layout.sidebarWidth} hidden lg:block`}>
        <div
          className="sticky top-24 rounded-xl p-5 shadow-xs border border-slate-100"
          style={{ backgroundColor: colors.secondary, color: colors.text }}
        >
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: colors.accent }}>
            Catégories
          </h3>
          <nav className="space-y-1">
            <SidebarLink
              label="Tous les produits"
              active={!activeCategoryParam}
              colors={colors}
              onClick={() => {
                if (onCategoryChange) onCategoryChange('');
                updateParam('category', null);
              }}
            />
            {categories.map((item) => {
              const name = typeof item === 'string' ? item : item.name;
              const slug = typeof item === 'string' ? item : item.slug || item.name;
              const children = typeof item === 'object' && Array.isArray(item.children) ? item.children : [];
              const isActive = activeCategoryParam === slug || activeCategoryParam === name;

              return (
                <div key={slug} className="flex flex-col">
                  <SidebarLink
                    label={name}
                    active={isActive}
                    colors={colors}
                    onClick={() => {
                      if (onCategoryChange) onCategoryChange(slug);
                      updateParam('category', slug);
                    }}
                  />
                  {children.length > 0 && (
                    <div className="pl-4 border-l border-slate-200/60 ml-3 my-1 space-y-0.5">
                      {children.map((sub) => {
                        const subName = typeof sub === 'string' ? sub : sub.name;
                        const subSlug = typeof sub === 'string' ? sub : sub.slug || sub.name;
                        const isSubActive = activeCategoryParam === subSlug || activeCategoryParam === subName;

                        return (
                          <SidebarLink
                            key={subSlug}
                            label={subName}
                            active={isSubActive}
                            colors={colors}
                            isSub
                            onClick={() => {
                              if (onCategoryChange) onCategoryChange(subSlug);
                              updateParam('category', subSlug);
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Price Range Filter */}
          <form onSubmit={handlePriceSubmit} className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: colors.accent }}>
              Prix (DT)
            </h3>
            <div className="flex items-center gap-2 text-xs mb-2">
              <input
                type="number"
                placeholder="Min"
                value={priceMinInput}
                onChange={(e) => setPriceMinInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded-md border text-xs"
                style={{ borderColor: `${colors.accent}30`, backgroundColor: colors.background, color: colors.text }}
              />
              <span style={{ color: colors.text }}>—</span>
              <input
                type="number"
                placeholder="Max"
                value={priceMaxInput}
                onChange={(e) => setPriceMaxInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded-md border text-xs"
                style={{ borderColor: `${colors.accent}30`, backgroundColor: colors.background, color: colors.text }}
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 text-xs font-bold rounded-lg border transition hover:opacity-90"
              style={{
                borderColor: colors.primary,
                backgroundColor: colors.primary,
                color: '#ffffff',
              }}
            >
              Filtrer par prix
            </button>
          </form>

          {/* Sort Selector */}
          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: colors.accent }}>
              Tri
            </h3>
            <select
              value={activeSortParam}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="w-full px-2 py-1.5 rounded-md border text-xs"
              style={{ borderColor: `${colors.accent}30`, backgroundColor: colors.background, color: colors.text }}
            >
              <option value="newest">Plus récents</option>
              <option value="oldest">Plus anciens</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="title_asc">Nom A-Z</option>
              <option value="popular">Populaires</option>
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
  isSub = false,
  onClick,
}: {
  label: string;
  active: boolean;
  colors: ResolvedColors;
  isSub?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg transition-colors cursor-pointer ${
        isSub ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'
      }`}
      style={{
        backgroundColor: active ? `${colors.primary}15` : 'transparent',
        color: active ? colors.primary : colors.text,
        fontWeight: active ? 600 : isSub ? 450 : 400,
      }}
    >
      {isSub ? `↳ ${label}` : label}
    </button>
  );
}
