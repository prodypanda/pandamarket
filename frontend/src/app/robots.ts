import { headers } from 'next/headers';
import { MetadataRoute } from 'next';
import { getMarketplacePublicUrl, getMarketplaceSettings } from '../lib/marketplace-settings';
import { classifyHost } from '../lib/store-hosts';
import { getStorefrontCanonicalUrl, isEmptyStore, isPublicStore, type StorefrontSeoStore } from '../lib/storefront-seo';

export const dynamic = 'force-dynamic';

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

function getStorefrontRobots(host: string, store: StorefrontSeoStore): MetadataRoute.Robots {
  const publicStore = isPublicStore(store) && !isEmptyStore(store);
  const canonical = getStorefrontCanonicalUrl(host, store, '/').replace(/\/$/, '');
  return {
    rules: {
      userAgent: '*',
      ...(publicStore
        ? {
            allow: '/',
            disallow: ['/account', '/cart', '/checkout', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/preview'],
          }
        : { disallow: '/' }),
    },
    sitemap: `${canonical}/sitemap.xml`,
  };
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host')?.trim() || '';
  if (host && classifyHost(host) === 'storefront') {
    const store = await getStoreByHost(host);
    if (!store) {
      return { rules: { userAgent: '*', disallow: '/' } };
    }
    return getStorefrontRobots(host, store);
  }

  const marketplaceSettings = await getMarketplaceSettings();
  const baseUrl = getMarketplacePublicUrl(marketplaceSettings);

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/hub/dashboard/',
          '/hub/checkout/',
          '/hub/cart',
          '/hub/orders',
          '/hub/profile',
          '/api/',
          '/admin/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
