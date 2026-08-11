'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import React, { useState } from 'react';
import { ShoppingBag, Play } from 'lucide-react';
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
import { StorefrontFooter } from '../store/StorefrontFooter';
import { StorefrontHeader } from '../store/StorefrontHeader';

/**
 * Elegance Theme — Minimalist luxury with generous whitespace.
 * Serif headings (font-serif), muted palette, editorial grid, large imagery, understated sophistication.
 */
export function EleganceTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');

  const allProducts = products;

  const categories = Array.from(new Set(allProducts.map((p) => p.category).filter(Boolean))) as string[];

  const displayProducts = allProducts.filter((product) => {
    const matchesSearch =
      !searchQuery.trim() ||
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      !activeCategory ||
      product.category?.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`${theme.typography.fontFamily} min-h-screen flex flex-col`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
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



      {/* Main Body */}
      {children ? (
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <div className="flex-1">
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
              {tc.heroStyle === 'split' ? (
                <div className="grid md:grid-cols-2 gap-12 items-center text-left">
                  <div>
                    <p className="text-xs tracking-[0.3em] uppercase opacity-50 mb-4">Curated Selection</p>
                    <h2 className="text-4xl md:text-6xl font-serif font-light leading-[1.1] mb-6">
                      Less is<br />More
                    </h2>
                    <p className="text-sm opacity-60 max-w-sm leading-relaxed mb-8">
                      Timeless pieces crafted with intention. Quality over quantity, always.
                    </p>
                    <a
                      href="#products"
                      className="inline-block px-10 py-3.5 text-xs tracking-[0.2em] uppercase border transition-all duration-300 hover:bg-black hover:text-white"
                      style={{ borderColor: `${tc.colors.text}40` }}
                    >
                      Shop Now
                    </a>
                  </div>
                  <div className="aspect-[3/4] max-w-sm mx-auto w-full bg-stone-100 flex items-center justify-center p-8 border" style={{ borderColor: `${tc.colors.text}10` }}>
                    <ShoppingBag className="w-16 h-16 opacity-20" strokeWidth={1} />
                  </div>
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className="py-8">
                  <h2 className="text-3xl font-serif font-light tracking-widest uppercase mb-2">{storeName}</h2>
                  <p className="text-xs tracking-[0.25em] uppercase opacity-50">Luxury & Elegance</p>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="max-w-3xl mx-auto">
                  <div className="aspect-video bg-stone-100 flex items-center justify-center mb-8 border" style={{ borderColor: `${tc.colors.text}10` }}>
                    <div className="w-14 h-14 rounded-full border border-black/20 flex items-center justify-center">
                      <Play className="w-6 h-6 fill-current ml-1 opacity-70" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-serif font-light tracking-wide mb-4">Editorial Film</h2>
                  <a href="#products" className="inline-block px-8 py-3 text-xs tracking-[0.2em] uppercase border" style={{ borderColor: `${tc.colors.text}40` }}>
                    Explore Collection
                  </a>
                </div>
              ) : (
                <>
                  <p className="text-xs tracking-[0.3em] uppercase opacity-50 mb-6">Curated Selection</p>
                  <h2 className="text-5xl md:text-7xl font-serif font-light leading-[1.1] mb-8">
                    Less is<br />More
                  </h2>
                  <p className="text-sm opacity-60 max-w-sm mx-auto leading-relaxed mb-10">
                    Timeless pieces crafted with intention. Quality over quantity, always.
                  </p>
                  <a
                    href="#products"
                    className="inline-block px-12 py-4 text-xs tracking-[0.2em] uppercase border transition-all duration-300 hover:bg-black hover:text-white"
                    style={{ borderColor: `${tc.colors.text}40` }}
                  >
                    Shop Now
                  </a>
                </>
              )}
            </section>
          )}

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="max-w-6xl mx-auto px-6 mb-12 flex justify-center flex-wrap gap-6 text-xs tracking-[0.2em] uppercase">
              <button
                onClick={() => setActiveCategory('')}
                className={`pb-1 border-b-2 transition-all ${!activeCategory ? 'font-bold border-current opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
              >
                Tout
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`pb-1 border-b-2 transition-all ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'font-bold border-current opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Products Grid */}
          <main id="products" className="max-w-6xl mx-auto px-6 pb-32">
            <div className={`grid ${tc.gridClasses}`}>
              {displayProducts.map((p) => (
                <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block">
                  <div className="aspect-[3/4] mb-6 overflow-hidden bg-gray-100 relative">
                    {getStoreProductImage(p) ? (
                      <Image
                        src={getStoreProductImage(p)}
                        alt={p.title}
                        width={400}
                        height={533}
                        unoptimized
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-30">
                        <ShoppingBag className="w-8 h-8" strokeWidth={1} />
                      </div>
                    )}
                    {p.category && (
                      <span className="absolute top-3 left-3 text-[9px] tracking-[0.2em] uppercase font-semibold px-2 py-0.5 bg-white/80 backdrop-blur-sm">
                        {p.category}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-serif tracking-wide">{p.title}</h3>
                  <p className="text-xs opacity-60 mt-2">{formatStorePrice(p)}</p>
                </Link>
              ))}
            </div>
            {displayProducts.length === 0 && (
              <div className="text-center py-20 opacity-40">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" strokeWidth={1} />
                <p className="text-sm tracking-wide">No products yet</p>
              </div>
            )}
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
