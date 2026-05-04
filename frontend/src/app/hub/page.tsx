import type { Metadata } from 'next';
import { HubNavbar } from '../../components/hub/HubNavbar';
import { HubHomeContent } from '../../components/hub/HubHomeContent';
import { HubFooter } from '../../components/hub/HubFooter';

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
  price: number;
  store_name?: string;
  images?: { url: string }[];
  category?: string;
}

async function getTrendingProducts(): Promise<Product[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const res = await fetch(`${backendUrl}/api/pd/products/public?page=1&limit=8`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export default async function HubHomepage() {
  const trendingProducts = await getTrendingProducts();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F0F23]">
      <HubNavbar />
      <HubHomeContent trendingProducts={trendingProducts} />
      <HubFooter />
    </div>
  );
}
