'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageSquare, ShoppingBag, User } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LocaleSwitcher } from '../LocaleSwitcher';
import { useLocale } from '../../contexts/LocaleContext';
import { useCart } from '../../contexts/CartContext';
import { normalizePublicAssetUrl } from '../../lib/public-assets';
import { InstantChatLauncher } from '../chat/InstantChatLauncher';
import { MarketplaceBrand } from '../MarketplaceBrand';
import { BuyerWelcomeModal } from './BuyerWelcomeModal';
import { fetchOnboardingState, type OnboardingState } from '../../lib/onboarding';

interface CurrentUser {
  role?: string;
  store_id?: string | null;
}

interface HubNavbarProps {
  marketplaceName?: string;
  marketplaceLogoUrl?: string;
  marketplaceLogoLightUrl?: string;
  marketplaceLogoDarkUrl?: string;
  marketplaceTheme?: 'panda' | 'aliexpress' | 'aliexpress2';
  showInstantChat?: boolean;
}

interface MarketplaceSettings {
  marketplace_name?: string;
  marketplace_logo_url?: string;
  marketplace_logo_light_url?: string;
  marketplace_logo_dark_url?: string;
  marketplace_theme?: 'panda' | 'aliexpress' | 'aliexpress2';
}

export function HubNavbar({ marketplaceName, marketplaceLogoUrl, marketplaceLogoLightUrl, marketplaceLogoDarkUrl, marketplaceTheme, showInstantChat = true }: HubNavbarProps) {
  const { t } = useLocale();
  const { getItemCount } = useCart();
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings>({});
  const resolvedMarketplaceName = marketplaceName || marketplaceSettings.marketplace_name || 'PandaMarket';
  const resolvedMarketplaceLogoUrl = normalizePublicAssetUrl(marketplaceLogoUrl || marketplaceSettings.marketplace_logo_url);
  const resolvedMarketplaceLogoLightUrl = normalizePublicAssetUrl(marketplaceLogoLightUrl || marketplaceSettings.marketplace_logo_light_url);
  const resolvedMarketplaceLogoDarkUrl = normalizePublicAssetUrl(marketplaceLogoDarkUrl || marketplaceSettings.marketplace_logo_dark_url);
  const resolvedMarketplaceTheme = marketplaceTheme || marketplaceSettings.marketplace_theme || 'panda';
  const isAliExpress = resolvedMarketplaceTheme === 'aliexpress' || resolvedMarketplaceTheme === 'aliexpress2';
  const isAliExpress2 = resolvedMarketplaceTheme === 'aliexpress2';
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showBuyerWelcome, setShowBuyerWelcome] = useState(false);
  const cartCount = getItemCount();
  const role = currentUser?.role?.toLowerCase();
  const dashboardHref =
    role === 'admin' || role === 'super_admin'
      ? '/dashboard'
      : role === 'vendor' || currentUser?.store_id
        ? '/hub/dashboard'
        : '/hub/account';
  const accountHref = currentUser ? dashboardHref : authChecked ? '/login/buyer' : '/hub/account';

  useEffect(() => {
    let cancelled = false;

    if (marketplaceName || marketplaceLogoUrl || marketplaceLogoLightUrl || marketplaceLogoDarkUrl || marketplaceTheme) return;

    async function fetchMarketplaceSettings() {
      try {
        const res = await fetch('/api/pd/marketplace/settings', { credentials: 'include' });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setMarketplaceSettings(data.data || {});
        }
      } catch {
        if (!cancelled) setMarketplaceSettings({});
      }
    }

    fetchMarketplaceSettings();

    return () => {
      cancelled = true;
    };
  }, [marketplaceLogoDarkUrl, marketplaceLogoLightUrl, marketplaceLogoUrl, marketplaceName, marketplaceTheme]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCurrentUser() {
      try {
        const res = await fetch('/api/pd/auth/me', { credentials: 'include' });
        if (!cancelled && res.ok) {
          const data = await res.json();
          const user = data.user || data.data || null;
          setCurrentUser(user);

          // If role is buyer, check onboarding status
          if (user && user.role?.toLowerCase() === 'buyer') {
            const state = (await fetchOnboardingState().catch(() => ({}))) as OnboardingState;
            if (!state.buyer_welcome?.completed && !cancelled) {
              setShowBuyerWelcome(true);
            }
          }
        }
      } catch {
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }

    fetchCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur-sm ${
      isAliExpress2 ? 'border-white/[0.06] bg-[#09090b]/90 backdrop-blur-2xl shadow-2xl shadow-black/50' : isAliExpress ? 'border-orange-100 bg-white/95 shadow-sm shadow-orange-900/5 dark:bg-[#1A1A2E]/95' : 'border-gray-100 bg-white/95 dark:border-white/10 dark:bg-[#1A1A2E]/95'
    }`}>
      {isAliExpress2 ? (
        <div className="hidden bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] text-white shadow-md shadow-orange-900/20 backdrop-blur-lg border-b border-white/20 md:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-[10px] uppercase tracking-widest font-black sm:px-6 lg:px-8">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-white animate-pulse" /> Super Deals Active · Buyer Protection</span>
            <Link href="/hub/search" className="rounded-lg bg-white/20 px-4 py-1 hover:bg-white/30 transition-all">
              Shop Now
            </Link>
          </div>
        </div>
      ) : isAliExpress ? (
        <div className="hidden bg-gradient-to-r from-[#ff4747] via-[#ff5f2e] to-[#ff8a00] text-white md:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs font-black sm:px-6 lg:px-8">
            <span>AliExpress Style · Flash Deals · Buyer Protection</span>
            <Link href="/hub/search" className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25">
              Shop deals
            </Link>
          </div>
        </div>
      ) : null}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <MarketplaceBrand
              href="/hub"
              marketplaceName={resolvedMarketplaceName}
              marketplaceLogoUrl={resolvedMarketplaceLogoUrl}
              marketplaceLogoLightUrl={resolvedMarketplaceLogoLightUrl}
              marketplaceLogoDarkUrl={resolvedMarketplaceLogoDarkUrl}
              logoSurface={isAliExpress2 ? 'dark' : 'light'}
              className="flex items-center gap-3"
              imageClassName="h-10 max-w-[150px] object-contain"
              textClassName={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${
                isAliExpress ? 'from-[#ff4747] to-[#ff8a00]' : 'from-[#16C784] to-[#1EE69A]'
              }`}
              fallbackMarkClassName="hidden"
            />
          </div>

          {/* Search Bar - Hidden on small screens */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <SearchBar marketplaceTheme={resolvedMarketplaceTheme} />
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-4">
            <Link href="/hub/dashboard" className={`text-sm font-medium transition-colors hidden lg:block ${isAliExpress2 ? 'text-white/60 hover:text-[#ff6b6b]' : isAliExpress ? 'text-gray-600 dark:text-gray-300 hover:text-[#ff4747]' : 'text-gray-600 dark:text-gray-300 hover:text-[#16C784]'}`}>
              {t('nav.createStore')}
            </Link>
            <div className={`h-6 w-px hidden lg:block ${isAliExpress2 ? 'bg-white/10' : 'bg-gray-200 dark:bg-white/10'}`} />
            <LocaleSwitcher />
            <ThemeToggle />
            <Link href={accountHref} className={`flex items-center transition-colors ${isAliExpress2 ? 'text-white/60 hover:text-[#ff6b6b]' : isAliExpress ? 'text-gray-600 dark:text-gray-300 hover:text-[#ff4747]' : 'text-gray-600 dark:text-gray-300 hover:text-[#16C784]'}`}>
              <User className="w-5 h-5" strokeWidth={1.75} />
              <span className="ms-2 text-sm font-medium hidden sm:block">
                {currentUser ? 'Mon compte' : t('nav.login')}
              </span>
            </Link>
            <Link href="/hub/wishlist" className={`flex items-center transition-colors ${isAliExpress2 ? 'text-white/60 hover:text-red-400' : 'text-gray-600 dark:text-gray-300 hover:text-red-400'}`}>
              <Heart className="w-5 h-5" strokeWidth={1.75} />
            </Link>
            <Link href="/hub/messages" className={`flex items-center transition-colors ${isAliExpress2 ? 'text-white/60 hover:text-[#ff6b6b]' : isAliExpress ? 'text-gray-600 dark:text-gray-300 hover:text-[#ff4747]' : 'text-gray-600 dark:text-gray-300 hover:text-[#16C784]'}`}>
              <MessageSquare className="w-5 h-5" strokeWidth={1.75} />
            </Link>
            <Link href="/hub/cart" className={`flex items-center transition-colors relative ${isAliExpress2 ? 'text-white/60 hover:text-[#ff6b6b]' : isAliExpress ? 'text-gray-600 dark:text-gray-300 hover:text-[#ff4747]' : 'text-gray-600 dark:text-gray-300 hover:text-[#16C784]'}`}>
              <ShoppingBag className="w-5 h-5" strokeWidth={1.75} />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {cartCount}
              </span>
            </Link>
          </div>
        </div>
        
        {/* Mobile Search - Visible only on small screens */}
        <div className="md:hidden pb-4">
          <SearchBar marketplaceTheme={resolvedMarketplaceTheme} />
        </div>
      </div>
      {showInstantChat && <InstantChatLauncher marketplaceTheme={resolvedMarketplaceTheme} />}
      {showBuyerWelcome && (
        <BuyerWelcomeModal
          onClose={() => setShowBuyerWelcome(false)}
          onCompleted={() => setShowBuyerWelcome(false)}
        />
      )}
    </header>
  );
}
