'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import React from 'react';
import { useStorefrontCatalogFilters } from '../../lib/storefront-catalog-state';
import { ShoppingBag, MapPin, Star, Play } from 'lucide-react';
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
import { StorefrontHeader } from '../store/StorefrontHeader';
import { StorefrontFooter } from '../store/StorefrontFooter';

export function ArtisanTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const earthBrown = tc.colors.primary;

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
        variant="classic"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />


      {children ? (
        <main className="py-8 max-w-6xl mx-auto px-6 flex-1 w-full">{children}</main>
      ) : (
        <div className="flex-1 w-full">
          {/* Hero (respects heroStyle: banner, split, minimal, video, none) */}
          {tc.heroStyle !== 'none' && (
            <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
              {tc.heroStyle === 'split' ? (
                <div className="flex flex-col md:flex-row items-center gap-12 text-left">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-4 h-4" style={{ color: earthBrown }} />
                      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: earthBrown }}>
                        Fait main en Tunisie
                      </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-semibold font-serif leading-tight mb-5">
                      Des créations<br />
                      <span style={{ color: earthBrown }}>authentiques</span>,<br />
                      faites avec amour
                    </h2>
                    <p className="text-base opacity-75 leading-relaxed mb-8 max-w-lg">
                      Chaque pièce raconte une histoire. Découvrez notre collection de produits artisanaux,
                      fabriqués avec des matériaux naturels et un savoir-faire ancestral.
                    </p>
                    <div className="flex items-center gap-4">
                      <a
                        href="#products"
                        className="px-7 py-3 rounded-full text-sm font-medium text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                        style={{ backgroundColor: earthBrown }}
                      >
                        Voir la collection
                      </a>
                      <div className="flex items-center gap-1 text-sm opacity-70">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span>4.9 — 200+ avis</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 w-full aspect-[4/3] rounded-2xl bg-[#F5EDE3] border border-[#5C4033]/15 flex items-center justify-center">
                    <ShoppingBag className="w-16 h-16 text-[#5C4033]/30" />
                  </div>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="max-w-3xl mx-auto text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <MapPin className="w-4 h-4" style={{ color: earthBrown }} />
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: earthBrown }}>
                      Au Cœur de nos Ateliers
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-semibold font-serif leading-tight mb-6">
                    L&apos;artisanat en action chez <span style={{ color: earthBrown }}>{storeName}</span>
                  </h2>
                  <div className="relative aspect-video rounded-2xl bg-[#F5EDE3] border border-[#5C4033]/20 flex items-center justify-center group cursor-pointer shadow-md">
                    <div className="w-16 h-16 rounded-full text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: earthBrown }}>
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </div>
                  </div>
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className="max-w-xl mx-auto text-center py-6">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <MapPin className="w-4 h-4" style={{ color: earthBrown }} />
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: earthBrown }}>
                      Produits Fait Main
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-semibold font-serif">{storeName}</h2>
                </div>
              ) : (
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4" style={{ color: earthBrown }} />
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: earthBrown }}>
                      Fait main en Tunisie
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-semibold font-serif leading-tight mb-5">
                    Des créations<br />
                    <span style={{ color: earthBrown }}>authentiques</span>,<br />
                    faites avec amour
                  </h2>
                  <p className="text-base opacity-75 leading-relaxed mb-8 max-w-lg">
                    Chaque pièce raconte une histoire. Découvrez notre collection de produits artisanaux,
                    fabriqués avec des matériaux naturels et un savoir-faire ancestral.
                  </p>
                  <div className="flex items-center gap-4">
                    <a
                      href="#products"
                      className="px-7 py-3 rounded-full text-sm font-medium text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                      style={{ backgroundColor: earthBrown }}
                    >
                      Voir la collection
                    </a>
                    <div className="flex items-center gap-1 text-sm opacity-70">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>4.9 — 200+ avis</span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Category Pills */}
          {categories.length > 0 && (
            <div className="max-w-6xl mx-auto px-6 mb-10">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                    !activeCategory
                      ? 'text-white border-transparent'
                      : 'bg-white border-[#5C4033]/15 text-[#3E2723]/70 hover:border-[#5C4033]/30'
                  }`}
                  style={!activeCategory ? { backgroundColor: earthBrown } : {}}
                >
                  Tout
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                      activeCategory === cat
                        ? 'text-white border-transparent'
                        : 'bg-white border-[#5C4033]/15 text-[#3E2723]/70 hover:border-[#5C4033]/30'
                    }`}
                    style={activeCategory === cat ? { backgroundColor: earthBrown } : {}}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Product Section */}
          <main id="products" className="max-w-6xl mx-auto px-6 pb-24">
            <ThemeLayout
              variation={tc.layoutVariation}
              layout={tc.layout}
              colors={tc.colors}
              categories={categories}
              activeCategory={activeCategory}
            >
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={getStorefrontProductPath(p, branding?.store_path_base)}
                    className="group bg-white rounded-xl overflow-hidden border border-[#5C4033]/8 hover:shadow-md transition-all duration-300 block"
                  >
                    <div className="aspect-square overflow-hidden bg-[#F5EDE3]">
                      {getStoreProductImage(p) ? (
                        <Image
                          src={getStoreProductImage(p)}
                          alt={p.title}
                          width={400}
                          height={400}
                          unoptimized
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#5C4033]/20">
                          <ShoppingBag className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      {p.category && (
                        <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: earthBrown }}>
                          {p.category}
                        </p>
                      )}
                      <h3 className="text-sm font-medium line-clamp-1">{p.title}</h3>
                      <p className="text-sm font-semibold mt-1.5" style={{ color: earthBrown }}>
                        {formatStorePrice(p)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20 opacity-50">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm">Aucun produit ne correspond à votre recherche</p>
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
