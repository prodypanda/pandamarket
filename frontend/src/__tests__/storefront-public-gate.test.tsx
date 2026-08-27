import { describe, it, expect } from 'vitest';
import { isPublicStore, type StorefrontSeoStore } from '../lib/storefront-seo';

describe('PLAN-B-25: Storefront Public Store Guard', () => {
  it('identifies public stores correctly based on verification status', () => {
    const verifiedStore: StorefrontSeoStore = {
      id: 'store_1',
      name: 'Verified Boutique',
      status: 'verified',
      is_verified: true,
      product_count: 5,
    };

    const pendingStore: StorefrontSeoStore = {
      id: 'store_2',
      name: 'Unverified Onboarding Store',
      status: 'pending',
      is_verified: false,
      product_count: 5,
    };

    const maintenanceStore: StorefrontSeoStore = {
      id: 'store_3',
      name: 'Store In Maintenance',
      status: 'maintenance',
      is_verified: true,
      product_count: 5,
    };

    const suspendedStore: StorefrontSeoStore = {
      id: 'store_4',
      name: 'Suspended Bad Store',
      status: 'suspended',
      is_verified: false,
      product_count: 5,
    };

    expect(isPublicStore(verifiedStore)).toBe(true);
    expect(isPublicStore(pendingStore)).toBe(false);
    expect(isPublicStore(maintenanceStore)).toBe(false);
    expect(isPublicStore(suspendedStore)).toBe(false);
  });

  it('guards /products catalog routes against unverified stores', () => {
    const unverifiedStore: StorefrontSeoStore = {
      id: 'store_unverified',
      name: 'Unverified Store',
      status: 'pending',
      is_verified: false,
    };

    const isPublic = isPublicStore(unverifiedStore);
    const hasPreview = false;
    const shouldRenderMaintenance = !isPublic && !hasPreview;

    expect(shouldRenderMaintenance).toBe(true);
  });
});
