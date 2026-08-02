'use client';

import React, { useState } from 'react';
import { ShoppingBag, Gamepad2, Sparkles, Play, ChevronRight } from 'lucide-react';
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
 * Neon Theme — Dark mode default, neon accent colors, gaming/tech vibe.
 * Deep black background, vibrant neon glow effects, sharp edges,
 * cyberpunk-inspired typography, animated hover states.
 */
export function NeonTheme({ theme, storeName, products = [], branding, navigation, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const neon = tc.colors.primary;

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
            <section className="relative overflow-hidden py-20 md:py-28">
              {/* Neon glow background */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[200px] opacity-15" style={{ backgroundColor: neon }} />
                <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[150px] opacity-10" style={{ backgroundColor: '#FF00FF' }} />
              </div>
              <div className="relative max-w-7xl mx-auto px-6 text-center">
                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-10 items-center text-left">
                    <div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border" style={{ borderColor: `${neon}40`, color: neon }}>
                        <Sparkles className="w-3 h-3" />
                        Next Gen Gear
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6">
                        Level <span style={{ color: neon, textShadow: `0 0 30px ${neon}60` }}>Up</span>
                      </h2>
                      <p className="text-sm opacity-70 max-w-md mb-8">
                        Premium gear for gamers and creators. Unleash your full potential.
                      </p>
                      <a
                        href="#products"
                        className="inline-flex items-center gap-2 px-8 py-3 text-sm font-black uppercase tracking-wider transition-all hover:scale-105"
                        style={{ backgroundColor: neon, color: '#050505', boxShadow: `0 0 30px ${neon}40` }}
                      >
                        Shop Now
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                    <div className="aspect-video rounded-xl border p-8 flex items-center justify-center bg-black/50" style={{ borderColor: `${neon}30` }}>
                      <Gamepad2 className="w-20 h-20" style={{ color: neon }} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div className="py-6">
                    <h2 className="text-4xl font-black uppercase tracking-tighter mb-2" style={{ color: neon }}>{storeName}</h2>
                    <p className="text-xs uppercase tracking-widest opacity-60">High Performance Gaming & Tech</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div className="max-w-3xl mx-auto">
                    <div className="aspect-video rounded-xl border overflow-hidden flex items-center justify-center mb-8 bg-black/60" style={{ borderColor: `${neon}40` }}>
                      <div className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110" style={{ backgroundColor: neon, color: '#050505' }}>
                        <Play className="w-8 h-8 fill-current ml-1" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-wider mb-4">Trailer Showcase</h2>
                    <a
                      href="#products"
                      className="inline-block px-8 py-3 text-xs font-black uppercase tracking-wider"
                      style={{ backgroundColor: neon, color: '#050505' }}
                    >
                      View Gear
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border" style={{ borderColor: `${neon}40`, color: neon }}>
                      <Sparkles className="w-3 h-3" />
                      New Drops
                    </div>
                    <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-6">
                      Level<br />
                      <span style={{ color: neon, textShadow: `0 0 40px ${neon}60` }}>Up</span>
                    </h2>
                    <p className="text-sm opacity-70 max-w-md mx-auto mb-10">
                      Premium gear for gamers and creators. Unleash your potential.
                    </p>
                    <a
                      href="#products"
                      className="inline-block px-8 py-3 text-sm font-black uppercase tracking-wider transition-all hover:scale-105"
                      style={{ backgroundColor: neon, color: '#050505', boxShadow: `0 0 30px ${neon}40` }}
                    >
                      Shop Now
                    </a>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 mb-8 flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveCategory('')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border transition-all ${!activeCategory ? 'bg-white text-black' : 'border-white/10 opacity-60 hover:opacity-100'}`}
                style={!activeCategory ? {} : { borderColor: `${neon}30` }}
              >
                All Drops
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider border transition-all ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'bg-white text-black' : 'border-white/10 opacity-60 hover:opacity-100'}`}
                  style={activeCategory.toLowerCase() === cat.toLowerCase() ? {} : { borderColor: `${neon}30` }}
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
                <Link
                  key={p.id}
                  href={getStorefrontProductPath(p, branding?.store_path_base)}
                  className="group block border overflow-hidden transition-all duration-300 hover:border-opacity-60"
                  style={{ borderColor: `${neon}20`, backgroundColor: '#0A0A0A' }}
                >
                  <div className="aspect-square overflow-hidden relative">
                    {getStoreProductImage(p) ? (
                      <Image src={getStoreProductImage(p)} alt={p.title} width={400} height={400} unoptimized className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black/40">
                        <ShoppingBag className="w-10 h-10" style={{ color: `${neon}30` }} />
                      </div>
                    )}
                    {p.category && (
                      <span className="absolute top-3 left-3 px-2 py-1 text-[10px] font-black uppercase tracking-wider" style={{ backgroundColor: neon, color: '#050505' }}>
                        {p.category}
                      </span>
                    )}
                    {/* Neon border glow on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: `inset 0 0 30px ${neon}25` }} />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-white line-clamp-1">{p.title}</h3>
                    <p className="text-sm font-black mt-1" style={{ color: neon }}>{formatStorePrice(p)}</p>
                  </div>
                </Link>
              ))}
            </div>
            {displayProducts.length === 0 && (
              <div className="text-center py-20 opacity-40">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm font-bold uppercase tracking-wider">No products found</p>
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
