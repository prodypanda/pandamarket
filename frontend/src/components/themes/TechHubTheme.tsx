'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import React, { useState } from 'react';
import { ShoppingBag, Zap, ChevronRight, Cpu, Play } from 'lucide-react';
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
 * TechHub Theme — Electronics, gadgets, tech products.
 * Dark background, cyan/electric blue accents, sharp edges,
 * grid-based layout with spec-card style product cards.
 */
export function TechHubTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
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



      {/* Body Content */}
      {children ? (
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <div className="flex-1">
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[150px] opacity-10"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
              <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                      <div
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border"
                        style={{ borderColor: `${accentColor}40`, color: accentColor, backgroundColor: `${accentColor}10` }}
                      >
                        <Zap className="w-3 h-3" />
                        Nouveautés Tech
                      </div>
                      <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
                        La tech de <span style={{ color: accentColor }}>demain</span>
                      </h2>
                      <p className="text-base opacity-70 leading-relaxed mb-8">
                        Découvrez notre sélection de produits tech haute performance.
                      </p>
                      <a
                        href="#products"
                        className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-bold transition-all"
                        style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
                      >
                        Explorer le catalogue
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex items-center justify-center aspect-video">
                      <Cpu className="w-24 h-24" style={{ color: `${accentColor}60` }} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div className="text-center py-6">
                    <h2 className="text-3xl font-bold mb-2">{storeName}</h2>
                    <p className="text-sm opacity-70">Électronique & High-Tech High Performance</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div className="text-center max-w-3xl mx-auto">
                    <div className="relative aspect-video rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center mb-8">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: accentColor, color: '#0A0A0A' }}>
                        <Play className="w-8 h-8 fill-current ml-1" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Démonstration Produit</h2>
                    <a
                      href="#products"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold"
                      style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
                    >
                      Voir la boutique
                    </a>
                  </div>
                ) : (
                  <div className="max-w-2xl">
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border"
                      style={{ borderColor: `${accentColor}40`, color: accentColor, backgroundColor: `${accentColor}10` }}
                    >
                      <Zap className="w-3 h-3" />
                      Nouveautés Tech
                    </div>
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
                      La tech de<br />
                      <span style={{ color: accentColor }}>demain</span>,<br />
                      disponible aujourd&apos;hui
                    </h2>
                    <p className="text-base opacity-70 leading-relaxed mb-8 max-w-lg">
                      Découvrez notre sélection de produits tech haute performance.
                    </p>
                    <a
                      href="#products"
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-bold transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                      style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
                    >
                      Explorer le catalogue
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Products Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
            {/* Category Filter Tabs */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    !activeCategory
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                  }`}
                >
                  Tous
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      activeCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold">Tous les produits</h3>
              <span className="text-sm opacity-60">{displayProducts.length} articles</span>
            </div>

            <div className={`grid ${tc.gridClasses}`}>
              {displayProducts.map((p) => (
                <Link
                  key={p.id}
                  href={getStorefrontProductPath(p, branding?.store_path_base)}
                  className="group block rounded-lg overflow-hidden border border-white/5 hover:border-white/15 transition-all duration-300"
                  style={{ backgroundColor: '#111111' }}
                >
                  <div className="aspect-square overflow-hidden bg-[#1A1A1A] relative">
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
                      <div className="w-full h-full flex items-center justify-center" style={{ color: `${accentColor}20` }}>
                        <ShoppingBag className="w-10 h-10" />
                      </div>
                    )}
                    {p.category && (
                      <span
                        className="absolute top-3 left-3 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                      >
                        {p.category}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-white line-clamp-1 mb-2">{p.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: accentColor }}>
                        {formatStorePrice(p)}
                      </span>
                      <span
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium px-2 py-1 rounded"
                        style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
                      >
                        Voir
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {displayProducts.length === 0 && (
              <div className="text-center py-20 opacity-50">
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
