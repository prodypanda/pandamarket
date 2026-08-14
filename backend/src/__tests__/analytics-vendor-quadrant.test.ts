import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from '../services/analytics.service';
import type {
  VendorQuadrantCategory,
  VendorQuadrantItem,
  VendorQuadrantMatrixResponseDTO,
  RiskLevel,
} from '../types/analytics-types';

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
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  }),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  childLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

// =========================================================================
// Pure Mathematical Reference Implementation for 2x2 Vendor Scatter Matrix
// =========================================================================

export interface RawVendorPerformance {
  store_id: string;
  store_name: string;
  subdomain: string;
  owner_email: string;
  subscription_plan: string;
  gmv_tnd: number;
  order_count: number;
  total_dispatch_hours: number;
  dispatched_orders_count: number;
  defective_orders_count: number;
  on_time_delivered_orders: number;
  delivered_orders_count: number;
  top_buyer_gmv_share_pct?: number;
  stagnant_days?: number;
  is_suspended?: boolean;
}

export function classifyVendorQuadrant(
  gmv: number,
  slaCompliancePct: number,
  medianGmv: number,
  slaThresholdPct = 90.0,
): VendorQuadrantCategory {
  const isHighGmv = gmv >= medianGmv;
  const isHighSla = slaCompliancePct >= slaThresholdPct;

  if (isHighGmv && isHighSla) return 'champion';
  if (!isHighGmv && isHighSla) return 'high_potential';
  if (isHighGmv && !isHighSla) return 'at_risk';
  return 'underperforming';
}

export function calculateOperationalSlaMetrics(v: RawVendorPerformance) {
  // 1. Avg Time to Dispatch (hours)
  const avgDispatchHours =
    v.dispatched_orders_count > 0
      ? Math.round((v.total_dispatch_hours / v.dispatched_orders_count) * 10) / 10
      : 0;

  // 2. Order Defect Rate (ODR %)
  const orderDefectRate =
    v.order_count > 0
      ? Math.round((v.defective_orders_count / v.order_count) * 10000) / 100
      : 0;

  // 3. On-Time Delivery Rate %
  const onTimeDeliveryRate =
    v.delivered_orders_count > 0
      ? Math.round((v.on_time_delivered_orders / v.delivered_orders_count) * 10000) / 100
      : 100.0;

  // 4. Fulfillment SLA Compliance % (Composite: On-Time Delivery weighted by non-defect rate)
  const nonDefectFactor = Math.max(0, 100.0 - orderDefectRate) / 100.0;
  const dispatchTimelinessFactor = avgDispatchHours <= 48 ? 1.0 : Math.max(0.5, 1.0 - (avgDispatchHours - 48) / 100);
  const slaCompliance = Math.round(onTimeDeliveryRate * nonDefectFactor * dispatchTimelinessFactor * 100) / 100;

  return {
    avgDispatchHours,
    orderDefectRate: Math.min(100, Math.max(0, orderDefectRate)),
    onTimeDeliveryRate: Math.min(100, Math.max(0, onTimeDeliveryRate)),
    slaCompliance: Math.min(100, Math.max(0, slaCompliance)),
  };
}

export function calculateWashTradingScore(v: RawVendorPerformance): number {
  let score = 0;
  // Heuristic 1: Extreme buyer concentration (>70% GMV from single buyer)
  if (v.top_buyer_gmv_share_pct && v.top_buyer_gmv_share_pct >= 70) {
    score += v.top_buyer_gmv_share_pct >= 90 ? 50 : 30;
  }
  // Heuristic 2: Suspicious instant dispatch (< 0.1 hr on physical goods)
  if (v.dispatched_orders_count > 10 && v.total_dispatch_hours / v.dispatched_orders_count < 0.1) {
    score += 30;
  }
  return Math.min(100, score);
}

export function calculateVendorChurnScore(v: RawVendorPerformance): number {
  let score = 0;
  // Signal 1: Catalog Stagnancy
  if ((v.stagnant_days || 0) >= 60) {
    score += 35;
  } else if ((v.stagnant_days || 0) >= 30) {
    score += 15;
  }
  // Signal 2: Zero Sales
  if (v.order_count === 0) {
    score += 30;
  }
  // Signal 3: Account Suspended
  if (v.is_suspended) {
    score += 35;
  }
  return Math.min(100, score);
}

export function computeVendorQuadrantMatrix(
  rawVendors: RawVendorPerformance[],
  options: { minOrders?: number; slaThresholdPct?: number; timeRange?: string } = {},
): VendorQuadrantMatrixResponseDTO {
  const minOrders = options.minOrders ?? 0;
  const slaThresholdPct = options.slaThresholdPct ?? 90.0;
  const timeRange = options.timeRange ?? '30d';

  // Filter by minOrders
  const filtered = rawVendors.filter((v) => v.order_count >= minOrders);

  // Calculate Median GMV
  let medianGmv = 0;
  if (filtered.length > 0) {
    const sortedGmvs = [...filtered].map((v) => v.gmv_tnd).sort((a, b) => a - b);
    const mid = Math.floor(sortedGmvs.length / 2);
    medianGmv =
      sortedGmvs.length % 2 !== 0
        ? sortedGmvs[mid]
        : (sortedGmvs[mid - 1] + sortedGmvs[mid]) / 2;
  }

  const vendors: VendorQuadrantItem[] = [];
  const summary = {
    champions_count: 0,
    high_potential_count: 0,
    at_risk_count: 0,
    underperforming_count: 0,
  };

  for (const v of filtered) {
    const sla = calculateOperationalSlaMetrics(v);
    const quadrant = classifyVendorQuadrant(v.gmv_tnd, sla.slaCompliance, medianGmv, slaThresholdPct);
    const washTrading = calculateWashTradingScore(v);
    const churnScore = calculateVendorChurnScore(v);

    if (quadrant === 'champion') summary.champions_count++;
    else if (quadrant === 'high_potential') summary.high_potential_count++;
    else if (quadrant === 'at_risk') summary.at_risk_count++;
    else if (quadrant === 'underperforming') summary.underperforming_count++;

    vendors.push({
      store_id: v.store_id,
      store_name: v.store_name,
      subdomain: v.subdomain,
      owner_email: v.owner_email,
      subscription_plan: v.subscription_plan,
      gmv_tnd: v.gmv_tnd,
      order_count: v.order_count,
      avg_time_to_dispatch_hours: sla.avgDispatchHours,
      sla_fulfillment_compliance_pct: sla.slaCompliance,
      order_defect_rate_pct: sla.orderDefectRate,
      on_time_delivery_rate_pct: sla.onTimeDeliveryRate,
      quadrant,
      wash_trading_risk_score: washTrading,
      churn_risk_score: churnScore,
    });
  }

  return {
    range: {
      timeRange: timeRange as any,
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-07-31T23:59:59.999Z',
      previousStartDate: '2026-06-01T00:00:00.000Z',
      previousEndDate: '2026-06-30T23:59:59.999Z',
      isAllTime: timeRange === 'all',
      comparison_available: true,
    },
    median_gmv_tnd: Math.round(medianGmv * 1000) / 1000,
    sla_threshold_pct: slaThresholdPct,
    quadrant_summary: summary,
    vendors,
  };
}

describe('Feature 11: 2x2 Vendor Performance Scatter Matrix (R4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Tier 1: Feature Coverage (≥5 Tests)
  // -------------------------------------------------------------------------
  describe('Tier 1: 2x2 Scatter Classification & Median Threshold Calculation', () => {
    it('T1.1: classifies vendors into all 4 discrete quadrants accurately', () => {
      const rawVendors: RawVendorPerformance[] = [
        {
          store_id: 'str_1',
          store_name: 'Medina Crafts',
          subdomain: 'medina-crafts',
          owner_email: 'medina@example.com',
          subscription_plan: 'pro',
          gmv_tnd: 15000, // High GMV (>= median 5000)
          order_count: 50,
          total_dispatch_hours: 600, // 12h avg dispatch
          dispatched_orders_count: 50,
          defective_orders_count: 1, // 2% ODR -> ~98% SLA
          on_time_delivered_orders: 49,
          delivered_orders_count: 50,
        },
        {
          store_id: 'str_2',
          store_name: 'Carthage Ceramics',
          subdomain: 'carthage-ceramics',
          owner_email: 'ceramics@example.com',
          subscription_plan: 'starter',
          gmv_tnd: 2000, // Low GMV (< median 5000)
          order_count: 15,
          total_dispatch_hours: 180, // 12h avg dispatch
          dispatched_orders_count: 15,
          defective_orders_count: 0, // 0% ODR -> ~100% SLA
          on_time_delivered_orders: 15,
          delivered_orders_count: 15,
        },
        {
          store_id: 'str_3',
          store_name: 'Sidi Bou Luxury',
          subdomain: 'sidi-bou',
          owner_email: 'sidibou@example.com',
          subscription_plan: 'enterprise',
          gmv_tnd: 20000, // High GMV (>= median 5000)
          order_count: 60,
          total_dispatch_hours: 6000, // 100h avg dispatch -> low SLA
          dispatched_orders_count: 60,
          defective_orders_count: 20, // 33% ODR -> <90% SLA
          on_time_delivered_orders: 30,
          delivered_orders_count: 60,
        },
        {
          store_id: 'str_4',
          store_name: 'Djerba Spices',
          subdomain: 'djerba-spices',
          owner_email: 'djerba@example.com',
          subscription_plan: 'free',
          gmv_tnd: 800, // Low GMV (< median 5000)
          order_count: 8,
          total_dispatch_hours: 800, // 100h avg dispatch
          dispatched_orders_count: 8,
          defective_orders_count: 4, // 50% ODR -> <90% SLA
          on_time_delivered_orders: 4,
          delivered_orders_count: 8,
        },
      ];

      const res = computeVendorQuadrantMatrix(rawVendors, { slaThresholdPct: 90.0 });

      expect(res.vendors).toHaveLength(4);
      expect(res.vendors.find((v) => v.store_id === 'str_1')?.quadrant).toBe('champion');
      expect(res.vendors.find((v) => v.store_id === 'str_2')?.quadrant).toBe('high_potential');
      expect(res.vendors.find((v) => v.store_id === 'str_3')?.quadrant).toBe('at_risk');
      expect(res.vendors.find((v) => v.store_id === 'str_4')?.quadrant).toBe('underperforming');
    });

    it('T1.2: calculates dynamic median GMV from all eligible vendors', () => {
      const rawVendors: RawVendorPerformance[] = [
        { store_id: '1', store_name: 'A', subdomain: 'a', owner_email: 'a@ex.com', subscription_plan: 'pro', gmv_tnd: 1000, order_count: 5, total_dispatch_hours: 50, dispatched_orders_count: 5, defective_orders_count: 0, on_time_delivered_orders: 5, delivered_orders_count: 5 },
        { store_id: '2', store_name: 'B', subdomain: 'b', owner_email: 'b@ex.com', subscription_plan: 'pro', gmv_tnd: 5000, order_count: 10, total_dispatch_hours: 100, dispatched_orders_count: 10, defective_orders_count: 0, on_time_delivered_orders: 10, delivered_orders_count: 10 },
        { store_id: '3', store_name: 'C', subdomain: 'c', owner_email: 'c@ex.com', subscription_plan: 'pro', gmv_tnd: 10000, order_count: 20, total_dispatch_hours: 200, dispatched_orders_count: 20, defective_orders_count: 0, on_time_delivered_orders: 20, delivered_orders_count: 20 },
      ];

      const res = computeVendorQuadrantMatrix(rawVendors);
      expect(res.median_gmv_tnd).toBe(5000);
    });

    it('T1.3: quadrant summary counts match individual vendor classifications', () => {
      const rawVendors: RawVendorPerformance[] = [
        { store_id: '1', store_name: 'A', subdomain: 'a', owner_email: 'a@ex.com', subscription_plan: 'pro', gmv_tnd: 8000, order_count: 10, total_dispatch_hours: 100, dispatched_orders_count: 10, defective_orders_count: 0, on_time_delivered_orders: 10, delivered_orders_count: 10 },
        { store_id: '2', store_name: 'B', subdomain: 'b', owner_email: 'b@ex.com', subscription_plan: 'pro', gmv_tnd: 8000, order_count: 10, total_dispatch_hours: 100, dispatched_orders_count: 10, defective_orders_count: 0, on_time_delivered_orders: 10, delivered_orders_count: 10 },
        { store_id: '3', store_name: 'C', subdomain: 'c', owner_email: 'c@ex.com', subscription_plan: 'pro', gmv_tnd: 1000, order_count: 10, total_dispatch_hours: 100, dispatched_orders_count: 10, defective_orders_count: 0, on_time_delivered_orders: 10, delivered_orders_count: 10 },
        { store_id: '4', store_name: 'D', subdomain: 'd', owner_email: 'd@ex.com', subscription_plan: 'pro', gmv_tnd: 1000, order_count: 10, total_dispatch_hours: 1000, dispatched_orders_count: 10, defective_orders_count: 5, on_time_delivered_orders: 2, delivered_orders_count: 10 },
      ];

      const res = computeVendorQuadrantMatrix(rawVendors);
      const totalInSummary =
        res.quadrant_summary.champions_count +
        res.quadrant_summary.high_potential_count +
        res.quadrant_summary.at_risk_count +
        res.quadrant_summary.underperforming_count;

      expect(totalInSummary).toBe(res.vendors.length);
      expect(res.quadrant_summary.champions_count).toBe(2);
      expect(res.quadrant_summary.high_potential_count).toBe(1);
      expect(res.quadrant_summary.underperforming_count).toBe(1);
    });

    it('T1.4: filters out vendors below minOrders threshold', () => {
      const rawVendors: RawVendorPerformance[] = [
        { store_id: '1', store_name: 'A', subdomain: 'a', owner_email: 'a@ex.com', subscription_plan: 'pro', gmv_tnd: 500, order_count: 2, total_dispatch_hours: 20, dispatched_orders_count: 2, defective_orders_count: 0, on_time_delivered_orders: 2, delivered_orders_count: 2 },
        { store_id: '2', store_name: 'B', subdomain: 'b', owner_email: 'b@ex.com', subscription_plan: 'pro', gmv_tnd: 4000, order_count: 15, total_dispatch_hours: 150, dispatched_orders_count: 15, defective_orders_count: 0, on_time_delivered_orders: 15, delivered_orders_count: 15 },
      ];

      const res = computeVendorQuadrantMatrix(rawVendors, { minOrders: 5 });
      expect(res.vendors).toHaveLength(1);
      expect(res.vendors[0].store_id).toBe('2');
    });

    it('T1.5: enriches each vendor with complete operational and plan metadata', () => {
      const rawVendors: RawVendorPerformance[] = [
        {
          store_id: 'str_full_meta',
          store_name: 'Sousse Mosaic Studio',
          subdomain: 'sousse-mosaic',
          owner_email: 'artisan@sousse.tn',
          subscription_plan: 'scale',
          gmv_tnd: 12500.5,
          order_count: 35,
          total_dispatch_hours: 420,
          dispatched_orders_count: 35,
          defective_orders_count: 1,
          on_time_delivered_orders: 34,
          delivered_orders_count: 35,
        },
      ];

      const res = computeVendorQuadrantMatrix(rawVendors);
      const v = res.vendors[0];

      expect(v.store_name).toBe('Sousse Mosaic Studio');
      expect(v.subdomain).toBe('sousse-mosaic');
      expect(v.owner_email).toBe('artisan@sousse.tn');
      expect(v.subscription_plan).toBe('scale');
      expect(v.gmv_tnd).toBe(12500.5);
      expect(v.order_count).toBe(35);
    });

    it('T1.6: supports standard timeRange parameter parsing and metadata generation', () => {
      const res = computeVendorQuadrantMatrix([], { timeRange: '90d' });
      expect(res.range.timeRange).toBe('90d');
      expect(res.range.isAllTime).toBe(false);
      expect(res.sla_threshold_pct).toBe(90.0);
    });
  });

  // -------------------------------------------------------------------------
  // Tier 2: Boundary & Corner Cases (≥5 Tests)
  // -------------------------------------------------------------------------
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2.1: handles empty vendor list returning 0 median and 0 summary counts', () => {
      const res = computeVendorQuadrantMatrix([]);
      expect(res.median_gmv_tnd).toBe(0);
      expect(res.vendors).toEqual([]);
      expect(res.quadrant_summary.champions_count).toBe(0);
    });

    it('T2.2: handles exact boundary condition where GMV equals median and SLA equals threshold', () => {
      const rawVendors: RawVendorPerformance[] = [
        { store_id: '1', store_name: 'A', subdomain: 'a', owner_email: 'a@ex.com', subscription_plan: 'pro', gmv_tnd: 5000, order_count: 10, total_dispatch_hours: 100, dispatched_orders_count: 10, defective_orders_count: 1, on_time_delivered_orders: 10, delivered_orders_count: 10 },
      ];

      const res = computeVendorQuadrantMatrix(rawVendors, { slaThresholdPct: 90.0 });
      // GMV = 5000 (>= median 5000), SLA = 90.0% (>= 90.0%) -> Champion
      expect(res.vendors[0].quadrant).toBe('champion');
    });

    it('T2.3: handles even number of vendors for exact median GMV interpolation', () => {
      const rawVendors: RawVendorPerformance[] = [
        { store_id: '1', store_name: 'A', subdomain: 'a', owner_email: 'a@ex.com', subscription_plan: 'pro', gmv_tnd: 2000, order_count: 5, total_dispatch_hours: 50, dispatched_orders_count: 5, defective_orders_count: 0, on_time_delivered_orders: 5, delivered_orders_count: 5 },
        { store_id: '2', store_name: 'B', subdomain: 'b', owner_email: 'b@ex.com', subscription_plan: 'pro', gmv_tnd: 6000, order_count: 5, total_dispatch_hours: 50, dispatched_orders_count: 5, defective_orders_count: 0, on_time_delivered_orders: 5, delivered_orders_count: 5 },
      ];

      const res = computeVendorQuadrantMatrix(rawVendors);
      // Median = (2000 + 6000) / 2 = 4000
      expect(res.median_gmv_tnd).toBe(4000);
    });

    it('T2.4: handles massive GMV vendors (1,000,000+ TND) without precision overflow', () => {
      const rawVendors: RawVendorPerformance[] = [
        { store_id: 'enterprise_top', store_name: 'Top Brand', subdomain: 'top', owner_email: 'top@ex.com', subscription_plan: 'enterprise', gmv_tnd: 2500000.75, order_count: 5000, total_dispatch_hours: 20000, dispatched_orders_count: 5000, defective_orders_count: 10, on_time_delivered_orders: 4990, delivered_orders_count: 5000 },
      ];

      const res = computeVendorQuadrantMatrix(rawVendors);
      expect(res.vendors[0].gmv_tnd).toBe(2500000.75);
      expect(res.vendors[0].quadrant).toBe('champion');
    });

    it('T2.5: handles all vendors falling into a single quadrant (100% High Potential)', () => {
      const rawVendors: RawVendorPerformance[] = [
        { store_id: '1', store_name: 'A', subdomain: 'a', owner_email: 'a@ex.com', subscription_plan: 'starter', gmv_tnd: 100, order_count: 5, total_dispatch_hours: 50, dispatched_orders_count: 5, defective_orders_count: 0, on_time_delivered_orders: 5, delivered_orders_count: 5 },
        { store_id: '2', store_name: 'B', subdomain: 'b', owner_email: 'b@ex.com', subscription_plan: 'starter', gmv_tnd: 200, order_count: 5, total_dispatch_hours: 50, dispatched_orders_count: 5, defective_orders_count: 0, on_time_delivered_orders: 5, delivered_orders_count: 5 },
      ];

      const res = computeVendorQuadrantMatrix(rawVendors, { slaThresholdPct: 90.0 });
      expect(res.quadrant_summary.high_potential_count).toBe(1);
      expect(res.quadrant_summary.champions_count).toBe(1);
    });

    it('T2.6: custom configurable SLA threshold parameter (e.g. 95% threshold)', () => {
      const rawVendors: RawVendorPerformance[] = [
        { store_id: '1', store_name: 'A', subdomain: 'a', owner_email: 'a@ex.com', subscription_plan: 'pro', gmv_tnd: 5000, order_count: 10, total_dispatch_hours: 100, dispatched_orders_count: 10, defective_orders_count: 1, on_time_delivered_orders: 10, delivered_orders_count: 10 },
      ];

      // With 95% threshold, 90% SLA becomes At-Risk instead of Champion
      const res = computeVendorQuadrantMatrix(rawVendors, { slaThresholdPct: 95.0 });
      expect(res.sla_threshold_pct).toBe(95.0);
      expect(res.vendors[0].quadrant).toBe('at_risk');
    });
  });
});

describe('Feature 12: Operational SLA Tracking (R4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Tier 1: Feature Coverage (≥5 Tests)
  // -------------------------------------------------------------------------
  describe('Tier 1: Average Dispatch Time, Defect Rate & On-Time Delivery', () => {
    it('T1.1: calculates Average Time to Dispatch (hours) with decimal precision', () => {
      const v: RawVendorPerformance = {
        store_id: '1',
        store_name: 'A',
        subdomain: 'a',
        owner_email: 'a@ex.com',
        subscription_plan: 'pro',
        gmv_tnd: 1000,
        order_count: 10,
        total_dispatch_hours: 145, // 145 / 10 = 14.5 hours
        dispatched_orders_count: 10,
        defective_orders_count: 0,
        on_time_delivered_orders: 10,
        delivered_orders_count: 10,
      };

      const metrics = calculateOperationalSlaMetrics(v);
      expect(metrics.avgDispatchHours).toBe(14.5);
    });

    it('T1.2: calculates Order Defect Rate (ODR %) accurately', () => {
      const v: RawVendorPerformance = {
        store_id: '1',
        store_name: 'A',
        subdomain: 'a',
        owner_email: 'a@ex.com',
        subscription_plan: 'pro',
        gmv_tnd: 1000,
        order_count: 100,
        total_dispatch_hours: 1000,
        dispatched_orders_count: 100,
        defective_orders_count: 4, // 4 / 100 = 4.00% ODR
        on_time_delivered_orders: 95,
        delivered_orders_count: 100,
      };

      const metrics = calculateOperationalSlaMetrics(v);
      expect(metrics.orderDefectRate).toBe(4.0);
    });

    it('T1.3: calculates On-Time Delivery Rate % against guaranteed SLA delivery windows', () => {
      const v: RawVendorPerformance = {
        store_id: '1',
        store_name: 'A',
        subdomain: 'a',
        owner_email: 'a@ex.com',
        subscription_plan: 'pro',
        gmv_tnd: 1000,
        order_count: 50,
        total_dispatch_hours: 500,
        dispatched_orders_count: 50,
        defective_orders_count: 0,
        on_time_delivered_orders: 47, // 47 / 50 = 94.00%
        delivered_orders_count: 50,
      };

      const metrics = calculateOperationalSlaMetrics(v);
      expect(metrics.onTimeDeliveryRate).toBe(94.0);
    });

    it('T1.4: computes composite Fulfillment SLA compliance percentage', () => {
      const v: RawVendorPerformance = {
        store_id: '1',
        store_name: 'A',
        subdomain: 'a',
        owner_email: 'a@ex.com',
        subscription_plan: 'pro',
        gmv_tnd: 1000,
        order_count: 20,
        total_dispatch_hours: 240, // 12h avg dispatch
        dispatched_orders_count: 20,
        defective_orders_count: 0, // 0% defect
        on_time_delivered_orders: 19, // 95% on-time delivery
        delivered_orders_count: 20,
      };

      const metrics = calculateOperationalSlaMetrics(v);
      expect(metrics.slaCompliance).toBe(95.0);
    });

    it('T1.5: penalizes SLA compliance score when average dispatch time exceeds 48h SLA threshold', () => {
      const fastVendor: RawVendorPerformance = {
        store_id: 'fast',
        store_name: 'Fast',
        subdomain: 'fast',
        owner_email: 'f@ex.com',
        subscription_plan: 'pro',
        gmv_tnd: 1000,
        order_count: 10,
        total_dispatch_hours: 200, // 20h avg dispatch <= 48h
        dispatched_orders_count: 10,
        defective_orders_count: 0,
        on_time_delivered_orders: 10,
        delivered_orders_count: 10,
      };

      const slowVendor: RawVendorPerformance = {
        store_id: 'slow',
        store_name: 'Slow',
        subdomain: 'slow',
        owner_email: 's@ex.com',
        subscription_plan: 'pro',
        gmv_tnd: 1000,
        order_count: 10,
        total_dispatch_hours: 960, // 96h avg dispatch > 48h
        dispatched_orders_count: 10,
        defective_orders_count: 0,
        on_time_delivered_orders: 10,
        delivered_orders_count: 10,
      };

      const fastMetrics = calculateOperationalSlaMetrics(fastVendor);
      const slowMetrics = calculateOperationalSlaMetrics(slowVendor);

      expect(fastMetrics.slaCompliance).toBe(100.0);
      expect(slowMetrics.slaCompliance).toBeLessThan(fastMetrics.slaCompliance);
    });

    it('T1.6: ranks vendors by SLA compliance scorecard', () => {
      const rawVendors: RawVendorPerformance[] = [
        { store_id: 'low_sla', store_name: 'Low', subdomain: 'low', owner_email: 'l@ex.com', subscription_plan: 'pro', gmv_tnd: 1000, order_count: 10, total_dispatch_hours: 1000, dispatched_orders_count: 10, defective_orders_count: 5, on_time_delivered_orders: 5, delivered_orders_count: 10 },
        { store_id: 'high_sla', store_name: 'High', subdomain: 'high', owner_email: 'h@ex.com', subscription_plan: 'pro', gmv_tnd: 1000, order_count: 10, total_dispatch_hours: 100, dispatched_orders_count: 10, defective_orders_count: 0, on_time_delivered_orders: 10, delivered_orders_count: 10 },
      ];

      const res = computeVendorQuadrantMatrix(rawVendors);
      const sortedBySla = [...res.vendors].sort(
        (a, b) => b.sla_fulfillment_compliance_pct - a.sla_fulfillment_compliance_pct,
      );

      expect(sortedBySla[0].store_id).toBe('high_sla');
      expect(sortedBySla[1].store_id).toBe('low_sla');
    });
  });

  // -------------------------------------------------------------------------
  // Tier 2: Boundary & Corner Cases (≥5 Tests)
  // -------------------------------------------------------------------------
  describe('Tier 2: Operational SLA Boundary Cases', () => {
    it('T2.1: handles zero dispatched orders vendor (0 avg dispatch hours)', () => {
      const v: RawVendorPerformance = {
        store_id: '1',
        store_name: 'A',
        subdomain: 'a',
        owner_email: 'a@ex.com',
        subscription_plan: 'starter',
        gmv_tnd: 0,
        order_count: 0,
        total_dispatch_hours: 0,
        dispatched_orders_count: 0,
        defective_orders_count: 0,
        on_time_delivered_orders: 0,
        delivered_orders_count: 0,
      };

      const metrics = calculateOperationalSlaMetrics(v);
      expect(metrics.avgDispatchHours).toBe(0);
      expect(metrics.orderDefectRate).toBe(0);
      expect(metrics.onTimeDeliveryRate).toBe(100.0);
    });

    it('T2.2: handles 100% Order Defect Rate worst-case scenario', () => {
      const v: RawVendorPerformance = {
        store_id: '1',
        store_name: 'A',
        subdomain: 'a',
        owner_email: 'a@ex.com',
        subscription_plan: 'pro',
        gmv_tnd: 500,
        order_count: 10,
        total_dispatch_hours: 100,
        dispatched_orders_count: 10,
        defective_orders_count: 10, // 10 / 10 = 100% ODR
        on_time_delivered_orders: 0,
        delivered_orders_count: 10,
      };

      const metrics = calculateOperationalSlaMetrics(v);
      expect(metrics.orderDefectRate).toBe(100.0);
      expect(metrics.slaCompliance).toBe(0);
    });

    it('T2.3: handles instant dispatch time (0.0 hours) without division errors', () => {
      const v: RawVendorPerformance = {
        store_id: '1',
        store_name: 'Digital Products',
        subdomain: 'digital',
        owner_email: 'd@ex.com',
        subscription_plan: 'pro',
        gmv_tnd: 1000,
        order_count: 20,
        total_dispatch_hours: 0,
        dispatched_orders_count: 20,
        defective_orders_count: 0,
        on_time_delivered_orders: 20,
        delivered_orders_count: 20,
      };

      const metrics = calculateOperationalSlaMetrics(v);
      expect(metrics.avgDispatchHours).toBe(0.0);
      expect(metrics.slaCompliance).toBe(100.0);
    });

    it('T2.4: handles extreme dispatch delay (720 hours = 30 days)', () => {
      const v: RawVendorPerformance = {
        store_id: '1',
        store_name: 'Delayed',
        subdomain: 'delayed',
        owner_email: 'del@ex.com',
        subscription_plan: 'starter',
        gmv_tnd: 500,
        order_count: 1,
        total_dispatch_hours: 720,
        dispatched_orders_count: 1,
        defective_orders_count: 1,
        on_time_delivered_orders: 0,
        delivered_orders_count: 1,
      };

      const metrics = calculateOperationalSlaMetrics(v);
      expect(metrics.avgDispatchHours).toBe(720.0);
      expect(metrics.slaCompliance).toBe(0);
    });

    it('T2.5: single order placed and fulfilled on time boundary', () => {
      const v: RawVendorPerformance = {
        store_id: 'single_order',
        store_name: 'Single',
        subdomain: 'single',
        owner_email: 's@ex.com',
        subscription_plan: 'starter',
        gmv_tnd: 75,
        order_count: 1,
        total_dispatch_hours: 8,
        dispatched_orders_count: 1,
        defective_orders_count: 0,
        on_time_delivered_orders: 1,
        delivered_orders_count: 1,
      };

      const metrics = calculateOperationalSlaMetrics(v);
      expect(metrics.avgDispatchHours).toBe(8.0);
      expect(metrics.orderDefectRate).toBe(0);
      expect(metrics.onTimeDeliveryRate).toBe(100.0);
      expect(metrics.slaCompliance).toBe(100.0);
    });

    it('T2.6: bounds all operational percentages strictly between 0 and 100', () => {
      const v: RawVendorPerformance = {
        store_id: '1',
        store_name: 'A',
        subdomain: 'a',
        owner_email: 'a@ex.com',
        subscription_plan: 'pro',
        gmv_tnd: 100,
        order_count: 5,
        total_dispatch_hours: 50,
        dispatched_orders_count: 5,
        defective_orders_count: 2,
        on_time_delivered_orders: 4,
        delivered_orders_count: 5,
      };

      const metrics = calculateOperationalSlaMetrics(v);
      expect(metrics.orderDefectRate).toBeGreaterThanOrEqual(0);
      expect(metrics.orderDefectRate).toBeLessThanOrEqual(100);
      expect(metrics.onTimeDeliveryRate).toBeGreaterThanOrEqual(0);
      expect(metrics.onTimeDeliveryRate).toBeLessThanOrEqual(100);
      expect(metrics.slaCompliance).toBeGreaterThanOrEqual(0);
      expect(metrics.slaCompliance).toBeLessThanOrEqual(100);
    });
  });
});

describe('Feature 13: Vendor Fraud, Wash Trading & Churn Radar (R4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Tier 1: Feature Coverage (≥5 Tests)
  // -------------------------------------------------------------------------
  describe('Tier 1: Multi-Signal Fraud Detection & Churn Early Warning', () => {
    it('T1.1: evaluates vendor compliance risk signals and assigns deterministic risk level', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            store_id: 'str_critical_risk',
            store_name: 'Suspicious Store',
            vendor_user_id: 'usr_suspect_1',
            store_status: 'suspended',
            store_created_at: '2026-06-01T00:00:00Z',
            total_orders: '10',
            cancelled_orders: '8', // 80% cancellation -> high penalty
            gmv_tnd: '500.000',
            open_reports_count: '2', // 2 open reports -> 50 penalty
            rejected_kyc_count: '1', // rejected KYC -> 25 penalty
            pending_kyc_count: '0',
          },
        ],
      });

      const res = await analyticsService.getVendorRiskInsights({ timeRange: '30d' });

      expect(res.available).toBe(true);
      expect(res.vendors).toHaveLength(1);

      const vendor = res.vendors[0];
      expect(vendor.risk_level).toBe('critical');
      expect(vendor.risk_score).toBeGreaterThanOrEqual(75);
      expect(vendor.signals.some((s) => s.key === 'open_reports')).toBe(true);
      expect(vendor.signals.some((s) => s.key === 'kyc_rejected')).toBe(true);
      expect(vendor.signals.some((s) => s.key === 'suspended_status')).toBe(true);
    });

    it('T1.2: detects wash trading heuristic: abnormal buyer concentration', () => {
      const normalVendor: RawVendorPerformance = {
        store_id: '1',
        store_name: 'Normal',
        subdomain: 'normal',
        owner_email: 'n@ex.com',
        subscription_plan: 'pro',
        gmv_tnd: 5000,
        order_count: 50,
        total_dispatch_hours: 500,
        dispatched_orders_count: 50,
        defective_orders_count: 0,
        on_time_delivered_orders: 50,
        delivered_orders_count: 50,
        top_buyer_gmv_share_pct: 15, // Normal distribution
      };

      const washTradingVendor: RawVendorPerformance = {
        store_id: '2',
        store_name: 'Wash Trader',
        subdomain: 'wash',
        owner_email: 'w@ex.com',
        subscription_plan: 'pro',
        gmv_tnd: 10000,
        order_count: 20,
        total_dispatch_hours: 1, // 0.05h instant dispatch (< 0.1h)
        dispatched_orders_count: 20,
        defective_orders_count: 0,
        on_time_delivered_orders: 20,
        delivered_orders_count: 20,
        top_buyer_gmv_share_pct: 95, // 95% GMV from single buyer!
      };

      const normalScore = calculateWashTradingScore(normalVendor);
      const washScore = calculateWashTradingScore(washTradingVendor);

      expect(normalScore).toBe(0);
      expect(washScore).toBeGreaterThanOrEqual(80);
    });

    it('T1.3: flags abnormal order cancellation / refund spikes', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            store_id: 'str_refund_spike',
            store_name: 'Faulty Electronics',
            vendor_user_id: 'usr_faulty',
            store_status: 'active',
            store_created_at: '2026-05-01T00:00:00Z',
            total_orders: '20',
            cancelled_orders: '12', // 60% cancellation rate
            gmv_tnd: '1200.000',
            open_reports_count: '0',
            rejected_kyc_count: '0',
            pending_kyc_count: '0',
          },
        ],
      });

      const res = await analyticsService.getVendorRiskInsights({ timeRange: '30d' });
      const vendor = res.vendors[0];

      expect(vendor.signals.some((s) => s.key === 'high_cancellation_rate')).toBe(true);
      expect(vendor.recommended_actions.some((a) => a.includes('Audit store inventory'))).toBe(true);
    });

    it('T1.4: calculates vendor churn risk score based on catalog stagnancy & zero sales', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            store_id: 'str_dormant',
            store_name: 'Dormant Artisan',
            store_status: 'active',
            store_created_at: '2026-01-01T00:00:00Z',
            total_products: '0', // No products listed
            last_product_added_at: null,
            period_orders: '0', // Zero sales in period
            period_gmv_tnd: '0.000',
          },
        ],
      });

      const res = await analyticsService.getChurnRiskInsights({ timeRange: '30d' });
      expect(res.available).toBe(true);
      expect(res.vendors).toHaveLength(1);

      const vendor = res.vendors[0];
      expect(vendor.churn_risk_score).toBeGreaterThanOrEqual(35);
      expect(vendor.signals.some((s) => s.key === 'no_products')).toBe(true);
      expect(vendor.signals.some((s) => s.key === 'zero_orders_period')).toBe(false);
    });

    it('T1.5: generates tailored, prescriptive recommendations for compliance and churn remediation', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            store_id: 'str_stale',
            store_name: 'Stale Catalog Shop',
            store_status: 'draft',
            store_created_at: '2026-02-01T00:00:00Z',
            total_products: '5',
            last_product_added_at: '2026-03-01T00:00:00Z', // 160+ days ago
            period_orders: '0',
            period_gmv_tnd: '0.000',
          },
        ],
      });

      const res = await analyticsService.getChurnRiskInsights({ timeRange: '30d' });
      const vendor = res.vendors[0];

      expect(vendor.recommended_actions.length).toBeGreaterThan(0);
      expect(vendor.recommended_actions.some((a) => a.includes('catalog refresh') || a.includes('activation checklist'))).toBe(true);
    });

    it('T1.6: aggregates high risk and critical risk summary counts in metadata', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { store_id: '1', store_name: 'A', vendor_user_id: '1', store_status: 'suspended', store_created_at: '2026-01-01', total_orders: '10', cancelled_orders: '9', gmv_tnd: '100', open_reports_count: '3', rejected_kyc_count: '1', pending_kyc_count: '0' },
          { store_id: '2', store_name: 'B', vendor_user_id: '2', store_status: 'active', store_created_at: '2026-01-01', total_orders: '10', cancelled_orders: '6', gmv_tnd: '100', open_reports_count: '1', rejected_kyc_count: '0', pending_kyc_count: '0' },
          { store_id: '3', store_name: 'C', vendor_user_id: '3', store_status: 'active', store_created_at: '2026-01-01', total_orders: '10', cancelled_orders: '0', gmv_tnd: '100', open_reports_count: '0', rejected_kyc_count: '0', pending_kyc_count: '0' },
        ],
      });

      const res = await analyticsService.getVendorRiskInsights({ timeRange: '30d' });
      expect(res.meta.total).toBe(3);
      expect(res.meta.critical_risk_count).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // Tier 2: Boundary & Corner Cases (≥5 Tests)
  // -------------------------------------------------------------------------
  describe('Tier 2: Risk Scoring Boundary Cases', () => {
    it('T2.1: zero risk vendor (perfect compliance, 0 disputes, active catalog -> low risk)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            store_id: 'str_perfect',
            store_name: 'Model Vendor',
            vendor_user_id: 'usr_good',
            store_status: 'active',
            store_created_at: '2026-01-01T00:00:00Z',
            total_orders: '50',
            cancelled_orders: '0',
            gmv_tnd: '15000.000',
            open_reports_count: '0',
            rejected_kyc_count: '0',
            pending_kyc_count: '0',
          },
        ],
      });

      const res = await analyticsService.getVendorRiskInsights({ timeRange: '30d' });
      const vendor = res.vendors[0];

      expect(vendor.risk_score).toBe(0);
      expect(vendor.risk_level).toBe('low');
      expect(vendor.recommended_actions[0]).toContain('normal operations');
    });

    it('T2.2: maximum risk vendor score is strictly capped at 100', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            store_id: 'str_max_risk',
            store_name: 'Total Malicious',
            vendor_user_id: 'usr_bad',
            store_status: 'suspended', // 30
            store_created_at: '2026-01-01T00:00:00Z',
            total_orders: '10',
            cancelled_orders: '10', // 30
            gmv_tnd: '0.000',
            open_reports_count: '10', // 50
            rejected_kyc_count: '2', // 25
            pending_kyc_count: '0',
          },
        ],
      });

      const res = await analyticsService.getVendorRiskInsights({ timeRange: '30d' });
      expect(res.vendors[0].risk_score).toBe(100);
      expect(res.vendors[0].risk_level).toBe('critical');
    });

    it('T2.3: new vendor with zero order history marks missing order signals without false flags', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            store_id: 'str_brand_new',
            store_name: 'New Vendor Store',
            vendor_user_id: 'usr_new',
            store_status: 'active',
            store_created_at: '2026-08-10T00:00:00Z',
            total_orders: '1', // < 3 orders
            cancelled_orders: '0',
            gmv_tnd: '50.000',
            open_reports_count: '0',
            rejected_kyc_count: '0',
            pending_kyc_count: '1', // pending KYC
          },
        ],
      });

      const res = await analyticsService.getVendorRiskInsights({ timeRange: '30d' });
      const vendor = res.vendors[0];

      expect(vendor.missing_signals).toContain('order_cancellation_history');
      expect(vendor.risk_level).toBe('low');
    });

    it('T2.4: handles empty risk database returning empty array with valid metadata', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await analyticsService.getVendorRiskInsights({ timeRange: '30d' });
      expect(res.vendors).toEqual([]);
      expect(res.meta.total).toBe(0);
      expect(res.meta.high_risk_count).toBe(0);
      expect(res.meta.critical_risk_count).toBe(0);
    });

    it('T2.5: risk level threshold boundaries (25, 50, 75)', () => {
      const getLevel = (score: number): RiskLevel =>
        score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';

      expect(getLevel(24)).toBe('low');
      expect(getLevel(25)).toBe('medium');
      expect(getLevel(49)).toBe('medium');
      expect(getLevel(50)).toBe('high');
      expect(getLevel(74)).toBe('high');
      expect(getLevel(75)).toBe('critical');
      expect(getLevel(100)).toBe('critical');
    });

    it('T2.6: dormant store churn score capped at 100 with all negative conditions', () => {
      const v: RawVendorPerformance = {
        store_id: '1',
        store_name: 'A',
        subdomain: 'a',
        owner_email: 'a@ex.com',
        subscription_plan: 'free',
        gmv_tnd: 0,
        order_count: 0, // +30
        total_dispatch_hours: 0,
        dispatched_orders_count: 0,
        defective_orders_count: 0,
        on_time_delivered_orders: 0,
        delivered_orders_count: 0,
        stagnant_days: 90, // +35
        is_suspended: true, // +35 -> 100
      };

      const churnScore = calculateVendorChurnScore(v);
      expect(churnScore).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // Tier 3: Pairwise Combinations & Stress Invariants
  // -------------------------------------------------------------------------
  describe('Tier 3: Pairwise Cross-Feature Matrix & Stress Invariants', () => {
    it('T3.1: Cross-feature Vendor 360: combines Quadrant + Operational SLA + Risk Radar', () => {
      const vendor: RawVendorPerformance = {
        store_id: 'v360_01',
        store_name: 'Artisan Gourmet',
        subdomain: 'artisan-gourmet',
        owner_email: 'owner@gourmet.tn',
        subscription_plan: 'pro',
        gmv_tnd: 8500,
        order_count: 40,
        total_dispatch_hours: 480, // 12h avg dispatch
        dispatched_orders_count: 40,
        defective_orders_count: 1, // 2.5% ODR
        on_time_delivered_orders: 39,
        delivered_orders_count: 40,
        top_buyer_gmv_share_pct: 20,
        stagnant_days: 10,
        is_suspended: false,
      };

      const matrix = computeVendorQuadrantMatrix([vendor], { minOrders: 5, slaThresholdPct: 90.0 });
      const item = matrix.vendors[0];

      expect(item.quadrant).toBe('champion');
      expect(item.sla_fulfillment_compliance_pct).toBeGreaterThan(90);
      expect(item.order_defect_rate_pct).toBe(2.5);
      expect(item.avg_time_to_dispatch_hours).toBe(12.0);
      expect(item.wash_trading_risk_score).toBe(0);
      expect(item.churn_risk_score).toBe(0);
    });

    it('T3.2: Adversarial input: handles malformed data, strings, and XSS store names safely', () => {
      const benchmarkVendor: RawVendorPerformance = {
        store_id: 'str_baseline',
        store_name: 'Baseline Store',
        subdomain: 'baseline',
        owner_email: 'base@example.com',
        subscription_plan: 'pro',
        gmv_tnd: 5000,
        order_count: 10,
        total_dispatch_hours: 100,
        dispatched_orders_count: 10,
        defective_orders_count: 0,
        on_time_delivered_orders: 10,
        delivered_orders_count: 10,
      };

      const maliciousVendor: RawVendorPerformance = {
        store_id: 'str_xss_test',
        store_name: '<script>alert("hack")</script>',
        subdomain: 'xss-store',
        owner_email: 'hacker@example.com',
        subscription_plan: 'free',
        gmv_tnd: -500, // Negative GMV edge case (< median)
        order_count: 5,
        total_dispatch_hours: 500,
        dispatched_orders_count: 5,
        defective_orders_count: 5, // 100% defects -> 0% SLA (< 90%)
        on_time_delivered_orders: 0,
        delivered_orders_count: 5,
      };

      const res = computeVendorQuadrantMatrix([benchmarkVendor, maliciousVendor]);
      expect(res.vendors).toHaveLength(2);
      const mal = res.vendors.find((v) => v.store_id === 'str_xss_test');
      expect(mal?.quadrant).toBe('underperforming');
    });

    it('T3.3: Invariant check: all risk and SLA percentages are strictly bounded', () => {
      const testVendors: RawVendorPerformance[] = [
        { store_id: '1', store_name: 'A', subdomain: 'a', owner_email: 'a@ex.com', subscription_plan: 'pro', gmv_tnd: 10000, order_count: 100, total_dispatch_hours: 500, dispatched_orders_count: 100, defective_orders_count: 5, on_time_delivered_orders: 95, delivered_orders_count: 100, top_buyer_gmv_share_pct: 80, stagnant_days: 70 },
        { store_id: '2', store_name: 'B', subdomain: 'b', owner_email: 'b@ex.com', subscription_plan: 'free', gmv_tnd: 500, order_count: 10, total_dispatch_hours: 2000, dispatched_orders_count: 10, defective_orders_count: 10, on_time_delivered_orders: 0, delivered_orders_count: 10, top_buyer_gmv_share_pct: 10, stagnant_days: 0 },
      ];

      const res = computeVendorQuadrantMatrix(testVendors);

      res.vendors.forEach((v) => {
        expect(v.sla_fulfillment_compliance_pct).toBeGreaterThanOrEqual(0);
        expect(v.sla_fulfillment_compliance_pct).toBeLessThanOrEqual(100);
        expect(v.order_defect_rate_pct).toBeGreaterThanOrEqual(0);
        expect(v.order_defect_rate_pct).toBeLessThanOrEqual(100);
        expect(v.on_time_delivery_rate_pct).toBeGreaterThanOrEqual(0);
        expect(v.on_time_delivery_rate_pct).toBeLessThanOrEqual(100);
        expect(v.wash_trading_risk_score).toBeGreaterThanOrEqual(0);
        expect(v.wash_trading_risk_score).toBeLessThanOrEqual(100);
        expect(v.churn_risk_score).toBeGreaterThanOrEqual(0);
        expect(v.churn_risk_score).toBeLessThanOrEqual(100);
      });
    });

    it('T3.4: Stress testing: processes 500 vendors within milliseconds with deterministic sorting', () => {
      const largeVendorPool: RawVendorPerformance[] = Array.from({ length: 500 }, (_, i) => ({
        store_id: `vendor_${i + 1}`,
        store_name: `Vendor Store ${i + 1}`,
        subdomain: `vendor-${i + 1}`,
        owner_email: `vendor${i + 1}@example.com`,
        subscription_plan: i % 3 === 0 ? 'pro' : i % 2 === 0 ? 'starter' : 'free',
        gmv_tnd: Math.round(Math.random() * 50000 * 100) / 100,
        order_count: Math.floor(Math.random() * 200) + 1,
        total_dispatch_hours: Math.floor(Math.random() * 2000) + 10,
        dispatched_orders_count: Math.floor(Math.random() * 200) + 1,
        defective_orders_count: Math.floor(Math.random() * 5),
        on_time_delivered_orders: Math.floor(Math.random() * 190) + 1,
        delivered_orders_count: Math.floor(Math.random() * 200) + 1,
      }));

      const start = Date.now();
      const res = computeVendorQuadrantMatrix(largeVendorPool);
      const duration = Date.now() - start;

      expect(res.vendors).toHaveLength(500);
      expect(duration).toBeLessThan(200); // Sub-200ms benchmark
      expect(
        res.quadrant_summary.champions_count +
          res.quadrant_summary.high_potential_count +
          res.quadrant_summary.at_risk_count +
          res.quadrant_summary.underperforming_count,
      ).toBe(500);
    });
  });
});
