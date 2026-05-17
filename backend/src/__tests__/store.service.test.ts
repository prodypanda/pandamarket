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
});
