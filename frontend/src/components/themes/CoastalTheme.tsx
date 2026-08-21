'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import React from 'react';
import { useStorefrontCatalogFilters } from '../../lib/storefront-catalog-state';
import { ShoppingBag, Waves, Play } from 'lucide-react';
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

/** Coastal Theme — Beach/resort, blues and sandy tones, relaxed vibe. */
export function CoastalTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);

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
    <div className="min-h-screen flex flex-col" style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
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
            <section className="py-20 text-center" style={{ background: `linear-gradient(180deg, ${tc.colors.secondary} 0%, transparent 100%)` }}>
              {tc.heroStyle === 'split' ? (
                <div className={`${tc.layout.container} flex items-center gap-12 text-left`}>
                  <div className="flex-1">
                    <Waves className="w-8 h-8 mb-4" style={{ color: tc.colors.primary }} strokeWidth={1.5} />
                    <h2 className="text-4xl md:text-5xl font-light leading-tight mb-4">Coastal<br /><span className="font-bold" style={{ color: tc.colors.primary }}>Living</span></h2>
                    <p className="text-sm max-w-md mb-8 leading-relaxed" style={{ color: `${tc.colors.text}70` }}>Inspired by the Mediterranean coast. Effortless style for sun-kissed days.</p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: tc.colors.primary }}>Explorer la collection</a>
                  </div>
                  <div className="flex-1 hidden md:block aspect-[4/3] rounded-2xl" style={{ backgroundColor: `${tc.colors.primary}15` }} />
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className={tc.layout.container}>
                  <Waves className="w-6 h-6 mx-auto mb-3" style={{ color: tc.colors.primary }} strokeWidth={1.5} />
                  <h2 className="text-2xl font-semibold">{storeName}</h2>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="max-w-2xl mx-auto px-6">
                  <div className="aspect-video rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: `${tc.colors.primary}15` }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: tc.colors.primary }}>
                      <Play className="w-6 h-6 ml-1" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Aperçu Collection</h2>
                </div>
              ) : (
                <>
                  <Waves className="w-8 h-8 mx-auto mb-4" style={{ color: tc.colors.primary }} strokeWidth={1.5} />
                  <h2 className="text-4xl md:text-6xl font-light leading-tight mb-6">Coastal<br /><span className="font-bold" style={{ color: tc.colors.primary }}>Living</span></h2>
                  <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed" style={{ color: `${tc.colors.text}70` }}>Inspired by the Mediterranean coast. Effortless style for sun-kissed days.</p>
                  <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: tc.colors.primary }}>Explorer la collection</a>
                </>
              )}
            </section>
          )}

          {/* Products Section */}
          <main id="products" className="pb-24 pt-8">
            {/* Category Filter Tabs */}
            {categories.length > 0 && (
              <div className="max-w-7xl mx-auto px-6 mb-8 flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: !activeCategory ? tc.colors.primary : tc.colors.secondary,
                    color: !activeCategory ? '#FFFFFF' : tc.colors.text,
                  }}
                >
                  Tous
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: activeCategory.toLowerCase() === cat.toLowerCase() ? tc.colors.primary : tc.colors.secondary,
                      color: activeCategory.toLowerCase() === cat.toLowerCase() ? '#FFFFFF' : tc.colors.text,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <ThemeLayout variation={tc.layoutVariation} layout={tc.layout} colors={tc.colors} categories={categories} activeCategory={activeCategory}>
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all" style={{ backgroundColor: tc.colors.headerBg }}>
                    <div className="aspect-square overflow-hidden" style={{ backgroundColor: `${tc.colors.primary}10` }}>
                      {getStoreProductImage(p) ? <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={400} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                        <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10" style={{ color: `${tc.colors.primary}30` }} /></div>
                      )}
                    </div>
                    <div className="p-4">
                      {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: tc.colors.primary }}>{p.category}</p>}
                      <h3 className="text-sm font-semibold" style={{ color: tc.colors.text }}>{p.title}</h3>
                      <p className="text-sm font-bold mt-1" style={{ color: tc.colors.accent }}>{formatStorePrice(p)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20 opacity-50">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" style={{ color: tc.colors.primary }} />
                  <p className="text-sm">Aucun produit trouvé</p>
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
