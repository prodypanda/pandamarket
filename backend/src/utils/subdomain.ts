/**
 * Validate a subdomain string for vendor stores.
 * Rules:
 *   - 3 to 50 chars
 *   - lowercase letters, digits, hyphens
 *   - must start and end with alphanumeric
 *   - reserved words blocked (admin, api, www, etc.)
 */

const RESERVED = new Set([
  'admin',
  'api',
  'www',
  'app',
  'dashboard',
  'pandamarket',
  'mail',
  'ftp',
  'ssh',
  'staging',
  'dev',
  'test',
  'help',
  'support',
  'shop',
  'store',
  'docs',
  'blog',
  'cdn',
  'static',
  'public',
  'private',
  'auth',
  'login',
  'register',
  'search',
]);

const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/;

export function isValidSubdomain(subdomain: string): boolean {
  if (typeof subdomain !== 'string') return false;
  const s = subdomain.toLowerCase();
  if (s.length < 3 || s.length > 50) return false;
  if (RESERVED.has(s)) return false;
  if (s.startsWith('-') || s.endsWith('-')) return false;
  return SUBDOMAIN_RE.test(s);
}

export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED.has(subdomain.toLowerCase());
}

/**
 * Slugify an arbitrary string (for product slugs, category slugs).
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .slice(0, 80);
}
