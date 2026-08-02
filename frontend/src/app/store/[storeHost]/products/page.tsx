import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { themes, type ThemeCustomization, type ThemeId, resolveThemeColors } from '../../../../lib/themes';
import { getStoreThemeLogoSurface, type StoreProduct as ThemeStoreProduct, type ThemeProps, type StoreSocialLinks } from '../../../../components/themes/shared';
import { getMarketplaceSettings } from '../../../../lib/marketplace-settings';
import { getStoreRouteContext } from '../../../../lib/store-routing';
import { type MarketplaceCategory, type MarketplaceStoreProduct, MarketplaceSellerPage } from '../../../../components/store/MarketplaceStorefront';
import { selectLogoForSurface } from '../../../../lib/public-assets';
import { STORE_DATA_REVALIDATE_SECONDS, storeHostTag } from '@/lib/store-cache';
import { renderStorefrontTheme } from '../../../../components/themes/ThemeWrapper';
import { CatalogControls, type CatalogPaginationMeta } from '../../../../components/store/CatalogControls';

interface StoreData {
  id: string;
  name: string;
  theme_id: ThemeId;
  description?: string;
  seller_type?: string | null;
  is_verified?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    logo_light_url?: string;
    logo_dark_url?: string;
    favicon_url?: string;
    themeCustomization?: ThemeCustomization;
    store_description?: string;
    description?: string;
    contact_email?: string | null;
    contact_phone?: string | null;
    address?: string;
    city?: string;
    country?: string;
    map_embed_url?: string | null;
    social?: StoreSocialLinks | null;
    [key: string]: unknown;
  };
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

interface ProductsResult {
  products: MarketplaceStoreProduct[];
  meta?: CatalogPaginationMeta;
}

async function getStoreProducts(
  storeId: string,
  queryParams: Record<string, string | string[] | undefined> = {},
): Promise<ProductsResult> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const params = new URLSearchParams({ store_id: storeId, limit: '24' });

    Object.entries(queryParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        const strVal = Array.isArray(val) ? val[0] : val;
        params.set(key, strVal);
      }
    });

    const res = await fetch(`${backendUrl}/api/pd/products/public?${params.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { products: [] };
    const data = await res.json();
    return {
      products: data.data || [],
      meta: data.meta,
    };
  } catch {
    return { products: [] };
  }
}

async function getMarketplaceCategories(locale: string = 'fr'): Promise<MarketplaceCategory[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/categories?locale=${encodeURIComponent(locale)}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

function toThemeProducts(products: MarketplaceStoreProduct[]): ThemeStoreProduct[] {
  return products.map((product) => ({
    id: product.id,
    title: product.title,
    price: product.price,
    thumbnail: product.thumbnail || undefined,
    slug: product.slug || undefined,
    category: product.category || undefined,
    marketplace_category_slug: product.marketplace_category_slug || undefined,
    storefront_category_slug: product.storefront_category_slug || undefined,
    storefront_parent_category_slug: product.storefront_parent_category_slug || undefined,
    store_id: product.store_id,
    store_name: product.store_name || undefined,
    images: product.images?.map((image) => (typeof image === 'string' ? { url: image } : image)),
  }));
}

export default async function StoreProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeHost: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { storeHost } = await params;
  const resolvedSearchParams = await searchParams;
  const decodedHost = decodeURIComponent(storeHost);
  const store = await getStoreByHost(decodedHost);

  if (!store) notFound();

  const isPublicStore = store.status === 'verified' && store.is_verified === true;
  if (!isPublicStore) notFound();

  const { isMarketplaceStoreRoute, storePathBase } = await getStoreRouteContext(storeHost);
  const { products, meta } = await getStoreProducts(store.id, resolvedSearchParams);

  if (isMarketplaceStoreRoute) {
    const cookieStore = await cookies();
    const activeLocale = cookieStore.get('pd_locale')?.value || 'fr';
    const [categories, marketplaceSettings] = await Promise.all([
      getMarketplaceCategories(activeLocale),
      getMarketplaceSettings(),
    ]);

    const categoryParam = Array.isArray(resolvedSearchParams.category)
      ? resolvedSearchParams.category[0]
      : resolvedSearchParams.category;

    return (
      <MarketplaceSellerPage
        storeHost={storeHost}
        store={store}
        products={products}
        categories={categories}
        marketplaceSettings={marketplaceSettings}
        selectedCategorySlug={categoryParam}
      />
    );
  }

  const activeTheme = themes[store.theme_id] || themes.classic;
  const themeCustomization = (store.settings?.themeCustomization || {}) as ThemeCustomization;
  const resolvedColors = resolveThemeColors(activeTheme, themeCustomization);

  const branding = {
    store_id: store.id,
    store_host: storeHost,
    primary_color: store.settings?.colors?.primary || resolvedColors.primary,
    secondary_color: store.settings?.colors?.secondary || resolvedColors.secondary,
    logo_url: selectLogoForSurface({
      logo_url: store.settings?.logo_url,
      logo_light_url: store.settings?.logo_light_url,
      logo_dark_url: store.settings?.logo_dark_url,
    }, getStoreThemeLogoSurface(activeTheme.id)),
    logo_light_url: store.settings?.logo_light_url,
    logo_dark_url: store.settings?.logo_dark_url,
    favicon_url: store.settings?.favicon_url,
    themeCustomization,
    store_path_base: storePathBase,
    contact_email: store.settings?.contact_email,
    contact_phone: store.settings?.contact_phone,
    address: store.settings?.address,
    city: store.settings?.city,
    country: store.settings?.country,
    map_embed_url: store.settings?.map_embed_url,
    social: store.settings?.social,
  };

  const themeProps: ThemeProps = {
    theme: activeTheme,
    storeName: store.name,
    products: toThemeProducts(products),
    branding,
  };

  const categoryOptions = Array.from(
    new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c))),
  );

  return (
    <CatalogControls
      meta={meta}
      categories={categoryOptions}
      accentColor={resolvedColors.primary}
      secondaryColor={resolvedColors.secondary}
      textColor={resolvedColors.text}
      backgroundColor={resolvedColors.background}
    >
      {renderStorefrontTheme(themeProps)}
    </CatalogControls>
  );
}
