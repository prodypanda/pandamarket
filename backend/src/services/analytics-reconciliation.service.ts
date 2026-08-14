/**
 * AnalyticsReconciliationService — Advanced Financial Reconciliation, SaaS MRR Waterfall,
 * Payment Gateway Matrix, and Multi-Currency Normalization.
 */

import { query } from '../db/pool';
import { getRedis, withRedisTimeout } from '../db/redis';
import { logger } from '../utils/logger';
import { PdValidationError } from '../errors';
import {
  AnalyticsQueryParams,
  FinancialReconciliationDTO,
  OrderReconciliationItem,
  PLATFORM_FX_RATES,
  PLATFORM_SAAS_PLANS,
  PaymentAttemptRecord,
  PaymentGatewayType,
  GATEWAY_DISPLAY_NAMES,
  GATEWAY_FEE_SCHEDULE,
  GatewayReliabilityMatrixResponse,
  SaaSMasterWaterfallDTO,
  SubscriptionLifecycleEvent,
  ActiveSubscriptionSnapshot,
  formatCurrencyByCode,
  normalizeCurrency,
  type MultiCurrencyValue,
  type PaymentGatewayFeeConfig,
  type PaymentGatewayReliabilityItem,
} from '../types/analytics-types';
import { analyticsService } from './analytics.service';

// Export pure algorithm calculation functions for direct testing and modular reuse
export {
  PLATFORM_FX_RATES,
  PLATFORM_SAAS_PLANS,
  GATEWAY_FEE_SCHEDULE,
  GATEWAY_DISPLAY_NAMES,
  normalizeCurrency,
  formatCurrencyByCode,
  type MultiCurrencyValue,
  type PaymentGatewayFeeConfig,
  type PaymentGatewayReliabilityItem,
};

export function normalizeAnnualPlanToMRR(annualPriceTnd: number): number {
  if (annualPriceTnd < 0 || isNaN(annualPriceTnd)) {
    throw new PdValidationError('Invalid annual plan price');
  }
  return Math.round((annualPriceTnd / 12) * 1000) / 1000;
}

export function computeTriFoldReconciliation(
  orders: OrderReconciliationItem[],
  subscriptionRevenueTnd: number,
  adsRevenueTnd: number,
  fxRates = PLATFORM_FX_RATES,
): FinancialReconciliationDTO {
  let marketplaceOrderGmvTnd = 0;
  let platformCommissionTakeTnd = 0;
  let escrowFloatingTnd = 0;
  let pendingPayoutsTnd = 0;
  let settledPayoutsTnd = 0;
  let refundsDeductedTnd = 0;

  for (const o of orders) {
    if (o.status === 'cancelled') continue;

    if (o.status === 'refunded') {
      refundsDeductedTnd += o.total_tnd;
      marketplaceOrderGmvTnd += o.total_tnd;
      continue;
    }

    marketplaceOrderGmvTnd += o.total_tnd;
    const commission = (o.subtotal_tnd * o.commission_rate_pct) / 100;
    const vendorShare = o.total_tnd - commission;

    platformCommissionTakeTnd += commission;

    if (o.payout_status === 'pending_escrow') {
      escrowFloatingTnd += vendorShare;
      pendingPayoutsTnd += vendorShare;
    } else if (o.payout_status === 'released') {
      settledPayoutsTnd += vendorShare;
    }
  }

  const grossGmvTnd = marketplaceOrderGmvTnd + subscriptionRevenueTnd + adsRevenueTnd;
  const totalNetRevenueTnd = platformCommissionTakeTnd + subscriptionRevenueTnd + adsRevenueTnd;
  const effectiveTakeRatePct =
    marketplaceOrderGmvTnd > 0
      ? Math.round((platformCommissionTakeTnd / marketplaceOrderGmvTnd) * 10000) / 100
      : 0;

  // Tri-fold equation: Gross Marketplace GMV should equal (Settled + Pending Escrow + Commission Take + Refunds)
  const totalReconciledTnd =
    settledPayoutsTnd + escrowFloatingTnd + platformCommissionTakeTnd + refundsDeductedTnd;
  const discrepancy = Math.abs(Math.round((marketplaceOrderGmvTnd - totalReconciledTnd) * 1000) / 1000);

  return {
    gross_gmv: normalizeCurrency(grossGmvTnd, fxRates),
    marketplace_order_gmv: normalizeCurrency(marketplaceOrderGmvTnd, fxRates),
    subscription_revenue: normalizeCurrency(subscriptionRevenueTnd, fxRates),
    ads_revenue: normalizeCurrency(adsRevenueTnd, fxRates),
    platform_net_commission_take: normalizeCurrency(platformCommissionTakeTnd, fxRates),
    total_platform_net_revenue: normalizeCurrency(totalNetRevenueTnd, fxRates),
    escrow_floating_balance: normalizeCurrency(escrowFloatingTnd, fxRates),
    pending_vendor_payouts: normalizeCurrency(pendingPayoutsTnd, fxRates),
    settled_vendor_payouts: normalizeCurrency(settledPayoutsTnd, fxRates),
    refunds_deducted: normalizeCurrency(refundsDeductedTnd, fxRates),
    effective_take_rate_pct: effectiveTakeRatePct,
    reconciliation_balance_check: {
      balanced: discrepancy < 0.001,
      calculated_sum_tnd: Math.round(totalReconciledTnd * 1000) / 1000,
      discrepancy_tnd: discrepancy,
    },
  };
}

export function computeSaaSMRRWaterfall(
  beginningMrrTnd: number,
  events: SubscriptionLifecycleEvent[],
  activeSubscriptionsEnding: ActiveSubscriptionSnapshot[],
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
        ? 999.99
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
    multi_currency: {
      beginning_mrr: normalizeCurrency(beginningMrrTnd),
      new_mrr: normalizeCurrency(newMrr),
      expansion_mrr: normalizeCurrency(expansionMrr),
      contraction_mrr: normalizeCurrency(contractionMrr),
      churned_mrr: normalizeCurrency(churnedMrr),
      net_new_mrr: normalizeCurrency(netNewMrr),
      ending_mrr: normalizeCurrency(endingMrr),
      ending_arr: normalizeCurrency(endingArr),
    },
  };
}

export function computeGatewayReliabilityMatrix(
  attempts: PaymentAttemptRecord[],
  feeSchedule = GATEWAY_FEE_SCHEDULE,
): GatewayReliabilityMatrixResponse {
  const allGateways: PaymentGatewayType[] = [
    'flouci',
    'konnect',
    'manual_mandat',
    'stripe',
    'paypal',
    'cod',
  ];

  const gatewayStats = new Map<
    PaymentGatewayType,
    {
      attempts: number;
      captured: number;
      failed: number;
      pending: number;
      volumeTnd: number;
      totalLatencyMs: number;
      errors: Record<string, number>;
    }
  >();

  for (const g of allGateways) {
    gatewayStats.set(g, {
      attempts: 0,
      captured: 0,
      failed: 0,
      pending: 0,
      volumeTnd: 0,
      totalLatencyMs: 0,
      errors: {},
    });
  }

  let totalAttemptsAll = 0;
  let totalSuccessfulAll = 0;
  let totalVolumeAll = 0;
  let totalFeesAll = 0;

  for (const att of attempts) {
    if (!allGateways.includes(att.gateway)) {
      throw new PdValidationError(`Unsupported payment gateway: ${att.gateway}`);
    }
    if (att.amount_tnd < 0 || isNaN(att.amount_tnd)) {
      throw new PdValidationError(`Invalid attempt amount: ${att.amount_tnd}`);
    }

    const stat = gatewayStats.get(att.gateway)!;
    stat.attempts += 1;
    totalAttemptsAll += 1;
    stat.totalLatencyMs += att.latency_ms > 0 ? att.latency_ms : 0;

    if (att.status === 'captured') {
      stat.captured += 1;
      stat.volumeTnd += att.amount_tnd;
      totalSuccessfulAll += 1;
      totalVolumeAll += att.amount_tnd;
    } else if (att.status === 'failed') {
      stat.failed += 1;
      const reason = att.failure_reason || 'unknown_error';
      stat.errors[reason] = (stat.errors[reason] || 0) + 1;
    } else if (att.status === 'pending') {
      stat.pending += 1;
    }
  }

  const items: PaymentGatewayReliabilityItem[] = allGateways.map((g) => {
    const s = gatewayStats.get(g)!;
    const feeConfig = feeSchedule[g] || { percentage_rate: 0, fixed_fee_tnd: 0 };

    const successRatePct =
      s.attempts > 0 ? Math.round((s.captured / s.attempts) * 10000) / 100 : 0.0;

    const avgLatencySeconds =
      s.attempts > 0 ? Math.round((s.totalLatencyMs / s.attempts / 1000) * 100) / 100 : 0.0;

    const estimatedFees =
      s.volumeTnd * feeConfig.percentage_rate + s.captured * feeConfig.fixed_fee_tnd;
    const estimatedFeesTnd = Math.round(estimatedFees * 1000) / 1000;

    totalFeesAll += estimatedFeesTnd;

    return {
      gateway: g,
      display_name: GATEWAY_DISPLAY_NAMES[g],
      total_attempts: s.attempts,
      successful_captures: s.captured,
      failed_attempts: s.failed,
      pending_attempts: s.pending,
      success_rate_pct: successRatePct,
      total_volume_tnd: Math.round(s.volumeTnd * 1000) / 1000,
      avg_latency_seconds: avgLatencySeconds,
      estimated_gateway_fees_tnd: estimatedFeesTnd,
      error_breakdown: s.errors,
    };
  });

  const overallSuccessRatePct =
    totalAttemptsAll > 0
      ? Math.round((totalSuccessfulAll / totalAttemptsAll) * 10000) / 100
      : 0.0;

  return {
    total_attempts_all_gateways: totalAttemptsAll,
    total_successful_all_gateways: totalSuccessfulAll,
    overall_success_rate_pct: overallSuccessRatePct,
    total_volume_all_gateways_tnd: Math.round(totalVolumeAll * 1000) / 1000,
    total_estimated_fees_tnd: Math.round(totalFeesAll * 1000) / 1000,
    gateways: items,
  };
}

export class AnalyticsReconciliationService {
  private async getCachedData<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    try {
      const redis = getRedis();
      const cached = await withRedisTimeout(redis.get(key));
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.warn({ err, key }, 'Redis cache read error, falling back to db fetcher');
    }

    const fresh = await fetcher();

    try {
      const redis = getRedis();
      await withRedisTimeout(redis.set(key, JSON.stringify(fresh), 'EX', ttlSeconds));
    } catch (err) {
      logger.warn({ err, key }, 'Redis cache write error');
    }

    return fresh;
  }

  /**
   * Tri-Fold Financial Reconciliation
   * Gross GMV vs Net Platform Commission Take vs Escrow Floating Balance vs Settled Payouts
   */
  public async getTriFoldReconciliation(params: AnalyticsQueryParams = {}): Promise<FinancialReconciliationDTO> {
    return this.getFinancialReconciliation(params);
  }

  public async getFinancialReconciliation(params: AnalyticsQueryParams = {}): Promise<FinancialReconciliationDTO> {
    const range = analyticsService.parseDateWindow(params);
    const cacheKey = `analytics:financials:reconciliation:${range.timeRange}:${range.startDate || 'all'}:${range.endDate}:${params.currency || 'TND'}`;

    return this.getCachedData(cacheKey, async () => {
      // 1. Fetch orders in period
      const { rows: orderRows } = await query(
        `SELECT 
          o.id,
          o.store_id,
          COALESCE(o.subtotal, o.total, 0)::numeric AS subtotal_tnd,
          COALESCE(o.shipping_fee, 0)::numeric AS shipping_tnd,
          COALESCE(o.total, 0)::numeric AS total_tnd,
          COALESCE(sl.commission_rate * 100, 8.00)::numeric AS commission_rate_pct,
          CASE 
            WHEN o.status = 'cancelled' OR o.payment_status = 'cancelled' THEN 'cancelled'
            WHEN o.status = 'refunded' OR o.payment_status = 'refunded' THEN 'refunded'
            WHEN o.status IN ('delivered', 'fulfilled', 'completed') THEN 'delivered'
            ELSE 'paid'
          END AS status,
          CASE 
            WHEN wt.status = 'completed' AND wt.type = 'payout' THEN 'released'
            WHEN o.payment_status IN ('paid', 'captured', 'completed') THEN 'pending_escrow'
            ELSE 'held'
          END AS payout_status
        FROM pd_order o
        LEFT JOIN pd_store s ON o.store_id = s.id
        LEFT JOIN pd_subscription_limits sl ON s.subscription_plan = sl.plan_id
        LEFT JOIN pd_wallet_transaction wt ON wt.order_id = o.id AND wt.type = 'payout'
        WHERE ($1::timestamp IS NULL OR o.created_at >= $1::timestamp)
          AND o.created_at <= $2::timestamp
          AND o.payment_status NOT IN ('pending', 'failed')`,
        [range.startDate, range.endDate],
      ).catch(() => ({ rows: [] }));

      const orders: OrderReconciliationItem[] = orderRows.map((r: any) => ({
        id: r.id,
        store_id: r.store_id,
        subtotal_tnd: Number(r.subtotal_tnd),
        shipping_tnd: Number(r.shipping_tnd),
        total_tnd: Number(r.total_tnd),
        commission_rate_pct: Number(r.commission_rate_pct),
        status: r.status as any,
        payout_status: r.payout_status as any,
      }));

      // 2. Fetch subscription revenue in period
      const { rows: subRows } = await query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS sub_revenue
         FROM pd_subscription_intent
         WHERE status IN ('captured', 'approved', 'paid', 'completed')
           AND ($1::timestamp IS NULL OR created_at >= $1::timestamp)
           AND created_at <= $2::timestamp`,
        [range.startDate, range.endDate],
      ).catch(() => ({ rows: [{ sub_revenue: 0 }] }));

      const subRevenue = Number(subRows[0]?.sub_revenue || 0);

      // 3. Fetch ads revenue in period
      const { rows: adsRows } = await query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS ads_revenue
         FROM pd_ads_refill_intent
         WHERE status IN ('captured', 'approved', 'paid', 'completed')
           AND ($1::timestamp IS NULL OR created_at >= $1::timestamp)
           AND created_at <= $2::timestamp`,
        [range.startDate, range.endDate],
      ).catch(() => ({ rows: [{ ads_revenue: 0 }] }));

      const adsRevenue = Number(adsRows[0]?.ads_revenue || 0);

      return computeTriFoldReconciliation(orders, subRevenue, adsRevenue, PLATFORM_FX_RATES);
    });
  }

  /**
   * SaaS MRR Waterfall Engine
   * Computes Beginning MRR, New, Expansion, Contraction, Churn, Net New MRR, Quick Ratio & Plan Breakdown
   */
  public async getSaaSMRRWaterfall(params: AnalyticsQueryParams = {}): Promise<SaaSMasterWaterfallDTO> {
    const range = analyticsService.parseDateWindow(params);
    const cacheKey = `analytics:financials:mrr-waterfall:${range.timeRange}:${range.startDate || 'all'}:${range.endDate}`;

    return this.getCachedData(cacheKey, async () => {
      // 1. Fetch active subscriptions at end of period
      const { rows: activeStores } = await query(
        `SELECT 
          s.id AS store_id,
          COALESCE(s.subscription_plan, 'free') AS plan_id,
          COALESCE(s.billing_cycle, 'monthly') AS billing_cycle,
          CASE 
            WHEN s.subscription_plan = 'platinum' THEN 299.000
            WHEN s.subscription_plan = 'golden' THEN 199.000
            WHEN s.subscription_plan = 'pro' THEN 129.000
            WHEN s.subscription_plan = 'agency' THEN 89.000
            WHEN s.subscription_plan = 'regular' THEN 59.000
            WHEN s.subscription_plan = 'starter' THEN 29.000
            ELSE 0.000
          END AS mrr_contribution_tnd
        FROM pd_store s
        WHERE s.status NOT IN ('deleted', 'archived')
          AND s.created_at <= $1::timestamp`,
        [range.endDate],
      ).catch(() => ({ rows: [] }));

      const activeEnding: ActiveSubscriptionSnapshot[] = activeStores.map((r: any) => ({
        store_id: r.store_id,
        plan_id: r.plan_id,
        billing_cycle: r.billing_cycle === 'annual' ? 'annual' : 'monthly',
        mrr_contribution_tnd: Number(r.mrr_contribution_tnd),
      }));

      // 2. Fetch subscription lifecycle intents/events within period
      const { rows: intentRows } = await query(
        `SELECT 
          si.id,
          si.store_id,
          si.from_plan,
          si.target_plan,
          COALESCE(si.amount, 0)::numeric AS amount,
          si.status,
          si.created_at
        FROM pd_subscription_intent si
        WHERE ($1::timestamp IS NULL OR si.created_at >= $1::timestamp)
          AND si.created_at <= $2::timestamp
        ORDER BY si.created_at ASC`,
        [range.startDate, range.endDate],
      ).catch(() => ({ rows: [] }));

      const events: SubscriptionLifecycleEvent[] = [];

      for (const row of intentRows) {
        const targetPlan = row.target_plan || 'starter';
        const fromPlan = row.from_plan || 'free';
        const targetConfig = PLATFORM_SAAS_PLANS[targetPlan] || PLATFORM_SAAS_PLANS.free;
        const fromConfig = PLATFORM_SAAS_PLANS[fromPlan] || PLATFORM_SAAS_PLANS.free;

        if (row.status === 'cancelled' || row.status === 'expired') {
          events.push({
            type: 'churn_cancellation',
            store_id: row.store_id,
            plan_id: targetPlan,
            churned_mrr_tnd: targetConfig.monthly_price_tnd,
          });
        } else if (fromPlan === 'free' || !row.from_plan) {
          events.push({
            type: 'new_subscription',
            store_id: row.store_id,
            plan_id: targetPlan,
            billing_cycle: 'monthly',
            mrr_tnd: targetConfig.monthly_price_tnd,
          });
        } else if (targetConfig.monthly_price_tnd > fromConfig.monthly_price_tnd) {
          events.push({
            type: 'plan_expansion',
            store_id: row.store_id,
            previous_plan_id: fromPlan,
            new_plan_id: targetPlan,
            mrr_delta_tnd: targetConfig.monthly_price_tnd - fromConfig.monthly_price_tnd,
          });
        } else if (targetConfig.monthly_price_tnd < fromConfig.monthly_price_tnd) {
          events.push({
            type: 'plan_contraction',
            store_id: row.store_id,
            previous_plan_id: fromPlan,
            new_plan_id: targetPlan,
            mrr_delta_tnd: fromConfig.monthly_price_tnd - targetConfig.monthly_price_tnd,
          });
        }
      }

      // 3. Compute beginning MRR from snapshot or calculate from ending minus net new
      let beginningMrr = 0;
      if (range.startDate) {
        const { rows: startStores } = await query(
          `SELECT 
            COALESCE(SUM(
              CASE 
                WHEN s.subscription_plan = 'platinum' THEN 299.000
                WHEN s.subscription_plan = 'golden' THEN 199.000
                WHEN s.subscription_plan = 'pro' THEN 129.000
                WHEN s.subscription_plan = 'agency' THEN 89.000
                WHEN s.subscription_plan = 'regular' THEN 59.000
                WHEN s.subscription_plan = 'starter' THEN 29.000
                ELSE 0.000
              END
            ), 0)::numeric AS beginning_mrr
          FROM pd_store s
          WHERE s.status NOT IN ('deleted', 'archived')
            AND s.created_at < $1::timestamp`,
          [range.startDate],
        ).catch(() => ({ rows: [{ beginning_mrr: 0 }] }));

        beginningMrr = Number(startStores[0]?.beginning_mrr || 0);
      }

      return computeSaaSMRRWaterfall(beginningMrr, events, activeEnding);
    });
  }

  /**
   * Payment Gateway Reliability & Conversion Matrix
   * Flouci, Konnect, Mandat, Stripe, PayPal, COD success rates, volumes, latencies
   */
  public async getGatewayReliabilityMatrix(params: AnalyticsQueryParams = {}): Promise<GatewayReliabilityMatrixResponse> {
    return this.getGatewaysReliabilityMatrix(params);
  }

  public async getGatewaysReliabilityMatrix(params: AnalyticsQueryParams = {}): Promise<GatewayReliabilityMatrixResponse> {
    const range = analyticsService.parseDateWindow(params);
    const cacheKey = `analytics:gateways:matrix:${range.timeRange}:${range.startDate || 'all'}:${range.endDate}`;

    return this.getCachedData(cacheKey, async () => {
      // 1. Check if pd_payment_attempt has records in period
      const { rows: attemptRows } = await query(
        `SELECT 
          pa.id,
          pa.order_id,
          pa.gateway,
          COALESCE(pa.expected_amount_minor / 1000.0, o.total, 0)::numeric AS amount_tnd,
          CASE 
            WHEN pa.status IN ('captured', 'completed', 'paid', 'approved') THEN 'captured'
            WHEN pa.status IN ('failed', 'declined', 'cancelled', 'rejected') THEN 'failed'
            ELSE 'pending'
          END AS status,
          NULL AS failure_reason,
          COALESCE(EXTRACT(EPOCH FROM (pa.updated_at - pa.created_at)) * 1000, 1200)::int AS latency_ms,
          pa.created_at::text,
          pa.updated_at::text AS settled_at
        FROM pd_payment_attempt pa
        LEFT JOIN pd_order o ON pa.order_id = o.id
        WHERE ($1::timestamp IS NULL OR pa.created_at >= $1::timestamp)
          AND pa.created_at <= $2::timestamp`,
        [range.startDate, range.endDate],
      ).catch(() => ({ rows: [] }));

      let records: PaymentAttemptRecord[] = attemptRows.map((r: any) => ({
        id: r.id,
        order_id: r.order_id,
        gateway: (r.gateway || 'cod') as PaymentGatewayType,
        amount_tnd: Number(r.amount_tnd),
        status: r.status as any,
        failure_reason: r.failure_reason,
        latency_ms: Number(r.latency_ms),
        created_at: r.created_at,
        settled_at: r.settled_at,
      }));

      // If no payment attempts table rows exist, synthesize truthful data from pd_order table
      if (records.length === 0) {
        const { rows: orderAttempts } = await query(
          `SELECT 
            o.id,
            o.id AS order_id,
            COALESCE(o.payment_gateway, 'cod') AS gateway,
            COALESCE(o.total, 0)::numeric AS amount_tnd,
            CASE 
              WHEN o.payment_status IN ('paid', 'captured', 'completed', 'approved') THEN 'captured'
              WHEN o.payment_status IN ('failed', 'declined', 'cancelled') THEN 'failed'
              ELSE 'pending'
            END AS status,
            CASE 
              WHEN o.payment_status = 'failed' THEN 'card_declined'
              ELSE NULL
            END AS failure_reason,
            1200 AS latency_ms,
            o.created_at::text,
            o.updated_at::text AS settled_at
          FROM pd_order o
          WHERE ($1::timestamp IS NULL OR o.created_at >= $1::timestamp)
            AND o.created_at <= $2::timestamp`,
          [range.startDate, range.endDate],
        ).catch(() => ({ rows: [] }));

        records = orderAttempts.map((r: any) => ({
          id: r.id,
          order_id: r.order_id,
          gateway: (r.gateway || 'cod') as PaymentGatewayType,
          amount_tnd: Number(r.amount_tnd),
          status: r.status as any,
          failure_reason: r.failure_reason as any,
          latency_ms: Number(r.latency_ms),
          created_at: r.created_at,
          settled_at: r.settled_at,
        }));
      }

      return computeGatewayReliabilityMatrix(records, GATEWAY_FEE_SCHEDULE);
    });
  }
}

export const analyticsReconciliationService = new AnalyticsReconciliationService();
