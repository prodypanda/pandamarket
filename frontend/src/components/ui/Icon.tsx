/**
 * PandaMarket Icon Wrapper
 *
 * Per design-system.md: All Lucide icons should use:
 * - Default size: 20px (h-5 w-5)
 * - Stroke width: 1.75
 * - Color: inherits from parent text color
 *
 * Usage:
 *   import { Icon } from '@/components/ui/Icon';
 *   import { ShoppingCart } from 'lucide-react';
 *
 *   <Icon icon={ShoppingCart} />
 *   <Icon icon={ShoppingCart} size="lg" />
 *   <Icon icon={ShoppingCart} className="text-[#16C784]" />
 */

import type { LucideIcon } from 'lucide-react';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<IconSize, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
}

export function Icon({ icon: LucideIcon, size = 'md', className = '' }: IconProps) {
  const px = SIZE_MAP[size];
  return (
    <LucideIcon
      width={px}
      height={px}
      strokeWidth={1.75}
      className={className}
    />
  );
}

export default Icon;
