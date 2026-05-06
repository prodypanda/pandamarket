import type { Metadata } from 'next';
import { HubNavbar } from '../../components/hub/HubNavbar';
import { HubHomeContent } from '../../components/hub/HubHomeContent';
import { AliExpressHomeContent } from '../../components/hub/AliExpressHomeContent';
import { HubFooter } from '../../components/hub/HubFooter';
import { getMarketplaceSettings } from '../../lib/marketplace-settings';

export const metadata: Metadata = {
  title: 'Hub — Explorez des milliers de produits',
  description: 'Parcourez le Hub central PandaMarket : des milliers de produits de vendeurs tunisiens indépendants. Électronique, mode, maison, gaming et plus.',
  openGraph: {
    title: 'PandaMarket Hub — La marketplace tunisienne #1',
    description: 'Parcourez le Hub central PandaMarket : des milliers de produits de vendeurs tunisiens indépendants.',
    type: 'website',
    url: '/hub',
  },
};

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
  const marketplaceTheme = marketplaceSettings.marketplace_theme || 'panda';

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F0F23]">
      <HubNavbar
        marketplaceName={marketplaceSettings.marketplace_name}
        marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
        marketplaceTheme={marketplaceTheme}
      />
      {marketplaceTheme === 'aliexpress' ? (
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
      )}
      <HubFooter {...marketplaceSettings} />
    </div>
  );
}
