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
  '/products',
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
  '/admin-notes',
  '/subscription-orders',
  '/fraud-radar',
  '/platform-analytics',
  '/cms',
  '/refund-review',
];

function matchesRoutePrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

import { classifyHost, extractStoreSubdomain } from './lib/store-hosts';

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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// =====================================================
// Audit P2-15: middleware previously made two sequential,
// uncached backend round-trips before rendering any
// storefront/hub request (up to ~2s at measured backend
// latency). Both statuses are now fetched in parallel where
// both are needed and cached with a short TTL.
//
// Correctness notes:
// - maintenance_active_for_request depends on the caller IP
//   (allowlist bypass), so that cache is keyed per IP.
// - Storefront status is store-level state, cached per host.
// - Negative results are cached briefly so a down backend
//   degrades instead of adding latency to every request.
// =====================================================
type CachedEntry<T> = { value: T; expires: number };
const STATUS_TTL_MS = 30_000;
const NEGATIVE_TTL_MS = 5_000;
const CACHE_MAX_ENTRIES = 1_000;

const maintenanceCache = new Map<string, CachedEntry<MaintenanceStatus>>();
const storeStatusCache = new Map<string, CachedEntry<StorefrontStatus | null>>();

function getCached<T>(cache: Map<string, CachedEntry<T>>, key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expires <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function setCached<T>(
  cache: Map<string, CachedEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
): void {
  // Simple bound — middleware runs in a shared isolate; never let this grow.
  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

async function getMaintenanceStatus(req: NextRequest): Promise<MaintenanceStatus> {
  const cacheKey = getClientIp(req) || 'no-ip';
  const cached = getCached(maintenanceCache, cacheKey);
  if (cached) return cached;
  const disabledStatus: MaintenanceStatus = {
    maintenance_enabled: false,
    maintenance_active_for_request: false,
    maintenance_block_storefronts: false,
  };
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetchWithTimeout(`${backendUrl}/api/pd/marketplace/maintenance`, {
      headers: forwardedIpHeaders(req),
      cache: 'no-store',
    }, 1500);
    if (!res.ok) {
      setCached(maintenanceCache, cacheKey, disabledStatus, NEGATIVE_TTL_MS);
      return disabledStatus;
    }
    const data = await res.json();
    const enabled = data.data?.maintenance_enabled === true || data.data?.maintenance_enabled === 'true';
    const activeForRequest = data.data?.maintenance_active_for_request === true || data.data?.maintenance_active_for_request === 'true';
    const blockStorefronts = data.data?.maintenance_block_storefronts === true || data.data?.maintenance_block_storefronts === 'true';
    const status: MaintenanceStatus = {
      maintenance_enabled: enabled,
      maintenance_active_for_request: activeForRequest,
      maintenance_block_storefronts: blockStorefronts,
    };
    setCached(maintenanceCache, cacheKey, status, STATUS_TTL_MS);
    return status;
  } catch {
    setCached(maintenanceCache, cacheKey, disabledStatus, NEGATIVE_TTL_MS);
    return disabledStatus;
  }
}

async function getStorefrontStatus(storeHost: string, req: NextRequest): Promise<StorefrontStatus | null> {
  const cached = getCached(storeStatusCache, storeHost);
  if (cached !== undefined) return cached;
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:9000';
    const res = await fetchWithTimeout(`${backendUrl}/api/pd/stores/by-host/${encodeURIComponent(storeHost)}`, {
      headers: forwardedIpHeaders(req),
      cache: 'no-store',
    }, 1500);
    if (!res.ok) {
      setCached(storeStatusCache, storeHost, null, NEGATIVE_TTL_MS);
      return null;
    }
    const data = await res.json();
    const status: StorefrontStatus | null = { status: data.store?.status };
    setCached(storeStatusCache, storeHost, status, STATUS_TTL_MS);
    return status;
  } catch {
    setCached(storeStatusCache, storeHost, null, NEGATIVE_TTL_MS);
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
  const rawHostname = req.headers.get('host') || 'pandamarket.local:3000';
  const hostname = rawHostname.trim().toLowerCase().replace(/\.+$/, '');

  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''}`;

  const hostType = classifyHost(hostname);

  // 1. Hub central (pandamarket.tn)
  if (hostType === 'hub') {
    if (url.pathname === '/store' || url.pathname.startsWith('/store/')) {
      // Audit P2-15: fetch both statuses in parallel instead of sequentially.
      const storeRouteHost = getStoreHostFromMarketplacePath(url.pathname);
      const needsStoreStatus =
        storeRouteHost !== null &&
        !isStoreMaintenancePath(url.pathname) &&
        !url.searchParams.has('pb_preview');
      const [maintenance, storeStatus] = await Promise.all([
        getMaintenanceStatus(req),
        needsStoreStatus && storeRouteHost
          ? getStorefrontStatus(storeRouteHost, req)
          : Promise.resolve(null as StorefrontStatus | null),
      ]);
      if (maintenance.maintenance_active_for_request && maintenance.maintenance_block_storefronts) {
        return NextResponse.rewrite(new URL('/maintenance', req.url));
      }
      if (storeStatus?.status === 'maintenance' && storeRouteHost) {
        return NextResponse.rewrite(new URL(`/store/${encodeURIComponent(storeRouteHost)}/maintenance`, req.url));
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
  if (hostType === 'admin') {
    if (!matchesRoutePrefix(url.pathname, AUTH_ROUTE_PREFIXES) && !hasAuthCookie(req)) {
      return redirectToLogin(req, '/login/admin');
    }

    return NextResponse.rewrite(new URL(path, req.url));
  }

  // 3. Storefront (subdomains or custom domains)
  const storeHost = extractStoreSubdomain(hostname) || hostname;

  // Audit P2-15: both statuses in parallel (was sequential — the single
  // biggest user-visible latency win in the request path).
  const needsStoreStatus = url.pathname !== '/maintenance' && !url.searchParams.has('pb_preview');
  const [maintenance, storeStatus] = await Promise.all([
    getMaintenanceStatus(req),
    needsStoreStatus
      ? getStorefrontStatus(storeHost, req)
      : Promise.resolve(null as StorefrontStatus | null),
  ]);
  if (maintenance.maintenance_active_for_request && maintenance.maintenance_block_storefronts) {
    return NextResponse.rewrite(new URL('/maintenance', req.url));
  }

  if (storeStatus?.status === 'maintenance') {
    return NextResponse.rewrite(new URL(`/store/${encodeURIComponent(storeHost)}/maintenance`, req.url));
  }

  // Rewrite to the storefront route — the page fetches store data by hostname
  const storePath = url.pathname === '/' ? '' : url.pathname;
  const storeSearch = searchParams.length > 0 ? `?${searchParams}` : '';
  return NextResponse.rewrite(new URL(`/store/${storeHost}${storePath}${storeSearch}`, req.url));
}
