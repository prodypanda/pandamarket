const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const PROXIED_PUBLIC_BUCKET_PATHS = ['/pd-product-images/', '/pd-themes/'];

function isProxiedPublicPath(pathname: string) {
  return PROXIED_PUBLIC_BUCKET_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export function normalizePublicAssetUrl(url?: string | null): string {
  const value = url?.trim();
  if (!value) return '';
  if (isProxiedPublicPath(value)) return value;

  try {
    const parsed = new URL(value);
    if (LOCAL_HOSTNAMES.has(parsed.hostname) && isProxiedPublicPath(parsed.pathname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return value;
  }

  return value;
}

export type LogoSurface = 'light' | 'dark';

export interface LogoSet {
  logo_url?: string | null;
  logo_light_url?: string | null;
  logo_dark_url?: string | null;
  marketplace_logo_url?: string | null;
  marketplace_logo_light_url?: string | null;
  marketplace_logo_dark_url?: string | null;
}

export function selectLogoForSurface(logos?: LogoSet | null, surface: LogoSurface = 'light'): string {
  const preferred = surface === 'dark'
    ? logos?.logo_light_url || logos?.marketplace_logo_light_url
    : logos?.logo_dark_url || logos?.marketplace_logo_dark_url;
  const fallback = logos?.logo_url || logos?.marketplace_logo_url;
  return normalizePublicAssetUrl(preferred || fallback);
}
