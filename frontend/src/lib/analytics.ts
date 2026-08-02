/**
 * PandaMarket Versioned Analytics Event Taxonomy (v1.0)
 * Standardized e-commerce events matching GA4 and server-side tracking specifications.
 */

import { trackMarketplaceEvent } from './marketplace-analytics';

export const ANALYTICS_TAXONOMY_VERSION = '1.0';

export type AnalyticsEventType =
  | 'view_item'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'sign_up'
  | 'search'
  | 'view_item_list';

export interface AnalyticsItem {
  item_id: string;
  item_name?: string;
  item_category?: string;
  price?: number;
  quantity?: number;
}

export interface AnalyticsEventParams {
  store_id?: string;
  currency?: string;
  value?: number;
  items?: AnalyticsItem[];
  search_term?: string;
  search_results_count?: number;
  order_id?: string;
  method?: string;
}

/**
 * Track a versioned e-commerce analytics event.
 */
export function trackEvent(eventType: AnalyticsEventType, params: AnalyticsEventParams = {}): void {
  const primaryItem = params.items?.[0];

  trackMarketplaceEvent({
    event_type: eventType,
    store_id: params.store_id,
    product_id: primaryItem?.item_id,
    category_id: primaryItem?.item_category,
    order_id: params.order_id,
    search_query: params.search_term,
    search_results_count: params.search_results_count,
    metadata: {
      taxonomy_version: ANALYTICS_TAXONOMY_VERSION,
      currency: params.currency || 'TND',
      value: params.value,
      items: params.items,
      method: params.method,
    },
  });
}

// Convenience wrappers matching versioned taxonomy
export function trackViewItem(item: AnalyticsItem, storeId?: string): void {
  trackEvent('view_item', { store_id: storeId, items: [item], value: item.price });
}

export function trackAddToCart(item: AnalyticsItem, storeId?: string): void {
  trackEvent('add_to_cart', { store_id: storeId, items: [item], value: (item.price || 0) * (item.quantity || 1) });
}

export function trackBeginCheckout(items: AnalyticsItem[], value: number, storeId?: string): void {
  trackEvent('begin_checkout', { store_id: storeId, items, value });
}

export function trackSearch(searchTerm: string, resultsCount: number, storeId?: string): void {
  trackEvent('search', { store_id: storeId, search_term: searchTerm, search_results_count: resultsCount });
}

export function trackViewItemList(items: AnalyticsItem[], storeId?: string): void {
  trackEvent('view_item_list', { store_id: storeId, items });
}

export function trackSignUp(method = 'email'): void {
  trackEvent('sign_up', { method });
}
