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

  const baseDomain = process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || 'pandamarket.tn';
  const cleanBaseDomain = baseDomain.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  return `https://${subdomain}.${cleanBaseDomain}`;
}
