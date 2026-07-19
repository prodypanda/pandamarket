const STATIC_MARKETPLACE_HOSTS = [
  'localhost:3000',
  '127.0.0.1:3000',
  '[::1]:3000',
  'pandamarket.local:3000',
  'pandamarket.tn',
  'www.pandamarket.tn',
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

export function isMarketplaceHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (!normalized) return false;
  if (MARKETPLACE_HOSTS.has(normalized)) return true;
  // Local/LAN development hosts always serve the marketplace app.
  if (PRIVATE_HOST_PATTERN.test(normalized)) return true;
  // Vercel deployment URLs (production + previews) serve the marketplace app;
  // seller storefronts only live on wildcard subdomains or custom domains.
  if (normalized.replace(/:\d+$/, '').endsWith('.vercel.app')) return true;
  return false;
}

export function getStorePathBase(storeHost: string, host: string): string {
  return isMarketplaceHost(host) ? `/store/${storeHost}` : '';
}
