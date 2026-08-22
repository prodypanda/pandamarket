import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STOREFRONT_PRODUCT_LOADING_MODE,
  normalizeStorefrontProductLoadingMode,
} from './storefront-product-loading';

describe('storefront product loading mode contract', () => {
  it('defaults legacy or invalid values to click-to-load-more', () => {
    expect(DEFAULT_STOREFRONT_PRODUCT_LOADING_MODE).toBe('load_more');
    expect(normalizeStorefrontProductLoadingMode(undefined)).toBe('load_more');
    expect(normalizeStorefrontProductLoadingMode('unsupported')).toBe('load_more');
  });

  it.each(['pagination', 'infinite', 'load_more'] as const)('accepts %s', (mode) => {
    expect(normalizeStorefrontProductLoadingMode(mode)).toBe(mode);
  });
});
