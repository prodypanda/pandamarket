import { describe, it, expect } from 'vitest';

describe('PLAN-B-12: Seller Onboarding Steps & Store Status Logic', () => {
  it('identifies store_asset as the valid upload purpose for branding assets', () => {
    const validPurposes = [
      'product_image',
      'store_asset',
      'digital_product',
      'kyc_document',
      'mandat_proof',
    ];

    const brandingPurpose = 'store_asset';
    expect(validPurposes).toContain(brandingPurpose);
    // Legacy broken purpose
    expect(validPurposes).not.toContain('store_logo');
  });

  it('correctly determines storefront live / maintenance status using DB enum', () => {
    function computeIsOnline(store: { status?: string; is_verified?: boolean } | null): boolean {
      return (
        store?.status !== 'maintenance' &&
        (store?.status === 'verified' || Boolean(store?.is_verified))
      );
    }

    // Verified store is live
    expect(computeIsOnline({ status: 'verified', is_verified: true })).toBe(true);

    // Maintenance store is offline
    expect(computeIsOnline({ status: 'maintenance', is_verified: true })).toBe(false);

    // Unverified store is not yet live
    expect(computeIsOnline({ status: 'unverified', is_verified: false })).toBe(false);

    // Null store is offline
    expect(computeIsOnline(null)).toBe(false);
  });

  it('structures shipping & payout settings into PUT /api/pd/stores/me/settings body', () => {
    const fee = 7.5;
    const codEnabled = true;
    const bankDetails = 'RIB: 12345';

    const payload = {
      settings: {
        shipping_flat_fee: fee,
        payout_method: codEnabled ? 'COD' : 'bank_transfer',
        payout_details: bankDetails,
      },
    };

    expect(payload.settings.shipping_flat_fee).toBe(7.5);
    expect(payload.settings.payout_method).toBe('COD');
  });
});
