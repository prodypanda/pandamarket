'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Flame, ShoppingBag, Search, Menu, X, Play } from 'lucide-react';
import {
  type ThemeProps,
  useThemeCustomization,
  colorVars,
  formatStorePrice,
  getStoreProductImage,
  getStorefrontProductPath,
  getStoreBrandLogo,
  getLogoSurfaceForColor,
  getStoreThemeLogoSurface,
} from './shared';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';
import { StorefrontSocialLinks } from './StorefrontSocialLinks';

/** Urban Theme — Street fashion, bold typography, high contrast. */
export function UrbanTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const accent = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allProducts = products.length > 0 ? products : [
    { id: '1', title: 'Oversized Hoodie', price: 120, images: [], category: 'Streetwear' },
    { id: '2', title: 'Cargo Pants', price: 95, images: [], category: 'Bottoms' },
    { id: '3', title: 'Chunky Sneakers', price: 280, images: [], category: 'Shoes' },
    { id: '4', title: 'Bucket Hat', price: 45, images: [], category: 'Accessories' },
    { id: '5', title: 'Crossbody Bag', price: 85, images: [], category: 'Bags' },
    { id: '6', title: 'Graphic Tee', price: 55, images: [], category: 'Tops' },
  ];

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

  const headerTextColor = getLogoSurfaceForColor(tc.colors.headerBg) === 'dark' ? '#FFFFFF' : tc.colors.text;

  return (
    <div className={`${theme.typography.fontFamily} min-h-screen flex flex-col`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header className="border-b-4 border-black sticky top-0 z-40 backdrop-blur-md" style={{ backgroundColor: tc.colors.headerBg, color: headerTextColor }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 border-2 border-black font-black uppercase"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href={branding?.store_path_base || '/'}>
              {logoUrl ? <img src={logoUrl} alt={storeName} className="h-8 object-contain" /> : (
                <h1 className="text-2xl font-black uppercase tracking-tighter">{storeName}</h1>
              )}
            </Link>
          </div>

          {/* Search Input */}
          <div className="hidden sm:flex items-center flex-1 max-w-xs mx-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH DROPS..."
              className="w-full py-1.5 pl-8 pr-3 text-xs font-black uppercase border-2 border-black focus:outline-none"
              style={{ backgroundColor: tc.colors.background, color: tc.colors.text }}
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-gray-500" />
          </div>

          <nav className="hidden md:flex gap-6 text-xs uppercase tracking-widest font-black">
            <a href="#products" className="hover:opacity-60 transition-opacity">New</a>
            <a href="#products" className="hover:opacity-60 transition-opacity">Shop</a>
            <Link href="/hub/login" className="hover:opacity-60 transition-opacity">Login</Link>
          </nav>
          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={accent} className="inline-flex items-center" />
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full flex flex-col justify-between p-6 bg-black text-white z-10 overflow-y-auto border-r-4 border-white">
            <div>
              <div className="flex items-center justify-between pb-4 border-b-2 border-white">
                <span className="font-black text-xl uppercase">{storeName}</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 border border-white" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH..."
                  className="w-full py-2 pl-8 pr-3 text-xs font-black uppercase bg-gray-900 border-2 border-white text-white"
                />
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-gray-400" />
              </div>

              <nav className="flex flex-col gap-3 py-4 font-black uppercase text-sm border-b-2 border-white/20">
                <Link href={branding?.store_path_base || '/'} onClick={() => setMobileMenuOpen(false)} className="hover:text-amber-400">Home</Link>
                <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:text-amber-400">Shop Drops</a>
                <Link href="/hub/login" onClick={() => setMobileMenuOpen(false)} className="hover:text-amber-400">Login</Link>
              </nav>

              {categories.length > 0 && (
                <div className="py-4">
                  <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: accent }}>Categories</p>
                  <div className="flex flex-col gap-2 font-black text-xs uppercase">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`text-left py-1 px-2 border ${!activeCategory ? 'bg-white text-black' : 'border-white/30 text-white'}`}
                    >
                      ALL DROPS
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`text-left py-1 px-2 border ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'bg-white text-black' : 'border-white/30 text-white'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t-2 border-white/20 text-xs">
              <StorefrontSocialLinks branding={branding} showContact className="flex flex-col gap-2 font-mono opacity-80" />
            </div>
          </div>
        </div>
      )}

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
                    {getStoreProductImage(p) ? <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
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

      {/* Footer */}
      <footer className="border-t-4 border-black py-10 text-center" style={{ backgroundColor: tc.colors.footerBg }}>
        <div className="max-w-7xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap justify-center gap-4 text-xs font-mono" linkClassName="hover:underline font-bold" />
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" /></p>
        </div>
      </footer>
    </div>
  );
}
