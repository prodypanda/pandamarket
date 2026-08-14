/**
 * Analytics Reconciliation Test Suite — Package 1
 * Features Covered:
 *   - Feature 1: Real-time visitor stream & 60s velocity chart (R1)
 *   - Feature 3: Live checkout micro-ticker & anomaly alerts (R1)
 *   - Feature 4: Tri-Fold Financial Reconciliation (R2)
 *   - Feature 7: Multi-currency normalization engine (R2)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PdValidationError } from '../errors';

// Multi-Currency Normalization Constants & Utilities
export const PLATFORM_FX_RATES = {
  EUR_TO_TND: 3.350,
  USD_TO_TND: 3.100,
} as const;

export interface MultiCurrencyValue {
  tnd: number;
  eur: number;
  usd: number;
  formatted_tnd: string;
  formatted_eur: string;
  formatted_usd: string;
}

export function normalizeCurrency(tndAmount: number, fxRates = PLATFORM_FX_RATES): MultiCurrencyValue {
  if (isNaN(tndAmount) || !isFinite(tndAmount)) {
    throw new PdValidationError('Invalid monetary amount for currency normalization');
  }

  // TND: 3 decimal places (millimes)
  const tnd = Math.round(tndAmount * 1000) / 1000;
  // EUR: 2 decimal places (cents)
  const eur = Math.round((tnd / fxRates.EUR_TO_TND) * 100) / 100;
  // USD: 2 decimal places (cents)
  const usd = Math.round((tnd / fxRates.USD_TO_TND) * 100) / 100;

  return {
    tnd,
    eur,
    usd,
    formatted_tnd: `${tnd.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`,
    formatted_eur: `€${eur.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    formatted_usd: `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}

export function formatCurrencyByCode(amountTnd: number, currency: 'TND' | 'EUR' | 'USD', fxRates = PLATFORM_FX_RATES): {
  amount: number;
  currency: 'TND' | 'EUR' | 'USD';
  formatted: string;
} {
  const norm = normalizeCurrency(amountTnd, fxRates);
  switch (currency) {
    case 'EUR':
      return { amount: norm.eur, currency: 'EUR', formatted: norm.formatted_eur };
    case 'USD':
      return { amount: norm.usd, currency: 'USD', formatted: norm.formatted_usd };
    case 'TND':
    default:
      return { amount: norm.tnd, currency: 'TND', formatted: norm.formatted_tnd };
  }
}

// 60-Second Sliding Velocity Buffer Engine
export interface RawTelemetryEvent {
  id: string;
  timestamp: string; // ISO string
  visitor_hash: string;
  session_hash: string;
  event_type: string;
  store_id?: string | null;
  amount_tnd?: number;
}

export interface VelocityPoint {
  second_offset: number; // 0 to 59
  timestamp: string;
  visitor_count: number;
  event_count: number;
  checkout_velocity: number;
}

export interface LiveVelocityResult {
  reference_time: string;
  total_events_60s: number;
  unique_visitors_60s: number;
  checkout_events_60s: number;
  peak_events_per_sec: number;
  points: VelocityPoint[];
}

export function compute60sVelocityChart(
  events: RawTelemetryEvent[],
  referenceTime = new Date()
): LiveVelocityResult {
  const refMs = referenceTime.getTime();
  const windowStartMs = refMs - 59 * 1000; // 60-second window: [ref - 59s, ref]

  // Initialize 60 discrete second bins (0 to 59)
  const bins: Array<{
    second_offset: number;
    timestamp: string;
    visitors: Set<string>;
    eventCount: number;
    checkoutCount: number;
  }> = [];

  for (let i = 0; i < 60; i++) {
    const binTimeMs = windowStartMs + i * 1000;
    bins.push({
      second_offset: i,
      timestamp: new Date(binTimeMs).toISOString(),
      visitors: new Set<string>(),
      eventCount: 0,
      checkoutCount: 0,
    });
  }

  const allUniqueVisitors = new Set<string>();
  let totalEvents = 0;
  let totalCheckouts = 0;

  for (const ev of events) {
    const evTimeMs = new Date(ev.timestamp).getTime();
    if (isNaN(evTimeMs)) continue;

    // Filter events strictly within [windowStartMs, refMs]
    if (evTimeMs < windowStartMs - 500) continue; // Allow minor sub-second boundary

    // Compute second offset (clamped to 0..59)
    let offset = Math.floor((evTimeMs - windowStartMs) / 1000);
    if (offset < 0) offset = 0;
    if (offset > 59) offset = 59;

    const bin = bins[offset];
    bin.eventCount += 1;
    bin.visitors.add(ev.visitor_hash);
    if (
      ev.event_type === 'checkout_completed' ||
      ev.event_type === 'order_placed' ||
      ev.event_type === 'payment_completed'
    ) {
      bin.checkoutCount += 1;
      totalCheckouts += 1;
    }

    allUniqueVisitors.add(ev.visitor_hash);
    totalEvents += 1;
  }

  let peakEvents = 0;
  const points: VelocityPoint[] = bins.map((bin) => {
    if (bin.eventCount > peakEvents) {
      peakEvents = bin.eventCount;
    }
    return {
      second_offset: bin.second_offset,
      timestamp: bin.timestamp,
      visitor_count: bin.visitors.size,
      event_count: bin.eventCount,
      checkout_velocity: bin.checkoutCount,
    };
  });

  return {
    reference_time: referenceTime.toISOString(),
    total_events_60s: totalEvents,
    unique_visitors_60s: allUniqueVisitors.size,
    checkout_events_60s: totalCheckouts,
    peak_events_per_sec: peakEvents,
    points,
  };
}

// Live Checkout Micro-Ticker & Anomaly Alerts Engine
export interface LiveCheckoutItem {
  id: string;
  order_id: string;
  store_name: string;
  subdomain: string;
  amount_tnd: number;
  payment_gateway: 'flouci' | 'konnect' | 'manual_mandat' | 'stripe' | 'paypal' | 'cod';
  status: 'captured' | 'pending' | 'failed';
  governorate_code: string | null;
  governorate_name: string | null;
  country_code: string;
  occurred_at: string;
}

export interface AnomalyAlert {
  id: string;
  metric: string;
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  value: number;
  threshold: number;
  triggered_at: string;
}

export function evaluateCheckoutMicroTickerAndAnomalies(
  checkouts: LiveCheckoutItem[],
  maxTickerItems = 20,
  baselineOrdersPerMin = 10,
  failureRateThresholdPct = 30
): {
  ticker: LiveCheckoutItem[];
  anomaly_alerts: AnomalyAlert[];
  metrics: {
    total_recent: number;
    captured_count: number;
    failed_count: number;
    failure_rate_pct: number;
    total_volume_tnd: number;
  };
} {
  // Sort descending by timestamp
  const sorted = [...checkouts].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );

  const ticker = sorted.slice(0, maxTickerItems);
  const total = checkouts.length;
  const captured = checkouts.filter((c) => c.status === 'captured').length;
  const failed = checkouts.filter((c) => c.status === 'failed').length;
  const failureRatePct = total > 0 ? Math.round((failed / total) * 1000) / 10 : 0;
  const totalVolume = checkouts
    .filter((c) => c.status === 'captured')
    .reduce((sum, c) => sum + c.amount_tnd, 0);

  const anomalyAlerts: AnomalyAlert[] = [];

  // Anomaly 1: Gateway Failure Rate Spike
  if (total >= 5 && failureRatePct >= failureRateThresholdPct) {
    const level: 'warning' | 'critical' = failureRatePct >= 50 ? 'critical' : 'warning';
    anomalyAlerts.push({
      id: `alert_fail_rate_${Date.now()}`,
      metric: 'checkout_failure_rate',
      level,
      title: `${level === 'critical' ? 'CRITICAL' : 'WARNING'}: High Checkout Failure Rate`,
      message: `Checkout failure rate is currently at ${failureRatePct}% (${failed}/${total} attempts failed), exceeding threshold of ${failureRateThresholdPct}%.`,
      value: failureRatePct,
      threshold: failureRateThresholdPct,
      triggered_at: new Date().toISOString(),
    });
  }

  // Anomaly 2: Traffic Spike Velocity
  if (total > baselineOrdersPerMin * 3) {
    anomalyAlerts.push({
      id: `alert_surge_${Date.now()}`,
      metric: 'checkout_velocity_surge',
      level: 'warning',
      title: 'Checkout Velocity Surge',
      message: `Checkout volume reached ${total} events/min, 3x above baseline (${baselineOrdersPerMin} orders/min).`,
      value: total,
      threshold: baselineOrdersPerMin * 3,
      triggered_at: new Date().toISOString(),
    });
  }

  // Anomaly 3: Whale Order Alert (single checkout > 5,000 TND)
  const whaleOrders = checkouts.filter((c) => c.amount_tnd >= 5000);
  if (whaleOrders.length > 0) {
    anomalyAlerts.push({
      id: `alert_whale_${Date.now()}`,
      metric: 'whale_order_detected',
      level: 'info',
      title: 'High-Value Order Detected',
      message: `${whaleOrders.length} transaction(s) exceeding 5,000.000 TND detected.`,
      value: whaleOrders[0].amount_tnd,
      threshold: 5000,
      triggered_at: new Date().toISOString(),
    });
  }

  return {
    ticker,
    anomaly_alerts: anomalyAlerts,
    metrics: {
      total_recent: total,
      captured_count: captured,
      failed_count: failed,
      failure_rate_pct: failureRatePct,
      total_volume_tnd: Math.round(totalVolume * 1000) / 1000,
    },
  };
}

// Tri-Fold Financial Reconciliation Engine
export interface OrderReconciliationItem {
  id: string;
  store_id: string;
  subtotal_tnd: number;
  shipping_tnd: number;
  total_tnd: number;
  commission_rate_pct: number; // e.g. 8% -> 0.08
  status: 'paid' | 'delivered' | 'refunded' | 'cancelled';
  payout_status: 'pending_escrow' | 'released' | 'held';
}

export interface TriFoldReconciliationReport {
  gross_gmv: MultiCurrencyValue;
  marketplace_order_gmv: MultiCurrencyValue;
  subscription_revenue: MultiCurrencyValue;
  ads_revenue: MultiCurrencyValue;
  platform_net_commission_take: MultiCurrencyValue;
  total_platform_net_revenue: MultiCurrencyValue;
  escrow_floating_balance: MultiCurrencyValue;
  pending_vendor_payouts: MultiCurrencyValue;
  settled_vendor_payouts: MultiCurrencyValue;
  refunds_deducted: MultiCurrencyValue;
  effective_take_rate_pct: number;
  reconciliation_balance_check: {
    balanced: boolean;
    calculated_sum_tnd: number;
    discrepancy_tnd: number;
  };
}

export function computeTriFoldReconciliation(
  orders: OrderReconciliationItem[],
  subscriptionRevenueTnd: number,
  adsRevenueTnd: number,
  fxRates = PLATFORM_FX_RATES
): TriFoldReconciliationReport {
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

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Package 1: Backend Financials & Core Reconciliation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // FEATURE 1: Real-time visitor stream & 60s velocity chart (R1)
  // ==========================================================================
  describe('Feature 1: Real-time visitor stream & 60s velocity chart (R1)', () => {
    const fixedNow = new Date('2026-08-14T12:00:00.000Z');

    // --- Tier 1: Happy Path & Core Behavior (≥ 5 tests) ---
    it('T1.1: aggregates 60 discrete second bins (0-59s) with accurate timestamps and offsets', () => {
      const result = compute60sVelocityChart([], fixedNow);
      expect(result.points).toHaveLength(60);
      expect(result.points[0].second_offset).toBe(0);
      expect(result.points[59].second_offset).toBe(59);
      expect(new Date(result.points[59].timestamp).getTime()).toBe(fixedNow.getTime());
    });

    it('T1.2: correctly maps event timestamps to the exact second offset bin', () => {
      const events: RawTelemetryEvent[] = [
        {
          id: 'ev_1',
          timestamp: new Date(fixedNow.getTime() - 10_000).toISOString(), // 10s ago -> offset 49
          visitor_hash: 'vh_abc',
          session_hash: 'sh_123',
          event_type: 'page_view',
        },
        {
          id: 'ev_2',
          timestamp: new Date(fixedNow.getTime() - 30_000).toISOString(), // 30s ago -> offset 29
          visitor_hash: 'vh_def',
          session_hash: 'sh_456',
          event_type: 'product_view',
        },
      ];

      const result = compute60sVelocityChart(events, fixedNow);
      expect(result.total_events_60s).toBe(2);
      expect(result.unique_visitors_60s).toBe(2);
      expect(result.points[49].event_count).toBe(1);
      expect(result.points[29].event_count).toBe(1);
      expect(result.points[0].event_count).toBe(0);
    });

    it('T1.3: expires and excludes events older than 60 seconds from the sliding window', () => {
      const events: RawTelemetryEvent[] = [
        {
          id: 'ev_old',
          timestamp: new Date(fixedNow.getTime() - 75_000).toISOString(), // 75s ago -> expired
          visitor_hash: 'vh_old',
          session_hash: 'sh_old',
          event_type: 'page_view',
        },
        {
          id: 'ev_fresh',
          timestamp: new Date(fixedNow.getTime() - 5_000).toISOString(), // 5s ago -> offset 54
          visitor_hash: 'vh_fresh',
          session_hash: 'sh_fresh',
          event_type: 'page_view',
        },
      ];

      const result = compute60sVelocityChart(events, fixedNow);
      expect(result.total_events_60s).toBe(1);
      expect(result.unique_visitors_60s).toBe(1);
      expect(result.points[54].event_count).toBe(1);
    });

    it('T1.4: deduplicates unique active visitors within the sliding 60-second buffer', () => {
      const events: RawTelemetryEvent[] = [
        {
          id: 'ev_1',
          timestamp: new Date(fixedNow.getTime() - 20_000).toISOString(),
          visitor_hash: 'vh_same_user',
          session_hash: 'sh_1',
          event_type: 'page_view',
        },
        {
          id: 'ev_2',
          timestamp: new Date(fixedNow.getTime() - 15_000).toISOString(),
          visitor_hash: 'vh_same_user',
          session_hash: 'sh_1',
          event_type: 'add_to_cart',
        },
        {
          id: 'ev_3',
          timestamp: new Date(fixedNow.getTime() - 10_000).toISOString(),
          visitor_hash: 'vh_same_user',
          session_hash: 'sh_1',
          event_type: 'checkout_started',
        },
      ];

      const result = compute60sVelocityChart(events, fixedNow);
      expect(result.total_events_60s).toBe(3);
      expect(result.unique_visitors_60s).toBe(1); // Same visitor
      expect(result.points[39].visitor_count).toBe(1);
      expect(result.points[44].visitor_count).toBe(1);
      expect(result.points[49].visitor_count).toBe(1);
    });

    it('T1.5: accurately computes peak events per second throughput', () => {
      const targetTime = new Date(fixedNow.getTime() - 12_000).toISOString();
      const events: RawTelemetryEvent[] = Array.from({ length: 15 }, (_, i) => ({
        id: `ev_${i}`,
        timestamp: targetTime,
        visitor_hash: `vh_${i}`,
        session_hash: `sh_${i}`,
        event_type: 'page_view',
      }));

      const result = compute60sVelocityChart(events, fixedNow);
      expect(result.peak_events_per_sec).toBe(15);
      expect(result.total_events_60s).toBe(15);
      expect(result.unique_visitors_60s).toBe(15);
    });

    // --- Tier 2: Boundary & Edge Cases (≥ 5 tests) ---
    it('T2.1: returns full 60 points with 0 counts on zero-traffic period', () => {
      const result = compute60sVelocityChart([], fixedNow);
      expect(result.total_events_60s).toBe(0);
      expect(result.unique_visitors_60s).toBe(0);
      expect(result.checkout_events_60s).toBe(0);
      expect(result.peak_events_per_sec).toBe(0);
      expect(result.points.every((p) => p.event_count === 0 && p.visitor_count === 0)).toBe(true);
    });

    it('T2.2: handles clock-skewed future timestamps by clamping to offset 59', () => {
      const futureTime = new Date(fixedNow.getTime() + 5_000).toISOString();
      const events: RawTelemetryEvent[] = [
        {
          id: 'ev_future',
          timestamp: futureTime,
          visitor_hash: 'vh_future',
          session_hash: 'sh_fut',
          event_type: 'page_view',
        },
      ];

      const result = compute60sVelocityChart(events, fixedNow);
      expect(result.total_events_60s).toBe(1);
      expect(result.points[59].event_count).toBe(1);
    });

    it('T2.3: handles massive burst traffic (10,000 events) without data loss or memory overflow', () => {
      const burstEvents: RawTelemetryEvent[] = Array.from({ length: 10_000 }, (_, i) => ({
        id: `ev_burst_${i}`,
        timestamp: new Date(fixedNow.getTime() - (i % 60) * 1000).toISOString(),
        visitor_hash: `vh_${i % 500}`, // 500 unique visitors
        session_hash: `sh_${i % 500}`,
        event_type: i % 10 === 0 ? 'order_placed' : 'page_view',
      }));

      const result = compute60sVelocityChart(burstEvents, fixedNow);
      expect(result.total_events_60s).toBe(10_000);
      expect(result.unique_visitors_60s).toBe(500);
      expect(result.checkout_events_60s).toBe(1000);
      expect(result.points).toHaveLength(60);
    });

    it('T2.4: groups sub-second millisecond timestamps (e.g. .100ms and .950ms) into the same second bin', () => {
      const baseMs = fixedNow.getTime() - 25_000;
      const events: RawTelemetryEvent[] = [
        {
          id: 'ev_ms1',
          timestamp: new Date(baseMs + 100).toISOString(),
          visitor_hash: 'vh_1',
          session_hash: 'sh_1',
          event_type: 'page_view',
        },
        {
          id: 'ev_ms2',
          timestamp: new Date(baseMs + 950).toISOString(),
          visitor_hash: 'vh_2',
          session_hash: 'sh_2',
          event_type: 'page_view',
        },
      ];

      const result = compute60sVelocityChart(events, fixedNow);
      expect(result.points[34].event_count).toBe(2);
      expect(result.points[34].visitor_count).toBe(2);
    });

    it('T2.5: handles malformed or invalid timestamp strings safely without throwing', () => {
      const events: RawTelemetryEvent[] = [
        {
          id: 'ev_invalid',
          timestamp: 'invalid-date-string-1234',
          visitor_hash: 'vh_bad',
          session_hash: 'sh_bad',
          event_type: 'page_view',
        },
        {
          id: 'ev_valid',
          timestamp: new Date(fixedNow.getTime() - 10_000).toISOString(),
          visitor_hash: 'vh_ok',
          session_hash: 'sh_ok',
          event_type: 'page_view',
        },
      ];

      const result = compute60sVelocityChart(events, fixedNow);
      expect(result.total_events_60s).toBe(1);
      expect(result.unique_visitors_60s).toBe(1);
    });

    // --- Tier 3: Combinatorial & Integration ---
    it('T3.1: simulates continuous 60-second real-time sliding ticks maintaining buffer integrity', () => {
      for (let tick = 0; tick < 5; tick++) {
        const tickTime = new Date(fixedNow.getTime() + tick * 1000);
        const tickEvents: RawTelemetryEvent[] = [
          {
            id: `ev_tick_${tick}`,
            timestamp: tickTime.toISOString(),
            visitor_hash: `vh_tick_${tick}`,
            session_hash: `sh_tick_${tick}`,
            event_type: 'page_view',
          },
        ];
        const res = compute60sVelocityChart(tickEvents, tickTime);
        expect(res.points).toHaveLength(60);
        expect(res.points[59].event_count).toBe(1);
      }
    });
  });

  // ==========================================================================
  // FEATURE 3: Live checkout micro-ticker & anomaly alerts (R1)
  // ==========================================================================
  describe('Feature 3: Live checkout micro-ticker & anomaly alerts (R1)', () => {
    const fixedTime = '2026-08-14T12:00:00.000Z';

    const sampleCheckouts: LiveCheckoutItem[] = [
      {
        id: 'chk_1',
        order_id: 'ord_1',
        store_name: 'Artisan Med',
        subdomain: 'artisan',
        amount_tnd: 120.500,
        payment_gateway: 'flouci',
        status: 'captured',
        governorate_code: 'TUN',
        governorate_name: 'Tunis',
        country_code: 'TN',
        occurred_at: '2026-08-14T11:59:55.000Z',
      },
      {
        id: 'chk_2',
        order_id: 'ord_2',
        store_name: 'Carthage Olive Oil',
        subdomain: 'carthage',
        amount_tnd: 450.000,
        payment_gateway: 'konnect',
        status: 'captured',
        governorate_code: 'SOU',
        governorate_name: 'Sousse',
        country_code: 'TN',
        occurred_at: '2026-08-14T11:59:50.000Z',
      },
      {
        id: 'chk_3',
        order_id: 'ord_3',
        store_name: 'Sahara Crafts',
        subdomain: 'sahara',
        amount_tnd: 85.000,
        payment_gateway: 'stripe',
        status: 'captured',
        governorate_code: null,
        governorate_name: null,
        country_code: 'FR',
        occurred_at: '2026-08-14T11:59:40.000Z',
      },
    ];

    // --- Tier 1: Happy Path & Core Behavior (≥ 5 tests) ---
    it('T1.1: builds reverse chronological micro-ticker list with correct metadata', () => {
      const res = evaluateCheckoutMicroTickerAndAnomalies(sampleCheckouts);
      expect(res.ticker).toHaveLength(3);
      expect(res.ticker[0].id).toBe('chk_1'); // Most recent first
      expect(res.ticker[0].governorate_code).toBe('TUN');
      expect(res.ticker[2].country_code).toBe('FR');
      expect(res.metrics.total_volume_tnd).toBe(655.5);
    });

    it('T1.2: caps micro-ticker to maxItems (default 20) while maintaining complete metrics', () => {
      const checkouts: LiveCheckoutItem[] = Array.from({ length: 35 }, (_, i) => ({
        id: `chk_${i}`,
        order_id: `ord_${i}`,
        store_name: `Store ${i}`,
        subdomain: `store${i}`,
        amount_tnd: 50.000,
        payment_gateway: 'flouci',
        status: 'captured',
        governorate_code: 'SFA',
        governorate_name: 'Sfax',
        country_code: 'TN',
        occurred_at: new Date(new Date(fixedTime).getTime() - i * 1000).toISOString(),
      }));

      const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20);
      expect(res.ticker).toHaveLength(20);
      expect(res.metrics.total_recent).toBe(35);
      expect(res.metrics.captured_count).toBe(35);
      expect(res.metrics.total_volume_tnd).toBe(1750);
    });

    it('T1.3: triggers warning anomaly alert when failure rate exceeds 30%', () => {
      const checkouts: LiveCheckoutItem[] = [
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `chk_fail_${i}`,
          order_id: `ord_f_${i}`,
          store_name: 'Store',
          subdomain: 'store',
          amount_tnd: 100,
          payment_gateway: 'flouci' as const,
          status: 'failed' as const,
          governorate_code: 'TUN',
          governorate_name: 'Tunis',
          country_code: 'TN',
          occurred_at: fixedTime,
        })),
        ...Array.from({ length: 14 }, (_, i) => ({
          id: `chk_cap_${i}`,
          order_id: `ord_c_${i}`,
          store_name: 'Store',
          subdomain: 'store',
          amount_tnd: 100,
          payment_gateway: 'flouci' as const,
          status: 'captured' as const,
          governorate_code: 'TUN',
          governorate_name: 'Tunis',
          country_code: 'TN',
          occurred_at: fixedTime,
        })),
      ]; // 6 / 20 = 30.0% failure rate

      const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10, 30);
      expect(res.anomaly_alerts).toHaveLength(1);
      expect(res.anomaly_alerts[0].level).toBe('warning');
      expect(res.anomaly_alerts[0].metric).toBe('checkout_failure_rate');
      expect(res.metrics.failure_rate_pct).toBe(30);
    });

    it('T1.4: triggers critical anomaly alert when failure rate reaches 50% or higher', () => {
      const checkouts: LiveCheckoutItem[] = [
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `chk_fail_${i}`,
          order_id: `ord_f_${i}`,
          store_name: 'Store',
          subdomain: 'store',
          amount_tnd: 100,
          payment_gateway: 'konnect' as const,
          status: 'failed' as const,
          governorate_code: 'TUN',
          governorate_name: 'Tunis',
          country_code: 'TN',
          occurred_at: fixedTime,
        })),
        ...Array.from({ length: 4 }, (_, i) => ({
          id: `chk_cap_${i}`,
          order_id: `ord_c_${i}`,
          store_name: 'Store',
          subdomain: 'store',
          amount_tnd: 100,
          payment_gateway: 'konnect' as const,
          status: 'captured' as const,
          governorate_code: 'TUN',
          governorate_name: 'Tunis',
          country_code: 'TN',
          occurred_at: fixedTime,
        })),
      ]; // 6 / 10 = 60% failure rate

      const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10, 30);
      expect(res.anomaly_alerts.some((a) => a.level === 'critical')).toBe(true);
    });

    it('T1.5: detects high-value whale orders (amount >= 5,000 TND) and logs info alert', () => {
      const checkouts: LiveCheckoutItem[] = [
        {
          id: 'chk_whale',
          order_id: 'ord_whale',
          store_name: 'Luxury Carpets Kairouan',
          subdomain: 'luxurycarpets',
          amount_tnd: 8500.000,
          payment_gateway: 'manual_mandat',
          status: 'captured',
          governorate_code: 'KAI',
          governorate_name: 'Kairouan',
          country_code: 'TN',
          occurred_at: fixedTime,
        },
      ];

      const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts);
      expect(res.anomaly_alerts.some((a) => a.metric === 'whale_order_detected')).toBe(true);
      expect(res.anomaly_alerts[0].value).toBe(8500);
    });

    // --- Tier 2: Boundary & Edge Cases (≥ 5 tests) ---
    it('T2.1: returns empty ticker and zero alerts on zero checkouts', () => {
      const res = evaluateCheckoutMicroTickerAndAnomalies([]);
      expect(res.ticker).toEqual([]);
      expect(res.anomaly_alerts).toEqual([]);
      expect(res.metrics.total_recent).toBe(0);
      expect(res.metrics.failure_rate_pct).toBe(0);
    });

    it('T2.2: handles 100% gateway failure rate across all attempts', () => {
      const checkouts: LiveCheckoutItem[] = Array.from({ length: 8 }, (_, i) => ({
        id: `chk_fail_${i}`,
        order_id: `ord_f_${i}`,
        store_name: 'Store',
        subdomain: 'store',
        amount_tnd: 50,
        payment_gateway: 'flouci',
        status: 'failed',
        governorate_code: 'TUN',
        governorate_name: 'Tunis',
        country_code: 'TN',
        occurred_at: fixedTime,
      }));

      const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts);
      expect(res.metrics.failure_rate_pct).toBe(100);
      expect(res.metrics.captured_count).toBe(0);
      expect(res.metrics.total_volume_tnd).toBe(0);
      expect(res.anomaly_alerts[0].level).toBe('critical');
    });

    it('T2.3: does not trigger failure alert when sample size is below minimum threshold (< 5)', () => {
      const checkouts: LiveCheckoutItem[] = [
        {
          id: 'chk_f1',
          order_id: 'ord_f1',
          store_name: 'Store',
          subdomain: 'store',
          amount_tnd: 50,
          payment_gateway: 'flouci',
          status: 'failed',
          governorate_code: 'TUN',
          governorate_name: 'Tunis',
          country_code: 'TN',
          occurred_at: fixedTime,
        },
      ]; // 1 / 1 = 100% failure rate, but sample < 5

      const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts);
      expect(res.anomaly_alerts.filter((a) => a.metric === 'checkout_failure_rate')).toHaveLength(0);
    });

    it('T2.4: triggers velocity surge alert when checkout volume exceeds 3x baseline', () => {
      const checkouts: LiveCheckoutItem[] = Array.from({ length: 35 }, (_, i) => ({
        id: `chk_${i}`,
        order_id: `ord_${i}`,
        store_name: 'Store',
        subdomain: 'store',
        amount_tnd: 20,
        payment_gateway: 'cod',
        status: 'captured',
        governorate_code: 'SOU',
        governorate_name: 'Sousse',
        country_code: 'TN',
        occurred_at: fixedTime,
      })); // 35 > 10 * 3

      const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10);
      expect(res.anomaly_alerts.some((a) => a.metric === 'checkout_velocity_surge')).toBe(true);
    });

    it('T2.5: handles null governorates for diaspora checkout events smoothly', () => {
      const diasporaCheckouts: LiveCheckoutItem[] = [
        {
          id: 'chk_diaspora',
          order_id: 'ord_diasp',
          store_name: 'Tunisian Spices',
          subdomain: 'spices',
          amount_tnd: 240.000,
          payment_gateway: 'stripe',
          status: 'captured',
          governorate_code: null,
          governorate_name: null,
          country_code: 'DE',
          occurred_at: fixedTime,
        },
      ];

      const res = evaluateCheckoutMicroTickerAndAnomalies(diasporaCheckouts);
      expect(res.ticker[0].governorate_code).toBeNull();
      expect(res.ticker[0].country_code).toBe('DE');
    });

    // --- Tier 3: Combinatorial & Integration ---
    it('T3.1: simultaneous multi-gateway failure cascade triggering multiple alerts concurrently', () => {
      const checkouts: LiveCheckoutItem[] = [
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `chk_fail_${i}`,
          order_id: `ord_f_${i}`,
          store_name: 'Store',
          subdomain: 'store',
          amount_tnd: 5500, // Also triggers whale alert
          payment_gateway: (i % 2 === 0 ? 'flouci' : 'konnect') as 'flouci' | 'konnect',
          status: 'failed' as const,
          governorate_code: 'TUN',
          governorate_name: 'Tunis',
          country_code: 'TN',
          occurred_at: fixedTime,
        })),
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `chk_cap_${i}`,
          order_id: `ord_c_${i}`,
          store_name: 'Store',
          subdomain: 'store',
          amount_tnd: 100,
          payment_gateway: 'cod' as const,
          status: 'captured' as const,
          governorate_code: 'SFA',
          governorate_name: 'Sfax',
          country_code: 'TN',
          occurred_at: fixedTime,
        })),
      ]; // Total 35 checkouts (> 3x baseline 10), failure rate 20/35 = 57.1% (critical), whale orders present

      const res = evaluateCheckoutMicroTickerAndAnomalies(checkouts, 20, 10, 30);
      expect(res.anomaly_alerts.length).toBeGreaterThanOrEqual(3);
      expect(res.anomaly_alerts.some((a) => a.level === 'critical')).toBe(true);
      expect(res.anomaly_alerts.some((a) => a.metric === 'checkout_velocity_surge')).toBe(true);
      expect(res.anomaly_alerts.some((a) => a.metric === 'whale_order_detected')).toBe(true);
    });
  });

  // ==========================================================================
  // FEATURE 4: Tri-Fold Financial Reconciliation (R2)
  // ==========================================================================
  describe('Feature 4: Tri-Fold Financial Reconciliation (R2)', () => {
    const mockOrders: OrderReconciliationItem[] = [
      {
        id: 'ord_1',
        store_id: 'str_1',
        subtotal_tnd: 1000,
        shipping_tnd: 50,
        total_tnd: 1050,
        commission_rate_pct: 10, // 10% on 1000 = 100 commission, 950 seller
        status: 'paid',
        payout_status: 'pending_escrow',
      },
      {
        id: 'ord_2',
        store_id: 'str_2',
        subtotal_tnd: 2000,
        shipping_tnd: 100,
        total_tnd: 2100,
        commission_rate_pct: 5, // 5% on 2000 = 100 commission, 2000 seller
        status: 'delivered',
        payout_status: 'released',
      },
      {
        id: 'ord_3',
        store_id: 'str_3',
        subtotal_tnd: 500,
        shipping_tnd: 20,
        total_tnd: 520,
        commission_rate_pct: 8,
        status: 'refunded',
        payout_status: 'held',
      },
      {
        id: 'ord_4',
        store_id: 'str_4',
        subtotal_tnd: 300,
        shipping_tnd: 15,
        total_tnd: 315,
        commission_rate_pct: 8,
        status: 'cancelled',
        payout_status: 'held',
      },
    ];

    // --- Tier 1: Happy Path & Core Behavior (≥ 5 tests) ---
    it('T1.1: computes Gross GMV including marketplace orders, SaaS subscriptions, and Ads revenue', () => {
      // Marketplace valid GMV: 1050 + 2100 + 520 (refunded included in gross) = 3670
      // SaaS: 500, Ads: 200 -> Gross GMV = 4370 TND
      const rep = computeTriFoldReconciliation(mockOrders, 500, 200);
      expect(rep.gross_gmv.tnd).toBe(4370);
      expect(rep.marketplace_order_gmv.tnd).toBe(3670);
      expect(rep.subscription_revenue.tnd).toBe(500);
      expect(rep.ads_revenue.tnd).toBe(200);
    });

    it('T1.2: computes platform net commission take accurately based on seller tier commission rates', () => {
      // ord_1: 10% of 1000 = 100; ord_2: 5% of 2000 = 100 -> total commission = 200 TND
      const rep = computeTriFoldReconciliation(mockOrders, 500, 200);
      expect(rep.platform_net_commission_take.tnd).toBe(200);
      expect(rep.total_platform_net_revenue.tnd).toBe(900); // 200 + 500 + 200
    });

    it('T1.3: computes escrow floating balance accurately from pending payouts', () => {
      // ord_1 pending: 1050 - 100 = 950 TND
      const rep = computeTriFoldReconciliation(mockOrders, 500, 200);
      expect(rep.escrow_floating_balance.tnd).toBe(950);
      expect(rep.pending_vendor_payouts.tnd).toBe(950);
      expect(rep.settled_vendor_payouts.tnd).toBe(2000); // ord_2: 2100 - 100 = 2000
    });

    it('T1.4: verifies tri-fold balance integrity check (GMV = Settled + Escrow + Commission + Refunds)', () => {
      // Marketplace GMV: 3670 == 2000 (settled) + 950 (escrow) + 200 (commission) + 520 (refunds)
      const rep = computeTriFoldReconciliation(mockOrders, 500, 200);
      expect(rep.reconciliation_balance_check.balanced).toBe(true);
      expect(rep.reconciliation_balance_check.discrepancy_tnd).toBe(0);
      expect(rep.reconciliation_balance_check.calculated_sum_tnd).toBe(3670);
    });

    it('T1.5: computes effective take rate percentage correctly', () => {
      // 200 / 3670 = 5.4495...% -> 5.45%
      const rep = computeTriFoldReconciliation(mockOrders, 500, 200);
      expect(rep.effective_take_rate_pct).toBe(5.45);
    });

    // --- Tier 2: Boundary & Edge Cases (≥ 5 tests) ---
    it('T2.1: returns all zeros on empty order list with 0 SaaS and Ads revenue', () => {
      const rep = computeTriFoldReconciliation([], 0, 0);
      expect(rep.gross_gmv.tnd).toBe(0);
      expect(rep.platform_net_commission_take.tnd).toBe(0);
      expect(rep.escrow_floating_balance.tnd).toBe(0);
      expect(rep.effective_take_rate_pct).toBe(0);
      expect(rep.reconciliation_balance_check.balanced).toBe(true);
    });

    it('T2.2: handles 100% refund scenario correctly adjusting escrow and net commission', () => {
      const refundedOrders: OrderReconciliationItem[] = [
        {
          id: 'ord_ref_1',
          store_id: 'str_1',
          subtotal_tnd: 500,
          shipping_tnd: 0,
          total_tnd: 500,
          commission_rate_pct: 10,
          status: 'refunded',
          payout_status: 'held',
        },
      ];

      const rep = computeTriFoldReconciliation(refundedOrders, 0, 0);
      expect(rep.marketplace_order_gmv.tnd).toBe(500);
      expect(rep.platform_net_commission_take.tnd).toBe(0);
      expect(rep.escrow_floating_balance.tnd).toBe(0);
      expect(rep.refunds_deducted.tnd).toBe(500);
      expect(rep.reconciliation_balance_check.balanced).toBe(true);
    });

    it('T2.3: handles 0% commission vendor tier (e.g. promotional plan) correctly', () => {
      const promoOrders: OrderReconciliationItem[] = [
        {
          id: 'ord_promo',
          store_id: 'str_promo',
          subtotal_tnd: 1000,
          shipping_tnd: 0,
          total_tnd: 1000,
          commission_rate_pct: 0, // 0% commission
          status: 'paid',
          payout_status: 'pending_escrow',
        },
      ];

      const rep = computeTriFoldReconciliation(promoOrders, 0, 0);
      expect(rep.platform_net_commission_take.tnd).toBe(0);
      expect(rep.escrow_floating_balance.tnd).toBe(1000);
      expect(rep.effective_take_rate_pct).toBe(0);
      expect(rep.reconciliation_balance_check.balanced).toBe(true);
    });

    it('T2.4: maintains precision without floating point inaccuracies with 3 decimal millimes', () => {
      const microOrders: OrderReconciliationItem[] = [
        {
          id: 'ord_m1',
          store_id: 'str_1',
          subtotal_tnd: 33.333,
          shipping_tnd: 7.123,
          total_tnd: 40.456,
          commission_rate_pct: 10,
          status: 'paid',
          payout_status: 'pending_escrow',
        },
      ];

      const rep = computeTriFoldReconciliation(microOrders, 0, 0);
      expect(rep.reconciliation_balance_check.balanced).toBe(true);
      expect(rep.reconciliation_balance_check.discrepancy_tnd).toBeLessThan(0.001);
    });

    it('T2.5: handles cancelled orders by completely excluding them from GMV and payouts', () => {
      const cancelledOnly: OrderReconciliationItem[] = [
        {
          id: 'ord_cancel',
          store_id: 'str_1',
          subtotal_tnd: 800,
          shipping_tnd: 50,
          total_tnd: 850,
          commission_rate_pct: 10,
          status: 'cancelled',
          payout_status: 'held',
        },
      ];

      const rep = computeTriFoldReconciliation(cancelledOnly, 100, 0);
      expect(rep.marketplace_order_gmv.tnd).toBe(0);
      expect(rep.gross_gmv.tnd).toBe(100); // Only SaaS
      expect(rep.escrow_floating_balance.tnd).toBe(0);
    });

    // --- Tier 3: Combinatorial & Integration ---
    it('T3.1: large-scale multi-vendor reconciliation across 500 mixed orders', () => {
      const largeBatch: OrderReconciliationItem[] = Array.from({ length: 500 }, (_, i) => ({
        id: `ord_${i}`,
        store_id: `str_${i % 20}`,
        subtotal_tnd: 100 + (i % 50),
        shipping_tnd: 10,
        total_tnd: 110 + (i % 50),
        commission_rate_pct: i % 4 === 0 ? 5 : i % 4 === 1 ? 8 : i % 4 === 2 ? 10 : 12,
        status: i % 25 === 0 ? 'refunded' : i % 30 === 0 ? 'cancelled' : i % 2 === 0 ? 'paid' : 'delivered',
        payout_status: i % 25 === 0 || i % 30 === 0 ? 'held' : i % 2 === 0 ? 'pending_escrow' : 'released',
      }));

      const rep = computeTriFoldReconciliation(largeBatch, 15_000, 3_500);
      expect(rep.reconciliation_balance_check.balanced).toBe(true);
      expect(rep.reconciliation_balance_check.discrepancy_tnd).toBe(0);
      expect(rep.gross_gmv.tnd).toBeGreaterThan(50_000);
      expect(rep.platform_net_commission_take.tnd).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // FEATURE 7: Multi-currency normalization engine (R2)
  // ==========================================================================
  describe('Feature 7: Multi-currency normalization engine (R2)', () => {
    // --- Tier 1: Happy Path & Core Behavior (≥ 5 tests) ---
    it('T1.1: converts TND to EUR with 2 decimal places using standard FX rate (3.350 TND/EUR)', () => {
      const norm = normalizeCurrency(3350.000); // 3350 TND / 3.350 = 1000.00 EUR
      expect(norm.eur).toBe(1000.00);
      expect(norm.formatted_eur).toBe('€1,000.00');
    });

    it('T1.2: converts TND to USD with 2 decimal places using standard FX rate (3.100 TND/USD)', () => {
      const norm = normalizeCurrency(3100.000); // 3100 TND / 3.100 = 1000.00 USD
      expect(norm.usd).toBe(1000.00);
      expect(norm.formatted_usd).toBe('$1,000.00');
    });

    it('T1.3: preserves TND precision with exactly 3 decimal places (millimes)', () => {
      const norm = normalizeCurrency(1234.567);
      expect(norm.tnd).toBe(1234.567);
      expect(norm.formatted_tnd).toBe('1,234.567 TND');
    });

    it('T1.4: formats currency values based on requested currency code', () => {
      const resTnd = formatCurrencyByCode(1500, 'TND');
      expect(resTnd.currency).toBe('TND');
      expect(resTnd.formatted).toBe('1,500.000 TND');

      const resEur = formatCurrencyByCode(1500, 'EUR');
      expect(resEur.currency).toBe('EUR');
      expect(resEur.amount).toBe(447.76); // 1500 / 3.350 = 447.761... -> 447.76
      expect(resEur.formatted).toBe('€447.76');

      const resUsd = formatCurrencyByCode(1500, 'USD');
      expect(resUsd.currency).toBe('USD');
      expect(resUsd.amount).toBe(483.87); // 1500 / 3.100 = 483.8709... -> 483.87
      expect(resUsd.formatted).toBe('$483.87');
    });

    it('T1.5: supports custom dynamic FX rates passed into the normalization function', () => {
      const customRates = { EUR_TO_TND: 3.500, USD_TO_TND: 3.200 };
      const norm = normalizeCurrency(3500, customRates);
      expect(norm.eur).toBe(1000.00);
      expect(norm.usd).toBe(1093.75);
    });

    // --- Tier 2: Boundary & Edge Cases (≥ 5 tests) ---
    it('T2.1: formats 0 TND accurately across all 3 currencies', () => {
      const norm = normalizeCurrency(0);
      expect(norm.tnd).toBe(0);
      expect(norm.eur).toBe(0);
      expect(norm.usd).toBe(0);
      expect(norm.formatted_tnd).toBe('0.000 TND');
      expect(norm.formatted_eur).toBe('€0.00');
      expect(norm.formatted_usd).toBe('$0.00');
    });

    it('T2.2: handles sub-cent fractional amounts (1 millime = 0.001 TND) without rounding errors', () => {
      const norm = normalizeCurrency(0.001);
      expect(norm.tnd).toBe(0.001);
      expect(norm.eur).toBe(0.00);
      expect(norm.usd).toBe(0.00);
      expect(norm.formatted_tnd).toBe('0.001 TND');
    });

    it('T2.3: handles negative numbers (refunds / adjustments) preserving negative signs', () => {
      const norm = normalizeCurrency(-150.750);
      expect(norm.tnd).toBe(-150.750);
      expect(norm.eur).toBe(-45.00); // -150.750 / 3.350 = -45.00
      expect(norm.usd).toBe(-48.63); // -150.750 / 3.100 = -48.629... -> -48.63
      expect(norm.formatted_tnd).toBe('-150.750 TND');
    });

    it('T2.4: throws PdValidationError for NaN or non-finite inputs', () => {
      expect(() => normalizeCurrency(NaN)).toThrow(PdValidationError);
      expect(() => normalizeCurrency(Infinity)).toThrow(PdValidationError);
      expect(() => normalizeCurrency(-Infinity)).toThrow(PdValidationError);
    });

    it('T2.5: handles large numbers in billions of millimes without overflow', () => {
      const norm = normalizeCurrency(10_000_000.500);
      expect(norm.tnd).toBe(10000000.5);
      expect(norm.formatted_tnd).toBe('10,000,000.500 TND');
      expect(norm.eur).toBeCloseTo(2985074.78, 1);
    });

    // --- Tier 3: Combinatorial & Integration ---
    it('T3.1: multi-currency round-trip conversion invariance holds within monetary tolerance', () => {
      const testValues = [10.500, 100.000, 250.750, 1250.000, 9999.999];
      for (const val of testValues) {
        const norm = normalizeCurrency(val);
        // Re-convert EUR back to TND
        const reconvertedTndFromEur = norm.eur * PLATFORM_FX_RATES.EUR_TO_TND;
        expect(Math.abs(reconvertedTndFromEur - val)).toBeLessThan(0.05); // within 50 millimes precision
      }
    });
  });
});
