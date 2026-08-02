/**
 * Storefront & Hub URL Helpers (GAP-P1-012)
 *
 * Ensures all Hub links (e.g. /hub/login, /hub/cart, /hub) render as absolute URLs
 * so they work seamlessly from storefront subdomains and custom domains without being rewritten.
 */

export function getHubBaseUrl(): string {
  const envHubUrl = process.env.NEXT_PUBLIC_HUB_URL?.trim();
  if (envHubUrl) {
    return envHubUrl.replace(/\/+$/, '');
  }

  const domain = process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN?.trim() || 'pandamarket.tn';
  if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
    return `http://${domain}`;
  }
  return `https://${domain}`;
}

export function getHubAbsoluteUrl(path = '/hub'): string {
  const baseUrl = getHubBaseUrl();
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '/hub';
  return `${baseUrl}${normalizedPath}`;
}

export function getStorefrontAbsoluteUrl(storeHost: string, path = '/'): string {
  const hubBaseUrl = getHubBaseUrl();
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '/';

  if (!storeHost) {
    return `${hubBaseUrl}${normalizedPath}`;
  }

  // Full custom domain or hostname with port (e.g. ma-boutique.com or boutique.pandamarket.tn)
  if (storeHost.includes('.')) {
    const protocol = storeHost.includes('localhost') || storeHost.includes('127.0.0.1') ? 'http' : 'https';
    return `${protocol}://${storeHost}${normalizedPath}`;
  }

  // Subdomain of Hub domain (e.g. "boutique1" -> "https://boutique1.pandamarket.tn")
  try {
    const hubUrl = new URL(hubBaseUrl);
    const domain = hubUrl.host;
    const protocol = hubUrl.protocol;
    return `${protocol}//${storeHost}.${domain}${normalizedPath}`;
  } catch {
    return `${hubBaseUrl}/store/${storeHost}${normalizedPath}`;
  }
}

export interface StorefrontWebsiteOptions {
  storeHost?: string | null;
  slug?: string | null;
  subdomain?: string | null;
  customDomain?: string | null;
  domain?: string | null;
  currentHost?: string | null;
}

export function getStorefrontWebsiteHref(opts: StorefrontWebsiteOptions, path = '/'): string {
  const host = opts.customDomain || opts.domain || opts.storeHost || opts.subdomain || opts.slug || '';
  return getStorefrontAbsoluteUrl(host, path);
}
