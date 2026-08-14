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

export interface PageViewsInteractionAnalyticsDTO {
  range: NormalizedAnalyticsRange;
  metric_scope: MetricScopeMetadata;
  summary: {
    total_page_views: number;
    unique_visitors: number;
    registered_user_views: number;
    anonymous_visitor_views: number;
    marketplace_views: number;
    storefront_views: number;
    live_active_visitors_now: number;
    avg_session_duration_seconds: number;
    bounce_rate_pct: number;
    views_growth_pct: number | null;
  };
  top_pages_viewed: Array<{
    path: string;
    type: 'marketplace' | 'storefront' | 'admin' | 'other';
    views_count: number;
    unique_visitors: number;
    avg_time_seconds: number;
  }>;
  top_products_viewed: Array<{
    product_id: string;
    title: string;
    store_name: string;
    store_host: string;
    price_tnd: number;
    views_count: number;
    unique_visitors: number;
    add_to_cart_count: number;
    orders_count: number;
    conversion_rate_pct: number;
  }>;
  top_products_ordered: Array<{
    product_id: string;
    title: string;
    store_name: string;
    store_host: string;
    units_sold: number;
    total_revenue_tnd: number;
    views_count: number;
    conversion_rate_pct: number;
  }>;
  top_storefronts_by_views: Array<{
    store_id: string;
    store_name: string;
    store_host: string;
    views_count: number;
    unique_visitors: number;
    active_listings_count: number;
  }>;
  top_storefronts_by_sales: Array<{
    store_id: string;
    store_name: string;
    store_host: string;
    total_orders_count: number;
    total_sales_gmv_tnd: number;
    page_views_count: number;
    conversion_rate_pct: number;
  }>;
  top_marketplace_searches: Array<{
    query: string;
    search_count: number;
    avg_results_count: number;
    zero_results_pct: number;
  }>;
  top_storefront_searches: Array<{
    query: string;
    store_name: string;
    store_host: string;
    search_count: number;
    avg_results_count: number;
  }>;
  visit_sources: Array<{
    referrer_domain: string;
    views_count: number;
    share_pct: number;
  }>;
  device_breakdown: Array<{
    device_type: string;
    views_count: number;
    share_pct: number;
  }>;
  live_activity_feed: Array<{
    id: string;
    event_type: string;
    path: string;
    user_role: string | null;
    store_name: string | null;
    device_type: string;
    occurred_at: string;
  }>;
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

// ==========================================================
// Part 9: R1 & R2 Core Analytics & Financials Types & DTOs
// ==========================================================

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
    throw new Error('Invalid monetary amount for currency normalization');
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

export function formatCurrencyByCode(
  amountTnd: number,
  currency: 'TND' | 'EUR' | 'USD' | string = 'TND',
  fxRates = PLATFORM_FX_RATES,
): {
  amount: number;
  currency: 'TND' | 'EUR' | 'USD';
  formatted: string;
} {
  const norm = normalizeCurrency(amountTnd, fxRates);
  const upper = (currency || 'TND').toUpperCase();
  switch (upper) {
    case 'EUR':
      return { amount: norm.eur, currency: 'EUR', formatted: norm.formatted_eur };
    case 'USD':
      return { amount: norm.usd, currency: 'USD', formatted: norm.formatted_usd };
    case 'TND':
    default:
      return { amount: norm.tnd, currency: 'TND', formatted: norm.formatted_tnd };
  }
}

// ----------------------------------------------------------
// R1: Live Pulse & 60s Sliding Buffer
// ----------------------------------------------------------

export interface RawTelemetryEvent {
  id: string;
  timestamp: string;
  visitor_hash: string;
  session_hash?: string;
  event_type: string;
  store_id?: string | null;
  amount_tnd?: number;
}

export interface VelocityPoint {
  second_offset: number; // 0 to 59
  second_index?: number; // alias for 0 to 59
  timestamp: string;
  epoch_second?: number;
  visitor_count: number;
  event_count: number;
  checkout_velocity: number;
  gmv_velocity_tnd?: number;
  order_velocity?: number;
  active_visitors?: number;
}

export interface LiveVelocityResult {
  reference_time: string;
  total_events_60s: number;
  unique_visitors_60s: number;
  checkout_events_60s: number;
  peak_events_per_sec: number;
  points: VelocityPoint[];
}

export type MicroTickerEventType =
  | 'cart_add'
  | 'checkout_started'
  | 'payment_attempted'
  | 'payment_success'
  | 'payment_failed'
  | 'order_created'
  | 'checkout_completed'
  | 'order_placed';

export interface LiveCheckoutItem {
  id: string;
  order_id: string;
  store_name: string;
  subdomain?: string;
  amount_tnd: number;
  payment_gateway: 'flouci' | 'konnect' | 'manual_mandat' | 'stripe' | 'paypal' | 'cod';
  status: 'captured' | 'pending' | 'failed';
  governorate_code: string | null;
  governorate_name: string | null;
  country_code: string;
  occurred_at: string;
}

export interface LiveCheckoutTickerItem {
  id: string;
  order_id?: string;
  event_type: MicroTickerEventType;
  occurred_at: string;
  customer_display: string;
  customer_role: 'guest' | 'buyer' | 'seller';
  store_id: string | null;
  store_name: string | null;
  subdomain?: string | null;
  product_title: string | null;
  item_count: number;
  amount_tnd: number | null;
  currency: 'TND' | 'EUR' | 'USD';
  governorate_code: string | null;
  governorate_name?: string | null;
  country_code: string;
  status: 'success' | 'pending' | 'failed' | 'captured';
  payment_gateway?: string | null;
}

export type PulseAnomalyType =
  | 'throughput_drop'
  | 'failure_spike'
  | 'gmv_surge'
  | 'high_cart_abandonment'
  | 'checkout_failure_rate'
  | 'checkout_velocity_surge'
  | 'whale_order_detected';

export interface PulseAnomalyAlertItem {
  id: string;
  type?: PulseAnomalyType;
  metric?: string;
  severity?: 'info' | 'warning' | 'critical';
  level?: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  current_value?: number;
  baseline_value?: number;
  delta_pct?: number;
  value?: number;
  threshold?: number;
  detected_at?: string;
  triggered_at?: string;
  suggested_action?: string;
}

export type AnomalyAlert = PulseAnomalyAlertItem;

export interface ActiveVisitorsBreakdown {
  total_active_now: number;
  active_last_60s: number;
  registered_buyers: number;
  registered_sellers: number;
  anonymous_guests: number;
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export interface LivePulseSummary {
  total_events_60s: number;
  total_orders_60s: number;
  total_gmv_60s_tnd: number;
  avg_events_per_sec: number;
  avg_gmv_per_sec_tnd: number;
  peak_events_per_sec: number;
  conversion_rate_60s_pct: number | null;
}

export interface LivePulseResponseDTO {
  server_time: string;
  live_active_visitors_now: number;
  active_visitors: ActiveVisitorsBreakdown;
  summary_60s: LivePulseSummary;
  velocity_buffer: VelocityPoint[];
  velocity: VelocityPoint[];
  micro_ticker: LiveCheckoutTickerItem[];
  anomaly_alerts: PulseAnomalyAlertItem[];
  metrics?: {
    total_events_60s: number;
    checkout_events_60s: number;
    peak_events_per_sec: number;
    failure_rate_pct: number;
    total_volume_60s_tnd: number;
  };
}

// ----------------------------------------------------------
// R1: Tunisia 24-Governorates & Top Diaspora Heatmap
// ----------------------------------------------------------

export type TunisiaGovernorateCode =
  | 'TUN'
  | 'ARI'
  | 'BEN'
  | 'MAN'
  | 'NAB'
  | 'ZAG'
  | 'BIZ'
  | 'BEJ'
  | 'JEN'
  | 'KEF'
  | 'SIL'
  | 'SOU'
  | 'MON'
  | 'MAH'
  | 'SFA'
  | 'KAI'
  | 'KAS'
  | 'SID'
  | 'GAF'
  | 'TOZ'
  | 'KEB'
  | 'GAB'
  | 'MED'
  | 'TAT';

export interface GeoHeatmapGovernorateDTO {
  code: string; // e.g. 'TUN', 'SFA', 'SOU'
  governorate_code?: string; // alias
  iso_code?: string;
  name_fr: string;
  name_ar: string;
  name_en: string;
  region_zone?: string;
  revenue_tnd: number;
  gmv_tnd?: number; // alias
  gmv_converted?: number;
  gmv_formatted?: string;
  orders_count: number;
  paid_orders_count?: number; // alias
  aov_tnd: number;
  aov_converted?: number;
  aov_formatted?: string;
  unique_buyers_count: number;
  unique_customers_count?: number; // alias
  revenue_share_pct: number;
  order_share_pct: number;
  heat_intensity: number; // 0.000 to 1.000 normalized score
  growth_pct?: number | null;
  pop_growth_pct?: number | null;
}

export type GovernorateHeatmapItem = GeoHeatmapGovernorateDTO;

export interface GeoHeatmapDiasporaCountryDTO {
  country_code: string; // ISO 3166-1 alpha-2, e.g. 'FR', 'IT', 'DE'
  country_name: string;
  flag_emoji?: string;
  revenue_tnd: number;
  gmv_tnd?: number; // alias
  gmv_converted?: number;
  gmv_formatted?: string;
  orders_count: number;
  paid_orders_count?: number; // alias
  aov_tnd: number;
  aov_converted?: number;
  aov_formatted?: string;
  unique_buyers_count?: number;
  unique_customers_count?: number;
  revenue_share_pct: number;
  order_share_pct?: number;
  heat_intensity: number; // 0.000 to 1.000 normalized score
  growth_pct?: number | null;
  pop_growth_pct?: number | null;
}

export type DiasporaHeatmapItem = GeoHeatmapDiasporaCountryDTO;

export interface GeoHeatmapSummaryDTO {
  total_tunisia_revenue_tnd: number;
  total_tunisia_gmv_tnd?: number; // alias
  total_diaspora_revenue_tnd: number;
  total_diaspora_gmv_tnd?: number; // alias
  total_revenue_tnd: number;
  total_marketplace_gmv_tnd?: number; // alias
  total_orders_count: number;
  total_paid_orders?: number; // alias
  top_governorate_code: string | null;
  top_governorate?: string | null; // alias
  top_diaspora_country_code: string | null;
  top_diaspora_country?: string | null; // alias
  domestic_share_pct: number;
  tunisia_share_pct?: number; // alias
  diaspora_share_pct: number;
}

export type GeoHeatmapSummary = GeoHeatmapSummaryDTO;

export interface GeoHeatmapResponseDTO {
  range: NormalizedAnalyticsRange;
  requested_currency?: string;
  currency?: 'TND' | 'EUR' | 'USD' | string;
  summary: GeoHeatmapSummaryDTO;
  governorates: GeoHeatmapGovernorateDTO[];
  diaspora_countries: GeoHeatmapDiasporaCountryDTO[];
  diaspora?: GeoHeatmapDiasporaCountryDTO[]; // alias
}

// ----------------------------------------------------------
// R2: Tri-Fold Financial Reconciliation
// ----------------------------------------------------------

export interface OrderReconciliationItem {
  id: string;
  store_id: string;
  subtotal_tnd: number;
  shipping_tnd: number;
  total_tnd: number;
  commission_rate_pct: number;
  status: 'paid' | 'delivered' | 'refunded' | 'cancelled';
  payout_status: 'pending_escrow' | 'released' | 'held';
}

export interface TriFoldReconciliationReport {
  range?: NormalizedAnalyticsRange;
  currency?: 'TND' | 'EUR' | 'USD' | string;
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
  period_comparison?: {
    gmv_growth_pct: number | null;
    net_revenue_growth_pct: number | null;
    commission_take_growth_pct: number | null;
    escrow_growth_pct: number | null;
  };
}

export type FinancialReconciliationDTO = TriFoldReconciliationReport;

// ----------------------------------------------------------
// R2: SaaS MRR Waterfall
// ----------------------------------------------------------

export interface SubscriptionPlanConfig {
  plan_id: 'free' | 'starter' | 'regular' | 'agency' | 'pro' | 'golden' | 'platinum';
  name: string;
  monthly_price_tnd: number;
  annual_price_tnd: number;
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
  range?: NormalizedAnalyticsRange;
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
  multi_currency?: {
    beginning_mrr: MultiCurrencyValue;
    new_mrr: MultiCurrencyValue;
    expansion_mrr: MultiCurrencyValue;
    contraction_mrr: MultiCurrencyValue;
    churned_mrr: MultiCurrencyValue;
    net_new_mrr: MultiCurrencyValue;
    ending_mrr: MultiCurrencyValue;
    ending_arr: MultiCurrencyValue;
  };
}

// ----------------------------------------------------------
// R2: Payment Gateways Reliability & Conversion Matrix
// ----------------------------------------------------------

export type PaymentGatewayType =
  | 'flouci'
  | 'konnect'
  | 'manual_mandat'
  | 'stripe'
  | 'paypal'
  | 'cod';

export type PaymentFailureReason =
  | 'card_declined'
  | 'insufficient_funds'
  | 'gateway_timeout'
  | '3ds_failed'
  | 'session_expired'
  | 'user_cancelled'
  | 'cod_refused_at_door'
  | 'invalid_credentials'
  | 'mandat_rejected';

export interface PaymentAttemptRecord {
  id: string;
  order_id: string;
  gateway: PaymentGatewayType;
  amount_tnd: number;
  status: 'captured' | 'failed' | 'pending';
  failure_reason?: PaymentFailureReason | null;
  latency_ms: number;
  created_at: string;
  settled_at?: string | null;
}

export interface PaymentGatewayFeeConfig {
  percentage_rate: number;
  fixed_fee_tnd: number;
}

export const GATEWAY_FEE_SCHEDULE: Record<PaymentGatewayType, PaymentGatewayFeeConfig> = {
  flouci: { percentage_rate: 0.015, fixed_fee_tnd: 0.000 },
  konnect: { percentage_rate: 0.025, fixed_fee_tnd: 0.300 },
  stripe: { percentage_rate: 0.029, fixed_fee_tnd: 0.300 },
  paypal: { percentage_rate: 0.034, fixed_fee_tnd: 0.350 },
  manual_mandat: { percentage_rate: 0.000, fixed_fee_tnd: 0.000 },
  cod: { percentage_rate: 0.000, fixed_fee_tnd: 0.000 },
};

export const GATEWAY_DISPLAY_NAMES: Record<PaymentGatewayType, string> = {
  flouci: 'Flouci (Mobile Wallet & Konnect)',
  konnect: 'Konnect Gateway (Cards & Gstore)',
  manual_mandat: 'Mandat Minute (La Poste Tunisienne)',
  stripe: 'Stripe International (Credit/Debit Cards)',
  paypal: 'PayPal International',
  cod: 'Cash on Delivery (COD Courier)',
};

export interface PaymentGatewayReliabilityItem {
  gateway: PaymentGatewayType;
  display_name: string;
  total_attempts: number;
  successful_captures: number;
  failed_attempts: number;
  pending_attempts: number;
  success_rate_pct: number;
  total_volume_tnd: number;
  avg_latency_seconds: number;
  estimated_gateway_fees_tnd: number;
  error_breakdown: Record<string, number>;
}

export interface GatewayReliabilityMatrixResponse {
  range?: NormalizedAnalyticsRange;
  total_attempts_all_gateways: number;
  total_successful_all_gateways: number;
  overall_success_rate_pct: number;
  total_volume_all_gateways_tnd: number;
  total_estimated_fees_tnd: number;
  gateways: PaymentGatewayReliabilityItem[];
}




