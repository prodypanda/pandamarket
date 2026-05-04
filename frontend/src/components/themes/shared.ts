/**
 * Shared types and utilities for all storefront theme components.
 * ─────────────────────────────────────────────────────────────
 * Every theme component imports these types for consistency.
 */

import {
  type ThemeConfig,
  type ThemeCustomization,
  type LayoutVariation,
  type GridDensity,
  type HeroStyle,
  type ResolvedColors,
  resolveThemeColors,
  getGridClasses,
  getLayoutClasses,
} from '../../lib/themes';

export interface StoreProduct {
  id: string;
  title: string;
  price: number;
  images?: { url: string }[];
  category?: string;
  store_id?: string;
  store_name?: string;
}

export interface StoreBranding {
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  favicon_url?: string;
  themeCustomization?: ThemeCustomization;
}

export interface ThemeProps {
  theme: ThemeConfig;
  storeName: string;
  products?: StoreProduct[];
  branding?: StoreBranding;
}

/**
 * Resolve all customization values for a theme, merging defaults with vendor overrides.
 * Returns everything a theme component needs to render correctly.
 */
export function useThemeCustomization(theme: ThemeConfig, branding?: StoreBranding) {
  const customization = branding?.themeCustomization || {};

  const colors: ResolvedColors = resolveThemeColors(theme, customization);

  const layoutVariation: LayoutVariation =
    customization.layoutVariation || theme.layoutVariations?.[0] || 'default';

  const gridDensity: GridDensity =
    customization.gridDensity || theme.gridDensities?.[0] || 'comfortable';

  const heroStyle: HeroStyle =
    customization.heroStyle || theme.heroStyles?.[0] || 'banner';

  const layout = getLayoutClasses(layoutVariation);
  const gridClasses = getGridClasses(gridDensity);

  // Backward compat: if branding has primary_color but no themeCustomization,
  // use it as the primary color override.
  const primaryColor = branding?.primary_color || colors.primary;

  return {
    colors,
    layoutVariation,
    gridDensity,
    heroStyle,
    layout,
    gridClasses,
    primaryColor,
    customization,
  };
}

/**
 * Generate CSS custom properties from resolved colors.
 * Theme components can spread this on their root element.
 */
export function colorVars(colors: ResolvedColors): React.CSSProperties {
  return {
    '--tc-primary': colors.primary,
    '--tc-secondary': colors.secondary,
    '--tc-accent': colors.accent,
    '--tc-bg': colors.background,
    '--tc-text': colors.text,
    '--tc-header-bg': colors.headerBg,
    '--tc-footer-bg': colors.footerBg,
  } as React.CSSProperties;
}
