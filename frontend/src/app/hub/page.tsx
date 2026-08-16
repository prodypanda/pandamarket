import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { HubNavbar } from '../../components/hub/HubNavbar';
import { HubHomeContent } from '../../components/hub/HubHomeContent';
import { AliExpressHomeContent } from '../../components/hub/AliExpressHomeContent';
import { AliExpress2HomeContent } from '../../components/hub/AliExpress2HomeContent';
import { AlibabaHomeContent } from '../../components/hub/AlibabaHomeContent';
import { AmazonHomeContent } from '../../components/hub/AmazonHomeContent';
import { HubFooter } from '../../components/hub/HubFooter';
import { SponsoredAdsRail } from '../../components/hub/SponsoredAdsRail';
import { getMarketplaceSettings, type MarketplaceSettings } from '../../lib/marketplace-settings';
import { resolveMarketplaceTheme } from '../../lib/marketplace-theme';
import { selectLogoForSurface } from '../../lib/public-assets';

export async function generateMetadata(): Promise<Metadata> {
  const marketplaceSettings = await getMarketplaceSettings();
  const marketplaceName = marketplaceSettings.marketplace_name || 'PandaMarket';
  const tagline = marketplaceSettings.marketplace_tagline || 'La marketplace tunisienne pour boutiques modernes';
  const logoImageUrl = selectLogoForSurface({
    marketplace_logo_url: marketplaceSettings.marketplace_logo_url,
    marketplace_logo_light_url: marketplaceSettings.marketplace_logo_light_url,
    marketplace_logo_dark_url: marketplaceSettings.marketplace_logo_dark_url,
  }, 'light');
  const ogImageUrl = marketplaceSettings.marketplace_og_image_url || logoImageUrl || '/og-image.png';
  const description = `Parcourez ${marketplaceName} : ${tagline}`;
  const publicUrl = marketplaceSettings.marketplace_public_url || 'https://pandamarket.tn';

  return {
    title: `Hub — ${marketplaceName}`,
    description,
    alternates: {
      canonical: `${publicUrl}/hub`,
    },
    openGraph: {
      title: `${marketplaceName} Hub`,
      description,
      type: 'website',
      url: '/hub',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${marketplaceName} Hub` }],
    },
  };
}

interface Product {
  id: string;
  title: string;
  slug?: string | null;
  price: number | string;
  store_name?: string;
  store_subdomain?: string | null;
  images?: { url: string }[];
  thumbnail?: string | null;
  category?: string;
  marketplace_category_slug?: string | null;
}

interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  image_url?: string | null;
  is_default?: boolean;
  product_count?: number;
}

function resolveCatalogSort(value?: string) {
  if (value === 'oldest') return 'oldest';
  if (value === 'price_asc') return 'price_asc';
  if (value === 'price_desc') return 'price_desc';
  if (value === 'title_asc') return 'title_asc';
  if (value === 'alphabetical') return 'alphabetical';
  if (value === 'best_sellers') return 'best_sellers';
  if (value === 'random') return 'random';
  return value ? value : undefined;
}

function resolveHomepageLayout(value?: string) {
  if (value === 'classic') return 'classic';
  if (value === 'deals') return 'deals';
  if (value === 'premium_deals') return 'premium_deals';
  if (value === 'alibaba') return 'alibaba';
  if (value === 'amazon') return 'amazon';
  return 'theme_default';
}

function prioritizeFeaturedCategories(categories: MarketplaceCategory[], settings: MarketplaceSettings) {
  const featuredSlugs = (settings.catalog_featured_category_slugs || '')
    .split(',')
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean);
  if (featuredSlugs.length === 0) return categories;

  const bySlug = new Map(categories.map((category) => [category.slug.toLowerCase(), category]));
  const featured = featuredSlugs.map((slug) => bySlug.get(slug)).filter((category): category is MarketplaceCategory => Boolean(category));
  const featuredIds = new Set(featured.map((category) => category.id));
  return [...featured, ...categories.filter((category) => !featuredIds.has(category.id))];
}

async function getTrendingProducts(sortBy?: string): Promise<{ products: Product[], totalPages: number, totalProducts: number, hasFetchError?: boolean }> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const params = new URLSearchParams({ page: '1', limit: '16' });
    const resolvedSort = sortBy ? resolveCatalogSort(sortBy) : undefined;
    if (resolvedSort) {
      params.set('sort', resolvedSort);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let res: Response;
    try {
      res = await fetch(`${backendUrl}/api/pd/marketplace/feed?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) {
        res = await fetch(`${backendUrl}/api/pd/products/public?${params.toString()}`, {
          cache: 'no-store',
        });
      }
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return { products: [], totalPages: 1, totalProducts: 0, hasFetchError: true };
    const data = await res.json();
    const rawList: any[] = data.products || data.data || [];
    const products: Product[] = rawList.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: p.price,
      store_name: p.store_name,
      store_subdomain: p.store_subdomain,
      category: p.category,
      marketplace_category_slug: p.marketplace_category_slug,
      thumbnail: p.thumbnail || p.image_url,
      images: p.images || (p.image_url ? [{ url: p.image_url }] : []),
    }));

    return {
      products,
      totalPages: data.meta?.total_pages || 1,
      totalProducts: typeof data.meta?.total === 'number' ? data.meta.total : (products.length || 0),
      hasFetchError: false,
    };
  } catch {
    return { products: [], totalPages: 1, totalProducts: 0, hasFetchError: true };
  }
}

async function getMarketplaceCategories(locale: string = 'fr'): Promise<MarketplaceCategory[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let res: Response;
    try {
      res = await fetch(`${backendUrl}/api/pd/categories?locale=${encodeURIComponent(locale)}`, {
        next: { revalidate: 300 },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export default async function HubHomepage({
  searchParams,
}: {
  searchParams?: Promise<{ locale?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  
  const [cookieStore, marketplaceSettings] = await Promise.all([
    cookies(),
    getMarketplaceSettings(),
  ]);
  const cookieLocale = cookieStore.get('pd_locale')?.value;
  const activeLocale = sp.locale || cookieLocale || marketplaceSettings.marketplace_default_locale || 'fr';

  const [{ products: trendingProducts, totalPages: trendingTotalPages, totalProducts, hasFetchError }, categories] = await Promise.all([
    getTrendingProducts(marketplaceSettings.catalog_default_sort),
    getMarketplaceCategories(activeLocale),
  ]);
  const orderedCategories = prioritizeFeaturedCategories(categories, marketplaceSettings);
  const marketplaceTheme = resolveMarketplaceTheme(marketplaceSettings.marketplace_theme);
  const homepageLayout = resolveHomepageLayout(marketplaceSettings.hub_homepage_layout);
  const layoutEmbedsSponsoredBrands = homepageLayout === 'alibaba' || homepageLayout === 'amazon';

  function renderHomeContent() {
    switch (homepageLayout) {
      case 'alibaba':
        return (
          <AlibabaHomeContent
            trendingProducts={trendingProducts}
            trendingTotalPages={trendingTotalPages}
            categories={orderedCategories}
            marketplaceSettings={marketplaceSettings}
          />
        );
      case 'amazon':
        return (
          <AmazonHomeContent
            trendingProducts={trendingProducts}
            categories={orderedCategories}
            marketplaceSettings={marketplaceSettings}
          />
        );
      case 'premium_deals':
        return (
          <AliExpress2HomeContent
            trendingProducts={trendingProducts}
            categories={orderedCategories}
            marketplaceSettings={marketplaceSettings}
          />
        );
      case 'deals':
        return (
          <AliExpressHomeContent
            trendingProducts={trendingProducts}
            categories={orderedCategories}
            marketplaceSettings={marketplaceSettings}
          />
        );
      case 'theme_default':
        if (marketplaceTheme === 'aliexpress2') {
          return (
            <AliExpress2HomeContent
              trendingProducts={trendingProducts}
              categories={orderedCategories}
              marketplaceSettings={marketplaceSettings}
            />
          );
        }
        if (marketplaceTheme === 'aliexpress') {
          return (
            <AliExpressHomeContent
              trendingProducts={trendingProducts}
              categories={orderedCategories}
              marketplaceSettings={marketplaceSettings}
            />
          );
        }
        return (
          <HubHomeContent
            trendingProducts={trendingProducts}
            categories={orderedCategories}
            marketplaceSettings={marketplaceSettings}
            totalProducts={totalProducts}
            hasFetchError={hasFetchError}
          />
        );
      case 'classic':
      default:
        return (
          <HubHomeContent
            trendingProducts={trendingProducts}
            categories={orderedCategories}
            marketplaceSettings={marketplaceSettings}
            totalProducts={totalProducts}
            hasFetchError={hasFetchError}
          />
        );
    }
  }

  const homeContent = renderHomeContent();

  const publicUrl = marketplaceSettings.marketplace_public_url || 'https://pandamarket.tn';
  const marketplaceName = marketplaceSettings.marketplace_name || 'PandaMarket';
  const tagline = marketplaceSettings.marketplace_tagline || 'La marketplace tunisienne pour boutiques modernes';

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: marketplaceName,
    url: publicUrl,
    logo: marketplaceSettings.marketplace_logo_url || `${publicUrl}/logo.png`,
    description: tagline,
    ...(marketplaceSettings.marketplace_support_email && {
      contactPoint: {
        '@type': 'ContactPoint',
        email: marketplaceSettings.marketplace_support_email,
        contactType: 'customer support',
      },
    }),
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Trending Products on ${marketplaceName}`,
    itemListElement: trendingProducts.slice(0, 10).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${publicUrl}/hub/products/${product.slug || product.id}`,
      name: product.title,
    })),
  };

  return (
    <div className={`min-h-screen ${marketplaceTheme === 'aliexpress2' ? 'bg-[#09090b]' : 'bg-white dark:bg-[#0F0F23]'}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `:root { --pd-primary: ${marketplaceSettings.marketplace_primary_color || '#16C784'}; --pd-secondary: ${marketplaceSettings.marketplace_secondary_color || '#0f9f6e'}; }`,
        }}
      />
      <HubNavbar
        marketplaceName={marketplaceSettings.marketplace_name}
        marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
        marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
        marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
        marketplaceTheme={marketplaceTheme}
      />
      <SponsoredAdsRail placement="hub.home_banner" title="Sponsored content" variant="banner" locale={activeLocale as any} />
      {homeContent}
      {!layoutEmbedsSponsoredBrands && (
        <SponsoredAdsRail placement="hub.sponsored_brands" title="Sponsored brands" locale={activeLocale as any} />
      )}
      <SponsoredAdsRail placement="hub.sponsored_products" title="Sponsored products" variant="cards" locale={activeLocale as any} />
      <HubFooter
        {...marketplaceSettings}
        topCategories={orderedCategories.filter((c) => !c.is_default).slice(0, 3).map((c) => ({ name: c.name, slug: c.slug }))}
      />
    </div>
  );
}
