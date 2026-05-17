/**
 * Shared types and utilities for all storefront theme components.
 * ─────────────────────────────────────────────────────────────
 * Every theme component imports these types for consistency.
 */

import {
  type ThemeConfig,
  type ThemeCustomization,
  type ThemeId,
  type LayoutVariation,
  type GridDensity,
  type HeroStyle,
  type ResolvedColors,
  resolveThemeColors,
  getGridClasses,
  getLayoutClasses,
} from '../../lib/themes';
import { selectLogoForSurface, type LogoSurface } from '../../lib/public-assets';

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
  logo_light_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  themeCustomization?: ThemeCustomization;
  store_path_base?: string;
  marketplace_name?: string;
  marketplace_logo_url?: string;
  marketplace_logo_light_url?: string;
  marketplace_logo_dark_url?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  map_embed_url?: string | null;
  social?: StoreSocialLinks | null;
}

export type StoreSocialPlatform = 'facebook' | 'instagram' | 'x' | 'tiktok' | 'youtube' | 'linkedin' | 'whatsapp' | 'telegram' | 'pinterest' | 'snapchat';

export type StoreSocialLinks = Partial<Record<StoreSocialPlatform, string>>;

export interface ThemeProps {
  theme: ThemeConfig;
  storeName: string;
  products?: StoreProduct[];
  branding?: StoreBranding;
}

export function getStoreBrandLogo(branding?: StoreBranding, surface: LogoSurface = 'light'): string {
  return selectLogoForSurface({
    logo_url: branding?.logo_url,
    logo_light_url: branding?.logo_light_url,
    logo_dark_url: branding?.logo_dark_url,
  }, surface);
}

export function getLogoSurfaceForColor(color?: string | null, fallback: LogoSurface = 'light'): LogoSurface {
  const normalized = color?.trim().replace(/^#/, '');
  if (!normalized) return fallback;
  const hex = normalized.length === 3
    ? normalized.split('').map((character) => `${character}${character}`).join('')
    : normalized;
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
  const red = parseInt(hex.slice(0, 2), 16) / 255;
  const green = parseInt(hex.slice(2, 4), 16) / 255;
  const blue = parseInt(hex.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance < 0.48 ? 'dark' : 'light';
}

export function getStoreThemeLogoSurface(themeId?: ThemeId): LogoSurface {
  return themeId && ['modern', 'techhub', 'neon', 'digital', 'luxe'].includes(themeId) ? 'dark' : 'light';
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

