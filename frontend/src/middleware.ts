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
  'garbage.team',
  'www.garbage.team',
]);

// Admin domains — the super admin panel
const ADMIN_DOMAINS = new Set([
  'admin.localhost:3000',
  'admin.127.0.0.1:3000',
  'admin.pandamarket.local:3000',
  'admin.pandamarket.tn',
  'admin.garbage.team',
]);

// Platform base domains used for subdomain extraction
const PLATFORM_BASES = [
  '.pandamarket.local:3000',
  '.localhost:3000',
  '.pandamarket.tn',
  '.garbage.team',
];

const AUTH_ROUTE_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password'];
const OPERATIONAL_ROUTE_PREFIXES = ['/health', '/ready', '/metrics'];

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
  '/buyers',
  '/stores',
  '/withdrawals',
  '/plans',
  '/marketplace-categories',
  '/platform-media',
  '/ai-costs',
  '/audit-log',
  '/seller-audit-log',
  '/buyer-audit-log',
  '/system-logs',
  '/smtp-config',
  '/settings',
  '/ads',
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
  const hostWithPort = hostname.toLowerCase();
  if (HUB_DOMAINS.has(hostWithPort) || isPrivateLanHost(hostname)) {
    return true;
  }
  const host = getHostNameOnly(hostname).toLowerCase();
  if (host.endsWith('.vercel.app')) {
    const parts = host.split('.');
    if (parts.length === 3) {
      return true;
    }
  }
  return false;
}

function isAdminHost(hostname: string) {
  const hostWithPort = hostname.toLowerCase();
  if (ADMIN_DOMAINS.has(hostWithPort)) {
    return true;
  }
  const host = getHostNameOnly(hostname).toLowerCase();
  if (host.endsWith('.vercel.app')) {
    const parts = host.split('.');
    if (parts.length === 4 && parts[0] === 'admin') {
      return true;
    }
  }
  return false;
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
  maintenance_active_for_request: boolean;
  maintenance_block_storefronts: boolean;
}

interface StorefrontStatus {
  status?: string | null;
}

function getClientIp(req: NextRequest) {
  return req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || '';
}

function forwardedIpHeaders(req: NextRequest) {
  const clientIp = getClientIp(req);
  return clientIp ? { 'x-forwarded-for': clientIp } : undefined;
}

async function getMaintenanceStatus(req: NextRequest): Promise<MaintenanceStatus> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/marketplace/maintenance`, {
      headers: forwardedIpHeaders(req),
      cache: 'no-store',
    });
    if (!res.ok) return { maintenance_enabled: false, maintenance_active_for_request: false, maintenance_block_storefronts: false };
    const data = await res.json();
    const enabled = data.data?.maintenance_enabled === true || data.data?.maintenance_enabled === 'true';
    const activeForRequest = data.data?.maintenance_active_for_request === true || data.data?.maintenance_active_for_request === 'true';
    const blockStorefronts = data.data?.maintenance_block_storefronts === true || data.data?.maintenance_block_storefronts === 'true';
    return {
      maintenance_enabled: enabled,
      maintenance_active_for_request: activeForRequest,
      maintenance_block_storefronts: blockStorefronts,
    };
  } catch {
    return { maintenance_enabled: false, maintenance_active_for_request: false, maintenance_block_storefronts: false };
  }
}

async function getStorefrontStatus(storeHost: string, req: NextRequest): Promise<StorefrontStatus | null> {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetch(`${backendUrl}/api/pd/stores/by-host/${encodeURIComponent(storeHost)}`, {
      headers: forwardedIpHeaders(req),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { status: data.store?.status };
  } catch {
    return null;
  }
}

function getStoreHostFromMarketplacePath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] === 'store' && segments[1] ? decodeURIComponent(segments[1]) : null;
}

function isStoreMaintenancePath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] === 'store' && segments[2] === 'maintenance';
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || 'pandamarket.local:3000';

  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''}`;

  // 1. Hub central (pandamarket.tn)
  if (isHubHost(hostname)) {
    if (url.pathname === '/store' || url.pathname.startsWith('/store/')) {
      const maintenance = await getMaintenanceStatus(req);
      if (maintenance.maintenance_active_for_request && maintenance.maintenance_block_storefronts) {
        return NextResponse.rewrite(new URL('/maintenance', req.url));
      }
      const storeRouteHost = getStoreHostFromMarketplacePath(url.pathname);
      if (storeRouteHost && !isStoreMaintenancePath(url.pathname) && !url.searchParams.has('pb_preview')) {
        const storeStatus = await getStorefrontStatus(storeRouteHost, req);
        if (storeStatus?.status === 'maintenance') {
          return NextResponse.rewrite(new URL(`/store/${encodeURIComponent(storeRouteHost)}/maintenance`, req.url));
        }
      }
      return NextResponse.next();
    }

    if (url.pathname === '/maintenance') {
      return NextResponse.next();
    }

    if (matchesRoutePrefix(url.pathname, OPERATIONAL_ROUTE_PREFIXES)) {
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
      const maintenance = await getMaintenanceStatus(req);
      if (maintenance.maintenance_active_for_request) {
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
  if (isAdminHost(hostname)) {
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

  // Check if this is a subdomain of a Vercel deployment (e.g. boutique1.myapp.vercel.app)
  if (!storeHost && hostname.toLowerCase().endsWith('.vercel.app')) {
    const host = getHostNameOnly(hostname).toLowerCase();
    const parts = host.split('.');
    if (parts.length === 4 && parts[0] !== 'admin') {
      storeHost = parts[0];
    }
  }

  // 4. If no platform subdomain matched, this is a custom domain (e.g. ma-boutique.com)
  //    The storefront page will resolve the store via the API using the full hostname
  if (!storeHost) {
    storeHost = hostname;
  }

  // Maintenance check for storefronts
  const maintenance = await getMaintenanceStatus(req);
  if (maintenance.maintenance_active_for_request && maintenance.maintenance_block_storefronts) {
    return NextResponse.rewrite(new URL('/maintenance', req.url));
  }

  if (url.pathname !== '/maintenance' && !url.searchParams.has('pb_preview')) {
    const storeStatus = await getStorefrontStatus(storeHost, req);
    if (storeStatus?.status === 'maintenance') {
      return NextResponse.rewrite(new URL(`/store/${encodeURIComponent(storeHost)}/maintenance`, req.url));
    }
  }

  // Rewrite to the storefront route — the page fetches store data by hostname
  const storePath = url.pathname === '/' ? '' : url.pathname;
  const storeSearch = searchParams.length > 0 ? `?${searchParams}` : '';
  return NextResponse.rewrite(new URL(`/store/${storeHost}${storePath}${storeSearch}`, req.url));
}
