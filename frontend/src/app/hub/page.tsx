import type { Metadata } from 'next';
import { HubNavbar } from '../../components/hub/HubNavbar';
import { HubHomeContent } from '../../components/hub/HubHomeContent';
import { AliExpressHomeContent } from '../../components/hub/AliExpressHomeContent';
import { AliExpress2HomeContent } from '../../components/hub/AliExpress2HomeContent';
import { AlibabaHomeContent } from '../../components/hub/AlibabaHomeContent';
import { AmazonHomeContent } from '../../components/hub/AmazonHomeContent';
import { HubFooter } from '../../components/hub/HubFooter';
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

  return {
    title: `Hub — ${marketplaceName}`,
    description,
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
  return 'newest';
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

async function getTrendingProducts(sortBy?: string): Promise<Product[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const params = new URLSearchParams({ page: '1', limit: '16', sort: resolveCatalogSort(sortBy) });
    const res = await fetch(`${backendUrl}/api/pd/products/public?${params.toString()}`, {
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
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export default async function HubHomepage() {
  const marketplaceSettings = await getMarketplaceSettings();
  const [trendingProducts, categories] = await Promise.all([
    getTrendingProducts(marketplaceSettings.catalog_default_sort),
    getMarketplaceCategories(),
  ]);
  const orderedCategories = prioritizeFeaturedCategories(categories, marketplaceSettings);
  const marketplaceTheme = resolveMarketplaceTheme(marketplaceSettings.marketplace_theme);
  const homepageLayout = resolveHomepageLayout(marketplaceSettings.hub_homepage_layout);

  const homeContent =
    homepageLayout === 'alibaba' ? (
      <AlibabaHomeContent
        trendingProducts={trendingProducts}
        categories={orderedCategories}
        marketplaceSettings={marketplaceSettings}
      />
    ) : homepageLayout === 'amazon' ? (
      <AmazonHomeContent
        trendingProducts={trendingProducts}
        categories={orderedCategories}
        marketplaceSettings={marketplaceSettings}
      />
    ) : homepageLayout === 'premium_deals' || (homepageLayout === 'theme_default' && marketplaceTheme === 'aliexpress2') ? (
      <AliExpress2HomeContent
        trendingProducts={trendingProducts}
        categories={orderedCategories}
        marketplaceSettings={marketplaceSettings}
      />
    ) : homepageLayout === 'deals' || (homepageLayout === 'theme_default' && marketplaceTheme === 'aliexpress') ? (
      <AliExpressHomeContent
        trendingProducts={trendingProducts}
        categories={orderedCategories}
        marketplaceSettings={marketplaceSettings}
      />
    ) : (
      <HubHomeContent
        trendingProducts={trendingProducts}
        categories={orderedCategories}
        marketplaceSettings={marketplaceSettings}
      />
    );

  return (
    <div className={`min-h-screen ${marketplaceTheme === 'aliexpress2' ? 'bg-[#09090b]' : 'bg-white dark:bg-[#0F0F23]'}`}>
      <HubNavbar
        marketplaceName={marketplaceSettings.marketplace_name}
        marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
        marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
        marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
        marketplaceTheme={marketplaceTheme}
      />
      {homeContent}
      <HubFooter {...marketplaceSettings} />
    </div>
  );
}
