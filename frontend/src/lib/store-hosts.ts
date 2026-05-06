export const MARKETPLACE_HOSTS = new Set([
  'localhost:3000',
  '127.0.0.1:3000',
  '[::1]:3000',
  'pandamarket.local:3000',
  'pandamarket.tn',
  'www.pandamarket.tn',
]);

export function isMarketplaceHost(host: string): boolean {
  return MARKETPLACE_HOSTS.has(host.toLowerCase());
}

export function getStorePathBase(storeHost: string, host: string): string {
  return isMarketplaceHost(host) ? `/store/${storeHost}` : '';
}
