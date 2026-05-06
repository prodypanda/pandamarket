'use client';

import { ShoppingBag, ShoppingCart } from 'lucide-react';
import { StoreCartIcon } from '../store/StoreCartIcon';

interface StorefrontThemeCartLinkProps {
  storeId?: string;
  storeHost?: string;
  storePathBase?: string;
  primaryColor: string;
  iconColor?: string;
  className?: string;
  label?: string;
  badgeTextColor?: string;
  icon?: 'bag' | 'cart';
}

export function StorefrontThemeCartLink({
  storeId,
  storeHost,
  storePathBase,
  primaryColor,
  iconColor,
  className,
  label,
  badgeTextColor,
  icon = 'bag',
}: StorefrontThemeCartLinkProps) {
  const Icon = icon === 'cart' ? ShoppingCart : ShoppingBag;

  return (
    <StoreCartIcon
      storeId={storeId}
      storeHost={storeHost}
      storePathBase={storePathBase}
      primaryColor={primaryColor}
      iconColor={iconColor}
      className={className}
      label={label}
      badgeTextColor={badgeTextColor}
      icon={Icon}
    />
  );
}
