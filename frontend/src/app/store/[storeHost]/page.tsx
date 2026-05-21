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
import { getMarketplaceSettings } from '@/lib/marketplace-settings';
import { getStoreRouteContext } from '@/lib/store-routing';
import {
  PAGE_BUILDER_REVALIDATE_SECONDS,
  pageBuilderHomepageTag,
  pageBuilderStoreTag,
} from '@/lib/page-builder-cache';
import { MarketplaceSellerPage, type MarketplaceCategory } from '../../../components/store/MarketplaceStorefront';
import { MarketplaceBrand } from '../../../components/MarketplaceBrand';
import { StorefrontSocialLinks } from '../../../components/themes/StorefrontSocialLinks';
import { getStoreThemeLogoSurface, type StoreSocialLinks } from '../../../components/themes/shared';
import { StorefrontMaintenancePage } from '../../../components/store/StorefrontMaintenancePage';
import { selectLogoForSurface } from '../../../lib/public-assets';

interface StoreBranding {
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

interface StoreData {
  id: string;
  name: string;
  theme_id: ThemeId;
  description?: string;
  seller_type?: string | null;
  is_verified?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  shipping_mode?: string | null;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    logo_light_url?: string;
    logo_dark_url?: string;
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
  seo_title?: string | null;
  seo_description?: string | null;
  og_image?: string | null;
  noindex?: boolean;
  show_in_navigation?: boolean;
  show_in_footer?: boolean;
  sort_order?: number | null;
}

type PageSearchParams = Record<string, string | string[] | undefined>;

function getSearchParam(params: PageSearchParams | undefined, key: string): string | undefined {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

async function getHomepageOverride(storeId: string): Promise<HomepageOverride | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/stores/${storeId}/homepage`, {
      next: {
        revalidate: PAGE_BUILDER_REVALIDATE_SECONDS,
        tags: [pageBuilderStoreTag(storeId), pageBuilderHomepageTag(storeId)],
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.page || null;
  } catch {
    return null;
  }
}

async function getDraftPreviewHomepage(storeId: string, token: string): Promise<HomepageOverride | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const query = new URLSearchParams({ token, homepage: '1' });
    const res = await fetch(
      `${backendUrl}/api/pd/stores/${storeId}/page-builder-preview?${query.toString()}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.page || null;
  } catch {
    return null;
  }
}

async function getPublishedPages(storeId: string): Promise<HomepageOverride[]> {
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
  searchParams,
}: {
  params: Promise<{ storeHost: string }>;
  searchParams?: Promise<PageSearchParams>;
}): Promise<Metadata> {
  const { storeHost } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const previewToken = getSearchParam(resolvedSearchParams, 'pb_preview');
  const store = await getStoreByHost(decodeURIComponent(storeHost));
  const marketplaceSettings = await getMarketplaceSettings();
  const marketplaceName = marketplaceSettings.marketplace_name || 'PandaMarket';

  if (!store) {
    return { title: `Boutique introuvable | ${marketplaceName}` };
  }

  const fallbackDescription = store.description
    || `Découvrez les produits de ${store.name} sur ${marketplaceName}. Boutique en ligne tunisienne.`;
  const activeTheme = themes[store.theme_id] || themes.classic;
  const logoUrl = selectLogoForSurface({
    logo_url: store.settings?.logo_url as string | undefined,
    logo_dark_url: store.settings?.logo_dark_url as string | undefined,
    logo_light_url: store.settings?.logo_light_url as string | undefined,
  }, getStoreThemeLogoSurface(activeTheme.id));
  const homepageOverride = previewToken
    ? await getDraftPreviewHomepage(store.id, previewToken)
    : await getHomepageOverride(store.id);
  const title = homepageOverride?.seo_title || `${store.name} — Boutique en ligne`;
  const description = homepageOverride?.seo_description || fallbackDescription;
  const imageUrl = homepageOverride?.og_image || logoUrl;

  return {
    title,
    description: description.slice(0, 160),
    robots: previewToken || homepageOverride?.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(imageUrl ? { images: [{ url: imageUrl, width: 400, height: 400, alt: title }] } : {}),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description: description.slice(0, 160),
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ storeHost: string }>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { storeHost } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const previewToken = getSearchParam(resolvedSearchParams, 'pb_preview');
  const decodedHost = decodeURIComponent(storeHost);

  const store = await getStoreByHost(decodedHost);
  if (!store) {
    notFound();
  }

  const isPublicStore = store.status === 'verified' && store.is_verified === true;

  // Per-store maintenance/onboarding mode. Legacy unverified stores are treated like maintenance,
  // while suspended stores remain unavailable.
  if (!isPublicStore && !previewToken) {
    if (store.status === 'suspended') {
      notFound();
    }
    const marketplaceSettings = await getMarketplaceSettings();
    const themeCustomization = (store.settings?.themeCustomization || {}) as ThemeCustomization;
    const activeTheme = themes[store.theme_id] || themes.classic;
    const resolvedColors = resolveThemeColors(activeTheme, themeCustomization);
    const pColor = store.settings?.colors?.primary || themeCustomization?.customColors?.primary || resolvedColors.primary;
    return (
      <StorefrontMaintenancePage
        storeName={store.name}
        logoUrl={selectLogoForSurface({
          logo_url: store.settings?.logo_url as string | undefined,
          logo_dark_url: store.settings?.logo_dark_url as string | undefined,
          logo_light_url: store.settings?.logo_light_url as string | undefined,
        }, 'light')}
        primaryColor={pColor}
        maintenanceMessage={store.settings?.maintenance_message as string | undefined}
        social={store.settings?.social}
        contactEmail={store.settings?.contact_email}
        contactPhone={store.settings?.contact_phone}
        marketplaceName={marketplaceSettings.marketplace_name}
        marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
        marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
        marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
      />
    );
  }

  const { isMarketplaceStoreRoute, storePathBase } = await getStoreRouteContext(storeHost);

  if (isMarketplaceStoreRoute && !previewToken) {
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
  const homepageOverride = previewToken
    ? await getDraftPreviewHomepage(store.id, previewToken)
    : await getHomepageOverride(store.id);
  if (previewToken && !homepageOverride) {
    notFound();
  }
  if (homepageOverride && (homepageOverride.html || previewToken)) {
    const primaryColor = store.settings?.colors?.primary || themeCustomization?.customColors?.primary || resolvedColors.primary;
    const logoUrl = selectLogoForSurface({
      logo_url: store.settings?.logo_url as string | undefined,
      logo_dark_url: store.settings?.logo_dark_url as string | undefined,
      logo_light_url: store.settings?.logo_light_url as string | undefined,
    }, getStoreThemeLogoSurface(activeTheme.id));
    const [marketplaceSettings, products, pageLinks] = await Promise.all([
      getMarketplaceSettings(),
      getStoreProducts(store.id),
      getPublishedPages(store.id),
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
    const navigationPages = pageLinks.filter((link) => link.show_in_navigation && link.id !== homepageOverride.id);
    const footerPages = pageLinks.filter((link) => link.show_in_footer && link.id !== homepageOverride.id);

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
            {navigationPages.map((link) => (
              <Link
                key={link.id}
                href={`${storePathBase || ''}/pages/${link.slug}`}
                className="transition-colors hover:opacity-80"
                style={{ color: resolvedColors.text }}
              >
                {link.title}
              </Link>
            ))}
            <StoreCartIcon storeId={store.id} storeHost={storeHost} primaryColor={primaryColor} storePathBase={storePathBase} iconColor={resolvedColors.text} className="inline-flex items-center gap-2 transition-colors hover:opacity-80" label="Panier" />
          </nav>
        </header>

        {previewToken && (
          <div className="border-b border-amber-300 bg-amber-100 px-6 py-2 text-center text-sm font-semibold text-amber-900">
            Aperçu brouillon — cette version n’est pas publiée.
          </div>
        )}
        <main>
          <SafePageRenderer
            html={homepageOverride.html}
            css={homepageOverride.css}
            analytics={previewToken ? undefined : { storeId: store.id, pageId: homepageOverride.id, enabled: true }}
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
        </main>

        {/* Footer */}
        <footer className="py-6 text-center text-xs border-t" style={{ backgroundColor: resolvedColors.footerBg, borderColor: `${primaryColor}20`, color: `${resolvedColors.text}99` }}>
          {footerPages.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
              {footerPages.map((link) => (
                <Link key={link.id} href={`${storePathBase || ''}/pages/${link.slug}`} className="font-semibold hover:underline">
                  {link.title}
                </Link>
              ))}
            </div>
          )}
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
              marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
              marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
              logoSurface="dark"
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
    logo_url: selectLogoForSurface({
      logo_url: store.settings?.logo_url as string | undefined,
      logo_dark_url: store.settings?.logo_dark_url as string | undefined,
      logo_light_url: store.settings?.logo_light_url as string | undefined,
    }, getStoreThemeLogoSurface(activeTheme.id)),
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



