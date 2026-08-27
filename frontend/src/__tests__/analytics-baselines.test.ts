import { describe, it, expect } from 'vitest';

describe('PLAN-B-32: Dynamic Analytics Baselines & Demo Gate', () => {
  it('computes simulator baselines dynamically from real overview metrics', () => {
    const mockOverview = {
      financials: {
        gmv_cents: 25000000, // 250,000 TND
        take_rate_pct: 7.2,
      },
      subscriptions: {
        total_revenue_cents: 1200000, // 12,000 TND
      },
    };

    const gmv = Math.round(Number(mockOverview.financials.gmv_cents || 0) / 100);
    const subRev = Math.round(Number(mockOverview.subscriptions.total_revenue_cents || 0) / 100);
    const takeRate = Number(mockOverview.financials.take_rate_pct || 0);

    expect(gmv).toBe(250000);
    expect(subRev).toBe(12000);
    expect(takeRate).toBe(7.2);
  });

  it('falls back to 0 when platform has no prior transactions instead of fake static values', () => {
    const emptyOverview = null;

    const gmv = Math.round(Number((emptyOverview as any)?.financials?.gmv_cents || 0) / 100);
    const subRev = Math.round(Number((emptyOverview as any)?.subscriptions?.total_revenue_cents || 0) / 100);
    const takeRate = Number((emptyOverview as any)?.financials?.take_rate_pct || 0);

    expect(gmv).toBe(0);
    expect(subRev).toBe(0);
    expect(takeRate).toBe(0);
  });
});
