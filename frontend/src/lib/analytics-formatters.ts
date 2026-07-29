/**
 * Analytics Formatting Utilities for Superadmin Platform Analytics
 */

import { NormalizedAnalyticsRange } from '@/types/analytics';

export function formatNumber(value: number | null | undefined, fallback: string = 'Unavailable'): string {
  if (value === null || value === undefined) return fallback;
  return value.toLocaleString();
}

export function formatMoney(
  value: number | null | undefined,
  currency: string = 'TND',
  fallback: string = 'Unavailable'
): string {
  if (value === null || value === undefined) return fallback;
  return `${value.toLocaleString()} ${currency}`;
}

export function formatPercent(value: number | null | undefined, fallback: string = 'Unavailable'): string {
  if (value === null || value === undefined) return fallback;
  return `${value}%`;
}

export function formatGrowth(value: number | null | undefined, fallback: string = 'Growth: Unavailable'): string {
  if (value === null || value === undefined) return fallback;
  if (value > 0) return `+${value}%`;
  if (value < 0) return `${value}%`;
  return '0.00%';
}

export function formatDateRange(range: NormalizedAnalyticsRange | null | undefined): string {
  if (!range) return 'Range: N/A';
  if (range.isAllTime) return 'Showing all-time platform data';
  if (!range.startDate) return `Showing up to ${new Date(range.endDate).toLocaleDateString()}`;

  const startStr = new Date(range.startDate).toLocaleDateString();
  const endStr = new Date(range.endDate).toLocaleDateString();
  return `Showing data from ${startStr} to ${endStr}`;
}
