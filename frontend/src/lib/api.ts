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
