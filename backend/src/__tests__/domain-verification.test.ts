import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getLimits: vi.fn(),
  getSettings: vi.fn().mockResolvedValue({ custom_domains_enabled: true }),
}));

vi.mock('../db/pool', () => ({
  query: mocks.query,
  transaction: vi.fn(),
}));

vi.mock('../services/subscription.service', () => ({
  subscriptionService: {
    getLimits: mocks.getLimits,
    assertCanUseCustomDomain: async (plan: string) => {
      const limits = await mocks.getLimits(plan);
      if (!limits.has_custom_domain) {
        throw new Error(`Custom domains are not available on the ${plan} plan.`);
      }
    },
  },
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: mocks.getSettings,
  },
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { domainVerificationService } from '../services/domain-verification.service';

describe('DomainVerificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects adding custom domain if subscription plan does not support it', async () => {
    mocks.getLimits.mockResolvedValueOnce({ has_custom_domain: false });

    await expect(
      domainVerificationService.addDomain('store_123', 'free', 'boutique.com'),
    ).rejects.toThrow('Custom domains are not available on the free plan.');
  });

  it('generates verification token and instructions for valid domain on supported plan', async () => {
    mocks.getLimits.mockResolvedValueOnce({ has_custom_domain: true });
    // uniqueness check in pd_store_domain -> 0 rows
    mocks.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    // uniqueness check in pd_store -> 0 rows
    mocks.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    // insert query
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'pd_domain_123',
          store_id: 'store_123',
          hostname: 'boutique.com',
          is_primary: false,
          verification_status: 'pending',
          ssl_status: 'pending',
          attempts: 0,
        },
      ],
    });

    const result = await domainVerificationService.addDomain('store_123', 'starter', 'boutique.com');

    expect(result.hostname).toBe('boutique.com');
    expect(result.verification_token).toMatch(/^pd-verify-[a-f0-9]+$/);
    expect(result.expected_cname).toContain('cname.pandamarket');
    expect(result.expected_txt_name).toBe('_pandamarket-challenge.boutique.com');
  });

  it('rejects duplicate domain if already registered in pd_store_domain', async () => {
    mocks.getLimits.mockResolvedValueOnce({ has_custom_domain: true });
    mocks.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing_domain' }] });

    await expect(
      domainVerificationService.addDomain('store_123', 'starter', 'boutique.com'),
    ).rejects.toThrow('This custom domain is already registered');
  });

  it('rejects forbidden system domains', async () => {
    mocks.getLimits.mockResolvedValueOnce({ has_custom_domain: true });

    await expect(
      domainVerificationService.addDomain('store_123', 'starter', 'pandamarket.tn'),
    ).rejects.toThrow();
  });

  it('denies TLS authorization for unverified domains', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] }); // pd_store_domain
    mocks.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // pd_store legacy

    const isAllowed = await domainVerificationService.isDomainTlsAllowed('unverified.com');
    expect(isAllowed).toBe(false);
  });

  it('verifies domain ownership with mock token and updates verification status', async () => {
    // getDomainById
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'pd_domain_123',
          store_id: 'store_123',
          hostname: 'boutique.com',
          verification_status: 'pending',
          verification_token_hash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', // SHA256 of 'pd-verify-test1234'
          ssl_status: 'pending',
          attempts: 0,
        },
      ],
    });

    // UPDATE query
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'pd_domain_123',
          store_id: 'store_123',
          hostname: 'boutique.com',
          verification_status: 'verified',
          ssl_status: 'active',
          attempts: 1,
        },
      ],
    });

    // primary check
    mocks.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    // getDomainById inside makePrimary
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'pd_domain_123',
          store_id: 'store_123',
          hostname: 'boutique.com',
          verification_status: 'verified',
        },
      ],
    });
    // unset primary
    mocks.query.mockResolvedValueOnce({ rows: [] });
    // set primary
    mocks.query.mockResolvedValueOnce({
      rows: [
        { id: 'pd_domain_123', store_id: 'store_123', hostname: 'boutique.com', is_primary: true },
      ],
    });
    // sync pd_store
    mocks.query.mockResolvedValueOnce({ rows: [] });

    const result = await domainVerificationService.verifyDomain(
      'store_123',
      'pd_domain_123',
      'pd-verify-test1234',
    );

    expect(result.verification_status).toBe('verified');
    expect(result.ssl_status).toBe('active');
  });

  it('allows TLS for verified domains', async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'pd_domain_123',
          hostname: 'verified.com',
          verification_status: 'verified',
          ssl_status: 'active',
        },
      ],
    });

    const isAllowed = await domainVerificationService.isDomainTlsAllowed('verified.com');
    expect(isAllowed).toBe(true);
  });
});
