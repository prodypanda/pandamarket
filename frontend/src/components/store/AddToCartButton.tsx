'use client';

import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

interface AddToCartButtonProps {
  product: {
    id: string;
    title: string;
    price: number;
    store_id: string;
    store_name: string;
    image_url: string | null;
    inventory_quantity?: number;
  };
  primaryColor: string;
}

export function AddToCartButton({ product, primaryColor }: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const isOutOfStock = product.inventory_quantity === 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addToCart({
      product_id: product.id,
      title: product.title,
      price: product.price,
      quantity: 1,
      store_id: product.store_id,
      store_name: product.store_name,
      image_url: product.image_url,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button
      onClick={handleAddToCart}
      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: added ? '#10B981' : primaryColor }}
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
  );
}
