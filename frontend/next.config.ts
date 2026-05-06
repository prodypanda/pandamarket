import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:9000';

    return [
      {
        source: '/api/pd/:path*',
        destination: `${backendUrl}/api/pd/:path*`,
      },
    ];
  },
};

export default nextConfig;
