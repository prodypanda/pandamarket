const LOCAL_STORAGE_HOSTS = new Set(['localhost:9100', '127.0.0.1:9100', '[::1]:9100']);
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
    if (LOCAL_STORAGE_HOSTS.has(parsed.host) && isProxiedPublicPath(parsed.pathname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return value;
  }

  return value;
}
