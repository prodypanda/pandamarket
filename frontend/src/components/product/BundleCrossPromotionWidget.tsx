'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Package, Sparkles, ArrowRight } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { getResizedImageUrl } from '@/lib/image-url';

interface BundleProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  compare_at_price?: number | null;
  thumbnail?: string | null;
  bundle_items?: Array<{
    id: string;
    product_id: string;
    product_title?: string;
    quantity: number;
  }>;
}

interface BundleCrossPromotionWidgetProps {
  productId: string;
  storeSubdomain?: string | null;
  storeId?: string | null;
  currency?: string;
}

export function BundleCrossPromotionWidget({
  productId,
  storeSubdomain,
  storeId,
  currency = 'TND',
}: BundleCrossPromotionWidgetProps) {
  const [bundles, setBundles] = useState<BundleProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadBundles() {
      try {
        const queryParams = new URLSearchParams();
        if (storeId) queryParams.set('store_id', storeId);
        const res = await fetchWithCsrf(`/api/pd/products/by-product/${productId}/bundles?${queryParams.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && Array.isArray(json.data)) {
            setBundles(json.data);
          }
        }
      } catch {
        // Silently fail if cross-promotion cannot be loaded
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBundles();
    return () => {
      isMounted = false;
    };
  }, [productId, storeId]);

  if (loading || bundles.length === 0) {
    return null;
  }

  return (
    <div className="my-8 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-pink-50/40 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/20 p-5 sm:p-6 shadow-xs">
      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 mb-3">
        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
        <span className="text-xs font-black uppercase tracking-wider">Offre Spéciale & Économies</span>
      </div>

      <h4 className="text-base font-black text-slate-900 dark:text-white mb-2">
        Cet article est également disponible en Pack Promotionnel !
      </h4>
      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
        Achetez en lot et profitez d&apos;une réduction immédiate sur l&apos;ensemble.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bundles.map((bundle) => {
          const discountPct = bundle.compare_at_price && bundle.compare_at_price > bundle.price
            ? Math.round(((bundle.compare_at_price - bundle.price) / bundle.compare_at_price) * 100)
            : 0;

          const bundleHref = storeSubdomain
            ? `/store/${storeSubdomain}/products/${bundle.slug}`
            : `/hub/products/${bundle.id}`;

          return (
            <Link
              key={bundle.id}
              href={bundleHref}
              className="flex items-center gap-3.5 p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md transition-all group"
            >
              <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                {bundle.thumbnail ? (
                  <Image
                    src={getResizedImageUrl(bundle.thumbnail, 'small')}
                    alt={bundle.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-indigo-400">
                    <Package className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-xs font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {bundle.title}
                </span>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                    {Number(bundle.price).toFixed(3)} {currency}
                  </span>
                  {bundle.compare_at_price && bundle.compare_at_price > bundle.price && (
                    <span className="text-xs line-through text-slate-400 dark:text-slate-500">
                      {Number(bundle.compare_at_price).toFixed(3)}
                    </span>
                  )}
                  {discountPct > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-600 text-white">
                      -{discountPct}%
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Voir l&apos;offre groupée</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
