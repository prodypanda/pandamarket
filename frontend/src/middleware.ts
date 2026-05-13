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
    '/((?!api/|_next/|_static/|_vercel|pd-product-images/|pd-themes/|[\\w-]+\\.\\w+).*)',
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
  '127.0.0.1:3000',
  '[::1]:3000',
  'pandamarket.local:3000',
  'pandamarket.tn',
  'www.pandamarket.tn',
]);

// Admin domains — the super admin panel
const ADMIN_DOMAINS = new Set([
  'admin.localhost:3000',
  'admin.127.0.0.1:3000',
  'admin.pandamarket.local:3000',
  'admin.pandamarket.tn',
]);

// Platform base domains used for subdomain extraction
const PLATFORM_BASES = [
  '.pandamarket.local:3000',
  '.localhost:3000',
  '.pandamarket.tn',
];

const AUTH_ROUTE_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password'];

const PROTECTED_HUB_ROUTE_PREFIXES = [
  '/hub/account',
  '/hub/dashboard',
  '/hub/orders',
  '/hub/messages',
  '/hub/profile',
  '/hub/wishlist',
];

const ADMIN_ROUTE_PREFIXES = [
  '/dashboard',
  '/kyc',
  '/mandats',
  '/messages',
  '/reports',
  '/users',
  '/vendors',
  '/stores',
  '/withdrawals',
  '/plans',
  '/marketplace-categories',
  '/ai-costs',
  '/audit-log',
  '/system-logs',
  '/smtp-config',
  '/settings',
];

function matchesRoutePrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getHostNameOnly(hostname: string) {
  const lower = hostname.toLowerCase();
  if (lower.startsWith('[')) {
    const closingBracketIndex = lower.indexOf(']');
    return closingBracketIndex >= 0 ? lower.slice(1, closingBracketIndex) : lower;
  }
  return lower.split(':')[0];
}

function isPrivateLanHost(hostname: string) {
  const host = getHostNameOnly(hostname);
  const parts = host.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [first, second] = parts;
  return first === 10 || first === 127 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function isHubHost(hostname: string) {
  return HUB_DOMAINS.has(hostname.toLowerCase()) || isPrivateLanHost(hostname);
}

function hasAuthCookie(req: NextRequest) {
  return Boolean(req.cookies.get('pd_at')?.value);
}

function redirectToLogin(req: NextRequest, loginPath = '/login/buyer') {
  const loginUrl = new URL(loginPath, req.url);
  const nextPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  loginUrl.searchParams.set('next', nextPath);
  return NextResponse.redirect(loginUrl);
}

interface MaintenanceStatus {
  maintenance_enabled: boolean;
  maintenance_block_storefronts: boolean;
}

async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/marketplace/settings`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) return { maintenance_enabled: false, maintenance_block_storefronts: false };
    const data = await res.json();
    return {
      maintenance_enabled: data.data?.maintenance_enabled === 'true',
      maintenance_block_storefronts: data.data?.maintenance_block_storefronts === 'true',
    };
  } catch {
    return { maintenance_enabled: false, maintenance_block_storefronts: false };
  }
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || 'pandamarket.local:3000';

  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''}`;

  // 1. Hub central (pandamarket.tn)
  if (isHubHost(hostname)) {
    if (url.pathname === '/store' || url.pathname.startsWith('/store/')) {
      return NextResponse.next();
    }

    if (url.pathname === '/maintenance') {
      return NextResponse.next();
    }

    if (
      matchesRoutePrefix(url.pathname, PROTECTED_HUB_ROUTE_PREFIXES) ||
      matchesRoutePrefix(url.pathname, ADMIN_ROUTE_PREFIXES)
    ) {
      if (!hasAuthCookie(req)) {
        const loginPath = matchesRoutePrefix(url.pathname, ADMIN_ROUTE_PREFIXES)
          ? '/login/admin'
          : url.pathname.startsWith('/hub/dashboard')
            ? '/login/seller'
            : '/login/buyer';
        return redirectToLogin(req, loginPath);
      }
    }

    // Maintenance check for hub — bypass admin routes, auth routes, and authenticated admin users
    const isAdminRoute = matchesRoutePrefix(url.pathname, ADMIN_ROUTE_PREFIXES);
    const isAuthRoute = matchesRoutePrefix(url.pathname, AUTH_ROUTE_PREFIXES);
    if (!isAdminRoute && !isAuthRoute) {
      const maintenance = await getMaintenanceStatus();
      if (maintenance.maintenance_enabled) {
        return NextResponse.rewrite(new URL('/maintenance', req.url));
      }
    }

    if (
      url.pathname === '/hub' ||
      url.pathname.startsWith('/hub/') ||
      matchesRoutePrefix(url.pathname, AUTH_ROUTE_PREFIXES) ||
      matchesRoutePrefix(url.pathname, ADMIN_ROUTE_PREFIXES)
    ) {
      return NextResponse.next();
    }

    return NextResponse.rewrite(new URL(`/hub${path}`, req.url));
  }

  // 2. Admin panel (admin.pandamarket.tn)
  if (ADMIN_DOMAINS.has(hostname)) {
    if (!matchesRoutePrefix(url.pathname, AUTH_ROUTE_PREFIXES) && !hasAuthCookie(req)) {
      return redirectToLogin(req, '/login/admin');
    }

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

  // Maintenance check for storefronts
  const maintenance = await getMaintenanceStatus();
  if (maintenance.maintenance_enabled && maintenance.maintenance_block_storefronts) {
    return NextResponse.rewrite(new URL('/maintenance', req.url));
  }

  // Rewrite to the storefront route — the page fetches store data by hostname
  const storePath = url.pathname === '/' ? '' : url.pathname;
  const storeSearch = searchParams.length > 0 ? `?${searchParams}` : '';
  return NextResponse.rewrite(new URL(`/store/${storeHost}${storePath}${storeSearch}`, req.url));
}
