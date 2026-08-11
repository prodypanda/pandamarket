'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, CreditCard, ShieldCheck, ChevronDown } from 'lucide-react';
import type { ThemeConfig } from '../../lib/themes';
import {
  type StoreBranding,
  type StoreNavigationData,
  type StoreFooterBlock,
  useThemeCustomization,
  getStoreThemeLogoSurface,
  getLogoSurfaceForColor,
  getStoreBrandLogo,
} from '../themes/shared';
import { PoweredByMarketplace } from '../themes/PoweredByMarketplace';
import { StorefrontSocialLinks } from '../themes/StorefrontSocialLinks';

export interface StorefrontFooterProps {
  storeName: string;
  branding?: StoreBranding;
  theme: ThemeConfig;
  navigation?: StoreNavigationData;
  categories?: string[];
}

export function StorefrontFooter({
  storeName,
  branding,
  theme,
  navigation,
}: StorefrontFooterProps) {
  const tc = useThemeCustomization(theme, branding);
  const footerBlocks: StoreFooterBlock[] = navigation?.footer?.blocks || [];

  const footerTextColor =
    getLogoSurfaceForColor(tc.colors.footerBg) === 'dark' ? '#FFFFFF' : tc.colors.text;
  const mutedFooterText = `${footerTextColor}aa`;

  const logoUrl = getStoreBrandLogo(
    branding,
    getLogoSurfaceForColor(tc.colors.footerBg, getStoreThemeLogoSurface(theme.id)),
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const storePathBase = branding?.store_path_base || '';

  return (
    <footer
      className="border-t transition-colors mt-auto"
      style={{
        backgroundColor: tc.colors.footerBg,
        color: footerTextColor,
        borderColor: `${footerTextColor}15`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {footerBlocks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {footerBlocks.map((block) => {
              const isOpen = openSections[block.id] ?? false;

              return (
                <div key={block.id} className="space-y-3">
                  {block.title && (
                    <div
                      className="flex items-center justify-between cursor-pointer md:cursor-default"
                      onClick={() => toggleSection(block.id)}
                    >
                      <h4 className="text-sm font-extrabold uppercase tracking-wider">
                        {block.title}
                      </h4>
                      <ChevronDown
                        className={`w-4 h-4 md:hidden transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  )}

                  <div className={`${block.title ? (isOpen ? 'block' : 'hidden md:block') : 'block'}`}>
                    {renderBlockContent(block, storeName, branding, storePathBase, mutedFooterText)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback Storefront Footer */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Store Brand & About */}
            <div className="space-y-3 md:col-span-1">
              <Link href={storePathBase || '/'}>
                {logoUrl ? (
                  <Image src={logoUrl ? getResizedImageUrl(logoUrl, 'small') : ''} alt={storeName} width={160} height={32} unoptimized className="h-8 object-contain mb-2" />
                ) : (
                  <h3 className={`text-lg font-bold ${theme.typography.headingStyle}`}>
                    {storeName}
                  </h3>
                )}
              </Link>
              <p className="text-xs leading-relaxed" style={{ color: mutedFooterText }}>
                Votre boutique en ligne de confiance. Découvrez nos produits et bénéficiez de la livraison rapide.
              </p>
              <StorefrontSocialLinks branding={branding} />
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider">Navigation</h4>
              <ul className="space-y-1.5 text-xs" style={{ color: mutedFooterText }}>
                <li>
                  <Link href={storePathBase || '/'} className="hover:underline">
                    Accueil
                  </Link>
                </li>
                <li>
                  <Link href={`${storePathBase}/products`} className="hover:underline">
                    Tous les produits
                  </Link>
                </li>
                <li>
                  <Link href={`${storePathBase}/account`} className="hover:underline">
                    Mon Compte Client
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Contact Info */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider">Contact & Support</h4>
              <ul className="space-y-1.5 text-xs" style={{ color: mutedFooterText }}>
                {branding?.contact_email && (
                  <li className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{branding.contact_email}</span>
                  </li>
                )}
                {branding?.contact_phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{branding.contact_phone}</span>
                  </li>
                )}
                {(branding?.address || branding?.city) && (
                  <li className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      {[branding.address, branding.city, branding.country].filter(Boolean).join(', ')}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Column 4: Payment Badges */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider">Paiements Sécurisés</h4>
              <div className="flex flex-wrap gap-2 text-xs" style={{ color: mutedFooterText }}>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold">
                  <CreditCard className="w-3 h-3 text-emerald-500" /> Flouci / Konnect
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold">
                  <ShieldCheck className="w-3 h-3 text-blue-500" /> Mandat Minute
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold">
                  Espèces à la livraison
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Map Embed if present */}
        {branding?.map_embed_url && (
          <div className="mt-8 rounded-2xl overflow-hidden border" style={{ borderColor: `${footerTextColor}15` }}>
            <iframe
              src={branding.map_embed_url ? getResizedImageUrl(branding.map_embed_url, 'medium') : ''}
              width="100%"
              height="180"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title="Emplacement de la boutique"
            />
          </div>
        )}

        {/* Bottom Bar: Copyright & Marketplace Badge */}
        <div
          className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
          style={{ borderColor: `${footerTextColor}15`, color: mutedFooterText }}
        >
          <p>© {new Date().getFullYear()} {storeName}. Tous droits réservés.</p>

          <PoweredByMarketplace branding={branding} />
        </div>
      </div>
    </footer>
  );
}

function renderBlockContent(
  block: StoreFooterBlock,
  storeName: string,
  branding?: StoreBranding,
  storePathBase = '',
  mutedColor = '#666',
) {
  const content = block.content || {};

  switch (block.type) {
    case 'text':
      return (
        <p className="text-xs leading-relaxed" style={{ color: mutedColor }}>
          {String(content.text || content.body || '')}
        </p>
      );

    case 'menu':
      const links = Array.isArray(content.links) ? content.links : [];
      return (
        <ul className="space-y-1.5 text-xs" style={{ color: mutedColor }}>
          {links.map((link: { url?: string; label?: string }, idx: number) => (
            <li key={idx}>
              <Link href={link.url || `${storePathBase}/`} className="hover:underline">
                {link.label || 'Lien'}
              </Link>
            </li>
          ))}
        </ul>
      );

    case 'contact':
      return (
        <ul className="space-y-1.5 text-xs" style={{ color: mutedColor }}>
          {(content.email || branding?.contact_email) && (
            <li className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{String(content.email || branding?.contact_email)}</span>
            </li>
          )}
          {(content.phone || branding?.contact_phone) && (
            <li className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{String(content.phone || branding?.contact_phone)}</span>
            </li>
          )}
        </ul>
      );

    case 'social':
      return <StorefrontSocialLinks branding={branding} />;

    case 'newsletter': {
      const title = String(content.title || 'Inscrivez-vous à la newsletter');
      const placeholder = String(content.placeholder || 'Votre email');
      const buttonLabel = String(content.button_label || 'S\'inscrire');
      return (
        <div className="space-y-2">
          <p className="text-xs font-bold" style={{ color: mutedColor }}>
            {title}
          </p>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder={placeholder}
              className="flex-1 rounded-md border px-3 py-1.5 text-xs"
              style={{ borderColor: `${mutedColor}30`, backgroundColor: 'transparent', color: mutedColor }}
            />
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-xs font-bold text-white"
              style={{ backgroundColor: '#B91C1C' }}
            >
              {buttonLabel}
            </button>
          </form>
        </div>
      );
    }

    case 'legal': {
      const links: { url?: string; label?: string }[] = [
        content.cgv_url ? { url: String(content.cgv_url), label: 'CGV' } : null,
        content.privacy_url ? { url: String(content.privacy_url), label: 'Confidentialité' } : null,
        content.refund_url ? { url: String(content.refund_url), label: 'Remboursements' } : null,
      ].filter(Boolean) as { url?: string; label?: string }[];
      if (links.length === 0) return null;
      return (
        <ul className="space-y-1.5 text-xs" style={{ color: mutedColor }}>
          {links.map((link, idx) => (
            <li key={idx}>
              <Link href={link.url || `${storePathBase}/`} className="hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      );
    }

    case 'payment_badges':
      return (
        <div className="flex flex-wrap gap-2 text-xs" style={{ color: mutedColor }}>
          <span className="px-2 py-1 rounded border text-[11px]">Paiement en ligne</span>
          <span className="px-2 py-1 rounded border text-[11px]">Mandat Minute</span>
          <span className="px-2 py-1 rounded border text-[11px]">À la livraison</span>
        </div>
      );

    case 'map':
      return branding?.map_embed_url ? (
        <iframe
          src={branding.map_embed_url ? getResizedImageUrl(branding.map_embed_url, 'medium') : ''}
          width="100%"
          height="120"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          title="Carte de la boutique"
        />
      ) : null;

    default:
      return null;
  }
}
