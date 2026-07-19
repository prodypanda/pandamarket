'use client';

import { useEffect } from 'react';
import { recordRecentlyViewed, type RecentlyViewedItem } from './home-template-shared';

/**
 * Invisible client component: records the current product into the
 * recently-viewed localStorage list so home templates can render the
 * "Recently viewed" rail.
 */
export function RecentlyViewedTracker({ product }: { product: RecentlyViewedItem }) {
  useEffect(() => {
    recordRecentlyViewed(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return null;
}
