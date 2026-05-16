import { MetadataRoute } from 'next';
import { getMarketplacePublicUrl, getMarketplaceSettings } from '../lib/marketplace-settings';

export default async function robots(): Promise<MetadataRoute.Robots> {
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
