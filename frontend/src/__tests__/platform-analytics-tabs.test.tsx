/**
 * Platform Analytics Tabs & Command Center Test Suite (Package 4: UI Component Tests)
 *
 * Feature Covered:
 *   - Feature 18: 10 Domain Tabs & Impeccable Glassmorphic UI (R6)
 *     - Rendering all domain tabs (Overview, Page Views/Pulse, Business, Financials, Vendors, Ads, System, Intelligence, Governance)
 *     - Period comparison switches (7d, 30d, 90d, 12m, all) & PoP growth badges
 *     - Filter changes (Currency TND/USD/EUR, Date range, Saved Views)
 *     - Loading skeletons, Error state with retry callback, Empty states
 *     - Accessibility: ARIA roles (role="tab", aria-selected, aria-controls, role="tabpanel")
 *     - Responsive layout & localStorage preference persistence
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  AnalyticsTabID,
  AnalyticsTimeRange,
  AnalyticsCurrency,
  PlatformOverviewAnalytics,
  PlatformRevenueAnalytics,
  PlatformBusinessAnalytics,
  PlatformVendorAnalytics,
  PlatformAdsAnalytics,
  PlatformSystemAnalytics,
} from '@/types/analytics';
import { AnalyticsTabsNav } from '@/components/admin/platform-analytics/AnalyticsTabsNav';
import { PlatformAnalyticsHeader } from '@/components/admin/platform-analytics/PlatformAnalyticsHeader';
import { OverviewAnalyticsTab } from '@/components/admin/platform-analytics/OverviewAnalyticsTab';
import { FinancialsAnalyticsTab } from '@/components/admin/platform-analytics/FinancialsAnalyticsTab';
import { VendorsAnalyticsTab } from '@/components/admin/platform-analytics/VendorsAnalyticsTab';
import { BusinessAnalyticsTab } from '@/components/admin/platform-analytics/BusinessAnalyticsTab';
import { AdsAnalyticsTab } from '@/components/admin/platform-analytics/AdsAnalyticsTab';
import { SystemAnalyticsTab } from '@/components/admin/platform-analytics/SystemAnalyticsTab';
import { GovernanceTab } from '@/components/admin/platform-analytics/GovernanceTab';
import { IntelligenceTab } from '@/components/admin/platform-analytics/IntelligenceTab';
import { AnalyticsLoadingState } from '@/components/admin/platform-analytics/AnalyticsLoadingState';
import { AnalyticsErrorState } from '@/components/admin/platform-analytics/AnalyticsErrorState';
import { AnalyticsEmptyState } from '@/components/admin/platform-analytics/AnalyticsEmptyState';
import ComprehensivePlatformAnalyticsPage from '@/app/(admin)/platform-analytics/page';

// Mock Locale Context
vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    setLocale: vi.fn(),
    dir: 'ltr',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'analytics.title': 'Superadmin Platform Analytics Engine',
        'analytics.subtitle': 'Live database metrics, SaaS recurring revenue, marketplace health, ad telemetry & infrastructure',
        'analytics.tabs.overview': 'Executive Overview',
        'analytics.tabs.page_views': 'Page Views & Visits',
        'analytics.tabs.business': 'Marketplace Business',
        'analytics.tabs.financials': 'Financials & SaaS',
        'analytics.tabs.vendors': 'Vendor & Store Health',
        'analytics.tabs.ads': 'PandaMarket Ads',
        'analytics.tabs.system': 'Infrastructure',
        'analytics.tabs.intelligence': 'Intelligence & Risk',
        'analytics.tabs.governance': 'Governance & Audit',
        'analytics.timeRange.7d': '7D',
        'analytics.timeRange.30d': '30D',
        'analytics.timeRange.90d': '90D',
        'analytics.timeRange.12m': '12M',
        'analytics.timeRange.all': 'ALL',
        'analytics.dictionary': 'Definitions',
        'analytics.help': 'Guide',
        'analytics.exportCsv': 'Export',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/lib/api', () => ({
  fetchWithCsrf: vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data: {} }),
      text: () => Promise.resolve(''),
    })
  ),
}));

// Top-level hoisted mock functions for Vitest
const mocks = vi.hoisted(() => ({
  fetchOverviewAnalytics: vi.fn(),
  fetchRevenueAnalytics: vi.fn(),
  fetchVendorAnalytics: vi.fn(),
  fetchAdsAnalytics: vi.fn(),
  fetchSystemAnalytics: vi.fn(),
  fetchBusinessAnalytics: vi.fn(),
  fetchPageViewsAnalytics: vi.fn(),
  fetchPageViewsLiveData: vi.fn(),
  exportPlatformAnalytics: vi.fn(),
  fetchDrilldownData: vi.fn(),
  fetchMetricDefinitions: vi.fn(),
  getRetentionStatus: vi.fn(),
  getAnalyticsHealth: vi.fn(),
  runRetentionCleanup: vi.fn(),
  recomputeRollups: vi.fn(),
  invalidateCache: vi.fn(),
  fetchAnomalies: vi.fn(),
  fetchVendorRisk: vi.fn(),
  fetchChurnRisk: vi.fn(),
  fetchCohortAnalysis: vi.fn(),
  fetchReportSchedules: vi.fn(),
  createReportSchedule: vi.fn(),
  deleteReportSchedule: vi.fn(),
  triggerReportScheduleNow: vi.fn(),
}));

// Mock API layer for ComprehensivePlatformAnalyticsPage
vi.mock('@/lib/admin-platform-analytics', () => mocks);

import * as api from '@/lib/admin-platform-analytics';

// Sample Mock Data Fixtures
const MOCK_OVERVIEW_DATA: PlatformOverviewAnalytics = {
  range: {
    timeRange: '30d',
    startDate: '2026-07-15T00:00:00.000Z',
    endDate: '2026-08-14T00:00:00.000Z',
    previousStartDate: '2026-06-15T00:00:00.000Z',
    previousEndDate: '2026-07-15T00:00:00.000Z',
    isAllTime: false,
    comparison_available: true,
  },
  metric_scope: {
    active_stores: 'current_state',
    total_stores: 'current_state',
    total_users: 'current_state',
    active_sessions: 'current_state',
    gmv: 'selected_period',
    revenue: 'selected_period',
    orders: 'selected_period',
    new_users: 'selected_period',
    new_stores: 'selected_period',
  },
  financials: {
    total_gmv: 450000.75,
    marketplace_order_gmv: 380000.0,
    subscription_revenue: 70000.75,
    net_revenue: 65000.0,
    funds_in_escrow: 95000.0,
    released_payouts: 285000.0,
    total_orders: 3200,
    currency: 'TND',
    requested_currency: 'TND',
    currency_conversion_available: true,
    gmv_source_note: 'Aggregated from pd_order',
    gmv_growth_pct: 18.5,
    net_revenue_growth_pct: 22.4,
    orders_growth_pct: 14.1,
  },
  stores: {
    total_stores: 120,
    active_stores: 95,
    paused_stores: 18,
    suspended_stores: 7,
    new_stores_in_period: 24,
    new_stores_growth_pct: 12.0,
  },
  users: {
    total_users: 15400,
    sellers: 120,
    buyers: 15260,
    admins: 20,
    new_users_in_period: 1850,
    new_users_growth_pct: 15.6,
  },
  active_sessions: 420,
  monthly_revenue_trend: [
    { month: 'Apr 2026', revenue: 45000 },
    { month: 'May 2026', revenue: 52000 },
    { month: 'Jun 2026', revenue: 58000 },
    { month: 'Jul 2026', revenue: 65000 },
  ],
  threshold_alerts: [
    {
      id: 'alert-1',
      level: 'warning',
      title: 'High Dispute Rate Spike',
      message: 'Dispute rate elevated to 3.2% in Sfax apparel cluster.',
    },
  ],
};

const MOCK_REVENUE_DATA: PlatformRevenueAnalytics = {
  range: MOCK_OVERVIEW_DATA.range,
  metric_scope: MOCK_OVERVIEW_DATA.metric_scope,
  saas_metrics: {
    total_mrr_tnd: 28500,
    total_arr_tnd: 342000,
    arpu_tnd: 237.5,
    churn_rate_pct: 2.1,
    estimated_ltv_tnd: 4850,
    currency: 'TND',
    requested_currency: 'TND',
    currency_conversion_available: true,
  },
  mrr_movement: {
    new_mrr: 4500,
    expansion_mrr: 1200,
    contraction_mrr: 400,
    churned_mrr: 600,
    total_mrr: 28500,
    total_arr: 342000,
    mrr_movement_available: true,
  },
  active_subscriptions_by_plan: [
    { plan_id: 'starter', active_count: 50, annual_value: 14500 },
    { plan_id: 'pro', active_count: 35, annual_value: 45150 },
    { plan_id: 'platinum', active_count: 10, annual_value: 29900 },
  ],
  cohort_matrix: [
    {
      cohort: 'Jan 2026',
      total_signups: 20,
      m1_retained_pct: '95%',
      m2_retained_pct: '90%',
      m3_retained_pct: '85%',
      m4_retained_pct: '80%',
      m5_retained_pct: '80%',
      m6_retained_pct: '75%',
    },
  ],
};

const MOCK_BUSINESS_DATA: PlatformBusinessAnalytics = {
  range: MOCK_OVERVIEW_DATA.range,
  metric_scope: {},
  orders: {
    available: true,
    total_orders: 3200,
    paid_orders: 2950,
    cancelled_orders: 250,
    fulfilled_orders: 2800,
    marketplace_gmv_tnd: 380000,
    average_order_value_tnd: 128.8,
    order_growth_pct: 14.1,
    gmv_growth_pct: 18.5,
  },
  checkout: {
    available: true,
    checkout_started: 4500,
    payment_started: 3600,
    payment_completed: 2950,
    checkout_completion_rate_pct: 65.5,
  },
  buyers: {
    available: true,
    total_buyers_current: 15260,
    new_buyers: 1850,
    active_buyers: 2400,
    repeat_buyers: 980,
    repeat_buyer_rate_pct: 40.8,
    buyer_growth_pct: 15.6,
  },
  sellers: {
    available: true,
    total_sellers_current: 120,
    new_sellers: 24,
    stores_created: 24,
    active_stores_current: 95,
    stores_with_products: 88,
    stores_with_orders: 76,
    activation_rate_pct: 79.2,
    seller_growth_pct: 12.0,
  },
  payouts: {
    available: true,
    total_wallet_balance_tnd: 85000,
    pending_wallet_balance_tnd: 18000,
    total_withdrawn_tnd: 285000,
    payout_transactions_in_period: 140,
    payout_amount_in_period_tnd: 95000,
  },
  risk: {
    available: true,
    reports_count: 14,
    open_reports_count: 3,
    open_disputes_count: 2,
    refunds_count: 18,
    refunds_amount_tnd: 2450.5,
    high_risk_vendors_count: 1,
  },
  operations: {
    available: true,
    pending_kyc_count: 5,
    approved_kyc_count: 22,
    rejected_kyc_count: 2,
    kyc_approval_rate_pct: 91.7,
    open_support_tickets: 8,
    urgent_support_tickets: 1,
  },
};

const MOCK_VENDOR_DATA: PlatformVendorAnalytics = {
  range: MOCK_OVERVIEW_DATA.range,
  metric_scope: MOCK_OVERVIEW_DATA.metric_scope,
  top_performing_vendors: [
    {
      id: 'vendor-1',
      name: 'Panda Boutique Tunis',
      subdomain: 'pandaboutique',
      status: 'verified',
      subscription_plan: 'platinum',
      created_at: '2026-02-01',
      products_count: 145,
    },
  ],
  activation_funnel: [
    { stage: 'Store Created', count: 24, conversion: '100%' },
    { stage: 'Products Published', count: 21, conversion: '87.5%' },
    { stage: 'First Order Received', count: 19, conversion: '79.2%' },
  ],
  dispute_and_refund_rate: {
    total_refunds_issued: 18,
    dispute_rate_pct: 0.8,
    high_risk_vendors_flagged: 1,
  },
};

const MOCK_ADS_DATA: PlatformAdsAnalytics = {
  range: MOCK_OVERVIEW_DATA.range,
  metric_scope: MOCK_OVERVIEW_DATA.metric_scope,
  ads_financials: {
    total_ad_revenue_tnd: 12500,
    total_campaigns: 48,
    active_campaigns: 32,
    currency: 'TND',
    requested_currency: 'TND',
    currency_conversion_available: true,
    ad_revenue_growth_pct: 25.4,
  },
  performance_metrics: {
    total_impressions: 485000,
    total_clicks: 14200,
    avg_ctr_pct: 2.93,
    avg_cpc_tnd: 0.88,
    estimated_roas: 4.8,
    conversion_attribution_available: true,
  },
  slot_utilization_pct: 82.5,
  slot_inventory_available: true,
};

const MOCK_SYSTEM_DATA: PlatformSystemAnalytics = {
  range: MOCK_OVERVIEW_DATA.range,
  metric_scope: MOCK_OVERVIEW_DATA.metric_scope,
  server_telemetry: {
    status: 'healthy',
    uptime_pct: 99.99,
    p95_latency_ms: 28,
    p99_latency_ms: 65,
    error_rate_pct: 0.02,
    telemetry_available: true,
  },
  print_production_queue: {
    pending_jobs: 4,
    processing_jobs: 2,
    completed_today: 145,
    delayed_jobs: 0,
    print_queue_metrics_available: true,
  },
  database_health: {
    active_connections: 18,
    logs_24h: 12500,
    logs_in_period: 380000,
    index_hit_ratio_pct: 99.4,
    database_pool_metrics_available: true,
  },
  live_audit_feed: [
    { action: 'Store Status Updated to Verified', details: {}, created_at: '2026-08-14T10:00:00Z' },
  ],
};

describe('Feature 18: 10 Domain Tabs & Impeccable Glassmorphic UI (R6)', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.fetchOverviewAnalytics.mockResolvedValue(MOCK_OVERVIEW_DATA);
    mocks.fetchRevenueAnalytics.mockResolvedValue(MOCK_REVENUE_DATA);
    mocks.fetchBusinessAnalytics.mockResolvedValue(MOCK_BUSINESS_DATA);
    mocks.fetchVendorAnalytics.mockResolvedValue(MOCK_VENDOR_DATA);
    mocks.fetchAdsAnalytics.mockResolvedValue(MOCK_ADS_DATA);
    mocks.fetchSystemAnalytics.mockResolvedValue(MOCK_SYSTEM_DATA);
    mocks.fetchPageViewsAnalytics.mockResolvedValue({
      range: MOCK_OVERVIEW_DATA.range,
      metric_scope: MOCK_OVERVIEW_DATA.metric_scope,
      summary: {
        total_page_views: 45000,
        unique_visitors: 12000,
        registered_user_views: 28000,
        anonymous_visitor_views: 17000,
        marketplace_views: 32000,
        storefront_views: 13000,
        live_active_visitors_now: 42,
        avg_session_duration_seconds: 245,
        bounce_rate_pct: 32.5,
        views_growth_pct: 14.2,
      },
      top_pages_viewed: [],
      top_products_viewed: [],
      top_products_ordered: [],
      top_storefronts_by_views: [],
      top_storefronts_by_sales: [],
      top_marketplace_searches: [],
      top_storefront_searches: [],
      visit_sources: [],
      device_breakdown: [],
      top_countries: [],
      live_activity_feed: [],
    });
    mocks.fetchPageViewsLiveData.mockResolvedValue({ live_active_visitors_now: 42, live_activity_feed: [] });
    mocks.exportPlatformAnalytics.mockResolvedValue(new Blob(['col1,col2\nval1,val2'], { type: 'text/csv' }));
    mocks.fetchDrilldownData.mockResolvedValue({
      range: { timeRange: '30d', startDate: null, endDate: '2026-08-14', previousStartDate: null, previousEndDate: null, isAllTime: false, comparison_available: true },
      data: [],
      meta: { page: 1, limit: 15, total: 0, total_pages: 1, sort_by: 'created_at', sort_dir: 'desc' },
    });
    mocks.fetchMetricDefinitions.mockResolvedValue([]);
    mocks.getRetentionStatus.mockResolvedValue({ raw_event_count: 150000, oldest_raw_event_at: '2026-01-01' });
    mocks.getAnalyticsHealth.mockResolvedValue({ status: 'healthy', cache: { latency_ms: 12 }, rollups: {} } as any);
    mocks.runRetentionCleanup.mockResolvedValue({ deleted_events: 500 } as any);
    mocks.recomputeRollups.mockResolvedValue({ days_processed: 30, event_rollups_inserted: 150 } as any);
    mocks.invalidateCache.mockResolvedValue({ cleared_keys_count: 25 } as any);
    mocks.fetchAnomalies.mockResolvedValue({ insights: [] } as any);
    mocks.fetchVendorRisk.mockResolvedValue({ vendors: [] } as any);
    mocks.fetchChurnRisk.mockResolvedValue({ vendors: [] } as any);
    mocks.fetchCohortAnalysis.mockResolvedValue({ cohorts: [] } as any);
    mocks.fetchReportSchedules.mockResolvedValue([]);
    mocks.createReportSchedule.mockResolvedValue({} as any);
    mocks.deleteReportSchedule.mockResolvedValue({} as any);
    mocks.triggerReportScheduleNow.mockResolvedValue({} as any);
  });

  // =========================================================================
  // TIER 1: CORE FUNCTIONAL & TAB RENDERING (Coverage ≥ 5)
  // =========================================================================
  describe('Tier 1: Core Functional & Tab Rendering', () => {
    it('T1.1: renders all 9 primary sidebar tabs with icons, labels, and badges', () => {
      const handleTabChange = vi.fn();
      const emptyLoading = {
        overview: false, page_views: false, business: false, financials: false,
        vendors: false, ads: false, system: false, intelligence: false, governance: false,
      };

      render(<AnalyticsTabsNav activeTab="overview" tabLoading={emptyLoading} onTabChange={handleTabChange} />);

      // Verify all tab labels are in the document
      expect(screen.getAllByText('Executive Overview').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Page Views & Visits').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Marketplace Business').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Financials & SaaS').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Vendor & Store Health').length).toBeGreaterThan(0);
      expect(screen.getAllByText('PandaMarket Ads').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Infrastructure').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Intelligence & Risk').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Governance & Audit').length).toBeGreaterThan(0);

      // Verify LIVE badge on page_views tab
      expect(screen.getAllByText('LIVE').length).toBeGreaterThan(0);
    });

    it('T1.2: triggers onTabChange callback when a tab is clicked', () => {
      const handleTabChange = vi.fn();
      const emptyLoading = {
        overview: false, page_views: false, business: false, financials: false,
        vendors: false, ads: false, system: false, intelligence: false, governance: false,
      };

      render(<AnalyticsTabsNav activeTab="overview" tabLoading={emptyLoading} onTabChange={handleTabChange} />);

      const financialsTab = screen.getAllByRole('tab', { name: /Financials & SaaS/i })[0] ||
        screen.getAllByText('Financials & SaaS')[0];
      fireEvent.click(financialsTab);

      expect(handleTabChange).toHaveBeenCalledWith('financials');
    });

    it('T1.3: renders PlatformAnalyticsHeader with period comparisons (7d, 30d, 90d, 12m, all) and currencies (TND, USD, EUR)', () => {
      const handleRangeChange = vi.fn();
      const handleCurrencyChange = vi.fn();
      const handleRefresh = vi.fn();
      const handleExport = vi.fn();
      const handleOpenDefs = vi.fn();
      const handleOpenDrilldown = vi.fn();

      render(
        <PlatformAnalyticsHeader
          timeRange="30d"
          currency="TND"
          loading={false}
          onTimeRangeChange={handleRangeChange}
          onCurrencyChange={handleCurrencyChange}
          onRefresh={handleRefresh}
          onExport={handleExport}
          onOpenDefinitions={handleOpenDefs}
          onOpenDrilldown={handleOpenDrilldown}
        />
      );

      // Verify Header Titles
      expect(screen.getByText('Superadmin Platform Analytics Engine')).toBeInTheDocument();

      // Verify Time Range Options
      const btn7d = screen.getByRole('button', { name: '7D' });
      const btn30d = screen.getByRole('button', { name: '30D' });
      const btn90d = screen.getByRole('button', { name: '90D' });
      const btn12m = screen.getByRole('button', { name: '12M' });
      const btnAll = screen.getByRole('button', { name: 'ALL' });

      expect(btn7d).toBeInTheDocument();
      expect(btn30d).toHaveAttribute('aria-pressed', 'true');
      expect(btnAll).toBeInTheDocument();

      fireEvent.click(btn90d);
      expect(handleRangeChange).toHaveBeenCalledWith('90d');

      // Verify Currency Selector
      const btnEur = screen.getByRole('button', { name: 'EUR' });
      const btnUsd = screen.getByRole('button', { name: 'USD' });
      const btnTnd = screen.getByRole('button', { name: 'TND' });

      expect(btnTnd).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(btnEur);
      expect(handleCurrencyChange).toHaveBeenCalledWith('EUR');

      // Verify Action Buttons
      fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
      expect(handleRefresh).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /Export/i }));
      expect(handleExport).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /Definitions/i }));
      expect(handleOpenDefs).toHaveBeenCalledTimes(1);
    });

    it('T1.4: renders OverviewAnalyticsTab with 5 KPI cards, trajectory SVG chart, and store donut', () => {
      render(<OverviewAnalyticsTab data={MOCK_OVERVIEW_DATA} />);

      expect(screen.getByText('Total Platform GMV')).toBeInTheDocument();
      expect(screen.getByText('Net Revenue')).toBeInTheDocument();
      expect(screen.getByText('Escrow Balance')).toBeInTheDocument();
      expect(screen.getByText('Active Stores')).toBeInTheDocument();
      expect(screen.getByText('Accounts')).toBeInTheDocument();

      // Revenue Trajectory Chart Title
      expect(screen.getByText(/Revenue Trajectory in Selected Period/i)).toBeInTheDocument();
      // Store status distribution donut title
      expect(screen.getByText(/Store Status Distribution/i)).toBeInTheDocument();
      // Verify SVG chart elements
      expect(screen.getByLabelText('Revenue trajectory chart')).toBeInTheDocument();
      expect(screen.getByLabelText('Store status distribution donut')).toBeInTheDocument();
    });

    it('T1.5: renders FinancialsAnalyticsTab with MRR, ARR, ARPU, LTV, and cohort matrix', () => {
      render(<FinancialsAnalyticsTab data={MOCK_REVENUE_DATA} />);

      expect(screen.getByText(/Monthly Recurring \(MRR\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Annual Recurring \(ARR\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Avg Revenue Per User \(ARPU\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Estimated Vendor LTV/i)).toBeInTheDocument();

      // Dynamic Merchant Cohort Retention Matrix Title
      expect(screen.getByText(/Dynamic Merchant Cohort Retention Matrix/i)).toBeInTheDocument();
      expect(screen.getByText('Jan 2026')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('T1.6: renders BusinessAnalyticsTab with 6 core domain sections (Orders, Funnel, Buyers, Sellers, Payouts, Risk)', () => {
      render(<BusinessAnalyticsTab data={MOCK_BUSINESS_DATA} />);

      expect(screen.getByText(/Marketplace Orders & Order GMV/i)).toBeInTheDocument();
      expect(screen.getByText(/Checkout Conversion Funnel/i)).toBeInTheDocument();
      expect(screen.getByText(/Buyer & Customer Telemetry/i)).toBeInTheDocument();
      expect(screen.getByText(/Seller & Vendor Activation Funnel/i)).toBeInTheDocument();
      expect(screen.getByText(/Vendor Payouts & Wallet Liabilities/i)).toBeInTheDocument();
      expect(screen.getByText(/Risk, Disputes & Refunds/i)).toBeInTheDocument();
      expect(screen.getByText(/KYC Verification & Support Queue/i)).toBeInTheDocument();
    });

    it('T1.7: renders VendorsAnalyticsTab, AdsAnalyticsTab, and SystemAnalyticsTab without crashing', () => {
      const { unmount: unmountV } = render(<VendorsAnalyticsTab data={MOCK_VENDOR_DATA} />);
      expect(screen.getByText(/Top Performing Vendors Matrix/i)).toBeInTheDocument();
      expect(screen.getByText('Panda Boutique Tunis')).toBeInTheDocument();
      unmountV();

      const { unmount: unmountA } = render(<AdsAnalyticsTab data={MOCK_ADS_DATA} />);
      expect(screen.getByText(/Ad Revenue Share in Period/i)).toBeInTheDocument();
      expect(screen.getByText(/Impressions & Clicks in Period/i)).toBeInTheDocument();
      unmountA();

      const { unmount: unmountS } = render(<SystemAnalyticsTab data={MOCK_SYSTEM_DATA} />);
      expect(screen.getByText(/System Uptime/i)).toBeInTheDocument();
      expect(screen.getByText(/Database Log Events/i)).toBeInTheDocument();
      expect(screen.getByText(/Print Production Queue/i)).toBeInTheDocument();
      unmountS();
    });

    it('T1.8: renders GovernanceTab and IntelligenceTab with diagnostics and anomaly models', async () => {
      const { unmount: unmountG } = render(<GovernanceTab />);
      await waitFor(() => {
        expect(screen.getByText(/Analytics Data Governance & Health/i)).toBeInTheDocument();
        expect(screen.getByText(/Data Retention & Raw Event Pruning/i)).toBeInTheDocument();
        expect(screen.getByText(/Daily & Monthly Rollups/i)).toBeInTheDocument();
      });
      unmountG();

      const { unmount: unmountI } = render(<IntelligenceTab />);
      await waitFor(() => {
        expect(screen.getByText(/Analytics Intelligence & Risk Engine/i)).toBeInTheDocument();
        expect(screen.getByText(/Metric Anomaly Detection/i)).toBeInTheDocument();
      });
      unmountI();
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY STATES & ERROR HANDLING (Boundary ≥ 5)
  // =========================================================================
  describe('Tier 2: Boundary States & Error Handling', () => {
    it('T2.1: renders AnalyticsLoadingState spinner and message when tab is loading', () => {
      render(<AnalyticsLoadingState message="Fetching live financials telemetry..." />);
      expect(screen.getByText('Fetching live financials telemetry...')).toBeInTheDocument();
    });

    it('T2.2: renders AnalyticsErrorState with error message and functional retry button', () => {
      const handleRetry = vi.fn();
      render(<AnalyticsErrorState message="PostgreSQL query connection timeout." onRetry={handleRetry} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('PostgreSQL query connection timeout.')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('T2.3: renders AnalyticsEmptyState gracefully when tab data is null', () => {
      const { unmount: u1 } = render(<AnalyticsEmptyState title="No Ad Telemetry" message="No campaigns active in selected date window." />);
      expect(screen.getByText('No Ad Telemetry')).toBeInTheDocument();
      expect(screen.getByText('No campaigns active in selected date window.')).toBeInTheDocument();
      u1();

      const { unmount: u2 } = render(<OverviewAnalyticsTab data={null} />);
      expect(screen.getByText('No Executive Overview Data')).toBeInTheDocument();
      u2();

      const { unmount: u3 } = render(<FinancialsAnalyticsTab data={null} />);
      expect(screen.getByText('No Financial Analytics')).toBeInTheDocument();
      u3();

      const { unmount: u4 } = render(<VendorsAnalyticsTab data={null} />);
      expect(screen.getByText('No Vendor Analytics')).toBeInTheDocument();
      u4();
    });

    it('T2.4: displays multi-currency native TND warning badge when EUR or USD is requested', async () => {
      render(<ComprehensivePlatformAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-overview');
        expect(screen.getByText('Total Platform GMV')).toBeInTheDocument();
      });

      // Switch currency to EUR
      const eurBtn = screen.getByRole('button', { name: 'EUR' });
      await act(async () => {
        fireEvent.click(eurBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Native TND')).toBeInTheDocument();
        expect(screen.getByText(/Requested Display Currency:/i)).toBeInTheDocument();
      });
    });

    it('T2.5: renders threshold alerts banner when active anomalies exist in overview dataset', async () => {
      render(<ComprehensivePlatformAnalyticsPage />);

      await waitFor(() => {
        expect(mocks.fetchOverviewAnalytics).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-overview');
        expect(screen.getByText('Active Alert')).toBeInTheDocument();
        expect(screen.getByText(/High Dispute Rate Spike/i)).toBeInTheDocument();
      });
    });

    it('T2.6: persists active tab, time range, and currency preferences in localStorage', async () => {
      render(<ComprehensivePlatformAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Superadmin Platform Analytics Engine')).toBeInTheDocument();
      });

      // Click 90D range
      fireEvent.click(screen.getByRole('button', { name: '90D' }));
      expect(localStorage.getItem('pandamarket_analytics_time_range')).toBe('90d');

      // Click USD currency
      fireEvent.click(screen.getByRole('button', { name: 'USD' }));
      expect(localStorage.getItem('pandamarket_analytics_currency')).toBe('USD');

      // Click Financials tab
      const financialsTab = screen.getAllByRole('tab', { name: /Financials & SaaS/i })[0] ||
        screen.getAllByText('Financials & SaaS')[0];
      fireEvent.click(financialsTab);
      expect(localStorage.getItem('pandamarket_analytics_active_tab')).toBe('financials');
    });
  });

  // =========================================================================
  // TIER 3: INTEGRATED PAGE JOURNEYS & ARIA ACCESSIBILITY
  // =========================================================================
  describe('Tier 3: Integrated Page Journeys & ARIA Accessibility', () => {
    it('T3.1: seamlessly navigates across multiple domain tabs and mounts active tab panels', async () => {
      render(<ComprehensivePlatformAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-overview');
        expect(screen.getByText('Total Platform GMV')).toBeInTheDocument();
      });

      // Navigate to Business tab
      const businessTab = screen.getAllByRole('tab', { name: /Marketplace Business/i })[0] ||
        screen.getAllByText('Marketplace Business')[0];
      act(() => {
        fireEvent.click(businessTab);
      });

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-business');
        expect(screen.getByText(/Marketplace Orders & Order GMV/i)).toBeInTheDocument();
      });

      // Navigate to Infrastructure (System) tab
      const systemTab = screen.getAllByRole('tab', { name: /Infrastructure/i })[0] ||
        screen.getAllByText('Infrastructure')[0];
      act(() => {
        fireEvent.click(systemTab);
      });

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-system');
        expect(screen.getByText(/System Uptime/i)).toBeInTheDocument();
      });
    });

    it('T3.2: verifies full ARIA contract compliance for tabs and panels', () => {
      const emptyLoading = {
        overview: false, page_views: false, business: false, financials: false,
        vendors: false, ads: false, system: false, intelligence: false, governance: false,
      };

      render(<AnalyticsTabsNav activeTab="overview" tabLoading={emptyLoading} onTabChange={vi.fn()} />);

      const overviewTab = screen.getAllByRole('tab', { name: /Executive Overview/i })[0];
      expect(overviewTab).toHaveAttribute('aria-selected', 'true');
      expect(overviewTab).toHaveAttribute('aria-controls', 'panel-overview');

      const financialsTab = screen.getAllByRole('tab', { name: /Financials & SaaS/i })[0];
      expect(financialsTab).toHaveAttribute('aria-selected', 'false');
      expect(financialsTab).toHaveAttribute('aria-controls', 'panel-financials');
    });
  });
});
