'use client';

import React from 'react';
import { useStorefrontCatalogFilters } from '../../lib/storefront-catalog-state';
import { ShoppingBag, Sun, Play, ChevronRight } from 'lucide-react';
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
 * Sahara Theme — Warm desert tones, Tunisian-inspired patterns.
 * Sandy backgrounds, terracotta accents, geometric borders,
 * warm typography, Mediterranean feel.
 */
export function SaharaTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
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



      {/* Main Body */}
      {children ? (
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <div className="flex-1">
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="py-16 md:py-24 text-center" style={{ background: `linear-gradient(180deg, ${accent}08 0%, transparent 100%)` }}>
              <div className="max-w-7xl mx-auto px-6">
                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-10 items-center text-left">
                    <div>
                      <p className="text-xs tracking-[0.25em] uppercase mb-4 font-semibold" style={{ color: accent }}>Artisanat Tunisien</p>
                      <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">Trésors du <span style={{ color: accent }}>Sahara</span></h2>
                      <p className="text-sm max-w-md mb-8 leading-relaxed opacity-80">Pièces uniques inspirées par les traditions millénaires du désert tunisien.</p>
                      <a href="#products" className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>
                        Explorer
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                    <div className="aspect-video rounded-2xl flex items-center justify-center border p-8 bg-[#FFFBF5]" style={{ borderColor: `${accent}20` }}>
                      <Sun className="w-20 h-20" style={{ color: `${accent}40` }} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div className="py-4">
                    <h2 className="text-3xl font-bold mb-2">{storeName}</h2>
                    <p className="text-xs tracking-widest uppercase opacity-70">Artisanat & Traditions du Sahara</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div className="max-w-3xl mx-auto">
                    <div className="aspect-video rounded-2xl border overflow-hidden flex items-center justify-center mb-8 bg-[#FFFBF5]" style={{ borderColor: `${accent}30` }}>
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: accent }}>
                        <Play className="w-8 h-8 fill-current ml-1" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Film Artisanal</h2>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: accent }}>
                      Découvrir la collection
                    </a>
                  </div>
                ) : (
                  <>
                    <p className="text-xs tracking-[0.25em] uppercase mb-4 font-semibold" style={{ color: accent }}>Artisanat Tunisien</p>
                    <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-6">Trésors du<br />Sahara</h2>
                    <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed opacity-80">Pièces uniques inspirées par les traditions millénaires du désert tunisien.</p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>Explorer</a>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Category Filter Tabs */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 mb-8 flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveCategory('')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${!activeCategory ? 'text-white' : 'bg-transparent opacity-70 hover:opacity-100'}`}
                style={!activeCategory ? { backgroundColor: accent, borderColor: accent } : { borderColor: `${accent}30` }}
              >
                Tout
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'text-white' : 'bg-transparent opacity-70 hover:opacity-100'}`}
                  style={activeCategory.toLowerCase() === cat.toLowerCase() ? { backgroundColor: accent, borderColor: accent } : { borderColor: `${accent}30` }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Products */}
          <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
            <div className={`grid ${tc.gridClasses}`}>
              {displayProducts.map((p) => (
                <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-xl overflow-hidden border transition-all hover:shadow-lg" style={{ borderColor: `${accent}15`, backgroundColor: '#FFFBF5' }}>
                  <div className="aspect-square overflow-hidden bg-[#F5EDE3] relative">
                    {getStoreProductImage(p) ? (
                      <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={400} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10" style={{ color: `${accent}25` }} /></div>
                    )}
                    {p.category && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-white/90" style={{ color: accent }}>
                        {p.category}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold line-clamp-1">{p.title}</h3>
                    <p className="text-sm font-bold mt-1" style={{ color: accent }}>{formatStorePrice(p)}</p>
                  </div>
                </Link>
              ))}
            </div>
            {displayProducts.length === 0 && (
              <div className="text-center py-20 opacity-40">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm">Aucun produit trouvé</p>
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
