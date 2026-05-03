import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SafePageRenderer } from '../../../../../components/page-builder/SafePageRenderer';

/**
 * Storefront Custom Page Renderer
 * ────────────────────────────────────────────────────────────
 * Renders published Page Builder pages for a vendor's storefront.
 * The page content (HTML + CSS) is compiled by GrapesJS and stored
 * in the database. We render it server-side for fast SSR — no
 * GrapesJS runtime is needed on the public site.
 *
 * Route: /store/[storeHost]/pages/[slug]
 * Example: /store/boutique1/pages/about
 */

interface StorePageData {
  id: string;
  slug: string;
  title: string;
  html: string;
  css: string;
  is_homepage: boolean;
}

interface StoreData {
  id: string;
  name: string;
  settings?: {
    colors?: { primary?: string };
    logo_url?: string;
    [key: string]: unknown;
  };
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
    return null;
  }
}

async function getPublishedPage(storeId: string, slug: string): Promise<StorePageData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const res = await fetch(
      `${backendUrl}/api/pd/stores/${storeId}/pages/${encodeURIComponent(slug)}`,
      { next: { revalidate: 30 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.page;
  } catch {
    return null;
  }
}

/**
 * Dynamic SEO metadata for custom pages.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeHost: string; slug: string }>;
}): Promise<Metadata> {
  const { storeHost, slug } = await params;
  const store = await getStoreByHost(decodeURIComponent(storeHost));
  if (!store) return { title: 'Page introuvable' };

  const page = await getPublishedPage(store.id, slug);
  if (!page) return { title: 'Page introuvable' };

  return {
    title: `${page.title} — ${store.name}`,
    openGraph: {
      title: `${page.title} — ${store.name}`,
      type: 'website',
    },
  };
}

export default async function CustomStorePage({
  params,
}: {
  params: Promise<{ storeHost: string; slug: string }>;
}) {
  const { storeHost, slug } = await params;
  const decodedHost = decodeURIComponent(storeHost);

  const store = await getStoreByHost(decodedHost);
  if (!store) notFound();

  const page = await getPublishedPage(store.id, slug);
  if (!page) notFound();

  const primaryColor = store.settings?.colors?.primary || '#16C784';
  const logoUrl = store.settings?.logo_url as string | undefined;

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Store Header */}
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

      {/* Page Content — Rendered from GrapesJS compiled HTML/CSS (sanitized) */}
      <main>
        <SafePageRenderer html={page.html} css={page.css} />
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
