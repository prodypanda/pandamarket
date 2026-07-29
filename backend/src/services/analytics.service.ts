/**
 * AnalyticsService — Core service for superadmin platform analytics.
 * Handles normalized date range filtering, SQL parameterization, period-over-period (PoP)
 * growth calculations, Redis caching with range keys, and truthfulness contracts.
 */

import { query } from '../db/pool';
import { getRedis } from '../db/redis';
import { logger } from '../utils/logger';
import { PdValidationError } from '../errors';
import {
  AnalyticsQueryParams,
  AnalyticsTimeRange,
  NormalizedAnalyticsRange,
  MetricScopeMetadata,
  OverviewMetricsDTO,
  RevenueMetricsDTO,
  VendorMetricsDTO,
  AdsMetricsDTO,
  SystemMetricsDTO,
} from '../types/analytics-types';

export class AnalyticsService {
  public static CACHE_TTL_LIVE = 300; // 5 minutes cache for live data
  public static CACHE_TTL_HISTORICAL = 86400; // 24 hours cache for historical snapshots

  public static METRIC_SCOPE: MetricScopeMetadata = {
    active_stores: 'current_state',
    total_stores: 'current_state',
    total_users: 'current_state',
    active_sessions: 'current_state',
    gmv: 'selected_period',
    revenue: 'selected_period',
    orders: 'selected_period',
    new_users: 'selected_period',
    new_stores: 'selected_period',
  };

  /**
   * Parses and normalizes time range query parameters.
   * Supports '7d', '30d', '90d', '12m', 'all' or explicit startDate / endDate.
   */
  public parseDateWindow(params: AnalyticsQueryParams): NormalizedAnalyticsRange {
    const end = params.endDate ? new Date(params.endDate) : new Date();
    if (isNaN(end.getTime())) {
      throw new PdValidationError('Invalid endDate format', { endDate: params.endDate });
    }

    let timeRange: AnalyticsTimeRange = params.timeRange || '30d';

    if (params.startDate) {
      const start = new Date(params.startDate);
      if (isNaN(start.getTime())) {
        throw new PdValidationError('Invalid startDate format', { startDate: params.startDate });
      }
      if (start.getTime() > end.getTime()) {
        throw new PdValidationError('startDate cannot be after endDate', {
          startDate: params.startDate,
          endDate: params.endDate || end.toISOString(),
        });
      }
      const durationMs = end.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime());
      const prevStart = new Date(start.getTime() - durationMs);

      return {
        timeRange,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        previousStartDate: prevStart.toISOString(),
        previousEndDate: prevEnd.toISOString(),
        isAllTime: false,
        comparison_available: true,
      };
    }

    if (timeRange === 'all') {
      return {
        timeRange: 'all',
        startDate: null,
        endDate: end.toISOString(),
        previousStartDate: null,
        previousEndDate: null,
        isAllTime: true,
        comparison_available: false,
      };
    }

    let durationMs = 30 * 24 * 60 * 60 * 1000;
    switch (timeRange) {
      case '7d':
        durationMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        durationMs = 30 * 24 * 60 * 60 * 1000;
        break;
      case '90d':
        durationMs = 90 * 24 * 60 * 60 * 1000;
        break;
      case '12m':
        durationMs = 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        timeRange = '30d';
        durationMs = 30 * 24 * 60 * 60 * 1000;
        break;
    }

    const currentStart = new Date(end.getTime() - durationMs);
    const prevEnd = new Date(currentStart.getTime());
    const prevStart = new Date(currentStart.getTime() - durationMs);

    return {
      timeRange,
      startDate: currentStart.toISOString(),
      endDate: end.toISOString(),
      previousStartDate: prevStart.toISOString(),
      previousEndDate: prevEnd.toISOString(),
      isAllTime: false,
      comparison_available: true,
    };
  }

  /**
   * Helper to calculate Period-over-Period growth percentage
   */
  public calculateGrowthPct(current: number, previous: number | null | undefined): number | null {
    if (previous === null || previous === undefined) return null;
    if (previous === 0) {
      return current === 0 ? 0 : null; // return null when previous is 0 and current > 0 to avoid synthetic 100%+ numbers
    }
    const pct = ((current - previous) / previous) * 100;
    return Number(pct.toFixed(2));
  }

  private async getCachedData<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number): Promise<T> {
    try {
      const redis = getRedis();
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.warn({ err, key }, 'Redis cache read error, falling back to database query');
    }

    const freshData = await fetcher();

    try {
      const redis = getRedis();
      await redis.set(key, JSON.stringify(freshData), 'EX', ttlSeconds);
    } catch (err) {
      logger.warn({ err, key }, 'Redis cache write error');
    }

    return freshData;
  }

  // ==========================================================
  // 1. Executive Global Overview
  // ==========================================================
  async getGlobalOverview(params: AnalyticsQueryParams = {}): Promise<OverviewMetricsDTO> {
    const requestedCurrency = (params.currency || 'TND').toUpperCase();
    const range = this.parseDateWindow(params);
    const tenantKey = params.tenantId || 'global';

    const cacheKey = `analytics:overview:${range.timeRange}:${range.startDate || 'null'}:${range.endDate}:${requestedCurrency}:${tenantKey}`;

    return this.getCachedData(cacheKey, async () => {
      // 1. Current Period Customer Marketplace Orders GMV
      const { rows: orderStats } = await query(`
        SELECT 
          COALESCE(SUM(total), 0)::numeric AS current_order_gmv,
          COUNT(id)::int AS current_orders_count
        FROM pd_order
        WHERE payment_status = 'paid'
          AND ($1::timestamp IS NULL OR created_at >= $1::timestamp)
          AND created_at <= $2::timestamp
      `, [range.startDate, range.endDate]).catch(() => ({ rows: [{ current_order_gmv: 0, current_orders_count: 0 }] }));

      // Previous Period Customer Marketplace Orders GMV
      let prevOrderGmv = 0;
      let prevOrdersCount = 0;
      if (range.comparison_available && range.previousStartDate && range.previousEndDate) {
        const { rows: prevOrderStats } = await query(`
          SELECT 
            COALESCE(SUM(total), 0)::numeric AS prev_order_gmv,
            COUNT(id)::int AS prev_orders_count
          FROM pd_order
          WHERE payment_status = 'paid'
            AND created_at BETWEEN $1 AND $2
        `, [range.previousStartDate, range.previousEndDate]).catch(() => ({ rows: [{ prev_order_gmv: 0, prev_orders_count: 0 }] }));
        prevOrderGmv = Number(prevOrderStats[0]?.prev_order_gmv || 0);
        prevOrdersCount = Number(prevOrderStats[0]?.prev_orders_count || 0);
      }

      // 2. Current Period Subscription Revenue
      const { rows: subStats } = await query(`
        SELECT 
          COALESCE(SUM(amount), 0)::numeric AS current_sub_revenue,
          COUNT(CASE WHEN status IN ('approved', 'captured', 'paid', 'completed') THEN 1 END)::int AS current_sub_orders
        FROM pd_subscription_intent
        WHERE status IN ('approved', 'captured', 'paid', 'completed')
          AND ($1::timestamp IS NULL OR created_at >= $1::timestamp)
          AND created_at <= $2::timestamp
      `, [range.startDate, range.endDate]);

      // Previous Period Subscription Revenue
      let prevSubRev = 0;
      if (range.comparison_available && range.previousStartDate && range.previousEndDate) {
        const { rows: prevSubStats } = await query(`
          SELECT 
            COALESCE(SUM(amount), 0)::numeric AS prev_sub_revenue
          FROM pd_subscription_intent
          WHERE status IN ('approved', 'captured', 'paid', 'completed')
            AND created_at BETWEEN $1 AND $2
        `, [range.previousStartDate, range.previousEndDate]);
        prevSubRev = Number(prevSubStats[0]?.prev_sub_revenue || 0);
      }

      const currentOrderGmv = Number(orderStats[0]?.current_order_gmv || 0);
      const currentSubRev = Number(subStats[0]?.current_sub_revenue || 0);
      const currentTotalGmv = currentOrderGmv + currentSubRev;
      const prevTotalGmv = prevOrderGmv + prevSubRev;

      const currentOrdersCount = Number(orderStats[0]?.current_orders_count || 0) + Number(subStats[0]?.current_sub_orders || 0);

      // Store stats (Current State & New in Period)
      const { rows: storeStats } = await query(`
        SELECT 
          COUNT(*)::int AS total_stores,
          COUNT(CASE WHEN status IN ('active', 'verified', 'published') THEN 1 END)::int AS active_stores,
          COUNT(CASE WHEN status IN ('paused', 'unverified', 'pending') THEN 1 END)::int AS paused_stores,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END)::int AS suspended_stores,
          COUNT(CASE WHEN ($1::timestamp IS NULL OR created_at >= $1::timestamp) AND created_at <= $2::timestamp THEN 1 END)::int AS new_stores_in_period
        FROM pd_store
      `, [range.startDate, range.endDate]);

      let prevNewStores = 0;
      if (range.comparison_available && range.previousStartDate && range.previousEndDate) {
        const { rows: prevStores } = await query(`
          SELECT COUNT(*)::int AS count 
          FROM pd_store 
          WHERE created_at BETWEEN $1 AND $2
        `, [range.previousStartDate, range.previousEndDate]);
        prevNewStores = Number(prevStores[0]?.count || 0);
      }

      // User stats by role (Current State & New in Period)
      const { rows: userStats } = await query(`
        SELECT 
          role, 
          COUNT(*)::int AS count,
          COUNT(CASE WHEN ($1::timestamp IS NULL OR created_at >= $1::timestamp) AND created_at <= $2::timestamp THEN 1 END)::int AS new_in_period
        FROM pd_user
        GROUP BY role
      `, [range.startDate, range.endDate]);

      let prevNewUsers = 0;
      if (range.comparison_available && range.previousStartDate && range.previousEndDate) {
        const { rows: prevUsers } = await query(`
          SELECT COUNT(*)::int AS count 
          FROM pd_user 
          WHERE created_at BETWEEN $1 AND $2
        `, [range.previousStartDate, range.previousEndDate]);
        prevNewUsers = Number(prevUsers[0]?.count || 0);
      }

      // Time series monthly revenue trend
      const { rows: monthlyRevenue } = await query(`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') AS month,
          COALESCE(SUM(amount), 0)::numeric AS revenue
        FROM pd_subscription_intent
        WHERE status IN ('approved', 'captured', 'paid', 'completed')
          AND ($1::timestamp IS NULL OR created_at >= $1::timestamp)
          AND created_at <= $2::timestamp
        GROUP BY month
        ORDER BY month ASC
      `, [range.startDate, range.endDate]);

      // Active sessions count
      const { rows: sessionStats } = await query(`
        SELECT COUNT(*)::int AS active_sessions 
        FROM pd_user_session 
        WHERE revoked_at IS NULL AND expires_at > NOW()
      `).catch(() => ({ rows: [{ active_sessions: 0 }] }));

      // Escrow & Payout tracking
      const { rows: escrowStats } = await query(`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0)::numeric AS funds_in_escrow,
          COALESCE(SUM(CASE WHEN status = 'captured' THEN amount ELSE 0 END), 0)::numeric AS released_payouts
        FROM pd_subscription_intent
        WHERE ($1::timestamp IS NULL OR created_at >= $1::timestamp)
          AND created_at <= $2::timestamp
      `, [range.startDate, range.endDate]).catch(() => ({ rows: [{ funds_in_escrow: 0, released_payouts: 0 }] }));

      // Automated Threshold Alerts Engine
      const alerts: Array<{ id: string; level: 'info' | 'warning' | 'critical'; title: string; message: string }> = [];
      const activeStores = Number(storeStats[0]?.active_stores || 0);

      if (activeStores === 0) {
        alerts.push({ id: 'alert_no_stores', level: 'warning', title: 'Low Store Activation', message: 'No active vendor stores currently live on the marketplace.' });
      }

      const totalUsers = userStats.reduce((acc, r) => acc + Number(r.count), 0);
      const newUsersInPeriod = userStats.reduce((acc, r) => acc + Number(r.new_in_period), 0);
      const sellerCount = Number(userStats.find((r) => r.role === 'vendor' || r.role === 'seller')?.count || 0);
      const buyerCount = Number(userStats.find((r) => r.role === 'customer' || r.role === 'buyer')?.count || 0);
      const adminCount = Number(userStats.find((r) => r.role === 'super_admin' || r.role === 'admin')?.count || 0);

      const newStoresInPeriod = Number(storeStats[0]?.new_stores_in_period || 0);

      return {
        range,
        metric_scope: AnalyticsService.METRIC_SCOPE,
        financials: {
          total_gmv: currentTotalGmv,
          marketplace_order_gmv: currentOrderGmv,
          subscription_revenue: currentSubRev,
          net_revenue: currentSubRev,
          funds_in_escrow: Number(escrowStats[0]?.funds_in_escrow || 0),
          released_payouts: Number(escrowStats[0]?.released_payouts || 0),
          total_orders: currentOrdersCount,
          currency: 'TND',
          requested_currency: requestedCurrency,
          currency_conversion_available: false,
          gmv_source_note: 'order_and_subscription_totals',
          gmv_growth_pct: range.comparison_available ? this.calculateGrowthPct(currentTotalGmv, prevTotalGmv) : null,
          net_revenue_growth_pct: range.comparison_available ? this.calculateGrowthPct(currentSubRev, prevSubRev) : null,
          orders_growth_pct: range.comparison_available ? this.calculateGrowthPct(currentOrdersCount, prevOrdersCount) : null,
        },
        stores: {
          total_stores: Number(storeStats[0]?.total_stores || 0),
          active_stores: Number(storeStats[0]?.active_stores || 0),
          paused_stores: Number(storeStats[0]?.paused_stores || 0),
          suspended_stores: Number(storeStats[0]?.suspended_stores || 0),
          new_stores_in_period: newStoresInPeriod,
          new_stores_growth_pct: range.comparison_available ? this.calculateGrowthPct(newStoresInPeriod, prevNewStores) : null,
        },
        users: {
          total_users: totalUsers,
          sellers: sellerCount,
          buyers: buyerCount,
          admins: adminCount,
          new_users_in_period: newUsersInPeriod,
          new_users_growth_pct: range.comparison_available ? this.calculateGrowthPct(newUsersInPeriod, prevNewUsers) : null,
        },
        active_sessions: Number(sessionStats[0]?.active_sessions || 0),
        monthly_revenue_trend: monthlyRevenue.map((r) => ({
          month: r.month,
          revenue: Number(r.revenue),
        })),
        threshold_alerts: alerts,
      };
    }, AnalyticsService.CACHE_TTL_LIVE);
  }

  // ==========================================================
  // 2. Financials & SaaS Subscription Engine
  // ==========================================================
  async getRevenueAndSaaSMetrics(params: AnalyticsQueryParams = {}): Promise<RevenueMetricsDTO> {
    const requestedCurrency = (params.currency || 'TND').toUpperCase();
    const range = this.parseDateWindow(params);
    const tenantKey = params.tenantId || 'global';

    const cacheKey = `analytics:saas:${range.timeRange}:${range.startDate || 'null'}:${range.endDate}:${requestedCurrency}:${tenantKey}`;

    return this.getCachedData(cacheKey, async () => {
      const { subscriptionPaymentService } = await import('./subscription-payment.service');
      const cohortAnalytics = await subscriptionPaymentService.getCohortLtvAnalytics();

      // MRR & ARR calculation from active stores
      const { rows: activeSubs } = await query(`
        SELECT 
          s.subscription_plan,
          COUNT(s.id)::int AS count,
          COALESCE(l.yearly_price, 0) AS yearly_price
        FROM pd_store s
        LEFT JOIN pd_subscription_limits l ON l.plan_id = s.subscription_plan
        WHERE s.status IN ('active', 'verified', 'published')
        GROUP BY s.subscription_plan, l.yearly_price
      `);

      let totalArrTND = 0;
      activeSubs.forEach((row) => {
        totalArrTND += Number(row.count) * Number(row.yearly_price);
      });
      const totalMrrTND = totalArrTND / 12;

      return {
        range,
        metric_scope: AnalyticsService.METRIC_SCOPE,
        saas_metrics: {
          total_mrr_tnd: Math.round(totalMrrTND),
          total_arr_tnd: Math.round(totalArrTND),
          arpu_tnd: Number(cohortAnalytics.metrics.arpu_tnd) || null,
          churn_rate_pct: Number(cohortAnalytics.metrics.churn_rate_pct) || null,
          estimated_ltv_tnd: Number(cohortAnalytics.metrics.estimated_ltv_tnd) || null,
          currency: 'TND',
          requested_currency: requestedCurrency,
          currency_conversion_available: false,
        },
        mrr_movement: {
          new_mrr: null,
          expansion_mrr: null,
          contraction_mrr: null,
          churned_mrr: null,
          total_mrr: Math.round(totalMrrTND),
          total_arr: Math.round(totalArrTND),
          mrr_movement_available: false,
          mrr_movement_unavailable_reason: 'Subscription lifecycle events are not tracked yet.',
        },
        active_subscriptions_by_plan: activeSubs.map((row) => ({
          plan_id: row.subscription_plan,
          active_count: Number(row.count),
          annual_value: Number(row.count) * Number(row.yearly_price),
        })),
        cohort_matrix: cohortAnalytics.cohorts.map((c: any) => ({
          cohort: c.cohort_month,
          total_signups: Number(c.total_signups),
          m1_retained_pct: c.retention_pct + '%',
          m2_retained_pct: Number(c.total_signups) > 0 ? ((Number(c.m2_retained || 0) / Number(c.total_signups)) * 100).toFixed(1) + '%' : '-',
          m3_retained_pct: Number(c.total_signups) > 0 ? ((Number(c.m3_retained || 0) / Number(c.total_signups)) * 100).toFixed(1) + '%' : '-',
          m4_retained_pct: Number(c.total_signups) > 0 ? ((Number(c.m4_retained || 0) / Number(c.total_signups)) * 100).toFixed(1) + '%' : '-',
          m5_retained_pct: Number(c.total_signups) > 0 ? ((Number(c.m5_retained || 0) / Number(c.total_signups)) * 100).toFixed(1) + '%' : '-',
          m6_retained_pct: Number(c.total_signups) > 0 ? ((Number(c.m6_retained || 0) / Number(c.total_signups)) * 100).toFixed(1) + '%' : '-',
        })),
      };
    }, AnalyticsService.CACHE_TTL_LIVE);
  }

  // ==========================================================
  // 3. Vendor & Marketplace Health
  // ==========================================================
  async getVendorAnalytics(params: AnalyticsQueryParams = {}): Promise<VendorMetricsDTO> {
    const range = this.parseDateWindow(params);
    const tenantKey = params.tenantId || 'global';

    const cacheKey = `analytics:vendors:${range.timeRange}:${range.startDate || 'null'}:${range.endDate}:${tenantKey}`;

    return this.getCachedData(cacheKey, async () => {
      // Top performing stores ordered by product count
      const { rows: topStores } = await query(`
        SELECT 
          s.id,
          s.name,
          s.subdomain,
          s.status,
          s.subscription_plan,
          s.created_at,
          COUNT(p.id)::int AS products_count
        FROM pd_store s
        LEFT JOIN pd_product p ON p.store_id = s.id
        GROUP BY s.id, s.name, s.subdomain, s.status, s.subscription_plan, s.created_at
        ORDER BY products_count DESC
        LIMIT 10
      `);

      // Vendor activation funnel (Filtered by selected range when not all-time)
      const { rows: userCount } = await query(`
        SELECT COUNT(*)::int AS count 
        FROM pd_user 
        WHERE role IN ('vendor', 'seller', 'admin')
          AND ($1::timestamp IS NULL OR created_at >= $1::timestamp)
          AND created_at <= $2::timestamp
      `, [range.startDate, range.endDate]);

      const { rows: storeCount } = await query(`
        SELECT COUNT(*)::int AS count 
        FROM pd_store
        WHERE ($1::timestamp IS NULL OR created_at >= $1::timestamp)
          AND created_at <= $2::timestamp
      `, [range.startDate, range.endDate]);

      const { rows: activeStoreCount } = await query(`
        SELECT COUNT(*)::int AS count 
        FROM pd_store 
        WHERE status IN ('active', 'verified', 'published')
          AND ($1::timestamp IS NULL OR created_at >= $1::timestamp)
          AND created_at <= $2::timestamp
      `, [range.startDate, range.endDate]);

      const { rows: adStoreCount } = await query(`
        SELECT COUNT(DISTINCT store_id)::int AS count 
        FROM pd_ads_campaign
        WHERE ($1::timestamp IS NULL OR created_at >= $1::timestamp)
          AND created_at <= $2::timestamp
      `, [range.startDate, range.endDate]).catch(() => ({ rows: [{ count: 0 }] }));

      const totalSellers = Number(userCount[0]?.count || 1);
      const totalStores = Number(storeCount[0]?.count || 0);
      const activeStores = Number(activeStoreCount[0]?.count || 0);
      const adStores = Number(adStoreCount[0]?.count || 0);

      const activationFunnel = [
        { stage: '1. Registered Vendors', count: totalSellers, conversion: '100%' },
        { stage: '2. Store Created', count: totalStores, conversion: `${Math.round((totalStores / totalSellers) * 100)}%` },
        { stage: '3. Active Store Published', count: activeStores, conversion: `${Math.round((activeStores / totalSellers) * 100)}%` },
        { stage: '4. Running Campaigns', count: adStores, conversion: `${Math.round((adStores / totalSellers) * 100)}%` },
      ];

      return {
        range,
        metric_scope: AnalyticsService.METRIC_SCOPE,
        top_performing_vendors: topStores.map((row) => ({
          id: row.id,
          name: row.name,
          subdomain: row.subdomain,
          status: row.status,
          subscription_plan: row.subscription_plan,
          created_at: String(row.created_at),
          products_count: Number(row.products_count || 0),
        })),
        activation_funnel: activationFunnel,
        dispute_and_refund_rate: {
          total_refunds_issued: 0,
          dispute_rate_pct: 0,
          high_risk_vendors_flagged: 0,
        },
      };
    }, AnalyticsService.CACHE_TTL_LIVE);
  }

  // ==========================================================
  // 4. PandaMarket Ads Integration
  // ==========================================================
  async getAdsAnalytics(params: AnalyticsQueryParams = {}): Promise<AdsMetricsDTO> {
    const requestedCurrency = (params.currency || 'TND').toUpperCase();
    const range = this.parseDateWindow(params);
    const tenantKey = params.tenantId || 'global';

    const cacheKey = `analytics:ads:${range.timeRange}:${range.startDate || 'null'}:${range.endDate}:${requestedCurrency}:${tenantKey}`;

    return this.getCachedData(cacheKey, async () => {
      // Ads campaign spend in range
      const { rows: adStats } = await query(`
        SELECT 
          COALESCE(SUM(spent_amount), 0)::numeric AS total_spend,
          COUNT(id)::int AS total_campaigns,
          COUNT(CASE WHEN status IN ('active', 'approved', 'running') THEN 1 END)::int AS active_campaigns
        FROM pd_ads_campaign
        WHERE ($1::timestamp IS NULL OR created_at >= $1::timestamp)
          AND created_at <= $2::timestamp
      `, [range.startDate, range.endDate]).catch(() => ({ rows: [{ total_spend: 0, total_campaigns: 0, active_campaigns: 0 }] }));

      // Previous period spend
      let prevSpend = 0;
      if (range.comparison_available && range.previousStartDate && range.previousEndDate) {
        const { rows: prevAdStats } = await query(`
          SELECT COALESCE(SUM(spent_amount), 0)::numeric AS prev_spend
          FROM pd_ads_campaign
          WHERE created_at BETWEEN $1 AND $2
        `, [range.previousStartDate, range.previousEndDate]).catch(() => ({ rows: [{ prev_spend: 0 }] }));
        prevSpend = Number(prevAdStats[0]?.prev_spend || 0);
      }

      // Impressions & clicks in range
      const { rows: eventStats } = await query(`
        SELECT 
          COALESCE(SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END), 0)::bigint AS impressions,
          COALESCE(SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END), 0)::bigint AS clicks
        FROM pd_ads_event
        WHERE ($1::timestamp IS NULL OR created_at >= $1::timestamp)
          AND created_at <= $2::timestamp
      `, [range.startDate, range.endDate]).catch(() => ({ rows: [{ impressions: 0, clicks: 0 }] }));

      const impressions = Number(eventStats[0]?.impressions || 0);
      const clicks = Number(eventStats[0]?.clicks || 0);
      const totalSpendTND = Number(adStats[0]?.total_spend || 0);

      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpcTND = clicks > 0 ? totalSpendTND / clicks : 0;

      return {
        range,
        metric_scope: AnalyticsService.METRIC_SCOPE,
        ads_financials: {
          total_ad_revenue_tnd: totalSpendTND,
          total_campaigns: Number(adStats[0]?.total_campaigns || 0),
          active_campaigns: Number(adStats[0]?.active_campaigns || 0),
          currency: 'TND',
          requested_currency: requestedCurrency,
          currency_conversion_available: false,
          ad_revenue_growth_pct: range.comparison_available ? this.calculateGrowthPct(totalSpendTND, prevSpend) : null,
        },
        performance_metrics: {
          total_impressions: impressions,
          total_clicks: clicks,
          avg_ctr_pct: Number(ctr.toFixed(2)),
          avg_cpc_tnd: Number(cpcTND.toFixed(2)),
          estimated_roas: null, // Explicit null: ROAS is unavailable without order attribution tracking
          conversion_attribution_available: false,
        },
        slot_utilization_pct: null, // Explicit null: slot utilization is unavailable without slot inventory tracking
        slot_inventory_available: false,
      };
    }, AnalyticsService.CACHE_TTL_LIVE);
  }

  // ==========================================================
  // 5. Infrastructure & Operations Health
  // ==========================================================
  async getSystemHealthMetrics(params: AnalyticsQueryParams = {}): Promise<SystemMetricsDTO> {
    const range = this.parseDateWindow(params);
    const cacheKey = `analytics:system:health:${range.timeRange}:${range.startDate || 'null'}:${range.endDate}`;

    return this.getCachedData(cacheKey, async () => {
      // 24h logs
      const { rows: logs24h } = await query(`
        SELECT COUNT(*)::int AS count 
        FROM pd_system_log 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `).catch(() => ({ rows: [{ count: 0 }] }));

      // Logs in selected period
      const { rows: logsPeriod } = await query(`
        SELECT COUNT(*)::int AS count 
        FROM pd_system_log 
        WHERE ($1::timestamp IS NULL OR created_at >= $1::timestamp)
          AND created_at <= $2::timestamp
      `, [range.startDate, range.endDate]).catch(() => ({ rows: [{ count: 0 }] }));

      const { rows: recentAudit } = await query(`
        SELECT action, details, created_at 
        FROM pd_system_log 
        ORDER BY created_at DESC 
        LIMIT 5
      `).catch(() => ({ rows: [] }));

      return {
        range,
        metric_scope: AnalyticsService.METRIC_SCOPE,
        server_telemetry: {
          status: 'healthy',
          uptime_pct: null, // Explicit null until real uptime monitor integration
          p95_latency_ms: null,
          p99_latency_ms: null,
          error_rate_pct: null,
          telemetry_available: false,
        },
        print_production_queue: {
          pending_jobs: null,
          processing_jobs: null,
          completed_today: null,
          delayed_jobs: null,
          print_queue_metrics_available: false,
        },
        database_health: {
          active_connections: null,
          logs_24h: Number(logs24h[0]?.count || 0),
          logs_in_period: Number(logsPeriod[0]?.count || 0),
          index_hit_ratio_pct: null,
          database_pool_metrics_available: false,
        },
        live_audit_feed: recentAudit.map((log) => ({
          action: String(log.action),
          details: log.details,
          created_at: String(log.created_at),
        })),
      };
    }, AnalyticsService.CACHE_TTL_LIVE);
  }

  // ==========================================================
  // 6. Daily Snapshot Computation Worker
  // ==========================================================
  async computeDailySnapshots() {
    const today = new Date().toISOString().split('T')[0];
    logger.info({ today }, 'Running daily analytics snapshot aggregator worker...');

    const overview = await this.getGlobalOverview();
    const ads = await this.getAdsAnalytics();

    await query(`
      INSERT INTO pd_daily_platform_stats (
        snapshot_date, total_gmv, net_revenue, total_orders, active_vendors, total_vendors, new_users, total_users
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (snapshot_date) DO UPDATE SET
        total_gmv = EXCLUDED.total_gmv,
        net_revenue = EXCLUDED.net_revenue,
        total_orders = EXCLUDED.total_orders,
        active_vendors = EXCLUDED.active_vendors,
        total_vendors = EXCLUDED.total_vendors,
        total_users = EXCLUDED.total_users;
    `, [
      today,
      overview.financials.total_gmv,
      overview.financials.net_revenue,
      overview.financials.total_orders,
      overview.stores.active_stores,
      overview.stores.total_stores,
      overview.users.new_users_in_period,
      overview.users.total_users,
    ]);

    await query(`
      INSERT INTO pd_daily_ad_stats (
        snapshot_date, ad_revenue, impressions, clicks, active_campaigns, avg_ctr, avg_cpc
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (snapshot_date) DO UPDATE SET
        ad_revenue = EXCLUDED.ad_revenue,
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        active_campaigns = EXCLUDED.active_campaigns,
        avg_ctr = EXCLUDED.avg_ctr,
        avg_cpc = EXCLUDED.avg_cpc;
    `, [
      today,
      ads.ads_financials.total_ad_revenue_tnd,
      ads.performance_metrics.total_impressions,
      ads.performance_metrics.total_clicks,
      ads.ads_financials.active_campaigns,
      ads.performance_metrics.avg_ctr_pct,
      ads.performance_metrics.avg_cpc_tnd,
    ]);

    logger.info({ today }, 'Daily analytics snapshot computation completed successfully.');
  }

  // ==========================================================
  // 7. Asynchronous CSV Export Engine
  // ==========================================================
  async generateExportCSV(params: AnalyticsQueryParams & { type?: string } = {}) {
    const range = this.parseDateWindow(params);
    const overview = await this.getGlobalOverview(params);
    const saas = await this.getRevenueAndSaaSMetrics(params);
    const vendors = await this.getVendorAnalytics(params);
    const ads = await this.getAdsAnalytics(params);

    const headers = ['Category', 'Metric', 'Value'];
    const rows: Array<[string, string, string | number]> = [
      ['Range Metadata', 'Time Range', range.timeRange],
      ['Range Metadata', 'Start Date', range.startDate || 'All Time'],
      ['Range Metadata', 'End Date', range.endDate],
      ['Range Metadata', 'Previous Period', range.comparison_available ? `${range.previousStartDate} to ${range.previousEndDate}` : 'N/A'],
      ['Financials', 'Currency', 'TND (Native)'],
      ['Financials', 'Total GMV (TND)', overview.financials.total_gmv],
      ['Financials', 'Marketplace Orders GMV (TND)', overview.financials.marketplace_order_gmv],
      ['Financials', 'Subscription Revenue (TND)', overview.financials.subscription_revenue],
      ['Financials', 'Net Platform Revenue (TND)', overview.financials.net_revenue],
      ['Financials', 'GMV Growth (PoP)', overview.financials.gmv_growth_pct !== null ? `${overview.financials.gmv_growth_pct}%` : 'Unavailable'],
      ['Financials', 'Net Revenue Growth (PoP)', overview.financials.net_revenue_growth_pct !== null ? `${overview.financials.net_revenue_growth_pct}%` : 'Unavailable'],
      ['Financials', 'Total Orders in Period', overview.financials.total_orders],
      ['Stores', 'Total Active Stores', overview.stores.active_stores],
      ['Stores', 'New Stores in Period', overview.stores.new_stores_in_period],
      ['Stores', 'New Stores Growth (PoP)', overview.stores.new_stores_growth_pct !== null ? `${overview.stores.new_stores_growth_pct}%` : 'Unavailable'],
      ['Users', 'Total Users', overview.users.total_users],
      ['Users', 'New Users in Period', overview.users.new_users_in_period],
      ['Users', 'New Users Growth (PoP)', overview.users.new_users_growth_pct !== null ? `${overview.users.new_users_growth_pct}%` : 'Unavailable'],
      ['SaaS', 'Total ARR (TND)', saas.mrr_movement.total_arr],
      ['SaaS', 'Total MRR (TND)', saas.mrr_movement.total_mrr],
      ['SaaS', 'New MRR', saas.mrr_movement.new_mrr || 'Unavailable'],
      ['Vendors', 'Top Vendor Count', vendors.top_performing_vendors.length],
      ['Ads', 'Ad Revenue (TND)', ads.ads_financials.total_ad_revenue_tnd],
      ['Ads', 'Ad Revenue Growth (PoP)', ads.ads_financials.ad_revenue_growth_pct !== null ? `${ads.ads_financials.ad_revenue_growth_pct}%` : 'Unavailable'],
      ['Ads', 'Ad Impressions in Period', ads.performance_metrics.total_impressions],
      ['Ads', 'Ad Clicks in Period', ads.performance_metrics.total_clicks],
      ['Ads', 'Estimated ROAS', ads.performance_metrics.estimated_roas || 'Unavailable'],
    ];

    const csvLines = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))];
    return csvLines.join('\n');
  }
}

export const analyticsService = new AnalyticsService();
