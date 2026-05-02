import React from 'react';
import Link from 'next/link';
import { ShoppingBag, User } from 'lucide-react';
import { SearchBar } from './SearchBar';

export function HubNavbar() {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/hub" className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              PandaMarket
            </Link>
          </div>

          {/* Search Bar - Hidden on small screens */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <SearchBar />
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-6">
            <Link href="/hub/dashboard" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Sell on PandaMarket
            </Link>
            <div className="h-6 w-px bg-gray-200"></div>
            <button className="flex items-center text-gray-600 hover:text-blue-600 transition-colors">
              <User className="w-5 h-5" />
              <span className="ml-2 text-sm font-medium hidden sm:block">Sign In</span>
            </button>
            <button className="flex items-center text-gray-600 hover:text-blue-600 transition-colors relative">
              <ShoppingBag className="w-5 h-5" />
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
