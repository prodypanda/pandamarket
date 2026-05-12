'use client';

import Link from 'next/link';
import { normalizePublicAssetUrl } from '../lib/public-assets';

interface MarketplaceBrandProps {
  href: string;
  marketplaceName?: string | null;
  marketplaceLogoUrl?: string | null;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  fallbackMarkClassName?: string;
  showTextWithLogo?: boolean;
}

export function MarketplaceBrand({
  href,
  marketplaceName,
  marketplaceLogoUrl,
  className = '',
  imageClassName = 'h-10 max-w-[150px] object-contain',
  textClassName = 'text-lg font-bold',
  fallbackMarkClassName = 'text-xl font-black text-[#16C784]',
  showTextWithLogo = false,
}: MarketplaceBrandProps) {
  const name = marketplaceName?.trim() || 'PandaMarket';
  const logoUrl = normalizePublicAssetUrl(marketplaceLogoUrl);

  return (
    <Link href={href} className={`flex items-center gap-2 ${className}`.trim()}>
      {logoUrl ? (
        <img src={logoUrl} alt={name} className={imageClassName} />
      ) : (
        <span className={fallbackMarkClassName}>🐼</span>
      )}
      {(!logoUrl || showTextWithLogo) && <span className={textClassName}>{name}</span>}
    </Link>
  );
}
