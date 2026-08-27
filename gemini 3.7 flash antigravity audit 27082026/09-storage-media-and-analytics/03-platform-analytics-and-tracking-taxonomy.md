# 03 — Platform Analytics, Heatmaps & Tracking Taxonomy

## 1. Superadmin Platform Telemetry (`AnalyticsService`)

PandaMarket includes an analytics and business intelligence engine in [`backend/src/services/analytics.service.ts`](file:///c:/tek/pandamarket/backend/src/services/analytics.service.ts) (4,677 lines):

```
Analytics Capabilities:
├── Live Velocity Pulse (Orders/sec, Active Viewers, Live Checkout Ticker)
├── 24 Tunisia Governorates Heatmap (TN-11 Tunis through TN-83 Tataouine)
├── Diaspora Order Origin Mapping (France, Italy, Germany, UAE, Canada)
├── Period-over-Period (PoP) Revenue & GMV Growth Tracking
├── Vendor Performance Quadrant & Churn Risk Early Warning Signals
├── Search Unmet Demand Radar (Zero-Result Query Identification)
└── 7-Stage Conversion Funnel (Home ➔ Search ➔ View ➔ Cart ➔ Quote ➔ Payment ➔ Capture)
```

---

## 2. Standard E-Commerce Tracking Taxonomy Blueprint

To enable comprehensive merchant marketing, storefronts must emit standard e-commerce events across GA4, Google Tag Manager, Meta Pixel, and TikTok Pixel:

```typescript
// frontend/src/lib/ecommerce-tracker.ts
export interface EcommerceItem {
  item_id: string;
  item_name: string;
  price: number;
  item_brand?: string;
  item_category?: string;
  quantity?: number;
}

export function trackStorefrontEvent(
  event: 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase',
  params: { items: EcommerceItem[]; value?: number; currency?: string; transaction_id?: string },
) {
  if (typeof window === 'undefined') return;

  // 1. Google Tag Manager / GA4 DataLayer
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({ ecommerce: null }); // Clear previous ecommerce object
  (window as any).dataLayer.push({
    event,
    ecommerce: {
      currency: params.currency || 'TND',
      value: params.value,
      transaction_id: params.transaction_id,
      items: params.items,
    },
  });

  // 2. Meta Pixel (Facebook)
  if (typeof (window as any).fbq === 'function') {
    const metaEventMap: Record<string, string> = {
      view_item: 'ViewContent',
      add_to_cart: 'AddToCart',
      begin_checkout: 'InitiateCheckout',
      purchase: 'Purchase',
    };
    (window as any).fbq('track', metaEventMap[event], {
      content_ids: params.items.map((i) => i.item_id),
      content_type: 'product',
      value: params.value,
      currency: params.currency || 'TND',
    });
  }
}
```

---

## 3. Analytics Checklist

- [x] Superadmin real-time telemetry and 24 governorates heatmap.
- [x] 7-stage conversion funnel analytics engine.
- [x] Unmet search query detection.
- [ ] Add per-store GTM / Pixel ID configuration in Seller Settings.
- [ ] Inject store-scoped tracking scripts based on resolved storefront domain.
- [ ] Integrate Google Consent Mode v2 cookie banner.
