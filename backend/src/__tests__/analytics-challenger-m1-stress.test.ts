/**
 * Adversarial Empirical Stress Test Suite for M1 Financial Engine
 * Challenger: challenger_m1_1
 * 
 * Features Under Stress:
 * 1. Tri-Fold Financial Reconciliation & Gross GMV Conservation (R2)
 * 2. SaaS MRR Waterfall Engine Edge Cases & Combinatorics (R2)
 * 3. Payment Gateway Matrix Latency & Conversion Calculations (R2)
 * 4. Multi-Currency Normalization Invariance (R2)
 */

import { describe, it, expect } from 'vitest';
import { PdValidationError } from '../errors';
import {
  computeTriFoldReconciliation,
  computeSaaSMRRWaterfall,
  computeGatewayReliabilityMatrix,
  normalizeAnnualPlanToMRR,
  normalizeCurrency,
  formatCurrencyByCode,
  PLATFORM_FX_RATES,
  PLATFORM_SAAS_PLANS,
  GATEWAY_FEE_SCHEDULE,
  type OrderReconciliationItem,
  type SubscriptionLifecycleEvent,
  type ActiveSubscriptionSnapshot,
  type PaymentAttemptRecord,
  type PaymentGatewayType,
  type PaymentFailureReason,
} from '../services/analytics-reconciliation.service';

describe('Adversarial Stress Testing: M1 Financial & SaaS Revenue Engine', () => {

  // ==========================================================================
  // 1. GROSS GMV & FINANCIAL RECONCILIATION CONSERVATION
  // ==========================================================================
  describe('1. Gross GMV Conservation & Financial Reconciliation Triad', () => {
    it('ST-1.1: GMV Conservation Invariant holds over 10,000 randomized floating-point orders', () => {
      const statuses: OrderReconciliationItem['status'][] = ['paid', 'delivered', 'refunded', 'cancelled'];
      const payoutStatuses: OrderReconciliationItem['payout_status'][] = ['pending_escrow', 'released', 'held'];

      // Seeded-like deterministic pseudo-random generator
      let seed = 42;
      function random() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      }

      const orders: OrderReconciliationItem[] = [];
      for (let i = 0; i < 10_000; i++) {
        const subtotal = Math.round((random() * 5000 + 0.1) * 1000) / 1000;
        const shipping = Math.round((random() * 30) * 1000) / 1000;
        const total = Math.round((subtotal + shipping) * 1000) / 1000;
        const commissionRate = Math.round(random() * 25 * 100) / 100; // 0% to 25%
        const status = statuses[Math.floor(random() * statuses.length)];
        
        let payoutStatus: OrderReconciliationItem['payout_status'];
        if (status === 'cancelled' || status === 'refunded') {
          payoutStatus = 'held';
        } else if (status === 'delivered') {
          payoutStatus = random() > 0.3 ? 'released' : 'pending_escrow';
        } else {
          payoutStatus = random() > 0.2 ? 'pending_escrow' : 'released';
        }

        orders.push({
          id: `ord_stress_${i}`,
          store_id: `str_${i % 150}`,
          subtotal_tnd: subtotal,
          shipping_tnd: shipping,
          total_tnd: total,
          commission_rate_pct: commissionRate,
          status,
          payout_status: payoutStatus,
        });
      }

      const subRevenue = 145_250.750;
      const adsRevenue = 32_100.500;

      const report = computeTriFoldReconciliation(orders, subRevenue, adsRevenue, PLATFORM_FX_RATES);

      // Invariant 1: Reconciliation balance check MUST be balanced
      expect(report.reconciliation_balance_check.balanced).toBe(true);
      expect(report.reconciliation_balance_check.discrepancy_tnd).toBeLessThan(0.001);

      // Invariant 2: Gross GMV = Marketplace Order GMV + Subscription Revenue + Ads Revenue
      const expectedGrossGmv = Math.round((report.marketplace_order_gmv.tnd + subRevenue + adsRevenue) * 1000) / 1000;
      expect(report.gross_gmv.tnd).toBe(expectedGrossGmv);

      // Invariant 3: Total Platform Net Revenue = Commission Take + Sub Revenue + Ads Revenue
      const expectedNetRevenue = Math.round((report.platform_net_commission_take.tnd + subRevenue + adsRevenue) * 1000) / 1000;
      expect(report.total_platform_net_revenue.tnd).toBe(expectedNetRevenue);

      // Invariant 4: Marketplace GMV = Settled Payouts + Escrow Balance + Commission Take + Refunds Deducted
      const componentsSum = Math.round((
        report.settled_vendor_payouts.tnd +
        report.escrow_floating_balance.tnd +
        report.platform_net_commission_take.tnd +
        report.refunds_deducted.tnd
      ) * 1000) / 1000;
      expect(Math.abs(report.marketplace_order_gmv.tnd - componentsSum)).toBeLessThan(0.001);
    });

    it('ST-1.2: Extreme fractional millimes (0.001 TND) and floating point cancellation stress test', () => {
      // 1000 micro orders of 0.003 TND with 33.33% commission
      const microOrders: OrderReconciliationItem[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `ord_micro_${i}`,
        store_id: 'str_micro',
        subtotal_tnd: 0.003,
        shipping_tnd: 0.000,
        total_tnd: 0.003,
        commission_rate_pct: 33.33,
        status: i % 2 === 0 ? 'paid' : 'delivered',
        payout_status: i % 2 === 0 ? 'pending_escrow' : 'released',
      }));

      const report = computeTriFoldReconciliation(microOrders, 0, 0);
      expect(report.reconciliation_balance_check.balanced).toBe(true);
      expect(report.reconciliation_balance_check.discrepancy_tnd).toBeLessThan(0.001);
      expect(report.marketplace_order_gmv.tnd).toBe(3.000);
    });

    it('ST-1.3: Whale transaction extreme values (up to 100,000,000.000 TND)', () => {
      const whaleOrders: OrderReconciliationItem[] = [
        {
          id: 'ord_whale_1',
          store_id: 'str_enterprise',
          subtotal_tnd: 50_000_000.000,
          shipping_tnd: 500.000,
          total_tnd: 50_000_500.000,
          commission_rate_pct: 2.5,
          status: 'paid',
          payout_status: 'pending_escrow',
        },
        {
          id: 'ord_whale_2',
          store_id: 'str_enterprise_2',
          subtotal_tnd: 50_000_000.000,
          shipping_tnd: 500.000,
          total_tnd: 50_000_500.000,
          commission_rate_pct: 2.5,
          status: 'delivered',
          payout_status: 'released',
        },
      ];

      const report = computeTriFoldReconciliation(whaleOrders, 1_000_000, 500_000);
      expect(report.reconciliation_balance_check.balanced).toBe(true);
      expect(report.gross_gmv.tnd).toBe(101_501_000.000);
      expect(report.marketplace_order_gmv.tnd).toBe(100_001_000.000);
      expect(report.reconciliation_balance_check.discrepancy_tnd).toBe(0);
    });

    it('ST-1.4: 100% boundary conditions for take rate (0% commission vs 100% commission)', () => {
      const zeroCommissionOrder: OrderReconciliationItem = {
        id: 'ord_0',
        store_id: 'str_0',
        subtotal_tnd: 1000,
        shipping_tnd: 50,
        total_tnd: 1050,
        commission_rate_pct: 0,
        status: 'paid',
        payout_status: 'pending_escrow',
      };
      const repZero = computeTriFoldReconciliation([zeroCommissionOrder], 0, 0);
      expect(repZero.platform_net_commission_take.tnd).toBe(0);
      expect(repZero.escrow_floating_balance.tnd).toBe(1050);
      expect(repZero.effective_take_rate_pct).toBe(0);
      expect(repZero.reconciliation_balance_check.balanced).toBe(true);

      const fullCommissionOrder: OrderReconciliationItem = {
        id: 'ord_100',
        store_id: 'str_100',
        subtotal_tnd: 1000,
        shipping_tnd: 0,
        total_tnd: 1000,
        commission_rate_pct: 100,
        status: 'paid',
        payout_status: 'pending_escrow',
      };
      const repFull = computeTriFoldReconciliation([fullCommissionOrder], 0, 0);
      expect(repFull.platform_net_commission_take.tnd).toBe(1000);
      expect(repFull.escrow_floating_balance.tnd).toBe(0);
      expect(repFull.effective_take_rate_pct).toBe(100);
      expect(repFull.reconciliation_balance_check.balanced).toBe(true);
    });
  });

  // ==========================================================================
  // 2. SAAS MRR WATERFALL ENGINE STRESS & EDGE CASES
  // ==========================================================================
  describe('2. SaaS MRR Waterfall Engine Edge Cases & Quick Ratio Boundary', () => {
    it('ST-2.1: Quick Ratio behavior under 0 churn and 0 contraction (capped at exactly 999.99)', () => {
      const growthEvents: SubscriptionLifecycleEvent[] = [
        { type: 'new_subscription', store_id: 's1', plan_id: 'pro', billing_cycle: 'monthly', mrr_tnd: 129 },
        { type: 'plan_expansion', store_id: 's2', previous_plan_id: 'starter', new_plan_id: 'platinum', mrr_delta_tnd: 270 },
      ];

      const waterfall = computeSaaSMRRWaterfall(10_000, growthEvents, []);
      expect(waterfall.new_mrr_tnd).toBe(129);
      expect(waterfall.expansion_mrr_tnd).toBe(270);
      expect(waterfall.contraction_mrr_tnd).toBe(0);
      expect(waterfall.churned_mrr_tnd).toBe(0);
      expect(waterfall.quick_ratio).toBe(999.99); // Must be strictly 999.99
    });

    it('ST-2.2: Quick Ratio behavior under 0 growth with churn & contraction (equals 0.00)', () => {
      const lossEvents: SubscriptionLifecycleEvent[] = [
        { type: 'churn_cancellation', store_id: 's1', plan_id: 'pro', churned_mrr_tnd: 129 },
        { type: 'plan_contraction', store_id: 's2', previous_plan_id: 'golden', new_plan_id: 'starter', mrr_delta_tnd: 170 },
      ];

      const waterfall = computeSaaSMRRWaterfall(10_000, lossEvents, []);
      expect(waterfall.new_mrr_tnd).toBe(0);
      expect(waterfall.expansion_mrr_tnd).toBe(0);
      expect(waterfall.quick_ratio).toBe(0);
      expect(waterfall.net_new_mrr_tnd).toBe(-299);
      expect(waterfall.ending_mrr_tnd).toBe(9701);
    });

    it('ST-2.3: Quick Ratio behavior with 0 growth and 0 churn (returns null)', () => {
      const waterfall = computeSaaSMRRWaterfall(5000, [], []);
      expect(waterfall.quick_ratio).toBeNull();
      expect(waterfall.net_new_mrr_tnd).toBe(0);
      expect(waterfall.mrr_growth_rate_pct).toBe(0);
    });

    it('ST-2.4: Combinatorial full-mesh migrations across all 7 subscription tiers', () => {
      const planKeys = ['free', 'starter', 'regular', 'agency', 'pro', 'golden', 'platinum'] as const;
      const events: SubscriptionLifecycleEvent[] = [];

      let expectedExpansion = 0;
      let expectedContraction = 0;

      for (let i = 0; i < planKeys.length; i++) {
        for (let j = 0; j < planKeys.length; j++) {
          if (i === j) continue;
          const fromPlan = planKeys[i];
          const toPlan = planKeys[j];
          const fromPrice = PLATFORM_SAAS_PLANS[fromPlan].monthly_price_tnd;
          const toPrice = PLATFORM_SAAS_PLANS[toPlan].monthly_price_tnd;
          const delta = toPrice - fromPrice;

          if (delta > 0) {
            events.push({
              type: 'plan_expansion',
              store_id: `str_${fromPlan}_to_${toPlan}`,
              previous_plan_id: fromPlan,
              new_plan_id: toPlan,
              mrr_delta_tnd: delta,
            });
            expectedExpansion += delta;
          } else {
            events.push({
              type: 'plan_contraction',
              store_id: `str_${fromPlan}_to_${toPlan}`,
              previous_plan_id: fromPlan,
              new_plan_id: toPlan,
              mrr_delta_tnd: Math.abs(delta),
            });
            expectedContraction += Math.abs(delta);
          }
        }
      }

      const waterfall = computeSaaSMRRWaterfall(50_000, events, []);
      expect(waterfall.expansion_mrr_tnd).toBe(Math.round(expectedExpansion * 1000) / 1000);
      expect(waterfall.contraction_mrr_tnd).toBe(Math.round(expectedContraction * 1000) / 1000);
      // Because full mesh is symmetric, expansion should equal contraction
      expect(waterfall.expansion_mrr_tnd).toBe(waterfall.contraction_mrr_tnd);
      expect(waterfall.net_new_mrr_tnd).toBe(0);
      expect(waterfall.ending_mrr_tnd).toBe(50_000);
    });

    it('ST-2.5: Annual-to-monthly proration accuracy and normalization validation', () => {
      // Test all plans annual prices
      for (const [key, plan] of Object.entries(PLATFORM_SAAS_PLANS)) {
        const mrr = normalizeAnnualPlanToMRR(plan.annual_price_tnd);
        const expected = Math.round((plan.annual_price_tnd / 12) * 1000) / 1000;
        expect(mrr).toBe(expected);
      }

      // Negative values must throw PdValidationError
      expect(() => normalizeAnnualPlanToMRR(-1)).toThrow(PdValidationError);
      expect(() => normalizeAnnualPlanToMRR(-9999.99)).toThrow(PdValidationError);
      expect(() => normalizeAnnualPlanToMRR(NaN)).toThrow(PdValidationError);
    });

    it('ST-2.6: Massive active subscription snapshot breakdown (1,000 stores)', () => {
      const active: ActiveSubscriptionSnapshot[] = [];
      const planKeys = ['starter', 'regular', 'agency', 'pro', 'golden', 'platinum'];

      for (let i = 0; i < 1000; i++) {
        const planId = planKeys[i % planKeys.length];
        const price = PLATFORM_SAAS_PLANS[planId].monthly_price_tnd;
        active.push({
          store_id: `store_${i}`,
          plan_id: planId,
          billing_cycle: i % 3 === 0 ? 'annual' : 'monthly',
          mrr_contribution_tnd: price,
        });
      }

      const totalExpectedMrr = active.reduce((s, a) => s + a.mrr_contribution_tnd, 0);
      const waterfall = computeSaaSMRRWaterfall(totalExpectedMrr, [], active);

      expect(waterfall.plan_breakdown).toHaveLength(6);
      const sumSharePct = waterfall.plan_breakdown.reduce((sum, p) => sum + p.share_pct, 0);
      expect(Math.round(sumSharePct)).toBe(100);

      const sumMrrContrib = waterfall.plan_breakdown.reduce((sum, p) => sum + p.mrr_contribution_tnd, 0);
      expect(Math.round(sumMrrContrib * 1000) / 1000).toBe(Math.round(totalExpectedMrr * 1000) / 1000);
    });
  });

  // ==========================================================================
  // 3. PAYMENT GATEWAYS RELIABILITY MATRIX & LATENCY CALCULATIONS
  // ==========================================================================
  describe('3. Payment Gateway Reliability Matrix & Latency Stress', () => {
    it('ST-3.1: 50,000 randomized payment attempts latency, fee, and success rate stress test', () => {
      const gateways: PaymentGatewayType[] = ['flouci', 'konnect', 'manual_mandat', 'stripe', 'paypal', 'cod'];
      const reasons: PaymentFailureReason[] = [
        'card_declined',
        'insufficient_funds',
        'gateway_timeout',
        '3ds_failed',
        'session_expired',
        'user_cancelled',
        'cod_refused_at_door',
        'invalid_credentials',
        'mandat_rejected',
      ];

      let seed = 12345;
      function random() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      }

      const attempts: PaymentAttemptRecord[] = [];
      const expectedGwStats = new Map<PaymentGatewayType, { attempts: number; captured: number; volume: number; latencyMs: number }>();
      for (const g of gateways) {
        expectedGwStats.set(g, { attempts: 0, captured: 0, volume: 0, latencyMs: 0 });
      }

      for (let i = 0; i < 50_000; i++) {
        const gw = gateways[Math.floor(random() * gateways.length)];
        const amount = Math.round((random() * 500 + 5) * 1000) / 1000;
        const latency = Math.floor(random() * 8000); // 0 to 8000 ms
        const isSuccess = random() > 0.25; // 75% success
        const isPending = !isSuccess && random() > 0.8;
        const status = isSuccess ? 'captured' : isPending ? 'pending' : 'failed';
        const reason = status === 'failed' ? reasons[Math.floor(random() * reasons.length)] : null;

        const stat = expectedGwStats.get(gw)!;
        stat.attempts += 1;
        stat.latencyMs += latency;
        if (status === 'captured') {
          stat.captured += 1;
          stat.volume += amount;
        }

        attempts.push({
          id: `att_${i}`,
          order_id: `ord_${i}`,
          gateway: gw,
          amount_tnd: amount,
          status,
          failure_reason: reason,
          latency_ms: latency,
          created_at: '2026-08-14T10:00:00Z',
        });
      }

      const matrix = computeGatewayReliabilityMatrix(attempts);

      expect(matrix.total_attempts_all_gateways).toBe(50_000);
      expect(matrix.gateways).toHaveLength(6);

      for (const gwItem of matrix.gateways) {
        const exp = expectedGwStats.get(gwItem.gateway)!;
        expect(gwItem.total_attempts).toBe(exp.attempts);
        expect(gwItem.successful_captures).toBe(exp.captured);
        expect(Math.abs(gwItem.total_volume_tnd - exp.volume)).toBeLessThan(0.05);

        const expSuccessRate = Math.round((exp.captured / exp.attempts) * 10000) / 100;
        expect(gwItem.success_rate_pct).toBe(expSuccessRate);

        const expLatencySec = Math.round((exp.latencyMs / exp.attempts / 1000) * 100) / 100;
        expect(gwItem.avg_latency_seconds).toBe(expLatencySec);

        // Verify fee calculation against fee schedule
        const feeConf = GATEWAY_FEE_SCHEDULE[gwItem.gateway];
        const expectedFee = Math.round((gwItem.total_volume_tnd * feeConf.percentage_rate + gwItem.successful_captures * feeConf.fixed_fee_tnd) * 1000) / 1000;
        expect(gwItem.estimated_gateway_fees_tnd).toBe(expectedFee);
      }
    });

    it('ST-3.2: High latency edge case (e.g. timeout / asynchronous settlement up to 300 seconds)', () => {
      const attempts: PaymentAttemptRecord[] = [
        {
          id: 'att_timeout_1',
          order_id: 'ord_1',
          gateway: 'konnect',
          amount_tnd: 100,
          status: 'failed',
          failure_reason: 'gateway_timeout',
          latency_ms: 180_000, // 3 minutes = 180.0s
          created_at: '2026-08-14T10:00:00Z',
        },
        {
          id: 'att_timeout_2',
          order_id: 'ord_2',
          gateway: 'konnect',
          amount_tnd: 100,
          status: 'captured',
          latency_ms: 120_000, // 2 minutes = 120.0s
          created_at: '2026-08-14T10:00:00Z',
        },
      ];

      const matrix = computeGatewayReliabilityMatrix(attempts);
      const konnect = matrix.gateways.find((g) => g.gateway === 'konnect')!;
      // (180 + 120) / 2 = 150.00s
      expect(konnect.avg_latency_seconds).toBe(150.0);
      expect(konnect.success_rate_pct).toBe(50.0);
    });

    it('ST-3.3: Strict validation against invalid gateway keys and corrupted amount payloads', () => {
      expect(() => computeGatewayReliabilityMatrix([
        { id: '1', order_id: 'o', gateway: 'crypto_usdt' as any, amount_tnd: 100, status: 'captured', latency_ms: 100, created_at: '' },
      ])).toThrow(PdValidationError);

      expect(() => computeGatewayReliabilityMatrix([
        { id: '1', order_id: 'o', gateway: 'flouci', amount_tnd: -0.001, status: 'captured', latency_ms: 100, created_at: '' },
      ])).toThrow(PdValidationError);

      expect(() => computeGatewayReliabilityMatrix([
        { id: '1', order_id: 'o', gateway: 'flouci', amount_tnd: NaN, status: 'captured', latency_ms: 100, created_at: '' },
      ])).toThrow(PdValidationError);
    });
  });

  // ==========================================================================
  // 4. MULTI-CURRENCY NORMALIZATION INVARIANCE
  // ==========================================================================
  describe('4. Multi-Currency Normalization Invariance & Decimal Integrity', () => {
    it('ST-4.1: Multi-Currency normalization across 1,000 varying price points', () => {
      for (let i = 1; i <= 1000; i++) {
        const val = i * 3.350; // Exact multiples of EUR rate
        const norm = normalizeCurrency(val);
        expect(norm.tnd).toBe(Math.round(val * 1000) / 1000);
        expect(norm.eur).toBe(Math.round(i * 100) / 100);
        expect(norm.usd).toBe(Math.round((norm.tnd / PLATFORM_FX_RATES.USD_TO_TND) * 100) / 100);
        expect(norm.formatted_tnd).toContain('TND');
        expect(norm.formatted_eur).toContain('€');
        expect(norm.formatted_usd).toContain('$');
      }
    });

    it('ST-4.2: formatCurrencyByCode fallback behavior and case insensitivity', () => {
      expect(formatCurrencyByCode(100, 'tnd').currency).toBe('TND');
      expect(formatCurrencyByCode(100, 'eur').currency).toBe('EUR');
      expect(formatCurrencyByCode(100, 'usd').currency).toBe('USD');
      expect(formatCurrencyByCode(100, 'GBP' as any).currency).toBe('TND'); // fallback
      expect(formatCurrencyByCode(100, '' as any).currency).toBe('TND');
    });
  });
});
