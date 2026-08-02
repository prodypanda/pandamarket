import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { StoreCartIcon } from '../../../../../components/store/StoreCartIcon';
import { SafePageRenderer } from '../../../../../components/page-builder/SafePageRenderer';
import { getMarketplaceSettings } from '@/lib/marketplace-settings';
import { getStoreRouteContext } from '@/lib/store-routing';
import {
  PAGE_BUILDER_REVALIDATE_SECONDS,
  pageBuilderPageTag,
  pageBuilderStoreTag,
} from '@/lib/page-builder-cache';
import { MarketplaceBrand } from '../../../../../components/MarketplaceBrand';
import { StorefrontSocialLinks } from '../../../../../components/themes/StorefrontSocialLinks';
import { getStoreThemeLogoSurface, type StoreBranding, type StoreSocialLinks } from '../../../../../components/themes/shared';
import { resolveThemeColors, themes, type ThemeCustomization, type ThemeId } from '../../../../../lib/themes';
import { selectLogoForSurface } from '../../../../../lib/public-assets';
import { STORE_DATA_REVALIDATE_SECONDS, storeHostTag } from '@/lib/store-cache';
import { renderStorefrontTheme } from '../../../../../components/themes/ThemeWrapper';

/**
 * Storefront Custom Page Renderer
 * ────────────────────────────────────────────────────────────
 * Renders published Page Builder pages for a vendor's storefront.
 * The page content (HTML + CSS) is compiled by GrapesJS and stored
 * in the database. We render it server-side for fast SSR — no
 * GrapesJS runtime is needed on the public site.
 *
 * Route: /store/[storeHost]/pages/[slug]
 * Example: /store/boutique1/pages/about
 */

interface StorePageData {
  id: string;
  slug: string;
  title: string;
  html: string;
  css: string;
  is_homepage: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image?: string | null;
  noindex?: boolean;
  show_in_navigation?: boolean;
  show_in_footer?: boolean;
  sort_order?: number | null;
}

interface StoreData {
  id: string;
  name: string;
  description?: string | null;
  theme_id: ThemeId;
  status?: string | null;
  is_verified?: boolean | null;
  shipping_mode?: string | null;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    logo_light_url?: string;
    logo_dark_url?: string;
    themeCustomization?: ThemeCustomization;
    store_description?: string | null;
    description?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    map_embed_url?: string | null;
    social?: StoreSocialLinks | null;
    [key: string]: unknown;
  };
}

interface StoreProduct {
  id: string;
  title: string;
  slug?: string | null;
  price: number | string;
  thumbnail?: string | null;
  images?: Array<string | { url: string }>;
  category?: string | null;
  marketplace_category_name?: string | null;
  marketplace_category_slug?: string | null;
  storefront_category_name?: string | null;
  storefront_category_slug?: string | null;
  storefront_parent_category_slug?: string | null;
}

type PageSearchParams = Record<string, string | string[] | undefined>;

function getSearchParam(params: PageSearchParams | undefined, key: string): string | undefined {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

async function getStoreByHost(host: string): Promise<StoreData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/stores/by-host/${encodeURIComponent(host)}`, {
      next: { revalidate: STORE_DATA_REVALIDATE_SECONDS, tags: [storeHostTag(host)] },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.store;
  } catch {
    return null;
  }
}

async function getPublishedPage(storeId: string, slug: string): Promise<StorePageData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(
      `${backendUrl}/api/pd/stores/${storeId}/pages/${encodeURIComponent(slug)}`,
      {
        next: {
          revalidate: PAGE_BUILDER_REVALIDATE_SECONDS,
          tags: [pageBuilderStoreTag(storeId), pageBuilderPageTag(storeId, slug)],
        },
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.page;
  } catch {
    return null;
  }
}

async function getDraftPreviewPage(storeId: string, token: string, slug: string): Promise<StorePageData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const query = new URLSearchParams({ token, slug });
    const res = await fetch(
      `${backendUrl}/api/pd/stores/${storeId}/page-builder-preview?${query.toString()}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.page;
  } catch {
    return null;
  }
}

async function getPublishedPages(storeId: string): Promise<StorePageData[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/stores/${storeId}/pages`, {
      next: {
        revalidate: PAGE_BUILDER_REVALIDATE_SECONDS,
        tags: [pageBuilderStoreTag(storeId)],
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

async function getStoreProducts(storeId: string): Promise<StoreProduct[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/products/public?store_id=${storeId}&limit=100`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

async function getStoreNavigation(storeId: string) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/stores/storefront/v1/navigation?store_id=${storeId}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data.navigation || data.data || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Dynamic SEO metadata for custom pages.
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ storeHost: string; slug: string }>;
  searchParams?: Promise<PageSearchParams>;
}): Promise<Metadata> {
  const { storeHost, slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const previewToken = getSearchParam(resolvedSearchParams, 'pb_preview');
  const store = await getStoreByHost(decodeURIComponent(storeHost));
  if (!store) return { title: 'Page introuvable' };
  const isPublicStore = store.status === 'verified' && store.is_verified === true;
  if (!previewToken && !isPublicStore) {
    return { title: 'Page introuvable', robots: { index: false, follow: false } };
  }

  const page = previewToken
    ? await getDraftPreviewPage(store.id, previewToken, slug)
    : await getPublishedPage(store.id, slug);
  if (!page) return { title: 'Page introuvable' };

  const title = page.seo_title || `${page.title} — ${store.name}`;
  const description = page.seo_description || store.description || `Découvrez ${page.title} chez ${store.name}.`;
  const activeTheme = themes[store.theme_id] || themes.classic;
  const logoUrl = selectLogoForSurface({
    logo_url: store.settings?.logo_url,
    logo_light_url: store.settings?.logo_light_url,
    logo_dark_url: store.settings?.logo_dark_url,
  }, getStoreThemeLogoSurface(activeTheme.id));
  const imageUrl = page.og_image || logoUrl;

  return {
    title,
    description,
    robots: previewToken || page.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(imageUrl ? { images: [{ url: imageUrl, alt: title }] } : {}),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export default async function CustomStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ storeHost: string; slug: string }>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { storeHost, slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const previewToken = getSearchParam(resolvedSearchParams, 'pb_preview');
  const isPreview = Boolean(previewToken);
  const decodedHost = decodeURIComponent(storeHost);

  const store = await getStoreByHost(decodedHost);
  if (!store) notFound();

  const isPublicStore = store.status === 'verified' && store.is_verified === true;
  if (!isPreview && !isPublicStore) notFound();

  const { storePathBase } = await getStoreRouteContext(storeHost);

  const page = previewToken
    ? await getDraftPreviewPage(store.id, previewToken, slug)
    : await getPublishedPage(store.id, slug);
  if (!page) notFound();

  const activeTheme = themes[store.theme_id] || themes.classic;
  const themeCustomization = (store.settings?.themeCustomization || {}) as ThemeCustomization;
  const resolvedColors = resolveThemeColors(activeTheme, themeCustomization);
  const primaryColor = store.settings?.colors?.primary || themeCustomization?.customColors?.primary || resolvedColors.primary;
  const logoUrl = selectLogoForSurface({
    logo_url: store.settings?.logo_url as string | undefined,
    logo_light_url: store.settings?.logo_light_url as string | undefined,
    logo_dark_url: store.settings?.logo_dark_url as string | undefined,
  }, getStoreThemeLogoSurface(activeTheme.id));
  const [marketplaceSettings, products, pageLinks, navigation] = await Promise.all([
    getMarketplaceSettings(),
    getStoreProducts(store.id),
    getPublishedPages(store.id),
    getStoreNavigation(store.id),
  ]);
  const footerBranding: StoreBranding = {
    marketplace_name: marketplaceSettings.marketplace_name,
    marketplace_logo_url: marketplaceSettings.marketplace_logo_url,
    marketplace_logo_light_url: marketplaceSettings.marketplace_logo_light_url,
    marketplace_logo_dark_url: marketplaceSettings.marketplace_logo_dark_url,
    contact_email: store.settings?.contact_email,
    contact_phone: store.settings?.contact_phone,
    address: store.settings?.address,
    city: store.settings?.city,
    country: store.settings?.country,
    map_embed_url: store.settings?.map_embed_url,
    social: store.settings?.social,
  };
  const navigationPages = pageLinks.filter((link) => link.show_in_navigation && link.slug !== page.slug);
  const footerPages = pageLinks.filter((link) => link.show_in_footer && link.slug !== page.slug);

  const storeBranding: StoreBranding = {
    store_id: store.id,
    store_host: storeHost,
    primary_color: primaryColor,
    secondary_color: store.settings?.colors?.secondary as string | undefined,
    logo_url: store.settings?.logo_url as string | undefined,
    logo_light_url: store.settings?.logo_light_url as string | undefined,
    logo_dark_url: store.settings?.logo_dark_url as string | undefined,
    favicon_url: store.settings?.favicon_url as string | undefined,
    themeCustomization,
    store_path_base: storePathBase,
    marketplace_name: marketplaceSettings.marketplace_name,
    marketplace_logo_url: marketplaceSettings.marketplace_logo_url,
    marketplace_logo_light_url: marketplaceSettings.marketplace_logo_light_url,
    marketplace_logo_dark_url: marketplaceSettings.marketplace_logo_dark_url,
    contact_email: store.settings?.contact_email,
    contact_phone: store.settings?.contact_phone,
    address: store.settings?.address,
    city: store.settings?.city,
    country: store.settings?.country,
    map_embed_url: store.settings?.map_embed_url,
    social: store.settings?.social,
  };

  return renderStorefrontTheme({
    theme: activeTheme,
    storeName: store.name,
    products,
    branding: storeBranding,
    navigation,
    children: (
      <div>
        {isPreview && (
          <div className="border-b border-amber-300 bg-amber-100 px-6 py-2 text-center text-sm font-semibold text-amber-900">
            Aperçu brouillon — cette version n’est pas publiée.
          </div>
        )}
        <SafePageRenderer
          html={page.html}
          css={page.css}
          analytics={isPreview ? undefined : { storeId: store.id, pageId: page.id, enabled: true }}
          dynamicContext={{
            storeName: store.name,
            storeDescription: store.description || store.settings?.store_description || store.settings?.description,
            storePathBase,
            primaryColor,
            logoUrl,
            contactEmail: store.settings?.contact_email,
            contactPhone: store.settings?.contact_phone,
            address: store.settings?.address,
            city: store.settings?.city,
            country: store.settings?.country,
            shippingMode: store.shipping_mode,
            shippingPolicy: typeof store.settings?.shipping_policy === 'string' ? store.settings.shipping_policy : undefined,
            returnsPolicy: typeof store.settings?.returns_policy === 'string' ? store.settings.returns_policy : undefined,
            paymentPolicy: typeof store.settings?.payment_policy === 'string' ? store.settings.payment_policy : undefined,
            products,
          }}
        />
      </div>
    ),
  });
}
