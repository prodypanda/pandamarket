import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { themes, ThemeId, type ThemeCustomization, resolveThemeColors } from '../../../lib/themes';
import { MinimalTheme } from '../../../components/themes/MinimalTheme';
import { ClassicTheme } from '../../../components/themes/ClassicTheme';
import { ModernTheme } from '../../../components/themes/ModernTheme';
import { BoutiqueTheme } from '../../../components/themes/BoutiqueTheme';
import { ArtisanTheme } from '../../../components/themes/ArtisanTheme';
import { TechHubTheme } from '../../../components/themes/TechHubTheme';
import { FlavorTheme } from '../../../components/themes/FlavorTheme';
import { EleganceTheme } from '../../../components/themes/EleganceTheme';
import { NeonTheme } from '../../../components/themes/NeonTheme';
import { SaharaTheme } from '../../../components/themes/SaharaTheme';
import { MedinaTheme } from '../../../components/themes/MedinaTheme';
import { CoastalTheme } from '../../../components/themes/CoastalTheme';
import { UrbanTheme } from '../../../components/themes/UrbanTheme';
import { GardenTheme } from '../../../components/themes/GardenTheme';
import { StudioTheme } from '../../../components/themes/StudioTheme';
import { LuxeTheme } from '../../../components/themes/LuxeTheme';
import { FreshTheme } from '../../../components/themes/FreshTheme';
import { CraftTheme } from '../../../components/themes/CraftTheme';
import { DigitalTheme } from '../../../components/themes/DigitalTheme';
import { KidsTheme } from '../../../components/themes/KidsTheme';
import { SafePageRenderer } from '../../../components/page-builder/SafePageRenderer';
import { StoreCartIcon } from '../../../components/store/StoreCartIcon';
import { getMarketplaceSettings } from '../../../lib/marketplace-settings';
import { getStoreRouteContext } from '../../../lib/store-routing';
import { MarketplaceSellerPage, type MarketplaceCategory } from '../../../components/store/MarketplaceStorefront';
import { MarketplaceBrand } from '../../../components/MarketplaceBrand';
import { StorefrontSocialLinks } from '../../../components/themes/StorefrontSocialLinks';
import type { StoreSocialLinks } from '../../../components/themes/shared';

interface StoreBranding {
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
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  map_embed_url?: string | null;
  social?: StoreSocialLinks | null;
}

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

interface StoreProduct {
  id: string;
  title: string;
  slug?: string;
  price: number;
  images?: { url: string }[];
  category?: string;
  marketplace_category_slug?: string | null;
  storefront_category_slug?: string | null;
  storefront_parent_category_slug?: string | null;
  thumbnail?: string | null;
  store_id: string;
  store_name?: string;
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

interface HomepageOverride {
  id: string;
  title: string;
  slug?: string;
  html: string;
  css: string;
}

async function getHomepageOverride(storeId: string): Promise<HomepageOverride | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/stores/${storeId}/homepage`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.page || null;
  } catch {
    return null;
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

/**
 * Dynamic SEO metadata for each vendor storefront.
 * Generates unique title, description, and OG tags per store.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeHost: string }>;
}): Promise<Metadata> {
  const { storeHost } = await params;
  const store = await getStoreByHost(decodeURIComponent(storeHost));
  const marketplaceSettings = await getMarketplaceSettings();
  const marketplaceName = marketplaceSettings.marketplace_name || 'PandaMarket';

  if (!store) {
    return { title: `Boutique introuvable | ${marketplaceName}` };
  }

  const description = store.description
    || `Découvrez les produits de ${store.name} sur ${marketplaceName}. Boutique en ligne tunisienne.`;
  const logoUrl = store.settings?.logo_url as string | undefined;

  return {
    title: `${store.name} — Boutique en ligne`,
    description: description.slice(0, 160),
    openGraph: {
      title: store.name,
      description,
      type: 'website',
      ...(logoUrl ? { images: [{ url: logoUrl, width: 400, height: 400, alt: store.name }] } : {}),
    },
    twitter: {
      card: 'summary',
      title: store.name,
      description: description.slice(0, 160),
    },
  };
}

export default async function StorePage({ params }: { params: Promise<{ storeHost: string }> }) {
  const { storeHost } = await params;
  const decodedHost = decodeURIComponent(storeHost);

  const store = await getStoreByHost(decodedHost);
  if (!store) {
    notFound();
  }

  const { isMarketplaceStoreRoute, storePathBase } = await getStoreRouteContext(storeHost);

  if (isMarketplaceStoreRoute) {
    const [products, categories, marketplaceSettings] = await Promise.all([
      getStoreProducts(store.id),
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
      />
    );
  }

  const activeTheme = themes[store.theme_id] || themes.classic;
  const themeCustomization = (store.settings?.themeCustomization || {}) as ThemeCustomization;
  const resolvedColors = resolveThemeColors(activeTheme, themeCustomization);

  // Check for Page Builder homepage override (Regular+ plans)
  const homepageOverride = await getHomepageOverride(store.id);
  if (homepageOverride && homepageOverride.html) {
    const primaryColor = store.settings?.colors?.primary || themeCustomization?.customColors?.primary || resolvedColors.primary;
    const logoUrl = store.settings?.logo_url as string | undefined;
    const marketplaceSettings = await getMarketplaceSettings();
    const footerBranding: StoreBranding = {
      marketplace_name: marketplaceSettings.marketplace_name,
      marketplace_logo_url: marketplaceSettings.marketplace_logo_url,
      contact_email: store.settings?.contact_email,
      contact_phone: store.settings?.contact_phone,
      address: store.settings?.address,
      city: store.settings?.city,
      country: store.settings?.country,
      map_embed_url: store.settings?.map_embed_url,
      social: store.settings?.social,
    };

    return (
      <div className={`min-h-screen ${activeTheme.typography.fontFamily}`} style={{ backgroundColor: resolvedColors.background, color: resolvedColors.text }}>
        {/* Minimal Store Header for Page Builder pages */}
        <header
          className="h-16 border-b flex items-center justify-between px-6"
          style={{ backgroundColor: resolvedColors.headerBg, borderBottomColor: `${primaryColor}20` }}
        >
          <Link href={storePathBase || '/'} className="flex items-center gap-2">
            {logoUrl ? (
              <span
                aria-label={store.name}
                role="img"
                className="block h-8 w-28 bg-contain bg-left bg-no-repeat"
                style={{ backgroundImage: `url(${logoUrl})` }}
              />
            ) : (
              <span className="text-lg font-bold" style={{ color: primaryColor }}>
                {store.name}
              </span>
            )}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href={storePathBase || '/'}
              className="transition-colors hover:opacity-80"
              style={{ color: resolvedColors.text }}
            >
              Accueil
            </Link>
            <StoreCartIcon storeId={store.id} storeHost={storeHost} primaryColor={primaryColor} storePathBase={storePathBase} iconColor={resolvedColors.text} className="inline-flex items-center gap-2 transition-colors hover:opacity-80" label="Panier" />
          </nav>
        </header>

        {/* Page Builder Content (sanitized) */}
        <main>
          <SafePageRenderer html={homepageOverride.html} css={homepageOverride.css} />
        </main>

        {/* Footer */}
        <footer className="py-6 text-center text-xs border-t" style={{ backgroundColor: resolvedColors.footerBg, borderColor: `${primaryColor}20`, color: `${resolvedColors.text}99` }}>
          <StorefrontSocialLinks
            branding={footerBranding}
            showContact
            className="mb-3 flex flex-wrap items-center justify-center gap-3"
            linkClassName="font-semibold hover:underline"
          />
          <span className="inline-flex items-center justify-center gap-1">
            Propulsé par{' '}
            <MarketplaceBrand
              href="/hub"
              marketplaceName={marketplaceSettings.marketplace_name}
              marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
              className="inline-flex align-middle"
              imageClassName="h-5 max-w-[120px] object-contain"
              textClassName="font-semibold hover:underline"
              fallbackMarkClassName="hidden"
            />
          </span>
        </footer>
      </div>
    );
  }

  // Default: Render the selected theme
  const [products, marketplaceSettings] = await Promise.all([
    getStoreProducts(store.id),
    getMarketplaceSettings(),
  ]);

  // Use resolved colors as primary_color override for backward compatibility
  const branding: StoreBranding = {
    store_id: store.id,
    store_host: storeHost,
    primary_color: store.settings?.colors?.primary || themeCustomization?.customColors?.primary || resolvedColors.primary,
    secondary_color: store.settings?.colors?.secondary || themeCustomization?.customColors?.secondary || resolvedColors.secondary,
    logo_url: store.settings?.logo_url as string | undefined,
    favicon_url: store.settings?.favicon_url as string | undefined,
    themeCustomization,
    store_path_base: storePathBase,
    marketplace_name: marketplaceSettings.marketplace_name,
    marketplace_logo_url: marketplaceSettings.marketplace_logo_url,
    contact_email: store.settings?.contact_email,
    contact_phone: store.settings?.contact_phone,
    address: store.settings?.address,
    city: store.settings?.city,
    country: store.settings?.country,
    map_embed_url: store.settings?.map_embed_url,
    social: store.settings?.social,
  };

  const themeProps = { theme: activeTheme, storeName: store.name, products, branding };

  const themeComponents: Record<string, React.FC<typeof themeProps>> = {
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



