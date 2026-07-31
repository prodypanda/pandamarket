/**
 * Cache tag helpers for storefront store data.
 *
 * Every server-side `getStoreByHost` fetch is tagged with the store's hostname
 * so that on-demand revalidation can bust the ISR cache instantly when the
 * seller updates their theme, settings, or any other store-level data.
 */

/** Time-based fallback revalidation – keeps existing 60s ISR behaviour. */
export const STORE_DATA_REVALIDATE_SECONDS = 60;

function safeTagPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9:._-]/g, '-').slice(0, 120);
}

/** Cache tag keyed by hostname (subdomain / custom domain). */
export function storeHostTag(hostname: string): string {
  return `store-host:${safeTagPart(hostname)}`;
}

/**
 * Trigger on-demand ISR revalidation for a specific store.
 *
 * Accepts the store's subdomain **and** optional custom_domain so that both
 * access paths are invalidated in a single call.
 *
 * This is a client-side helper intended to be called from seller dashboard
 * pages (settings, onboarding) after a successful theme or settings save.
 */
export async function revalidateStoreCache(input: {
  subdomain?: string | null;
  custom_domain?: string | null;
}): Promise<void> {
  const hostnames: string[] = [];
  if (input.subdomain) hostnames.push(input.subdomain);
  if (input.custom_domain) hostnames.push(input.custom_domain);
  if (hostnames.length === 0) return;

  await fetch('/api/storefront/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ hostnames }),
  }).catch(() => undefined);
}
