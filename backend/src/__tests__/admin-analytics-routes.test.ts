import express from 'express';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLivePulse = {
  server_time: '2026-08-14T12:00:00.000Z',
  live_active_visitors_now: 42,
  active_visitors: {
    total_active_now: 42,
    active_last_60s: 10,
    registered_buyers: 25,
    registered_sellers: 8,
    anonymous_guests: 9,
    devices: { desktop: 23, mobile: 17, tablet: 2 },
  },
  summary_60s: {
    total_events_60s: 120,
    total_orders_60s: 4,
    total_gmv_60s_tnd: 450.5,
    avg_events_per_sec: 2.0,
    avg_gmv_per_sec_tnd: 7.51,
    peak_events_per_sec: 5,
    conversion_rate_60s_pct: 3.33,
  },
  velocity_buffer: [],
  velocity: [],
  micro_ticker: [],
  anomaly_alerts: [],
};

const mockGeoHeatmap = {
  range: {
    timeRange: '30d',
    startDate: '2026-07-15T00:00:00.000Z',
    endDate: '2026-08-14T00:00:00.000Z',
    previousStartDate: '2026-06-15T00:00:00.000Z',
    previousEndDate: '2026-07-15T00:00:00.000Z',
    isAllTime: false,
    comparison_available: true,
  },
  summary: {
    total_tunisia_revenue_tnd: 50000,
    total_diaspora_revenue_tnd: 15000,
    total_revenue_tnd: 65000,
    total_orders_count: 650,
    top_governorate_code: 'TUN',
    top_diaspora_country_code: 'FR',
    domestic_share_pct: 76.92,
    diaspora_share_pct: 23.08,
  },
  governorates: [
    {
      code: 'TUN',
      governorate_code: 'TUN',
      name_en: 'Tunis',
      name_fr: 'Tunis',
      name_ar: 'تونس',
      revenue_tnd: 25000,
      orders_count: 250,
      aov_tnd: 100,
      unique_buyers_count: 200,
      revenue_share_pct: 50.0,
      order_share_pct: 38.46,
      heat_intensity: 1.0,
    },
  ],
  diaspora_countries: [
    {
      country_code: 'FR',
      country_name: 'France',
      flag_emoji: '🇫🇷',
      revenue_tnd: 10000,
      orders_count: 80,
      aov_tnd: 125,
      revenue_share_pct: 66.67,
      heat_intensity: 1.0,
    },
  ],
};

const mockReconciliation = {
  gross_gmv: { tnd: 100000, eur: 29850.75, usd: 32258.06, formatted_tnd: '100,000.000 TND', formatted_eur: '€29,850.75', formatted_usd: '$32,258.06' },
  marketplace_order_gmv: { tnd: 95000, eur: 28358.21, usd: 30645.16, formatted_tnd: '95,000.000 TND', formatted_eur: '€28,358.21', formatted_usd: '$30,645.16' },
  subscription_revenue: { tnd: 3000, eur: 895.52, usd: 967.74, formatted_tnd: '3,000.000 TND', formatted_eur: '€895.52', formatted_usd: '$967.74' },
  ads_revenue: { tnd: 2000, eur: 597.01, usd: 645.16, formatted_tnd: '2,000.000 TND', formatted_eur: '€597.01', formatted_usd: '$645.16' },
  platform_net_commission_take: { tnd: 7600, eur: 2268.66, usd: 2451.61, formatted_tnd: '7,600.000 TND', formatted_eur: '€2,268.66', formatted_usd: '$2,451.61' },
  total_platform_net_revenue: { tnd: 12600, eur: 3761.19, usd: 4064.52, formatted_tnd: '12,600.000 TND', formatted_eur: '€3,761.19', formatted_usd: '$4,064.52' },
  escrow_floating_balance: { tnd: 15000, eur: 4477.61, usd: 4838.71, formatted_tnd: '15,000.000 TND', formatted_eur: '€4,477.61', formatted_usd: '$4,838.71' },
  pending_vendor_payouts: { tnd: 15000, eur: 4477.61, usd: 4838.71, formatted_tnd: '15,000.000 TND', formatted_eur: '€4,477.61', formatted_usd: '$4,838.71' },
  settled_vendor_payouts: { tnd: 72400, eur: 21611.94, usd: 23354.84, formatted_tnd: '72,400.000 TND', formatted_eur: '€21,611.94', formatted_usd: '$23,354.84' },
  refunds_deducted: { tnd: 0, eur: 0, usd: 0, formatted_tnd: '0.000 TND', formatted_eur: '€0.00', formatted_usd: '$0.00' },
  effective_take_rate_pct: 8.0,
  reconciliation_balance_check: {
    balanced: true,
    calculated_sum_tnd: 95000,
    discrepancy_tnd: 0,
  },
};

const mockWaterfall = {
  beginning_mrr_tnd: 10000,
  new_mrr_tnd: 1500,
  expansion_mrr_tnd: 500,
  contraction_mrr_tnd: 200,
  churned_mrr_tnd: 300,
  net_new_mrr_tnd: 1500,
  ending_mrr_tnd: 11500,
  ending_arr_tnd: 138000,
  quick_ratio: 4.0,
  mrr_growth_rate_pct: 15.0,
  plan_breakdown: [],
};

const mockGatewaysMatrix = {
  total_attempts_all_gateways: 500,
  total_successful_all_gateways: 420,
  overall_success_rate_pct: 84.0,
  total_volume_all_gateways_tnd: 45000,
  total_estimated_fees_tnd: 850,
  gateways: [],
};

vi.mock('../services/analytics.service', () => ({
  analyticsService: {
    getLivePulseData: vi.fn().mockResolvedValue(mockLivePulse),
    getGeoHeatmapData: vi.fn().mockResolvedValue(mockGeoHeatmap),
    getGlobalOverview: vi.fn().mockResolvedValue({ overview: true }),
  },
}));

vi.mock('../services/analytics-reconciliation.service', () => ({
  analyticsReconciliationService: {
    getTriFoldReconciliation: vi.fn().mockResolvedValue(mockReconciliation),
    getSaaSMRRWaterfall: vi.fn().mockResolvedValue(mockWaterfall),
    getGatewayReliabilityMatrix: vi.fn().mockResolvedValue(mockGatewaysMatrix),
  },
}));

vi.mock('../middlewares', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin_1', role: 'admin' };
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
  asyncHandler: (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

import adminRouter from '../api/admin.route';

function testAdminApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRouter);
  return app;
}

async function requestEndpoint(app: express.Express, path: string) {
  const server = app.listen(0);
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not bind to a TCP port');
    }
    const res = await fetch(`http://127.0.0.1:${(address as AddressInfo).port}/admin${path}`);
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe('Superadmin Modular Analytics Endpoints (R1 & R2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /admin/analytics/pulse/live returns 200 with live pulse payload', async () => {
    const res = await requestEndpoint(testAdminApp(), '/analytics/pulse/live');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.live_active_visitors_now).toBe(42);
    expect(res.body.data.summary_60s.total_events_60s).toBe(120);
  });

  it('GET /admin/analytics/geo/heatmap returns 200 with Tunisia 24-governorates & Diaspora heatmap', async () => {
    const res = await requestEndpoint(testAdminApp(), '/analytics/geo/heatmap?timeRange=30d');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.total_revenue_tnd).toBe(65000);
    expect(res.body.data.governorates[0].code).toBe('TUN');
  });

  it('GET /admin/analytics/financials/reconciliation returns 200 with Tri-Fold Reconciliation DTO', async () => {
    const res = await requestEndpoint(testAdminApp(), '/analytics/financials/reconciliation?timeRange=30d');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reconciliation_balance_check.balanced).toBe(true);
    expect(res.body.data.gross_gmv.tnd).toBe(100000);
    expect(res.body.data.gross_gmv.eur).toBe(29850.75);
    expect(res.body.data.gross_gmv.usd).toBe(32258.06);
  });

  it('GET /admin/analytics/financials/mrr-waterfall returns 200 with SaaS MRR waterfall metrics', async () => {
    const res = await requestEndpoint(testAdminApp(), '/analytics/financials/mrr-waterfall?timeRange=30d');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.beginning_mrr_tnd).toBe(10000);
    expect(res.body.data.net_new_mrr_tnd).toBe(1500);
    expect(res.body.data.quick_ratio).toBe(4.0);
  });

  it('GET /admin/analytics/gateways/matrix returns 200 with payment gateway reliability matrix', async () => {
    const res = await requestEndpoint(testAdminApp(), '/analytics/gateways/matrix');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overall_success_rate_pct).toBe(84.0);
    expect(res.body.data.total_attempts_all_gateways).toBe(500);
  });
});
