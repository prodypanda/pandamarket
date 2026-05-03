import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { themes, ThemeId } from '../../../lib/themes';
import { MinimalTheme } from '../../../components/themes/MinimalTheme';
import { ClassicTheme } from '../../../components/themes/ClassicTheme';
import { ModernTheme } from '../../../components/themes/ModernTheme';
import { BoutiqueTheme } from '../../../components/themes/BoutiqueTheme';
import { ArtisanTheme } from '../../../components/themes/ArtisanTheme';
import { TechHubTheme } from '../../../components/themes/TechHubTheme';
import { FlavorTheme } from '../../../components/themes/FlavorTheme';
import { SafePageRenderer } from '../../../components/page-builder/SafePageRenderer';

interface StoreBranding {
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  favicon_url?: string;
}

interface StoreData {
  id: string;
  name: string;
  theme_id: ThemeId;
  description?: string;
  settings?: {
    colors?: { primary?: string; secondary?: string };
    logo_url?: string;
    favicon_url?: string;
    [key: string]: unknown;
  };
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

interface HomepageOverride {
  id: string;
  title: string;
  html: string;
  css: string;
}

async function getHomepageOverride(storeId: string): Promise<HomepageOverride | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
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

  if (!store) {
    return { title: 'Boutique introuvable | PandaMarket' };
  }

  const description = store.description
    || `Découvrez les produits de ${store.name} sur PandaMarket. Boutique en ligne tunisienne.`;
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

  // Check for Page Builder homepage override (Regular+ plans)
  const homepageOverride = await getHomepageOverride(store.id);
  if (homepageOverride && homepageOverride.html) {
    const primaryColor = store.settings?.colors?.primary || '#16C784';
    const logoUrl = store.settings?.logo_url as string | undefined;

    return (
      <div className="min-h-screen bg-white">
        {/* Minimal Store Header for Page Builder pages */}
        <header
          className="h-16 border-b border-gray-200 flex items-center justify-between px-6"
          style={{ borderBottomColor: `${primaryColor}20` }}
        >
          <Link href={`/store/${storeHost}`} className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={store.name} className="h-8 object-contain" />
            ) : (
              <span className="text-lg font-bold" style={{ color: primaryColor }}>
                {store.name}
              </span>
            )}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href={`/store/${storeHost}`}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Accueil
            </Link>
            <Link
              href={`/store/${storeHost}/cart`}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Panier
            </Link>
          </nav>
        </header>

        {/* Page Builder Content (sanitized) */}
        <main>
          <SafePageRenderer html={homepageOverride.html} css={homepageOverride.css} />
        </main>

        {/* Footer */}
        <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-100">
          Propulsé par{' '}
          <Link href="/" className="text-[#16C784] hover:underline">
            🐼 PandaMarket
          </Link>
        </footer>
      </div>
    );
  }

  // Default: Render the selected theme
  const products = await getStoreProducts(store.id);
  const activeTheme = themes[store.theme_id] || themes['classic'];

  // Extract branding from store settings
  const branding: StoreBranding = {
    primary_color: store.settings?.colors?.primary,
    secondary_color: store.settings?.colors?.secondary,
    logo_url: store.settings?.logo_url as string | undefined,
    favicon_url: store.settings?.favicon_url as string | undefined,
  };

  const themeProps = { theme: activeTheme, storeName: store.name, products, branding };

  switch (activeTheme.id) {
    case 'minimal':
      return <MinimalTheme {...themeProps} />;
    case 'classic':
      return <ClassicTheme {...themeProps} />;
    case 'modern':
      return <ModernTheme {...themeProps} />;
    case 'boutique':
      return <BoutiqueTheme {...themeProps} />;
    case 'artisan':
      return <ArtisanTheme {...themeProps} />;
    case 'techhub':
      return <TechHubTheme {...themeProps} />;
    case 'flavor':
      return <FlavorTheme {...themeProps} />;
    default:
      return <ClassicTheme {...themeProps} />;
  }
}
