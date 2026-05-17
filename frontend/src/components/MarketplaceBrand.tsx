'use client';

import Link from 'next/link';
import { selectLogoForSurface, type LogoSurface } from '../lib/public-assets';

interface MarketplaceBrandProps {
  href: string;
  marketplaceName?: string | null;
  marketplaceLogoUrl?: string | null;
  marketplaceLogoLightUrl?: string | null;
  marketplaceLogoDarkUrl?: string | null;
  logoSurface?: LogoSurface;
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
  marketplaceLogoLightUrl,
  marketplaceLogoDarkUrl,
  logoSurface = 'light',
  className = '',
  imageClassName = 'h-10 max-w-[150px] object-contain',
  textClassName = 'text-lg font-bold',
  fallbackMarkClassName = 'text-xl font-black text-[#16C784]',
  showTextWithLogo = false,
}: MarketplaceBrandProps) {
  const name = marketplaceName?.trim() || 'PandaMarket';
  const logoUrl = selectLogoForSurface({
    marketplace_logo_url: marketplaceLogoUrl,
    marketplace_logo_light_url: marketplaceLogoLightUrl,
    marketplace_logo_dark_url: marketplaceLogoDarkUrl,
  }, logoSurface);

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
