import { Construction, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { StorefrontSocialLinks } from '../themes/StorefrontSocialLinks';
import { MarketplaceBrand } from '../MarketplaceBrand';
import type { StoreSocialLinks } from '../themes/shared';

interface StorefrontMaintenanceProps {
  storeName: string;
  logoUrl?: string;
  primaryColor?: string;
  maintenanceMessage?: string;
  social?: StoreSocialLinks | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  marketplaceName?: string;
  marketplaceHref?: string;
  marketplaceLogoUrl?: string;
  marketplaceLogoLightUrl?: string;
  marketplaceLogoDarkUrl?: string;
}

export function StorefrontMaintenancePage({
  storeName,
  logoUrl,
  primaryColor = '#16C784',
  maintenanceMessage,
  social,
  contactEmail,
  contactPhone,
  marketplaceName,
  marketplaceHref = '/hub',
  marketplaceLogoUrl,
  marketplaceLogoLightUrl,
  marketplaceLogoDarkUrl,
}: StorefrontMaintenanceProps) {
  const message =
    maintenanceMessage ||
    `${storeName} est actuellement en maintenance. Revenez bientôt pour découvrir nos produits.`;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}03 50%, transparent 100%)`,
      }}
    >
      <div className="w-full max-w-md text-center">
        {/* Store logo or name */}
        {logoUrl ? (
          <div className="mx-auto mb-6 h-16 w-40">
            <div
              className="h-full w-full bg-contain bg-center bg-no-repeat"
              role="img"
              aria-label={storeName}
              style={{ backgroundImage: `url(${logoUrl})` }}
            />
          </div>
        ) : (
          <h2
            className="mb-6 text-2xl font-bold"
            style={{ color: primaryColor }}
          >
            {storeName}
          </h2>
        )}

        {/* Maintenance icon */}
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `${primaryColor}10`,
            border: `1px solid ${primaryColor}20`,
          }}
        >
          <Construction className="h-10 w-10" style={{ color: primaryColor }} />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border bg-white p-8 shadow-sm"
          style={{ borderColor: `${primaryColor}15` }}
        >
          <h1 className="text-xl font-bold text-gray-900">
            Boutique en maintenance
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            {message}
          </p>

          {/* Social links */}
          {social && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <StorefrontSocialLinks
                branding={{
                  social,
                  contact_email: contactEmail,
                  contact_phone: contactPhone,
                }}
                showContact
                className="flex flex-wrap items-center justify-center gap-3"
                linkClassName="text-xs font-medium text-gray-500 hover:underline"
              />
            </div>
          )}
        </div>

        {/* Back to marketplace */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href={marketplaceHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au marketplace
          </Link>

          <span className="inline-flex items-center justify-center gap-1 text-xs text-gray-400">
            Propulsé par{' '}
            <MarketplaceBrand
              href={marketplaceHref}
              marketplaceName={marketplaceName}
              marketplaceLogoUrl={marketplaceLogoUrl}
              marketplaceLogoLightUrl={marketplaceLogoLightUrl}
              marketplaceLogoDarkUrl={marketplaceLogoDarkUrl}
              logoSurface="light"
              className="inline-flex align-middle"
              imageClassName="h-4 max-w-[100px] object-contain"
              textClassName="font-semibold hover:underline"
              fallbackMarkClassName="hidden"
            />
          </span>
        </div>
      </div>
    </div>
  );
}
