'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Minus, Plus, Check } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useMarketplaceTheme } from '../../hooks/useMarketplaceTheme';
import {
  getMinimumQuantityForSeller,
  getWholesaleUnitPrice,
  type WholesalePricing,
} from '../../lib/cart-utils';

interface AddToCartButtonProps {
  product_id: string;
  title: string;
  slug?: string | null;
  category?: string | null;
  marketplace_category_slug?: string | null;
  price: number;
  seller_type?: string | null;
  wholesale_pricing?: WholesalePricing | null;
  store_id: string;
  store_name: string;
  store_subdomain?: string | null;
  product_type?: string | null;
  image_url: string | null;
  variant_id?: string;
  variant?: string;
  maxQuantity?: number;
  controlledQuantity?: number;
  onQuantityChange?: (qty: number) => void;
}

export function AddToCartButton({
  product_id,
  title,
  slug,
  category,
  marketplace_category_slug,
  price,
  seller_type,
  wholesale_pricing,
  store_id,
  store_name,
  store_subdomain,
  product_type,
  image_url,
  variant_id,
  variant,
  maxQuantity,
  controlledQuantity,
  onQuantityChange,
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const { classes, isAliExpress } = useMarketplaceTheme();
  const minimumQuantity = getMinimumQuantityForSeller(seller_type, wholesale_pricing);
  const [quantity, setQuantity] = useState(controlledQuantity ?? minimumQuantity);
  const [added, setAdded] = useState(false);

  // Sync if external controlled quantity changes (e.g. clicking wholesale tier)
  useEffect(() => {
    if (typeof controlledQuantity === 'number' && controlledQuantity > 0) {
      setQuantity(controlledQuantity);
    }
  }, [controlledQuantity]);
  const stockLimit =
    product_type === 'physical' && typeof maxQuantity === 'number' && Number.isFinite(maxQuantity)
      ? Math.max(0, maxQuantity)
      : undefined;
  const isOutOfStock = stockLimit !== undefined && stockLimit < minimumQuantity;
  const unitPrice = getWholesaleUnitPrice(price, quantity, seller_type, wholesale_pricing);

  const handleAdd = () => {
    if (isOutOfStock) return;
    addToCart({
      product_id,
      title,
      slug,
      category,
      marketplace_category_slug,
      price: unitPrice,
      base_price: price,
      quantity,
      store_id,
      store_name,
      store_subdomain,
      seller_type,
      wholesale_pricing,
      product_type,
      image_url,
      variant_id,
      variant,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 flex-1">
      {/* Quantity Selector */}
      <div
        className={`flex items-center overflow-hidden rounded-full border bg-white ${isAliExpress ? 'border-orange-200 shadow-sm shadow-orange-900/5' : 'border-gray-300'}`}
      >
        <button
          aria-label="Decrease quantity"
          onClick={() => {
            const next = Math.max(minimumQuantity, quantity - 1);
            setQuantity(next);
            onQuantityChange?.(next);
          }}
          className={`p-3 transition-colors ${isAliExpress ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}
        >
          <Minus className="w-4 h-4 text-gray-600" />
        </button>
        <span className="px-4 py-3 text-sm font-semibold text-gray-900 min-w-[40px] text-center">
          {quantity}
        </span>
        <button
          aria-label="Increase quantity"
          onClick={() => {
            const next = Math.min(stockLimit ?? quantity + 1, quantity + 1);
            setQuantity(next);
            onQuantityChange?.(next);
          }}
          disabled={stockLimit !== undefined && quantity >= stockLimit}
          className={`p-3 transition-colors disabled:opacity-40 ${isAliExpress ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      {unitPrice !== price && (
        <span className="hidden text-xs font-bold text-emerald-700 sm:inline">
          {unitPrice.toFixed(3)} TND / unité
        </span>
      )}

      {/* Add to Cart Button */}
      <button
        onClick={handleAdd}
        disabled={isOutOfStock}
        className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 font-black text-white transition-all duration-200 ${
          isOutOfStock
            ? 'rounded-full bg-gray-300 cursor-not-allowed'
            : added
              ? `${classes.primaryGradient} rounded-full scale-[0.98]`
              : `${classes.primaryGradient} rounded-full hover:scale-[1.02] hover:shadow-lg`
        }`}
      >
        {isOutOfStock ? (
          <>
            <ShoppingCart className="w-5 h-5" />
            Rupture de stock
          </>
        ) : added ? (
          <>
            <Check className="w-5 h-5" />
            Ajouté !
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5" />
            Ajouter au panier
          </>
        )}
      </button>
    </div>
  );
}
