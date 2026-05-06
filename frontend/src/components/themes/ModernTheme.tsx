import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { Sparkles, ArrowRight, ShoppingCart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';

export function ModernTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const tags = ['New Arrival', 'Trending', 'Pro', 'Best Seller'];
  const displayProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Neon Cyber Keyboard', price: 350, images: [] },
        { id: '2', title: 'Holographic Display', price: 1200, images: [] },
        { id: '3', title: 'Quantum Processor Unit', price: 899, images: [] },
        { id: '4', title: 'Neural Link Headset', price: 450, images: [] },
      ];

  return (
    <div className={`${theme.typography.fontFamily} min-h-screen relative overflow-hidden`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

      {branding?.favicon_url && (
        <link rel="icon" href={branding.favicon_url} />
      )}
      <header className="relative z-10 px-6 lg:px-12 py-6 flex justify-between items-center">
        <Link href={branding?.store_path_base || '/'}>
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt={storeName} className="h-10 object-contain" />
          ) : (
            <h1 className={`text-2xl ${theme.typography.headingStyle}`} style={{ color: tc.colors.accent }}>
              {storeName}
            </h1>
          )}
        </Link>
        <nav className="hidden md:flex space-x-8">
          <a href="#products" className="text-slate-300 hover:text-white transition-colors">Discover</a>
          <a href="#products" className="text-slate-300 hover:text-white transition-colors">Collections</a>
          <Link href={`${branding?.store_path_base || ''}/pages/about`} className="text-slate-300 hover:text-white transition-colors">Creators</Link>
        </nav>
        <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={tc.colors.accent} iconColor={tc.colors.text} className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition-all hover:bg-white/20" icon="cart" />
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-sm font-medium text-purple-200">The Future of Commerce</span>
          </div>
          <h2 className={`text-5xl lg:text-7xl leading-tight mb-6 ${theme.typography.headingStyle}`}>
            Elevate Your <br/> <span className={theme.colors.accent}>Digital Lifestyle</span>
          </h2>
          <p className="text-lg text-slate-400 mb-10">
            Discover cutting-edge products curated for the modern visionary. Experience frictionless shopping.
          </p>
          <a href="#products" className="px-8 py-4 rounded-full font-bold text-lg hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.5)] transition-all inline-flex items-center mx-auto group" style={{ backgroundColor: tc.colors.primary, color: tc.colors.background }}>
            Explore Catalog
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayProducts.map((p, idx) => (
            <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group relative rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-sm hover:bg-white/10 transition-colors duration-500 block">
              <div className="absolute top-4 left-4 z-20">
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-black/50 backdrop-blur-md rounded-full text-white border border-white/20">
                  {p.category || tags[idx % tags.length]}
                </span>
              </div>
              <div className="aspect-[4/5] bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden">
                {getStoreProductImage(p) ? (
                  <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500"></div>
                    <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-white/30">
                      <ShoppingBag className="w-10 h-10" />
                    </div>
                  </>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{p.title}</h3>
                <div className="flex justify-between items-center">
                  <p className="text-purple-300 font-medium">{formatStorePrice(p)}</p>
                  <span className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {displayProducts.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
            <p>No products yet</p>
          </div>
        )}
      </main>
    </div>
  );
}

