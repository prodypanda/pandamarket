import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  transaction: async (cb: any) => cb({ query: mockQuery }),
  query: mockQuery,
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: vi.fn().mockResolvedValue({
      ads_frequency_cap_daily: 5,
    }),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { adsService } from '../services/ads.service';

describe('PLAN-B-23: Ads Click-Fraud Detection & Time-Bounded IP Blocking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries blocked IPs with 24-hour expiration window', async () => {
    vi.spyOn(adsService as any, 'verifyDeliveryToken').mockReturnValueOnce({
      campaign_id: 'cmp_123',
      creative_id: 'crt_456',
      exp: Date.now() + 60000,
    });

    mockQuery.mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // IP is blocked

    const result = await adsService.recordEvent({
      token: 'valid_token_12345678901234567890',
      eventType: 'click',
      eventKey: 'ev_123',
      ipHash: 'ip_hash_abc',
    });

    expect(result.fraud_blocked).toBe(true);
    expect(result.recorded).toBe(false);

    // Verify 24 hour interval query
    expect(mockQuery.mock.calls[0][0]).toContain("blocked_at > NOW() - INTERVAL '24 hours'");
  });

  it('updates blocked IP expiration when rate limit exceeds 6 clicks/min', async () => {
    vi.spyOn(adsService as any, 'verifyDeliveryToken').mockReturnValueOnce({
      campaign_id: 'cmp_123',
      creative_id: 'crt_456',
      exp: Date.now() + 60000,
    });

    // 1. IP not currently blocked
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 2. Rapid clicks count >= 6
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '7' }] });
    // 3. Upsert blocked IP
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await adsService.recordEvent({
      token: 'valid_token_12345678901234567890',
      eventType: 'click',
      eventKey: 'ev_123',
      ipHash: 'ip_hash_fraudster',
    });

    expect(result.fraud_blocked).toBe(true);

    // Verify UPSERT SQL with blocked_at = NOW()
    const upsertSql = mockQuery.mock.calls[2][0];
    expect(upsertSql).toContain('INSERT INTO pd_ads_blocked_ip');
    expect(upsertSql).toContain('ON CONFLICT (ip_hash) DO UPDATE SET blocked_at = NOW()');
  });
});
