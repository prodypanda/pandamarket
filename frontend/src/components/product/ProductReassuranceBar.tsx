'use client';

import React from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Award,
  CheckCircle2,
  Heart,
  Lock,
  Zap,
  Sparkles,
  PackageCheck,
  Clock,
  CreditCard,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

export interface ReassuranceItem {
  id?: string;
  icon?: string;
  title: string;
  description?: string;
  desc?: string;
}

export interface ProductReassuranceBarProps {
  customItemsJson?: string;
  className?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  // CamelCase aliases
  shieldcheck: ShieldCheck,
  truck: Truck,
  rotateccw: RotateCcw,
  checkcircle2: CheckCircle2,
  award: Award,
  heart: Heart,
  lock: Lock,
  zap: Zap,
  sparkles: Sparkles,
  packagecheck: PackageCheck,
  clock: Clock,
  creditcard: CreditCard,

  // Short aliases
  shield: ShieldCheck,
  rotate: RotateCcw,
  check: CheckCircle2,
  card: CreditCard,
  package: PackageCheck,
};

function getIconComponent(iconName?: string): React.ElementType {
  if (!iconName) return ShieldCheck;
  const key = iconName.toLowerCase().replace(/[-_]/g, '');
  return ICON_MAP[key] || ShieldCheck;
}

export const ProductReassuranceBar: React.FC<ProductReassuranceBarProps> = ({
  customItemsJson,
  className = '',
}) => {
  const { t, dir } = useLocale();

  let items: ReassuranceItem[] = [];

  if (customItemsJson) {
    try {
      const parsed = JSON.parse(customItemsJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        items = parsed;
      }
    } catch {
      // Fallback
    }
  }

  if (items.length === 0) {
    items = [
      {
        icon: 'ShieldCheck',
        title: t('productV2.reassurance.securePaymentTitle'),
        description: t('productV2.reassurance.securePaymentDesc'),
      },
      {
        icon: 'Truck',
        title: t('productV2.reassurance.fastDeliveryTitle'),
        description: t('productV2.reassurance.fastDeliveryDesc'),
      },
      {
        icon: 'RotateCcw',
        title: t('productV2.reassurance.easyReturnsTitle'),
        description: t('productV2.reassurance.easyReturnsDesc'),
      },
      {
        icon: 'Award',
        title: t('productV2.reassurance.verifiedSellerTitle'),
        description: t('productV2.reassurance.verifiedSellerDesc'),
      },
    ];
  }

  // Dynamic grid column layout based on number of items
  const gridColsClass =
    items.length === 1
      ? 'grid-cols-1'
      : items.length === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : items.length === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div
      dir={dir}
      data-testid="product-reassurance-bar"
      className={`grid ${gridColsClass} gap-3 ${className}`}
    >
      {items.map((item, idx) => {
        const IconComponent = getIconComponent(item.icon);
        const descriptionText = item.description || item.desc || '';
        return (
          <div
            key={item.id || `${item.title}-${idx}`}
            className="flex items-start gap-3 rounded-2xl border border-gray-100/90 bg-white/70 p-3.5 shadow-2xs backdrop-blur-xs transition hover:border-emerald-200 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-emerald-500/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-2xs dark:bg-emerald-950/40 dark:text-emerald-400">
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">
                {item.title}
              </h4>
              {descriptionText && (
                <p className="mt-0.5 text-[11px] leading-tight text-gray-500 dark:text-gray-400 line-clamp-2">
                  {descriptionText}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
