/**
 * Centralised API configuration for PandaMarket frontend.
 *
 * Server components use BACKEND_URL (internal, not exposed to browser).
 * Client components use NEXT_PUBLIC_BACKEND_URL (exposed to browser).
 *
 * Default: http://localhost:9000 (matches backend config.ts PD_PORT default).
 */

/** For server components (SSR / RSC) — never exposed to the browser. */
export const BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:9000';

/** For client components — must use NEXT_PUBLIC_ prefix to be available in the browser. */
export const PUBLIC_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:9000';

/** Full API base path for server-side fetches. */
export const API_BASE = `${BACKEND_URL}/api/pd`;

/** Full API base path for client-side fetches. */
export const PUBLIC_API_BASE = `${PUBLIC_BACKEND_URL}/api/pd`;

const CSRF_COOKIE = 'pd_csrf';
const CSRF_HEADER = 'X-CSRF-Token';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

export async function ensureCsrfToken(): Promise<string | null> {
  let token = getCookie(CSRF_COOKIE);
  if (token) return token;

  await fetch('/api/pd/auth/csrf', { credentials: 'include' }).catch(() => undefined);
  token = getCookie(CSRF_COOKIE);

  return token;
}

export async function fetchWithCsrf(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = String(init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (MUTATING_METHODS.has(method)) {
    const token = await ensureCsrfToken();
    if (token) headers.set(CSRF_HEADER, token);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
  });
}
