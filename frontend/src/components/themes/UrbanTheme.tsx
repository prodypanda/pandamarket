'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import React from 'react';
import { useStorefrontCatalogFilters } from '../../lib/storefront-catalog-state';
import { Flame, ShoppingBag, Play } from 'lucide-react';
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

/** Urban Theme — Street fashion, bold typography, high contrast. */
export function UrbanTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const accent = tc.colors.primary;

  const { searchQuery, setSearchQuery, activeCategory, setActiveCategory } = useStorefrontCatalogFilters();

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



      {children ? (
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <div className="flex-1">
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="bg-black text-white py-20 text-center">
              {tc.heroStyle === 'split' ? (
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center text-left">
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-white/20">
                      <Flame className="w-3 h-3" style={{ color: accent }} /> Hot Drops
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6">
                      Street<br /><span style={{ color: accent }}>Culture</span>
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">Bold. Unapologetic. Authentic.</p>
                    <a href="#products" className="inline-block px-8 py-3 text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{ backgroundColor: accent, color: '#fff' }}>Shop Now</a>
                  </div>
                  <div className="aspect-square border-4 border-white flex items-center justify-center p-8 bg-gray-900">
                    <Flame className="w-20 h-20" style={{ color: accent }} />
                  </div>
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className="max-w-3xl mx-auto px-6 py-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-black uppercase tracking-widest mb-2 border border-white/20">
                    <Flame className="w-3 h-3" style={{ color: accent }} /> Hot Drops
                  </div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">{storeName}</h2>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="max-w-3xl mx-auto px-6">
                  <div className="aspect-video border-4 border-white bg-gray-900 flex items-center justify-center mb-6">
                    <div className="w-16 h-16 border-2 border-white flex items-center justify-center" style={{ backgroundColor: accent }}>
                      <Play className="w-8 h-8 fill-current text-white ml-1" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Drop Teaser</h2>
                </div>
              ) : (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-white/20">
                    <Flame className="w-3 h-3" style={{ color: accent }} /> Hot Drops
                  </div>
                  <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-6">
                    Street<br /><span style={{ color: accent }}>Culture</span>
                  </h2>
                  <p className="text-sm text-gray-400 max-w-md mx-auto mb-8">Bold. Unapologetic. Authentic.</p>
                  <a href="#products" className="inline-block px-8 py-3 text-sm font-black uppercase tracking-wider transition-all hover:scale-105" style={{ backgroundColor: accent, color: '#fff' }}>Shop Now</a>
                </>
              )}
            </section>
          )}

          {/* Products Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 py-16">
            {/* Category Filter Buttons */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
                    !activeCategory ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  ALL
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-black transition-all ${
                      activeCategory.toLowerCase() === cat.toLowerCase() ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className={`grid ${tc.gridClasses}`}>
              {displayProducts.map((p) => (
                <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block border-2 border-black overflow-hidden hover:bg-black hover:text-white transition-all duration-300">
                  <div className="aspect-square overflow-hidden bg-gray-100 group-hover:bg-gray-900">
                    {getStoreProductImage(p) ? <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={400} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                      <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10 text-gray-300 group-hover:text-gray-600" /></div>
                    )}
                  </div>
                  <div className="p-4">
                    {p.category && <p className="text-[10px] tracking-widest uppercase font-black mb-1" style={{ color: accent }}>{p.category}</p>}
                    <h3 className="text-sm font-black uppercase">{p.title}</h3>
                    <p className="text-sm font-bold mt-1">{formatStorePrice(p)}</p>
                  </div>
                </Link>
              ))}
            </div>

            {displayProducts.length === 0 && (
              <div className="text-center py-20 border-2 border-dashed border-gray-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="font-black uppercase text-sm">NO DROPS FOUND</p>
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
