/**
 * PandaMarket Host Classification & Routing Helpers (GAP-P1-011)
 *
 * Provides a single, unified, serializable host classification function
 * used in both Next.js middleware and frontend application components.
 */

const STATIC_MARKETPLACE_HOSTS = [
  'localhost:3000',
  '127.0.0.1:3000',
  '[::1]:3000',
  'pandamarket.local:3000',
  'pandamarket.tn',
  'www.pandamarket.tn',
  'garbage.team',
  'www.garbage.team',
];

const STATIC_ADMIN_HOSTS = [
  'admin.localhost:3000',
  'admin.127.0.0.1:3000',
  'admin.pandamarket.local:3000',
  'admin.pandamarket.tn',
  'admin.garbage.team',
];

const PLATFORM_BASES = [
  '.pandamarket.local:3000',
  '.localhost:3000',
  '.pandamarket.tn',
  '.garbage.team',
];

const PRIVATE_HOST_PATTERN =
  /^(localhost|127(?:\.\d{1,3}){3}|\[::1\]|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?$/i;

function extractHost(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

function buildMarketplaceHosts(): Set<string> {
  const hosts = new Set(STATIC_MARKETPLACE_HOSTS);
  const candidates = [
    process.env.NEXT_PUBLIC_HUB_URL,
    process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN,
    process.env.VERCEL_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
  ];
  for (const candidate of candidates) {
    const host = extractHost(candidate);
    if (!host) continue;
    hosts.add(host);
    hosts.add(host.startsWith('www.') ? host.slice(4) : `www.${host}`);
  }
  return hosts;
}

export const MARKETPLACE_HOSTS = buildMarketplaceHosts();

export function getHostNameOnly(hostname: string): string {
  const lower = hostname.trim().toLowerCase();
  if (lower.startsWith('[')) {
    const closingBracketIndex = lower.indexOf(']');
    return closingBracketIndex >= 0 ? lower.slice(1, closingBracketIndex) : lower;
  }
  return lower.split(':')[0];
}

export function isAdminHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (!normalized) return false;
  if (STATIC_ADMIN_HOSTS.includes(normalized)) return true;

  const hostOnly = getHostNameOnly(normalized);
  if (hostOnly.endsWith('.vercel.app') || hostOnly.endsWith('.onrender.com') || hostOnly.endsWith('.render.com')) {
    const parts = hostOnly.split('.');
    if (parts.length >= 2 && parts[0] === 'admin') {
      return true;
    }
  }
  return false;
}

export function isMarketplaceHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (!normalized) return false;
  if (isAdminHost(normalized)) return false;
  if (MARKETPLACE_HOSTS.has(normalized)) return true;

  if (PRIVATE_HOST_PATTERN.test(normalized)) return true;

  const hostOnly = getHostNameOnly(normalized);
  if (hostOnly.endsWith('.vercel.app') || hostOnly.endsWith('.onrender.com') || hostOnly.endsWith('.render.com')) {
    const parts = hostOnly.split('.');
    // Subdomain on vercel e.g. boutique1.myapp.vercel.app is storefront, root app is hub
    if (parts.length > 3) return false;
    return true;
  }
  return false;
}

export function extractStoreSubdomain(host: string): string | null {
  const normalized = host.trim().toLowerCase();
  if (!normalized || isMarketplaceHost(normalized) || isAdminHost(normalized)) {
    return null;
  }

  for (const base of PLATFORM_BASES) {
    if (normalized.endsWith(base)) {
      return normalized.replace(base, '');
    }
  }

  const hostOnly = getHostNameOnly(normalized);
  if (hostOnly.endsWith('.vercel.app')) {
    const parts = hostOnly.split('.');
    if (parts.length === 4 && parts[0] !== 'admin') {
      return parts[0];
    }
  }

  return null;
}

export type HostType = 'hub' | 'admin' | 'storefront';

export function classifyHost(host: string): HostType {
  const normalized = host.trim().toLowerCase();
  if (!normalized) return 'hub';
  if (isAdminHost(normalized)) return 'admin';
  if (isMarketplaceHost(normalized)) return 'hub';
  return 'storefront';
}

export function getStorePathBase(storeHost: string, host: string): string {
  return isMarketplaceHost(host) ? `/store/${storeHost}` : '';
}
