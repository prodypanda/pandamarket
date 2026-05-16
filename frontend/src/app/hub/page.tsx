import type { Metadata } from 'next';
import { HubNavbar } from '../../components/hub/HubNavbar';
import { HubHomeContent } from '../../components/hub/HubHomeContent';
import { AliExpressHomeContent } from '../../components/hub/AliExpressHomeContent';
import { AliExpress2HomeContent } from '../../components/hub/AliExpress2HomeContent';
import { HubFooter } from '../../components/hub/HubFooter';
import { getMarketplaceSettings } from '../../lib/marketplace-settings';
import { resolveMarketplaceTheme } from '../../lib/marketplace-theme';

export async function generateMetadata(): Promise<Metadata> {
  const marketplaceSettings = await getMarketplaceSettings();
  const marketplaceName = marketplaceSettings.marketplace_name || 'PandaMarket';
  const tagline = marketplaceSettings.marketplace_tagline || 'La marketplace tunisienne pour boutiques modernes';
  const ogImageUrl = marketplaceSettings.marketplace_og_image_url || '/og-image.png';
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

async function getTrendingProducts(): Promise<Product[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/products/public?page=1&limit=16`, {
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
  const [trendingProducts, categories, marketplaceSettings] = await Promise.all([
    getTrendingProducts(),
    getMarketplaceCategories(),
    getMarketplaceSettings(),
  ]);
  const marketplaceTheme = resolveMarketplaceTheme(marketplaceSettings.marketplace_theme);

  const homeContent =
    marketplaceTheme === 'aliexpress2' ? (
      <AliExpress2HomeContent
        trendingProducts={trendingProducts}
        categories={categories}
        marketplaceSettings={marketplaceSettings}
      />
    ) : marketplaceTheme === 'aliexpress' ? (
      <AliExpressHomeContent
        trendingProducts={trendingProducts}
        categories={categories}
        marketplaceSettings={marketplaceSettings}
      />
    ) : (
      <HubHomeContent
        trendingProducts={trendingProducts}
        categories={categories}
        marketplaceSettings={marketplaceSettings}
      />
    );

  return (
    <div className={`min-h-screen ${marketplaceTheme === 'aliexpress2' ? 'bg-[#09090b]' : 'bg-white dark:bg-[#0F0F23]'}`}>
      <HubNavbar
        marketplaceName={marketplaceSettings.marketplace_name}
        marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
        marketplaceTheme={marketplaceTheme}
      />
      {homeContent}
      <HubFooter {...marketplaceSettings} />
    </div>
  );
}
