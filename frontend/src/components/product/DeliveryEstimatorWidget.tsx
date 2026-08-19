'use client';

import React, { useState, useMemo } from 'react';
import { Truck, MapPin, Clock, Sparkles, Zap } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

export interface DeliveryEstimatorWidgetProps {
  freeShippingEligible?: boolean;
  className?: string;
}

const TUNISIA_GOVERNORATES = [
  { id: 'tunis', name: 'Tunis', days: 1, region: 'grand_tunis' },
  { id: 'ariana', name: 'Ariana', days: 1, region: 'grand_tunis' },
  { id: 'ben_arous', name: 'Ben Arous', days: 1, region: 'grand_tunis' },
  { id: 'manouba', name: 'Manouba', days: 1, region: 'grand_tunis' },
  { id: 'nabeul', name: 'Nabeul', days: 2, region: 'coastal' },
  { id: 'bizerte', name: 'Bizerte', days: 2, region: 'coastal' },
  { id: 'sousse', name: 'Sousse', days: 2, region: 'coastal' },
  { id: 'monastir', name: 'Monastir', days: 2, region: 'coastal' },
  { id: 'mahdia', name: 'Mahdia', days: 2, region: 'coastal' },
  { id: 'sfax', name: 'Sfax', days: 2, region: 'coastal' },
  { id: 'zaghouan', name: 'Zaghouan', days: 2, region: 'north' },
  { id: 'beja', name: 'Béja', days: 2, region: 'north' },
  { id: 'jendouba', name: 'Jendouba', days: 2, region: 'north' },
  { id: 'le_kef', name: 'Le Kef', days: 2, region: 'north' },
  { id: 'siliana', name: 'Siliana', days: 2, region: 'north' },
  { id: 'kairouan', name: 'Kairouan', days: 2, region: 'central' },
  { id: 'kasserine', name: 'Kasserine', days: 3, region: 'interior' },
  { id: 'sidi_bouzid', name: 'Sidi Bouzid', days: 3, region: 'interior' },
  { id: 'gafsa', name: 'Gafsa', days: 3, region: 'south' },
  { id: 'tozeur', name: 'Tozeur', days: 3, region: 'south' },
  { id: 'kebili', name: 'Kébili', days: 3, region: 'south' },
  { id: 'gabes', name: 'Gabès', days: 3, region: 'south' },
  { id: 'medenine', name: 'Médenine', days: 3, region: 'south' },
  { id: 'tataouine', name: 'Tataouine', days: 3, region: 'south' },
];

export const DeliveryEstimatorWidget: React.FC<DeliveryEstimatorWidgetProps> = ({
  freeShippingEligible = false,
  className = '',
}) => {
  const { t, locale, dir } = useLocale();
  const [selectedGovId, setSelectedGovId] = useState<string>('tunis');

  const selectedGov = useMemo(() => {
    return TUNISIA_GOVERNORATES.find((g) => g.id === selectedGovId) || TUNISIA_GOVERNORATES[0];
  }, [selectedGovId]);

  const estimatedDateString = useMemo(() => {
    const targetDate = new Date();
    let addedDays = 0;
    const daysToAdd = selectedGov.days;

    while (addedDays < daysToAdd) {
      targetDate.setDate(targetDate.getDate() + 1);
      // Skip Sundays (day 0) for business delivery
      if (targetDate.getDay() !== 0) {
        addedDays++;
      }
    }

    try {
      const intlLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
      return targetDate.toLocaleDateString(intlLocale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return targetDate.toLocaleDateString();
    }
  }, [selectedGov, locale]);

  const estimatedFee = useMemo(() => {
    if (freeShippingEligible) return '0.000 TND';
    const isRemote = selectedGov.region === 'south' || selectedGov.region === 'interior';
    return isRemote ? '9.000 TND' : '7.000 TND';
  }, [selectedGov, freeShippingEligible]);

  return (
    <div
      dir={dir}
      data-testid="delivery-estimator-widget"
      className={`rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white p-4 text-xs shadow-xs dark:border-emerald-900/30 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-transparent ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 font-black text-gray-900 dark:text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <Truck className="h-4 w-4" />
          </div>
          <span>{t('productV2.deliveryEstimatorTitle')}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {freeShippingEligible ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-2xs">
              <Sparkles className="h-3 w-3" />
              <span>{t('common.free')}</span>
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              {estimatedFee}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] items-center gap-3">
        {/* Governorate Selector */}
        <div className="relative">
          <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
          <select
            value={selectedGovId}
            onChange={(e) => setSelectedGovId(e.target.value)}
            aria-label={t('productV2.selectGovernorate')}
            data-testid="delivery-governorate-select"
            className="w-full appearance-none rounded-xl border border-emerald-200 bg-white py-2 ps-8 pe-7 text-xs font-bold text-gray-900 shadow-2xs focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-[#1f242e] dark:text-white cursor-pointer"
          >
            {TUNISIA_GOVERNORATES.map((gov) => (
              <option key={gov.id} value={gov.id}>
                {gov.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
            ▼
          </div>
        </div>

        {/* Dynamic Estimated Date Badge */}
        <div className="flex items-center gap-2 rounded-xl bg-white/90 p-2 border border-emerald-100 dark:border-white/10 dark:bg-white/5">
          <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase text-gray-400 dark:text-gray-400">
              {t('productV2.deliveryDelay')}
            </span>
            <p className="font-black text-emerald-700 dark:text-emerald-400 truncate">
              {t('productV2.estimatedArrival', { date: estimatedDateString })}
            </p>
          </div>
        </div>
      </div>

      {/* Same day dispatch banner */}
      <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-emerald-100/60 text-[11px] font-semibold text-emerald-800 dark:border-white/5 dark:text-emerald-400">
        <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-amber-500" />
        <span>{t('productV2.sameDayDispatchNote')}</span>
      </div>
    </div>
  );
};
