'use client';

import React from 'react';
import type { MarketplaceSettings } from '@/lib/marketplace-settings';

export interface WatermarkConfig {
  watermark_enabled?: boolean | string;
  watermark_type?: 'text' | 'image' | 'both' | string;
  watermark_text?: string;
  watermark_image_url?: string;
  watermark_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'diagonal_repeat' | string;
  watermark_opacity?: number | string;
  watermark_scale?: 'small' | 'medium' | 'large' | string;
  watermark_style?: 'subtle' | 'badge' | 'glassmorphism' | string;
  watermark_show_on_gallery?: boolean | string;
  watermark_show_on_cards?: boolean | string;
  watermark_show_on_lightbox?: boolean | string;
  watermark_copy_protection?: boolean | string;
  marketplace_name?: string;
}

export type WatermarkViewType = 'card' | 'gallery' | 'lightbox' | 'preview';

export interface WatermarkOverlayProps {
  settings?: WatermarkConfig | MarketplaceSettings | null;
  storeName?: string;
  viewType?: WatermarkViewType;
  className?: string;
}

export function isWatermarkVisible(
  settings?: WatermarkConfig | MarketplaceSettings | null,
  viewType: WatermarkViewType = 'card',
): boolean {
  if (!settings) return false;
  const isEnabled = String(settings.watermark_enabled) === 'true' || settings.watermark_enabled === true;
  if (!isEnabled) return false;

  if (viewType === 'preview') return true;

  if (viewType === 'gallery') {
    return settings.watermark_show_on_gallery === undefined || String(settings.watermark_show_on_gallery) === 'true' || settings.watermark_show_on_gallery === true;
  }
  if (viewType === 'lightbox') {
    return settings.watermark_show_on_lightbox === undefined || String(settings.watermark_show_on_lightbox) === 'true' || settings.watermark_show_on_lightbox === true;
  }
  if (viewType === 'card') {
    return settings.watermark_show_on_cards === undefined || String(settings.watermark_show_on_cards) === 'true' || settings.watermark_show_on_cards === true;
  }

  return true;
}

export function resolveWatermarkText(
  rawText?: string,
  marketplaceName?: string,
  storeName?: string,
): string {
  const fallback = marketplaceName || 'PandaMarket';
  if (!rawText || !rawText.trim()) return fallback;

  return rawText
    .replace(/\{marketplace_name\}/gi, marketplaceName || 'PandaMarket')
    .replace(/\{store_name\}/gi, storeName || marketplaceName || 'PandaMarket');
}

export function WatermarkOverlay({
  settings,
  storeName,
  viewType = 'card',
  className = '',
}: WatermarkOverlayProps) {
  if (!isWatermarkVisible(settings, viewType)) {
    return null;
  }

  const type = (settings?.watermark_type as 'text' | 'image' | 'both') || 'text';
  const position = (settings?.watermark_position as string) || 'bottom-right';
  const rawOpacity = Number(settings?.watermark_opacity);
  const opacity = Number.isFinite(rawOpacity) ? Math.max(10, Math.min(100, rawOpacity)) / 100 : 0.4;
  const scale = (settings?.watermark_scale as 'small' | 'medium' | 'large') || 'medium';
  const style = (settings?.watermark_style as 'subtle' | 'badge' | 'glassmorphism') || 'subtle';
  const imageUrl = settings?.watermark_image_url?.trim() || '';
  const displayText = resolveWatermarkText(settings?.watermark_text, settings?.marketplace_name, storeName);

  // Sizing tokens based on scale and viewType
  const isLargeView = viewType === 'gallery' || viewType === 'lightbox';

  const scaleClasses = {
    small: {
      text: isLargeView ? 'text-xs md:text-sm font-semibold' : 'text-[10px] font-semibold',
      img: isLargeView ? 'h-5 md:h-6 max-w-[80px]' : 'h-3.5 max-w-[60px]',
      gap: 'gap-1',
      padding: isLargeView ? 'px-2 py-1' : 'px-1.5 py-0.5',
    },
    medium: {
      text: isLargeView ? 'text-sm md:text-base font-bold' : 'text-xs font-bold',
      img: isLargeView ? 'h-7 md:h-8 max-w-[120px]' : 'h-5 max-w-[80px]',
      gap: 'gap-1.5',
      padding: isLargeView ? 'px-3 py-1.5' : 'px-2 py-1',
    },
    large: {
      text: isLargeView ? 'text-base md:text-lg font-black' : 'text-sm font-black',
      img: isLargeView ? 'h-9 md:h-11 max-w-[160px]' : 'h-6 max-w-[100px]',
      gap: 'gap-2',
      padding: isLargeView ? 'px-4 py-2' : 'px-2.5 py-1',
    },
  }[scale];

  // Visual style tokens
  const styleClasses = {
    subtle: 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] tracking-wide',
    badge: 'bg-black/60 text-white rounded-md shadow-sm backdrop-blur-[2px]',
    glassmorphism: 'bg-white/40 text-gray-900 border border-white/40 rounded-lg shadow-md backdrop-blur-md dark:bg-black/40 dark:text-white dark:border-white/10',
  }[style];

  // Position alignment
  if (position === 'diagonal_repeat') {
    return (
      <div
        data-watermark="true"
        className={`pointer-events-none absolute inset-0 z-20 overflow-hidden select-none ${className}`}
        style={{ opacity }}
        aria-hidden="true"
      >
        <div className="absolute -inset-10 flex flex-wrap items-center justify-around gap-12 rotate-[-25deg]">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center ${scaleClasses.gap} ${scaleClasses.text} whitespace-nowrap text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]`}
            >
              {(type === 'image' || type === 'both') && imageUrl && (
                <img
                  src={imageUrl}
                  alt=""
                  className={`${scaleClasses.img} object-contain brightness-0 invert`}
                />
              )}
              {(type === 'text' || type === 'both' || !imageUrl) && (
                <span>{displayText}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const positionClass = {
    'top-left': 'top-2.5 left-2.5',
    'top-right': 'top-2.5 right-2.5',
    'bottom-left': 'bottom-2.5 left-2.5',
    'bottom-right': 'bottom-2.5 right-2.5',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  }[position] || 'bottom-2.5 right-2.5';

  return (
    <div
      data-watermark="true"
      className={`pointer-events-none absolute z-20 select-none ${positionClass} ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <div
        className={`inline-flex items-center ${scaleClasses.gap} ${scaleClasses.padding} ${scaleClasses.text} ${styleClasses}`}
      >
        {(type === 'image' || type === 'both') && imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className={`${scaleClasses.img} object-contain select-none`}
            draggable={false}
          />
        )}
        {(type === 'text' || type === 'both' || !imageUrl) && (
          <span className="select-none leading-none">{displayText}</span>
        )}
      </div>
    </div>
  );
}

export interface WatermarkedContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  settings?: WatermarkConfig | MarketplaceSettings | null;
  storeName?: string;
  viewType?: WatermarkViewType;
  children: React.ReactNode;
}

export function WatermarkedContainer({
  settings,
  storeName,
  viewType = 'card',
  children,
  className = '',
  ...props
}: WatermarkedContainerProps) {
  const isCopyProtected =
    String(settings?.watermark_copy_protection) === 'true' ||
    settings?.watermark_copy_protection === true;

  const handleContextMenu = isCopyProtected
    ? (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      }
    : props.onContextMenu;

  const handleDragStart = isCopyProtected
    ? (e: React.DragEvent) => {
        e.preventDefault();
      }
    : props.onDragStart;

  return (
    <div
      {...props}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      className={`relative overflow-hidden ${isCopyProtected ? 'select-none' : ''} ${className}`}
    >
      {children}
      <WatermarkOverlay settings={settings} storeName={storeName} viewType={viewType} />
    </div>
  );
}
