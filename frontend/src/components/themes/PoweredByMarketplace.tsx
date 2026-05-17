import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { selectLogoForSurface, type LogoSurface } from '../../lib/public-assets';
import type { StoreBranding } from './shared';
import { StorefrontSocialLinks } from './StorefrontSocialLinks';

interface PoweredByMarketplaceProps {
  branding?: StoreBranding;
  className?: string;
  linkClassName?: string;
  linkStyle?: CSSProperties;
  imageClassName?: string;
  logoSurface?: LogoSurface;
}

export function PoweredByMarketplace({
  branding,
  className,
  linkClassName,
  linkStyle,
  imageClassName = 'inline h-5 max-w-[120px] object-contain align-middle',
  logoSurface = 'dark',
}: PoweredByMarketplaceProps) {
  const name = branding?.marketplace_name?.trim() || 'PandaMarket';
  const logoUrl = selectLogoForSurface({
    marketplace_logo_url: branding?.marketplace_logo_url,
    marketplace_logo_light_url: branding?.marketplace_logo_light_url,
    marketplace_logo_dark_url: branding?.marketplace_logo_dark_url,
  }, logoSurface);

  return (
    <span className={className}>
      Propulsé par{' '}
      <Link href="/hub" className={linkClassName} style={linkStyle}>
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={name}
            width={120}
            height={20}
            className={imageClassName}
            unoptimized
          />
        ) : name}
      </Link>
      <StorefrontSocialLinks
        branding={branding}
        className="ml-2 inline-flex flex-wrap items-center justify-center gap-2"
        linkClassName={linkClassName || 'font-semibold hover:underline'}
      />
    </span>
  );
}
