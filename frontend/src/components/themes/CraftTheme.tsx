'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import React from 'react';
import { useStorefrontCatalogFilters } from '../../lib/storefront-catalog-state';
import { Scissors, ShoppingBag, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontFooter } from '../store/StorefrontFooter';
import { StorefrontHeader } from '../store/StorefrontHeader';

/** Craft Theme — DIY/handmade, rustic textures, warm palette. */
export function CraftTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const rust = tc.colors.primary;

  const { searchQuery, setSearchQuery, activeCategory, setActiveCategory } = useStorefrontCatalogFilters();

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
            <section className="py-20 text-center relative" style={{ backgroundColor: tc.heroStyle === 'banner' ? `${rust}08` : 'transparent' }}>
              <div className="max-w-4xl mx-auto px-6">
                <p className="text-xs tracking-[0.25em] uppercase mb-4 font-semibold" style={{ color: rust }}>✦ Handmade with Love ✦</p>
                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-8 items-center text-left">
                    <div>
                      <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-6">
                        Made by<br />Hand
                      </h2>
                      <p className="text-sm max-w-md mb-8 leading-relaxed" style={{ color: `${rust}80` }}>
                        Every piece is unique, crafted with care and passion. Support local artisans and unique creations.
                      </p>
                      <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: rust }}>
                        Browse Crafts
                      </a>
                    </div>
                    <div className="aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center p-8 bg-[#F0E8DD]" style={{ borderColor: `${rust}30` }}>
                      <Scissors className="w-16 h-16 animate-bounce" style={{ color: `${rust}40` }} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold mb-3">
                      {storeName} Studio
                    </h2>
                    <p className="text-xs tracking-wider uppercase opacity-70">Authentic Handcrafted Treasures</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 border-2 border-dashed bg-white/50" style={{ borderColor: `${rust}40`, color: rust }}>
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch Workshop Process
                    </div>
                    <h2 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6">
                      Artisan Craftsmanship
                    </h2>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: rust }}>
                      Shop Workshop
                    </a>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6">
                      Made by<br />Hand
                    </h2>
                    <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed" style={{ color: `${rust}80` }}>
                      Every piece is unique, crafted with care and passion. Support local artisans.
                    </p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: rust }}>
                      Browse Crafts
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 pt-6 pb-2">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide flex-wrap justify-center">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-5 py-2 rounded-full text-xs font-serif font-semibold transition-all border-2 border-dashed"
                  style={{
                    borderColor: `${rust}40`,
                    backgroundColor: !activeCategory ? rust : 'transparent',
                    color: !activeCategory ? '#ffffff' : rust,
                  }}
                >
                  All Crafts
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-5 py-2 rounded-full text-xs font-serif font-semibold transition-all border-2 border-dashed"
                    style={{
                      borderColor: `${rust}40`,
                      backgroundColor: activeCategory === cat ? rust : 'transparent',
                      color: activeCategory === cat ? '#ffffff' : rust,
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
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-xl overflow-hidden bg-white border-2 border-dashed hover:border-solid transition-all" style={{ borderColor: `${rust}20` }}>
                    <div className="aspect-square overflow-hidden" style={{ backgroundColor: '#F0E8DD' }}>
                      {getStoreProductImage(p) ? (
                        <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={400} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Scissors className="w-10 h-10" style={{ color: `${rust}20` }} />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: rust }}>{p.category}</p>}
                      <h3 className="text-sm font-serif font-semibold">{p.title}</h3>
                      <p className="text-sm font-bold mt-1" style={{ color: rust }}>{formatStorePrice(p)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20" style={{ color: `${rust}50` }}>
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm font-serif">No handmade items found matching search</p>
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
