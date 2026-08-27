import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockReleaseFunds, mockAllocateReservations } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockReleaseFunds: vi.fn(),
  mockAllocateReservations: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  transaction: async (cb: any) => cb({ query: mockQuery }),
  query: mockQuery,
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { adsService } from '../services/ads.service';

describe('PLAN-B-24: Ads Incremental Lifecycle Sweep & Churn Elimination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adsService as any).releaseFunds = mockReleaseFunds;
    (adsService as any).allocateReservations = mockAllocateReservations;
    (adsService as any).sendCampaignStateAlert = vi.fn().mockResolvedValue(undefined);
    (adsService as any).sendLowBalanceAlerts = vi.fn().mockResolvedValue(undefined);
  });

  it('acquires advisory lock and filters for inactive campaigns before releasing reservations', async () => {
    // 1. pg_advisory_xact_lock
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 2. activated update
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'cmp_active' }] });
    // 3. completed update
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 4. exhausted update
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 5. inactive campaigns with reservations
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'cmp_completed', store_id: 'store_1', reserved_amount: '15.000' },
      ],
    });
    // 6. anonymized update
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    // 7. purged delete
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    // 8. daily campaigns query
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 9. active stores query
    mockQuery.mockResolvedValueOnce({ rows: [{ store_id: 'store_1' }] });

    const result = await adsService.processLifecycle();

    expect(result.activated).toBe(1);

    // Verify advisory lock SQL
    expect(mockQuery.mock.calls[0][0]).toContain('pg_advisory_xact_lock');

    // Verify inactive filter in SQL (does NOT select active campaigns)
    const inactiveQuery = mockQuery.mock.calls[4][0];
    expect(inactiveQuery).toContain("status NOT IN ('active', 'scheduled')");
    expect(inactiveQuery).toContain('reserved_amount > 0');

    // Verify releaseFunds was only called for the inactive campaign
    expect(mockReleaseFunds).toHaveBeenCalledTimes(1);
    expect(mockReleaseFunds).toHaveBeenCalledWith(
      expect.anything(),
      'store_1',
      'cmp_completed',
      15
    );

    // Verify allocateReservations is called for active stores
    expect(mockAllocateReservations).toHaveBeenCalledWith('store_1', expect.anything());
  });
});
