'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, Eye, Star, Check } from 'lucide-react';
import {
  type StoreProduct,
  formatStorePrice,
  getStoreProductImage,
  getStorefrontProductPath,
} from '../themes/shared';
import { useCart } from '../../contexts/CartContext';

export interface ProductCardProps {
  product: StoreProduct & {
    compare_at_price?: number | string | null;
    rating?: number;
    review_count?: number;
    inventory_quantity?: number;
    is_new?: boolean;
    badge_text?: string;
    variants?: Array<{
      id: string;
      title: string;
      price?: number;
      options?: Record<string, string>;
      in_stock?: boolean;
    }>;
  };
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  accentColor?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  hoverEffect?: 'zoom' | 'second-image' | 'none';
  buttonStyle?: 'solid' | 'outline' | 'ghost' | 'icon';
  storePathBase?: string;
  onQuickView?: (product: StoreProduct) => void;
}

export function ProductCard({
  product,
  primaryColor = '#16C784',
  secondaryColor = '#f8fafc',
  textColor = '#0f172a',
  aspectRatio = 'square',
  hoverEffect = 'zoom',
  buttonStyle = 'solid',
  storePathBase,
  onQuickView,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants?.[0]?.id,
  );

  const mainImage = getStoreProductImage(product);
  const secondImage =
    typeof product.images?.[1] === 'string'
      ? product.images[1]
      : typeof product.images?.[1] === 'object'
      ? product.images[1]?.url
      : undefined;

  const currentPrice = Number(product.price) || 0;
  const comparePrice = Number(product.compare_at_price) || 0;
  const hasDiscount = comparePrice > currentPrice && currentPrice > 0;
  const discountPercent = hasDiscount ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100) : 0;
  const isSoldOut = typeof product.inventory_quantity === 'number' && product.inventory_quantity <= 0;

  const permalink = getStorefrontProductPath(product, storePathBase);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut) return;

    addToCart({
      product_id: product.id,
      title: product.title,
      slug: product.slug || undefined,
      category: product.category || undefined,
      marketplace_category_slug: product.marketplace_category_slug || undefined,
      price: currentPrice,
      quantity: 1,
      store_id: product.store_id || '',
      store_name: product.store_name || '',
      image_url: mainImage || null,
      variant_id: selectedVariantId,
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted((prev) => !prev);
  };

  const aspectClasses =
    aspectRatio === 'portrait'
      ? 'aspect-[3/4]'
      : aspectRatio === 'landscape'
      ? 'aspect-[4/3]'
      : 'aspect-square';

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      aria-label={product.title}
    >
      {/* Image Container & Hover Effects */}
      <div className={`relative w-full ${aspectClasses} overflow-hidden bg-slate-100`}>
        <Link href={permalink} tabIndex={-1} className="block h-full w-full">
          {mainImage ? (
            <div
              className={`h-full w-full bg-cover bg-center transition-transform duration-500 ${
                hoverEffect === 'zoom' ? 'group-hover:scale-108' : ''
              }`}
              style={{ backgroundImage: `url(${hoverEffect === 'second-image' && secondImage ? secondImage : mainImage})` }}
              role="img"
              aria-label={product.title}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
              Aucune image
            </div>
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5 z-10 pointer-events-none">
          {isSoldOut ? (
            <span className="rounded-lg bg-slate-900/90 px-2.5 py-1 text-[10px] font-extrabold uppercase text-white shadow-xs">
              Épuisé
            </span>
          ) : (
            <>
              {hasDiscount && (
                <span className="rounded-lg bg-[#B91C1C] px-2.5 py-1 text-[10px] font-extrabold uppercase text-white shadow-xs">
                  -{discountPercent}%
                </span>
              )}
              {product.is_new && (
                <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold uppercase text-white shadow-xs">
                  Nouveau
                </span>
              )}
              {product.badge_text && (
                <span className="rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-extrabold uppercase text-white shadow-xs">
                  {product.badge_text}
                </span>
              )}
            </>
          )}
        </div>

        {/* Floating Action Overlay (Wishlist & Quick View) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-90 transition-all duration-200 group-hover:opacity-100 z-10">
          <button
            type="button"
            onClick={handleWishlistToggle}
            aria-label={isWishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-xs transition-transform hover:scale-110 shadow-md ${
              isWishlisted ? 'text-red-500' : 'text-slate-600 hover:text-red-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-red-500' : ''}`} />
          </button>

          {onQuickView && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              aria-label="Aperçu rapide"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-xs text-slate-600 transition-transform hover:scale-110 hover:text-slate-900 shadow-md"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-4" style={{ backgroundColor: secondaryColor }}>
        <div>
          {/* Category */}
          {product.category && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {product.category}
            </span>
          )}

          {/* Title */}
          <h3 className="text-sm font-bold line-clamp-2 mb-2 transition-colors hover:opacity-80">
            <Link href={permalink} style={{ color: textColor }}>
              {product.title}
            </Link>
          </h3>

          {/* Rating */}
          {typeof product.rating === 'number' && product.rating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3.5 w-3.5 ${
                      star <= Math.round(product.rating || 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              {product.review_count !== undefined && (
                <span className="text-[11px] font-medium text-slate-400">({product.review_count})</span>
              )}
            </div>
          )}

          {/* Variant Swatches (Color / Option Dots) */}
          {product.variants && product.variants.length > 1 && (
            <div className="flex items-center gap-1.5 my-2">
              {product.variants.slice(0, 4).map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedVariantId(variant.id);
                  }}
                  title={variant.title}
                  className={`h-3.5 w-3.5 rounded-full border transition-transform ${
                    selectedVariantId === variant.id ? 'scale-125 border-slate-900 shadow-xs' : 'border-slate-300 hover:scale-110'
                  }`}
                  style={{ backgroundColor: primaryColor }}
                />
              ))}
              {product.variants.length > 4 && (
                <span className="text-[10px] font-bold text-slate-400">
                  +{product.variants.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200/50 mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold" style={{ color: primaryColor }}>
              {formatStorePrice(product)}
            </span>
            {hasDiscount && (
              <span className="text-xs font-semibold text-slate-400 line-through">
                {comparePrice.toFixed(3)} DT
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isSoldOut}
            aria-label={addedToCart ? 'Ajouté au panier' : 'Ajouter au panier'}
            className={`flex items-center justify-center rounded-xl p-2.5 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed ${
              buttonStyle === 'icon'
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : addedToCart
                ? 'bg-emerald-600 text-white'
                : 'bg-[#B91C1C] text-white hover:bg-[#991B1B]'
            }`}
          >
            {addedToCart ? (
              <Check className="h-4 w-4" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
