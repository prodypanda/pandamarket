/**
 * Analytics Backend Type Definitions & DTOs
 */

export interface AnalyticsQueryParams {
  timeRange?: '7d' | '30d' | '90d' | '12m' | 'all';
  startDate?: string;
  endDate?: string;
  currency?: string;
  tenantId?: string;
}

export interface DateWindow {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
}

export interface ExecutiveFinancialsDTO {
  total_gmv: number;
  marketplace_order_gmv: number;
  subscription_revenue: number;
  net_revenue: number;
  funds_in_escrow: number;
  released_payouts: number;
  total_orders: number;
  currency: string;
  gmv_growth_pop: string;
  net_growth_pop: string;
}

export interface OverviewMetricsDTO {
  financials: ExecutiveFinancialsDTO;
  stores: {
    total_stores: number;
    active_stores: number;
    paused_stores: number;
    suspended_stores: number;
  };
  users: {
    total_users: number;
    sellers: number;
    buyers: number;
    admins: number;
  };
  active_sessions: number;
  monthly_revenue_trend: Array<{ month: string; revenue: number }>;
  threshold_alerts: Array<{ id: string; level: 'info' | 'warning' | 'critical'; title: string; message: string }>;
}

export interface RevenueMetricsDTO {
  saas_metrics: {
    total_mrr_tnd: number;
    total_arr_tnd: number;
    arpu_converted: number;
    churn_rate_pct: number;
    estimated_ltv_converted: number;
    currency: string;
  };
  mrr_movement: {
    new_mrr: number;
    expansion_mrr: number;
    contraction_mrr: number;
    churned_mrr: number;
    total_mrr: number;
    total_arr: number;
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
  top_performing_vendors: Array<{
    id: string;
    name: string;
    subdomain: string;
    status: string;
    subscription_plan: string;
    created_at: string;
    products_count: number;
    total_orders_count?: number;
    total_gmv_tnd?: number;
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
  ads_financials: {
    total_ad_revenue: number;
    total_campaigns: number;
    active_campaigns: number;
    currency: string;
  };
  performance_metrics: {
    total_impressions: number;
    total_clicks: number;
    avg_ctr_pct: number;
    avg_cpc: number;
    estimated_roas: number;
  };
  slot_utilization_pct: number;
}

export interface SystemMetricsDTO {
  server_telemetry: {
    status: 'healthy' | 'degraded' | 'critical';
    uptime_pct: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
    error_rate_pct: number;
  };
  print_production_queue: {
    pending_jobs: number;
    processing_jobs: number;
    completed_today: number;
    delayed_jobs: number;
  };
  database_health: {
    active_connections: number;
    logs_24h: number;
    index_hit_ratio_pct: number;
  };
  live_audit_feed: Array<{
    action: string;
    details: any;
    created_at: string;
  }>;
}
