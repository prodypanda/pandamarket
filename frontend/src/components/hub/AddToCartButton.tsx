'use client';

import { useState } from 'react';
import { ShoppingCart, Minus, Plus, Check } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useMarketplaceTheme } from '../../hooks/useMarketplaceTheme';

interface AddToCartButtonProps {
  product_id: string;
  title: string;
  slug?: string | null;
  category?: string | null;
  marketplace_category_slug?: string | null;
  price: number;
  store_id: string;
  store_name: string;
  store_subdomain?: string | null;
  image_url: string | null;
  variant?: string;
  maxQuantity?: number;
}

export function AddToCartButton({
  product_id,
  title,
  slug,
  category,
  marketplace_category_slug,
  price,
  store_id,
  store_name,
  store_subdomain,
  image_url,
  variant,
  maxQuantity,
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const { classes, isAliExpress } = useMarketplaceTheme();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const stockLimit = typeof maxQuantity === 'number' && Number.isFinite(maxQuantity) ? Math.max(0, maxQuantity) : undefined;
  const isOutOfStock = stockLimit === 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addToCart({
      product_id,
      title,
      slug,
      category,
      marketplace_category_slug,
      price,
      quantity,
      store_id,
      store_name,
      store_subdomain,
      image_url,
      variant,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 flex-1">
      {/* Quantity Selector */}
      <div className={`flex items-center overflow-hidden rounded-full border bg-white ${isAliExpress ? 'border-orange-200 shadow-sm shadow-orange-900/5' : 'border-gray-300'}`}>
        <button
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className={`p-3 transition-colors ${isAliExpress ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}
        >
          <Minus className="w-4 h-4 text-gray-600" />
        </button>
        <span className="px-4 py-3 text-sm font-semibold text-gray-900 min-w-[40px] text-center">
          {quantity}
        </span>
        <button
          onClick={() => setQuantity((q) => Math.min(stockLimit ?? q + 1, q + 1))}
          disabled={stockLimit !== undefined && quantity >= stockLimit}
          className={`p-3 transition-colors disabled:opacity-40 ${isAliExpress ? 'hover:bg-orange-50' : 'hover:bg-gray-50'}`}
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>

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
