'use client';

import { useMemo, useState } from 'react';
import { Check, PackageCheck } from 'lucide-react';
import { AddToCartButton } from '../hub/AddToCartButton';
import type { WholesalePricing } from '../../lib/cart-utils';

interface ProductVariant {
  id: string;
  sku?: string | null;
  title: string;
  price: string | number;
  inventory_quantity?: number | null;
  options?: Record<string, string> | null;
}

interface ProductVariantPurchasePanelProps {
  productId: string;
  title: string;
  slug?: string | null;
  category?: string | null;
  marketplaceCategorySlug?: string | null;
  basePrice: number;
  sellerType?: string | null;
  wholesalePricing?: WholesalePricing | null;
  storeId: string;
  storeName: string;
  storeSubdomain?: string | null;
  productType?: string | null;
  imageUrl: string | null;
  inventoryQuantity?: number;
  variants?: ProductVariant[];
  isAliExpress?: boolean;
}

function toNumber(value: string | number | null | undefined): number {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatOptions(options?: Record<string, string> | null) {
  const entries = Object.entries(options ?? {}).filter(([, value]) => value);
  return entries.length > 0 ? entries.map(([name, value]) => `${name}: ${value}`).join(' · ') : '';
}

export function ProductVariantPurchasePanel({
  productId,
  title,
  slug,
  category,
  marketplaceCategorySlug,
  basePrice,
  sellerType,
  wholesalePricing,
  storeId,
  storeName,
  storeSubdomain,
  productType,
  imageUrl,
  inventoryQuantity,
  variants = [],
  isAliExpress = false,
}: ProductVariantPurchasePanelProps) {
  const activeVariants = useMemo(() => variants.filter((variant) => variant.id && variant.title), [variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(activeVariants[0]?.id ?? '');
  const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId);
  const price = selectedVariant ? toNumber(selectedVariant.price) : basePrice;
  const maxQuantity = selectedVariant ? Number(selectedVariant.inventory_quantity ?? 0) : inventoryQuantity;
  const variantLabel = selectedVariant ? [selectedVariant.title, formatOptions(selectedVariant.options)].filter(Boolean).join(' · ') : undefined;

  return (
    <div className="space-y-4">
      {activeVariants.length > 0 && (
        <div className={`rounded-[1.75rem] border p-4 ${isAliExpress ? 'border-orange-100 bg-[#fff7f2]' : 'border-emerald-100 bg-emerald-50/60'}`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Choose variation</p>
              <p className="mt-1 text-sm font-bold text-gray-700">Pick the exact option before adding to cart.</p>
            </div>
            <PackageCheck className={`h-5 w-5 ${isAliExpress ? 'text-[#ff4747]' : 'text-[#16C784]'}`} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {activeVariants.map((variant) => {
              const isSelected = variant.id === selectedVariantId;
              const stock = Number(variant.inventory_quantity ?? 0);
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`relative rounded-2xl border px-4 py-3 text-left transition ${isSelected ? 'border-slate-950 bg-white shadow-sm' : 'border-white bg-white/70 hover:border-gray-200 hover:bg-white'}`}
                >
                  <span className="block pr-6 text-sm font-black text-gray-900">{variant.title}</span>
                  {formatOptions(variant.options) && <span className="mt-1 block text-xs font-semibold text-gray-500">{formatOptions(variant.options)}</span>}
                  <span className="mt-2 flex items-center justify-between gap-3 text-xs font-black">
                    <span className={isAliExpress ? 'text-[#ff4747]' : 'text-[#16C784]'}>{toNumber(variant.price).toFixed(3)} TND</span>
                    <span className={stock > 0 ? 'text-gray-500' : 'text-red-500'}>{stock > 0 ? `${stock} stock` : 'Out'}</span>
                  </span>
                  {isSelected && <Check className="absolute right-3 top-3 h-4 w-4 text-slate-950" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`flex items-center gap-3 rounded-[1.75rem] p-3 ${isAliExpress ? 'bg-[#fff7f2]' : 'bg-gray-50'}`}>
        <AddToCartButton
          product_id={productId}
          title={title}
          slug={slug}
          category={category}
          marketplace_category_slug={marketplaceCategorySlug}
          price={price}
          seller_type={sellerType}
          wholesale_pricing={wholesalePricing}
          store_id={storeId}
          store_name={storeName}
          store_subdomain={storeSubdomain}
          product_type={productType}
          image_url={imageUrl}
          variant_id={selectedVariant?.id}
          variant={variantLabel}
          maxQuantity={maxQuantity}
        />
      </div>
    </div>
  );
}
