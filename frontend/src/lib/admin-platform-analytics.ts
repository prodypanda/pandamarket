import { fetchWithCsrf } from '@/lib/api';
import {
  AnalyticsFilterParams,
  PlatformOverviewAnalytics,
  PlatformRevenueAnalytics,
  PlatformVendorAnalytics,
  PlatformAdsAnalytics,
  PlatformSystemAnalytics,
  PlatformBusinessAnalytics,
  PlatformPageViewsAnalytics,
  AnalyticsDrilldownQueryParams,
  PaginatedDrilldownResponse,
  DrilldownType,
  MetricDefinitionDTO,
  SavedViewDTO,
  CreateSavedViewInput,
  AnalyticsRetentionStatusDTO,
  AnalyticsRetentionCleanupResultDTO,
  RollupsRecomputeResultDTO,
  CacheInvalidateResultDTO,
  AnalyticsHealthDTO,
  AnomalyResponseDTO,
  VendorRiskResponseDTO,
  ChurnRiskResponseDTO,
  CohortResponseDTO,
  ReportScheduleDTO,
  CreateReportScheduleInput,
  ReportExecutionResultDTO,
} from '@/types/analytics';

function buildQueryString(filters: AnalyticsFilterParams): string {
  const params = new URLSearchParams();
  if (filters.timeRange) params.set('timeRange', filters.timeRange);
  if (filters.currency) params.set('currency', filters.currency);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  const q = params.toString();
  return q ? `?${q}` : '';
}

async function requestAnalyticsEndpoint<T>(endpoint: string): Promise<T> {
  const res = await fetchWithCsrf(endpoint, { credentials: 'include' });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Analytics API error (${res.status}): ${errorText || res.statusText}`);
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error('Analytics API returned unsuccessful response schema.');
  }
  return json.data as T;
}

export async function fetchOverviewAnalytics(filters: AnalyticsFilterParams = {}): Promise<PlatformOverviewAnalytics> {
  const q = buildQueryString(filters);
  return requestAnalyticsEndpoint<PlatformOverviewAnalytics>(`/api/pd/admin/analytics/overview${q}`);
}

export async function fetchRevenueAnalytics(filters: AnalyticsFilterParams = {}): Promise<PlatformRevenueAnalytics> {
  const q = buildQueryString(filters);
  return requestAnalyticsEndpoint<PlatformRevenueAnalytics>(`/api/pd/admin/analytics/revenue${q}`);
}

export async function fetchVendorAnalytics(filters: AnalyticsFilterParams = {}): Promise<PlatformVendorAnalytics> {
  const q = buildQueryString(filters);
  return requestAnalyticsEndpoint<PlatformVendorAnalytics>(`/api/pd/admin/analytics/vendors${q}`);
}

export async function fetchAdsAnalytics(filters: AnalyticsFilterParams = {}): Promise<PlatformAdsAnalytics> {
  const q = buildQueryString(filters);
  return requestAnalyticsEndpoint<PlatformAdsAnalytics>(`/api/pd/admin/analytics/ads${q}`);
}

export async function fetchSystemAnalytics(filters: AnalyticsFilterParams = {}): Promise<PlatformSystemAnalytics> {
  const q = buildQueryString(filters);
  return requestAnalyticsEndpoint<PlatformSystemAnalytics>(`/api/pd/admin/analytics/system${q}`);
}

export async function fetchBusinessAnalytics(filters: AnalyticsFilterParams = {}): Promise<PlatformBusinessAnalytics> {
  const q = buildQueryString(filters);
  return requestAnalyticsEndpoint<PlatformBusinessAnalytics>(`/api/pd/admin/analytics/business${q}`);
}

export async function fetchPageViewsAnalytics(filters: AnalyticsFilterParams = {}): Promise<PlatformPageViewsAnalytics> {
  const q = buildQueryString(filters);
  return requestAnalyticsEndpoint<PlatformPageViewsAnalytics>(`/api/pd/admin/analytics/page-views${q}`);
}

export async function fetchPageViewsLiveData(): Promise<{
  live_active_visitors_now: number;
  live_activity_feed: Array<{
    id: string;
    event_type: string;
    path: string;
    user_role: string | null;
    store_name: string | null;
    device_type: string;
    occurred_at: string;
  }>;
  realtime_visitors_series?: Array<{
    time_label: string;
    active_visitors: number;
    page_views: number;
  }>;
  top_countries?: Array<{
    country_code: string;
    country_name: string;
    flag_emoji: string;
    views_count: number;
    unique_visitors: number;
    share_pct: number;
    ip_addresses?: Array<{
      ip: string;
      city?: string;
      isp?: string;
      views_count: number;
      device_type?: string;
      last_active?: string;
      is_active_now?: boolean;
    }>;
    lat?: number;
    lng?: number;
    map_x?: number;
    map_y?: number;
  }>;
}> {
  return requestAnalyticsEndpoint(`/api/pd/admin/analytics/page-views-live`);
}

export async function exportPlatformAnalytics(
  filters: AnalyticsFilterParams & { type?: string; drilldownType?: string }
): Promise<Blob> {
  const res = await fetchWithCsrf('/api/pd/admin/analytics/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Analytics export failed (${res.status}): ${res.statusText}`);
  }

  return res.blob();
}

// ==========================================================
// Part 6: Drill-down & Saved Views API Client Methods
// ==========================================================

export async function fetchDrilldownData<T>(
  type: DrilldownType,
  params: AnalyticsDrilldownQueryParams = {}
): Promise<PaginatedDrilldownResponse<T>> {
  const searchParams = new URLSearchParams();
  if (params.timeRange) searchParams.set('timeRange', params.timeRange);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);
  if (params.status) searchParams.set('status', params.status);
  if (params.storeId) searchParams.set('storeId', params.storeId);
  if (params.vendorId) searchParams.set('vendorId', params.vendorId);
  if (params.buyerId) searchParams.set('buyerId', params.buyerId);
  if (params.productId) searchParams.set('productId', params.productId);
  if (params.eventType) searchParams.set('eventType', params.eventType);
  if (params.search) searchParams.set('search', params.search);

  const q = searchParams.toString();
  const endpoint = `/api/pd/admin/analytics/drilldown/${type}${q ? `?${q}` : ''}`;

  const res = await fetchWithCsrf(endpoint, { credentials: 'include' });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Drill-down API error (${res.status}): ${errorText || res.statusText}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error('Drill-down API returned unsuccessful response schema.');
  }

  return {
    range: json.range,
    data: json.data,
    meta: json.meta,
  };
}

export async function fetchMetricDefinitions(): Promise<MetricDefinitionDTO[]> {
  const res = await fetchWithCsrf('/api/pd/admin/analytics/definitions', { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Metric definitions API error (${res.status})`);
  }
  const json = await res.json();
  return json.definitions || [];
}

export async function fetchSavedViews(): Promise<SavedViewDTO[]> {
  const res = await fetchWithCsrf('/api/pd/admin/analytics/saved-views', { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Saved views API error (${res.status})`);
  }
  const json = await res.json();
  return json.views || [];
}

export async function createSavedView(input: CreateSavedViewInput): Promise<SavedViewDTO> {
  const res = await fetchWithCsrf('/api/pd/admin/analytics/saved-views', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Create saved view failed (${res.status}): ${errText}`);
  }
  const json = await res.json();
  return json.view;
}

export async function deleteSavedView(id: string): Promise<void> {
  const res = await fetchWithCsrf(`/api/pd/admin/analytics/saved-views/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Delete saved view failed (${res.status})`);
  }
}

export async function setDefaultSavedView(id: string): Promise<void> {
  const res = await fetchWithCsrf(`/api/pd/admin/analytics/saved-views/${id}/default`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Set default saved view failed (${res.status})`);
  }
}

export async function getRetentionStatus(): Promise<AnalyticsRetentionStatusDTO> {
  const res = await fetchWithCsrf('/api/pd/admin/platform-analytics/retention', {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Get retention status failed (${res.status})`);
  }
  return res.json();
}

export async function runRetentionCleanup(retentionDays?: number): Promise<AnalyticsRetentionCleanupResultDTO> {
  const res = await fetchWithCsrf('/api/pd/admin/platform-analytics/retention/cleanup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ retention_days: retentionDays }),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Run retention cleanup failed (${res.status})`);
  }
  return res.json();
}

export async function recomputeRollups(params: { period?: string; from_date?: string; to_date?: string }): Promise<RollupsRecomputeResultDTO> {
  const res = await fetchWithCsrf('/api/pd/admin/platform-analytics/rollups/recompute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Recompute rollups failed (${res.status})`);
  }
  return res.json();
}

export async function invalidateCache(scope?: string): Promise<CacheInvalidateResultDTO> {
  const res = await fetchWithCsrf('/api/pd/admin/platform-analytics/cache/invalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope }),
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Invalidate cache failed (${res.status})`);
  }
  return res.json();
}

export async function getAnalyticsHealth(): Promise<AnalyticsHealthDTO> {
  const res = await fetchWithCsrf('/api/pd/admin/platform-analytics/health', {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Get analytics health failed (${res.status})`);
  }
  return res.json();
}

// ==========================================================
// Part 7: Intelligence Engine & Scheduled Reports Methods
// ==========================================================

export async function fetchAnomalies(filters: AnalyticsFilterParams = {}): Promise<AnomalyResponseDTO> {
  const q = buildQueryString(filters);
  const res = await fetchWithCsrf(`/api/pd/admin/analytics/anomalies${q}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Anomalies API error (${res.status})`);
  return res.json();
}

export async function fetchVendorRisk(filters: AnalyticsFilterParams = {}): Promise<VendorRiskResponseDTO> {
  const q = buildQueryString(filters);
  const res = await fetchWithCsrf(`/api/pd/admin/analytics/risk/vendors${q}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Vendor risk API error (${res.status})`);
  return res.json();
}

export async function fetchChurnRisk(filters: AnalyticsFilterParams = {}): Promise<ChurnRiskResponseDTO> {
  const q = buildQueryString(filters);
  const res = await fetchWithCsrf(`/api/pd/admin/analytics/risk/churn${q}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Churn risk API error (${res.status})`);
  return res.json();
}

export async function fetchCohortAnalysis(filters: AnalyticsFilterParams & { cohort_type?: string } = {}): Promise<CohortResponseDTO> {
  const params = new URLSearchParams();
  if (filters.timeRange) params.set('timeRange', filters.timeRange);
  if (filters.cohort_type) params.set('cohort_type', filters.cohort_type);
  const q = params.toString() ? `?${params.toString()}` : '';
  const res = await fetchWithCsrf(`/api/pd/admin/analytics/cohorts${q}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Cohorts API error (${res.status})`);
  return res.json();
}

export async function fetchReportSchedules(): Promise<ReportScheduleDTO[]> {
  const res = await fetchWithCsrf('/api/pd/admin/analytics/schedules', { credentials: 'include' });
  if (!res.ok) throw new Error(`Report schedules API error (${res.status})`);
  const json = await res.json();
  return json.schedules || [];
}

export async function createReportSchedule(scheduleData: CreateReportScheduleInput): Promise<ReportScheduleDTO> {
  const res = await fetchWithCsrf('/api/pd/admin/analytics/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scheduleData),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Create schedule failed (${res.status})`);
  const json = await res.json();
  return json.schedule;
}

export async function deleteReportSchedule(id: string): Promise<void> {
  const res = await fetchWithCsrf(`/api/pd/admin/analytics/schedules/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Delete schedule failed (${res.status})`);
}

export async function triggerReportScheduleNow(id: string): Promise<ReportExecutionResultDTO> {
  const res = await fetchWithCsrf(`/api/pd/admin/analytics/schedules/${id}/run-now`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Trigger schedule failed (${res.status})`);
  return res.json();
}

// ==========================================================
// Superadmin Modular Analytics APIs (R1 & R2)
// ==========================================================

export async function fetchLivePulseData(): Promise<any> {
  return requestAnalyticsEndpoint('/api/pd/admin/analytics/pulse/live');
}

export async function fetchGeoHeatmapData(filters: AnalyticsFilterParams = {}): Promise<any> {
  const q = buildQueryString(filters);
  return requestAnalyticsEndpoint(`/api/pd/admin/analytics/geo/heatmap${q}`);
}

export async function fetchTriFoldReconciliation(filters: AnalyticsFilterParams = {}): Promise<any> {
  const q = buildQueryString(filters);
  return requestAnalyticsEndpoint(`/api/pd/admin/analytics/financials/reconciliation${q}`);
}

export async function fetchSaaSMRRWaterfall(filters: AnalyticsFilterParams = {}): Promise<any> {
  const q = buildQueryString(filters);
  return requestAnalyticsEndpoint(`/api/pd/admin/analytics/financials/mrr-waterfall${q}`);
}

export async function fetchGatewayReliabilityMatrix(filters: AnalyticsFilterParams = {}): Promise<any> {
  const q = buildQueryString(filters);
  return requestAnalyticsEndpoint(`/api/pd/admin/analytics/gateways/matrix${q}`);
}


