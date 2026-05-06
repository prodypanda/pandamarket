'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useMarketplaceTheme } from '../../hooks/useMarketplaceTheme';

interface WishlistButtonProps {
  productId: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function WishlistButton({
  productId,
  size = 'md',
  showLabel = false,
  className = '',
}: WishlistButtonProps) {
  const { isAliExpress } = useMarketplaceTheme();
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    fetch(`/api/pd/wishlist/check/${productId}`, {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setInWishlist(data.in_wishlist);
      })
      .catch(() => {});
  }, [productId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    setAnimating(true);

    try {
      const res = await fetchWithCsrf('/api/pd/wishlist/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ product_id: productId }),
      });

      if (res.status === 401) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setInWishlist(data.added);
      }
    } catch {
      // Silently fail
    }

    setLoading(false);
    setTimeout(() => setAnimating(false), 300);
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2.5',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={inWishlist ? 'Retirer de la wishlist' : 'Ajouter à la wishlist'}
      className={`
        ${sizeClasses[size]}
        ${showLabel ? 'flex items-center gap-2 px-4' : ''}
        border rounded-xl transition-all duration-200
        ${
          inWishlist
            ? isAliExpress
              ? 'border-orange-200 bg-orange-50 hover:bg-orange-100 shadow-sm shadow-orange-900/5'
              : 'border-red-200 bg-red-50 hover:bg-red-100'
            : isAliExpress
              ? 'border-orange-100 bg-white hover:bg-orange-50 hover:border-orange-200'
              : 'border-gray-300 bg-white hover:bg-gray-50'
        }
        ${animating ? 'scale-110' : 'scale-100'}
        ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <Heart
        className={`
          ${iconSizes[size]}
          transition-all duration-200
          ${
            inWishlist
              ? isAliExpress
                ? 'text-[#ff4747] fill-[#ff4747]'
                : 'text-red-500 fill-red-500'
              : isAliExpress
                ? 'text-gray-500 hover:text-[#ff4747]'
                : 'text-gray-500 hover:text-red-400'
          }
          ${animating ? 'scale-125' : 'scale-100'}
        `}
      />
      {showLabel && (
        <span
          className={`text-sm font-medium ${
            inWishlist ? (isAliExpress ? 'text-[#ff4747]' : 'text-red-600') : 'text-gray-600'
          }`}
        >
          {inWishlist ? 'Dans la wishlist' : 'Wishlist'}
        </span>
      )}
    </button>
  );
}
