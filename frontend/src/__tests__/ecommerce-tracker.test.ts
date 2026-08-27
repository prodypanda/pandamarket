import { describe, expect, it, vi, beforeEach } from 'vitest';
import { trackEcommerceEvent } from '../lib/ecommerce-tracker';

describe('trackEcommerceEvent', () => {
  beforeEach(() => {
    window.dataLayer = [];
    window.fbq = vi.fn();
  });

  it('pushes view_item event to dataLayer and Meta Pixel', () => {
    trackEcommerceEvent('view_item', {
      currency: 'TND',
      value: 120,
      items: [{ item_id: 'prod_1', item_name: 'Chaussures Cuir', price: 120 }],
    });

    expect(window.dataLayer).toHaveLength(2);
    expect(window.dataLayer?.[1]).toMatchObject({
      event: 'view_item',
      ecommerce: {
        currency: 'TND',
        value: 120,
        items: [{ item_id: 'prod_1', item_name: 'Chaussures Cuir', price: 120 }],
      },
    });

    expect(window.fbq).toHaveBeenCalledWith('track', 'ViewContent', {
      content_ids: ['prod_1'],
      content_type: 'product',
      value: 120,
      currency: 'TND',
    });
  });

  it('pushes purchase event with transaction_id', () => {
    trackEcommerceEvent('purchase', {
      transaction_id: 'ord_123',
      currency: 'TND',
      value: 250,
      items: [{ item_id: 'prod_2', item_name: 'Veste Olive', price: 250 }],
    });

    expect(window.dataLayer?.[1]).toMatchObject({
      event: 'purchase',
      ecommerce: {
        transaction_id: 'ord_123',
        currency: 'TND',
        value: 250,
      },
    });

    expect(window.fbq).toHaveBeenCalledWith('track', 'Purchase', {
      content_ids: ['prod_2'],
      content_type: 'product',
      value: 250,
      currency: 'TND',
    });
  });
});
