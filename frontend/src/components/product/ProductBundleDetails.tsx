'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Package, CheckCircle, AlertTriangle, Tag } from 'lucide-react';
import { getResizedImageUrl } from '@/lib/image-url';

export interface BundleComponentItem {
  id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  position?: number;
  product_title?: string;
  product_slug?: string;
  product_price?: number;
  product_compare_at_price?: number | null;
  product_thumbnail?: string | null;
  product_inventory_quantity?: number;
  variant_title?: string | null;
  variant_price?: number | null;
  variant_inventory_quantity?: number;
  variant_sku?: string | null;
  variant_options?: Record<string, string>;
  available_stock?: number;
}

interface ProductBundleDetailsProps {
  bundleItems: BundleComponentItem[];
  price: number;
  compareAtPrice?: number | null;
  bundlePricingType?: 'fixed' | 'percentage' | null;
  bundleDiscountValue?: number | null;
  currency?: string;
  storeSubdomain?: string | null;
}

export function ProductBundleDetails({
  bundleItems,
  price,
  compareAtPrice,
  currency = 'TND',
  storeSubdomain,
}: ProductBundleDetailsProps) {
  if (!bundleItems || bundleItems.length === 0) {
    return null;
  }

  // Calculate sum of individual items
  const itemsSum = bundleItems.reduce((acc, item) => {
    const itemPrice = item.variant_price !== undefined && item.variant_price !== null
      ? Number(item.variant_price)
      : Number(item.product_price || 0);
    return acc + itemPrice * (Number(item.quantity) || 1);
  }, 0);

  const effectiveOriginalPrice = compareAtPrice && compareAtPrice > price ? compareAtPrice : itemsSum;
  const savingsAmount = Math.max(0, effectiveOriginalPrice - price);
  const savingsPercent = effectiveOriginalPrice > 0 && savingsAmount > 0
    ? Math.round((savingsAmount / effectiveOriginalPrice) * 100)
    : 0;

  return (
    <div className="my-6 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/30 dark:from-purple-950/20 dark:via-slate-900 dark:to-indigo-950/20 p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-purple-100 dark:border-purple-900/40">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm shadow-purple-500/30">
            <Package className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Contenu du Pack ({bundleItems.length} article{bundleItems.length > 1 ? 's' : ''})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tous ces articles sont inclus dans cette offre groupée
            </p>
          </div>
        </div>

        {savingsPercent > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-black shadow-xs">
            <Tag className="w-3.5 h-3.5" />
            <span>-{savingsPercent}% Économisé</span>
          </div>
        )}
      </div>

      {/* Component Items List */}
      <div className="mt-4 space-y-3">
        {bundleItems.map((item, index) => {
          const itemPrice = item.variant_price !== undefined && item.variant_price !== null
            ? Number(item.variant_price)
            : Number(item.product_price || 0);
          const itemQty = Number(item.quantity) || 1;
          const lineSubtotal = itemPrice * itemQty;
          const stock = item.available_stock !== undefined ? item.available_stock : (item.product_inventory_quantity ?? 0);
          const isLowStock = stock <= 5 && stock > 0;
          const isOutOfStock = stock <= 0;

          const itemHref = storeSubdomain && item.product_slug
            ? `/store/${storeSubdomain}/products/${item.product_slug}`
            : undefined;

          return (
            <div
              key={item.id || index}
              className="flex items-center gap-3.5 p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-xs"
            >
              {/* Product Thumbnail */}
              <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                {item.product_thumbnail ? (
                  <Image
                    src={getResizedImageUrl(item.product_thumbnail, 'small')}
                    alt={item.product_title || 'Composant du pack'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Package className="w-6 h-6" />
                  </div>
                )}
                {/* Quantity Badge */}
                <div className="absolute top-0.5 right-0.5 px-1.5 py-0.2 rounded-md bg-slate-900/85 text-white font-mono font-black text-[10px] shadow-xs">
                  x{itemQty}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {itemHref ? (
                    <Link
                      href={itemHref}
                      className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 truncate hover:underline"
                    >
                      {item.product_title || 'Article du pack'}
                    </Link>
                  ) : (
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.product_title || 'Article du pack'}
                    </span>
                  )}

                  {item.variant_title && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {item.variant_title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    Prix individuel : <strong className="text-slate-700 dark:text-slate-300">{itemPrice.toFixed(3)} {currency}</strong>
                    {itemQty > 1 && ` (Total: ${lineSubtotal.toFixed(3)} ${currency})`}
                  </span>

                  {isOutOfStock ? (
                    <span className="text-red-500 font-bold flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> Rupture
                    </span>
                  ) : isLowStock ? (
                    <span className="text-amber-500 font-medium flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> Plus que {stock}
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" /> En stock
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Box */}
      <div className="mt-4 pt-3.5 border-t border-purple-100 dark:border-purple-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-600 dark:text-slate-400">
          Valeur totale des composants séparés :{' '}
          <span className="line-through font-bold text-slate-400 dark:text-slate-500">
            {effectiveOriginalPrice.toFixed(3)} {currency}
          </span>
        </div>

        {savingsAmount > 0 && (
          <div className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span>🎉 Vous gagnez {savingsAmount.toFixed(3)} {currency} sur ce pack !</span>
          </div>
        )}
      </div>
    </div>
  );
}
