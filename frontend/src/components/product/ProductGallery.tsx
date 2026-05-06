'use client';

import { Maximize2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type ProductImage = string | { id?: string; url: string; alt_text?: string | null; position?: number | null; is_thumbnail?: boolean | null };

interface ProductGalleryProps {
  title: string;
  thumbnail?: string | null;
  images?: ProductImage[];
  emptyLabel?: string;
  accentColor?: string;
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
}: ProductGalleryProps) {
  const galleryImages = useMemo(() => {
    const seen = new Set<string>();
    const next: ProductImage[] = [];

    if (thumbnail) {
      seen.add(thumbnail);
      next.push({ url: thumbnail, alt_text: title, is_thumbnail: true });
    }

    for (const image of images || []) {
      const url = getImageUrl(image);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      next.push(image);
    }

    return next;
  }, [images, thumbnail, title]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const selectedImage = galleryImages[selectedIndex];
  const selectedUrl = getImageUrl(selectedImage);

  return (
    <div>
      <button
        type="button"
        onClick={() => selectedUrl && setIsOpen(true)}
        className="group relative aspect-square w-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
        style={{ borderColor: `${accentColor}22`, boxShadow: `0 24px 60px ${accentColor}12` }}
        disabled={!selectedUrl}
        aria-label={selectedUrl ? `Open ${title} image viewer` : undefined}
      >
        {selectedUrl ? (
          <>
            <img
              src={selectedUrl}
              alt={selectedImage ? getImageAlt(selectedImage, title, selectedIndex) : title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-black text-gray-900 opacity-0 shadow-lg transition-all duration-300 group-hover:opacity-100">
              <Maximize2 className="h-4 w-4" />
              Zoom
            </span>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg text-gray-400">
            {emptyLabel}
          </div>
        )}
      </button>

      {galleryImages.length > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {galleryImages.map((image, index) => {
            const url = getImageUrl(image);
            const isSelected = index === selectedIndex;

            return (
              <button
                type="button"
                key={getImageKey(image, index)}
                onClick={() => setSelectedIndex(index)}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: isSelected ? accentColor : '#E5E7EB' }}
                aria-label={`Show image ${index + 1}`}
              >
                {url && (
                  <img
                    src={url}
                    alt={getImageAlt(image, title, index)}
                    className="h-full w-full object-cover"
                  />
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
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
            aria-label="Close image viewer"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={selectedUrl}
            alt={selectedImage ? getImageAlt(selectedImage, title, selectedIndex) : title}
            className="max-h-[88vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
