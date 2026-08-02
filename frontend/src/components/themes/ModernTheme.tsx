'use client';

import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShoppingBag, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
  type ThemeProps,
  useThemeCustomization,
  colorVars,
  formatStorePrice,
  getStoreProductImage,
  getStorefrontProductPath,
} from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontFooter } from '../store/StorefrontFooter';
import { StorefrontHeader } from '../store/StorefrontHeader';

export function ModernTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const tags = ['New Arrival', 'Trending', 'Pro', 'Best Seller'];
  const allProducts = products;

  const categories = Array.from(new Set(allProducts.map((p) => p.category).filter(Boolean))) as string[];

  const displayProducts = allProducts.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCat) return false;
    }
    if (activeCategory && p.category !== activeCategory) return false;
    return true;
  });

  return (
    <div
      className={`${theme.typography.fontFamily} min-h-screen flex flex-col relative overflow-hidden`}
      style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}
    >
      {/* Dynamic Background Glowing Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px] opacity-20 animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px] opacity-20 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <StorefrontHeader
        storeName={storeName}
        branding={branding}
        theme={theme}
        navigation={navigation}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />



      {children ? (
        <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-8 flex-1 w-full">{children}</main>
      ) : (
        <div className="relative z-10 flex-1 w-full">
          {/* Hero (respects heroStyle: banner, split, minimal, video, none) */}
          {tc.heroStyle !== 'none' && (
            <section className="max-w-7xl mx-auto px-6 lg:px-12 py-16 text-center">
              {tc.heroStyle === 'split' ? (
                <div className="flex flex-col md:flex-row items-center gap-12 text-left">
                  <div className="flex-1">
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
                      <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
                      <span className="text-sm font-medium text-purple-200">The Future of Commerce</span>
                    </div>
                    <h2 className={`text-4xl lg:text-6xl leading-tight mb-6 ${theme.typography.headingStyle}`}>
                      {storeName}
                    </h2>
                    <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                      Discover cutting-edge products curated for the modern visionary. Experience frictionless shopping.
                    </p>
                    <a
                      href="#products"
                      className="px-8 py-3.5 rounded-full font-bold text-base hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.5)] transition-all inline-flex items-center group"
                      style={{ backgroundColor: tc.colors.primary, color: tc.colors.background }}
                    >
                      Explore Catalog
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                  <div className="flex-1 w-full aspect-[4/3] rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center p-8">
                    <ShoppingBag className="w-20 h-20 text-purple-400/40 animate-pulse" />
                  </div>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="max-w-3xl mx-auto">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
                    <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
                    <span className="text-sm font-medium text-purple-200">Experience in Motion</span>
                  </div>
                  <h2 className={`text-4xl lg:text-6xl leading-tight mb-6 ${theme.typography.headingStyle}`}>
                    {storeName}
                  </h2>
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center group cursor-pointer shadow-2xl">
                    <div className="w-16 h-16 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </div>
                  </div>
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className="max-w-2xl mx-auto py-8">
                  <h2 className={`text-3xl lg:text-5xl font-bold mb-3 ${theme.typography.headingStyle}`}>
                    {storeName}
                  </h2>
                  <p className="text-sm text-purple-300 font-medium tracking-widest uppercase">
                    Next-Gen Digital Essentials
                  </p>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
                    <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
                    <span className="text-sm font-medium text-purple-200">The Future of Commerce</span>
                  </div>
                  <h2 className={`text-5xl lg:text-7xl leading-tight mb-6 ${theme.typography.headingStyle}`}>
                    Elevate Your <br /> <span style={{ color: tc.colors.accent }}>{storeName}</span>
                  </h2>
                  <p className="text-lg text-slate-400 mb-10">
                    Discover cutting-edge products curated for the modern visionary. Experience frictionless shopping.
                  </p>
                  <a
                    href="#products"
                    className="px-8 py-4 rounded-full font-bold text-lg hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.5)] transition-all inline-flex items-center mx-auto group"
                    style={{ backgroundColor: tc.colors.primary, color: tc.colors.background }}
                  >
                    Explore Catalog
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              )}
            </section>
          )}

          {/* Interactive Category Pills */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-10 flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setActiveCategory('')}
                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                  !activeCategory
                    ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                    activeCategory === cat
                      ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Main Product Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 lg:px-12 pb-20">
            <ThemeLayout
              variation={tc.layoutVariation}
              layout={tc.layout}
              colors={tc.colors}
              categories={categories}
              activeCategory={activeCategory}
            >
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p, idx) => (
                  <Link
                    key={p.id}
                    href={getStorefrontProductPath(p, branding?.store_path_base)}
                    className="group relative rounded-2xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur-sm hover:bg-white/10 transition-colors duration-500 block"
                  >
                    <div className="absolute top-4 left-4 z-20">
                      <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md rounded-full text-white border border-white/20">
                        {p.category || tags[idx % tags.length]}
                      </span>
                    </div>
                    <div className="aspect-[4/5] bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden">
                      {getStoreProductImage(p) ? (
                        <Image
                          src={getStoreProductImage(p)}
                          alt={p.title}
                          width={400}
                          height={500}
                          unoptimized
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
                          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
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
                  <p>No products found matching your search</p>
                </div>
              )}
            </ThemeLayout>
          </main>
        </div>
      )}

      <StorefrontFooter
        storeName={storeName}
        branding={branding}
        theme={theme}
        navigation={navigation}
        categories={categories}
      />
    </div>
  );
}
