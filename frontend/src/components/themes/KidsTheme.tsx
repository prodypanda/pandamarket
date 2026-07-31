'use client';

import React, { useState } from 'react';
import { Star, Heart, Search, Menu, X, Play, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath, getStoreBrandLogo, getLogoSurfaceForColor, getStoreThemeLogoSurface } from './shared';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';
import { StorefrontSocialLinks } from './StorefrontSocialLinks';
import { ThemeLayout } from './ThemeLayout';

/** Kids Theme — Playful, colorful, rounded shapes, fun typography. */
export function KidsTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const primary = tc.colors.primary;
  const yellow = '#FFD93D';
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const allProducts = products.length > 0 ? products : [
    { id: '1', title: 'Plush Panda Bear', price: 35, images: [], category: 'Toys' },
    { id: '2', title: 'Wooden Block Set', price: 45, images: [], category: 'Educational' },
    { id: '3', title: 'Rainbow Dress', price: 55, images: [], category: 'Clothing' },
    { id: '4', title: 'Story Book Bundle', price: 28, images: [], category: 'Books' },
    { id: '5', title: 'Art Supply Kit', price: 40, images: [], category: 'Creative' },
    { id: '6', title: 'Musical Instrument Set', price: 65, images: [], category: 'Music' },
    { id: '7', title: 'Puzzle Collection', price: 22, images: [], category: 'Games' },
    { id: '8', title: 'Backpack — Dino', price: 38, images: [], category: 'Accessories' },
  ];

  const categories = [...new Set(allProducts.map((p) => p.category).filter(Boolean))] as string[];

  const displayProducts = allProducts.filter((p) => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(p.category || '').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (activeCategory && p.category !== activeCategory) {
      return false;
    }
    return true;
  });

  return (
    <div className={`${theme.typography.fontFamily} min-h-screen relative`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}
      <div className="text-center py-2 text-xs font-bold text-white" style={{ backgroundColor: primary }}>
        ⭐ Free gift wrapping on all orders! ⭐
      </div>

      {/* Header */}
      <header className="border-b-4 relative z-20" style={{ backgroundColor: tc.colors.headerBg, borderColor: yellow }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-black/5 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" style={{ color: primary }} />
            </button>
            <Link href={branding?.store_path_base || '/'}>
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-10 object-contain" />
              ) : (
                <h1 className="text-2xl font-black flex items-center gap-1.5" style={{ color: primary }}>
                  {storeName} <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                </h1>
              )}
            </Link>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-xs lg:max-w-md mx-6 relative">
            <input
              type="text"
              placeholder="Search fun toys & clothes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 px-4 pr-10 text-xs rounded-full border-2 bg-white focus:outline-none font-bold"
              style={{ borderColor: yellow, color: tc.colors.text }}
            />
            <Search className="w-4 h-4 absolute right-3 top-2.5 pointer-events-none" style={{ color: primary }} />
          </div>

          <nav className="hidden lg:flex gap-6 text-sm font-bold" style={{ color: primary }}>
            <a href="#products" className="hover:opacity-70 transition-opacity">Shop</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-70 transition-opacity">About Us</Link>
            <Link href="/hub/login" className="hover:opacity-70 transition-opacity">Parent Login</Link>
          </nav>

          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={primary} className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold text-white shadow-sm" label="Cart" />
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between border-r-4" style={{ backgroundColor: tc.colors.headerBg, borderColor: yellow, color: tc.colors.text }}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b-2" style={{ borderColor: `${primary}20` }}>
                <span className="font-black text-lg flex items-center gap-1" style={{ color: primary }}>
                  {storeName} <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:opacity-70" aria-label="Close menu">
                  <X className="w-6 h-6" style={{ color: primary }} />
                </button>
              </div>

              <div className="py-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search toys..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 px-3 pr-9 text-xs rounded-full border-2 bg-white focus:outline-none font-bold"
                    style={{ borderColor: yellow, color: tc.colors.text }}
                  />
                  <Search className="w-4 h-4 absolute right-3 top-2.5" style={{ color: primary }} />
                </div>
              </div>

              <nav className="py-4 space-y-3 font-bold text-sm" style={{ color: primary }}>
                <Link href={branding?.store_path_base || '/'} className="block hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  Home 🎈
                </Link>
                <a href="#products" className="block hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  Shop Toys & Goods 🧸
                </a>
                <Link href={`${branding?.store_path_base || ''}/pages/about`} className="block hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  About Us 🌈
                </Link>
                <Link href={`${branding?.store_path_base || ''}/pages/contact`} className="block hover:opacity-70" onClick={() => setMobileMenuOpen(false)}>
                  Contact 💌
                </Link>
                <Link href="/hub/login" className="block text-pink-500 font-extrabold" onClick={() => setMobileMenuOpen(false)}>
                  Parent Login 🔑
                </Link>
              </nav>

              {categories.length > 0 && (
                <div className="py-4 border-t-2" style={{ borderColor: `${primary}20` }}>
                  <p className="text-xs uppercase tracking-wider font-extrabold mb-3" style={{ color: primary }}>Categories</p>
                  <div className="space-y-2 text-sm">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`block w-full text-left font-bold ${!activeCategory ? 'underline' : 'opacity-80'}`}
                      style={{ color: primary }}
                    >
                      All Fun Stuff
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`block w-full text-left font-bold ${activeCategory === cat ? 'underline' : 'opacity-80'}`}
                        style={{ color: primary }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t-2" style={{ borderColor: `${primary}20` }}>
              <StorefrontSocialLinks branding={branding} showContact className="flex flex-col gap-2 text-xs font-bold opacity-90" linkClassName="hover:underline" />
            </div>
          </div>
        </div>
      )}

      {children ? (
        <main className="py-8 max-w-7xl mx-auto px-6">{children}</main>
      ) : (
        <>
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="py-16 text-center relative" style={{ background: `linear-gradient(180deg, #FFF0F5 0%, transparent 100%)` }}>
              <div className="max-w-4xl mx-auto px-6">
                <div className="text-4xl mb-4">🎈🧸🌈</div>

                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-8 items-center text-left">
                    <div>
                      <h2 className="text-4xl md:text-5xl font-black leading-tight mb-4">
                        Fun for<br /><span style={{ color: primary }}>Little Ones!</span>
                      </h2>
                      <p className="text-sm text-gray-500 mb-6 font-medium">
                        Safe, educational, and oh-so-fun products crafted for kids of all ages.
                      </p>
                      <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-black text-white transition-all hover:scale-105 shadow-md" style={{ backgroundColor: primary }}>
                        <Heart className="w-4 h-4 inline mr-1" /> Shop Now
                      </a>
                    </div>
                    <div className="aspect-square rounded-3xl flex items-center justify-center bg-white shadow-md border-4" style={{ borderColor: yellow }}>
                      <span className="text-7xl animate-bounce">🎁</span>
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black mb-2" style={{ color: primary }}>
                      {storeName} World! 🌟
                    </h2>
                    <p className="text-sm text-gray-500 font-bold">Joyful essentials for happy kids.</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4 bg-white shadow-sm" style={{ color: primary }}>
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch Kids Play Film
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black leading-tight mb-6">
                      Play & Learn Every Day!
                    </h2>
                    <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-black text-white transition-all hover:scale-105 shadow-md" style={{ backgroundColor: primary }}>
                      <Heart className="w-4 h-4 inline mr-1" /> Explore Collection
                    </a>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-4xl md:text-6xl font-black leading-tight mb-4">
                      Fun for<br /><span style={{ color: primary }}>Little Ones!</span>
                    </h2>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mb-8 font-medium">
                      Safe, educational, and oh-so-fun products for kids of all ages.
                    </p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-full text-sm font-black text-white transition-all hover:scale-105 shadow-md" style={{ backgroundColor: primary }}>
                      <Heart className="w-4 h-4 inline mr-1" /> Shop Now
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 pt-6 pb-2">
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide flex-wrap justify-center">
                <button
                  onClick={() => setActiveCategory('')}
                  className="px-5 py-2 rounded-full text-xs font-black transition-all shadow-sm"
                  style={{
                    backgroundColor: !activeCategory ? primary : '#ffffff',
                    color: !activeCategory ? '#ffffff' : primary,
                    border: `2px solid ${primary}`,
                  }}
                >
                  All Toys & Gifts ⭐
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-5 py-2 rounded-full text-xs font-black transition-all shadow-sm"
                    style={{
                      backgroundColor: activeCategory === cat ? primary : '#ffffff',
                      color: activeCategory === cat ? '#ffffff' : primary,
                      border: `2px solid ${primary}`,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Product Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
            <ThemeLayout variation={tc.layoutVariation} layout={tc.layout} colors={tc.colors} categories={categories} activeCategory={activeCategory}>
              <div className={`grid ${tc.gridClasses}`}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-3xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all border-2" style={{ borderColor: `${primary}15` }}>
                    <div className="aspect-square overflow-hidden" style={{ backgroundColor: '#FFF5F8' }}>
                      {getStoreProductImage(p) ? (
                        <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🧸</div>
                      )}
                    </div>
                    <div className="p-3 text-center">
                      {p.category && <p className="text-[10px] tracking-widest uppercase font-bold mb-1" style={{ color: primary }}>{p.category}</p>}
                      <h3 className="text-sm font-bold line-clamp-1">{p.title}</h3>
                      <p className="text-sm font-black mt-1" style={{ color: primary }}>{formatStorePrice(p)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm font-bold">No fun items found matching search</p>
                </div>
              )}
            </ThemeLayout>
          </main>
        </>
      )}

      {/* Footer */}
      <footer className="border-t-4 py-8 text-center" style={{ backgroundColor: tc.colors.footerBg, borderColor: yellow }}>
        <div className="max-w-7xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap items-center justify-center gap-3 text-xs font-bold" linkClassName="hover:underline" />
          <p className="text-xs text-gray-400 font-medium">
            © {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" />
          </p>
        </div>
      </footer>
    </div>
  );
}
