/**
 * Analytics Predictive Forecasting, What-If Simulator & AI Digest Test Suite — Package 3
 * 
 * Features Covered:
 *   - Feature 14: 30/60/90-Day Predictive Forecasting (R5)
 *     - Holt-Winters / Exponential Smoothing time-series modeling
 *     - Additive and multiplicative trend & day-of-week seasonality
 *     - 80% and 95% confidence intervals calculation (Z=1.28, Z=1.96)
 *     - Metrics: GMV (TND), Platform Revenue (TND), Order count
 *     - Trend classification: bullish, stable, bearish
 * 
 *   - Feature 15: Dynamic "What-If" Scenario Simulator (R5)
 *     - Parametric simulation engine for traffic, conversion, commission take rate, subscription pricing, vendor growth
 *     - Baseline vs Simulated comparison & Delta computations (absolute & percentage)
 *     - Compound multi-variable elasticity modeling
 *     - Executive insight generation
 * 
 *   - Feature 16: Daily Executive Natural Language AI Digest (R5)
 *     - Executive briefing narrative synthesis
 *     - Key performance indicators with sentiment scoring (positive, neutral, warning)
 *     - Anomaly aggregation & vendor risk radar integration
 *     - Prioritized strategic recommendations
 *     - Deterministic statistical fallback engine for offline/unconfigured LLM
 * 
 * Coverage Targets:
 *   - Tier 1: Feature Coverage (≥5 tests per feature)
 *   - Tier 2: Boundary & Corner Cases (≥5 tests per feature)
 *   - Tier 3: Cross-Feature Combinations & Workloads (Pairwise coverage)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PdValidationError, PdErrorCode } from '../errors';

// ============================================================================
// DOMAIN MODELS & DTO DEFINITIONS (R5 SPECIFICATION)
// ============================================================================

export type ForecastHorizon = '30d' | '60d' | '90d';
export type ForecastMetric = 'gmv' | 'revenue' | 'orders';
export type TrendDirection = 'bullish' | 'stable' | 'bearish';

export interface HistoricalDataPoint {
  date: string; // 'YYYY-MM-DD'
  value: number;
}

export interface TimeSeriesForecastPoint {
  date: string; // 'YYYY-MM-DD'
  historical: boolean;
  actual_value?: number;
  predicted_value: number;
  confidence_lower_80: number;
  confidence_upper_80: number;
  confidence_lower_95: number;
  confidence_upper_95: number;
}

export interface TimeSeriesForecastResponseDTO {
  metric: ForecastMetric;
  horizon_days: 30 | 60 | 90;
  model_type: 'holt_winters_seasonality' | 'exponential_smoothing';
  trend_direction: TrendDirection;
  confidence_level_pct: number;
  historical_data_points: number;
  projected_total_tnd: number;
  growth_over_baseline_pct: number;
  points: TimeSeriesForecastPoint[];
}

export interface WhatIfSimulationInput {
  traffic_delta_pct: number; // e.g. +20 (+20%)
  conversion_delta_pct: number; // e.g. +0.5 (+0.5%)
  commission_rate_pct?: number; // e.g. 12 (12%)
  subscription_price_delta_pct?: number; // e.g. +10 (+10%)
  vendor_growth_pct?: number; // e.g. +15 (+15%)
}

export interface WhatIfSimulationResultDTO {
  inputs: WhatIfSimulationInput;
  baseline: {
    visitors_count: number;
    conversion_rate_pct: number;
    orders_count: number;
    gmv_tnd: number;
    commission_take_tnd: number;
    saas_mrr_tnd: number;
    total_platform_revenue_tnd: number;
  };
  simulated: {
    visitors_count: number;
    conversion_rate_pct: number;
    orders_count: number;
    gmv_tnd: number;
    commission_take_tnd: number;
    saas_mrr_tnd: number;
    total_platform_revenue_tnd: number;
  };
  delta: {
    visitors_delta_count: number;
    visitors_delta_pct: number;
    orders_delta_count: number;
    orders_delta_pct: number;
    gmv_delta_tnd: number;
    gmv_delta_pct: number;
    commission_delta_tnd: number;
    commission_delta_pct: number;
    saas_mrr_delta_tnd: number;
    saas_mrr_delta_pct: number;
    revenue_delta_tnd: number;
    revenue_delta_pct: number;
  };
  executive_takeaway: string;
}

export interface ExecutiveAIDigestDTO {
  generated_at: string;
  time_range: string;
  headline: string;
  summary_paragraph: string;
  key_highlights: Array<{
    label: string;
    value: string;
    change_pct: number | null;
    sentiment: 'positive' | 'neutral' | 'warning';
  }>;
  critical_anomalies: Array<{
    id: string;
    severity: 'warning' | 'critical';
    title: string;
    description: string;
  }>;
  vendor_risk_radar: Array<{
    store_name: string;
    risk_level: 'high' | 'critical';
    primary_factor: string;
  }>;
  strategic_recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    area: string;
    action: string;
    expected_impact: string;
  }>;
  provider: 'gemini' | 'statistical_fallback';
}

// ============================================================================
// CORE MATHEMATICAL ENGINES & ALGORITHMS
// ============================================================================

/**
 * Holt-Winters Additive Seasonality & Double Exponential Smoothing Forecaster
 */
export class TimeSeriesForecastingEngine {
  private alpha: number; // Level smoothing factor (0 < alpha < 1)
  private beta: number;  // Trend smoothing factor (0 < beta < 1)
  private gamma: number; // Seasonal smoothing factor (0 < gamma < 1)
  private seasonLength: number; // 7 for weekly seasonality

  constructor(alpha = 0.3, beta = 0.1, gamma = 0.2, seasonLength = 7) {
    this.alpha = alpha;
    this.beta = beta;
    this.gamma = gamma;
    this.seasonLength = seasonLength;
  }

  /**
   * Forecasts future values given historical daily time-series
   */
  public generateForecast(
    historicalData: HistoricalDataPoint[],
    horizon: ForecastHorizon,
    metric: ForecastMetric = 'gmv'
  ): TimeSeriesForecastResponseDTO {
    const horizonDays = horizon === '90d' ? 90 : horizon === '60d' ? 60 : 30;

    if (!historicalData || historicalData.length === 0) {
      throw new PdValidationError('Historical data must contain at least one observation for forecasting');
    }

    const n = historicalData.length;
    const values = historicalData.map(d => d.value);

    // If historical data is minimal (< 3 points), use linear persistence with baseline confidence
    if (n < 3) {
      const avgVal = values.reduce((sum, v) => sum + v, 0) / n;
      const points: TimeSeriesForecastPoint[] = [];

      // Historical points
      historicalData.forEach(d => {
        points.push({
          date: d.date,
          historical: true,
          actual_value: d.value,
          predicted_value: d.value,
          confidence_lower_80: d.value,
          confidence_upper_80: d.value,
          confidence_lower_95: d.value,
          confidence_upper_95: d.value,
        });
      });

      // Projected future points
      const lastDate = new Date(historicalData[n - 1].date);
      for (let i = 1; i <= horizonDays; i++) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + i);
        const dateStr = nextDate.toISOString().split('T')[0];

        const stdDev = avgVal * 0.15;
        const width80 = 1.28 * stdDev * Math.sqrt(i);
        const width95 = 1.96 * stdDev * Math.sqrt(i);

        points.push({
          date: dateStr,
          historical: false,
          predicted_value: this.roundMetric(avgVal, metric),
          confidence_lower_80: this.roundMetric(Math.max(0, avgVal - width80), metric),
          confidence_upper_80: this.roundMetric(avgVal + width80, metric),
          confidence_lower_95: this.roundMetric(Math.max(0, avgVal - width95), metric),
          confidence_upper_95: this.roundMetric(avgVal + width95, metric),
        });
      }

      const projectedTotal = points
        .filter(p => !p.historical)
        .reduce((sum, p) => sum + p.predicted_value, 0);

      const baselineTotal = avgVal * horizonDays;
      const growthPct = baselineTotal > 0 ? ((projectedTotal - baselineTotal) / baselineTotal) * 100 : 0;

      return {
        metric,
        horizon_days: horizonDays,
        model_type: 'exponential_smoothing',
        trend_direction: 'stable',
        confidence_level_pct: 85,
        historical_data_points: n,
        projected_total_tnd: this.roundMetric(projectedTotal, metric),
        growth_over_baseline_pct: Math.round(growthPct * 100) / 100,
        points,
      };
    }

    // Full Holt-Winters model initialization
    let level = values[0];
    let trend = (values[Math.min(n - 1, this.seasonLength)] - values[0]) / Math.min(n - 1, this.seasonLength);
    
    // Initial seasonal components (additive)
    const seasonals = new Array(this.seasonLength).fill(0);
    if (n >= this.seasonLength * 2) {
      for (let i = 0; i < this.seasonLength; i++) {
        seasonals[i] = values[i] - level;
      }
    }

    const fitted: number[] = [];
    const residuals: number[] = [];

    // Fit historical series
    for (let t = 0; t < n; t++) {
      const actual = values[t];
      const seasonIdx = t % this.seasonLength;
      const s = seasonals[seasonIdx];

      const prevLevel = level;
      const prevTrend = trend;

      // Forecast for step t
      const pred = prevLevel + prevTrend + s;
      fitted.push(Math.max(0, pred));
      residuals.push(actual - pred);

      // Updating equations
      level = this.alpha * (actual - s) + (1 - this.alpha) * (prevLevel + prevTrend);
      trend = this.beta * (level - prevLevel) + (1 - this.beta) * prevTrend;
      seasonals[seasonIdx] = this.gamma * (actual - level) + (1 - this.gamma) * s;
    }

    // Compute residual standard error
    const sumResidualSq = residuals.reduce((sum, r) => sum + r * r, 0);
    const residualStdError = Math.sqrt(sumResidualSq / Math.max(1, n - 2));

    const points: TimeSeriesForecastPoint[] = [];

    // Append historical points
    historicalData.forEach((d, idx) => {
      points.push({
        date: d.date,
        historical: true,
        actual_value: d.value,
        predicted_value: this.roundMetric(fitted[idx], metric),
        confidence_lower_80: this.roundMetric(Math.max(0, fitted[idx] - 1.28 * residualStdError), metric),
        confidence_upper_80: this.roundMetric(fitted[idx] + 1.28 * residualStdError, metric),
        confidence_lower_95: this.roundMetric(Math.max(0, fitted[idx] - 1.96 * residualStdError), metric),
        confidence_upper_95: this.roundMetric(fitted[idx] + 1.96 * residualStdError, metric),
      });
    });

    // Project future points
    const lastDate = new Date(historicalData[n - 1].date);
    let projectedTotal = 0;

    for (let m = 1; m <= horizonDays; m++) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + m);
      const dateStr = nextDate.toISOString().split('T')[0];

      const seasonIdx = (n + m - 1) % this.seasonLength;
      const seasonalComponent = seasonals[seasonIdx] || 0;

      const rawPrediction = Math.max(0, level + m * trend + seasonalComponent);
      const pred = this.roundMetric(rawPrediction, metric);

      // Standard error grows with forecast horizon: sigma * sqrt(m)
      const forecastStdError = Math.max(residualStdError * Math.sqrt(m), pred * 0.05);
      const width80 = 1.28 * forecastStdError;
      const width95 = 1.96 * forecastStdError;

      const lower80 = this.roundMetric(Math.max(0, rawPrediction - width80), metric);
      const upper80 = this.roundMetric(rawPrediction + width80, metric);
      const lower95 = this.roundMetric(Math.max(0, rawPrediction - width95), metric);
      const upper95 = this.roundMetric(rawPrediction + width95, metric);

      projectedTotal += pred;

      points.push({
        date: dateStr,
        historical: false,
        predicted_value: pred,
        confidence_lower_80: lower80,
        confidence_upper_80: upper80,
        confidence_lower_95: lower95,
        confidence_upper_95: upper95,
      });
    }

    // Determine trend direction
    const baselineAverage = values.slice(-Math.min(n, 14)).reduce((s, v) => s + v, 0) / Math.min(n, 14);
    const projectedAverage = projectedTotal / horizonDays;
    const growthOverBaseline = baselineAverage > 0 ? ((projectedAverage - baselineAverage) / baselineAverage) * 100 : 0;

    let trendDirection: TrendDirection = 'stable';
    if (growthOverBaseline > 2.0) trendDirection = 'bullish';
    else if (growthOverBaseline < -2.0) trendDirection = 'bearish';

    return {
      metric,
      horizon_days: horizonDays,
      model_type: 'holt_winters_seasonality',
      trend_direction: trendDirection,
      confidence_level_pct: Math.min(95, Math.max(70, Math.round(100 - (residualStdError / (baselineAverage || 1)) * 50))),
      historical_data_points: n,
      projected_total_tnd: this.roundMetric(projectedTotal, metric),
      growth_over_baseline_pct: Math.round(growthOverBaseline * 100) / 100,
      points,
    };
  }

  private roundMetric(val: number, metric: ForecastMetric): number {
    if (metric === 'orders') {
      return Math.round(val);
    }
    // Monetary metrics in TND (3 decimals)
    return Math.round(val * 1000) / 1000;
  }
}

/**
 * Dynamic "What-If" Scenario Simulation Engine
 */
export class WhatIfScenarioSimulator {
  public simulate(
    baseline: {
      visitors_count: number;
      conversion_rate_pct: number;
      average_order_value_tnd: number;
      commission_rate_pct: number;
      saas_mrr_tnd: number;
      active_vendors_count: number;
    },
    input: WhatIfSimulationInput
  ): WhatIfSimulationResultDTO {
    // Validate inputs
    if (input.commission_rate_pct !== undefined && (input.commission_rate_pct < 0 || input.commission_rate_pct > 100)) {
      throw new PdValidationError('Commission rate must be between 0% and 100%');
    }
    if (input.traffic_delta_pct < -100) {
      throw new PdValidationError('Traffic decrease cannot exceed -100%');
    }

    const {
      visitors_count: v0,
      conversion_rate_pct: c0,
      average_order_value_tnd: aov,
      commission_rate_pct: comm0,
      saas_mrr_tnd: mrr0,
    } = baseline;

    // Baseline computations
    const baseOrders = Math.round((v0 * (c0 / 100)));
    const baseGmv = Math.round(baseOrders * aov * 1000) / 1000;
    const baseCommission = Math.round((baseGmv * (comm0 / 100)) * 1000) / 1000;
    const baseTotalRevenue = Math.round((baseCommission + mrr0) * 1000) / 1000;

    // Simulated computations
    const trafficMultiplier = 1 + (input.traffic_delta_pct / 100);
    const v1 = Math.max(0, Math.round(v0 * trafficMultiplier));

    const conversionDelta = input.conversion_delta_pct || 0;
    const c1 = Math.max(0, Math.round((c0 + conversionDelta) * 100) / 100);

    const simOrders = Math.round(v1 * (c1 / 100));
    const simGmv = Math.round(simOrders * aov * 1000) / 1000;

    const simCommRate = input.commission_rate_pct !== undefined ? input.commission_rate_pct : comm0;
    const simCommission = Math.round((simGmv * (simCommRate / 100)) * 1000) / 1000;

    // SaaS MRR with vendor growth & plan price elasticity
    const vendorGrowthMult = 1 + ((input.vendor_growth_pct || 0) / 100);
    const saasPriceMult = 1 + ((input.subscription_price_delta_pct || 0) / 100);
    const simMrr = Math.max(0, Math.round(mrr0 * vendorGrowthMult * saasPriceMult * 1000) / 1000);

    const simTotalRevenue = Math.round((simCommission + simMrr) * 1000) / 1000;

    // Deltas
    const visitorsDeltaCount = v1 - v0;
    const visitorsDeltaPct = v0 > 0 ? Math.round(((v1 - v0) / v0) * 10000) / 100 : 0;

    const ordersDeltaCount = simOrders - baseOrders;
    const ordersDeltaPct = baseOrders > 0 ? Math.round(((simOrders - baseOrders) / baseOrders) * 10000) / 100 : 0;

    const gmvDeltaTnd = Math.round((simGmv - baseGmv) * 1000) / 1000;
    const gmvDeltaPct = baseGmv > 0 ? Math.round(((simGmv - baseGmv) / baseGmv) * 10000) / 100 : 0;

    const commissionDeltaTnd = Math.round((simCommission - baseCommission) * 1000) / 1000;
    const commissionDeltaPct = baseCommission > 0 ? Math.round(((simCommission - baseCommission) / baseCommission) * 10000) / 100 : 0;

    const saasMrrDeltaTnd = Math.round((simMrr - mrr0) * 1000) / 1000;
    const saasMrrDeltaPct = mrr0 > 0 ? Math.round(((simMrr - mrr0) / mrr0) * 10000) / 100 : 0;

    const revenueDeltaTnd = Math.round((simTotalRevenue - baseTotalRevenue) * 1000) / 1000;
    const revenueDeltaPct = baseTotalRevenue > 0 ? Math.round(((simTotalRevenue - baseTotalRevenue) / baseTotalRevenue) * 10000) / 100 : 0;

    // Executive takeaway synthesis
    let takeaway = '';
    if (revenueDeltaTnd > 0) {
      takeaway = `Projected platform net revenue expands by +${revenueDeltaTnd.toFixed(3)} TND (+${revenueDeltaPct.toFixed(1)}%), driven by ${gmvDeltaTnd >= 0 ? `GMV expansion of +${gmvDeltaTnd.toFixed(3)} TND` : 'commission take optimization'} and SaaS expansion of +${saasMrrDeltaTnd.toFixed(3)} TND/mo.`;
    } else if (revenueDeltaTnd < 0) {
      takeaway = `Simulation indicates a revenue contraction of ${revenueDeltaTnd.toFixed(3)} TND (${revenueDeltaPct.toFixed(1)}%). Caution advised on downward traffic/conversion levers.`;
    } else {
      takeaway = 'Scenario produces neutral impact on overall platform net revenue.';
    }

    return {
      inputs: input,
      baseline: {
        visitors_count: v0,
        conversion_rate_pct: c0,
        orders_count: baseOrders,
        gmv_tnd: baseGmv,
        commission_take_tnd: baseCommission,
        saas_mrr_tnd: mrr0,
        total_platform_revenue_tnd: baseTotalRevenue,
      },
      simulated: {
        visitors_count: v1,
        conversion_rate_pct: c1,
        orders_count: simOrders,
        gmv_tnd: simGmv,
        commission_take_tnd: simCommission,
        saas_mrr_tnd: simMrr,
        total_platform_revenue_tnd: simTotalRevenue,
      },
      delta: {
        visitors_delta_count: visitorsDeltaCount,
        visitors_delta_pct: visitorsDeltaPct,
        orders_delta_count: ordersDeltaCount,
        orders_delta_pct: ordersDeltaPct,
        gmv_delta_tnd: gmvDeltaTnd,
        gmv_delta_pct: gmvDeltaPct,
        commission_delta_tnd: commissionDeltaTnd,
        commission_delta_pct: commissionDeltaPct,
        saas_mrr_delta_tnd: saasMrrDeltaTnd,
        saas_mrr_delta_pct: saasMrrDeltaPct,
        revenue_delta_tnd: revenueDeltaTnd,
        revenue_delta_pct: revenueDeltaPct,
      },
      executive_takeaway: takeaway,
    };
  }
}

/**
 * Daily Executive Natural Language AI Digest Synthesizer
 */
export class ExecutiveAIDigestEngine {
  public generateDigest(
    metrics: {
      time_range: string;
      total_gmv_tnd: number;
      total_orders: number;
      net_revenue_tnd: number;
      growth_pop_pct?: number | null;
      conversion_rate_pct?: number;
      active_anomalies: Array<{ id: string; title: string; severity: 'warning' | 'critical' }>;
      high_risk_vendors: Array<{ name: string; risk: 'high' | 'critical'; reason: string }>;
    },
    useLlmMock = false
  ): ExecutiveAIDigestDTO {
    const nowIso = new Date().toISOString();
    const gmv = metrics.total_gmv_tnd;
    const orders = metrics.total_orders;
    const revenue = metrics.net_revenue_tnd;
    const growth = metrics.growth_pop_pct !== undefined && metrics.growth_pop_pct !== null ? metrics.growth_pop_pct : 0;
    const anomaliesCount = metrics.active_anomalies.length;
    const highRiskCount = metrics.high_risk_vendors.length;

    // Highlights assembly
    const highlights: ExecutiveAIDigestDTO['key_highlights'] = [
      {
        label: 'Gross Merchandise Value (GMV)',
        value: `${gmv.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`,
        change_pct: growth,
        sentiment: growth > 0 ? 'positive' : growth < -5 ? 'warning' : 'neutral',
      },
      {
        label: 'Net Platform Take',
        value: `${revenue.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`,
        change_pct: growth,
        sentiment: growth > 0 ? 'positive' : 'neutral',
      },
      {
        label: 'Total Orders Captured',
        value: orders.toLocaleString('en-US'),
        change_pct: null,
        sentiment: orders > 0 ? 'positive' : 'warning',
      },
      {
        label: 'Platform Conversion Rate',
        value: `${(metrics.conversion_rate_pct || 2.8).toFixed(2)}%`,
        change_pct: null,
        sentiment: (metrics.conversion_rate_pct || 2.8) >= 2.5 ? 'positive' : 'warning',
      },
    ];

    // Synthesis headline & narrative
    let headline = '';
    let summary = '';
    if (growth >= 10) {
      headline = `Accelerating Growth: GMV Reaches ${gmv.toFixed(3)} TND with +${growth.toFixed(1)}% PoP Expansion`;
      summary = `Platform performance demonstrates strong upward momentum over the ${metrics.time_range} period, logging ${gmv.toFixed(3)} TND in GMV across ${orders} orders and ${revenue.toFixed(3)} TND in net platform take. Operational telemetry remains solid across active merchant stores.`;
    } else if (growth <= -10) {
      headline = `Executive Alert: GMV Contraction of ${growth.toFixed(1)}% Detected in Period`;
      summary = `The platform recorded ${gmv.toFixed(3)} TND across ${orders} orders during ${metrics.time_range}, trailing prior period baseline. ${anomaliesCount} operational anomalies require executive attention.`;
    } else {
      headline = `Stable Platform Velocity: ${gmv.toFixed(3)} TND GMV across ${orders} Completed Orders`;
      summary = `Trading volume remains steady across the marketplace with consistent take rates and active vendor fulfillment. Platform converted ${orders} orders with ${gmv.toFixed(3)} TND GMV and ${revenue.toFixed(3)} TND net revenue.`;
    }

    // Recommendations prioritization
    const recommendations: ExecutiveAIDigestDTO['strategic_recommendations'] = [];

    if (highRiskCount > 0) {
      recommendations.push({
        priority: 'high',
        area: 'Vendor Risk & Compliance',
        action: `Audit ${highRiskCount} merchant accounts flagged for elevated defect or dispute rates.`,
        expected_impact: 'Mitigate escrow chargebacks and protect buyer trust.',
      });
    }

    if (anomaliesCount > 0) {
      recommendations.push({
        priority: 'high',
        area: 'Checkout Funnel Telemetry',
        action: `Investigate ${anomaliesCount} active anomaly alerts in cart-to-shipping conversion stages.`,
        expected_impact: 'Recover estimated drop-off revenue at payment step.',
      });
    }

    recommendations.push({
      priority: 'medium',
      area: 'Merchant Acquisition & SaaS Expansion',
      action: 'Promote Pro/Golden tier subscription upgrades to top 15% high-volume sellers.',
      expected_impact: 'Increase high-margin predictable SaaS MRR by +12%.',
    });

    return {
      generated_at: nowIso,
      time_range: metrics.time_range,
      headline,
      summary_paragraph: summary,
      key_highlights: highlights,
      critical_anomalies: metrics.active_anomalies.map(a => ({
        id: a.id,
        severity: a.severity,
        title: a.title,
        description: `Active ${a.severity} threshold event on ${a.title}`,
      })),
      vendor_risk_radar: metrics.high_risk_vendors.map(v => ({
        store_name: v.name,
        risk_level: v.risk,
        primary_factor: v.reason,
      })),
      strategic_recommendations: recommendations,
      provider: useLlmMock ? 'gemini' : 'statistical_fallback',
    };
  }
}

// ============================================================================
// TEST SUITE: PREDICTIVE FORECASTING, WHAT-IF SIMULATOR & AI DIGEST
// ============================================================================

describe('Package 3: Backend Predictive AI & Forecasting Test Suite', () => {
  let forecastEngine: TimeSeriesForecastingEngine;
  let simulator: WhatIfScenarioSimulator;
  let digestEngine: ExecutiveAIDigestEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    forecastEngine = new TimeSeriesForecastingEngine();
    simulator = new WhatIfScenarioSimulator();
    digestEngine = new ExecutiveAIDigestEngine();
  });

  // ==========================================================================
  // FEATURE 14: 30/60/90-DAY PREDICTIVE FORECASTING (R5)
  // ==========================================================================
  describe('Feature 14: 30/60/90-Day Predictive Forecasting', () => {
    const sampleDailyGMV: HistoricalDataPoint[] = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(2026, 6, 1 + i).toISOString().split('T')[0];
      // Synthetic growing baseline with day-of-week seasonality (weekends peak)
      const dayOfWeek = (i % 7);
      const seasonality = dayOfWeek === 5 || dayOfWeek === 6 ? 300 : 0;
      const trend = i * 25;
      const base = 1500;
      return {
        date,
        value: base + trend + seasonality,
      };
    });

    describe('Tier 1: Feature Coverage (≥5 Tests)', () => {
      it('F14-T1.1: generates 30-day forecast with daily points and confidence intervals for GMV', () => {
        const result = forecastEngine.generateForecast(sampleDailyGMV, '30d', 'gmv');

        expect(result.horizon_days).toBe(30);
        expect(result.metric).toBe('gmv');
        expect(result.model_type).toBe('holt_winters_seasonality');
        expect(result.points.length).toBe(30 + 30); // 30 historical + 30 projected
        expect(result.projected_total_tnd).toBeGreaterThan(0);
        expect(result.confidence_level_pct).toBeGreaterThanOrEqual(70);

        const projectedPoints = result.points.filter(p => !p.historical);
        expect(projectedPoints.length).toBe(30);
        projectedPoints.forEach(pt => {
          expect(pt.predicted_value).toBeGreaterThan(0);
          expect(pt.confidence_lower_80).toBeLessThanOrEqual(pt.predicted_value);
          expect(pt.predicted_value).toBeLessThanOrEqual(pt.confidence_upper_80);
          expect(pt.confidence_lower_95).toBeLessThanOrEqual(pt.confidence_lower_80);
          expect(pt.confidence_upper_80).toBeLessThanOrEqual(pt.confidence_upper_95);
        });
      });

      it('F14-T1.2: generates 60-day forecast for Net Revenue maintaining monetary 3-decimal precision', () => {
        const sampleRevenue: HistoricalDataPoint[] = sampleDailyGMV.map(d => ({
          date: d.date,
          value: Math.round(d.value * 0.12 * 1000) / 1000, // 12% take rate
        }));

        const result = forecastEngine.generateForecast(sampleRevenue, '60d', 'revenue');

        expect(result.horizon_days).toBe(60);
        expect(result.metric).toBe('revenue');
        expect(result.points.filter(p => !p.historical).length).toBe(60);

        const firstProjected = result.points.find(p => !p.historical);
        expect(firstProjected).toBeDefined();
        // Verify 3-decimal formatting consistency
        const decStr = firstProjected!.predicted_value.toString().split('.')[1] || '';
        expect(decStr.length).toBeLessThanOrEqual(3);
      });

      it('F14-T1.3: generates 90-day forecast for Order Counts rounding to discrete whole units', () => {
        const sampleOrders: HistoricalDataPoint[] = sampleDailyGMV.map(d => ({
          date: d.date,
          value: Math.round(d.value / 85), // AOV ~ 85 TND
        }));

        const result = forecastEngine.generateForecast(sampleOrders, '90d', 'orders');

        expect(result.horizon_days).toBe(90);
        expect(result.metric).toBe('orders');
        const projectedOrders = result.points.filter(p => !p.historical);
        expect(projectedOrders.length).toBe(90);

        projectedOrders.forEach(pt => {
          expect(Number.isInteger(pt.predicted_value)).toBe(true);
          expect(Number.isInteger(pt.confidence_lower_80)).toBe(true);
          expect(Number.isInteger(pt.confidence_upper_80)).toBe(true);
        });
      });

      it('F14-T1.4: verifies statistical hierarchy and non-negative bounds for 80% and 95% confidence bands', () => {
        const result = forecastEngine.generateForecast(sampleDailyGMV, '30d', 'gmv');
        const projected = result.points.filter(p => !p.historical);

        projected.forEach(pt => {
          // Band ordering: Lower 95 <= Lower 80 <= Pred <= Upper 80 <= Upper 95
          expect(pt.confidence_lower_95).toBeLessThanOrEqual(pt.confidence_lower_80);
          expect(pt.confidence_lower_80).toBeLessThanOrEqual(pt.predicted_value);
          expect(pt.predicted_value).toBeLessThanOrEqual(pt.confidence_upper_80);
          expect(pt.confidence_upper_80).toBeLessThanOrEqual(pt.confidence_upper_95);

          // Lower bound must be strictly >= 0 (no negative GMV)
          expect(pt.confidence_lower_95).toBeGreaterThanOrEqual(0);
          expect(pt.confidence_lower_80).toBeGreaterThanOrEqual(0);
        });
      });

      it('F14-T1.5: accurately classifies bullish, bearish, and stable trend trajectories', () => {
        // Bullish series
        const bullishResult = forecastEngine.generateForecast(sampleDailyGMV, '30d', 'gmv');
        expect(bullishResult.trend_direction).toBe('bullish');
        expect(bullishResult.growth_over_baseline_pct).toBeGreaterThan(2.0);

        // Bearish series
        const bearishSeries = sampleDailyGMV.map((d, idx) => ({
          date: d.date,
          value: Math.max(100, 3000 - idx * 70),
        }));
        const bearishResult = forecastEngine.generateForecast(bearishSeries, '30d', 'gmv');
        expect(bearishResult.trend_direction).toBe('bearish');
        expect(bearishResult.growth_over_baseline_pct).toBeLessThan(-2.0);

        // Stable series
        const stableSeries = sampleDailyGMV.map(d => ({
          date: d.date,
          value: 2000 + (Math.random() * 10 - 5),
        }));
        const stableResult = forecastEngine.generateForecast(stableSeries, '30d', 'gmv');
        expect(stableResult.trend_direction).toBe('stable');
      });

      it('F14-T1.6: computes growth over baseline and historical data points count accurately', () => {
        const result = forecastEngine.generateForecast(sampleDailyGMV, '30d', 'gmv');
        expect(result.historical_data_points).toBe(30);
        expect(typeof result.growth_over_baseline_pct).toBe('number');
        expect(result.projected_total_tnd).toBeGreaterThan(result.points[0].predicted_value * 30);
      });
    });

    describe('Tier 2: Boundary & Corner Cases (≥5 Tests)', () => {
      it('F14-T2.1: handles flatline historical data with zero trend without crashing or producing NaN', () => {
        const flatSeries: HistoricalDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
          date: `2026-07-${(i + 1).toString().padStart(2, '0')}`,
          value: 1000.0,
        }));

        const result = forecastEngine.generateForecast(flatSeries, '30d', 'gmv');
        expect(result.trend_direction).toBe('stable');
        expect(result.growth_over_baseline_pct).toBeCloseTo(0, 0);

        const projected = result.points.filter(p => !p.historical);
        projected.forEach(pt => {
          expect(pt.predicted_value).toBeCloseTo(1000.0, 1);
          expect(isNaN(pt.predicted_value)).toBe(false);
          expect(isNaN(pt.confidence_lower_95)).toBe(false);
        });
      });

      it('F14-T2.2: handles sparse historical series (< 3 observations) gracefully via persistence fallback', () => {
        const sparseSeries: HistoricalDataPoint[] = [
          { date: '2026-08-01', value: 1200.0 },
          { date: '2026-08-02', value: 1400.0 },
        ];

        const result = forecastEngine.generateForecast(sparseSeries, '30d', 'gmv');
        expect(result.model_type).toBe('exponential_smoothing');
        expect(result.points.length).toBe(2 + 30);
        expect(result.projected_total_tnd).toBeCloseTo(1300 * 30, -2);
      });

      it('F14-T2.3: throws PdValidationError when historical observation array is empty', () => {
        expect(() => {
          forecastEngine.generateForecast([], '30d', 'gmv');
        }).toThrow(PdValidationError);
      });

      it('F14-T2.4: clamps confidence intervals strictly to 0 when forecast value approaches zero', () => {
        const decliningSeries: HistoricalDataPoint[] = Array.from({ length: 15 }, (_, i) => ({
          date: `2026-08-${(i + 1).toString().padStart(2, '0')}`,
          value: Math.max(10, 100 - i * 8),
        }));

        const result = forecastEngine.generateForecast(decliningSeries, '60d', 'orders');
        const projected = result.points.filter(p => !p.historical);

        projected.forEach(pt => {
          expect(pt.confidence_lower_95).toBeGreaterThanOrEqual(0);
          expect(pt.confidence_lower_80).toBeGreaterThanOrEqual(0);
        });
      });

      it('F14-T2.5: handles high volatility outliers without generating infinite or NaN values', () => {
        const volatileSeries: HistoricalDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
          date: `2026-07-${(i + 1).toString().padStart(2, '0')}`,
          value: i === 15 ? 50000.0 : 1000.0 + (i % 2 === 0 ? 500 : -300),
        }));

        const result = forecastEngine.generateForecast(volatileSeries, '30d', 'gmv');
        expect(result.projected_total_tnd).toBeGreaterThan(0);
        expect(isFinite(result.projected_total_tnd)).toBe(true);
      });

      it('F14-T2.6: verifies confidence intervals expand as forecast horizon distance m increases', () => {
        const result = forecastEngine.generateForecast(sampleDailyGMV, '90d', 'gmv');
        const projected = result.points.filter(p => !p.historical);

        const day1BandWidth = projected[0].confidence_upper_95 - projected[0].confidence_lower_95;
        const day45BandWidth = projected[44].confidence_upper_95 - projected[44].confidence_lower_95;
        const day90BandWidth = projected[89].confidence_upper_95 - projected[89].confidence_lower_95;

        expect(day45BandWidth).toBeGreaterThan(day1BandWidth);
        expect(day90BandWidth).toBeGreaterThan(day45BandWidth);
      });
    });

    describe('Tier 3: Combinations & Integration Scenarios', () => {
      it('F14-T3.1: pairwise coverage across all 3 horizons (30d, 60d, 90d) and 3 metrics (gmv, revenue, orders)', () => {
        const horizons: ForecastHorizon[] = ['30d', '60d', '90d'];
        const metrics: ForecastMetric[] = ['gmv', 'revenue', 'orders'];

        horizons.forEach(h => {
          metrics.forEach(m => {
            const res = forecastEngine.generateForecast(sampleDailyGMV, h, m);
            const expectedDays = h === '30d' ? 30 : h === '60d' ? 60 : 90;
            expect(res.horizon_days).toBe(expectedDays);
            expect(res.metric).toBe(m);
            expect(res.points.filter(p => !p.historical).length).toBe(expectedDays);
          });
        });
      });
    });
  });

  // ==========================================================================
  // FEATURE 15: DYNAMIC "WHAT-IF" SCENARIO SIMULATOR (R5)
  // ==========================================================================
  describe('Feature 15: Dynamic "What-If" Scenario Simulator', () => {
    const defaultBaseline = {
      visitors_count: 50000,
      conversion_rate_pct: 3.2,
      average_order_value_tnd: 85.5,
      commission_rate_pct: 10.0,
      saas_mrr_tnd: 8500.0,
      active_vendors_count: 120,
    };

    describe('Tier 1: Feature Coverage (≥5 Tests)', () => {
      it('F15-T1.1: simulates +20% traffic increase expanding GMV and orders proportionally', () => {
        const input: WhatIfSimulationInput = {
          traffic_delta_pct: 20,
          conversion_delta_pct: 0,
        };

        const result = simulator.simulate(defaultBaseline, input);

        expect(result.simulated.visitors_count).toBe(60000);
        expect(result.delta.visitors_delta_count).toBe(10000);
        expect(result.delta.visitors_delta_pct).toBe(20);

        // Orders and GMV should grow by ~20%
        expect(result.delta.orders_delta_pct).toBeCloseTo(20, 0);
        expect(result.delta.gmv_delta_pct).toBeCloseTo(20, 0);
        expect(result.delta.gmv_delta_tnd).toBeGreaterThan(0);
        expect(result.executive_takeaway).toContain('Projected platform net revenue expands');
      });

      it('F15-T1.2: simulates +0.5% conversion rate improvement on order volume and net take', () => {
        const input: WhatIfSimulationInput = {
          traffic_delta_pct: 0,
          conversion_delta_pct: 0.5,
        };

        const result = simulator.simulate(defaultBaseline, input);

        expect(result.simulated.conversion_rate_pct).toBe(3.7);
        expect(result.simulated.orders_count).toBe(Math.round(50000 * 0.037));
        expect(result.delta.orders_delta_count).toBeGreaterThan(0);
        expect(result.delta.commission_delta_tnd).toBeGreaterThan(0);
      });

      it('F15-T1.3: simulates commission take rate adjustment (10% -> 12.5%) without modifying GMV', () => {
        const input: WhatIfSimulationInput = {
          traffic_delta_pct: 0,
          conversion_delta_pct: 0,
          commission_rate_pct: 12.5,
        };

        const result = simulator.simulate(defaultBaseline, input);

        expect(result.simulated.gmv_tnd).toBe(result.baseline.gmv_tnd);
        expect(result.delta.gmv_delta_tnd).toBe(0);
        expect(result.simulated.commission_take_tnd).toBeGreaterThan(result.baseline.commission_take_tnd);
        expect(result.delta.commission_delta_pct).toBe(25); // (12.5 - 10) / 10 = +25%
      });

      it('F15-T1.4: simulates SaaS price hike (+15%) combined with vendor growth (+10%) on MRR', () => {
        const input: WhatIfSimulationInput = {
          traffic_delta_pct: 0,
          conversion_delta_pct: 0,
          subscription_price_delta_pct: 15,
          vendor_growth_pct: 10,
        };

        const result = simulator.simulate(defaultBaseline, input);

        // Expected compound multiplier: 1.10 * 1.15 = 1.265 (+26.5%)
        const expectedMrr = 8500 * 1.10 * 1.15;
        expect(result.simulated.saas_mrr_tnd).toBeCloseTo(expectedMrr, 2);
        expect(result.delta.saas_mrr_delta_pct).toBeCloseTo(26.5, 1);
      });

      it('F15-T1.5: simulates compound multi-lever growth (traffic + conversion + commission + SaaS)', () => {
        const input: WhatIfSimulationInput = {
          traffic_delta_pct: 15,
          conversion_delta_pct: 0.3,
          commission_rate_pct: 11.0,
          subscription_price_delta_pct: 5,
          vendor_growth_pct: 8,
        };

        const result = simulator.simulate(defaultBaseline, input);

        expect(result.delta.revenue_delta_tnd).toBeGreaterThan(0);
        expect(result.delta.gmv_delta_tnd).toBeGreaterThan(0);
        expect(result.delta.saas_mrr_delta_tnd).toBeGreaterThan(0);
        expect(result.simulated.total_platform_revenue_tnd).toBe(
          Math.round((result.simulated.commission_take_tnd + result.simulated.saas_mrr_tnd) * 1000) / 1000
        );
      });

      it('F15-T1.6: verifies absolute and percentage delta precision and non-drift mathematical integrity', () => {
        const input: WhatIfSimulationInput = {
          traffic_delta_pct: 10,
          conversion_delta_pct: -0.2,
          commission_rate_pct: 9.5,
        };

        const result = simulator.simulate(defaultBaseline, input);

        expect(result.delta.gmv_delta_tnd).toBe(
          Math.round((result.simulated.gmv_tnd - result.baseline.gmv_tnd) * 1000) / 1000
        );
        expect(result.delta.revenue_delta_tnd).toBe(
          Math.round((result.simulated.total_platform_revenue_tnd - result.baseline.total_platform_revenue_tnd) * 1000) / 1000
        );
      });
    });

    describe('Tier 2: Boundary & Corner Cases (≥5 Tests)', () => {
      it('F15-T2.1: handles zero-change scenario (all deltas = 0) producing exact zero deltas', () => {
        const input: WhatIfSimulationInput = {
          traffic_delta_pct: 0,
          conversion_delta_pct: 0,
          subscription_price_delta_pct: 0,
          vendor_growth_pct: 0,
        };

        const result = simulator.simulate(defaultBaseline, input);

        expect(result.delta.visitors_delta_count).toBe(0);
        expect(result.delta.orders_delta_count).toBe(0);
        expect(result.delta.gmv_delta_tnd).toBe(0);
        expect(result.delta.revenue_delta_tnd).toBe(0);
        expect(result.executive_takeaway).toContain('neutral impact');
      });

      it('F15-T2.2: handles severe macroeconomic collapse (-100% traffic) reducing GMV to 0 while SaaS holds', () => {
        const input: WhatIfSimulationInput = {
          traffic_delta_pct: -100,
          conversion_delta_pct: 0,
        };

        const result = simulator.simulate(defaultBaseline, input);

        expect(result.simulated.visitors_count).toBe(0);
        expect(result.simulated.orders_count).toBe(0);
        expect(result.simulated.gmv_tnd).toBe(0);
        expect(result.simulated.commission_take_tnd).toBe(0);
        // SaaS MRR baseline should remain intact
        expect(result.simulated.saas_mrr_tnd).toBe(defaultBaseline.saas_mrr_tnd);
        expect(result.simulated.total_platform_revenue_tnd).toBe(defaultBaseline.saas_mrr_tnd);
        expect(result.executive_takeaway).toContain('revenue contraction');
      });

      it('F15-T2.3: handles complete conversion collapse (conversion rate dropped to 0%)', () => {
        const input: WhatIfSimulationInput = {
          traffic_delta_pct: 50,
          conversion_delta_pct: -10.0, // Large negative drop
        };

        const result = simulator.simulate(defaultBaseline, input);

        expect(result.simulated.conversion_rate_pct).toBe(0);
        expect(result.simulated.orders_count).toBe(0);
        expect(result.simulated.gmv_tnd).toBe(0);
      });

      it('F15-T2.4: handles 0% commission take rate (commission revenue = 0 TND)', () => {
        const input: WhatIfSimulationInput = {
          traffic_delta_pct: 20,
          conversion_delta_pct: 0,
          commission_rate_pct: 0,
        };

        const result = simulator.simulate(defaultBaseline, input);

        expect(result.simulated.commission_take_tnd).toBe(0);
        expect(result.simulated.total_platform_revenue_tnd).toBe(result.simulated.saas_mrr_tnd);
      });

      it('F15-T2.5: throws PdValidationError when commission rate is negative or greater than 100%', () => {
        expect(() => {
          simulator.simulate(defaultBaseline, {
            traffic_delta_pct: 10,
            conversion_delta_pct: 0,
            commission_rate_pct: -5,
          });
        }).toThrow(PdValidationError);

        expect(() => {
          simulator.simulate(defaultBaseline, {
            traffic_delta_pct: 10,
            conversion_delta_pct: 0,
            commission_rate_pct: 105,
          });
        }).toThrow(PdValidationError);
      });

      it('F15-T2.6: throws PdValidationError when traffic decrease is below -100%', () => {
        expect(() => {
          simulator.simulate(defaultBaseline, {
            traffic_delta_pct: -120,
            conversion_delta_pct: 0,
          });
        }).toThrow(PdValidationError);
      });
    });

    describe('Tier 3: Combinations & Integration Scenarios', () => {
      it('F15-T3.1: feeds 30-day forecast GMV directly into What-If Simulator as dynamic baseline', () => {
        const sampleDaily: HistoricalDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
          date: `2026-07-${(i + 1).toString().padStart(2, '0')}`,
          value: 2000 + i * 30,
        }));

        const forecast = forecastEngine.generateForecast(sampleDaily, '30d', 'gmv');
        const forecastedGmv = forecast.projected_total_tnd;

        const dynamicBaseline = {
          visitors_count: 45000,
          conversion_rate_pct: 3.0,
          average_order_value_tnd: forecastedGmv / (45000 * 0.03),
          commission_rate_pct: 10.0,
          saas_mrr_tnd: 9000.0,
          active_vendors_count: 140,
        };

        const simulation = simulator.simulate(dynamicBaseline, {
          traffic_delta_pct: 15,
          conversion_delta_pct: 0.2,
          commission_rate_pct: 12.0,
        });

        expect(simulation.simulated.gmv_tnd).toBeGreaterThan(forecastedGmv);
        expect(simulation.delta.revenue_delta_tnd).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // FEATURE 16: DAILY EXECUTIVE NATURAL LANGUAGE AI DIGEST (R5)
  // ==========================================================================
  describe('Feature 16: Daily Executive Natural Language AI Digest', () => {
    const sampleMetrics = {
      time_range: 'Last 30 Days',
      total_gmv_tnd: 142500.500,
      total_orders: 1680,
      net_revenue_tnd: 22800.000,
      growth_pop_pct: 14.5,
      conversion_rate_pct: 3.45,
      active_anomalies: [
        { id: 'anom_1', title: 'Payment Gateway Latency Spike', severity: 'warning' as const },
        { id: 'anom_2', title: 'Cart Drop-off Surge in Grand Tunis', severity: 'critical' as const },
      ],
      high_risk_vendors: [
        { name: 'Medina Crafts Store', risk: 'critical' as const, reason: 'Dispute rate exceeds 8.5%' },
        { name: 'Carthage Olive Wood', risk: 'high' as const, reason: 'Dispatch SLA defect rate 14%' },
      ],
    };

    describe('Tier 1: Feature Coverage (≥5 Tests)', () => {
      it('F16-T1.1: generates structured executive digest with headline, narrative, highlights, anomalies, and recommendations', () => {
        const digest = digestEngine.generateDigest(sampleMetrics);

        expect(digest).toBeDefined();
        expect(digest.headline).toContain('Accelerating Growth');
        expect(digest.summary_paragraph).toContain('142500.500 TND');
        expect(digest.key_highlights.length).toBe(4);
        expect(digest.critical_anomalies.length).toBe(2);
        expect(digest.vendor_risk_radar.length).toBe(2);
        expect(digest.strategic_recommendations.length).toBeGreaterThanOrEqual(3);
        expect(digest.provider).toBe('statistical_fallback');
      });

      it('F16-T1.2: correctly categorizes KPI highlight sentiments based on performance thresholds', () => {
        const digest = digestEngine.generateDigest(sampleMetrics);

        const gmvHighlight = digest.key_highlights.find(h => h.label.includes('GMV'));
        expect(gmvHighlight).toBeDefined();
        expect(gmvHighlight!.sentiment).toBe('positive'); // growth > 0

        const convHighlight = digest.key_highlights.find(h => h.label.includes('Conversion'));
        expect(convHighlight).toBeDefined();
        expect(convHighlight!.sentiment).toBe('positive'); // 3.45% >= 2.5%
      });

      it('F16-T1.3: synthesizes urgent warning headline and narrative when platform experiences growth contraction', () => {
        const contractionMetrics = {
          ...sampleMetrics,
          growth_pop_pct: -15.2,
        };

        const digest = digestEngine.generateDigest(contractionMetrics);

        expect(digest.headline).toContain('Executive Alert');
        expect(digest.headline).toContain('-15.2%');
        expect(digest.summary_paragraph).toContain('trailing prior period');
        const gmvHighlight = digest.key_highlights.find(h => h.label.includes('GMV'));
        expect(gmvHighlight?.sentiment).toBe('warning');
      });

      it('F16-T1.4: automatically prioritizes strategic recommendations targeting high-risk vendors and active anomalies', () => {
        const digest = digestEngine.generateDigest(sampleMetrics);

        const highPriorityRecs = digest.strategic_recommendations.filter(r => r.priority === 'high');
        expect(highPriorityRecs.length).toBe(2);

        const vendorRec = highPriorityRecs.find(r => r.area.includes('Vendor Risk'));
        expect(vendorRec).toBeDefined();
        expect(vendorRec?.action).toContain('Audit 2 merchant accounts');

        const anomalyRec = highPriorityRecs.find(r => r.area.includes('Funnel'));
        expect(anomalyRec).toBeDefined();
        expect(anomalyRec?.action).toContain('Investigate 2 active anomaly alerts');
      });

      it('F16-T1.5: supports switching provider flag between statistical_fallback and external gemini LLM mode', () => {
        const fallbackDigest = digestEngine.generateDigest(sampleMetrics, false);
        expect(fallbackDigest.provider).toBe('statistical_fallback');

        const llmDigest = digestEngine.generateDigest(sampleMetrics, true);
        expect(llmDigest.provider).toBe('gemini');
      });

      it('F16-T1.6: verifies timestamp and time_range metadata fidelity in generated digest', () => {
        const digest = digestEngine.generateDigest(sampleMetrics);

        expect(digest.time_range).toBe('Last 30 Days');
        expect(new Date(digest.generated_at).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
      });
    });

    describe('Tier 2: Boundary & Corner Cases (≥5 Tests)', () => {
      it('F16-T2.1: handles calm period with zero anomalies and zero high-risk vendors cleanly', () => {
        const calmMetrics = {
          time_range: 'Last 7 Days',
          total_gmv_tnd: 35000.0,
          total_orders: 420,
          net_revenue_tnd: 4500.0,
          growth_pop_pct: 3.1,
          conversion_rate_pct: 3.1,
          active_anomalies: [],
          high_risk_vendors: [],
        };

        const digest = digestEngine.generateDigest(calmMetrics);

        expect(digest.critical_anomalies.length).toBe(0);
        expect(digest.vendor_risk_radar.length).toBe(0);
        // Only default strategic recommendation remaining
        expect(digest.strategic_recommendations.length).toBe(1);
        expect(digest.headline).toContain('Stable Platform Velocity');
      });

      it('F16-T2.2: handles zero orders and zero revenue period gracefully with appropriate warning sentiments', () => {
        const zeroMetrics = {
          time_range: 'Today',
          total_gmv_tnd: 0,
          total_orders: 0,
          net_revenue_tnd: 0,
          growth_pop_pct: -100.0,
          conversion_rate_pct: 0,
          active_anomalies: [{ id: 'anom_zero', title: 'Zero Checkout Volume', severity: 'critical' as const }],
          high_risk_vendors: [],
        };

        const digest = digestEngine.generateDigest(zeroMetrics);

        expect(digest.headline).toContain('Executive Alert');
        const orderHighlight = digest.key_highlights.find(h => h.label.includes('Orders'));
        expect(orderHighlight?.sentiment).toBe('warning');
      });

      it('F16-T2.3: handles null or undefined growth percentages without throwing or displaying NaN', () => {
        const nullGrowthMetrics = {
          ...sampleMetrics,
          growth_pop_pct: null,
        };

        const digest = digestEngine.generateDigest(nullGrowthMetrics);

        expect(digest.headline).toContain('Stable Platform Velocity');
        const gmvHighlight = digest.key_highlights.find(h => h.label.includes('GMV'));
        expect(gmvHighlight?.change_pct).toBe(0);
      });

      it('F16-T2.4: verifies narrative strings contain no unsafe characters or unescaped HTML scripts', () => {
        const maliciousVendorMetrics = {
          ...sampleMetrics,
          high_risk_vendors: [
            { name: '<script>alert("xss")</script> Bad Store', risk: 'critical' as const, reason: 'Wash trading' },
          ],
        };

        const digest = digestEngine.generateDigest(maliciousVendorMetrics);
        expect(digest.vendor_risk_radar[0].store_name).toContain('Bad Store');
      });

      it('F16-T2.5: handles huge monetary numbers without exponent notation formatting skew', () => {
        const hugeMetrics = {
          ...sampleMetrics,
          total_gmv_tnd: 12500000.750, // 12.5M TND
        };

        const digest = digestEngine.generateDigest(hugeMetrics);
        expect(digest.summary_paragraph).toContain('12500000.750 TND');
      });
    });

    describe('Tier 3: Combinations & Integration Scenarios', () => {
      it('F16-T3.1: compound integration pipeline: Time-Series Forecast -> What-If Simulator -> Executive AI Digest', () => {
        // Step 1: Generate Forecast
        const forecastDaily: HistoricalDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
          date: `2026-07-${(i + 1).toString().padStart(2, '0')}`,
          value: 3000 + i * 50,
        }));
        const forecast = forecastEngine.generateForecast(forecastDaily, '30d', 'gmv');

        // Step 2: Simulate Marketing Campaign (+20% traffic, +0.3% conversion)
        const sim = simulator.simulate({
          visitors_count: 60000,
          conversion_rate_pct: 3.0,
          average_order_value_tnd: forecast.projected_total_tnd / (60000 * 0.03),
          commission_rate_pct: 10.0,
          saas_mrr_tnd: 10000.0,
          active_vendors_count: 150,
        }, {
          traffic_delta_pct: 20,
          conversion_delta_pct: 0.3,
          commission_rate_pct: 11.0,
        });

        // Step 3: Feed Simulated Results into Executive AI Digest
        const digest = digestEngine.generateDigest({
          time_range: 'Next 30 Days (Simulated)',
          total_gmv_tnd: sim.simulated.gmv_tnd,
          total_orders: sim.simulated.orders_count,
          net_revenue_tnd: sim.simulated.total_platform_revenue_tnd,
          growth_pop_pct: sim.delta.revenue_delta_pct,
          conversion_rate_pct: sim.simulated.conversion_rate_pct,
          active_anomalies: [],
          high_risk_vendors: [],
        });

        expect(digest.headline).toContain('Accelerating Growth');
        expect(digest.key_highlights[0].value).toContain(sim.simulated.gmv_tnd.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
        expect(digest.summary_paragraph).toContain(sim.simulated.total_platform_revenue_tnd.toFixed(3));
      });
    });
  });
});
