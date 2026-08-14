/**
 * Challenger 2 Adversarial Stress Test Suite — Milestone 1 (R2 Core Financials)
 * 
 * Stress-testing:
 * 1. Tri-Fold Financial Reconciliation & Precision Invariants (0 orders, 10,000 synthetic micro-orders, mixed 0%-25% commission rates, multi-currency drift < 0.001 TND).
 * 2. SaaS MRR Waterfall (100% churn to 0, massive upgrades, 0 beginning MRR, negative delta handling, Quick Ratio zero denominator).
 * 3. Payment Gateway Matrix (100% failure rate, 0 attempts, mixed fee tiers for all 6 gateways).
 */

import { describe, it, expect } from 'vitest';
import {
  computeTriFoldReconciliation,
  computeSaaSMRRWaterfall,
  computeGatewayReliabilityMatrix,
  normalizeCurrency,
  formatCurrencyByCode,
  normalizeAnnualPlanToMRR,
  PLATFORM_FX_RATES,
  PLATFORM_SAAS_PLANS,
  GATEWAY_FEE_SCHEDULE,
  type OrderReconciliationItem,
  type SubscriptionLifecycleEvent,
  type ActiveSubscriptionSnapshot,
  type PaymentAttemptRecord,
  type PaymentGatewayType,
} from '../services/analytics-reconciliation.service';
import { PdValidationError } from '../errors';

describe('Adversarial Stress Test: Milestone 1 Financial Algorithms', () => {

  // ==========================================================================
  // 1. TRI-FOLD FINANCIAL RECONCILIATION STRESS TESTS
  // ==========================================================================
  describe('1. Tri-Fold Financial Reconciliation & Precision Invariants', () => {
    
    it('ST-1.1: 0 orders boundary condition (pure zero state)', () => {
      const result = computeTriFoldReconciliation([], 0, 0);

      expect(result.gross_gmv.tnd).toBe(0);
      expect(result.marketplace_order_gmv.tnd).toBe(0);
      expect(result.subscription_revenue.tnd).toBe(0);
      expect(result.ads_revenue.tnd).toBe(0);
      expect(result.platform_net_commission_take.tnd).toBe(0);
      expect(result.total_platform_net_revenue.tnd).toBe(0);
      expect(result.escrow_floating_balance.tnd).toBe(0);
      expect(result.pending_vendor_payouts.tnd).toBe(0);
      expect(result.settled_vendor_payouts.tnd).toBe(0);
      expect(result.refunds_deducted.tnd).toBe(0);
      expect(result.effective_take_rate_pct).toBe(0);
      expect(result.reconciliation_balance_check.balanced).toBe(true);
      expect(result.reconciliation_balance_check.discrepancy_tnd).toBe(0);
      expect(result.reconciliation_balance_check.calculated_sum_tnd).toBe(0);
    });

    it('ST-1.2: 0 orders with positive SaaS and Ads revenue (non-marketplace gross revenue)', () => {
      const result = computeTriFoldReconciliation([], 15000.500, 3250.250);

      expect(result.marketplace_order_gmv.tnd).toBe(0);
      expect(result.subscription_revenue.tnd).toBe(15000.500);
      expect(result.ads_revenue.tnd).toBe(3250.250);
      expect(result.gross_gmv.tnd).toBe(18250.750);
      expect(result.total_platform_net_revenue.tnd).toBe(18250.750);
      expect(result.platform_net_commission_take.tnd).toBe(0);
      expect(result.effective_take_rate_pct).toBe(0);
      expect(result.reconciliation_balance_check.balanced).toBe(true);
      expect(result.reconciliation_balance_check.discrepancy_tnd).toBe(0);
    });

    it('ST-1.3: 10,000 synthetic micro-orders with mixed commission rates (0% to 25%) and fractional millimes', () => {
      const commissionRates = [0, 0.5, 3.5, 5.0, 8.0, 10.0, 12.5, 15.0, 20.0, 25.0];
      const payoutStatuses: Array<'pending_escrow' | 'released' | 'held'> = ['pending_escrow', 'released', 'held'];
      const statuses: Array<'paid' | 'delivered' | 'refunded' | 'cancelled'> = ['paid', 'delivered', 'refunded', 'cancelled'];

      let expectedMarketplaceGmv = 0;
      let expectedCommission = 0;
      let expectedEscrow = 0;
      let expectedSettled = 0;
      let expectedRefunds = 0;

      const microOrders: OrderReconciliationItem[] = Array.from({ length: 10000 }, (_, i) => {
        // Deterministic pseudo-random generation
        const subtotal = Math.round(((i * 7.123 + 0.333) % 150 + 0.005) * 1000) / 1000;
        const shipping = Math.round(((i * 3.456) % 12 + 0.001) * 1000) / 1000;
        const total = Math.round((subtotal + shipping) * 1000) / 1000;
        const commRate = commissionRates[i % commissionRates.length];
        const status = statuses[i % statuses.length];
        const payoutStatus = (status === 'refunded' || status === 'cancelled')
          ? 'held'
          : payoutStatuses[i % 2]; // either pending_escrow or released

        // Calculate expected mathematical accumulators
        if (status !== 'cancelled') {
          if (status === 'refunded') {
            expectedRefunds += total;
            expectedMarketplaceGmv += total;
          } else {
            expectedMarketplaceGmv += total;
            const comm = (subtotal * commRate) / 100;
            const vendorShare = total - comm;
            expectedCommission += comm;
            if (payoutStatus === 'pending_escrow') {
              expectedEscrow += vendorShare;
            } else if (payoutStatus === 'released') {
              expectedSettled += vendorShare;
            }
          }
        }

        return {
          id: `ord_stress_${i}`,
          store_id: `str_${i % 100}`,
          subtotal_tnd: subtotal,
          shipping_tnd: shipping,
          total_tnd: total,
          commission_rate_pct: commRate,
          status,
          payout_status: payoutStatus,
        };
      });

      const report = computeTriFoldReconciliation(microOrders, 25000, 5000);

      // Invariant 1: Reconciliation balance check MUST be true
      expect(report.reconciliation_balance_check.balanced).toBe(true);

      // Invariant 2: Discrepancy between gross marketplace GMV and sum of parts must be < 0.001 TND
      expect(report.reconciliation_balance_check.discrepancy_tnd).toBeLessThan(0.001);

      // Invariant 3: Tri-fold equation: Marketplace GMV == Settled + Escrow + Commission + Refunds
      const sumOfParts = report.settled_vendor_payouts.tnd +
                         report.escrow_floating_balance.tnd +
                         report.platform_net_commission_take.tnd +
                         report.refunds_deducted.tnd;
      expect(Math.abs(report.marketplace_order_gmv.tnd - sumOfParts)).toBeLessThan(0.001);

      // Invariant 4: Gross GMV == Marketplace GMV + Subscription Revenue + Ads Revenue
      const expectedGross = report.marketplace_order_gmv.tnd + 25000 + 5000;
      expect(Math.abs(report.gross_gmv.tnd - expectedGross)).toBeLessThan(0.001);

      // Invariant 5: Effective take rate percentage is valid (between 0% and 25%)
      expect(report.effective_take_rate_pct).toBeGreaterThan(0);
      expect(report.effective_take_rate_pct).toBeLessThanOrEqual(25);
    });

    it('ST-1.4: 100% refunded order stream stress test', () => {
      const refundedOrders: OrderReconciliationItem[] = Array.from({ length: 500 }, (_, i) => ({
        id: `ord_ref_${i}`,
        store_id: `str_${i % 10}`,
        subtotal_tnd: 100 + i,
        shipping_tnd: 10,
        total_tnd: 110 + i,
        commission_rate_pct: 10,
        status: 'refunded',
        payout_status: 'held',
      }));

      const report = computeTriFoldReconciliation(refundedOrders, 0, 0);

      expect(report.platform_net_commission_take.tnd).toBe(0);
      expect(report.escrow_floating_balance.tnd).toBe(0);
      expect(report.pending_vendor_payouts.tnd).toBe(0);
      expect(report.settled_vendor_payouts.tnd).toBe(0);
      expect(report.refunds_deducted.tnd).toBe(report.marketplace_order_gmv.tnd);
      expect(report.reconciliation_balance_check.balanced).toBe(true);
      expect(report.reconciliation_balance_check.discrepancy_tnd).toBe(0);
    });

    it('ST-1.5: 100% cancelled order stream stress test', () => {
      const cancelledOrders: OrderReconciliationItem[] = Array.from({ length: 500 }, (_, i) => ({
        id: `ord_can_${i}`,
        store_id: `str_${i % 10}`,
        subtotal_tnd: 100 + i,
        shipping_tnd: 10,
        total_tnd: 110 + i,
        commission_rate_pct: 10,
        status: 'cancelled',
        payout_status: 'held',
      }));

      const report = computeTriFoldReconciliation(cancelledOrders, 500, 100);

      expect(report.marketplace_order_gmv.tnd).toBe(0);
      expect(report.platform_net_commission_take.tnd).toBe(0);
      expect(report.escrow_floating_balance.tnd).toBe(0);
      expect(report.settled_vendor_payouts.tnd).toBe(0);
      expect(report.refunds_deducted.tnd).toBe(0);
      expect(report.gross_gmv.tnd).toBe(600); // Only SaaS + Ads
      expect(report.reconciliation_balance_check.balanced).toBe(true);
    });
  });

  // ==========================================================================
  // 2. MULTI-CURRENCY NORMALIZATION PRECISION DRIFT TESTS
  // ==========================================================================
  describe('2. Multi-Currency Normalization Precision Drift Check (< 0.001 TND across TND, EUR, USD)', () => {

    it('ST-2.1: precision drift check across 10,000 random monetary values in TND, EUR, USD', () => {
      for (let i = 0; i < 10000; i++) {
        const rawTnd = (i * 1.3456789 + 0.0001) % 50000;
        const norm = normalizeCurrency(rawTnd);

        // Check TND has exactly 3 decimal places
        const tndDecimals = (norm.tnd.toString().split('.')[1] || '').length;
        expect(tndDecimals).toBeLessThanOrEqual(3);

        // Check EUR has at most 2 decimal places
        const eurDecimals = (norm.eur.toString().split('.')[1] || '').length;
        expect(eurDecimals).toBeLessThanOrEqual(2);

        // Check USD has at most 2 decimal places
        const usdDecimals = (norm.usd.toString().split('.')[1] || '').length;
        expect(usdDecimals).toBeLessThanOrEqual(2);

        // Invariant: TND amount in norm must match Math.round(rawTnd * 1000)/1000
        expect(norm.tnd).toBe(Math.round(rawTnd * 1000) / 1000);

        // Invariant: EUR must be Math.round((norm.tnd / 3.350) * 100) / 100
        expect(norm.eur).toBe(Math.round((norm.tnd / PLATFORM_FX_RATES.EUR_TO_TND) * 100) / 100);

        // Invariant: USD must be Math.round((norm.tnd / 3.100) * 100) / 100
        expect(norm.usd).toBe(Math.round((norm.tnd / PLATFORM_FX_RATES.USD_TO_TND) * 100) / 100);
      }
    });

    it('ST-2.2: sub-millime precision rounding boundary cases', () => {
      // 0.0004 TND rounds down to 0.000 TND
      const down = normalizeCurrency(0.0004);
      expect(down.tnd).toBe(0.000);
      expect(down.formatted_tnd).toBe('0.000 TND');

      // 0.0006 TND rounds up to 0.001 TND
      const up = normalizeCurrency(0.0006);
      expect(up.tnd).toBe(0.001);
      expect(up.formatted_tnd).toBe('0.001 TND');

      // Exact 1 millime
      const oneMillime = normalizeCurrency(0.001);
      expect(oneMillime.tnd).toBe(0.001);
      expect(oneMillime.formatted_tnd).toBe('0.001 TND');
    });

    it('ST-2.3: multi-currency formatting helper formatCurrencyByCode', () => {
      const tndRes = formatCurrencyByCode(3350, 'TND');
      expect(tndRes.amount).toBe(3350);
      expect(tndRes.formatted).toBe('3,350.000 TND');

      const eurRes = formatCurrencyByCode(3350, 'EUR');
      expect(eurRes.amount).toBe(1000);
      expect(eurRes.formatted).toBe('€1,000.00');

      const usdRes = formatCurrencyByCode(3100, 'USD');
      expect(usdRes.amount).toBe(1000);
      expect(usdRes.formatted).toBe('$1,000.00');
    });

    it('ST-2.4: negative and non-finite validation guards', () => {
      expect(() => normalizeCurrency(NaN)).toThrow();
      expect(() => normalizeCurrency(Infinity)).toThrow();
      expect(() => normalizeCurrency(-Infinity)).toThrow();

      // Negative values should format properly
      const neg = normalizeCurrency(-3350);
      expect(neg.tnd).toBe(-3350);
      expect(neg.eur).toBe(-1000);
      expect(neg.usd).toBe(-1080.65);
    });
  });

  // ==========================================================================
  // 3. SAAS MRR WATERFALL EDGE CASES
  // ==========================================================================
  describe('3. SaaS MRR Waterfall Edge Cases & Mathematical Stability', () => {

    it('ST-3.1: all plans churned to 0 (100% churn catastrophe)', () => {
      const beginningMrr = 100_000.000;
      const churnEvents: SubscriptionLifecycleEvent[] = [
        { type: 'churn_cancellation', store_id: 's1', plan_id: 'platinum', churned_mrr_tnd: 50_000 },
        { type: 'churn_cancellation', store_id: 's2', plan_id: 'golden', churned_mrr_tnd: 30_000 },
        { type: 'churn_cancellation', store_id: 's3', plan_id: 'pro', churned_mrr_tnd: 20_000 },
      ];

      const waterfall = computeSaaSMRRWaterfall(beginningMrr, churnEvents, []);

      expect(waterfall.beginning_mrr_tnd).toBe(100_000);
      expect(waterfall.new_mrr_tnd).toBe(0);
      expect(waterfall.expansion_mrr_tnd).toBe(0);
      expect(waterfall.contraction_mrr_tnd).toBe(0);
      expect(waterfall.churned_mrr_tnd).toBe(100_000);
      expect(waterfall.net_new_mrr_tnd).toBe(-100_000);
      expect(waterfall.ending_mrr_tnd).toBe(0);
      expect(waterfall.ending_arr_tnd).toBe(0);
      expect(waterfall.quick_ratio).toBe(0.0);
      expect(waterfall.mrr_growth_rate_pct).toBe(-100.0);
      expect(waterfall.plan_breakdown).toEqual([]);
    });

    it('ST-3.2: massive simultaneous upgrades (10,000 stores upgrading from Starter to Platinum)', () => {
      const beginningMrr = 290_000.000; // 10,000 * 29 TND
      const upgradeDelta = 299.000 - 29.000; // 270 TND delta each

      const events: SubscriptionLifecycleEvent[] = Array.from({ length: 10000 }, (_, i) => ({
        type: 'plan_expansion',
        store_id: `store_${i}`,
        previous_plan_id: 'starter',
        new_plan_id: 'platinum',
        mrr_delta_tnd: upgradeDelta,
      }));

      const activeEnding: ActiveSubscriptionSnapshot[] = Array.from({ length: 10000 }, (_, i) => ({
        store_id: `store_${i}`,
        plan_id: 'platinum',
        billing_cycle: 'monthly',
        mrr_contribution_tnd: 299.000,
      }));

      const waterfall = computeSaaSMRRWaterfall(beginningMrr, events, activeEnding);

      expect(waterfall.beginning_mrr_tnd).toBe(290_000);
      expect(waterfall.new_mrr_tnd).toBe(0);
      expect(waterfall.expansion_mrr_tnd).toBe(2_700_000); // 10,000 * 270
      expect(waterfall.contraction_mrr_tnd).toBe(0);
      expect(waterfall.churned_mrr_tnd).toBe(0);
      expect(waterfall.net_new_mrr_tnd).toBe(2_700_000);
      expect(waterfall.ending_mrr_tnd).toBe(2_990_000);
      expect(waterfall.ending_arr_tnd).toBe(2_990_000 * 12);
      expect(waterfall.quick_ratio).toBe(999.99); // Zero churn denominator sentinel
      expect(waterfall.mrr_growth_rate_pct).toBe(931.03); // +931.03%

      expect(waterfall.plan_breakdown).toHaveLength(1);
      expect(waterfall.plan_breakdown[0].plan_id).toBe('platinum');
      expect(waterfall.plan_breakdown[0].subscribers_count).toBe(10000);
      expect(waterfall.plan_breakdown[0].mrr_contribution_tnd).toBe(2_990_000);
      expect(waterfall.plan_breakdown[0].share_pct).toBe(100.0);
    });

    it('ST-3.3: zero beginning MRR (Day 1 platform launch)', () => {
      const events: SubscriptionLifecycleEvent[] = [
        { type: 'new_subscription', store_id: 's1', plan_id: 'pro', billing_cycle: 'monthly', mrr_tnd: 129.000 },
        { type: 'new_subscription', store_id: 's2', plan_id: 'starter', billing_cycle: 'monthly', mrr_tnd: 29.000 },
      ];

      const waterfall = computeSaaSMRRWaterfall(0, events, []);

      expect(waterfall.beginning_mrr_tnd).toBe(0);
      expect(waterfall.new_mrr_tnd).toBe(158);
      expect(waterfall.ending_mrr_tnd).toBe(158);
      expect(waterfall.net_new_mrr_tnd).toBe(158);
      expect(waterfall.quick_ratio).toBe(999.99);
      expect(waterfall.mrr_growth_rate_pct).toBe(100.0); // Handled explicitly as 100%
    });

    it('ST-3.4: negative delta input handling (defensive Math.abs)', () => {
      const events: SubscriptionLifecycleEvent[] = [
        // Even if negative deltas are passed accidentally, Math.abs protects the equation
        { type: 'plan_expansion', store_id: 's1', previous_plan_id: 'starter', new_plan_id: 'pro', mrr_delta_tnd: -100 },
        { type: 'plan_contraction', store_id: 's2', previous_plan_id: 'pro', new_plan_id: 'starter', mrr_delta_tnd: -50 },
        { type: 'churn_cancellation', store_id: 's3', plan_id: 'regular', churned_mrr_tnd: -59 },
      ];

      const waterfall = computeSaaSMRRWaterfall(1000, events, []);

      expect(waterfall.expansion_mrr_tnd).toBe(100);
      expect(waterfall.contraction_mrr_tnd).toBe(50);
      expect(waterfall.churned_mrr_tnd).toBe(59);
      expect(waterfall.net_new_mrr_tnd).toBe(-9); // 100 - (50 + 59)
      expect(waterfall.ending_mrr_tnd).toBe(991);
    });

    it('ST-3.5: Quick Ratio zero denominator behavior matrix', () => {
      // Case 1: Pure growth (Growth > 0, Churn = 0) -> 999.99 sentinel
      const pureGrowth = computeSaaSMRRWaterfall(1000, [{ type: 'new_subscription', store_id: 's', plan_id: 'pro', billing_cycle: 'monthly', mrr_tnd: 129 }], []);
      expect(pureGrowth.quick_ratio).toBe(999.99);

      // Case 2: Zero change (Growth = 0, Churn = 0) -> null
      const zeroChange = computeSaaSMRRWaterfall(1000, [], []);
      expect(zeroChange.quick_ratio).toBeNull();

      // Case 3: Pure churn (Growth = 0, Churn > 0) -> 0.00
      const pureChurn = computeSaaSMRRWaterfall(1000, [{ type: 'churn_cancellation', store_id: 's', plan_id: 'starter', churned_mrr_tnd: 29 }], []);
      expect(pureChurn.quick_ratio).toBe(0.00);

      // Case 4: Equal growth and churn -> 1.00
      const equalGrowthChurn = computeSaaSMRRWaterfall(1000, [
        { type: 'new_subscription', store_id: 's1', plan_id: 'pro', billing_cycle: 'monthly', mrr_tnd: 100 },
        { type: 'churn_cancellation', store_id: 's2', plan_id: 'pro', churned_mrr_tnd: 100 },
      ], []);
      expect(equalGrowthChurn.quick_ratio).toBe(1.00);
    });
  });

  // ==========================================================================
  // 4. PAYMENT GATEWAY MATRIX EDGE CASES
  // ==========================================================================
  describe('4. Payment Gateway Matrix Edge Cases & Fee Calculations', () => {

    it('ST-4.1: 0 payment attempts across all gateways (zero state)', () => {
      const matrix = computeGatewayReliabilityMatrix([]);

      expect(matrix.total_attempts_all_gateways).toBe(0);
      expect(matrix.total_successful_all_gateways).toBe(0);
      expect(matrix.overall_success_rate_pct).toBe(0);
      expect(matrix.total_volume_all_gateways_tnd).toBe(0);
      expect(matrix.total_estimated_fees_tnd).toBe(0);
      expect(matrix.gateways).toHaveLength(6);

      for (const g of matrix.gateways) {
        expect(g.total_attempts).toBe(0);
        expect(g.successful_captures).toBe(0);
        expect(g.failed_attempts).toBe(0);
        expect(g.pending_attempts).toBe(0);
        expect(g.success_rate_pct).toBe(0);
        expect(g.total_volume_tnd).toBe(0);
        expect(g.avg_latency_seconds).toBe(0);
        expect(g.estimated_gateway_fees_tnd).toBe(0);
        expect(g.error_breakdown).toEqual({});
      }
    });

    it('ST-4.2: 100% failure rate across all 6 gateways', () => {
      const gateways: PaymentGatewayType[] = ['flouci', 'konnect', 'manual_mandat', 'stripe', 'paypal', 'cod'];
      const failedAttempts: PaymentAttemptRecord[] = gateways.map((g, i) => ({
        id: `att_fail_${i}`,
        order_id: `ord_${i}`,
        gateway: g,
        amount_tnd: 100.000,
        status: 'failed',
        failure_reason: 'card_declined',
        latency_ms: 1500,
        created_at: '2026-08-14T12:00:00Z',
      }));

      const matrix = computeGatewayReliabilityMatrix(failedAttempts);

      expect(matrix.total_attempts_all_gateways).toBe(6);
      expect(matrix.total_successful_all_gateways).toBe(0);
      expect(matrix.overall_success_rate_pct).toBe(0);
      expect(matrix.total_volume_all_gateways_tnd).toBe(0);
      expect(matrix.total_estimated_fees_tnd).toBe(0);

      for (const g of matrix.gateways) {
        expect(g.total_attempts).toBe(1);
        expect(g.successful_captures).toBe(0);
        expect(g.failed_attempts).toBe(1);
        expect(g.success_rate_pct).toBe(0);
        expect(g.total_volume_tnd).toBe(0);
        expect(g.estimated_gateway_fees_tnd).toBe(0);
        expect(g.error_breakdown['card_declined']).toBe(1);
      }
    });

    it('ST-4.3: mixed fee tiers verification for all 6 gateways', () => {
      // Gateway fee schedules:
      // flouci: 1.5% (0 fixed) -> on 10,000 TND captured = 150.000 TND
      // konnect: 2.5% + 0.300 TND fixed -> on 10,000 TND (10 captures) = 250.000 + 3.000 = 253.000 TND
      // stripe: 2.9% + 0.300 TND fixed -> on 10,000 TND (10 captures) = 290.000 + 3.000 = 293.000 TND
      // paypal: 3.4% + 0.350 TND fixed -> on 10,000 TND (10 captures) = 340.000 + 3.500 = 343.500 TND
      // manual_mandat: 0% + 0 fixed -> 0 TND
      // cod: 0% + 0 fixed -> 0 TND

      const gateways: PaymentGatewayType[] = ['flouci', 'konnect', 'manual_mandat', 'stripe', 'paypal', 'cod'];
      const attempts: PaymentAttemptRecord[] = [];

      for (const gw of gateways) {
        for (let i = 0; i < 10; i++) {
          attempts.push({
            id: `att_${gw}_${i}`,
            order_id: `ord_${gw}_${i}`,
            gateway: gw,
            amount_tnd: 1000.000,
            status: 'captured',
            latency_ms: 1000,
            created_at: '2026-08-14T12:00:00Z',
          });
        }
      }

      const matrix = computeGatewayReliabilityMatrix(attempts);

      const flouci = matrix.gateways.find((g) => g.gateway === 'flouci')!;
      const konnect = matrix.gateways.find((g) => g.gateway === 'konnect')!;
      const stripe = matrix.gateways.find((g) => g.gateway === 'stripe')!;
      const paypal = matrix.gateways.find((g) => g.gateway === 'paypal')!;
      const mandat = matrix.gateways.find((g) => g.gateway === 'manual_mandat')!;
      const cod = matrix.gateways.find((g) => g.gateway === 'cod')!;

      expect(flouci.estimated_gateway_fees_tnd).toBe(150.000);
      expect(konnect.estimated_gateway_fees_tnd).toBe(253.000);
      expect(stripe.estimated_gateway_fees_tnd).toBe(293.000);
      expect(paypal.estimated_gateway_fees_tnd).toBe(343.500);
      expect(mandat.estimated_gateway_fees_tnd).toBe(0.000);
      expect(cod.estimated_gateway_fees_tnd).toBe(0.000);

      const expectedTotalFees = 150 + 253 + 293 + 343.5 + 0 + 0; // = 1039.500 TND
      expect(matrix.total_estimated_fees_tnd).toBe(expectedTotalFees);
      expect(matrix.total_volume_all_gateways_tnd).toBe(60_000.000);
      expect(matrix.overall_success_rate_pct).toBe(100.0);
    });

    it('ST-4.4: handles extreme latency and latency spikes (5 minutes timeout)', () => {
      const attempts: PaymentAttemptRecord[] = [
        {
          id: 'att_slow_1',
          order_id: 'ord_slow_1',
          gateway: 'flouci',
          amount_tnd: 100,
          status: 'captured',
          latency_ms: 300_000, // 300 seconds
          created_at: '2026-08-14T12:00:00Z',
        },
        {
          id: 'att_slow_2',
          order_id: 'ord_slow_2',
          gateway: 'flouci',
          amount_tnd: 100,
          status: 'captured',
          latency_ms: 0, // 0 seconds
          created_at: '2026-08-14T12:00:00Z',
        },
      ];

      const matrix = computeGatewayReliabilityMatrix(attempts);
      const flouci = matrix.gateways.find((g) => g.gateway === 'flouci')!;
      expect(flouci.avg_latency_seconds).toBe(150.0); // (300 + 0) / 2 = 150s
    });

    it('ST-4.5: rejects invalid input data with PdValidationError', () => {
      expect(() => computeGatewayReliabilityMatrix([
        {
          id: 'invalid_gw',
          order_id: 'o',
          gateway: 'crypto' as any,
          amount_tnd: 100,
          status: 'captured',
          latency_ms: 100,
          created_at: '2026-08-14T12:00:00Z',
        },
      ])).toThrow(PdValidationError);

      expect(() => computeGatewayReliabilityMatrix([
        {
          id: 'negative_amt',
          order_id: 'o',
          gateway: 'flouci',
          amount_tnd: -100,
          status: 'captured',
          latency_ms: 100,
          created_at: '2026-08-14T12:00:00Z',
        },
      ])).toThrow(PdValidationError);
    });
  });
});
