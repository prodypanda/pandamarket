'use client';

import Link from 'next/link';
import { ShoppingCart, type LucideIcon } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

interface StoreCartIconProps {
  storeHost?: string;
  storeId?: string;
  primaryColor: string;
  storePathBase?: string;
  iconColor?: string;
  className?: string;
  label?: string;
  badgeTextColor?: string;
  icon?: LucideIcon;
}

export function StoreCartIcon({
  storeHost,
  storeId,
  primaryColor,
  storePathBase,
  iconColor,
  className,
  label,
  badgeTextColor = '#FFFFFF',
  icon: Icon = ShoppingCart,
}: StoreCartIconProps) {
  const { items } = useCart();
  const basePath = (storePathBase ?? (storeHost ? `/store/${storeHost}` : '')).replace(/\/$/, '');

  const storeItemCount = items
    .filter((item) => !storeId || item.store_id === storeId)
    .reduce((sum, item) => sum + item.quantity, 0);
  const linkStyle = iconColor ? { color: iconColor } : className ? undefined : { color: primaryColor };

  return (
    <Link
      href={`${basePath}/cart`}
      className={className ? `relative ${className}` : 'relative inline-flex items-center gap-2 rounded-lg p-2 transition-colors hover:opacity-80'}
      style={linkStyle}
    >
      <Icon className="w-5 h-5" />
      {label && <span>{label}</span>}
      {storeItemCount > 0 && (
        <span
          className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-full"
          style={{ backgroundColor: primaryColor, color: badgeTextColor }}
        >
          {storeItemCount > 99 ? '99+' : storeItemCount}
        </span>
      )}
    </Link>
  );
}



