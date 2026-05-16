import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:9000';
    const publicStorageUrl = (
      process.env.PD_S3_PUBLIC_PROXY_URL ||
      process.env.PD_S3_ENDPOINT ||
      process.env.NEXT_PUBLIC_S3_PUBLIC_PROXY_URL ||
      'http://localhost:9100'
    ).replace(/\/$/, '');

    return [
      {
        source: '/api/pd/:path*',
        destination: `${backendUrl}/api/pd/:path*`,
      },
      {
        source: '/pd-product-images/:path*',
        destination: `${publicStorageUrl}/pd-product-images/:path*`,
      },
      {
        source: '/pd-themes/:path*',
        destination: `${publicStorageUrl}/pd-themes/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: '*.pandamarket.local',
      },
      {
        protocol: 'https',
        hostname: '*.pandamarket.tn',
      },
      {
        protocol: 'https',
        hostname: 'pandamarket.tn',
      },
    ],
  },
};

export default nextConfig;
