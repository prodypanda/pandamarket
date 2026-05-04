'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

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
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:4000';

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('pd_access_token') : null;
    if (!token) return;

    fetch(`${backendUrl}/api/pd/wishlist/check/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setInWishlist(data.in_wishlist);
      })
      .catch(() => {});
  }, [backendUrl, productId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('pd_access_token') : null;
    if (!token) {
      // Redirect to login
      window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    setLoading(true);
    setAnimating(true);

    try {
      const res = await fetch(`${backendUrl}/api/pd/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: productId }),
      });

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
            ? 'border-red-200 bg-red-50 hover:bg-red-100'
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
              ? 'text-red-500 fill-red-500'
              : 'text-gray-500 hover:text-red-400'
          }
          ${animating ? 'scale-125' : 'scale-100'}
        `}
      />
      {showLabel && (
        <span
          className={`text-sm font-medium ${
            inWishlist ? 'text-red-600' : 'text-gray-600'
          }`}
        >
          {inWishlist ? 'Dans la wishlist' : 'Wishlist'}
        </span>
      )}
    </button>
  );
}
