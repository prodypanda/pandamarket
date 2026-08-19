'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getResizedImageUrl } from '@/lib/image-url';
import { ProductImagePlaceholder } from '../ui/ProductImagePlaceholder';
import { WatermarkOverlay, type WatermarkConfig } from '../watermark/MarketplaceWatermark';
import type { MarketplaceSettings } from '@/lib/marketplace-settings';

type ProductImage = string | { id?: string; url: string; alt_text?: string | null; position?: number | null; is_thumbnail?: boolean | null };

export interface ProductGalleryProps {
  title: string;
  thumbnail?: string | null;
  images?: ProductImage[];
  emptyLabel?: string;
  accentColor?: string;
  watermarkSettings?: WatermarkConfig | MarketplaceSettings | null;
  storeName?: string;
  layout?: 'sticky_carousel' | 'grid_mosaic' | 'stacked';
}

function getImageUrl(image?: ProductImage | null): string | null {
  if (!image) return null;
  return typeof image === 'string' ? image : image.url;
}

function getImageAlt(image: ProductImage, title: string, index: number): string {
  if (typeof image !== 'string' && image.alt_text) return image.alt_text;
  return `${title} ${index + 1}`;
}

function getImageKey(image: ProductImage, fallback: number): string {
  if (typeof image === 'string') return image;
  return image.id || image.url || String(fallback);
}

export function ProductGallery({
  title,
  thumbnail,
  images,
  emptyLabel = 'No Image',
  accentColor = '#16C784',
  watermarkSettings,
  storeName,
  layout = 'sticky_carousel',
}: ProductGalleryProps) {
  const galleryImages = useMemo(() => {
    const seen = new Set<string>();
    const next: ProductImage[] = [];

    const cleanThumbnail = thumbnail && thumbnail.trim().length > 0 && thumbnail !== 'null' && thumbnail !== 'undefined' ? thumbnail.trim() : null;

    if (cleanThumbnail) {
      seen.add(cleanThumbnail);
      next.push({ url: cleanThumbnail, alt_text: title, is_thumbnail: true });
    }

    for (const image of images || []) {
      const url = getImageUrl(image);
      if (!url || seen.has(url) || url === 'null' || url === 'undefined' || url.trim().length === 0) continue;
      seen.add(url.trim());
      next.push(image);
    }

    return next;
  }, [images, thumbnail, title]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const mainImgRef = useRef<HTMLImageElement>(null);

  const selectedImage = galleryImages[selectedIndex];
  const selectedUrl = getImageUrl(selectedImage);
  const isCurrentBroken = selectedUrl ? !!imageErrors[selectedUrl] : true;

  const isCopyProtected =
    Boolean(watermarkSettings?.watermark_copy_protection) &&
    (String(watermarkSettings?.watermark_copy_protection) === 'true' || watermarkSettings?.watermark_copy_protection === true);

  // Immediate check on mount / hydration in case the browser finished failing the image before React event listener attached
  useEffect(() => {
    if (mainImgRef.current && selectedUrl) {
      if (mainImgRef.current.complete && mainImgRef.current.naturalWidth === 0) {
        setImageErrors((prev) => ({ ...prev, [selectedUrl]: true }));
      }
    }
  }, [selectedUrl]);

  const handleOpenLightbox = (index: number) => {
    setSelectedIndex(index);
    setIsOpen(true);
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev + 1) % Math.max(1, galleryImages.length));
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev - 1 + galleryImages.length) % Math.max(1, galleryImages.length));
  };

  // Keyboard navigation inside lightbox
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, galleryImages.length]);

  return (
    <div className="space-y-4">
      {/* GRID MOSAIC LAYOUT */}
      {layout === 'grid_mosaic' && galleryImages.length > 1 ? (
        <div className="grid grid-cols-2 gap-3">
          {galleryImages.map((image, index) => {
            const url = getImageUrl(image);
            const isBroken = url ? !!imageErrors[url] : true;
            const isFirst = index === 0;

            return (
              <button
                key={getImageKey(image, index)}
                type="button"
                onClick={() => handleOpenLightbox(index)}
                className={`group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs transition hover:shadow-md dark:border-white/10 dark:bg-white/5 ${
                  isFirst ? 'col-span-2 aspect-[4/3] sm:aspect-[16/10]' : 'aspect-square'
                }`}
              >
                {url && !isBroken ? (
                  <>
                    <img
                      src={getResizedImageUrl(url, isFirst ? 'large' : 'medium')}
                      alt={getImageAlt(image, title, index)}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      draggable={!isCopyProtected}
                      onError={() => {
                        if (url) setImageErrors((prev) => ({ ...prev, [url]: true }));
                      }}
                    />
                    <WatermarkOverlay
                      settings={watermarkSettings}
                      storeName={storeName}
                      viewType="gallery"
                    />
                    <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white opacity-0 backdrop-blur-xs transition group-hover:opacity-100">
                      <Maximize2 className="h-3 w-3" />
                      Zoom
                    </span>
                  </>
                ) : (
                  <ProductImagePlaceholder altText={title} showText={isFirst} />
                )}
              </button>
            );
          })}
        </div>
      ) : layout === 'stacked' && galleryImages.length > 1 ? (
        /* VERTICALLY STACKED LAYOUT */
        <div className="space-y-4">
          {galleryImages.map((image, index) => {
            const url = getImageUrl(image);
            const isBroken = url ? !!imageErrors[url] : true;

            return (
              <button
                key={getImageKey(image, index)}
                type="button"
                onClick={() => handleOpenLightbox(index)}
                className="group relative aspect-square w-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/5"
              >
                {url && !isBroken ? (
                  <>
                    <img
                      src={getResizedImageUrl(url, 'large')}
                      alt={getImageAlt(image, title, index)}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      draggable={!isCopyProtected}
                      onError={() => {
                        if (url) setImageErrors((prev) => ({ ...prev, [url]: true }));
                      }}
                    />
                    <WatermarkOverlay
                      settings={watermarkSettings}
                      storeName={storeName}
                      viewType="gallery"
                    />
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white opacity-0 backdrop-blur-xs transition group-hover:opacity-100">
                      <Maximize2 className="h-3.5 w-3.5" />
                      Zoom ({index + 1}/{galleryImages.length})
                    </span>
                  </>
                ) : (
                  <ProductImagePlaceholder altText={title} showText />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* STICKY CAROUSEL (DEFAULT) */
        <div>
          <button
            type="button"
            onClick={() => selectedUrl && !isCurrentBroken && setIsOpen(true)}
            onContextMenu={isCopyProtected ? (e) => e.preventDefault() : undefined}
            className={`group relative aspect-square w-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 ${
              isCopyProtected ? 'select-none' : ''
            }`}
            style={{ borderColor: `${accentColor}22`, boxShadow: `0 24px 60px ${accentColor}12` }}
            disabled={!selectedUrl || isCurrentBroken}
            aria-label={selectedUrl && !isCurrentBroken ? `Open ${title} image viewer` : undefined}
          >
            {selectedUrl && !isCurrentBroken ? (
              <>
                <img
                  ref={mainImgRef}
                  src={getResizedImageUrl(selectedUrl, 'large')}
                  alt={selectedImage ? getImageAlt(selectedImage, title, selectedIndex) : title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  draggable={!isCopyProtected}
                  onDragStart={isCopyProtected ? (e) => e.preventDefault() : undefined}
                  onError={() => {
                    if (selectedUrl) {
                      setImageErrors((prev) => ({ ...prev, [selectedUrl]: true }));
                    }
                  }}
                />
                <WatermarkOverlay
                  settings={watermarkSettings}
                  storeName={storeName}
                  viewType="gallery"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-black text-gray-900 opacity-0 shadow-lg transition-all duration-300 group-hover:opacity-100 z-30 dark:bg-gray-900 dark:text-white">
                  <Maximize2 className="h-4 w-4" />
                  Zoom
                </span>
              </>
            ) : (
              <ProductImagePlaceholder altText={title} showText />
            )}
          </button>

          {galleryImages.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {galleryImages.map((image, index) => {
                const url = getImageUrl(image);
                const isSelected = index === selectedIndex;
                const isBroken = url ? !!imageErrors[url] : true;

                return (
                  <button
                    type="button"
                    key={getImageKey(image, index)}
                    onClick={() => setSelectedIndex(index)}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-white/5"
                    style={{ borderColor: isSelected ? accentColor : '#E5E7EB' }}
                    aria-label={`Show image ${index + 1}`}
                  >
                    {url && !isBroken ? (
                      <img
                        src={getResizedImageUrl(url, 'thumbnail')}
                        alt={getImageAlt(image, title, index)}
                        className="h-full w-full object-cover"
                        draggable={!isCopyProtected}
                        onError={() => {
                          if (url) {
                            setImageErrors((prev) => ({ ...prev, [url]: true }));
                          }
                        }}
                      />
                    ) : (
                      <ProductImagePlaceholder altText={title} iconClassName="h-4 w-4" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX WITH KEYBOARD + SWIPE CONTROLS */}
      {isOpen && selectedUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 z-50"
            aria-label="Close image viewer"
          >
            <X className="h-6 w-6" />
          </button>

          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/25 z-50"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/25 z-50"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className={`relative max-h-[88vh] max-w-[92vw] overflow-hidden rounded-2xl ${
              isCopyProtected ? 'select-none' : ''
            }`}
            onContextMenu={isCopyProtected ? (e) => e.preventDefault() : undefined}
          >
            <img
              src={getResizedImageUrl(selectedUrl, 'original')}
              alt={selectedImage ? getImageAlt(selectedImage, title, selectedIndex) : title}
              className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
              draggable={!isCopyProtected}
              onDragStart={isCopyProtected ? (e) => e.preventDefault() : undefined}
            />
            <WatermarkOverlay
              settings={watermarkSettings}
              storeName={storeName}
              viewType="lightbox"
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-xs">
            {selectedIndex + 1} / {galleryImages.length}
          </div>
        </div>
      )}
    </div>
  );
}
