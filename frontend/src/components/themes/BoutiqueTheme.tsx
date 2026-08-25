'use client';

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
import { ThemeLayout } from './ThemeLayout';
import { StorefrontFooter } from '../store/StorefrontFooter';
import { StorefrontHeader } from '../store/StorefrontHeader';

/**
 * Boutique Theme — Luxury fashion & lifestyle.
 * Warm ivory background, gold accents, serif typography,
 * generous whitespace, editorial-style product grid.
 */
export function BoutiqueTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const goldAccent = tc.colors.accent;

  const { searchQuery, setSearchQuery, activeCategory, setActiveCategory } = useStorefrontCatalogFilters();

  const allProducts = products;

  const categories = Array.from(new Set(allProducts.map((p) => p.category).filter(Boolean))) as string[];

  const displayProducts = allProducts.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCat = (p.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCat) return false;
    }
    if (activeCategory && p.category !== activeCategory) return false;
    return true;
  });

  return (
    <div
      className={`${theme.typography.fontFamily} min-h-screen flex flex-col`}
      style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}
    >
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
        <main className="py-8 max-w-7xl mx-auto px-6 flex-1 w-full">{children}</main>
      ) : (
        <div className="flex-1 w-full">
          {/* Hero (respects heroStyle: banner, split, minimal, video, none) */}
          {tc.heroStyle !== 'none' && (
            <section className="max-w-7xl mx-auto px-6 py-16 md:py-24 text-center">
              {tc.heroStyle === 'split' ? (
                <div className="flex flex-col md:flex-row items-center gap-12 text-left">
                  <div className="flex-1">
                    <p className="text-xs tracking-[0.3em] uppercase mb-4 font-medium" style={{ color: goldAccent }}>
                      Collection Printemps 2026
                    </p>
                    <h2 className="text-4xl md:text-5xl font-light tracking-[0.1em] uppercase font-serif mb-6 leading-tight">
                      {storeName}
                    </h2>
                    <p className="text-sm opacity-70 max-w-md mb-8 leading-relaxed">
                      Découvrez notre sélection de pièces d&apos;exception confectionnées avec précision et passion.
                    </p>
                    <a
                      href="#products"
                      className="inline-block px-10 py-3 text-xs tracking-[0.2em] uppercase font-medium border transition-all hover:scale-[1.02]"
                      style={{ borderColor: goldAccent, color: goldAccent }}
                    >
                      Découvrir
                    </a>
                  </div>
                  <div className="flex-1 w-full aspect-[3/4] border p-4 bg-[#EDE8E1]" style={{ borderColor: `${goldAccent}40` }}>
                    <div className="w-full h-full border border-dashed flex items-center justify-center" style={{ borderColor: `${goldAccent}60` }}>
                      <ShoppingBag className="w-12 h-12 opacity-30" strokeWidth={1} />
                    </div>
                  </div>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="max-w-3xl mx-auto">
                  <p className="text-xs tracking-[0.3em] uppercase mb-4 font-medium" style={{ color: goldAccent }}>
                    Savoir-faire & Maison
                  </p>
                  <h2 className="text-3xl md:text-5xl font-light tracking-[0.1em] uppercase font-serif mb-8">
                    {storeName}
                  </h2>
                  <div className="relative aspect-video border bg-[#EDE8E1] flex items-center justify-center group cursor-pointer" style={{ borderColor: `${goldAccent}40` }}>
                    <div className="w-14 h-14 rounded-full border flex items-center justify-center group-hover:scale-110 transition-transform" style={{ borderColor: goldAccent, color: goldAccent }}>
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className="max-w-xl mx-auto py-6">
                  <p className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium" style={{ color: goldAccent }}>
                    Maison {storeName}
                  </p>
                  <h2 className="text-3xl md:text-4xl font-light tracking-[0.15em] uppercase font-serif">
                    Élégance Intemporelle
                  </h2>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  <p className="text-xs tracking-[0.3em] uppercase mb-4 font-medium" style={{ color: goldAccent }}>
                    Collection Exclusive 2026
                  </p>
                  <h2 className="text-4xl md:text-6xl font-light tracking-[0.1em] uppercase font-serif mb-6 leading-tight">
                    L&apos;Élégance<br />Redéfinie
                  </h2>
                  <p className="text-sm opacity-70 max-w-md mx-auto mb-8 leading-relaxed">
                    Découvrez notre sélection de pièces intemporelles, confectionnées avec les matériaux les plus nobles.
                  </p>
                  <a
                    href="#products"
                    className="inline-block px-10 py-3 text-xs tracking-[0.2em] uppercase font-medium border transition-all hover:scale-[1.02]"
                    style={{ borderColor: goldAccent, color: goldAccent }}
                  >
                    Découvrir la collection
                  </a>
                </div>
              )}
            </section>
          )}

          {/* Category Filter Tabs */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 mb-12 flex flex-wrap justify-center gap-6 text-xs tracking-[0.15em] uppercase">
              <button
                onClick={() => setActiveCategory('')}
                className={`pb-1 border-b-2 transition-all ${!activeCategory ? 'font-bold' : 'opacity-60 hover:opacity-100'}`}
                style={{ borderColor: !activeCategory ? goldAccent : 'transparent' }}
              >
                Tout
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`pb-1 border-b-2 transition-all ${activeCategory === cat ? 'font-bold' : 'opacity-60 hover:opacity-100'}`}
                  style={{ borderColor: activeCategory === cat ? goldAccent : 'transparent' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Main Product Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
            <ThemeLayout
              variation={tc.layoutVariation}
              layout={tc.layout}
              colors={tc.colors}
              categories={categories}
              activeCategory={activeCategory}
            >
              <div className={`grid ${tc.gridClasses}`} style={{ rowGap: '3.5rem' }}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block">
                    <div className="aspect-[3/4] mb-5 overflow-hidden bg-[#EDE8E1]">
                      {getStoreProductImage(p) ? (
                        <Image
                          src={getStoreProductImage(p)}
                          alt={p.title}
                          width={400}
                          height={533}
                          unoptimized
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#C9A96E]/40">
                          <ShoppingBag className="w-10 h-10" strokeWidth={1} />
                        </div>
                      )}
                    </div>
                    {p.category && (
                      <p className="text-[10px] tracking-[0.2em] uppercase mb-1" style={{ color: goldAccent }}>
                        {p.category}
                      </p>
                    )}
                    <h3 className="text-sm font-medium tracking-wide">{p.title}</h3>
                    <p className="text-sm mt-1" style={{ color: goldAccent }}>
                      {formatStorePrice(p)}
                    </p>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20 opacity-50">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" strokeWidth={1} />
                  <p className="text-sm tracking-wide">Aucun produit ne correspond à votre recherche</p>
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
