import type { StorefrontProductLoadingMode } from '@pandamarket/types';

export const STOREFRONT_PRODUCT_LOADING_MODES = [
  'pagination',
  'infinite',
  'load_more',
] as const satisfies readonly StorefrontProductLoadingMode[];

export const DEFAULT_STOREFRONT_PRODUCT_LOADING_MODE: StorefrontProductLoadingMode = 'load_more';

export function normalizeStorefrontProductLoadingMode(value: unknown): StorefrontProductLoadingMode {
  return typeof value === 'string' && STOREFRONT_PRODUCT_LOADING_MODES.includes(value as StorefrontProductLoadingMode)
    ? value as StorefrontProductLoadingMode
    : DEFAULT_STOREFRONT_PRODUCT_LOADING_MODE;
}
