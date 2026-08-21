'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import React from 'react';
import { useStorefrontCatalogFilters } from '../../lib/storefront-catalog-state';
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
 * Medina Theme — Traditional marketplace feel, ornate borders, warm colors.
 * Deep teal and gold palette, arch-shaped elements, rich textures.
 */
export function MedinaTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const gold = tc.colors.primary;
  const teal = tc.colors.accent;

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
            <section className="py-16 text-center relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${teal}08 0%, transparent 100%)` }}>
              <div className="max-w-4xl mx-auto px-6">
                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-8 items-center text-left">
                    <div>
                      <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold mb-4 border" style={{ borderColor: gold, color: gold }}>★ Fait Main ★</div>
                      <h2 className="text-3xl md:text-5xl font-serif font-bold leading-tight mb-4" style={{ color: teal }}>Au Cœur<br />de la Médina</h2>
                      <p className="text-xs md:text-sm mb-6 leading-relaxed" style={{ color: '#8B7355' }}>Chaque pièce raconte une histoire. Artisanat tunisien d&apos;exception.</p>
                      <a href="#products" className="inline-block px-6 py-2.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: teal }}>Découvrir le Souk</a>
                    </div>
                    <div className="aspect-square rounded-2xl border-2 flex items-center justify-center p-8" style={{ borderColor: `${gold}40`, backgroundColor: `${teal}05` }}>
                      <ShoppingBag className="w-16 h-16" style={{ color: `${gold}50` }} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div className="py-6">
                    <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold mb-3 border" style={{ borderColor: gold, color: gold }}>★ Fait Main ★</div>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold" style={{ color: teal }}>{storeName}</h2>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div className="max-w-2xl mx-auto">
                    <div className="aspect-video rounded-2xl border-2 flex items-center justify-center mb-6 relative overflow-hidden" style={{ borderColor: `${gold}40`, backgroundColor: `${teal}10` }}>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: teal }}>
                        <Play className="w-6 h-6 ml-1" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: teal }}>L&apos;Artisanat en Vidéo</h2>
                  </div>
                ) : (
                  <>
                    <div className="inline-block px-6 py-1 rounded-full text-xs font-semibold mb-6 border" style={{ borderColor: gold, color: gold }}>★ Fait Main ★</div>
                    <h2 className="text-4xl md:text-6xl font-serif font-bold leading-tight mb-6" style={{ color: teal }}>Au Cœur<br />de la Médina</h2>
                    <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed" style={{ color: '#8B7355' }}>Chaque pièce raconte une histoire. Artisanat tunisien d&apos;exception.</p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: teal }}>Découvrir le Souk</a>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Main Product Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 pb-24 pt-8">
            {/* Category Filter Tabs */}
            {categories.length > 0 && (
              <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-8">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`px-4 py-1.5 rounded-full text-xs font-serif font-semibold transition-all ${
                    !activeCategory
                      ? 'text-white shadow-sm'
                      : 'border text-gray-700 hover:border-amber-700'
                  }`}
                  style={{
                    backgroundColor: !activeCategory ? teal : 'transparent',
                    borderColor: !activeCategory ? teal : `${gold}40`,
                  }}
                >
                  Tous
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-serif font-semibold transition-all ${
                      activeCategory.toLowerCase() === cat.toLowerCase()
                        ? 'text-white shadow-sm'
                        : 'border text-gray-700 hover:border-amber-700'
                    }`}
                    style={{
                      backgroundColor: activeCategory.toLowerCase() === cat.toLowerCase() ? teal : 'transparent',
                      borderColor: activeCategory.toLowerCase() === cat.toLowerCase() ? teal : `${gold}40`,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className={`grid ${tc.gridClasses}`}>
              {displayProducts.map((p) => (
                <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-xl overflow-hidden border-2 transition-all hover:shadow-lg" style={{ borderColor: `${gold}20`, backgroundColor: '#FFFDF8' }}>
                  <div className="aspect-square overflow-hidden" style={{ backgroundColor: `${teal}08` }}>
                    {getStoreProductImage(p) ? <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={400} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
                      <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10" style={{ color: `${gold}30` }} /></div>
                    )}
                  </div>
                  <div className="p-4 text-center">
                    {p.category && <p className="text-[10px] tracking-widest uppercase font-semibold mb-1" style={{ color: gold }}>{p.category}</p>}
                    <h3 className="text-sm font-serif font-semibold">{p.title}</h3>
                    <p className="text-sm font-bold mt-1" style={{ color: teal }}>{formatStorePrice(p)}</p>
                  </div>
                </Link>
              ))}
            </div>

            {displayProducts.length === 0 && (
              <div className="text-center py-20 opacity-60">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" style={{ color: gold }} />
                <p className="font-serif">Aucun produit trouvé</p>
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
