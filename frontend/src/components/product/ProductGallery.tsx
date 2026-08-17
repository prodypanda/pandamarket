'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Maximize2, X } from 'lucide-react';
import { getResizedImageUrl } from '@/lib/image-url';
import { ProductImagePlaceholder } from '../ui/ProductImagePlaceholder';
import { WatermarkOverlay, type WatermarkConfig } from '../watermark/MarketplaceWatermark';
import type { MarketplaceSettings } from '@/lib/marketplace-settings';

type ProductImage = string | { id?: string; url: string; alt_text?: string | null; position?: number | null; is_thumbnail?: boolean | null };

interface ProductGalleryProps {
  title: string;
  thumbnail?: string | null;
  images?: ProductImage[];
  emptyLabel?: string;
  accentColor?: string;
  watermarkSettings?: WatermarkConfig | MarketplaceSettings | null;
  storeName?: string;
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

  return (
    <div>
      <button
        type="button"
        onClick={() => selectedUrl && !isCurrentBroken && setIsOpen(true)}
        onContextMenu={isCopyProtected ? (e) => e.preventDefault() : undefined}
        className={`group relative aspect-square w-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm ${
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
            <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-black text-gray-900 opacity-0 shadow-lg transition-all duration-300 group-hover:opacity-100 z-30">
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
                className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
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

      {isOpen && selectedUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 z-50"
            aria-label="Close image viewer"
          >
            <X className="h-6 w-6" />
          </button>
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
        </div>
      )}
    </div>
  );
}

