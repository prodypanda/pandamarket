/**
 * Standard E-Commerce Event Tracker
 * ─────────────────────────────────────────────────────────────
 * Emits standard e-commerce events to Google Tag Manager (DataLayer)
 * and Meta Pixel (Facebook) for conversion tracking and funnel analytics.
 */

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  price: number;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  quantity?: number;
}

export type EcommerceEventName =
  | 'view_item'
  | 'view_item_list'
  | 'select_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'add_shipping_info'
  | 'add_payment_info'
  | 'purchase'
  | 'refund';

export interface EcommerceEventParams {
  items?: EcommerceItem[];
  value?: number;
  currency?: string;
  coupon?: string;
  transaction_id?: string;
  shipping?: number;
  tax?: number;
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Tracks a standard e-commerce event across GTM dataLayer and Meta Pixel.
 */
export function trackEcommerceEvent(
  eventName: EcommerceEventName,
  params: EcommerceEventParams = {},
): void {
  if (typeof window === 'undefined') return;

  const currency = params.currency || 'TND';

  // 1. Google Tag Manager (GA4 E-Commerce schema)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null }); // Clear the previous ecommerce object
  window.dataLayer.push({
    event: eventName,
    ecommerce: {
      currency,
      value: params.value,
      transaction_id: params.transaction_id,
      coupon: params.coupon,
      shipping: params.shipping,
      tax: params.tax,
      items: params.items || [],
    },
  });

  // 2. Meta Pixel (Facebook)
  if (typeof window.fbq === 'function') {
    const metaEventMap: Partial<Record<EcommerceEventName, string>> = {
      view_item: 'ViewContent',
      add_to_cart: 'AddToCart',
      begin_checkout: 'InitiateCheckout',
      add_payment_info: 'AddPaymentInfo',
      purchase: 'Purchase',
    };

    const metaEvent = metaEventMap[eventName];
    if (metaEvent) {
      window.fbq('track', metaEvent, {
        content_ids: params.items?.map((item) => item.item_id) || [],
        content_type: 'product',
        value: params.value,
        currency,
      });
    }
  }
}
