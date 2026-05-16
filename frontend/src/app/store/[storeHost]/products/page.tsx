import { notFound } from 'next/navigation';
import { themes, type ThemeCustomization, type ThemeId, resolveThemeColors } from '../../../../lib/themes';
import { MinimalTheme } from '../../../../components/themes/MinimalTheme';
import { ClassicTheme } from '../../../../components/themes/ClassicTheme';
import { ModernTheme } from '../../../../components/themes/ModernTheme';
import { BoutiqueTheme } from '../../../../components/themes/BoutiqueTheme';
import { ArtisanTheme } from '../../../../components/themes/ArtisanTheme';
import { TechHubTheme } from '../../../../components/themes/TechHubTheme';
import { FlavorTheme } from '../../../../components/themes/FlavorTheme';
import { EleganceTheme } from '../../../../components/themes/EleganceTheme';
import { NeonTheme } from '../../../../components/themes/NeonTheme';
import { SaharaTheme } from '../../../../components/themes/SaharaTheme';
import { MedinaTheme } from '../../../../components/themes/MedinaTheme';
import { CoastalTheme } from '../../../../components/themes/CoastalTheme';
import { UrbanTheme } from '../../../../components/themes/UrbanTheme';
import { GardenTheme } from '../../../../components/themes/GardenTheme';
import { StudioTheme } from '../../../../components/themes/StudioTheme';
import { LuxeTheme } from '../../../../components/themes/LuxeTheme';
import { FreshTheme } from '../../../../components/themes/FreshTheme';
import { CraftTheme } from '../../../../components/themes/CraftTheme';
import { DigitalTheme } from '../../../../components/themes/DigitalTheme';
import { KidsTheme } from '../../../../components/themes/KidsTheme';
import type { StoreProduct as ThemeStoreProduct, ThemeProps, StoreSocialLinks } from '../../../../components/themes/shared';
import { getMarketplaceSettings } from '../../../../lib/marketplace-settings';
import { getStoreRouteContext } from '../../../../lib/store-routing';
import { MarketplaceSellerPage, type MarketplaceCategory, type MarketplaceStoreProduct } from '../../../../components/store/MarketplaceStorefront';

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
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.store;
  } catch {
    return null;
  }
}

async function getStoreProducts(storeId: string): Promise<MarketplaceStoreProduct[]> {
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

async function getMarketplaceCategories(): Promise<MarketplaceCategory[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/categories`, {
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

function slugSegment(value?: string | null): string {
  return (value || 'non-categorized-products')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'non-categorized-products';
}

function filterProductsByCategory(products: MarketplaceStoreProduct[], category?: string): MarketplaceStoreProduct[] {
  if (!category) return products;
  const selected = slugSegment(category);
  return products.filter((product) => [
    product.category,
    product.marketplace_category_slug,
    product.storefront_category_slug,
    product.storefront_parent_category_slug,
  ].some((value) => slugSegment(value) === selected));
}

export default async function StoreProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeHost: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { storeHost } = await params;
  const { category } = await searchParams;
  const decodedHost = decodeURIComponent(storeHost);
  const store = await getStoreByHost(decodedHost);

  if (!store) notFound();

  const { isMarketplaceStoreRoute, storePathBase } = await getStoreRouteContext(storeHost);
  const products = await getStoreProducts(store.id);

  if (isMarketplaceStoreRoute) {
    const [categories, marketplaceSettings] = await Promise.all([
      getMarketplaceCategories(),
      getMarketplaceSettings(),
    ]);

    return (
      <MarketplaceSellerPage
        storeHost={storeHost}
        store={store}
        products={products}
        categories={categories}
        marketplaceSettings={marketplaceSettings}
        selectedCategorySlug={category}
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
    logo_url: store.settings?.logo_url,
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
  const visibleProducts = filterProductsByCategory(products, category);
  const themeProps: ThemeProps = { theme: activeTheme, storeName: store.name, products: toThemeProducts(visibleProducts), branding };
  const themeComponents: Record<string, React.FC<ThemeProps>> = {
    minimal: MinimalTheme,
    classic: ClassicTheme,
    modern: ModernTheme,
    boutique: BoutiqueTheme,
    artisan: ArtisanTheme,
    techhub: TechHubTheme,
    flavor: FlavorTheme,
    elegance: EleganceTheme,
    neon: NeonTheme,
    sahara: SaharaTheme,
    medina: MedinaTheme,
    coastal: CoastalTheme,
    urban: UrbanTheme,
    garden: GardenTheme,
    studio: StudioTheme,
    luxe: LuxeTheme,
    fresh: FreshTheme,
    craft: CraftTheme,
    digital: DigitalTheme,
    kids: KidsTheme,
  };
  const ThemeComponent = themeComponents[activeTheme.id] || ClassicTheme;

  return <ThemeComponent {...themeProps} />;
}
