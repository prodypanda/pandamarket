import { headers } from 'next/headers';
import { MetadataRoute } from 'next';
import { getMarketplacePublicUrl, getMarketplaceSettings } from '../lib/marketplace-settings';
import { classifyHost } from '../lib/store-hosts';
import { getStorefrontCanonicalUrl, isEmptyStore, isPublicStore, type StorefrontSeoStore } from '../lib/storefront-seo';
import { fetchAllPublicProducts } from '../lib/public-products';

export const dynamic = 'force-dynamic';

interface SitemapProduct {
  id: string;
  updated_at: string;
}

interface SitemapCategory {
  slug: string;
}

interface StorefrontSitemapProduct {
  slug?: string | null;
  updated_at?: string | null;
}

interface StorefrontSitemapPage {
  slug?: string | null;
  updated_at?: string | null;
  noindex?: boolean;
}

async function getStoreByHost(host: string): Promise<StorefrontSeoStore | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const response = await fetch(`${backendUrl}/api/pd/stores/by-host/${encodeURIComponent(host)}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return data.store || null;
  } catch {
    return null;
  }
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

function parseLastModified(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function getStorefrontSitemap(host: string, store: StorefrontSeoStore): Promise<MetadataRoute.Sitemap> {
  if (!isPublicStore(store) || isEmptyStore(store)) return [];

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
  const [products, pagesPayload] = await Promise.all([
    fetchAllPublicProducts<StorefrontSitemapProduct>(backendUrl, { storeId: store.id }, { cache: 'no-store' }),
    getJson<{ data?: StorefrontSitemapPage[] }>(`${backendUrl}/api/pd/stores/${encodeURIComponent(store.id)}/pages`),
  ]);
  const baseUrl = getStorefrontCanonicalUrl(host, store, '/').replace(/\/$/, '');

  return [
    { url: `${baseUrl}/`, changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/products`, changeFrequency: 'daily' as const, priority: 0.8 },
    ...products.filter((product) => product.slug).map((product) => ({
      url: `${baseUrl}/product/${encodeURIComponent(product.slug as string)}`,
      lastModified: parseLastModified(product.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...(pagesPayload?.data || []).filter((page) => page.slug && !page.noindex).map((page) => ({
      url: `${baseUrl}/pages/${encodeURIComponent(page.slug as string)}`,
      lastModified: parseLastModified(page.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}

function productUrl(baseUrl: string, product: SitemapProduct): string {
  return `${baseUrl}/hub/products/${encodeURIComponent(product.id)}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host')?.trim() || '';
  if (host && classifyHost(host) === 'storefront') {
    const store = await getStoreByHost(host);
    return store ? getStorefrontSitemap(host, store) : [];
  }

  const marketplaceSettings = await getMarketplaceSettings();
  const baseUrl = getMarketplacePublicUrl(marketplaceSettings);

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/hub`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/hub/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/hub/pricing`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/hub/vendor-signup`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Dynamic product pages
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const products = await fetchAllPublicProducts<SitemapProduct>(backendUrl, {}, {
        next: { revalidate: 3600 },
        signal: controller.signal,
      });
      productPages = products.map((product) => ({
        url: productUrl(baseUrl, product),
        lastModified: new Date(product.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Silently fail — sitemap will just have static pages
  }

  // Dynamic category pages
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let res: Response;
    try {
      res = await fetch(`${backendUrl}/api/pd/categories`, {
        next: { revalidate: 3600 },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (res.ok) {
      const data = await res.json();
      categoryPages = (data.data || []).map((category: SitemapCategory) => ({
        url: `${baseUrl}/hub/category/${category.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Silently fail — sitemap will just have static and product pages
  }

  return [...staticPages, ...categoryPages, ...productPages];
}
