import { describe, it, expect, vi, beforeEach } from 'vitest';
import { marketplaceAnalyticsEventService, MarketplaceAnalyticsEventService } from '../services/marketplace-analytics-event.service';

const mockQuery = vi.fn();

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  childLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

describe('MarketplaceAnalyticsEventService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  describe('Event Taxonomy Validation', () => {
    it('validates allowed event types correctly', () => {
      expect(MarketplaceAnalyticsEventService.isValidEventType('checkout_started')).toBe(true);
      expect(MarketplaceAnalyticsEventService.isValidEventType('product_view')).toBe(true);
      expect(MarketplaceAnalyticsEventService.isValidEventType('search_performed')).toBe(true);
      expect(MarketplaceAnalyticsEventService.isValidEventType('store_created')).toBe(true);
    });

    it('rejects invalid or unknown event types', () => {
      expect(MarketplaceAnalyticsEventService.isValidEventType('fake_event')).toBe(false);
      expect(MarketplaceAnalyticsEventService.isValidEventType('custom_user_hacked')).toBe(false);
    });
  });

  describe('Event Insertion & Privacy Protection', () => {
    it('hashes visitor_id and session_id into sha256 hashes instead of raw storage', async () => {
      await marketplaceAnalyticsEventService.insertMarketplaceEvent({
        event_type: 'checkout_started',
        visitor_id: 'visitor_abc123',
        session_id: 'session_xyz789',
        source: 'web',
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];

      expect(sql).toContain('INSERT INTO pd_marketplace_analytics_event');
      // Params[7] is visitorHash ($8), params[8] is sessionHash ($9)
      expect(params[7]).not.toEqual('visitor_abc123');
      expect(params[7]).toHaveLength(64); // sha256 hex length
      expect(params[8]).not.toEqual('session_xyz789');
      expect(params[8]).toHaveLength(64); // sha256 hex length
    });

    it('normalizes search queries and strips email/phone PII', async () => {
      await marketplaceAnalyticsEventService.insertMarketplaceEvent({
        event_type: 'search_performed',
        search_query: '  iPhone 15   john@example.com 555123456789 ',
        source: 'web',
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [, params] = mockQuery.mock.calls[0];

      // Params[15] is normalizedQuery ($16)
      const searchNormalized = params[15];
      expect(searchNormalized).toContain('iphone 15');
      expect(searchNormalized).not.toContain('john@example.com');
      expect(searchNormalized).toContain('[redacted]');
    });

    it('rejects events with oversized metadata (>4KB)', async () => {
      const hugeObject: Record<string, string> = {};
      for (let i = 0; i < 500; i++) {
        hugeObject[`key_${i}`] = 'x'.repeat(20);
      }

      await marketplaceAnalyticsEventService.insertMarketplaceEvent({
        event_type: 'product_view',
        metadata: hugeObject,
        source: 'web',
      });

      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('First-time Lifecycle Event Idempotency', () => {
    it('does not insert duplicate first-time lifecycle events if already recorded', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // Exists query returns row

      await marketplaceAnalyticsEventService.insertFirstTimeEvent({
        event_type: 'first_order_received',
        store_id: 'store_123',
      });

      // Should only run the SELECT query, not the INSERT
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('SELECT 1 FROM pd_marketplace_analytics_event');
    });

    it('inserts first-time lifecycle event if not recorded yet', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Check query returns empty
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Insert query succeeds

      await marketplaceAnalyticsEventService.insertFirstTimeEvent({
        event_type: 'first_order_received',
        store_id: 'store_123',
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[0][0]).toContain('SELECT 1 FROM pd_marketplace_analytics_event');
      expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO pd_marketplace_analytics_event');
    });
  });
});
