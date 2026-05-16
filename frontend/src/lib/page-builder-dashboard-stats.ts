export interface PageBuilderDashboardStatsInput {
  views_30d?: number | null;
  cta_clicks_30d?: number | null;
  product_clicks_30d?: number | null;
}

export function formatPageBuilderCompactCount(value: number | null | undefined): string {
  const normalized = Number(value || 0);
  if (normalized >= 1000) return `${(normalized / 1000).toFixed(normalized >= 10000 ? 0 : 1)}K`;
  return normalized.toString();
}

export function pageBuilderEngagementClicks(page: PageBuilderDashboardStatsInput): number {
  return Number(page.cta_clicks_30d || 0) + Number(page.product_clicks_30d || 0);
}

export function pageBuilderDashboardStatsLabels(page: PageBuilderDashboardStatsInput): { views: string; clicks: string } {
  return {
    views: `${formatPageBuilderCompactCount(page.views_30d)} vues`,
    clicks: `${formatPageBuilderCompactCount(pageBuilderEngagementClicks(page))} clics`,
  };
}
