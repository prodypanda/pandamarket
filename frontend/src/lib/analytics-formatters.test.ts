import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatMoney,
  formatPercent,
  formatGrowth,
  formatDateRange,
} from './analytics-formatters';

describe('Analytics Formatters', () => {
  describe('formatNumber', () => {
    it('formats numeric values with locale separators', () => {
      expect(formatNumber(1234567)).toBe((1234567).toLocaleString());
      expect(formatNumber(0)).toBe('0');
    });

    it('returns fallback for null or undefined', () => {
      expect(formatNumber(null)).toBe('Unavailable');
      expect(formatNumber(undefined)).toBe('Unavailable');
      expect(formatNumber(null, 'Custom Fallback')).toBe('Custom Fallback');
    });
  });

  describe('formatMoney', () => {
    it('formats numeric currency correctly', () => {
      expect(formatMoney(5000, 'TND')).toBe(`${(5000).toLocaleString()} TND`);
      expect(formatMoney(0, 'USD')).toBe('0 USD');
    });

    it('returns fallback for null or undefined', () => {
      expect(formatMoney(null, 'TND')).toBe('Unavailable');
      expect(formatMoney(undefined, 'TND')).toBe('Unavailable');
    });
  });

  describe('formatPercent', () => {
    it('formats percentages correctly', () => {
      expect(formatPercent(99.9)).toBe('99.9%');
      expect(formatPercent(0)).toBe('0%');
    });

    it('returns fallback for null or undefined', () => {
      expect(formatPercent(null)).toBe('Unavailable');
      expect(formatPercent(undefined)).toBe('Unavailable');
    });
  });

  describe('formatGrowth', () => {
    it('formats positive growth with + sign', () => {
      expect(formatGrowth(18.4)).toBe('+18.4%');
    });

    it('formats negative growth with - sign', () => {
      expect(formatGrowth(-5.2)).toBe('-5.2%');
    });

    it('formats zero growth as 0.00%', () => {
      expect(formatGrowth(0)).toBe('0.00%');
    });

    it('returns fallback string for null or undefined', () => {
      expect(formatGrowth(null)).toBe('Growth: Unavailable');
      expect(formatGrowth(undefined)).toBe('Growth: Unavailable');
    });
  });

  describe('formatDateRange', () => {
    it('formats all-time range', () => {
      const range = {
        timeRange: 'all' as const,
        startDate: null,
        endDate: '2026-07-30T00:00:00.000Z',
        previousStartDate: null,
        previousEndDate: null,
        isAllTime: true,
        comparison_available: false,
      };
      expect(formatDateRange(range)).toBe('Showing all-time platform data');
    });

    it('formats explicit date window', () => {
      const range = {
        timeRange: '30d' as const,
        startDate: '2026-06-30T00:00:00.000Z',
        endDate: '2026-07-30T00:00:00.000Z',
        previousStartDate: '2026-05-31T00:00:00.000Z',
        previousEndDate: '2026-06-30T00:00:00.000Z',
        isAllTime: false,
        comparison_available: true,
      };
      const formatted = formatDateRange(range);
      expect(formatted).toContain('Showing data from');
    });
  });
});
