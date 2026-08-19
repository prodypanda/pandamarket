'use client';

import React from 'react';
import { ShieldCheck, Truck, RotateCcw, Award, CheckCircle2, Heart, Lock, Zap } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

export interface ReassuranceItem {
  icon?: 'shield' | 'truck' | 'rotate' | 'check' | 'award' | 'heart' | 'lock' | 'zap' | string;
  title: string;
  desc: string;
}

export interface ProductReassuranceBarProps {
  customItemsJson?: string;
  className?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  shield: ShieldCheck,
  truck: Truck,
  rotate: RotateCcw,
  check: CheckCircle2,
  award: Award,
  heart: Heart,
  lock: Lock,
  zap: Zap,
};

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
        icon: 'shield',
        title: t('productV2.reassurance.securePaymentTitle'),
        desc: t('productV2.reassurance.securePaymentDesc'),
      },
      {
        icon: 'truck',
        title: t('productV2.reassurance.fastDeliveryTitle'),
        desc: t('productV2.reassurance.fastDeliveryDesc'),
      },
      {
        icon: 'rotate',
        title: t('productV2.reassurance.easyReturnsTitle'),
        desc: t('productV2.reassurance.easyReturnsDesc'),
      },
      {
        icon: 'award',
        title: t('productV2.reassurance.verifiedSellerTitle'),
        desc: t('productV2.reassurance.verifiedSellerDesc'),
      },
    ];
  }

  return (
    <div
      dir={dir}
      data-testid="product-reassurance-bar"
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}
    >
      {items.map((item, idx) => {
        const IconComponent = ICON_MAP[item.icon || 'shield'] || ShieldCheck;
        return (
          <div
            key={`${item.title}-${idx}`}
            className="flex items-start gap-3 rounded-2xl border border-gray-100/90 bg-white/70 p-3.5 shadow-2xs backdrop-blur-xs transition hover:border-emerald-200 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-emerald-500/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-2xs dark:bg-emerald-950/40 dark:text-emerald-400">
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">
                {item.title}
              </h4>
              <p className="mt-0.5 text-[11px] leading-tight text-gray-500 dark:text-gray-400 line-clamp-2">
                {item.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
