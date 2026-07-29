import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from '../services/analytics.service';
import { PdValidationError } from '../errors';

const mockQuery = vi.fn();

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('../db/redis', () => ({
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  }),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  childLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

describe('AnalyticsService Time Range Normalization & Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseDateWindow', () => {
    it('normalizes 7d range correctly with 7-day duration and matching previous period', () => {
      const fixedEnd = '2026-07-29T12:00:00.000Z';
      const range = analyticsService.parseDateWindow({ timeRange: '7d', endDate: fixedEnd });

      expect(range.timeRange).toBe('7d');
      expect(range.endDate).toBe(fixedEnd);
      expect(range.isAllTime).toBe(false);
      expect(range.comparison_available).toBe(true);

      const endMs = new Date(fixedEnd).getTime();
      const startMs = new Date(range.startDate!).getTime();
      const durationDays = (endMs - startMs) / (1000 * 60 * 60 * 24);
      expect(durationDays).toBeCloseTo(7, 1);

      const prevEndMs = new Date(range.previousEndDate!).getTime();
      const prevStartMs = new Date(range.previousStartDate!).getTime();
      const prevDurationDays = (prevEndMs - prevStartMs) / (1000 * 60 * 60 * 24);
      expect(prevDurationDays).toBeCloseTo(7, 1);
      expect(prevEndMs).toBe(startMs);
    });

    it('normalizes 30d range correctly with 30-day duration', () => {
      const fixedEnd = '2026-07-29T12:00:00.000Z';
      const range = analyticsService.parseDateWindow({ timeRange: '30d', endDate: fixedEnd });

      expect(range.timeRange).toBe('30d');
      const endMs = new Date(fixedEnd).getTime();
      const startMs = new Date(range.startDate!).getTime();
      const durationDays = (endMs - startMs) / (1000 * 60 * 60 * 24);
      expect(durationDays).toBeCloseTo(30, 1);
    });

    it('normalizes 90d range correctly with 90-day duration', () => {
      const fixedEnd = '2026-07-29T12:00:00.000Z';
      const range = analyticsService.parseDateWindow({ timeRange: '90d', endDate: fixedEnd });

      expect(range.timeRange).toBe('90d');
      const endMs = new Date(fixedEnd).getTime();
      const startMs = new Date(range.startDate!).getTime();
      const durationDays = (endMs - startMs) / (1000 * 60 * 60 * 24);
      expect(durationDays).toBeCloseTo(90, 1);
    });

    it('normalizes 12m range correctly with 365-day duration', () => {
      const fixedEnd = '2026-07-29T12:00:00.000Z';
      const range = analyticsService.parseDateWindow({ timeRange: '12m', endDate: fixedEnd });

      expect(range.timeRange).toBe('12m');
      const endMs = new Date(fixedEnd).getTime();
      const startMs = new Date(range.startDate!).getTime();
      const durationDays = (endMs - startMs) / (1000 * 60 * 60 * 24);
      expect(durationDays).toBeCloseTo(365, 1);
    });

    it('normalizes all-time range with null startDate and comparison_available: false', () => {
      const fixedEnd = '2026-07-29T12:00:00.000Z';
      const range = analyticsService.parseDateWindow({ timeRange: 'all', endDate: fixedEnd });

      expect(range.timeRange).toBe('all');
      expect(range.startDate).toBeNull();
      expect(range.endDate).toBe(fixedEnd);
      expect(range.previousStartDate).toBeNull();
      expect(range.previousEndDate).toBeNull();
      expect(range.isAllTime).toBe(true);
      expect(range.comparison_available).toBe(false);
    });

    it('accepts explicit valid startDate and endDate', () => {
      const start = '2026-06-01T00:00:00.000Z';
      const end = '2026-06-15T00:00:00.000Z';
      const range = analyticsService.parseDateWindow({ startDate: start, endDate: end });

      expect(range.startDate).toBe(start);
      expect(range.endDate).toBe(end);
      expect(range.isAllTime).toBe(false);
      expect(range.comparison_available).toBe(true);
    });

    it('throws PdValidationError if startDate > endDate', () => {
      const start = '2026-07-01T00:00:00.000Z';
      const end = '2026-06-01T00:00:00.000Z';

      expect(() => analyticsService.parseDateWindow({ startDate: start, endDate: end })).toThrow(PdValidationError);
    });

    it('throws PdValidationError for invalid date strings', () => {
      expect(() => analyticsService.parseDateWindow({ startDate: 'not-a-date' })).toThrow(PdValidationError);
      expect(() => analyticsService.parseDateWindow({ endDate: 'invalid-date' })).toThrow(PdValidationError);
    });
  });

  describe('calculateGrowthPct', () => {
    it('calculates positive growth correctly', () => {
      expect(analyticsService.calculateGrowthPct(150, 100)).toBe(50);
      expect(analyticsService.calculateGrowthPct(112.34, 100)).toBe(12.34);
    });

    it('calculates negative growth correctly', () => {
      expect(analyticsService.calculateGrowthPct(80, 100)).toBe(-20);
    });

    it('returns 0 for zero-to-zero transition', () => {
      expect(analyticsService.calculateGrowthPct(0, 0)).toBe(0);
    });

    it('returns null when previous is zero and current > 0 to avoid synthetic spikes', () => {
      expect(analyticsService.calculateGrowthPct(100, 0)).toBeNull();
    });

    it('returns null when previous is null or undefined', () => {
      expect(analyticsService.calculateGrowthPct(100, null)).toBeNull();
      expect(analyticsService.calculateGrowthPct(100, undefined)).toBeNull();
    });
  });

  describe('Service Query Parameterization', () => {
    it('getGlobalOverview passes date parameters to SQL queries for 7d', async () => {
      mockQuery.mockResolvedValue({ rows: [{ current_order_gmv: 0, current_orders_count: 0 }] });

      const overview = await analyticsService.getGlobalOverview({ timeRange: '7d' });

      expect(overview.range.timeRange).toBe('7d');
      expect(overview.range.comparison_available).toBe(true);
      expect(overview.metric_scope.gmv).toBe('selected_period');
      expect(overview.metric_scope.active_stores).toBe('current_state');

      // Check parameterized SQL calls
      expect(mockQuery).toHaveBeenCalled();
      const calls = mockQuery.mock.calls;
      const orderCall = calls.find((c) => String(c[0]).includes('pd_order'));
      expect(orderCall).toBeDefined();
      expect(orderCall[1]).toHaveLength(2);
      expect(orderCall[1][0]).toBe(overview.range.startDate);
      expect(orderCall[1][1]).toBe(overview.range.endDate);
    });

    it('getAdsAnalytics passes date parameters to SQL queries for 30d', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_spend: 0, total_campaigns: 0, active_campaigns: 0 }] });

      const ads = await analyticsService.getAdsAnalytics({ timeRange: '30d' });

      expect(ads.range.timeRange).toBe('30d');
      expect(ads.performance_metrics.estimated_roas).toBeNull();
      expect(ads.performance_metrics.conversion_attribution_available).toBe(false);
    });

    it('generateExportCSV contains range metadata header rows', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const csv = await analyticsService.generateExportCSV({ type: 'overview', timeRange: '7d' });

      expect(csv).toContain('"Range Metadata","Time Range","7d"');
      expect(csv).toContain('"Range Metadata","Start Date"');
      expect(csv).toContain('"Range Metadata","End Date"');
      expect(csv).toContain('"Financials","Total GMV (TND)"');
    });
  });
});
