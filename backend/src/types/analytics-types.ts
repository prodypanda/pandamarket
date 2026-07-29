/**
 * Analytics Backend Type Definitions & DTOs — Time Range & Truthful Schema
 */

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | '12m' | 'all';

export interface AnalyticsQueryParams {
  timeRange?: AnalyticsTimeRange;
  startDate?: string;
  endDate?: string;
  currency?: string;
  tenantId?: string;
}

export interface NormalizedAnalyticsRange {
  timeRange: AnalyticsTimeRange;
  startDate: string | null;
  endDate: string;
  previousStartDate: string | null;
  previousEndDate: string | null;
  isAllTime: boolean;
  comparison_available: boolean;
}

export interface MetricScopeMetadata {
  active_stores: 'current_state';
  total_stores: 'current_state';
  total_users: 'current_state';
  active_sessions: 'current_state';
  gmv: 'selected_period';
  revenue: 'selected_period';
  orders: 'selected_period';
  new_users: 'selected_period';
  new_stores: 'selected_period';
}

export interface ExecutiveFinancialsDTO {
  total_gmv: number;
  marketplace_order_gmv: number;
  subscription_revenue: number;
  net_revenue: number;
  funds_in_escrow: number;
  released_payouts: number;
  total_orders: number;
  currency: 'TND';
  requested_currency: string;
  currency_conversion_available: false;
  gmv_source_note: 'order_and_subscription_totals';
  gmv_growth_pct: number | null;
  net_revenue_growth_pct: number | null;
  orders_growth_pct: number | null;
  growth_notes?: string;
}

export interface OverviewMetricsDTO {
  range: NormalizedAnalyticsRange;
  metric_scope: MetricScopeMetadata;
  financials: ExecutiveFinancialsDTO;
  stores: {
    total_stores: number;
    active_stores: number;
    paused_stores: number;
    suspended_stores: number;
    new_stores_in_period: number;
    new_stores_growth_pct: number | null;
  };
  users: {
    total_users: number;
    sellers: number;
    buyers: number;
    admins: number;
    new_users_in_period: number;
    new_users_growth_pct: number | null;
  };
  active_sessions: number;
  monthly_revenue_trend: Array<{ month: string; revenue: number }>;
  threshold_alerts: Array<{ id: string; level: 'info' | 'warning' | 'critical'; title: string; message: string }>;
}

export interface RevenueMetricsDTO {
  range: NormalizedAnalyticsRange;
  metric_scope: MetricScopeMetadata;
  saas_metrics: {
    total_mrr_tnd: number;
    total_arr_tnd: number;
    arpu_tnd: number | null;
    churn_rate_pct: number | null;
    estimated_ltv_tnd: number | null;
    currency: 'TND';
    requested_currency: string;
    currency_conversion_available: false;
  };
  mrr_movement: {
    new_mrr: number | null;
    expansion_mrr: number | null;
    contraction_mrr: number | null;
    churned_mrr: number | null;
    total_mrr: number;
    total_arr: number;
    mrr_movement_available: false;
    mrr_movement_unavailable_reason: 'Subscription lifecycle events are not tracked yet.';
  };
  active_subscriptions_by_plan: Array<{
    plan_id: string;
    active_count: number;
    annual_value: number;
  }>;
  cohort_matrix: Array<{
    cohort: string;
    total_signups: number;
    m1_retained_pct: string;
    m2_retained_pct: string;
    m3_retained_pct: string;
    m4_retained_pct: string;
    m5_retained_pct: string;
    m6_retained_pct: string;
  }>;
}

export interface VendorMetricsDTO {
  range: NormalizedAnalyticsRange;
  metric_scope: MetricScopeMetadata;
  top_performing_vendors: Array<{
    id: string;
    name: string;
    subdomain: string;
    status: string;
    subscription_plan: string;
    created_at: string;
    products_count: number;
  }>;
  activation_funnel: Array<{
    stage: string;
    count: number;
    conversion: string;
  }>;
  dispute_and_refund_rate: {
    total_refunds_issued: number;
    dispute_rate_pct: number;
    high_risk_vendors_flagged: number;
  };
}

export interface AdsMetricsDTO {
  range: NormalizedAnalyticsRange;
  metric_scope: MetricScopeMetadata;
  ads_financials: {
    total_ad_revenue_tnd: number;
    total_campaigns: number;
    active_campaigns: number;
    currency: 'TND';
    requested_currency: string;
    currency_conversion_available: false;
    ad_revenue_growth_pct: number | null;
  };
  performance_metrics: {
    total_impressions: number;
    total_clicks: number;
    avg_ctr_pct: number;
    avg_cpc_tnd: number;
    estimated_roas: number | null;
    conversion_attribution_available: false;
  };
  slot_utilization_pct: number | null;
  slot_inventory_available: false;
}

export interface SystemMetricsDTO {
  range: NormalizedAnalyticsRange;
  metric_scope: MetricScopeMetadata;
  server_telemetry: {
    status: 'healthy' | 'unknown';
    uptime_pct: number | null;
    p95_latency_ms: number | null;
    p99_latency_ms: number | null;
    error_rate_pct: number | null;
    telemetry_available: false;
  };
  print_production_queue: {
    pending_jobs: number | null;
    processing_jobs: number | null;
    completed_today: number | null;
    delayed_jobs: number | null;
    print_queue_metrics_available: false;
  };
  database_health: {
    active_connections: number | null;
    logs_24h: number;
    logs_in_period: number;
    index_hit_ratio_pct: number | null;
    database_pool_metrics_available: false;
  };
  live_audit_feed: Array<{
    action: string;
    details: any;
    created_at: string;
  }>;
}
