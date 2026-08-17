'use client';

import React from 'react';
import { Package, Image as ImageIcon } from 'lucide-react';

export interface ProductImagePlaceholderProps {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
  altText?: string;
  theme?: 'default' | 'aliexpress' | 'amazon' | 'alibaba';
}

export function ProductImagePlaceholder({
  className = '',
  iconClassName = 'h-8 w-8',
  showText = false,
  altText,
  theme = 'default',
}: ProductImagePlaceholderProps) {
  const getThemeBg = () => {
    switch (theme) {
      case 'aliexpress':
        return 'from-orange-50/80 via-amber-50/40 to-orange-100/60 dark:from-[#2a1b14] dark:via-[#221610] dark:to-[#1a110d]';
      case 'alibaba':
        return 'from-amber-50/80 via-orange-50/40 to-amber-100/60 dark:from-[#271b12] dark:via-[#1e150e] dark:to-[#17100b]';
      case 'amazon':
        return 'from-slate-100/90 via-zinc-100/50 to-slate-200/70 dark:from-[#1b222d] dark:via-[#161b24] dark:to-[#11161d]';
      default:
        return 'from-slate-100/90 via-emerald-50/30 to-slate-200/60 dark:from-[#141a24] dark:via-[#10151e] dark:to-[#0c1017]';
    }
  };

  const getIconColor = () => {
    switch (theme) {
      case 'aliexpress':
        return 'text-orange-400/70 dark:text-orange-500/40';
      case 'alibaba':
        return 'text-amber-500/70 dark:text-amber-500/40';
      case 'amazon':
        return 'text-slate-400/70 dark:text-slate-500/40';
      default:
        return 'text-emerald-600/50 dark:text-emerald-500/40';
    }
  };

  return (
    <div
      role="img"
      aria-label={altText || 'Aucune image disponible pour ce produit'}
      className={`relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-gradient-to-br ${getThemeBg()} ${className}`}
    >
      {/* Decorative Subtle Background Pattern */}
      <svg
        className="absolute inset-0 h-full w-full stroke-gray-900/[0.03] dark:stroke-white/[0.02]"
        aria-hidden="true"
      >
        <defs>
          <pattern id="placeholder-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M.5 24V.5H24" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" strokeWidth="0" fill="url(#placeholder-grid)" />
      </svg>

      {/* Center Icon & Branding */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 p-3 text-center">
        <div className={`flex items-center justify-center rounded-2xl bg-white/80 p-2.5 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-sm dark:bg-white/[0.06] dark:ring-white/[0.08] ${getIconColor()}`}>
          <Package className={iconClassName} strokeWidth={1.5} />
        </div>

        {showText && (
          <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            PandaMarket
          </span>
        )}
      </div>
    </div>
  );
}
