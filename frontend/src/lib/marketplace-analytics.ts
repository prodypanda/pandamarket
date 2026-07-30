/**
 * Marketplace Analytics Client — fire-and-forget first-party event tracking.
 *
 * Privacy-first: visitor/session IDs are browser-generated random UUIDs.
 * No PII is collected. All network failures are silently swallowed so
 * analytics never interrupt user interactions.
 */

import { fetchWithCsrf } from '@/lib/api';

// =====================================================
// Session & Visitor ID management
// =====================================================

const SESSION_STORAGE_KEY = 'pd_analytics_session';
const VISITOR_STORAGE_KEY = 'pd_analytics_visitor';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateAnalyticsSessionId(): string {
  if (typeof sessionStorage === 'undefined') return generateId();
  try {
    let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = generateId();
      sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

export function getOrCreateAnalyticsVisitorId(): string {
  if (typeof localStorage === 'undefined') return generateId();
  try {
    let id = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(VISITOR_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

// =====================================================
// Core tracking function
// =====================================================

interface TrackEventPayload {
  event_type: string;
  store_id?: string;
  product_id?: string;
  category_id?: string;
  order_id?: string;
  path?: string;
  locale?: string;
  search_query?: string;
  search_results_count?: number;
  funnel_step?: string;
  metadata?: Record<string, unknown>;
}

export async function trackMarketplaceEvent(payload: TrackEventPayload): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const body = {
      ...payload,
      session_id: getOrCreateAnalyticsSessionId(),
      visitor_id: getOrCreateAnalyticsVisitorId(),
      path: payload.path || window.location.pathname,
    };

    // Fire-and-forget — do not block the caller
    fetchWithCsrf('/api/pd/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    }).catch(() => {
      // Silently swallow — analytics must never break UX
    });
  } catch {
    // Swallow all errors
    if (process.env.NODE_ENV === 'development') {
      console.warn('[analytics] Failed to track event:', payload.event_type);
    }
  }
}

// =====================================================
// Convenience helpers — checkout funnel
// =====================================================

export function trackCheckoutStarted(orderId?: string): void {
  trackMarketplaceEvent({
    event_type: 'checkout_started',
    order_id: orderId,
    funnel_step: 'checkout_started',
  });
}

export function trackCheckoutAddressSubmitted(orderId?: string): void {
  trackMarketplaceEvent({
    event_type: 'checkout_address_submitted',
    order_id: orderId,
    funnel_step: 'address_submitted',
  });
}

export function trackCheckoutPaymentStarted(orderId?: string, gateway?: string): void {
  trackMarketplaceEvent({
    event_type: 'checkout_payment_started',
    order_id: orderId,
    funnel_step: 'payment_started',
    metadata: gateway ? { gateway } : undefined,
  });
}

export function trackCheckoutPaymentCompleted(orderId?: string): void {
  trackMarketplaceEvent({
    event_type: 'checkout_payment_completed',
    order_id: orderId,
    funnel_step: 'payment_completed',
  });
}

export function trackCheckoutFailed(orderId?: string, reason?: string): void {
  trackMarketplaceEvent({
    event_type: 'checkout_failed',
    order_id: orderId,
    funnel_step: 'checkout_failed',
    metadata: reason ? { reason } : undefined,
  });
}

// =====================================================
// Convenience helpers — storefront / product
// =====================================================

export function trackProductView(productId: string, storeId?: string, categoryId?: string): void {
  trackMarketplaceEvent({
    event_type: 'product_view',
    product_id: productId,
    store_id: storeId,
    category_id: categoryId,
  });
}

export function trackProductClick(productId: string, storeId?: string): void {
  trackMarketplaceEvent({
    event_type: 'product_click',
    product_id: productId,
    store_id: storeId,
  });
}

export function trackAddToCart(productId: string, storeId?: string): void {
  trackMarketplaceEvent({
    event_type: 'add_to_cart',
    product_id: productId,
    store_id: storeId,
  });
}

export function trackCartView(): void {
  trackMarketplaceEvent({ event_type: 'cart_view' });
}

export function trackCategoryView(categoryId: string, storeId?: string): void {
  trackMarketplaceEvent({
    event_type: 'category_view',
    category_id: categoryId,
    store_id: storeId,
  });
}

export function trackStorefrontView(storeId: string): void {
  trackMarketplaceEvent({
    event_type: 'storefront_view',
    store_id: storeId,
  });
}

// =====================================================
// Convenience helpers — search
// =====================================================

export function trackSearchPerformed(searchQuery: string, resultsCount: number, storeId?: string): void {
  const event_type = resultsCount === 0 ? 'zero_result_search' : 'search_performed';
  trackMarketplaceEvent({
    event_type,
    search_query: searchQuery,
    search_results_count: resultsCount,
    store_id: storeId,
  });
}

export function trackSearchResultClicked(productId: string, searchQuery?: string): void {
  trackMarketplaceEvent({
    event_type: 'search_result_clicked',
    product_id: productId,
    search_query: searchQuery,
  });
}
