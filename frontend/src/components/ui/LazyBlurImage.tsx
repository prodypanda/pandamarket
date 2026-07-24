'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);

    // Instant check for cached / preloaded images
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {/* Wind / Shimmer Loading Skeleton Overlay (z-0 & pointer-events-none to NEVER block text on top) */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center animate-wind-shimmer bg-slate-200/60 dark:bg-slate-800/60">
          <Wind className="h-4 w-4 animate-pulse text-slate-400/60" />
        </div>
      )}

      {/* Actual Image with Blur-Up Transition */}
      {!hasError ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          style={
            !isLoaded
              ? { opacity: 0, filter: 'blur(12px)', transform: 'scale(1.05)' }
              : undefined
          }
          className={`transition-all duration-500 ease-out ${
            isLoaded ? 'blur-0 scale-100' : ''
          } ${className}`}
          {...props}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800">
          {fallbackIcon || <Wind className="h-5 w-5 opacity-40" />}
        </div>
      )}
    </div>
  );
}
