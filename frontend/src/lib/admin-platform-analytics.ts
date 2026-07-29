import { fetchWithCsrf } from '@/lib/api';
import {
  AnalyticsFilterParams,
  PlatformOverviewAnalytics,
  PlatformRevenueAnalytics,
  PlatformVendorAnalytics,
  PlatformAdsAnalytics,
  PlatformSystemAnalytics,
  PlatformBusinessAnalytics,
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
  filters: AnalyticsFilterParams & { type: string }
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
