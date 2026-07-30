import { fetchWithCsrf } from '@/lib/api';
import {
  AnalyticsFilterParams,
  PlatformOverviewAnalytics,
  PlatformRevenueAnalytics,
  PlatformVendorAnalytics,
  PlatformAdsAnalytics,
  PlatformSystemAnalytics,
  PlatformBusinessAnalytics,
  AnalyticsDrilldownQueryParams,
  PaginatedDrilldownResponse,
  DrilldownType,
  MetricDefinitionDTO,
  SavedViewDTO,
  CreateSavedViewInput,
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

