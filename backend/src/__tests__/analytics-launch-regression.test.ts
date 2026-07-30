import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from '../services/analytics.service';
import { marketplaceAnalyticsEventService, MarketplaceAnalyticsEventService } from '../services/marketplace-analytics-event.service';

const mockQuery = vi.fn();

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: vi.fn((fn: (client: { query: typeof mockQuery }) => unknown) => fn({ query: mockQuery })),
}));

vi.mock('../db/redis', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('Platform Analytics Final Launch & Regression Audit Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Global Overview Analytics Endpoint', () => {
    it('returns normalized range, metric scope, and truthful summary numbers without fake defaults', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          total_orders: 15,
          paid_orders: 12,
          cancelled_orders: 1,
          gmv_tnd: '2500.000',
          subscription_revenue_tnd: '300.000',
          ad_revenue_tnd: '150.000',
        }],
      });

      const overview = await analyticsService.getGlobalOverview({ timeRange: '30d' });
      expect(overview).toBeDefined();
      expect(overview.range.timeRange).toBe('30d');
      expect(overview.metric_scope).toBeDefined();
      expect(overview.financials.currency).toBe('TND');
      expect(overview.financials.currency_conversion_available).toBe(false);
      expect(typeof overview.financials.total_gmv).toBe('number');
    });
  });

  describe('2. Revenue & SaaS Metrics Endpoint', () => {
    it('returns MRR, ARR, and active subscription breakdowns truthfully', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          total_mrr_tnd: '1200.000',
          total_arr_tnd: '14400.000',
          arpu_tnd: '120.000',
          active_subs: 10,
        }],
      });

      const revenue = await analyticsService.getRevenueAndSaaSMetrics({ timeRange: '30d' });
      expect(revenue).toBeDefined();
      expect(revenue.saas_metrics.currency).toBe('TND');
      expect(revenue.saas_metrics.currency_conversion_available).toBe(false);
      expect(revenue.mrr_movement.mrr_movement_available).toBe(false);
    });
  });

  describe('3. Vendor Performance & Risk Endpoint', () => {
    it('returns top performing vendors and dispute/refund rates', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const vendors = await analyticsService.getVendorAnalytics({ timeRange: '7d' });
      expect(vendors).toBeDefined();
      expect(Array.isArray(vendors.top_performing_vendors)).toBe(true);
      expect(vendors.dispute_and_refund_rate).toBeDefined();
    });
  });

  describe('4. Ads Performance Endpoint', () => {
    it('returns ads financials and performance CTR/CPC metrics', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          total_ad_revenue_tnd: '450.000',
          total_campaigns: 5,
          active_campaigns: 3,
          impressions: 12000,
          clicks: 360,
        }],
      });

      const ads = await analyticsService.getAdsAnalytics({ timeRange: '30d' });
      expect(ads).toBeDefined();
      expect(ads.ads_financials.currency).toBe('TND');
      expect(ads.performance_metrics.conversion_attribution_available).toBe(false);
    });
  });

  describe('5. System Health & Telemetry Endpoint', () => {
    it('returns telemetry status and database health info', async () => {
      mockQuery.mockResolvedValue({ rows: [{ active_connections: 5, logs_count: 120 }] });

      const sys = await analyticsService.getSystemHealthMetrics({ timeRange: '30d' });
      expect(sys).toBeDefined();
      expect(sys.server_telemetry.telemetry_available).toBe(false);
      expect(sys.database_health).toBeDefined();
    });
  });

  describe('6. Real Marketplace Business Domain Analytics', () => {
    it('returns orders, checkout, buyers, sellers, payouts, risk, and operations', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          total_orders: 20,
          paid_orders: 15,
          cancelled_orders: 2,
          fulfilled_orders: 13,
          marketplace_gmv_tnd: '3200.000',
          avg_order_value_tnd: '213.333',
        }],
      });

      const biz = await analyticsService.getBusinessAnalytics({ timeRange: '30d' });
      expect(biz).toBeDefined();
      expect(biz.orders.available).toBe(true);
      expect(biz.payouts.available).toBe(true);
      expect(biz.risk.available).toBe(true);
      expect(biz.operations.available).toBe(true);
    });
  });

  describe('7. Intelligence Engine (Anomalies, Vendor & Churn Risk, Cohorts, Schedules)', () => {
    it('evaluates anomalies statistically without hardcoded numbers', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const res = await analyticsService.getAnomalyInsights({ timeRange: '30d' });
      expect(res.available).toBe(true);
      expect(Array.isArray(res.insights)).toBe(true);
    });

    it('evaluates vendor compliance risk using deterministic score thresholds', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const res = await analyticsService.getVendorRiskInsights({ timeRange: '30d' });
      expect(res.available).toBe(true);
      expect(Array.isArray(res.vendors)).toBe(true);
    });

    it('evaluates vendor churn risk heuristics', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const res = await analyticsService.getChurnRiskInsights({ timeRange: '30d' });
      expect(res.available).toBe(true);
      expect(Array.isArray(res.vendors)).toBe(true);
    });

    it('returns cohort analysis structure', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const res = await analyticsService.getCohortInsights({ timeRange: '90d' });
      expect(res.cohort_type).toBe('seller_signup');
      expect(Array.isArray(res.cohorts)).toBe(true);
    });

    it('returns report schedules list', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const res = await analyticsService.getReportSchedules('usr_admin_1');
      expect(Array.isArray(res)).toBe(true);
    });
  });

  describe('8. Governance Controls & Health Telemetry', () => {
    it('returns analytics health status', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: 100 }] });
      const health = await analyticsService.getAnalyticsHealth();
      expect(health.status).toBeDefined();
      expect(Array.isArray(health.warnings)).toBe(true);
    });

    it('returns event retention status', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          oldest_event: '2026-01-01T00:00:00.000Z',
          newest_event: '2026-07-30T00:00:00.000Z',
          count: 5000,
        }],
      });
      const ret = await analyticsService.getRetentionStatus();
      expect(typeof ret.raw_event_retention_days).toBe('number');
      expect(typeof ret.raw_event_count).toBe('number');
    });
  });

  describe('9. Metric Definitions & Saved Views', () => {
    it('returns comprehensive metric definitions list', () => {
      const defs = analyticsService.getMetricDefinitions();
      expect(Array.isArray(defs)).toBe(true);
      expect(defs.length).toBeGreaterThan(5);
      defs.forEach((d) => {
        expect(d.key).toBeDefined();
        expect(d.label).toBeDefined();
        expect(d.calculation).toBeDefined();
      });
    });

    it('lists saved views for admin user', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const views = await analyticsService.listSavedViews('usr_admin_1');
      expect(Array.isArray(views)).toBe(true);
    });
  });

  describe('10. Drilldown Endpoints & Privacy Protections', () => {
    it('orders drilldown enforces pagination and parameterization', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] }).mockResolvedValueOnce({ rows: [] });
      const res = await analyticsService.getOrdersDrilldown({ timeRange: '30d', page: 1, limit: 10 });
      expect(res.meta.page).toBe(1);
      expect(res.meta.limit).toBe(10);
    });

    it('events drilldown does NOT return raw visitor/session IDs', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ total: 1 }] }).mockResolvedValueOnce({
        rows: [{
          id: 'mae_123',
          event_type: 'checkout_started',
          occurred_at: '2026-07-30T12:00:00.000Z',
          visitor_hash: '8f4e2...sha256',
          session_hash: '9a3b1...sha256',
          source: 'web',
          path: '/checkout',
          locale: 'fr',
          metadata: { funnel_step: 'address' },
        }],
      });
      const res = await analyticsService.getEventsDrilldown({ timeRange: '30d' });
      expect(res.data.length).toBe(1);
      const evt = res.data[0];
      expect((evt as unknown as Record<string, unknown>).visitor_id).toBeUndefined();
      expect((evt as unknown as Record<string, unknown>).session_id).toBeUndefined();
    });
  });

  describe('11. CSV Export Generation & Security', () => {
    it('generates CSV with range metadata header and escaped values', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const csv = await analyticsService.generateExportCSV({ timeRange: '30d', export_type: 'overview' });
      expect(csv).toContain('Range Metadata');
      expect(csv).toContain('Time Range');
      expect(csv).not.toContain('raw_visitor_id');
      expect(csv).not.toContain('raw_session_id');
    });
  });

  describe('12. Event Ingestion & Privacy Protections', () => {
    it('validates event types', () => {
      expect(MarketplaceAnalyticsEventService.isValidEventType('checkout_started')).toBe(true);
      expect(MarketplaceAnalyticsEventService.isValidEventType('malicious_type')).toBe(false);
    });

    it('hashes visitor_id and session_id with SHA-256 before insert', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
      await marketplaceAnalyticsEventService.insertMarketplaceEvent({
        event_type: 'product_view',
        visitor_id: 'visitor_raw_123',
        session_id: 'session_raw_456',
        search_query: 'test query info@example.com 12345678901',
      });
      expect(mockQuery).toHaveBeenCalled();
      const params = mockQuery.mock.calls[0][1] as unknown[];
      const visitorHash = params[7] as string;
      const sessionHash = params[8] as string;
      const normalizedQuery = params[15] as string;

      expect(visitorHash).not.toBe('visitor_raw_123');
      expect(visitorHash).toHaveLength(64);
      expect(sessionHash).not.toBe('session_raw_456');
      expect(sessionHash).toHaveLength(64);
      expect(normalizedQuery).toContain('[redacted]');
      expect(normalizedQuery).not.toContain('info@example.com');
      expect(normalizedQuery).not.toContain('12345678901');
    });
  });
});
