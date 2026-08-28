/**
 * Frontend response security policy.
 *
 * Keep the policy in a small, dependency-free helper so it can be used by
 * Next's config boundary and tested without starting a browser or dev server.
 * Values are origins only; credentials and arbitrary URL paths are never
 * copied into a response header.
 */

type Environment = Record<string, string | undefined>;

const DEFAULT_BACKEND_ORIGIN = 'https://pandamarket-backend-fjom.onrender.com';
const DEFAULT_IMAGE_SOURCES = [
  'https://*.pandamarket.tn',
  'https://*.vercel.app',
  'https://*.onrender.com',
  'https://*.supabase.co',
  'https://*.storage.supabase.co',
  'https://*.r2.cloudflarestorage.com',
  'https://images.unsplash.com',
  'https://plus.unsplash.com',
  'https://picsum.photos',
  'https://images.pexels.com',
  'https://garbage.team',
  'https://*.garbage.team',
];

function originFrom(value?: string): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(normalized) ? normalized : `https://${normalized}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function configuredOrigins(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((entry) => originFrom(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function isProduction(environment: Environment): boolean {
  return environment.NODE_ENV === 'production';
}

function isHstsEnabled(environment: Environment): boolean {
  return environment.PD_ENABLE_HSTS === 'true'
    || (isProduction(environment) && environment.VERCEL_ENV !== 'preview');
}

function isReportOnly(environment: Environment): boolean {
  return environment.PD_CSP_REPORT_ONLY === 'true';
}

export function buildContentSecurityPolicy(environment: Environment = process.env): string {
  const production = isProduction(environment);
  const backendOrigins = unique([
    originFrom(environment.BACKEND_URL),
    originFrom(environment.NEXT_PUBLIC_BACKEND_URL),
    originFrom(DEFAULT_BACKEND_ORIGIN),
  ]);
  const storageOrigin = originFrom(
    environment.PD_S3_PUBLIC_PROXY_URL
      || environment.NEXT_PUBLIC_S3_PUBLIC_PROXY_URL
      || environment.PD_S3_ENDPOINT,
  );
  const connectSources = unique([
    ...backendOrigins,
    ...backendOrigins.map((origin) => origin.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')),
    originFrom(environment.NEXT_PUBLIC_HUB_URL),
    originFrom(environment.NEXT_PUBLIC_MARKETPLACE_DOMAIN),
    storageOrigin,
    'https://*.r2.cloudflarestorage.com',
    'https://*.r2.dev',
    'https://*.garbage.team',
    'https://garbage.team',
    'https://*.pandamarket.tn',
    'https://pandamarket.tn',
    'https://*.supabase.co',
    'https://*.storage.supabase.co',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://analytics.google.com',
    'https://www.googletagmanager.com',
    'https://connect.facebook.net',
    'https://graph.facebook.com',
    'https://www.facebook.com',
    'https://*.facebook.com',
    'https://developers.flouci.com',
    'https://api.konnect.network',
    'https://api.preprod.konnect.network',
  ]);
  const imageSources = unique([
    ...DEFAULT_IMAGE_SOURCES,
    storageOrigin,
    ...configuredOrigins(environment.PD_CSP_IMAGE_SOURCES),
  ]);
  const mediaSources = unique([
    ...imageSources,
    ...configuredOrigins(environment.PD_CSP_MEDIA_SOURCES),
  ]);
  const developmentAssetSources = production
    ? []
    : ['http://localhost:*', 'http://127.0.0.1:*'];
  const developmentSources = production
    ? []
    : ["'unsafe-eval'", 'http://localhost:*', 'ws://localhost:*'];

  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    ['base-uri', ["'self'"]],
    ['object-src', ["'none'"]],
    ['frame-ancestors', ["'none'"]],
    ['form-action', ["'self'"]],
    ['script-src', ["'self'", "'unsafe-inline'", ...developmentSources, 'https://www.googletagmanager.com', 'https://connect.facebook.net']],
    ['script-src-attr', ["'none'"]],
    ['style-src', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']],
    ['font-src', ["'self'", 'data:', 'https://fonts.gstatic.com']],
    ['img-src', ["'self'", 'data:', 'blob:', ...imageSources, ...developmentAssetSources]],
    ['media-src', ["'self'", 'data:', 'blob:', ...mediaSources, ...developmentAssetSources]],
    ['connect-src', ["'self'", ...connectSources, ...(production ? [] : ['http://localhost:*', 'ws://localhost:*'])]],
    ['frame-src', ["'self'", 'https://www.googletagmanager.com', 'https://flouci.com', 'https://pay.konnect.network', 'https://www.google.com', 'https://maps.google.com', 'https://maps.googleapis.com']],
    ['worker-src', ["'self'", 'blob:']],
    ['manifest-src', ["'self'"]],
    ['report-uri', ['/api/csp-report']],
  ];

  if (production) directives.push(['upgrade-insecure-requests', []]);

  return directives
    .map(([name, values]) => [name, ...values].join(' '))
    .join('; ');
}

export function getFrontendSecurityHeaders(environment: Environment = process.env): Array<{ key: string; value: string }> {
  const csp = buildContentSecurityPolicy(environment);
  const headers: Array<{ key: string; value: string }> = [
    {
      key: isReportOnly(environment) ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
      value: csp,
    },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  ];

  if (isHstsEnabled(environment)) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    });
  }

  return headers;
}
