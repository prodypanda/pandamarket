'use client';

import { useState } from 'react';
import { ShoppingCart, Check, Minus, Plus } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { getMinimumQuantityForSeller, getWholesaleUnitPrice, type WholesalePricing } from '../../lib/cart-utils';

interface AddToCartButtonProps {
  product: {
    id: string;
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
    inventory_quantity?: number;
  };
  primaryColor: string;
}

export function AddToCartButton({ product, primaryColor }: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const minimumQuantity = getMinimumQuantityForSeller(product.seller_type, product.wholesale_pricing);
  const [quantity, setQuantity] = useState(minimumQuantity);
  const unitPrice = getWholesaleUnitPrice(product.price, quantity, product.seller_type, product.wholesale_pricing);

  const stockLimit = product.product_type === 'physical' && typeof product.inventory_quantity === 'number' && Number.isFinite(product.inventory_quantity)
    ? Math.max(0, product.inventory_quantity)
    : undefined;
  const isOutOfStock = stockLimit !== undefined && stockLimit < minimumQuantity;

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addToCart({
      product_id: product.id,
      title: product.title,
      slug: product.slug,
      category: product.category,
      marketplace_category_slug: product.marketplace_category_slug,
      price: unitPrice,
      base_price: product.price,
      quantity,
      store_id: product.store_id,
      store_name: product.store_name,
      store_subdomain: product.store_subdomain,
      seller_type: product.seller_type,
      wholesale_pricing: product.wholesale_pricing,
      product_type: product.product_type,
      image_url: product.image_url,
      variant_id: product.variant_id,
      variant: product.variant,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="flex items-center overflow-hidden rounded-xl border border-gray-300">
        <button
          type="button"
          onClick={() => setQuantity((current) => Math.max(minimumQuantity, current - 1))}
          className="p-3 transition-colors hover:bg-gray-50"
        >
          <Minus className="h-4 w-4 text-gray-600" />
        </button>
        <span className="min-w-[40px] px-4 py-3 text-center text-sm font-semibold text-gray-900">
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => setQuantity((current) => Math.min(stockLimit ?? current + 1, current + 1))}
          disabled={stockLimit !== undefined && quantity >= stockLimit}
          className="p-3 transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          <Plus className="h-4 w-4 text-gray-600" />
        </button>
      </div>
      {unitPrice !== product.price && (
        <span className="hidden text-xs font-bold sm:inline" style={{ color: primaryColor }}>
          {unitPrice.toFixed(3)} TND / unité
        </span>
      )}
      <button
        onClick={handleAddToCart}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: isOutOfStock ? '#D1D5DB' : added ? '#10B981' : primaryColor }}
        disabled={isOutOfStock}
      >
        {added ? (
          <>
            <Check className="w-5 h-5" />
            Ajouté au panier !
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5" />
            {isOutOfStock ? 'Rupture de stock' : 'Ajouter au panier'}
          </>
        )}
      </button>
    </div>
  );
}
