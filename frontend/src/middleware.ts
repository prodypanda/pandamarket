import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. favicon.ico)
     */
    '/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)',
  ],
};

/**
 * PandaMarket Multi-Tenant Middleware
 *
 * Routing logic:
 * 1. Hub domains (pandamarket.tn, www.pandamarket.tn) → /hub/*
 * 2. Admin subdomain (admin.pandamarket.tn) → /(admin)/*
 * 3. Known subdomains (*.pandamarket.tn) → /store/{subdomain}/*
 * 4. Custom domains (ma-boutique.com) → /store/{hostname}/*
 *    The storefront page resolves the store via /api/pd/stores/by-host/:hostname
 */

// Hub domains — the main marketplace portal
const HUB_DOMAINS = new Set([
  'localhost:3000',
  'pandamarket.local:3000',
  'pandamarket.tn',
  'www.pandamarket.tn',
]);

// Admin domains — the super admin panel
const ADMIN_DOMAINS = new Set([
  'admin.localhost:3000',
  'admin.pandamarket.local:3000',
  'admin.pandamarket.tn',
]);

// Platform base domains used for subdomain extraction
const PLATFORM_BASES = [
  '.pandamarket.local:3000',
  '.localhost:3000',
  '.pandamarket.tn',
];

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || 'pandamarket.local:3000';

  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''}`;

  // 1. Hub central (pandamarket.tn)
  if (HUB_DOMAINS.has(hostname)) {
    return NextResponse.rewrite(new URL(`/hub${path}`, req.url));
  }

  // 2. Admin panel (admin.pandamarket.tn)
  if (ADMIN_DOMAINS.has(hostname)) {
    // Admin routes are under /(admin)/ in the app directory
    // The path already maps correctly since (admin) is a route group
    return NextResponse.rewrite(new URL(path, req.url));
  }

  // 3. Check if this is a subdomain of the platform (e.g. boutique1.pandamarket.tn)
  let storeHost: string | null = null;
  for (const base of PLATFORM_BASES) {
    if (hostname.endsWith(base)) {
      storeHost = hostname.replace(base, '');
      break;
    }
  }

  // 4. If no platform subdomain matched, this is a custom domain (e.g. ma-boutique.com)
  //    The storefront page will resolve the store via the API using the full hostname
  if (!storeHost) {
    storeHost = hostname;
  }

  // Rewrite to the storefront route — the page fetches store data by hostname
  return NextResponse.rewrite(new URL(`/store/${storeHost}${path}`, req.url));
}
