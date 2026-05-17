'use client';

import Link from 'next/link';
import { Store, ShieldCheck, CreditCard, Headphones } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import { useMarketplaceTheme } from '../../hooks/useMarketplaceTheme';
import type { MarketplaceThemeSettings } from '../../lib/marketplace-theme';
import { StorefrontSocialLinks } from '../themes/StorefrontSocialLinks';
import { MarketplaceBrand } from '../MarketplaceBrand';

function safeFooterHref(value?: string) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return '/hub/search';
  if (/^\/(?!\/)/.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '/hub/search';
}

export function HubFooter(props: MarketplaceThemeSettings) {
  const { t } = useLocale();
  const { settings, classes, isAliExpress, isAliExpress2 } = useMarketplaceTheme(props);
  const currentYear = new Date().getFullYear();
  const marketplaceName = settings.marketplace_name || 'PandaMarket';
  const tagline = settings.marketplace_tagline || t('common.tagline');
  const linkClass = `text-sm text-gray-400 transition-colors ${classes.primaryTextHover}`;
  const iconClass = isAliExpress ? 'text-[#ff8a00]' : 'text-[#16C784]';
  const helpUrl = safeFooterHref(settings.marketplace_help_url);
  const termsUrl = safeFooterHref(settings.marketplace_terms_url);
  const privacyUrl = safeFooterHref(settings.marketplace_privacy_url);
  const refundUrl = settings.marketplace_refund_url ? safeFooterHref(settings.marketplace_refund_url) : '';
  const cookiePolicyUrl = settings.marketplace_cookie_policy_url ? safeFooterHref(settings.marketplace_cookie_policy_url) : '';
  const contactUrl = safeFooterHref(settings.marketplace_contact_url);
  const socialLinkClass = `text-xs font-bold transition-colors ${isAliExpress2 ? 'text-white/30 hover:text-[#ff6b6b]' : 'text-gray-400'} ${classes.primaryTextHover}`;
  const marketplaceBranding = {
    contact_email: settings.marketplace_support_email,
    contact_phone: settings.marketplace_support_phone,
    address: settings.marketplace_address,
    city: settings.marketplace_city,
    country: settings.marketplace_country,
    social: {
      facebook: settings.marketplace_facebook_url,
      instagram: settings.marketplace_instagram_url,
      x: settings.marketplace_x_url,
      tiktok: settings.marketplace_tiktok_url,
      youtube: settings.marketplace_youtube_url,
      linkedin: settings.marketplace_linkedin_url,
      whatsapp: settings.marketplace_whatsapp_url,
      telegram: settings.marketplace_telegram_url,
      pinterest: settings.marketplace_pinterest_url,
      snapchat: settings.marketplace_snapchat_url,
    },
  };

  return (
    <footer className={isAliExpress2 ? 'bg-[#050505] text-white border-t border-white/[0.04]' : classes.footer}>
      {/* AliExpress 2.0 — glowing accent strip instead of plain gradient */}
      {isAliExpress2 ? (
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#ff4747]/10 via-[#ff5f2e]/5 to-[#ff8a00]/10" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 text-sm font-black text-white/60">
              <span className="h-2 w-2 rounded-full bg-[#ff4747] animate-pulse" />
              Buyer protection · Secure checkout · Verified sellers
            </div>
            <Link href="/hub/search" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-xs font-black text-white/50 backdrop-blur transition-all hover:border-[#ff4747]/30 hover:text-[#ff6b6b]">
              Explore deals
            </Link>
          </div>
        </div>
      ) : isAliExpress ? (
        <div className="bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00]">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 text-sm font-black sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span>Buyer protection · secure checkout · local seller deals</span>
            <Link href="/hub/search" className="rounded-full bg-white/15 px-4 py-1.5 text-xs text-white hover:bg-white/25">
              Explore marketplace offers
            </Link>
          </div>
        </div>
      ) : null}

      {/* Trust Bar */}
      <div className={`border-b ${isAliExpress2 ? 'border-white/[0.04]' : 'border-white/10'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <ShieldCheck className={`w-6 h-6 ${iconClass}`} strokeWidth={1.75} />
              <span className={`text-sm font-medium ${isAliExpress2 ? 'text-white/30' : 'text-gray-300'}`}>{t('hub.valueProps.payment.title')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Store className={`w-6 h-6 ${iconClass}`} strokeWidth={1.75} />
              <span className={`text-sm font-medium ${isAliExpress2 ? 'text-white/30' : 'text-gray-300'}`}>{t('hub.valueProps.verified.title')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CreditCard className={`w-6 h-6 ${iconClass}`} strokeWidth={1.75} />
              <span className={`text-sm font-medium ${isAliExpress2 ? 'text-white/30' : 'text-gray-300'}`}>Flouci, Konnect & Mandat</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Headphones className={`w-6 h-6 ${iconClass}`} strokeWidth={1.75} />
              <span className={`text-sm font-medium ${isAliExpress2 ? 'text-white/30' : 'text-gray-300'}`}>{t('footer.help')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <MarketplaceBrand
              href="/hub"
              marketplaceName={marketplaceName}
              marketplaceLogoUrl={settings.marketplace_logo_url}
              marketplaceLogoLightUrl={settings.marketplace_logo_light_url}
              marketplaceLogoDarkUrl={settings.marketplace_logo_dark_url}
              logoSurface="dark"
              imageClassName="h-9 max-w-[160px] object-contain"
              textClassName={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${isAliExpress ? 'from-[#ff4747] to-[#ff8a00]' : 'from-[#16C784] to-[#1EE69A]'}`}
              showTextWithLogo
            />
            <p className={`mt-3 text-sm leading-relaxed ${isAliExpress2 ? 'text-white/20' : 'text-gray-400'}`}>
              {tagline}
            </p>
            <StorefrontSocialLinks
              branding={marketplaceBranding}
              showContact
              className="mt-4 flex flex-wrap items-center gap-3"
              linkClassName={socialLinkClass}
            />
          </div>

          {/* Marketplace */}
          <div>
            <h4 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isAliExpress2 ? 'text-white/50' : 'text-white'}`}>Marketplace</h4>
            <ul className="space-y-2.5">
              <li><Link href="/hub/search" className={linkClass}>{t('nav.explore')}</Link></li>
              <li><Link href="/hub/search?category=Electronics" className={linkClass}>Electronics</Link></li>
              <li><Link href="/hub/search?category=Fashion" className={linkClass}>Fashion</Link></li>
              <li><Link href="/hub/search?category=Home" className={linkClass}>Home</Link></li>
              <li><Link href="/hub/pricing" className={linkClass}>{t('nav.pricing')}</Link></li>
            </ul>
          </div>

          {/* Vendeurs */}
          <div>
            <h4 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isAliExpress2 ? 'text-white/50' : 'text-white'}`}>{t('product.vendor')}</h4>
            <ul className="space-y-2.5">
              <li><Link href="/hub/vendor-signup" className={linkClass}>{t('nav.createStore')}</Link></li>
              <li><Link href="/hub/dashboard" className={linkClass}>{t('nav.dashboard')}</Link></li>
              <li><Link href="/hub/pricing" className={linkClass}>{t('nav.pricing')}</Link></li>
              <li><Link href="/hub/dashboard/kyc" className={linkClass}>{t('kyc.title')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isAliExpress2 ? 'text-white/50' : 'text-white'}`}>{t('footer.help')}</h4>
            <ul className="space-y-2.5">
              <li><Link href={helpUrl} className={linkClass}>{t('footer.help')}</Link></li>
              <li><Link href={termsUrl} className={linkClass}>{t('footer.terms')}</Link></li>
              <li><Link href={privacyUrl} className={linkClass}>{t('footer.privacy')}</Link></li>
              {refundUrl && <li><Link href={refundUrl} className={linkClass}>Refund Policy</Link></li>}
              {cookiePolicyUrl && <li><Link href={cookiePolicyUrl} className={linkClass}>Cookie Policy</Link></li>}
              <li><Link href={contactUrl} className={linkClass}>{t('footer.contact')}</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={`border-t ${isAliExpress2 ? 'border-white/[0.04]' : 'border-white/10'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className={`text-xs ${isAliExpress2 ? 'text-white/20' : 'text-gray-500'}`}>
            {t('footer.copyright', { year: String(currentYear) })}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-1 rounded ${isAliExpress2 ? 'text-white/20 bg-white/[0.03]' : 'text-gray-400 bg-white/5'}`}>Flouci</span>
              <span className={`text-xs font-medium px-2 py-1 rounded ${isAliExpress2 ? 'text-white/20 bg-white/[0.03]' : 'text-gray-400 bg-white/5'}`}>Konnect</span>
              <span className={`text-xs font-medium px-2 py-1 rounded ${isAliExpress2 ? 'text-white/20 bg-white/[0.03]' : 'text-gray-400 bg-white/5'}`}>Mandat</span>
              <span className={`text-xs font-medium px-2 py-1 rounded ${isAliExpress2 ? 'text-white/20 bg-white/[0.03]' : 'text-gray-400 bg-white/5'}`}>COD</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
