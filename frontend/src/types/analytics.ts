/**
 * Frontend Superadmin Platform Analytics TypeScript Contracts — Time Range & Truthful Schema
 */

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | '12m' | 'all';
export type AnalyticsCurrency = 'TND' | 'USD' | 'EUR';
export type AnalyticsTabID = 'overview' | 'financials' | 'vendors' | 'ads' | 'system' | 'business';

export interface AnalyticsFilterParams {
  timeRange?: AnalyticsTimeRange;
  currency?: AnalyticsCurrency;
  startDate?: string;
  endDate?: string;
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

export interface PlatformOverviewData {
  range: NormalizedAnalyticsRange;
  metric_scope: MetricScopeMetadata;
  financials: {
    total_gmv: number;
    marketplace_order_gmv: number;
    subscription_revenue: number;
    net_revenue: number;
    funds_in_escrow: number;
    released_payouts: number;
    total_orders: number;
    currency: 'TND';
    requested_currency: string;
    currency_conversion_available: boolean;
    gmv_source_note: string;
    gmv_growth_pct: number | null;
    net_revenue_growth_pct: number | null;
    orders_growth_pct: number | null;
    growth_notes?: string;
  };
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

export interface PlatformRevenueData {
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
    currency_conversion_available: boolean;
  };
  mrr_movement: {
    new_mrr: number | null;
    expansion_mrr: number | null;
    contraction_mrr: number | null;
    churned_mrr: number | null;
    total_mrr: number;
    total_arr: number;
    mrr_movement_available: boolean;
    mrr_movement_unavailable_reason?: string;
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

export interface PlatformVendorData {
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

export interface PlatformAdsData {
  range: NormalizedAnalyticsRange;
  metric_scope: MetricScopeMetadata;
  ads_financials: {
    total_ad_revenue_tnd: number;
    total_campaigns: number;
    active_campaigns: number;
    currency: 'TND';
    requested_currency: string;
    currency_conversion_available: boolean;
    ad_revenue_growth_pct: number | null;
  };
  performance_metrics: {
    total_impressions: number;
    total_clicks: number;
    avg_ctr_pct: number;
    avg_cpc_tnd: number;
    estimated_roas: number | null;
    conversion_attribution_available: boolean;
  };
  slot_utilization_pct: number | null;
  slot_inventory_available: boolean;
}

export interface PlatformSystemData {
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
    details: Record<string, unknown> | null;
    created_at: string;
  }>;
}

export interface PlatformBusinessAnalytics {
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

// Aliases for convenience
export type PlatformOverviewAnalytics = PlatformOverviewData;
export type PlatformRevenueAnalytics = PlatformRevenueData;
export type PlatformVendorAnalytics = PlatformVendorData;
export type PlatformAdsAnalytics = PlatformAdsData;
export type PlatformSystemAnalytics = PlatformSystemData;

// ==========================================================
// Part 6: Drill-Down & Saved View Types
// ==========================================================

export type DrilldownType = 'orders' | 'vendors' | 'buyers' | 'products' | 'search' | 'events';

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

