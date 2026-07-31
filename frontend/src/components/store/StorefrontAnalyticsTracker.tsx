'use client';

import { useEffect } from 'react';
import { trackStorefrontView } from '@/lib/marketplace-analytics';

export function StorefrontAnalyticsTracker({ storeId }: { storeId?: string }) {
  useEffect(() => {
    if (storeId) {
      trackStorefrontView(storeId);
    }
  }, [storeId]);

  return null;
}
