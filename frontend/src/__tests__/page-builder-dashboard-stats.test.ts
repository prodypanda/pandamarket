import { describe, expect, it } from 'vitest';
import {
  formatPageBuilderCompactCount,
  pageBuilderDashboardStatsLabels,
  pageBuilderEngagementClicks,
} from '../lib/page-builder-dashboard-stats';

describe('Page Builder dashboard analytics stats', () => {
  it('formats compact counts for dashboard chips', () => {
    expect(formatPageBuilderCompactCount(undefined)).toBe('0');
    expect(formatPageBuilderCompactCount(999)).toBe('999');
    expect(formatPageBuilderCompactCount(1200)).toBe('1.2K');
    expect(formatPageBuilderCompactCount(12000)).toBe('12K');
  });

  it('combines CTA and product clicks into engagement clicks', () => {
    expect(pageBuilderEngagementClicks({ cta_clicks_30d: 7, product_clicks_30d: 5 })).toBe(12);
    expect(pageBuilderEngagementClicks({ cta_clicks_30d: null, product_clicks_30d: 3 })).toBe(3);
  });

  it('builds French dashboard labels for 30-day Page Builder stats', () => {
    expect(pageBuilderDashboardStatsLabels({ views_30d: 1234, cta_clicks_30d: 20, product_clicks_30d: 8 })).toEqual({
      views: '1.2K vues',
      clicks: '28 clics',
    });
  });
});
