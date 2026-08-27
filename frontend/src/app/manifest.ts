import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PandaMarket Tunisie - Marketplace & Boutiques en Ligne',
    short_name: 'PandaMarket',
    description: 'La première marketplace et plateforme e-commerce multi-vendeurs en Tunisie.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#059669',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
