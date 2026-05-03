'use client';

import { useState } from 'react';
import { ShoppingCart, Minus, Plus, Check } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

interface AddToCartButtonProps {
  product_id: string;
  title: string;
  price: number;
  store_id: string;
  store_name: string;
  image_url: string | null;
  variant?: string;
}

export function AddToCartButton({
  product_id,
  title,
  price,
  store_id,
  store_name,
  image_url,
  variant,
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart({
      product_id,
      title,
      price,
      quantity,
      store_id,
      store_name,
      image_url,
      variant,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 flex-1">
      {/* Quantity Selector */}
      <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
        <button
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="p-3 hover:bg-gray-50 transition-colors"
        >
          <Minus className="w-4 h-4 text-gray-600" />
        </button>
        <span className="px-4 py-3 text-sm font-semibold text-gray-900 min-w-[40px] text-center">
          {quantity}
        </span>
        <button
          onClick={() => setQuantity((q) => q + 1)}
          className="p-3 hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAdd}
        className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
          added
            ? 'bg-[#16C784] scale-[0.98]'
            : 'bg-[#16C784] hover:bg-[#14b876] hover:scale-[1.02] hover:shadow-lg hover:shadow-[#16C784]/20'
        }`}
      >
        {added ? (
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
