export type PageBuilderAnalyticsEventType = 'page_view' | 'cta_click' | 'product_click';

export interface PageBuilderAnalyticsConfig {
  storeId: string;
  pageId: string;
  enabled?: boolean;
}

export interface PageBuilderAnalyticsLinkDetails {
  explicitType?: string | null;
  productId?: string | null;
  href?: string | null;
}

export function clampPageBuilderAnalyticsText(value: string | null | undefined, maxLength: number): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

export function currentPageBuilderPagePath(): string | undefined {
  try {
    return `${window.location.pathname}${window.location.search}`.slice(0, 2048);
  } catch {
    return undefined;
  }
}

export function isPageBuilderProductHref(href: string): boolean {
  try {
    const url = new URL(href, window.location.origin);
    const segments = url.pathname.split('/').filter(Boolean);
    const productIndex = segments.indexOf('products');
    return productIndex !== -1 && segments.length > productIndex + 1;
  } catch {
    return false;
  }
}

export function resolvePageBuilderAnalyticsEventType(details: PageBuilderAnalyticsLinkDetails): PageBuilderAnalyticsEventType {
  return details.explicitType === 'product_click' || Boolean(details.productId) || isPageBuilderProductHref(details.href || '')
    ? 'product_click'
    : 'cta_click';
}

export function buildPageBuilderAnalyticsPayload(
  analytics: PageBuilderAnalyticsConfig,
  eventType: PageBuilderAnalyticsEventType,
  details: { productId?: string; targetUrl?: string; targetLabel?: string; pagePath?: string; visitorId?: string } = {},
) {
  return {
    store_id: analytics.storeId,
    page_id: analytics.pageId,
    event_type: eventType,
    product_id: clampPageBuilderAnalyticsText(details.productId, 64),
    target_url: clampPageBuilderAnalyticsText(details.targetUrl, 2048),
    target_label: clampPageBuilderAnalyticsText(details.targetLabel, 200),
    page_path: details.pagePath ?? currentPageBuilderPagePath(),
    visitor_id: details.visitorId,
  };
}
