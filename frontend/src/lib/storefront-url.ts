export function getStorefrontWebsiteHref(opts: {
  subdomain?: string | null;
  customDomain?: string | null;
}): string | null {
  const customDomain = opts.customDomain?.trim();
  if (customDomain) {
    return /^https?:\/\//i.test(customDomain) ? customDomain : `https://${customDomain}`;
  }

  const subdomain = opts.subdomain?.trim();
  if (!subdomain) return null;

  // Only build a wildcard-subdomain URL when the platform domain is explicitly
  // configured. Otherwise fall back to the path-based storefront route, which
  // works on any deployment (Vercel URLs, custom domains, localhost) without
  // requiring wildcard DNS.
  const baseDomain = (process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || '').trim();
  if (!baseDomain) {
    // Path-based storefront: force the seller's own themed website view so this
    // link stays distinct from the marketplace seller page at /store/{subdomain}.
    return `/store/${encodeURIComponent(subdomain)}?view=website`;
  }

  const cleanBaseDomain = baseDomain.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  return `https://${subdomain}.${cleanBaseDomain}`;
}
