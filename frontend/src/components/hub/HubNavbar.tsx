'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, User, Heart } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LocaleSwitcher } from '../LocaleSwitcher';
import { useLocale } from '../../contexts/LocaleContext';

export function HubNavbar() {
  const { t } = useLocale();
  return (
    <header className="bg-white dark:bg-[#1A1A2E] border-b border-gray-100 dark:border-white/10 sticky top-0 z-40 backdrop-blur-sm bg-white/95 dark:bg-[#1A1A2E]/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/hub" className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#16C784] to-[#1EE69A]">
              PandaMarket
            </Link>
          </div>

          {/* Search Bar - Hidden on small screens */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <SearchBar />
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-4">
            <Link href="/hub/dashboard" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-[#16C784] transition-colors hidden lg:block">
              {t('nav.createStore')}
            </Link>
            <div className="h-6 w-px bg-gray-200 dark:bg-white/10 hidden lg:block" />
            <LocaleSwitcher />
            <ThemeToggle />
            <button className="flex items-center text-gray-600 dark:text-gray-300 hover:text-[#16C784] transition-colors">
              <User className="w-5 h-5" strokeWidth={1.75} />
              <span className="ms-2 text-sm font-medium hidden sm:block">{t('nav.login')}</span>
            </button>
            <Link href="/hub/wishlist" className="flex items-center text-gray-600 dark:text-gray-300 hover:text-red-400 transition-colors">
              <Heart className="w-5 h-5" strokeWidth={1.75} />
            </Link>
            <button className="flex items-center text-gray-600 dark:text-gray-300 hover:text-[#16C784] transition-colors relative">
              <ShoppingBag className="w-5 h-5" strokeWidth={1.75} />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                0
              </span>
            </button>
          </div>
        </div>
        
        {/* Mobile Search - Visible only on small screens */}
        <div className="md:hidden pb-4">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
