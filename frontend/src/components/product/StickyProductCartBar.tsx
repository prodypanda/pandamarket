'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, Check, ChevronUp } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

export interface StickyProductCartBarProps {
  title: string;
  price: number | string;
  compareAtPrice?: number | string | null;
  thumbnail?: string | null;
  inStock?: boolean;
  onAddToCart?: () => void;
  onScrollToTop?: () => void;
  targetTriggerId?: string;
  className?: string;
}

export const StickyProductCartBar: React.FC<StickyProductCartBarProps> = ({
  title,
  price,
  compareAtPrice,
  thumbnail,
  inStock = true,
  onAddToCart,
  onScrollToTop,
  targetTriggerId = 'main-add-to-cart-btn',
  className = '',
}) => {
  const { t, dir } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const triggerElem = document.getElementById(targetTriggerId);
      if (triggerElem) {
        const rect = triggerElem.getBoundingClientRect();
        // Visible if the main button is scrolled past top of viewport
        setVisible(rect.bottom < 0);
      } else {
        // Fallback: show after 450px scroll
        setVisible(window.scrollY > 450);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [targetTriggerId]);

  if (!visible) return null;

  const numericPrice = typeof price === 'number' ? price : Number(price || 0);
  const numericCompareAt = compareAtPrice ? Number(compareAtPrice) : null;
  const isDiscounted = numericCompareAt && numericCompareAt > numericPrice;

  const scrollToHero = () => {
    if (onScrollToTop) {
      onScrollToTop();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div
      dir={dir}
      data-testid="sticky-product-cart-bar"
      className={`fixed bottom-0 inset-x-0 z-[999] bg-white/95 dark:bg-[#161a22]/95 backdrop-blur-md border-t border-gray-200/80 dark:border-white/10 p-3 sm:p-4 shadow-2xl transition-transform duration-300 animate-slideUp ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Thumbnail & Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={scrollToHero}
            className="flex items-center gap-3 min-w-0 text-start group cursor-pointer"
          >
            {thumbnail ? (
              <img
                src={thumbnail}
                alt=""
                className="h-11 w-11 shrink-0 rounded-xl object-cover border border-gray-200 dark:border-white/10 group-hover:scale-105 transition"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400 font-bold dark:bg-white/5">
                🛍️
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate group-hover:text-emerald-600 transition">
                {title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {numericPrice.toFixed(3)} TND
                </span>
                {isDiscounted && (
                  <span className="text-[10px] text-gray-400 line-through">
                    {numericCompareAt!.toFixed(3)} TND
                  </span>
                )}
                {inStock ? (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <Check className="h-2.5 w-2.5" />
                    <span>{t('productV2.stickyBar.inStock')}</span>
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-red-50 px-2 py-0.2 text-[10px] font-black text-red-600 dark:bg-red-950/60 dark:text-red-300">
                    {t('productV2.outOfStock')}
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Right: Add to Cart Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="sticky-add-to-cart-btn"
            disabled={!inStock}
            onClick={() => {
              if (onAddToCart) {
                onAddToCart();
              } else {
                scrollToHero();
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-black text-white shadow-md shadow-emerald-900/20 hover:from-emerald-500 hover:to-teal-500 transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>{t('productV2.stickyBar.addToCart')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
