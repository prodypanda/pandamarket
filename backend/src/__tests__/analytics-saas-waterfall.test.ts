/**
 * Analytics SaaS MRR Waterfall Test Suite — Package 1
 * Features Covered:
 *   - Feature 5: SaaS MRR Waterfall Engine (R2)
 *     - Beginning MRR, New MRR, Expansion MRR, Contraction MRR, Churn MRR, Net New MRR
 *     - Ending MRR & Ending ARR
 *     - SaaS Quick Ratio: (New + Expansion) / (Contraction + Churn)
 *     - Plan Distribution breakdown and Subscriber Counts
 *     - Annual vs Monthly Normalization & Prorations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PdValidationError } from '../errors';

// SaaS Plan Definitions and Pricing in TND
export interface SubscriptionPlanConfig {
  plan_id: 'free' | 'starter' | 'regular' | 'agency' | 'pro' | 'golden' | 'platinum';
  name: string;
  monthly_price_tnd: number;
  annual_price_tnd: number; // Discounted annual rate
}

export const PLATFORM_SAAS_PLANS: Record<string, SubscriptionPlanConfig> = {
  free: { plan_id: 'free', name: 'Free Tier', monthly_price_tnd: 0, annual_price_tnd: 0 },
  starter: { plan_id: 'starter', name: 'Starter', monthly_price_tnd: 29.000, annual_price_tnd: 290.000 },
  regular: { plan_id: 'regular', name: 'Regular', monthly_price_tnd: 59.000, annual_price_tnd: 590.000 },
  agency: { plan_id: 'agency', name: 'Agency', monthly_price_tnd: 89.000, annual_price_tnd: 890.000 },
  pro: { plan_id: 'pro', name: 'Pro Merchant', monthly_price_tnd: 129.000, annual_price_tnd: 1290.000 },
  golden: { plan_id: 'golden', name: 'Golden Tier', monthly_price_tnd: 199.000, annual_price_tnd: 1990.000 },
  platinum: { plan_id: 'platinum', name: 'Platinum Enterprise', monthly_price_tnd: 299.000, annual_price_tnd: 2990.000 },
};

export type SubscriptionLifecycleEvent =
  | { type: 'new_subscription'; store_id: string; plan_id: string; billing_cycle: 'monthly' | 'annual'; mrr_tnd: number }
  | { type: 'plan_expansion'; store_id: string; previous_plan_id: string; new_plan_id: string; mrr_delta_tnd: number }
  | { type: 'plan_contraction'; store_id: string; previous_plan_id: string; new_plan_id: string; mrr_delta_tnd: number }
  | { type: 'churn_cancellation'; store_id: string; plan_id: string; churned_mrr_tnd: number }
  | { type: 'reactivation'; store_id: string; plan_id: string; mrr_tnd: number };

export interface ActiveSubscriptionSnapshot {
  store_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'annual';
  mrr_contribution_tnd: number;
}

export interface SaaSMasterWaterfallDTO {
  beginning_mrr_tnd: number;
  new_mrr_tnd: number;
  expansion_mrr_tnd: number;
  contraction_mrr_tnd: number;
  churned_mrr_tnd: number;
  net_new_mrr_tnd: number;
  ending_mrr_tnd: number;
  ending_arr_tnd: number;
  quick_ratio: number | null;
  mrr_growth_rate_pct: number | null;
  plan_breakdown: Array<{
    plan_id: string;
    subscribers_count: number;
    mrr_contribution_tnd: number;
    share_pct: number;
  }>;
}

export function computeSaaSMRRWaterfall(
  beginningMrrTnd: number,
  events: SubscriptionLifecycleEvent[],
  activeSubscriptionsEnding: ActiveSubscriptionSnapshot[]
): SaaSMasterWaterfallDTO {
  if (beginningMrrTnd < 0 || isNaN(beginningMrrTnd)) {
    throw new PdValidationError('Invalid beginning MRR amount');
  }

  let newMrr = 0;
  let expansionMrr = 0;
  let contractionMrr = 0;
  let churnedMrr = 0;

  for (const ev of events) {
    switch (ev.type) {
      case 'new_subscription':
      case 'reactivation':
        newMrr += ev.mrr_tnd;
        break;
      case 'plan_expansion':
        expansionMrr += Math.abs(ev.mrr_delta_tnd);
        break;
      case 'plan_contraction':
        contractionMrr += Math.abs(ev.mrr_delta_tnd);
        break;
      case 'churn_cancellation':
        churnedMrr += Math.abs(ev.churned_mrr_tnd);
        break;
    }
  }

  // Net New MRR = (New + Expansion) - (Contraction + Churn)
  const netNewMrr = newMrr + expansionMrr - contractionMrr - churnedMrr;
  const endingMrr = beginningMrrTnd + netNewMrr;
  const endingArr = endingMrr * 12;

  // Quick Ratio = (New MRR + Expansion MRR) / (Contraction MRR + Churn MRR)
  const churnContractionSum = contractionMrr + churnedMrr;
  const newExpansionSum = newMrr + expansionMrr;
  const quickRatio =
    churnContractionSum > 0
      ? Math.round((newExpansionSum / churnContractionSum) * 100) / 100
      : newExpansionSum > 0
        ? 999.99 // Signifies infinite / pure growth
        : null;

  // MRR Growth Rate PoP %
  const mrrGrowthRatePct =
    beginningMrrTnd > 0
      ? Math.round((netNewMrr / beginningMrrTnd) * 10000) / 100
      : beginningMrrTnd === 0 && endingMrr > 0
        ? 100.0
        : 0;

  // Plan Breakdown Aggregations
  const planMap = new Map<string, { subscribers: number; totalMrr: number }>();
  let totalActiveEndingMrr = 0;

  for (const sub of activeSubscriptionsEnding) {
    const entry = planMap.get(sub.plan_id) || { subscribers: 0, totalMrr: 0 };
    entry.subscribers += 1;
    entry.totalMrr += sub.mrr_contribution_tnd;
    planMap.set(sub.plan_id, entry);
    totalActiveEndingMrr += sub.mrr_contribution_tnd;
  }

  const planBreakdown = Array.from(planMap.entries()).map(([plan_id, data]) => {
    const sharePct =
      totalActiveEndingMrr > 0
        ? Math.round((data.totalMrr / totalActiveEndingMrr) * 10000) / 100
        : 0;
    return {
      plan_id,
      subscribers_count: data.subscribers,
      mrr_contribution_tnd: Math.round(data.totalMrr * 1000) / 1000,
      share_pct: sharePct,
    };
  });

  return {
    beginning_mrr_tnd: Math.round(beginningMrrTnd * 1000) / 1000,
    new_mrr_tnd: Math.round(newMrr * 1000) / 1000,
    expansion_mrr_tnd: Math.round(expansionMrr * 1000) / 1000,
    contraction_mrr_tnd: Math.round(contractionMrr * 1000) / 1000,
    churned_mrr_tnd: Math.round(churnedMrr * 1000) / 1000,
    net_new_mrr_tnd: Math.round(netNewMrr * 1000) / 1000,
    ending_mrr_tnd: Math.round(endingMrr * 1000) / 1000,
    ending_arr_tnd: Math.round(endingArr * 1000) / 1000,
    quick_ratio: quickRatio,
    mrr_growth_rate_pct: mrrGrowthRatePct,
    plan_breakdown: planBreakdown,
  };
}

export function normalizeAnnualPlanToMRR(annualPriceTnd: number): number {
  if (annualPriceTnd < 0 || isNaN(annualPriceTnd)) {
    throw new PdValidationError('Invalid annual plan price');
  }
  return Math.round((annualPriceTnd / 12) * 1000) / 1000;
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Feature 5: SaaS MRR Waterfall Engine (R2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Tier 1: Happy Path & Core Calculations (≥ 5 tests)
  // ==========================================================================
  describe('Tier 1: Core Waterfall Mechanics & Happy Path', () => {
    it('T1.1: calculates standard MRR waterfall components (Beginning + New + Expansion - Contraction - Churn = Ending)', () => {
      const beginningMrr = 10_000.000;
      const events: SubscriptionLifecycleEvent[] = [
        { type: 'new_subscription', store_id: 'str_1', plan_id: 'starter', billing_cycle: 'monthly', mrr_tnd: 1000.000 },
        { type: 'plan_expansion', store_id: 'str_2', previous_plan_id: 'starter', new_plan_id: 'pro', mrr_delta_tnd: 500.000 },
        { type: 'plan_contraction', store_id: 'str_3', previous_plan_id: 'golden', new_plan_id: 'regular', mrr_delta_tnd: 200.000 },
        { type: 'churn_cancellation', store_id: 'str_4', plan_id: 'starter', churned_mrr_tnd: 300.000 },
      ];

      const activeEnding: ActiveSubscriptionSnapshot[] = [
        { store_id: 'str_1', plan_id: 'starter', billing_cycle: 'monthly', mrr_contribution_tnd: 1000 },
        { store_id: 'str_2', plan_id: 'pro', billing_cycle: 'monthly', mrr_contribution_tnd: 10000 },
      ];

      const waterfall = computeSaaSMRRWaterfall(beginningMrr, events, activeEnding);

      expect(waterfall.beginning_mrr_tnd).toBe(10_000);
      expect(waterfall.new_mrr_tnd).toBe(1000);
      expect(waterfall.expansion_mrr_tnd).toBe(500);
      expect(waterfall.contraction_mrr_tnd).toBe(200);
      expect(waterfall.churned_mrr_tnd).toBe(300);
      // Net New = 1000 + 500 - 200 - 300 = +1000
      expect(waterfall.net_new_mrr_tnd).toBe(1000);
      expect(waterfall.ending_mrr_tnd).toBe(11_000);
      expect(waterfall.ending_arr_tnd).toBe(132_000); // 11,000 * 12
    });

    it('T1.2: calculates SaaS Quick Ratio accurately: (New + Expansion) / (Contraction + Churn)', () => {
      const events: SubscriptionLifecycleEvent[] = [
        { type: 'new_subscription', store_id: 's1', plan_id: 'pro', billing_cycle: 'monthly', mrr_tnd: 600 },
        { type: 'plan_expansion', store_id: 's2', previous_plan_id: 'starter', new_plan_id: 'pro', mrr_delta_tnd: 400 },
        { type: 'plan_contraction', store_id: 's3', previous_plan_id: 'pro', new_plan_id: 'starter', mrr_delta_tnd: 100 },
        { type: 'churn_cancellation', store_id: 's4', plan_id: 'regular', churned_mrr_tnd: 150 },
      ]; // Growth = 1000, Lost = 250 -> Quick Ratio = 1000 / 250 = 4.00

      const waterfall = computeSaaSMRRWaterfall(5000, events, []);
      expect(waterfall.quick_ratio).toBe(4.0);
    });

    it('T1.3: computes PoP MRR growth percentage correctly', () => {
      const events: SubscriptionLifecycleEvent[] = [
        { type: 'new_subscription', store_id: 's1', plan_id: 'pro', billing_cycle: 'monthly', mrr_tnd: 2500 },
      ];

      const waterfall = computeSaaSMRRWaterfall(10_000, events, []);
      // Net New: 2500 / 10000 = 25.00%
      expect(waterfall.mrr_growth_rate_pct).toBe(25.0);
    });

    it('T1.4: normalizes annual plan prices into monthly MRR equivalents (e.g. 1290 TND/year -> 107.500 TND/mo)', () => {
      const mrrStarter = normalizeAnnualPlanToMRR(PLATFORM_SAAS_PLANS.starter.annual_price_tnd); // 290 / 12 = 24.167
      expect(mrrStarter).toBe(24.167);

      const mrrPro = normalizeAnnualPlanToMRR(PLATFORM_SAAS_PLANS.pro.annual_price_tnd); // 1290 / 12 = 107.5
      expect(mrrPro).toBe(107.5);

      const mrrPlatinum = normalizeAnnualPlanToMRR(PLATFORM_SAAS_PLANS.platinum.annual_price_tnd); // 2990 / 12 = 249.167
      expect(mrrPlatinum).toBe(249.167);
    });

    it('T1.5: aggregates subscription plan breakdown with subscriber count, total MRR, and share %', () => {
      const activeEnding: ActiveSubscriptionSnapshot[] = [
        { store_id: 's1', plan_id: 'starter', billing_cycle: 'monthly', mrr_contribution_tnd: 29.000 },
        { store_id: 's2', plan_id: 'starter', billing_cycle: 'monthly', mrr_contribution_tnd: 29.000 },
        { store_id: 's3', plan_id: 'pro', billing_cycle: 'monthly', mrr_contribution_tnd: 129.000 },
      ]; // Total = 187.000 TND. Starter: 58 (31.02%), Pro: 129 (68.98%)

      const waterfall = computeSaaSMRRWaterfall(187, [], activeEnding);
      expect(waterfall.plan_breakdown).toHaveLength(2);

      const starterEntry = waterfall.plan_breakdown.find((p) => p.plan_id === 'starter')!;
      expect(starterEntry.subscribers_count).toBe(2);
      expect(starterEntry.mrr_contribution_tnd).toBe(58);
      expect(starterEntry.share_pct).toBe(31.02);

      const proEntry = waterfall.plan_breakdown.find((p) => p.plan_id === 'pro')!;
      expect(proEntry.subscribers_count).toBe(1);
      expect(proEntry.mrr_contribution_tnd).toBe(129);
      expect(proEntry.share_pct).toBe(68.98);
    });

    it('T1.6: treats customer reactivations as New MRR additions', () => {
      const events: SubscriptionLifecycleEvent[] = [
        { type: 'reactivation', store_id: 'str_reactivated', plan_id: 'pro', mrr_tnd: 129.000 },
      ];

      const waterfall = computeSaaSMRRWaterfall(1000, events, []);
      expect(waterfall.new_mrr_tnd).toBe(129);
      expect(waterfall.net_new_mrr_tnd).toBe(129);
      expect(waterfall.ending_mrr_tnd).toBe(1129);
    });
  });

  // ==========================================================================
  // Tier 2: Boundary & Edge Cases (≥ 5 tests)
  // ==========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2.1: handles zero churn and zero contraction period (Quick Ratio returns pure growth sentinel 999.99)', () => {
      const events: SubscriptionLifecycleEvent[] = [
        { type: 'new_subscription', store_id: 's1', plan_id: 'pro', billing_cycle: 'monthly', mrr_tnd: 500 },
      ];

      const waterfall = computeSaaSMRRWaterfall(5000, events, []);
      expect(waterfall.churned_mrr_tnd).toBe(0);
      expect(waterfall.contraction_mrr_tnd).toBe(0);
      expect(waterfall.quick_ratio).toBe(999.99); // Infinite ratio capped
    });

    it('T2.2: handles zero growth period with churn only (Net New MRR is negative, Quick Ratio is 0.00)', () => {
      const events: SubscriptionLifecycleEvent[] = [
        { type: 'churn_cancellation', store_id: 's1', plan_id: 'pro', churned_mrr_tnd: 300 },
        { type: 'plan_contraction', store_id: 's2', previous_plan_id: 'pro', new_plan_id: 'starter', mrr_delta_tnd: 100 },
      ];

      const waterfall = computeSaaSMRRWaterfall(5000, events, []);
      expect(waterfall.new_mrr_tnd).toBe(0);
      expect(waterfall.expansion_mrr_tnd).toBe(0);
      expect(waterfall.net_new_mrr_tnd).toBe(-400);
      expect(waterfall.ending_mrr_tnd).toBe(4600);
      expect(waterfall.quick_ratio).toBe(0);
      expect(waterfall.mrr_growth_rate_pct).toBe(-8.0); // -400 / 5000 = -8%
    });

    it('T2.3: handles complete total churn scenario (100% loss of MRR)', () => {
      const beginningMrr = 3000;
      const events: SubscriptionLifecycleEvent[] = [
        { type: 'churn_cancellation', store_id: 's1', plan_id: 'platinum', churned_mrr_tnd: 3000 },
      ];

      const waterfall = computeSaaSMRRWaterfall(beginningMrr, events, []);
      expect(waterfall.ending_mrr_tnd).toBe(0);
      expect(waterfall.ending_arr_tnd).toBe(0);
      expect(waterfall.mrr_growth_rate_pct).toBe(-100.0);
    });

    it('T2.4: handles Day 1 brand new platform (Beginning MRR = 0 TND)', () => {
      const events: SubscriptionLifecycleEvent[] = [
        { type: 'new_subscription', store_id: 's1', plan_id: 'regular', billing_cycle: 'monthly', mrr_tnd: 59 },
      ];

      const waterfall = computeSaaSMRRWaterfall(0, events, []);
      expect(waterfall.beginning_mrr_tnd).toBe(0);
      expect(waterfall.new_mrr_tnd).toBe(59);
      expect(waterfall.ending_mrr_tnd).toBe(59);
      expect(waterfall.mrr_growth_rate_pct).toBe(100.0);
    });

    it('T2.5: throws PdValidationError when beginning MRR is negative or invalid', () => {
      expect(() => computeSaaSMRRWaterfall(-500, [], [])).toThrow(PdValidationError);
      expect(() => computeSaaSMRRWaterfall(NaN, [], [])).toThrow(PdValidationError);
      expect(() => normalizeAnnualPlanToMRR(-100)).toThrow(PdValidationError);
    });

    it('T2.6: handles zero events period (stationary MRR)', () => {
      const waterfall = computeSaaSMRRWaterfall(4500, [], []);
      expect(waterfall.beginning_mrr_tnd).toBe(4500);
      expect(waterfall.ending_mrr_tnd).toBe(4500);
      expect(waterfall.net_new_mrr_tnd).toBe(0);
      expect(waterfall.quick_ratio).toBeNull();
      expect(waterfall.mrr_growth_rate_pct).toBe(0);
    });
  });

  // ==========================================================================
  // Tier 3: Combinatorial & Complex Multi-Plan Transitions
  // ==========================================================================
  describe('Tier 3: Multi-Plan Migration Scenarios & Proration Combinations', () => {
    it('T3.1: complex multi-tier migrations across Free, Starter, Pro, Golden, and Platinum', () => {
      const beginning = 25_000.000;
      const events: SubscriptionLifecycleEvent[] = [
        // 5 new Pro signups @ 129 TND = 645 TND
        { type: 'new_subscription', store_id: 'n1', plan_id: 'pro', billing_cycle: 'monthly', mrr_tnd: 129 },
        { type: 'new_subscription', store_id: 'n2', plan_id: 'pro', billing_cycle: 'monthly', mrr_tnd: 129 },
        { type: 'new_subscription', store_id: 'n3', plan_id: 'pro', billing_cycle: 'monthly', mrr_tnd: 129 },
        { type: 'new_subscription', store_id: 'n4', plan_id: 'pro', billing_cycle: 'monthly', mrr_tnd: 129 },
        { type: 'new_subscription', store_id: 'n5', plan_id: 'pro', billing_cycle: 'monthly', mrr_tnd: 129 },
        // 2 Upgrades from Starter (29) to Platinum (299) -> Delta: 270 TND each = 540 TND
        { type: 'plan_expansion', store_id: 'u1', previous_plan_id: 'starter', new_plan_id: 'platinum', mrr_delta_tnd: 270 },
        { type: 'plan_expansion', store_id: 'u2', previous_plan_id: 'starter', new_plan_id: 'platinum', mrr_delta_tnd: 270 },
        // 1 Downgrade from Platinum (299) to Starter (29) -> Delta: 270 TND
        { type: 'plan_contraction', store_id: 'd1', previous_plan_id: 'platinum', new_plan_id: 'starter', mrr_delta_tnd: 270 },
        // 2 Cancellations (Pro @ 129 and Regular @ 59) -> 188 TND
        { type: 'churn_cancellation', store_id: 'c1', plan_id: 'pro', churned_mrr_tnd: 129 },
        { type: 'churn_cancellation', store_id: 'c2', plan_id: 'regular', churned_mrr_tnd: 59 },
      ];

      const waterfall = computeSaaSMRRWaterfall(beginning, events, []);

      expect(waterfall.new_mrr_tnd).toBe(645);
      expect(waterfall.expansion_mrr_tnd).toBe(540);
      expect(waterfall.contraction_mrr_tnd).toBe(270);
      expect(waterfall.churned_mrr_tnd).toBe(188);

      // Growth = 645 + 540 = 1185. Loss = 270 + 188 = 458.
      // Net New = 1185 - 458 = 727.
      expect(waterfall.net_new_mrr_tnd).toBe(727);
      expect(waterfall.ending_mrr_tnd).toBe(25_727);
      expect(waterfall.ending_arr_tnd).toBe(308_724);

      // Quick Ratio = 1185 / 458 = 2.587... -> 2.59
      expect(waterfall.quick_ratio).toBe(2.59);
    });

    it('T3.2: mixed billing cycles (annual vs monthly subscriptions) properly normalized in waterfall', () => {
      // Annual starter = 290/12 = 24.167 MRR
      // Monthly pro = 129 MRR
      const events: SubscriptionLifecycleEvent[] = [
        {
          type: 'new_subscription',
          store_id: 'str_annual',
          plan_id: 'starter',
          billing_cycle: 'annual',
          mrr_tnd: normalizeAnnualPlanToMRR(290),
        },
        {
          type: 'new_subscription',
          store_id: 'str_monthly',
          plan_id: 'pro',
          billing_cycle: 'monthly',
          mrr_tnd: 129.000,
        },
      ];

      const waterfall = computeSaaSMRRWaterfall(1000, events, []);
      expect(waterfall.new_mrr_tnd).toBe(153.167); // 24.167 + 129
      expect(waterfall.ending_mrr_tnd).toBe(1153.167);
      expect(waterfall.ending_arr_tnd).toBe(13838.004);
    });
  });
});
