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
    telemetry_available: boolean;
  };
  print_production_queue: {
    pending_jobs: number | null;
    processing_jobs: number | null;
    completed_today: number | null;
    delayed_jobs: number | null;
    print_queue_metrics_available: boolean;
  };
  database_health: {
    active_connections: number | null;
    logs_24h: number;
    logs_in_period: number;
    index_hit_ratio_pct: number | null;
    database_pool_metrics_available: boolean;
  };
  live_audit_feed: Array<{
    action: string;
    details: any;
    created_at: string;
  }>;
}

export interface PlatformBusinessAnalyticsDTO {
  range: NormalizedAnalyticsRange;
  metric_scope: Record<string, 'selected_period' | 'current_state' | 'unavailable'>;

  orders: {
    available: true;
    total_orders: number;
    paid_orders: number;
    cancelled_orders: number;
    fulfilled_orders: number;
    marketplace_gmv_tnd: number;
    average_order_value_tnd: number | null;
    order_growth_pct: number | null;
    gmv_growth_pct: number | null;
  };

  checkout:
    | {
        available: true;
        checkout_started: number;
        payment_started: number;
        payment_completed: number;
        checkout_completion_rate_pct: number | null;
      }
    | {
        available: false;
        checkout_started: null;
        payment_started: null;
        payment_completed: null;
        checkout_completion_rate_pct: null;
        unavailable_reason: string;
      };

  buyers: {
    available: true;
    total_buyers_current: number;
    new_buyers: number;
    active_buyers: number;
    repeat_buyers: number;
    repeat_buyer_rate_pct: number | null;
    buyer_growth_pct: number | null;
  };

  sellers: {
    available: true;
    total_sellers_current: number;
    new_sellers: number;
    stores_created: number;
    active_stores_current: number;
    stores_with_products: number;
    stores_with_orders: number;
    activation_rate_pct: number | null;
    seller_growth_pct: number | null;
  };

  payouts: {
    available: true;
    total_wallet_balance_tnd: number;
    pending_wallet_balance_tnd: number;
    total_withdrawn_tnd: number;
    payout_transactions_in_period: number;
    payout_amount_in_period_tnd: number;
  };

  risk: {
    available: true;
    reports_count: number;
    open_reports_count: number;
    open_disputes_count: number;
    refunds_count: number;
    refunds_amount_tnd: number;
    high_risk_vendors_count: number;
  };

  operations: {
    available: true;
    pending_kyc_count: number;
    approved_kyc_count: number;
    rejected_kyc_count: number;
    kyc_approval_rate_pct: number | null;
    open_support_tickets: number;
    urgent_support_tickets: number;
  };
}

// ==========================================================
// Part 6: Drill-down & Saved View DTOs
// ==========================================================

export interface AnalyticsDrilldownQueryParams {
  timeRange?: AnalyticsTimeRange;
  startDate?: string;
  endDate?: string;
  currency?: string;

  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';

  storeId?: string;
  vendorId?: string;
  buyerId?: string;
  productId?: string;
  categoryId?: string;
  status?: string;
  eventType?: string;
  search?: string;
}

export interface DrilldownMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  sort_by: string;
  sort_dir: 'asc' | 'desc';
}

export interface PaginatedDrilldownResponse<T> {
  range: NormalizedAnalyticsRange;
  data: T[];
  meta: DrilldownMeta;
}

export interface OrderDrilldownItem {
  id: string;
  created_at: string;
  store_id: string | null;
  store_name: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  status: string;
  payment_status: string;
  total_amount_tnd: number;
  payment_gateway: string | null;
  action_url: string;
}

export interface VendorDrilldownItem {
  store_id: string;
  store_name: string;
  vendor_id: string | null;
  vendor_email: string | null;
  status: string;
  created_at: string;
  product_count: number;
  order_count: number;
  total_gmv_tnd: number;
  kyc_status: string | null;
  action_url: string;
}

export interface BuyerDrilldownItem {
  buyer_id: string;
  buyer_email: string | null;
  created_at: string;
  order_count: number;
  total_spend_tnd: number;
  is_repeat_buyer: boolean;
  last_order_at: string | null;
  action_url: string;
}

export interface ProductDrilldownItem {
  product_id: string;
  title: string;
  store_id: string | null;
  store_name: string | null;
  status: string;
  price_tnd: number;
  views_count: number;
  clicks_count: number;
  add_to_cart_count: number;
  created_at: string;
  action_url: string;
}

export interface SearchDrilldownItem {
  query_hash: string;
  query_display: string;
  search_count: number;
  zero_result_count: number;
  zero_result_rate_pct: number;
  click_count: number;
  last_searched_at: string;
}

export interface EventDrilldownItem {
  id: string;
  event_type: string;
  occurred_at: string;
  store_id: string | null;
  product_id: string | null;
  order_id: string | null;
  user_id: string | null;
  source: string;
  path: string | null;
  locale: string | null;
  metadata_summary: string;
}

export interface PayoutDrilldownItem {
  id: string;
  store_id: string;
  store_name: string | null;
  amount_tnd: number;
  status: string;
  bank_name: string | null;
  created_at: string;
  processed_at: string | null;
  action_url: string;
}

export interface RiskDrilldownItem {
  id: string;
  type: 'report' | 'dispute' | 'refund';
  store_id: string | null;
  store_name: string | null;
  reporter_email: string | null;
  reason: string;
  status: string;
  amount_tnd: number | null;
  created_at: string;
  action_url: string;
}

export interface OperationsDrilldownItem {
  id: string;
  type: 'kyc' | 'support_ticket';
  entity_id: string;
  title_or_name: string;
  status: string;
  priority: string | null;
  created_at: string;
  updated_at: string;
  action_url: string;
}

export interface MetricDefinitionDTO {
  key: string;
  label: string;
  description: string;
  source_tables: string[];
  calculation: string;
  scope: 'selected_period' | 'current_state';
  availability: 'available' | 'unavailable';
  caveats: string[];
}

export interface SavedViewDTO {
  id: string;
  admin_user_id: string;
  name: string;
  description: string | null;
  filters: Record<string, unknown>;
  visible_tabs: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSavedViewInput {
  name: string;
  description?: string;
  filters: Record<string, unknown>;
  visible_tabs?: string[];
  is_default?: boolean;
}

// --- Part 7 Intelligence Types ---

export type AnomalySeverity = 'info' | 'warning' | 'critical';

export interface AnomalyInsightItem {
  id: string;
  metric_key: string;
  label: string;
  insight_type: 'anomaly';
  direction: 'up' | 'down';
  severity: AnomalySeverity;
  current_value: number;
  baseline_value: number;
  delta_pct: number;
  explanation: string;
  recommended_action: string | null;
  drilldown_type: string | null;
  drilldown_filters: Record<string, unknown>;
}

export interface AnomalyResponseDTO {
  range: NormalizedAnalyticsRange;
  available: boolean;
  insights: AnomalyInsightItem[];
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface VendorRiskSignal {
  key: string;
  label: string;
  value: number | string | null;
  score_contribution: number;
  explanation: string;
}

export interface VendorRiskItem {
  store_id: string;
  store_name: string;
  vendor_user_id: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  signals: VendorRiskSignal[];
  missing_signals: string[];
  recommended_actions: string[];
  drilldown_filters: Record<string, unknown>;
}

export interface VendorRiskResponseDTO {
  range: NormalizedAnalyticsRange;
  available: boolean;
  vendors: VendorRiskItem[];
  meta: {
    total: number;
    high_risk_count: number;
    critical_risk_count: number;
  };
}

export interface ChurnRiskSignal {
  key: string;
  label: string;
  value: number | string | null;
  score_contribution: number;
  explanation: string;
}

export interface ChurnRiskItem {
  store_id: string;
  store_name: string;
  churn_risk_score: number;
  churn_risk_level: RiskLevel;
  signals: ChurnRiskSignal[];
  recommended_actions: string[];
}

export interface ChurnRiskResponseDTO {
  range: NormalizedAnalyticsRange;
  available: boolean;
  vendors: ChurnRiskItem[];
}

export type CohortType = 'seller_signup' | 'buyer_signup' | 'first_order' | 'store_creation' | 'subscription_plan';

export interface CohortPeriod {
  period_index: number;
  retained_count: number;
  retention_pct: number | null;
  revenue_tnd: number | null;
  orders_count: number | null;
}

export interface CohortItem {
  cohort_key: string;
  cohort_label: string;
  cohort_month: string;
  cohort_size: number;
  periods: CohortPeriod[];
}

export interface CohortResponseDTO {
  range: NormalizedAnalyticsRange;
  cohort_type: CohortType;
  cohorts: CohortItem[];
}

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportScheduleDTO {
  id: string;
  admin_user_id: string;
  name: string;
  frequency: ReportFrequency;
  timezone: string;
  recipients: string[];
  filters: Record<string, unknown>;
  include_sections: string[];
  format: 'csv' | 'html';
  is_active: boolean;
  last_sent_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReportScheduleInput {
  name: string;
  frequency: ReportFrequency;
  timezone?: string;
  recipients: string[];
  filters?: Record<string, unknown>;
  include_sections?: string[];
  format?: 'csv' | 'html';
  is_active?: boolean;
}

export interface ReportExecutionResultDTO {
  schedule_id: string;
  executed_at: string;
  email_sent: boolean;
  delivery_note: string;
  report_summary: {
    executive_overview: string;
    total_gmv_tnd: number;
    total_orders: number;
    active_anomalies_count: number;
    high_risk_vendors_count: number;
    sections_included: string[];
  };
  csv_content?: string;
}

// ==========================================================
// Part 8: Production Hardening DTOs
// ==========================================================

export interface AnalyticsCacheMetaDTO {
  hit: boolean;
  key: string;
  ttl_seconds: number;
  generated_at: string;
  data_source?: 'rollup' | 'raw' | 'mixed';
}

export interface AnalyticsRetentionStatusDTO {
  raw_event_retention_days: number;
  rollup_retention_days: number;
  snapshot_retention_days: number;
  oldest_raw_event_at: string | null;
  newest_raw_event_at: string | null;
  raw_event_count: number;
  estimated_events_expired: number;
  last_cleanup_at: string | null;
}

export interface AnalyticsRetentionCleanupInput {
  dryRun?: boolean;
  batchSize?: number;
}

export interface AnalyticsRetentionCleanupResultDTO {
  dry_run: boolean;
  deleted_events: number;
  retention_days: number;
  cutoff: string;
  execution_time_ms: number;
}

export interface RollupsRecomputeInput {
  startDate: string;
  endDate: string;
  includeSearch?: boolean;
  includeEvents?: boolean;
}

export interface RollupsRecomputeResultDTO {
  start_date: string;
  end_date: string;
  days_processed: number;
  event_rollups_inserted: number;
  search_rollups_inserted: number;
  execution_time_ms: number;
}

export type CacheInvalidationScope =
  | 'all'
  | 'overview'
  | 'business'
  | 'events'
  | 'drilldowns'
  | 'intelligence'
  | 'saved_views';

export interface CacheInvalidateInput {
  scope?: CacheInvalidationScope;
}

export interface CacheInvalidateResultDTO {
  scope: CacheInvalidationScope;
  cleared_keys_count: number;
  timestamp: string;
}

export interface AnalyticsHealthDTO {
  status: 'healthy' | 'degraded';
  raw_events: {
    count_24h: number;
    latest_event_at: string | null;
  };
  rollups: {
    latest_event_rollup_date: string | null;
    latest_search_rollup_date: string | null;
  };
  cache: {
    available: boolean;
    latency_ms: number | null;
  };
  scheduled_reports: {
    active_count: number;
    overdue_count: number;
  };
  retention: {
    expired_events_estimate: number;
  };
  warnings: string[];
}


