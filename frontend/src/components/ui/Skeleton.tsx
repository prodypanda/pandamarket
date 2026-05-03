import React from 'react';

interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton loading component following PandaMarket design system.
 * Uses pulse shimmer gradient animation (1.5s loop).
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-lg ${className}`}
      style={{ animationDuration: '1.5s' }}
    />
  );
}

/**
 * Skeleton for a product card (matches ProductCard layout).
 */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-16" /> {/* Category */}
        <Skeleton className="h-4 w-full" /> {/* Title line 1 */}
        <Skeleton className="h-4 w-3/4" /> {/* Title line 2 */}
        <Skeleton className="h-5 w-24" /> {/* Price */}
        <Skeleton className="h-3 w-20" /> {/* Store name */}
      </div>
    </div>
  );
}

/**
 * Skeleton grid for product listings.
 */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for product detail page.
 */
export function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <div>
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex gap-2 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-16 h-16 rounded-lg" />
            ))}
          </div>
        </div>
        {/* Info */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" /> {/* Breadcrumb */}
          <Skeleton className="h-8 w-3/4" /> {/* Title */}
          <Skeleton className="h-4 w-32" /> {/* Rating */}
          <Skeleton className="h-10 w-40" /> {/* Price */}
          <Skeleton className="h-4 w-48" /> {/* Store */}
          <div className="flex gap-2 mt-6">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg mt-4" /> {/* Add to cart */}
          <Skeleton className="h-20 w-full rounded-lg mt-4" /> {/* Description */}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for order list items.
 */
export function OrderListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" /> {/* Order ID */}
              <Skeleton className="h-3 w-48" /> {/* Date + payment */}
            </div>
            <Skeleton className="h-6 w-24" /> {/* Price */}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for dashboard stat cards.
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-6">
          <Skeleton className="h-3 w-20 mb-3" /> {/* Label */}
          <Skeleton className="h-8 w-24 mb-2" /> {/* Value */}
          <Skeleton className="h-3 w-16" /> {/* Change */}
        </div>
      ))}
    </div>
  );
}
