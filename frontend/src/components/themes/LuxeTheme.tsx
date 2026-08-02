'use client';

import React, { useState } from 'react';
import { Diamond, ShoppingBag, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontFooter } from '../store/StorefrontFooter';
import { StorefrontHeader } from '../store/StorefrontHeader';

/** Luxe Theme — High-end jewelry/watches, dark with gold accents. */
export function LuxeTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const gold = tc.colors.primary;

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
          {/* Hero Section */}
          {tc.heroStyle !== 'none' && (
            <section className="py-20 md:py-28 text-center relative overflow-hidden" style={{ backgroundColor: tc.heroStyle === 'banner' ? `${gold}08` : 'transparent' }}>
              <div className="max-w-4xl mx-auto px-6 relative z-10">
                <p className="text-xs tracking-[0.4em] uppercase mb-6" style={{ color: gold }}>Haute Joaillerie</p>
                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-10 items-center text-left">
                    <div>
                      <h2 className="text-4xl md:text-6xl font-serif font-light tracking-wide leading-tight mb-6">
                        Eternal <br /><span style={{ color: gold }}>Brilliance</span>
                      </h2>
                      <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                        Exceptional craftsmanship. Timeless elegance. Each piece, a masterwork curated for discerning tastes.
                      </p>
                      <a href="#products" className="inline-block px-8 py-3.5 text-xs tracking-[0.25em] uppercase font-medium border transition-all hover:bg-white/5" style={{ borderColor: gold, color: gold }}>
                        Explore Catalog
                      </a>
                    </div>
                    <div className="aspect-square rounded-xl border flex items-center justify-center bg-white/5" style={{ borderColor: `${gold}30` }}>
                      <Diamond className="w-20 h-20 animate-pulse" style={{ color: `${gold}40` }} strokeWidth={1} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div>
                    <h2 className="text-3xl md:text-4xl font-serif font-light tracking-widest uppercase mb-4" style={{ color: gold }}>
                      {storeName}
                    </h2>
                    <p className="text-xs tracking-[0.2em] text-gray-400 uppercase">Curated Luxury & Timepieces</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs tracking-widest uppercase mb-6" style={{ borderColor: `${gold}40`, color: gold }}>
                      <Play className="w-3 h-3 fill-current" /> Watch Brand Film
                    </div>
                    <h2 className="text-4xl md:text-6xl font-serif font-light tracking-wide leading-tight mb-6">
                      Timeless Excellence
                    </h2>
                    <a href="#products" className="inline-block px-10 py-4 text-xs tracking-[0.25em] uppercase font-medium border transition-all hover:bg-white/5" style={{ borderColor: gold, color: gold }}>
                      View Collection
                    </a>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-4xl md:text-7xl font-serif font-light tracking-wide leading-tight mb-8">
                      Eternal<br />Brilliance
                    </h2>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto mb-10 leading-relaxed">
                      Exceptional craftsmanship. Timeless elegance. Each piece, a masterwork.
                    </p>
                    <a href="#products" className="inline-block px-12 py-4 text-xs tracking-[0.25em] uppercase font-medium border transition-all hover:bg-white/5" style={{ borderColor: gold, color: gold }}>
                      Discover
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Category Filter Pills/Tabs */}
          {categories.length > 0 && (
            <div className="max-w-6xl mx-auto px-6 pt-6 pb-2">
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide justify-center flex-wrap">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-5 py-2 text-xs uppercase tracking-[0.2em] border transition-all"
                  style={{
                    borderColor: gold,
                    backgroundColor: !activeCategory ? gold : 'transparent',
                    color: !activeCategory ? tc.colors.background : gold,
                  }}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-5 py-2 text-xs uppercase tracking-[0.2em] border transition-all"
                    style={{
                      borderColor: gold,
                      backgroundColor: activeCategory === cat ? gold : 'transparent',
                      color: activeCategory === cat ? tc.colors.background : gold,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Product Section */}
          <main id="products" className="max-w-6xl mx-auto px-6 pb-32">
            <ThemeLayout variation={tc.layoutVariation} layout={tc.layout} colors={tc.colors} categories={categories} activeCategory={activeCategory}>
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block">
                    <div className="aspect-square overflow-hidden mb-6 relative border" style={{ backgroundColor: '#1A1A1A', borderColor: `${gold}20` }}>
                      {getStoreProductImage(p) ? (
                        <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={400} unoptimized className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Diamond className="w-12 h-12" style={{ color: `${gold}20` }} strokeWidth={1} />
                        </div>
                      )}
                    </div>
                    {p.category && <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: gold }}>{p.category}</p>}
                    <h3 className="text-lg font-serif font-light tracking-wide">{p.title}</h3>
                    <p className="text-sm mt-2" style={{ color: gold }}>{formatStorePrice(p)}</p>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20" style={{ color: `${gold}60` }}>
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-xs uppercase tracking-widest">No luxury items found</p>
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
