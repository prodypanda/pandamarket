'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

interface StoreCartIconProps {
  storeHost: string;
  storeId: string;
  primaryColor: string;
}

export function StoreCartIcon({ storeHost, storeId, primaryColor }: StoreCartIconProps) {
  const { items } = useCart();

  // Count only items from this store
  const storeItemCount = items
    .filter((item) => item.store_id === storeId)
    .reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link
      href={`/store/${storeHost}/cart`}
      className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <ShoppingCart className="w-5 h-5 text-gray-700" />
      {storeItemCount > 0 && (
        <span
          className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-full"
          style={{ backgroundColor: primaryColor }}
        >
          {storeItemCount > 99 ? '99+' : storeItemCount}
        </span>
      )}
    </Link>
  );
}
