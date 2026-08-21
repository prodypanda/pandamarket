import { NextResponse } from 'next/server';
import { getStorefrontCanonicalUrl, isPublicStore } from '../../../../lib/storefront-seo';

interface StoreData {
  id: string;
  name: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  status?: string | null;
  is_verified?: boolean | null;
  product_count?: number | string | null;
}

interface ProductRow {
  slug?: string | null;
  updated_at?: string | null;
}

interface PageRow {
  slug?: string | null;
  updated_at?: string | null;
  noindex?: boolean;
}

interface SitemapUrl {
  loc: string;
  lastmod?: string | null;
  priority: string;
  changefreq: string;
}

async function getStore(storeHost: string): Promise<StoreData | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const response = await fetch(`${backendUrl}/api/pd/stores/by-host/${encodeURIComponent(storeHost)}`, { cache: 'no-store' });
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

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ storeHost: string }> },
) {
  const { storeHost } = await context.params;
  const decodedHost = decodeURIComponent(storeHost);
  const store = await getStore(decodedHost);
  const publicStore = isPublicStore(store);
  const emptyStore = Boolean(store && store.product_count !== null && store.product_count !== undefined && Number(store.product_count) === 0);

  if (!store || !publicStore || emptyStore) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      status: store ? 200 : 404,
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
    });
  }

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
  const [productsPayload, pagesPayload] = await Promise.all([
    getJson<{ data?: ProductRow[] }>(`${backendUrl}/api/pd/products/public?store_id=${encodeURIComponent(store.id)}&limit=1000`),
    getJson<{ data?: PageRow[] }>(`${backendUrl}/api/pd/stores/${encodeURIComponent(store.id)}/pages`),
  ]);
  const baseUrl = getStorefrontCanonicalUrl(decodedHost, store, '/').replace(/\/$/, '');
  const urls: SitemapUrl[] = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/products`, priority: '0.8', changefreq: 'daily' },
    ...(productsPayload?.data || []).filter((product) => product.slug).map((product) => ({
      loc: `${baseUrl}/product/${encodeURIComponent(product.slug as string)}`,
      lastmod: product.updated_at,
      priority: '0.6',
      changefreq: 'weekly',
    })),
    ...(pagesPayload?.data || []).filter((page) => page.slug && !page.noindex).map((page) => ({
      loc: `${baseUrl}/pages/${encodeURIComponent(page.slug as string)}`,
      lastmod: page.updated_at,
      priority: '0.5',
      changefreq: 'monthly',
    })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${xmlEscape(url.loc)}</loc>${url.lastmod ? `<lastmod>${xmlEscape(url.lastmod)}</lastmod>` : ''}<changefreq>${url.changefreq}</changefreq><priority>${url.priority}</priority></url>`).join('')}</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
