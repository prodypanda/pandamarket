'use client';

import { useEffect } from 'react';
import { recordRecentlyViewed, type RecentlyViewedItem } from './home-template-shared';
import { trackProductView } from '../../lib/marketplace-analytics';

/**
 * Invisible client component: records the current product into the
 * recently-viewed localStorage list so home templates can render the
 * "Recently viewed" rail. Also fires a product_view analytics event.
 */
export function RecentlyViewedTracker({ product }: { product: RecentlyViewedItem }) {
  useEffect(() => {
    recordRecentlyViewed(product);
    trackProductView(product.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return null;
}
