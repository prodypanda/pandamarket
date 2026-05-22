import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoreStatus, SubscriptionPlan } from '@pandamarket/types';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
  clientQuery: vi.fn(),
  assertPlanIsEnabled: vi.fn(),
  walletCreate: vi.fn(),
  creditsCreate: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mocks.query,
  transaction: mocks.transaction,
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn(() => 'pd_store_new'),
  encrypt: vi.fn((value: string) => `encrypted:${value}`),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../services/subscription.service', () => ({
  subscriptionService: {
    assertPlanIsEnabled: mocks.assertPlanIsEnabled,
    getLimits: vi.fn(),
  },
}));

vi.mock('../services/wallet.service', () => ({
  walletService: {
    create: mocks.walletCreate,
  },
}));

vi.mock('../services/credits.service', () => ({
  creditsService: {
    create: mocks.creditsCreate,
  },
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {},
}));

describe('StoreService maintenance publishing defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertPlanIsEnabled.mockResolvedValue(undefined);
    mocks.walletCreate.mockResolvedValue(undefined);
    mocks.creditsCreate.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({ query: mocks.clientQuery }),
    );
  });

  it('creates new stores in maintenance mode until the seller publishes them', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    mocks.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mocks.clientQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'pd_store_new',
            name: 'New Store',
            status: StoreStatus.Maintenance,
            subscription_plan: SubscriptionPlan.Free,
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const store = await storeService.createForUser({
      user_id: 'pd_user_1',
      name: 'New Store',
      subdomain: 'new-store',
    });

    expect(store.status).toBe(StoreStatus.Maintenance);
    expect(mocks.clientQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        '(id, name, status, subdomain, seller_type, subscription_plan, subscription_type, owner_id)',
      ),
      expect.arrayContaining([StoreStatus.Maintenance]),
    );
  });

  it('reactivates suspended stores into maintenance instead of publishing them', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    mocks.query.mockResolvedValueOnce({
      rows: [{ id: 'pd_store_new', status: StoreStatus.Maintenance, is_verified: true }],
      rowCount: 1,
    });

    await storeService.reactivate('pd_store_new');

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('SET status = $2'),
      ['pd_store_new', StoreStatus.Maintenance],
    );
  });

  it('keeps stores unpublished when verification is approved', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    mocks.query.mockResolvedValueOnce({
      rows: [{ id: 'pd_store_new', status: StoreStatus.Maintenance }],
      rowCount: 1,
    });

    await storeService.verify('pd_store_new');

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('CASE WHEN status IN ($2, $3) THEN $3 ELSE status END'),
      ['pd_store_new', StoreStatus.Unverified, StoreStatus.Maintenance],
    );
  });

  it('rejects direct publishing when the store is not verified', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    mocks.query.mockResolvedValueOnce({
      rows: [{ id: 'pd_store_new', status: StoreStatus.Maintenance, is_verified: false }],
      rowCount: 1,
    });

    await expect(storeService.updateStatus('pd_store_new', StoreStatus.Verified)).rejects.toThrow('Store must be verified before publishing');
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it('allows verified stores to publish from maintenance mode', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    mocks.query
      .mockResolvedValueOnce({
        rows: [{ id: 'pd_store_new', status: StoreStatus.Maintenance, is_verified: true }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'pd_store_new', status: StoreStatus.Verified, is_verified: true }],
        rowCount: 1,
      });

    const store = await storeService.updateStatus('pd_store_new', StoreStatus.Verified);

    expect(store.status).toBe(StoreStatus.Verified);
    expect(mocks.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SET status = $2'),
      ['pd_store_new', StoreStatus.Verified],
    );
  });

  it('only lists publicly verified stores when verifiedOnly is requested', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    mocks.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

    await storeService.list({ verifiedOnly: true });

    expect(mocks.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("status = 'verified' AND COALESCE(is_verified, false) = true"),
      expect.any(Array),
    );
    expect(mocks.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("status = 'verified' AND COALESCE(is_verified, false) = true"),
      expect.any(Array),
    );
  });

  it('resolves storefront hostnames only when the store is publicly verified', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    mocks.query.mockResolvedValueOnce({
      rows: [{ id: 'pd_store_new', subdomain: 'new-store', status: StoreStatus.Maintenance, is_verified: true }],
      rowCount: 1,
    });
    await expect(storeService.resolvePublicByHostname('new-store.localhost', 'pandamarket.local')).resolves.toBeNull();

    mocks.query.mockResolvedValueOnce({
      rows: [{ id: 'pd_store_new', subdomain: 'new-store', status: StoreStatus.Verified, is_verified: false }],
      rowCount: 1,
    });
    await expect(storeService.resolvePublicByHostname('new-store.localhost', 'pandamarket.local')).resolves.toBeNull();

    const verifiedStore = { id: 'pd_store_new', subdomain: 'new-store', status: StoreStatus.Verified, is_verified: true };
    mocks.query.mockResolvedValueOnce({
      rows: [verifiedStore],
      rowCount: 1,
    });
    await expect(storeService.resolvePublicByHostname('new-store.localhost', 'pandamarket.local')).resolves.toEqual(verifiedStore);
  });

  it('resolves maintenance stores by host for storefront maintenance rendering', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    const maintenanceStore = { id: 'pd_store_new', subdomain: 'new-store', status: StoreStatus.Maintenance, is_verified: false };
    mocks.query.mockResolvedValueOnce({
      rows: [maintenanceStore],
      rowCount: 1,
    });

    await expect(storeService.resolveByHostname('new-store.localhost', 'pandamarket.local')).resolves.toEqual(maintenanceStore);
  });

  it('does not query stores when hostname is empty', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(storeService.resolvePublicByHostname('', 'pandamarket.local')).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('normalizes host and hub domain casing/spacing before resolution', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(storeService.resolvePublicByHostname('  WWW.PANDAMARKET.LOCAL  ', '  PandaMarket.Local  ')).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('normalizes trailing dots on hostnames', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(storeService.resolvePublicByHostname('www.pandamarket.local.', 'pandamarket.local')).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('does not query stores when hub domain is empty', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(storeService.resolvePublicByHostname('new-store.localhost', '   ')).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('normalizes forwarded host lists and ignores the extra hosts', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    const verifiedStore = { id: 'pd_store_new', subdomain: 'new-store', status: StoreStatus.Verified, is_verified: true };
    mocks.query.mockResolvedValueOnce({
      rows: [verifiedStore],
      rowCount: 1,
    });

    await expect(
      storeService.resolvePublicByHostname('new-store.localhost:3000, proxy.local', 'pandamarket.local'),
    ).resolves.toEqual(verifiedStore);
  });

  it('uses first non-empty host entry from forwarded host lists', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    const verifiedStore = { id: 'pd_store_new', subdomain: 'new-store', status: StoreStatus.Verified, is_verified: true };
    mocks.query.mockResolvedValueOnce({
      rows: [verifiedStore],
      rowCount: 1,
    });

    await expect(
      storeService.resolvePublicByHostname(' ,   ,new-store.localhost:3000, proxy.local', 'pandamarket.local'),
    ).resolves.toEqual(verifiedStore);
  });

  it('normalizes trailing dots in hub domain config', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(
      storeService.resolvePublicByHostname('www.pandamarket.local', 'pandamarket.local.'),
    ).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('does not query stores for ipv4 hosts', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(
      storeService.resolvePublicByHostname('127.0.0.1:3000', 'pandamarket.local'),
    ).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('does not query stores for bracketed ipv6 hosts', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(
      storeService.resolvePublicByHostname('[::1]:3000', 'pandamarket.local'),
    ).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('normalizes host values that include scheme and path', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(
      storeService.resolvePublicByHostname('https://www.pandamarket.local/some/path', 'pandamarket.local'),
    ).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('normalizes non-http schemes and leading dots in host values', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(
      storeService.resolvePublicByHostname('ws://.www.pandamarket.local./socket', 'pandamarket.local'),
    ).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('rejects malformed hostnames before querying', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(storeService.resolvePublicByHostname('bad host.local', 'pandamarket.local')).resolves.toBeNull();
    await expect(storeService.resolvePublicByHostname('bad_host.local', 'pandamarket.local')).resolves.toBeNull();
    await expect(storeService.resolvePublicByHostname('bad..host.local', 'pandamarket.local')).resolves.toBeNull();
    await expect(storeService.resolvePublicByHostname('-bad.local', 'pandamarket.local')).resolves.toBeNull();
    await expect(storeService.resolvePublicByHostname('bad-.local', 'pandamarket.local')).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('rejects malformed hub domain config before querying', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(storeService.resolvePublicByHostname('new-store.localhost', 'bad hub.local')).resolves.toBeNull();
    await expect(storeService.resolvePublicByHostname('new-store.localhost', 'bad_hub.local')).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('rejects oversized hostname labels and oversized hostnames before querying', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    const oversizedLabel = `${'a'.repeat(64)}.local`;
    const oversizedHost = `${Array.from({ length: 40 }, () => 'abcdef').join('.')}.local`;
    const oversizedHub = `${'b'.repeat(64)}.local`;

    await expect(storeService.resolvePublicByHostname(oversizedLabel, 'pandamarket.local')).resolves.toBeNull();
    await expect(storeService.resolvePublicByHostname(oversizedHost, 'pandamarket.local')).resolves.toBeNull();
    await expect(storeService.resolvePublicByHostname('new-store.localhost', oversizedHub)).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('rejects all-numeric dotted hosts before querying', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(storeService.resolvePublicByHostname('999.999.999.999', 'pandamarket.local')).resolves.toBeNull();
    await expect(storeService.resolvePublicByHostname('123.456.789.0', 'pandamarket.local')).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('rejects multi-label hub subdomain prefixes before querying', async () => {
    const { StoreService } = await import('../services/store.service');
    const storeService = new StoreService();

    await expect(
      storeService.resolvePublicByHostname('a.b.pandamarket.local', 'pandamarket.local'),
    ).resolves.toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
