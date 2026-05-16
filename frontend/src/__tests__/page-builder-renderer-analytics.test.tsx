import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildPageBuilderAnalyticsPayload,
  clampPageBuilderAnalyticsText,
  isPageBuilderProductHref,
  resolvePageBuilderAnalyticsEventType,
} from '../lib/page-builder-analytics';

describe('SafePageRenderer Page Builder analytics', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/store/demo/pages/about?utm=builder');
  });

  it('builds page view payloads with current path and visitor id', () => {
    expect(buildPageBuilderAnalyticsPayload(
      { storeId: 'store_1', pageId: 'page_1', enabled: true },
      'page_view',
      { visitorId: 'visitor_1' },
    )).toMatchObject({
      store_id: 'store_1',
      page_id: 'page_1',
      event_type: 'page_view',
      page_path: '/store/demo/pages/about?utm=builder',
      visitor_id: 'visitor_1',
    });
  });

  it('classifies product links and CTA links consistently', () => {
    expect(isPageBuilderProductHref('/products/cool-shoes')).toBe(true);
    expect(isPageBuilderProductHref('/products')).toBe(false);
    expect(resolvePageBuilderAnalyticsEventType({ href: '/products/cool-shoes' })).toBe('product_click');
    expect(resolvePageBuilderAnalyticsEventType({ productId: 'prod_1', href: '/products' })).toBe('product_click');
    expect(resolvePageBuilderAnalyticsEventType({ explicitType: 'cta_click', href: '/products' })).toBe('cta_click');
  });

  it('clamps and normalizes analytics text payload fields', () => {
    expect(clampPageBuilderAnalyticsText('  Voir tout  ', 200)).toBe('Voir tout');
    expect(clampPageBuilderAnalyticsText('x'.repeat(70), 64)).toHaveLength(64);
    expect(buildPageBuilderAnalyticsPayload(
      { storeId: 'store_1', pageId: 'page_1', enabled: true },
      'cta_click',
      {
        targetUrl: '/products',
        targetLabel: '  Voir tout  ',
        pagePath: '/custom',
      },
    )).toMatchObject({
      store_id: 'store_1',
      page_id: 'page_1',
      event_type: 'cta_click',
      target_url: '/products',
      target_label: 'Voir tout',
      page_path: '/custom',
    });
  });
});
