'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import React, { useState } from 'react';
import { ShoppingBag, Apple, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontFooter } from '../store/StorefrontFooter';
import { StorefrontHeader } from '../store/StorefrontHeader';

/** Fresh Theme — Grocery/health food, bright greens and whites. */
export function FreshTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const fresh = tc.colors.primary;

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
            <section className="py-16 text-center relative" style={{ backgroundColor: tc.colors.secondary }}>
              <div className="max-w-4xl mx-auto px-6">
                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-8 items-center text-left">
                    <div>
                      <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
                        Eat <span style={{ color: fresh }}>Fresh</span>,<br />Live Well
                      </h2>
                      <p className="text-sm text-gray-500 mb-6">
                        Premium organic and natural products delivered directly to your door with guaranteed freshness.
                      </p>
                      <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: fresh }}>
                        Shop Now
                      </a>
                    </div>
                    <div className="aspect-video rounded-2xl flex items-center justify-center bg-white shadow-sm border border-green-100">
                      <Apple className="w-16 h-16 animate-bounce" style={{ color: fresh }} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-2">
                      Fresh & Organic Essentials
                    </h2>
                    <p className="text-sm text-gray-500">Handpicked organic products for your everyday healthy lifestyle.</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 bg-white shadow-sm" style={{ color: fresh }}>
                      <Play className="w-3.5 h-3.5 fill-current" /> Farm to Table Story
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                      Pure & Organic Harvest
                    </h2>
                    <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: fresh }}>
                      Explore Products
                    </a>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                      Eat <span style={{ color: fresh }}>Fresh</span>,<br />Live Well
                    </h2>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mb-8">
                      Premium organic and natural products delivered to your door.
                    </p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: fresh }}>
                      Shop Now
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 pt-8 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-wrap justify-center">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                  style={{
                    backgroundColor: !activeCategory ? fresh : tc.colors.secondary,
                    color: !activeCategory ? '#ffffff' : tc.colors.text,
                  }}
                >
                  All Products
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                    style={{
                      backgroundColor: activeCategory === cat ? fresh : tc.colors.secondary,
                      color: activeCategory === cat ? '#ffffff' : tc.colors.text,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Product Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 py-12">
            <ThemeLayout variation={tc.layoutVariation} layout={tc.layout} colors={tc.colors} categories={categories} activeCategory={activeCategory}>
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-xl overflow-hidden border hover:shadow-md transition-all" style={{ backgroundColor: tc.colors.headerBg, borderColor: `${fresh}15` }}>
                    <div className="aspect-square overflow-hidden" style={{ backgroundColor: tc.colors.secondary }}>
                      {getStoreProductImage(p) ? (
                        <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={400} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-green-200" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: fresh }}>{p.category}</p>}
                      <h3 className="text-sm font-semibold line-clamp-1">{p.title}</h3>
                      <p className="text-sm font-bold mt-1" style={{ color: fresh }}>{formatStorePrice(p)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm font-medium">No fresh products found matching your search</p>
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
