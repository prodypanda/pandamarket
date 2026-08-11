'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import React, { useState } from 'react';
import { ShoppingBag, UtensilsCrossed, Clock, Flame, ChevronRight, Play } from 'lucide-react';
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
 * Flavor Theme — Food, restaurants, bakeries, gourmet products.
 * Warm off-white background, burnt orange/terracotta accent,
 * bold typography, appetizing card layout with rounded corners.
 */
export function FlavorTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const accentColor = tc.colors.primary;

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



      {/* Main Content Body */}
      {children ? (
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <div className="flex-1">
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="max-w-6xl mx-auto px-6 py-12 md:py-20">
              {tc.heroStyle === 'split' ? (
                <div className="grid md:grid-cols-2 gap-10 items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
                      <Flame className="w-3.5 h-3.5" />
                      Fait maison avec passion
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-5">
                      Des saveurs <span style={{ color: accentColor }}>authentiques</span>
                    </h2>
                    <p className="text-base opacity-70 leading-relaxed mb-8">
                      Découvrez nos produits artisanaux préparés avec des ingrédients frais et locaux.
                    </p>
                    <a href="#products" className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:shadow-lg hover:scale-[1.02]" style={{ backgroundColor: accentColor }}>
                      Commander maintenant
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="rounded-3xl p-8 aspect-video flex items-center justify-center border" style={{ backgroundColor: `${accentColor}08`, borderColor: `${accentColor}20` }}>
                    <UtensilsCrossed className="w-20 h-20" style={{ color: `${accentColor}50` }} />
                  </div>
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className="text-center py-6">
                  <h2 className="text-3xl font-extrabold mb-2">{storeName}</h2>
                  <p className="text-sm opacity-60">Produits artisanaux & gourmands</p>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="text-center max-w-3xl mx-auto">
                  <div className="relative aspect-video rounded-3xl overflow-hidden flex items-center justify-center mb-8 border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}20` }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Notre Savoir-Faire</h2>
                  <a href="#products" className="inline-block px-7 py-3 rounded-2xl text-sm font-bold text-white" style={{ backgroundColor: accentColor }}>
                    Voir le menu
                  </a>
                </div>
              ) : (
                <div className="text-center max-w-2xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
                    <Flame className="w-3.5 h-3.5" />
                    Fait maison avec passion
                  </div>
                  <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
                    Des saveurs<br />
                    <span style={{ color: accentColor }}>authentiques</span>
                  </h2>
                  <p className="text-base opacity-70 leading-relaxed mb-8 max-w-md mx-auto">
                    Découvrez nos produits artisanaux préparés avec des ingrédients frais et locaux. Livraison à domicile.
                  </p>
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <a href="#products" className="px-7 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: accentColor }}>
                      Commander maintenant
                    </a>
                    <div className="flex items-center gap-1.5 text-sm opacity-60">
                      <Clock className="w-4 h-4" />
                      <span>Livraison en 24-48h</span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="max-w-6xl mx-auto px-6 mb-10">
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`px-5 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all ${
                    !activeCategory ? 'text-white shadow-md' : 'bg-white border text-gray-600 hover:border-gray-300'
                  }`}
                  style={!activeCategory ? { backgroundColor: accentColor } : { borderColor: `${tc.colors.text}20` }}
                >
                  Tout
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all ${
                      activeCategory.toLowerCase() === cat.toLowerCase() ? 'text-white shadow-md' : 'bg-white border text-gray-600 hover:border-gray-300'
                    }`}
                    style={activeCategory.toLowerCase() === cat.toLowerCase() ? { backgroundColor: accentColor } : { borderColor: `${tc.colors.text}20` }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          <main id="products" className="max-w-6xl mx-auto px-6 pb-24">
            <div className={`grid ${tc.gridClasses}`}>
              {displayProducts.map((p) => (
                <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block bg-white rounded-2xl overflow-hidden border hover:shadow-lg transition-all duration-300" style={{ borderColor: `${tc.colors.text}10` }}>
                  <div className="aspect-[4/3] overflow-hidden bg-orange-50 relative">
                    {getStoreProductImage(p) ? (
                      <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={300} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: `${accentColor}20` }}>
                        <ShoppingBag className="w-10 h-10" />
                      </div>
                    )}
                    {p.category && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-sm" style={{ color: accentColor }}>
                        {p.category}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold line-clamp-1 mb-1.5" style={{ color: tc.colors.text }}>{p.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-extrabold" style={{ color: accentColor }}>{formatStorePrice(p)}</span>
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-75" style={{ backgroundColor: accentColor }}>
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {displayProducts.length === 0 && (
              <div className="text-center py-20 opacity-40">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm">Aucun produit pour le moment</p>
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
