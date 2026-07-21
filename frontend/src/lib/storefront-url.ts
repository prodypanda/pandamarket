// Known platform apex domains. Keep in sync with HUB_DOMAINS / PLATFORM_BASES
// in frontend/src/middleware.ts.
const KNOWN_PLATFORM_BASE_DOMAINS = ['pandamarket.tn', 'garbage.team'];

// Hosts that never support wildcard storefront subdomains.
const NON_PLATFORM_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'pandamarket.local']);

function stripPort(host: string): string {
  const lower = host.trim().toLowerCase();
  if (lower.startsWith('[')) {
    const closingBracketIndex = lower.indexOf(']');
    return closingBracketIndex >= 0 ? lower.slice(1, closingBracketIndex) : lower;
  }
  return lower.split(':')[0];
}

/**
 * Derives the platform base domain (e.g. "garbage.team") used to build
 * wildcard storefront subdomain URLs (e.g. atelier-medina.garbage.team).
 *
 * Priority:
 * 1. NEXT_PUBLIC_MARKETPLACE_DOMAIN env var when explicitly configured
 * 2. The current request host, when it is a real platform domain
 *    (localhost, private IPs and *.vercel.app are excluded because they
 *    do not support wildcard subdomains)
 */
export function getPlatformBaseDomain(
  currentHost?: string | null,
  storeSubdomain?: string | null,
): string | null {
  const envBase = (process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || '').trim();
  if (envBase) {
    return envBase.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  }

  const host = stripPort(currentHost || '');
  if (!host || NON_PLATFORM_HOSTS.has(host)) return null;
  // Vercel deployment URLs do not support wildcard store subdomains.
  if (host.endsWith('.vercel.app')) return null;
  // Raw IPv4 addresses are never platform domains.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

  // Known platform apex domains win, whatever the current subdomain is.
  for (const base of KNOWN_PLATFORM_BASE_DOMAINS) {
    if (host === base || host.endsWith(`.${base}`)) return base;
  }

  // Generic derivation: strip well-known platform prefixes.
  let base = host.replace(/^www\./, '').replace(/^admin\./, '');
  // When browsing a storefront on its own subdomain, strip that label too
  // so we do not build nested subdomains (sub.sub.domain).
  const cleanSubdomain = storeSubdomain?.trim().toLowerCase();
  if (cleanSubdomain && base.startsWith(`${cleanSubdomain}.`)) {
    base = base.slice(cleanSubdomain.length + 1);
  }
  return base.includes('.') ? base : null;
}

export function getStorefrontWebsiteHref(opts: {
  subdomain?: string | null;
  customDomain?: string | null;
  /** Host of the current request (from the `host` header), used to derive the platform domain. */
  currentHost?: string | null;
}): string | null {
  // 1. A pointed (custom) domain always wins.
  const customDomain = opts.customDomain?.trim();
  if (customDomain) {
    return /^https?:\/\//i.test(customDomain) ? customDomain : `https://${customDomain}`;
  }

  const subdomain = opts.subdomain?.trim();
  if (!subdomain) return null;

  // 2. Wildcard subdomain on the platform domain (env override or derived
  //    from the current request host), e.g. https://atelier-medina.garbage.team
  const baseDomain = getPlatformBaseDomain(opts.currentHost, subdomain);
  if (baseDomain) {
    return `https://${subdomain}.${baseDomain}`;
  }

  // 3. Path-based storefront fallback: works on any deployment (Vercel URLs,
  //    localhost) without requiring wildcard DNS. Forces the seller's own
  //    themed website view so this link stays distinct from the marketplace
  //    seller page at /store/{subdomain}.
  return `/store/${encodeURIComponent(subdomain)}?view=website`;
}
