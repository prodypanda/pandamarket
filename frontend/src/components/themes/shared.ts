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
  slug?: string;
  price: number | string;
  images?: { url: string }[];
  thumbnail?: string | null;
  category?: string;
  marketplace_category_slug?: string | null;
  storefront_category_slug?: string | null;
  storefront_parent_category_slug?: string | null;
  store_id?: string;
  store_name?: string;
}

export function formatStorePrice(productOrPrice: StoreProduct | StoreProduct['price']): string {
  const amount = Number(
    typeof productOrPrice === 'object' ? productOrPrice.price : productOrPrice,
  );
  return `${Number.isFinite(amount) ? amount.toFixed(3) : '0.000'} TND`;
}

export function getStoreProductImage(product: StoreProduct): string {
  return product.images?.[0]?.url || product.thumbnail || '';
}


function slugSegment(value?: string | null): string {
  return (value || 'non-categorized-products')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'non-categorized-products';
}

function productPermalink(product: StoreProduct): string {
  return slugSegment(product.slug || product.title || product.id);
}

export function getStorefrontProductPath(product: StoreProduct, basePath = ''): string {
  const normalizedBase = basePath.replace(/\/$/, '');
  const categorySegments = normalizedBase
    ? [slugSegment(product.marketplace_category_slug || product.category)]
    : [product.storefront_parent_category_slug, product.storefront_category_slug || product.category]
        .filter(Boolean)
        .map((segment) => slugSegment(segment));
  const segments = ['products', ...(categorySegments.length ? categorySegments : ['non-categorized-products']), productPermalink(product)];
  return `${normalizedBase}/${segments.map(encodeURIComponent).join('/')}`;
}

export interface StoreBranding {
  store_id?: string;
  store_host?: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  favicon_url?: string;
  themeCustomization?: ThemeCustomization;
  store_path_base?: string;
  marketplace_name?: string;
  marketplace_logo_url?: string;
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

  const resolvedColors = resolveThemeColors(theme, customization);
  const colors: ResolvedColors = {
    ...resolvedColors,
    primary: branding?.primary_color || resolvedColors.primary,
    secondary: branding?.secondary_color || resolvedColors.secondary,
  };

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
  const primaryColor = colors.primary;

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

