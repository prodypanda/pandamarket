'use client';

import React from 'react';
import { ShoppingBag, PackageOpen } from 'lucide-react';
import { type ResolvedColors } from '../../lib/themes';
import { type StoreBranding } from './shared';

interface EmptyStoreStateProps {
  storeName: string;
  colors: ResolvedColors;
  branding?: StoreBranding;
}

/**
 * Shared empty-state component rendered by all storefront themes when a store
 * has zero published products. Replaces the old demo-product fallback pattern
 * which showed fake clickable products leading to 404s.
 */
export function EmptyStoreState({ storeName, colors, branding }: EmptyStoreStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center" style={{ color: `${colors.text}80` }}>
      <div
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-full"
        style={{ backgroundColor: `${colors.secondary}` }}
      >
        <PackageOpen className="h-10 w-10" style={{ color: `${colors.text}50` }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: colors.text }}>
        {storeName}
      </h2>
      <p className="text-sm mb-6 max-w-md" style={{ color: `${colors.text}60` }}>
        Notre boutique est en cours de préparation. Les produits seront bientôt disponibles&nbsp;!
      </p>
      <div
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium"
        style={{ backgroundColor: colors.secondary, color: `${colors.text}80` }}
      >
        <ShoppingBag className="h-3.5 w-3.5" />
        <span>Boutique en préparation</span>
      </div>
      {branding?.contact_email && (
        <a
          href={`mailto:${branding.contact_email}`}
          className="mt-4 text-xs font-medium underline"
          style={{ color: colors.accent }}
        >
          Nous contacter
        </a>
      )}
    </div>
  );
}
