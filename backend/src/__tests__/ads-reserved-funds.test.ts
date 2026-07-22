import { beforeEach, describe, expect, it, vi } from 'vitest';
import { query, transaction } from '../db/pool';
import { AdsService } from '../services/ads.service';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn((type: string) => `pd_${type}_test`),
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: vi.fn().mockResolvedValue({
      ads_enabled: true,
      ads_frequency_cap_daily: 10,
    }),
  },
}));

vi.mock('../config', () => ({
  config: {
    jwt: { secret: 'test-secret' },
    hubDomain: 'http://localhost:3000',
    logLevel: 'info',
  },
}));

const mockQuery = vi.mocked(query);
const mockTransaction = vi.mocked(transaction);
const result = (rows: any[]) => ({ rows, rowCount: rows.length } as any);

describe('Ads Reserved Funds & Auto-Refill', () => {
  let service: AdsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdsService();
  });

  it('allocates reservations based on available balance and budgets', async () => {
    const account = { id: 'acct_1', balance: '15.000', reserved_balance: '0.000', status: 'active' };
    const campaigns = [
      { id: 'cmp_1', daily_budget: '10.000', total_budget: '100.000', spent_amount: '0.000', reserved_amount: '0.000' },
      { id: 'cmp_2', daily_budget: '10.000', total_budget: '100.000', spent_amount: '0.000', reserved_amount: '0.000' },
    ];

    const client = {
      query: vi.fn()
        .mockResolvedValueOnce(result([account])) // getOrCreateAccount
        .mockResolvedValueOnce(result(campaigns)) // activeCampaigns query
        .mockResolvedValueOnce(result([{ spend: '0.000' }])) // dailySpend cmp_1
        .mockResolvedValueOnce(result([account])) // reserveFunds cmp_1 getOrCreateAccount
        .mockResolvedValueOnce(result([{ balance: '5.000' }])) // reserveFunds cmp_1 updatedAccount
        .mockResolvedValueOnce(result([])) // reserveFunds cmp_1 update campaign
        .mockResolvedValueOnce(result([])) // reserveFunds cmp_1 insert transaction
        .mockResolvedValueOnce(result([{ spend: '0.000' }])) // dailySpend cmp_2
        .mockResolvedValueOnce(result([account])) // reserveFunds cmp_2 getOrCreateAccount
        .mockResolvedValueOnce(result([{ balance: '0.000' }])) // reserveFunds cmp_2 updatedAccount
        .mockResolvedValueOnce(result([])) // reserveFunds cmp_2 update campaign
        .mockResolvedValueOnce(result([])), // reserveFunds cmp_2 insert transaction
    };

    mockTransaction.mockImplementation(async (fn: any) => fn(client));

    await service.allocateReservations('store_1');

    // Verify first campaign reserved its full needed 10 TND
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE pd_ads_account SET balance = balance - $2, reserved_balance = reserved_balance + $2'),
      ['acct_1', 10]
    );

    // Verify second campaign reserved remaining 5 TND because balance became 5 TND
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE pd_ads_account SET balance = balance - $2, reserved_balance = reserved_balance + $2'),
      ['acct_1', 5]
    );
  });

  it('triggers auto-refill when available balance falls below threshold', async () => {
    const payload = { campaign_id: 'cmp_1', creative_id: 'crt_1', placement_id: 'pl_1', exp: Date.now() + 60000 };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const crypto = await import('crypto');
    const signature = crypto.createHmac('sha256', 'test-secret').update(encoded).digest('base64url');

    const account = { id: 'acct_1', balance: '1.000', reserved_balance: '0.100', auto_refill_enabled: true, auto_refill_threshold: '5.000', auto_refill_amount: '20.000' };
    const campaign = { id: 'cmp_1', ads_account_id: 'acct_1', store_id: 'store_1', status: 'active', pricing_model: 'cpc', bid_amount: '0.100', spent_amount: '0.000', total_budget: '50.000', reserved_amount: '0.500' };

    const client = {
      query: vi.fn()
        .mockResolvedValueOnce(result([])) // blocked IP check (ipHash is undefined, queries with '')
        .mockResolvedValueOnce(result([])) // duplicate check
        .mockResolvedValueOnce(result([campaign])) // campaign and account fetch
        .mockResolvedValueOnce(result([])) // insert ad event
        .mockResolvedValueOnce(result([])) // insert daily aggregation
        .mockResolvedValueOnce(result([{ balance: '1.000' }])) // debit account reserved balance RETURNING balance
        .mockResolvedValueOnce(result([{ spent_amount: '0.100' }])) // update campaign spent_amount & reserved_amount
        .mockResolvedValueOnce(result([])) // insert ledger transaction
        .mockResolvedValueOnce(result([account])) // auto-refill check SELECT auto_refill_enabled FROM pd_ads_account
        .mockResolvedValueOnce(result([{ balance: '21.000' }])) // auto-refill updatedAccount balance
        .mockResolvedValueOnce(result([])) // auto-refill insert intent
        .mockResolvedValueOnce(result([])) // auto-refill insert transaction
        .mockResolvedValueOnce(result([account])) // allocateReservations getOrCreateAccount
        .mockResolvedValueOnce(result([])), // allocateReservations activeCampaigns check
    };

    mockTransaction.mockImplementation(async (fn: any) => fn(client));

    const response = await service.recordEvent({
      token: `${encoded}.${signature}`,
      eventType: 'click',
      eventKey: 'click-event-key-1',
    });

    expect(response.recorded).toBe(true);
    expect(response.cost).toBe(0.1);

    // Verify auto refill query was called
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE pd_ads_account SET balance = balance + $2"),
      ['acct_1', 20]
    );
  });
});
