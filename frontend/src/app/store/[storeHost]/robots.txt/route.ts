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

export async function GET(
  _request: Request,
  context: { params: Promise<{ storeHost: string }> },
) {
  const { storeHost } = await context.params;
  const decodedHost = decodeURIComponent(storeHost);
  const store = await getStore(decodedHost);
  const publicStore = isPublicStore(store);
  const emptyStore = Boolean(store && store.product_count !== null && store.product_count !== undefined && Number(store.product_count) === 0);
  const canonical = store ? getStorefrontCanonicalUrl(decodedHost, store, '/') : null;
  const sitemap = canonical ? `${canonical.replace(/\/$/, '')}/sitemap.xml` : null;
  const body = [
    'User-agent: *',
    ...(publicStore && !emptyStore ? ['Allow: /', 'Disallow: /account', 'Disallow: /cart', 'Disallow: /checkout', 'Disallow: /login', 'Disallow: /register', 'Disallow: /forgot-password', 'Disallow: /reset-password', 'Disallow: /verify-email', 'Disallow: /preview'] : ['Disallow: /']),
    ...(sitemap ? [`Sitemap: ${sitemap}`] : []),
    '',
  ].join('\n');

  return new NextResponse(body, {
    status: store ? 200 : 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
}
