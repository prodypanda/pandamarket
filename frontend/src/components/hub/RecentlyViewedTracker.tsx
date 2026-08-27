'use client';

import { useEffect } from 'react';
import { recordRecentlyViewed, type RecentlyViewedItem } from './home-template-shared';
import { trackProductView } from '../../lib/marketplace-analytics';
import { trackEcommerceEvent } from '@/lib/ecommerce-tracker';

/**
 * Invisible client component: records the current product into the
 * recently-viewed localStorage list so home templates can render the
 * "Recently viewed" rail. Also fires a product_view analytics event.
 */
export function RecentlyViewedTracker({ product }: { product: RecentlyViewedItem }) {
  useEffect(() => {
    recordRecentlyViewed(product);
    trackProductView(product.id);
    const numericPrice = typeof product.price === 'number' ? product.price : Number(product.price) || 0;
    trackEcommerceEvent('view_item', {
      value: numericPrice,
      currency: 'TND',
      items: [
        {
          item_id: product.id,
          item_name: product.title,
          price: numericPrice,
        },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return null;
}
