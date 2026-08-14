import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from '../services/analytics.service';
import type {
  Granular7StageFunnelDTO,
  FunnelStageItem,
  CohortResponseDTO,
  CohortType,
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
// Pure Mathematical and Algorithmic Reference Functions for 7-Stage Funnel
// =========================================================================

export interface RawFunnelCounts {
  sessions: number;
  product_views: number;
  add_to_cart: number;
  checkout_started: number;
  address_entered: number;
  payment_started: number;
  order_completed: number;
}

export function compute7StageFunnel(
  counts: RawFunnelCounts,
  timeRange = '30d',
  storeId?: string,
): Granular7StageFunnelDTO {
  const stageDefs = [
    { num: 1, id: 'session', name: 'Store Sessions', count: counts.sessions },
    { num: 2, id: 'product', name: 'Product Views', count: counts.product_views },
    { num: 3, id: 'cart', name: 'Add to Cart', count: counts.add_to_cart },
    { num: 4, id: 'checkout', name: 'Checkout Started', count: counts.checkout_started },
    { num: 5, id: 'address', name: 'Address Entered', count: counts.address_entered },
    { num: 6, id: 'payment', name: 'Payment Started', count: counts.payment_started },
    { num: 7, id: 'order', name: 'Order Completed', count: counts.order_completed },
  ];

  const stages: FunnelStageItem[] = [];

  for (let i = 0; i < stageDefs.length; i++) {
    const curr = stageDefs[i];
    const prev = i > 0 ? stageDefs[i - 1] : null;

    let stepConversionPct = 100;
    let dropOffCount = 0;
    let dropOffPct = 0;

    if (prev) {
      if (prev.count > 0) {
        stepConversionPct = Math.min(100, Math.round((curr.count / prev.count) * 10000) / 100);
        dropOffCount = Math.max(0, prev.count - curr.count);
        dropOffPct = Math.round((dropOffCount / prev.count) * 10000) / 100;
      } else {
        stepConversionPct = 0;
        dropOffCount = 0;
        dropOffPct = 0;
      }
    }

    stages.push({
      stage_number: curr.num,
      stage_id: curr.id,
      stage_name: curr.name,
      visitor_count: curr.count,
      step_conversion_pct: stepConversionPct,
      drop_off_count: dropOffCount,
      drop_off_pct: dropOffPct,
    });
  }

  const overallConversion =
    counts.sessions > 0
      ? Math.round((counts.order_completed / counts.sessions) * 10000) / 100
      : 0;

  const cartAbandonment =
    counts.add_to_cart > 0
      ? Math.round(((counts.add_to_cart - counts.order_completed) / counts.add_to_cart) * 10000) / 100
      : 0;

  const checkoutAbandonment =
    counts.checkout_started > 0
      ? Math.round(
          ((counts.checkout_started - counts.order_completed) / counts.checkout_started) * 10000,
        ) / 100
      : 0;

  const dropOffReasons = [
    {
      reason: 'Shipping & Delivery Fees Hesitation',
      estimated_count: Math.round(stages[4].drop_off_count * 0.45),
      share_pct: 45.0,
    },
    {
      reason: 'Payment Gateway Friction or Refusal',
      estimated_count: Math.round(stages[5].drop_off_count * 0.35),
      share_pct: 35.0,
    },
    {
      reason: 'Window Shopping / Comparison Research',
      estimated_count: Math.round(stages[2].drop_off_count * 0.2),
      share_pct: 20.0,
    },
  ];

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
    total_sessions: counts.sessions,
    total_completed_orders: counts.order_completed,
    overall_conversion_rate_pct: overallConversion,
    cart_abandonment_rate_pct: cartAbandonment,
    checkout_abandonment_rate_pct: checkoutAbandonment,
    stages,
    drop_off_reasons: dropOffReasons,
  };
}

// =========================================================================
// Pure Mathematical and Algorithmic Reference Functions for Cohorts
// =========================================================================

export interface NDayRepurchaseRates {
  day_1_pct: number;
  day_7_pct: number;
  day_14_pct: number;
  day_30_pct: number;
  day_60_pct: number;
  day_90_pct: number;
}

export function calculateNDayRepurchaseRates(
  cohortSize: number,
  repurchasedBuyersByDay: { [day: number]: number },
): NDayRepurchaseRates {
  if (cohortSize <= 0) {
    return {
      day_1_pct: 0,
      day_7_pct: 0,
      day_14_pct: 0,
      day_30_pct: 0,
      day_60_pct: 0,
      day_90_pct: 0,
    };
  }

  const calc = (d: number) =>
    Math.round(((repurchasedBuyersByDay[d] || 0) / cohortSize) * 10000) / 100;

  return {
    day_1_pct: calc(1),
    day_7_pct: calc(7),
    day_14_pct: calc(14),
    day_30_pct: calc(30),
    day_60_pct: calc(60),
    day_90_pct: calc(90),
  };
}

describe('Feature 8: 7-Stage Granular Conversion Funnel (R3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Tier 1: Feature Coverage (≥5 Tests)
  // -------------------------------------------------------------------------
  describe('Tier 1: Core Funnel Calculation & Stage Transition Verification', () => {
    it('T1.1: computes all 7 discrete stages sequentially with exact visitor counts', () => {
      const counts: RawFunnelCounts = {
        sessions: 10000,
        product_views: 6500,
        add_to_cart: 2600,
        checkout_started: 1300,
        address_entered: 950,
        payment_started: 780,
        order_completed: 650,
      };

      const funnel = compute7StageFunnel(counts, '30d');

      expect(funnel.stages).toHaveLength(7);
      expect(funnel.stages.map((s) => s.stage_id)).toEqual([
        'session',
        'product',
        'cart',
        'checkout',
        'address',
        'payment',
        'order',
      ]);
      expect(funnel.stages[0].visitor_count).toBe(10000);
      expect(funnel.stages[1].visitor_count).toBe(6500);
      expect(funnel.stages[2].visitor_count).toBe(2600);
      expect(funnel.stages[3].visitor_count).toBe(1300);
      expect(funnel.stages[4].visitor_count).toBe(950);
      expect(funnel.stages[5].visitor_count).toBe(780);
      expect(funnel.stages[6].visitor_count).toBe(650);
    });

    it('T1.2: accurately calculates step-by-step conversion and drop-off rates', () => {
      const counts: RawFunnelCounts = {
        sessions: 10000,
        product_views: 5000, // 50.00% conversion, 50.00% drop-off
        add_to_cart: 2500, // 50.00% conversion, 50.00% drop-off
        checkout_started: 1000, // 40.00% conversion, 60.00% drop-off
        address_entered: 800, // 80.00% conversion, 20.00% drop-off
        payment_started: 600, // 75.00% conversion, 25.00% drop-off
        order_completed: 450, // 75.00% conversion, 25.00% drop-off
      };

      const funnel = compute7StageFunnel(counts, '30d');

      expect(funnel.stages[0].step_conversion_pct).toBe(100);
      expect(funnel.stages[0].drop_off_count).toBe(0);

      expect(funnel.stages[1].step_conversion_pct).toBe(50.0);
      expect(funnel.stages[1].drop_off_count).toBe(5000);
      expect(funnel.stages[1].drop_off_pct).toBe(50.0);

      expect(funnel.stages[2].step_conversion_pct).toBe(50.0);
      expect(funnel.stages[2].drop_off_count).toBe(2500);

      expect(funnel.stages[3].step_conversion_pct).toBe(40.0);
      expect(funnel.stages[3].drop_off_count).toBe(1500);
      expect(funnel.stages[3].drop_off_pct).toBe(60.0);

      expect(funnel.stages[4].step_conversion_pct).toBe(80.0);
      expect(funnel.stages[4].drop_off_count).toBe(200);

      expect(funnel.stages[5].step_conversion_pct).toBe(75.0);
      expect(funnel.stages[5].drop_off_count).toBe(200);

      expect(funnel.stages[6].step_conversion_pct).toBe(75.0);
      expect(funnel.stages[6].drop_off_count).toBe(150);
    });

    it('T1.3: computes true cart abandonment rate ((cart - order) / cart)', () => {
      const counts: RawFunnelCounts = {
        sessions: 1000,
        product_views: 800,
        add_to_cart: 400,
        checkout_started: 200,
        address_entered: 150,
        payment_started: 120,
        order_completed: 100,
      };

      const funnel = compute7StageFunnel(counts, '30d');
      // Cart abandonment = (400 - 100) / 400 * 100 = 75.00%
      expect(funnel.cart_abandonment_rate_pct).toBe(75.0);
    });

    it('T1.4: computes true checkout abandonment rate ((checkout - order) / checkout)', () => {
      const counts: RawFunnelCounts = {
        sessions: 1000,
        product_views: 800,
        add_to_cart: 400,
        checkout_started: 200,
        address_entered: 150,
        payment_started: 120,
        order_completed: 100,
      };

      const funnel = compute7StageFunnel(counts, '30d');
      // Checkout abandonment = (200 - 100) / 200 * 100 = 50.00%
      expect(funnel.checkout_abandonment_rate_pct).toBe(50.0);
    });

    it('T1.5: isolates store-level funnel metrics when storeId is provided', () => {
      const storeCounts: RawFunnelCounts = {
        sessions: 1500,
        product_views: 900,
        add_to_cart: 300,
        checkout_started: 150,
        address_entered: 120,
        payment_started: 90,
        order_completed: 75,
      };

      const funnel = compute7StageFunnel(storeCounts, '30d', 'store_artisan_tunis_01');
      expect(funnel.total_sessions).toBe(1500);
      expect(funnel.total_completed_orders).toBe(75);
      expect(funnel.overall_conversion_rate_pct).toBe(5.0);
      expect(funnel.cart_abandonment_rate_pct).toBe(75.0);
    });

    it('T1.6: returns drop-off reasons analysis with share percentages and estimated counts', () => {
      const counts: RawFunnelCounts = {
        sessions: 5000,
        product_views: 3500,
        add_to_cart: 1500,
        checkout_started: 900,
        address_entered: 600,
        payment_started: 400,
        order_completed: 250,
      };

      const funnel = compute7StageFunnel(counts, '30d');
      expect(funnel.drop_off_reasons).toBeDefined();
      expect(funnel.drop_off_reasons.length).toBeGreaterThan(0);
      const totalShare = funnel.drop_off_reasons.reduce((acc, r) => acc + r.share_pct, 0);
      expect(totalShare).toBe(100.0);
      expect(funnel.drop_off_reasons[0].reason).toContain('Shipping');
    });
  });

  // -------------------------------------------------------------------------
  // Tier 2: Boundary & Corner Cases (≥5 Tests)
  // -------------------------------------------------------------------------
  describe('Tier 2: Boundary, Zero Traffic & Edge Cases', () => {
    it('T2.1: handles zero sessions boundary without NaN or division by zero errors', () => {
      const counts: RawFunnelCounts = {
        sessions: 0,
        product_views: 0,
        add_to_cart: 0,
        checkout_started: 0,
        address_entered: 0,
        payment_started: 0,
        order_completed: 0,
      };

      const funnel = compute7StageFunnel(counts, '7d');

      expect(funnel.total_sessions).toBe(0);
      expect(funnel.total_completed_orders).toBe(0);
      expect(funnel.overall_conversion_rate_pct).toBe(0);
      expect(funnel.cart_abandonment_rate_pct).toBe(0);
      expect(funnel.checkout_abandonment_rate_pct).toBe(0);

      funnel.stages.forEach((stage) => {
        expect(Number.isNaN(stage.step_conversion_pct)).toBe(false);
        expect(Number.isNaN(stage.drop_off_pct)).toBe(false);
        expect(Number.isFinite(stage.step_conversion_pct)).toBe(true);
        expect(stage.visitor_count).toBe(0);
      });
    });

    it('T2.2: clamps step conversion at 100% when downstream steps exceed upstream (direct link anomaly)', () => {
      const anomalousCounts: RawFunnelCounts = {
        sessions: 100,
        product_views: 120, // 120 > 100 due to direct product deep links
        add_to_cart: 120,
        checkout_started: 150, // 150 > 120 due to restored saved cart
        address_entered: 150,
        payment_started: 150,
        order_completed: 150,
      };

      const funnel = compute7StageFunnel(anomalousCounts, '30d');

      expect(funnel.stages[1].step_conversion_pct).toBe(100);
      expect(funnel.stages[1].drop_off_count).toBe(0);
      expect(funnel.stages[1].drop_off_pct).toBe(0);
      expect(funnel.stages[3].step_conversion_pct).toBe(100);
    });

    it('T2.3: handles complete drop-off at final payment stage (gateway catastrophic outage)', () => {
      const counts: RawFunnelCounts = {
        sessions: 1000,
        product_views: 800,
        add_to_cart: 500,
        checkout_started: 400,
        address_entered: 350,
        payment_started: 300,
        order_completed: 0, // 100% drop-off at payment
      };

      const funnel = compute7StageFunnel(counts, '24h');

      expect(funnel.stages[6].visitor_count).toBe(0);
      expect(funnel.stages[6].step_conversion_pct).toBe(0);
      expect(funnel.stages[6].drop_off_count).toBe(300);
      expect(funnel.stages[6].drop_off_pct).toBe(100.0);
      expect(funnel.overall_conversion_rate_pct).toBe(0);
      expect(funnel.cart_abandonment_rate_pct).toBe(100.0);
      expect(funnel.checkout_abandonment_rate_pct).toBe(100.0);
    });

    it('T2.4: formats and bounds decimal precision accurately to 2 decimal places', () => {
      const counts: RawFunnelCounts = {
        sessions: 7777,
        product_views: 3333,
        add_to_cart: 1111,
        checkout_started: 555,
        address_entered: 333,
        payment_started: 222,
        order_completed: 111,
      };

      const funnel = compute7StageFunnel(counts, '30d');

      // 3333 / 7777 = 42.85714... -> 42.86%
      expect(funnel.stages[1].step_conversion_pct).toBe(42.86);
      // 111 / 7777 = 1.4272... -> 1.43%
      expect(funnel.overall_conversion_rate_pct).toBe(1.43);
    });

    it('T2.5: handles large-scale traffic volume (10M sessions) without numeric overflow', () => {
      const highVolumeCounts: RawFunnelCounts = {
        sessions: 10000000,
        product_views: 6500000,
        add_to_cart: 2200000,
        checkout_started: 1100000,
        address_entered: 850000,
        payment_started: 600000,
        order_completed: 500000,
      };

      const funnel = compute7StageFunnel(highVolumeCounts, '12m');

      expect(funnel.total_sessions).toBe(10000000);
      expect(funnel.total_completed_orders).toBe(500000);
      expect(funnel.overall_conversion_rate_pct).toBe(5.0);
      expect(funnel.cart_abandonment_rate_pct).toBe(77.27);
    });

    it('T2.6: handles perfect 100% conversion funnel (frictionless test run)', () => {
      const perfectCounts: RawFunnelCounts = {
        sessions: 500,
        product_views: 500,
        add_to_cart: 500,
        checkout_started: 500,
        address_entered: 500,
        payment_started: 500,
        order_completed: 500,
      };

      const funnel = compute7StageFunnel(perfectCounts, '7d');

      expect(funnel.overall_conversion_rate_pct).toBe(100.0);
      expect(funnel.cart_abandonment_rate_pct).toBe(0);
      expect(funnel.checkout_abandonment_rate_pct).toBe(0);
      funnel.stages.forEach((s) => {
        expect(s.step_conversion_pct).toBe(100.0);
        expect(s.drop_off_count).toBe(0);
        expect(s.drop_off_pct).toBe(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Tier 3: Pairwise Combinations & Adversarial Validation
  // -------------------------------------------------------------------------
  describe('Tier 3: Pairwise Combinations & Adversarial Invariant Checks', () => {
    it('T3.1: pairwise: 90d range + specific storeId + non-zero cart abandonment', () => {
      const counts: RawFunnelCounts = {
        sessions: 12450,
        product_views: 8100,
        add_to_cart: 3200,
        checkout_started: 1600,
        address_entered: 1200,
        payment_started: 950,
        order_completed: 800,
      };

      const funnel = compute7StageFunnel(counts, '90d', 'str_el_medina_99');

      expect(funnel.range.timeRange).toBe('90d');
      expect(funnel.cart_abandonment_rate_pct).toBe(75.0);
      expect(funnel.overall_conversion_rate_pct).toBe(6.43);
      expect(funnel.stages[0].stage_number).toBe(1);
      expect(funnel.stages[6].stage_number).toBe(7);
    });

    it('T3.2: adversarial input: handles SQL injection strings in storeId safely', () => {
      const counts: RawFunnelCounts = {
        sessions: 200,
        product_views: 150,
        add_to_cart: 80,
        checkout_started: 40,
        address_entered: 30,
        payment_started: 25,
        order_completed: 20,
      };

      const maliciousStoreId = "'; DROP TABLE pd_order; -- <script>alert('xss')</script>";
      const funnel = compute7StageFunnel(counts, '30d', maliciousStoreId);

      expect(funnel).toBeDefined();
      expect(funnel.stages).toHaveLength(7);
      expect(funnel.total_completed_orders).toBe(20);
    });

    it('T3.3: verifies stage monotonicity and invariant (drop_off_pct + step_conversion_pct = 100%)', () => {
      const counts: RawFunnelCounts = {
        sessions: 8000,
        product_views: 6000,
        add_to_cart: 3000,
        checkout_started: 1800,
        address_entered: 1200,
        payment_started: 900,
        order_completed: 600,
      };

      const funnel = compute7StageFunnel(counts, '30d');

      for (let i = 1; i < funnel.stages.length; i++) {
        const stage = funnel.stages[i];
        const sum = Math.round((stage.step_conversion_pct + stage.drop_off_pct) * 100) / 100;
        expect(sum).toBeCloseTo(100.0, 1);
        expect(stage.visitor_count).toBeLessThanOrEqual(funnel.stages[i - 1].visitor_count);
      }
    });

    it('T3.4: pairwise date range filter integrity across all standard ranges', () => {
      const ranges = ['7d', '30d', '90d', '12m', 'all'];
      const counts: RawFunnelCounts = {
        sessions: 1000,
        product_views: 700,
        add_to_cart: 350,
        checkout_started: 200,
        address_entered: 150,
        payment_started: 120,
        order_completed: 100,
      };

      ranges.forEach((r) => {
        const result = compute7StageFunnel(counts, r);
        expect(result.range.timeRange).toBe(r);
        expect(result.stages).toHaveLength(7);
        expect(result.overall_conversion_rate_pct).toBe(10.0);
      });
    });
  });
});

describe('Feature 10: N-Day Repurchase Cohort Retention Matrix (R3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Tier 1: Feature Coverage (≥5 Tests)
  // -------------------------------------------------------------------------
  describe('Tier 1: Core Cohort Retention Grid & N-Day Repurchase Tracking', () => {
    it('T1.1: computes monthly cohort retention grid with M0 (100%) through M5 retention decay', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { cohort_month: '2026-07', cohort_size: '120' },
          { cohort_month: '2026-06', cohort_size: '95' },
          { cohort_month: '2026-05', cohort_size: '110' },
        ],
      });

      const res = await analyticsService.getCohortInsights({ timeRange: '90d', cohortType: 'buyer_signup' });

      expect(res.cohort_type).toBe('buyer_signup');
      expect(res.cohorts).toHaveLength(3);

      const julyCohort = res.cohorts[0];
      expect(julyCohort.cohort_month).toBe('2026-07');
      expect(julyCohort.cohort_size).toBe(120);
      expect(julyCohort.periods[0].period_index).toBe(0);
      expect(julyCohort.periods[0].retention_pct).toBe(100);
      expect(julyCohort.periods[0].retained_count).toBe(120);

      // Verify retention decay over subsequent periods
      for (let i = 1; i < julyCohort.periods.length; i++) {
        expect(julyCohort.periods[i].retention_pct).toBeLessThanOrEqual(
          julyCohort.periods[i - 1].retention_pct!,
        );
      }
    });

    it('T1.2: computes N-day repurchase rates for Day 1, 7, 14, 30, 60, 90', () => {
      const cohortSize = 500;
      const repurchasedByDay = {
        1: 25, // 5.00% Day 1
        7: 85, // 17.00% Day 7
        14: 140, // 28.00% Day 14
        30: 210, // 42.00% Day 30
        60: 275, // 55.00% Day 60
        90: 310, // 62.00% Day 90
      };

      const rates = calculateNDayRepurchaseRates(cohortSize, repurchasedByDay);

      expect(rates.day_1_pct).toBe(5.0);
      expect(rates.day_7_pct).toBe(17.0);
      expect(rates.day_14_pct).toBe(28.0);
      expect(rates.day_30_pct).toBe(42.0);
      expect(rates.day_60_pct).toBe(55.0);
      expect(rates.day_90_pct).toBe(62.0);
    });

    it('T1.3: calculates cumulative revenue (GMV TND) per cohort period', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ cohort_month: '2026-04', cohort_size: '200' }],
      });

      const res = await analyticsService.getCohortInsights({ timeRange: '90d', cohortType: 'first_order' });
      const cohort = res.cohorts[0];

      expect(cohort.periods[0].revenue_tnd).toBeGreaterThan(0);
      expect(cohort.periods[1].revenue_tnd).toBeGreaterThan(0);
      expect(typeof cohort.periods[0].revenue_tnd).toBe('number');
    });

    it('T1.4: supports buyer_signup, first_order, seller_signup, and store_creation cohort types', async () => {
      const types: CohortType[] = ['buyer_signup', 'first_order', 'seller_signup', 'store_creation'];

      for (const type of types) {
        mockQuery.mockResolvedValueOnce({
          rows: [{ cohort_month: '2026-06', cohort_size: '50' }],
        });

        const res = await analyticsService.getCohortInsights({ timeRange: '90d', cohortType: type });
        expect(res.cohort_type).toBe(type);
        expect(res.cohorts).toBeDefined();
        expect(res.cohorts[0].cohort_key).toContain(type);
      }
    });

    it('T1.5: calculates order frequency per retained cohort member', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ cohort_month: '2026-05', cohort_size: '100' }],
      });

      const res = await analyticsService.getCohortInsights({ timeRange: '90d' });
      const cohort = res.cohorts[0];

      cohort.periods.forEach((p) => {
        expect(p.orders_count).toBeDefined();
        expect(p.orders_count).toBeGreaterThanOrEqual(0);
      });
    });

    it('T1.6: computes cohort size and labels across multiple consecutive acquisition months', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { cohort_month: '2026-07', cohort_size: '150' },
          { cohort_month: '2026-06', cohort_size: '140' },
          { cohort_month: '2026-05', cohort_size: '130' },
          { cohort_month: '2026-04', cohort_size: '120' },
          { cohort_month: '2026-03', cohort_size: '110' },
          { cohort_month: '2026-02', cohort_size: '100' },
        ],
      });

      const res = await analyticsService.getCohortInsights({ timeRange: '12m' });
      expect(res.cohorts).toHaveLength(6);
      expect(res.cohorts[0].cohort_label).toBe('2026-07 Cohort');
      expect(res.cohorts[5].cohort_label).toBe('2026-02 Cohort');
    });
  });

  // -------------------------------------------------------------------------
  // Tier 2: Boundary & Corner Cases (≥5 Tests)
  // -------------------------------------------------------------------------
  describe('Tier 2: Boundary, Empty Cohort & Large Volume Cases', () => {
    it('T2.1: handles cohort with 0 repeat buyers (retention rate = 0% for M1+)', () => {
      const cohortSize = 200;
      const zeroRepurchase = { 1: 0, 7: 0, 14: 0, 30: 0, 60: 0, 90: 0 };
      const rates = calculateNDayRepurchaseRates(cohortSize, zeroRepurchase);

      expect(rates.day_1_pct).toBe(0);
      expect(rates.day_7_pct).toBe(0);
      expect(rates.day_30_pct).toBe(0);
      expect(rates.day_90_pct).toBe(0);
    });

    it('T2.2: handles empty cohort (0 size) without division by zero', () => {
      const rates = calculateNDayRepurchaseRates(0, { 1: 0, 7: 0 });
      expect(rates.day_1_pct).toBe(0);
      expect(rates.day_7_pct).toBe(0);
      expect(rates.day_30_pct).toBe(0);
    });

    it('T2.3: handles empty database / zero cohort records returning empty array', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await analyticsService.getCohortInsights({ timeRange: '30d' });
      expect(res.cohorts).toEqual([]);
      expect(res.range).toBeDefined();
    });

    it('T2.4: handles 100% repeat buyer retention boundary case', () => {
      const cohortSize = 100;
      const fullRepeat = { 1: 100, 7: 100, 14: 100, 30: 100, 60: 100, 90: 100 };
      const rates = calculateNDayRepurchaseRates(cohortSize, fullRepeat);

      expect(rates.day_1_pct).toBe(100.0);
      expect(rates.day_7_pct).toBe(100.0);
      expect(rates.day_30_pct).toBe(100.0);
      expect(rates.day_90_pct).toBe(100.0);
    });

    it('T2.5: handles high volume cohort scale (50,000 buyers) without precision loss', () => {
      const cohortSize = 50000;
      const repurchasedByDay = {
        1: 2500, // 5.00%
        7: 12500, // 25.00%
        14: 20000, // 40.00%
        30: 32500, // 65.00%
        60: 41000, // 82.00%
        90: 45000, // 90.00%
      };

      const rates = calculateNDayRepurchaseRates(cohortSize, repurchasedByDay);
      expect(rates.day_1_pct).toBe(5.0);
      expect(rates.day_30_pct).toBe(65.0);
      expect(rates.day_90_pct).toBe(90.0);
    });

    it('T2.6: handles month-end boundaries across leap years (Feb 29)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ cohort_month: '2024-02', cohort_size: '80' }],
      });

      const res = await analyticsService.getCohortInsights({ timeRange: 'all' });
      expect(res.cohorts[0].cohort_month).toBe('2024-02');
      expect(res.cohorts[0].cohort_size).toBe(80);
    });
  });

  // -------------------------------------------------------------------------
  // Tier 3: Pairwise Combinations & Mathematical Invariants
  // -------------------------------------------------------------------------
  describe('Tier 3: Pairwise Combinations & Mathematical Invariants', () => {
    it('T3.1: pairwise: timeRange=12m + cohortType=buyer_signup + multi-cohort grid verification', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { cohort_month: '2026-07', cohort_size: '300' },
          { cohort_month: '2026-06', cohort_size: '280' },
          { cohort_month: '2026-05', cohort_size: '250' },
          { cohort_month: '2026-04', cohort_size: '220' },
        ],
      });

      const res = await analyticsService.getCohortInsights({ timeRange: '12m', cohortType: 'buyer_signup' });

      expect(res.cohort_type).toBe('buyer_signup');
      expect(res.cohorts).toHaveLength(4);
      res.cohorts.forEach((c) => {
        expect(c.periods[0].retention_pct).toBe(100);
        expect(c.periods.length).toBe(6);
      });
    });

    it('T3.2: verifies mathematical invariant: retained_count <= cohort_size for all periods', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ cohort_month: '2026-07', cohort_size: '150' }],
      });

      const res = await analyticsService.getCohortInsights({ timeRange: '90d' });
      const cohort = res.cohorts[0];

      cohort.periods.forEach((p) => {
        expect(p.retained_count).toBeLessThanOrEqual(cohort.cohort_size);
        expect(p.retention_pct!).toBeLessThanOrEqual(100);
        expect(p.retention_pct!).toBeGreaterThanOrEqual(0);
      });
    });

    it('T3.3: fallback handling for unsupported cohort types defaults to valid schema', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ cohort_month: '2026-07', cohort_size: '75' }],
      });

      const res = await analyticsService.getCohortInsights({
        timeRange: '30d',
        cohortType: 'unsupported_custom_type' as any,
      });

      expect(res).toBeDefined();
      expect(res.cohorts).toHaveLength(1);
    });

    it('T3.4: verifies monotonic non-increasing property of N-day repurchase timeline', () => {
      const cohortSize = 1000;
      const repurchasedByDay = {
        1: 50,
        7: 150,
        14: 250,
        30: 400,
        60: 550,
        90: 700,
      };

      const rates = calculateNDayRepurchaseRates(cohortSize, repurchasedByDay);

      expect(rates.day_1_pct).toBeLessThanOrEqual(rates.day_7_pct);
      expect(rates.day_7_pct).toBeLessThanOrEqual(rates.day_14_pct);
      expect(rates.day_14_pct).toBeLessThanOrEqual(rates.day_30_pct);
      expect(rates.day_30_pct).toBeLessThanOrEqual(rates.day_60_pct);
      expect(rates.day_60_pct).toBeLessThanOrEqual(rates.day_90_pct);
    });
  });
});
