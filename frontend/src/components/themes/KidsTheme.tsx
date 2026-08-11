'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import React, { useState } from 'react';
import { Heart, ShoppingBag, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontFooter } from '../store/StorefrontFooter';
import { StorefrontHeader } from '../store/StorefrontHeader';

/** Kids Theme — Playful, colorful, rounded shapes, fun typography. */
export function KidsTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const primary = tc.colors.primary;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const allProducts = products;

  const categories = [...new Set(allProducts.map((p) => p.category).filter(Boolean))] as string[];

  const displayProducts = allProducts.filter((p) => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(p.category || '').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (activeCategory && p.category !== activeCategory) {
      return false;
    }
    return true;
  });

  return (
    <div className={`${theme.typography.fontFamily} min-h-screen relative flex flex-col`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
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
        <main className="py-8 max-w-7xl mx-auto px-6">{children}</main>
      ) : (
        <>
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="py-16 text-center relative" style={{ background: `linear-gradient(180deg, #FFF0F5 0%, transparent 100%)` }}>
              <div className="max-w-4xl mx-auto px-6">
                <div className="text-4xl mb-4">🎈🧸🌈</div>

                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-8 items-center text-left">
                    <div>
                      <h2 className="text-4xl md:text-5xl font-black leading-tight mb-4">
                        Fun for<br /><span style={{ color: primary }}>Little Ones!</span>
                      </h2>
                      <p className="text-sm text-gray-500 mb-6 font-medium">
                        Safe, educational, and oh-so-fun products crafted for kids of all ages.
                      </p>
                      <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-black text-white transition-all hover:scale-105 shadow-md" style={{ backgroundColor: primary }}>
                        <Heart className="w-4 h-4 inline mr-1" /> Shop Now
                      </a>
                    </div>
                    <div className="aspect-square rounded-3xl flex items-center justify-center bg-white shadow-md border-4" style={{ borderColor: '#F59E0B' }}>
                      <span className="text-7xl animate-bounce">🎁</span>
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black mb-2" style={{ color: primary }}>
                      {storeName} World! 🌟
                    </h2>
                    <p className="text-sm text-gray-500 font-bold">Joyful essentials for happy kids.</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4 bg-white shadow-sm" style={{ color: primary }}>
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch Kids Play Film
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black leading-tight mb-6">
                      Play & Learn Every Day!
                    </h2>
                    <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-black text-white transition-all hover:scale-105 shadow-md" style={{ backgroundColor: primary }}>
                      <Heart className="w-4 h-4 inline mr-1" /> Explore Collection
                    </a>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-4xl md:text-6xl font-black leading-tight mb-4">
                      Fun for<br /><span style={{ color: primary }}>Little Ones!</span>
                    </h2>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mb-8 font-medium">
                      Safe, educational, and oh-so-fun products for kids of all ages.
                    </p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-black text-white transition-all hover:scale-105 shadow-md" style={{ backgroundColor: primary }}>
                      <Heart className="w-4 h-4 inline mr-1" /> Shop Now
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 pt-6 pb-2">
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide flex-wrap justify-center">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-5 py-2 rounded-full text-xs font-black transition-all shadow-sm"
                  style={{
                    backgroundColor: !activeCategory ? primary : '#ffffff',
                    color: !activeCategory ? '#ffffff' : primary,
                    border: `2px solid ${primary}`,
                  }}
                >
                  All Toys & Gifts ⭐
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-5 py-2 rounded-full text-xs font-black transition-all shadow-sm"
                    style={{
                      backgroundColor: activeCategory === cat ? primary : '#ffffff',
                      color: activeCategory === cat ? '#ffffff' : primary,
                      border: `2px solid ${primary}`,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Product Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
            <ThemeLayout variation={tc.layoutVariation} layout={tc.layout} colors={tc.colors} categories={categories} activeCategory={activeCategory}>
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-3xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all border-2" style={{ borderColor: `${primary}15` }}>
                    <div className="aspect-square overflow-hidden" style={{ backgroundColor: '#FFF5F8' }}>
                      {getStoreProductImage(p) ? (
                        <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={400} unoptimized className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🧸</div>
                      )}
                    </div>
                    <div className="p-3 text-center">
                      {p.category && <p className="text-[10px] tracking-widest uppercase font-bold mb-1" style={{ color: primary }}>{p.category}</p>}
                      <h3 className="text-sm font-bold line-clamp-1">{p.title}</h3>
                      <p className="text-sm font-black mt-1" style={{ color: primary }}>{formatStorePrice(p)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm font-bold">No fun items found matching search</p>
                </div>
              )}
            </ThemeLayout>
          </main>
        </>
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
