'use client';

import { useState, useMemo, useEffect } from 'react';
import { AddToCartButton } from '../store/AddToCartButton';
import { Heart, Check, AlertCircle } from 'lucide-react';

export interface VariantOption {
  id: string;
  title: string;
  price: number;
  sku?: string | null;
  in_stock: boolean;
  inventory_quantity: number;
  options?: Record<string, string>;
}

interface ProductVariantSelectorProps {
  product: {
    id: string;
    title: string;
    slug?: string | null;
    category?: string | null;
    marketplace_category_slug?: string | null;
    price: number;
    seller_type?: string | null;
    wholesale_pricing?: any;
    store_id: string;
    store_name: string;
    store_subdomain?: string | null;
    product_type?: string | null;
    image_url: string | null;
    inventory_quantity?: number;
    variants?: VariantOption[];
  };
  primaryColor: string;
  onVariantChange?: (variant: VariantOption | null) => void;
}

export function ProductVariantSelector({
  product,
  primaryColor,
  onVariantChange,
}: ProductVariantSelectorProps) {
  const variants = product.variants || [];
  const hasVariants = variants.length > 0;

  // Extract unique option keys (e.g., ["Taille", "Couleur"])
  const optionKeys = useMemo(() => {
    const keysSet = new Set<string>();
    variants.forEach((v) => {
      if (v.options) {
        Object.keys(v.options).forEach((k) => keysSet.add(k));
      }
    });
    return Array.from(keysSet);
  }, [variants]);

  // Selected options state map (e.g. { "Taille": "M", "Couleur": "Rouge" })
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [wishlistActive, setWishlistActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Derive active matching variant
  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;
    if (Object.keys(selectedOptions).length < optionKeys.length) return null;

    return (
      variants.find((v) => {
        if (!v.options) return false;
        return optionKeys.every((k) => v.options?.[k] === selectedOptions[k]);
      }) || null
    );
  }, [hasVariants, optionKeys, selectedOptions, variants]);

  useEffect(() => {
    if (onVariantChange) {
      onVariantChange(selectedVariant);
    }
  }, [selectedVariant, onVariantChange]);

  const activePrice = selectedVariant ? selectedVariant.price : product.price;
  const isSelectedVariantInStock = selectedVariant ? selectedVariant.in_stock : true;

  const handleOptionSelect = (key: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
  };

  // Helper to check if an option choice is valid / available in any variant
  const isOptionAvailable = (key: string, value: string) => {
    const candidateOptions = { ...selectedOptions, [key]: value };
    return variants.some((v) => {
      if (!v.options) return false;
      return Object.entries(candidateOptions).every(
        ([k, val]) => !v.options?.[k] || v.options[k] === val,
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Price Header */}
      <div className="flex items-baseline gap-3">
        <p className="text-3xl font-extrabold" style={{ color: primaryColor }}>
          {activePrice.toFixed(3)} TND
        </p>
        {selectedVariant && selectedVariant.price !== product.price && (
          <span className="text-xs font-bold text-slate-400 line-through">
            {product.price.toFixed(3)} TND
          </span>
        )}
      </div>

      {/* Option Groups */}
      {hasVariants && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          {optionKeys.map((key) => {
            const uniqueValues = Array.from(
              new Set(variants.map((v) => v.options?.[key]).filter(Boolean) as string[]),
            );

            return (
              <div key={key} className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  {key}: <span className="text-slate-900 font-bold">{selectedOptions[key] || 'Sélectionner...'}</span>
                </label>

                <div className="flex flex-wrap gap-2">
                  {uniqueValues.map((val) => {
                    const isSelected = selectedOptions[key] === val;
                    const isAvailable = isOptionAvailable(key, val);

                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleOptionSelect(key, val)}
                        disabled={!isAvailable}
                        className={`rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-xs scale-105'
                            : isAvailable
                            ? 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                            : 'border-slate-200 bg-slate-100 text-slate-300 line-through cursor-not-allowed'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Validation warning if mandatory variant not selected */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs font-semibold text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Add to Cart & Wishlist Actions */}
      <div className="flex items-center gap-3">
        <AddToCartButton
          product={{
            ...product,
            price: activePrice,
            variant_id: selectedVariant?.id,
            variant: selectedVariant?.title,
            inventory_quantity: selectedVariant ? selectedVariant.inventory_quantity : product.inventory_quantity,
          }}
          primaryColor={primaryColor}
          disabled={hasVariants && !selectedVariant}
          buttonText={hasVariants && !selectedVariant ? 'Sélectionnez une option' : undefined}
          onDisabledClick={() => {
            if (hasVariants && !selectedVariant) {
              setValidationError('Veuillez sélectionner toutes les options requises');
            }
          }}
        />

        <button
          type="button"
          onClick={() => setWishlistActive((prev) => !prev)}
          aria-label={wishlistActive ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className={`flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 transition-colors ${
            wishlistActive ? 'bg-red-50 text-red-500 border-red-200' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Heart className={`h-5 w-5 ${wishlistActive ? 'fill-red-500' : ''}`} />
        </button>
      </div>
    </div>
  );
}
