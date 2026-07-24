'use client';

import React, { useState } from 'react';
import { Wind } from 'lucide-react';

export interface LazyBlurImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
}

export function LazyBlurImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  fallbackIcon,
  ...props
}: LazyBlurImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {/* Wind / Shimmer Loading Skeleton Overlay */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center animate-wind-shimmer bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100">
          <Wind className="h-4 w-4 animate-pulse text-slate-400/60" />
        </div>
      )}

      {/* Actual Image with Blur-Up Transition */}
      {!hasError ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`transition-all duration-500 ease-out ${
            isLoaded
              ? 'blur-0 scale-100 opacity-100'
              : 'blur-md scale-105 opacity-0'
          } ${className}`}
          {...props}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
          {fallbackIcon || <Wind className="h-5 w-5" />}
        </div>
      )}
    </div>
  );
}
