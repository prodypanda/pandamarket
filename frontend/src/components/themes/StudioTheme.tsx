'use client';

import React from 'react';
import { useStorefrontCatalogFilters } from '../../lib/storefront-catalog-state';
import { Camera, Play } from 'lucide-react';
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

/** Studio Theme — Photography/art portfolio style, gallery-focused layout. */
export function StudioTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
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
            <section className="py-20 text-center">
              {tc.heroStyle === 'split' ? (
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center text-left">
                  <div>
                    <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: accent }}>Portfolio & Shop</p>
                    <h2 className="text-4xl md:text-5xl font-light leading-tight mb-6">Art Meets<br /><span className="font-bold" style={{ color: accent }}>Commerce</span></h2>
                    <p className="text-sm text-gray-500 mb-8 max-w-md">Original works and limited editions. Each piece tells a story.</p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>View Gallery</a>
                  </div>
                  <div className="aspect-[4/3] rounded-xl bg-gray-100 flex items-center justify-center">
                    <Camera className="w-16 h-16 text-gray-300" strokeWidth={1} />
                  </div>
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className="max-w-3xl mx-auto px-6 py-4">
                  <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: accent }}>Portfolio & Shop</p>
                  <h2 className="text-2xl font-light">{storeName}</h2>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="max-w-3xl mx-auto px-6">
                  <div className="aspect-video rounded-xl bg-gray-100 flex items-center justify-center mb-6">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: accent }}>
                      <Play className="w-6 h-6 ml-1" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-light mb-2">Behind the Lens</h2>
                </div>
              ) : (
                <>
                  <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: accent }}>Portfolio & Shop</p>
                  <h2 className="text-4xl md:text-6xl font-light leading-tight mb-6">Art Meets<br /><span className="font-bold" style={{ color: accent }}>Commerce</span></h2>
                  <p className="text-sm text-gray-500 max-w-md mx-auto mb-8">Original works and limited editions. Each piece tells a story.</p>
                  <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>View Gallery</a>
                </>
              )}
            </section>
          )}

          {/* Products Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
            {/* Category Filter Tabs */}
            {categories.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: !activeCategory ? accent : 'transparent',
                    color: !activeCategory ? '#FFFFFF' : tc.colors.text,
                    border: !activeCategory ? 'none' : '1px solid rgba(156,163,175,0.3)',
                  }}
                >
                  All Works
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      backgroundColor: activeCategory.toLowerCase() === cat.toLowerCase() ? accent : 'transparent',
                      color: activeCategory.toLowerCase() === cat.toLowerCase() ? '#FFFFFF' : tc.colors.text,
                      border: activeCategory.toLowerCase() === cat.toLowerCase() ? 'none' : '1px solid rgba(156,163,175,0.3)',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className={`grid ${tc.gridClasses}`}>
              {displayProducts.map((p) => (
                <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all">
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                    {getStoreProductImage(p) ? <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={300} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera className="w-10 h-10" strokeWidth={1} /></div>
                    )}
                  </div>
                  <div className="p-4">
                    {p.category && <p className="text-[10px] tracking-widest uppercase font-medium mb-1" style={{ color: accent }}>{p.category}</p>}
                    <h3 className="text-sm font-medium">{p.title}</h3>
                    <p className="text-sm mt-1" style={{ color: accent }}>{formatStorePrice(p)}</p>
                  </div>
                </Link>
              ))}
            </div>

            {displayProducts.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Camera className="w-12 h-12 mx-auto mb-4 text-gray-300" strokeWidth={1} />
                <p className="text-sm">No artworks found</p>
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
