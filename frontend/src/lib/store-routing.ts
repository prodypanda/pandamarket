import { headers } from 'next/headers';
import { getStorePathBase, isMarketplaceHost } from './store-hosts';

export async function getStoreRouteContext(storeHost: string) {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') || '';

  return {
    host,
    isMarketplaceStoreRoute: isMarketplaceHost(host),
    storePathBase: getStorePathBase(storeHost, host),
  };
}
