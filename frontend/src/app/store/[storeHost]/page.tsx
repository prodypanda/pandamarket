import { notFound } from 'next/navigation';
import { themes, ThemeId } from '../../../lib/themes';
import { MinimalTheme } from '../../../components/themes/MinimalTheme';
import { ClassicTheme } from '../../../components/themes/ClassicTheme';
import { ModernTheme } from '../../../components/themes/ModernTheme';

interface StoreData {
  id: string;
  name: string;
  theme_id: ThemeId;
  description?: string;
  settings?: Record<string, unknown>;
}

interface StoreProduct {
  id: string;
  title: string;
  price: number;
  images?: { url: string }[];
  category?: string;
  store_id: string;
  store_name?: string;
}

async function getStoreByHost(host: string): Promise<StoreData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const res = await fetch(`${backendUrl}/api/pd/stores/by-host/${encodeURIComponent(host)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.store;
  } catch {
    // Fallback: derive theme from hostname for development
    let themeId: ThemeId = 'modern';
    if (host.startsWith('minimal')) themeId = 'minimal';
    if (host.startsWith('classic')) themeId = 'classic';
    return {
      id: `store-${host}`,
      name: host.split('.')[0].toUpperCase() + ' Store',
      theme_id: themeId,
    };
  }
}

async function getStoreProducts(storeId: string): Promise<StoreProduct[]> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const res = await fetch(`${backendUrl}/api/pd/products/public?store_id=${storeId}&limit=20`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export default async function StorePage({ params }: { params: Promise<{ storeHost: string }> }) {
  const { storeHost } = await params;
  const decodedHost = decodeURIComponent(storeHost);

  const store = await getStoreByHost(decodedHost);
  if (!store) {
    notFound();
  }

  const products = await getStoreProducts(store.id);
  const activeTheme = themes[store.theme_id] || themes['classic'];

  switch (activeTheme.id) {
    case 'minimal':
      return <MinimalTheme theme={activeTheme} storeName={store.name} products={products} />;
    case 'classic':
      return <ClassicTheme theme={activeTheme} storeName={store.name} products={products} />;
    case 'modern':
      return <ModernTheme theme={activeTheme} storeName={store.name} products={products} />;
    default:
      return <ClassicTheme theme={activeTheme} storeName={store.name} products={products} />;
  }
}
