import type { NextConfig } from "next";
import { getFrontendSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Covers Hub, tenant/custom-domain storefronts, admin, previews, and
        // static assets. API routes remain intentionally outside middleware,
        // but still receive the same browser-facing policy.
        source: '/(.*)',
        headers: getFrontendSecurityHeaders(),
      },
    ];
  },
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://pandamarket-backend-fjom.onrender.com';
    const publicStorageUrl = (
      process.env.PD_S3_PUBLIC_PROXY_URL ||
      process.env.PD_S3_ENDPOINT ||
      process.env.NEXT_PUBLIC_S3_PUBLIC_PROXY_URL ||
      backendUrl
    ).replace(/\/$/, '');

    return [
      {
        source: '/api/pd/:path*',
        destination: `${backendUrl}/api/pd/:path*`,
      },
      {
        source: '/pd-product-images/:path*',
        destination: `${backendUrl}/pd-product-images/:path*`,
      },
      {
        source: '/pd-themes/:path*',
        destination: `${backendUrl}/pd-themes/:path*`,
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
      {
        protocol: 'https',
        hostname: '*.vercel.app',
      },
      {
        protocol: 'https',
        hostname: '*.onrender.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.storage.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'garbage.team',
      },
      {
        protocol: 'https',
        hostname: '*.garbage.team',
      },
      {
        protocol: 'http',
        hostname: 'garbage.team',
      },
      {
        protocol: 'http',
        hostname: '*.garbage.team',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
};

export default nextConfig;
