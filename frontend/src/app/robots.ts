import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://pandamarket.tn';

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
