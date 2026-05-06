'use client';

import Link from 'next/link';
import { Store, ShieldCheck, CreditCard, Headphones } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import { useMarketplaceTheme } from '../../hooks/useMarketplaceTheme';
import type { MarketplaceThemeSettings } from '../../lib/marketplace-theme';

export function HubFooter(props: MarketplaceThemeSettings) {
  const { t } = useLocale();
  const { settings, classes, isAliExpress } = useMarketplaceTheme(props);
  const currentYear = new Date().getFullYear();
  const marketplaceName = settings.marketplace_name || 'PandaMarket';
  const tagline = settings.marketplace_tagline || t('common.tagline');
  const linkClass = `text-sm text-gray-400 transition-colors ${classes.primaryTextHover}`;
  const iconClass = isAliExpress ? 'text-[#ff8a00]' : 'text-[#16C784]';

  return (
    <footer className={classes.footer}>
      {isAliExpress && (
        <div className="bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00]">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 text-sm font-black sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span>Buyer protection · secure checkout · local seller deals</span>
            <Link href="/hub/search" className="rounded-full bg-white/15 px-4 py-1.5 text-xs text-white hover:bg-white/25">
              Explore marketplace offers
            </Link>
          </div>
        </div>
      )}
      {/* Trust Bar */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <ShieldCheck className={`w-6 h-6 ${iconClass}`} strokeWidth={1.75} />
              <span className="text-sm font-medium text-gray-300">{t('hub.valueProps.payment.title')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Store className={`w-6 h-6 ${iconClass}`} strokeWidth={1.75} />
              <span className="text-sm font-medium text-gray-300">{t('hub.valueProps.verified.title')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CreditCard className={`w-6 h-6 ${iconClass}`} strokeWidth={1.75} />
              <span className="text-sm font-medium text-gray-300">Flouci, Konnect & Mandat</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Headphones className={`w-6 h-6 ${iconClass}`} strokeWidth={1.75} />
              <span className="text-sm font-medium text-gray-300">{t('footer.help')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/hub" className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${isAliExpress ? 'from-[#ff4747] to-[#ff8a00]' : 'from-[#16C784] to-[#1EE69A]'}`}>
              {marketplaceName}
            </Link>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">
              {tagline}
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Marketplace</h4>
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
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{t('product.vendor')}</h4>
            <ul className="space-y-2.5">
              <li><Link href="/hub/vendor-signup" className={linkClass}>{t('nav.createStore')}</Link></li>
              <li><Link href="/hub/dashboard" className={linkClass}>{t('nav.dashboard')}</Link></li>
              <li><Link href="/hub/pricing" className={linkClass}>{t('nav.pricing')}</Link></li>
              <li><Link href="/hub/dashboard/kyc" className={linkClass}>{t('kyc.title')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{t('footer.help')}</h4>
            <ul className="space-y-2.5">
              <li><Link href="/hub/search" className={linkClass}>{t('footer.help')}</Link></li>
              <li><Link href="/hub/search" className={linkClass}>{t('footer.terms')}</Link></li>
              <li><Link href="/hub/search" className={linkClass}>{t('footer.privacy')}</Link></li>
              <li><Link href="/hub/search" className={linkClass}>{t('footer.contact')}</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-gray-500">
            {t('footer.copyright', { year: String(currentYear) })}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded">Flouci</span>
              <span className="text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded">Konnect</span>
              <span className="text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded">Mandat</span>
              <span className="text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded">COD</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
