import { describe, expect, it } from 'vitest';
import {
  getStorefrontCanonicalUrl,
  getStorefrontOrganizationJsonLd,
  getStorefrontProductJsonLd,
  hasStorefrontQueryParams,
  isEmptyStore,
  isPublicStore,
  serializeJsonLd,
} from './storefront-seo';

const store = {
  id: 'store_1',
  name: 'Boutique 1',
  subdomain: 'boutique1',
  custom_domain: null,
  status: 'verified',
  is_verified: true,
  description: 'Une boutique de test',
  settings: { contact_email: 'hello@example.com' },
};

describe('storefront SEO contracts', () => {
  it('resolves tenant canonical URLs from the store host configuration', () => {
    expect(getStorefrontCanonicalUrl('boutique1', store, '/products')).toMatch(/boutique1\.pandamarket\.tn\/products$/);
    expect(getStorefrontCanonicalUrl('boutique1', { ...store, custom_domain: 'shop.example.tn' }, '/')).toBe('https://shop.example.tn/');
  });

  it('only treats verified stores as indexable', () => {
    expect(isPublicStore(store)).toBe(true);
    expect(isPublicStore({ ...store, status: 'maintenance' })).toBe(false);
    expect(isPublicStore({ ...store, is_verified: false })).toBe(false);
    expect(isEmptyStore({ ...store, product_count: 0 })).toBe(true);
    expect(isEmptyStore({ ...store, product_count: 2 })).toBe(false);
  });

  it('marks query-bearing catalog URLs as non-canonical', () => {
    expect(hasStorefrontQueryParams({ q: 'phone' })).toBe(true);
    expect(hasStorefrontQueryParams({ page: '1', sort: undefined })).toBe(true);
    expect(hasStorefrontQueryParams({ q: '', category: undefined })).toBe(false);
  });

  it('emits organization and product schema with safe JSON serialization', () => {
    const canonicalUrl = 'https://boutique1.pandamarket.tn/product/phone';
    const organization = getStorefrontOrganizationJsonLd(store, canonicalUrl);
    const product = getStorefrontProductJsonLd(store, {
      id: 'product_1',
      title: '<Phone>',
      price: 19.99,
      inventory_quantity: 2,
    }, canonicalUrl);

    expect(organization['@type']).toBe('Organization');
    expect(product['@type']).toBe('Product');
    expect((product.offers as Record<string, unknown>).price).toBe('19.990');
    expect(serializeJsonLd(product)).not.toContain('<Phone>');
  });
});
