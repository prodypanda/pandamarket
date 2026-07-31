'use client';

import React, { useState } from 'react';
import { ShoppingBag, Gamepad2, Sparkles, Search, Menu, X, Play, ChevronRight } from 'lucide-react';
import Link from 'next/link';
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

/**
 * Neon Theme — Dark mode default, neon accent colors, gaming/tech vibe.
 * Deep black background, vibrant neon glow effects, sharp edges,
 * cyberpunk-inspired typography, animated hover states.
 */
export function NeonTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const neon = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'RGB Gaming Headset', price: 249, images: [], category: 'Gaming' },
        { id: '2', title: 'Neon LED Controller', price: 89, images: [], category: 'Accessories' },
        { id: '3', title: 'Mechanical Keypad', price: 175, images: [], category: 'Peripherals' },
        { id: '4', title: 'Stream Deck Pro', price: 320, images: [], category: 'Streaming' },
        { id: '5', title: 'Gaming Chair X', price: 890, images: [], category: 'Furniture' },
        { id: '6', title: 'VR Headset Elite', price: 1200, images: [], category: 'VR' },
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
      <header className="border-b sticky top-0 z-40 backdrop-blur-xl" style={{ backgroundColor: tc.colors.headerBg, color: headerTextColor, borderColor: `${neon}20` }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 opacity-80 hover:opacity-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link href={branding?.store_path_base || '/'}>
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-8 object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-6 h-6" style={{ color: neon }} />
                  <span className="text-xl font-black uppercase tracking-tighter" style={{ color: headerTextColor }}>
                    {storeName}
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden sm:flex items-center flex-1 max-w-xs mx-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gear..."
              className="w-full py-1.5 pl-9 pr-4 text-xs font-bold uppercase tracking-wider rounded border bg-black/40 placeholder-gray-500 focus:outline-none"
              style={{ color: headerTextColor, borderColor: `${neon}40` }}
            />
            <Search className="w-4 h-4 absolute left-3 opacity-50" />
          </div>

          <nav className="hidden md:flex gap-6 text-xs uppercase tracking-widest font-bold opacity-70">
            <a href="#products" className="hover:opacity-100 transition-colors">Shop</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-100 transition-colors">About</Link>
            <Link href="/hub/login" className="hover:opacity-100 transition-colors">Login</Link>
          </nav>

          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={neon} iconColor={headerTextColor} badgeTextColor="#050505" className="inline-flex items-center transition-colors hover:opacity-100" icon="cart" />
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full flex flex-col justify-between p-6 shadow-2xl z-10 overflow-y-auto border-r border-white/10" style={{ backgroundColor: tc.colors.headerBg, color: headerTextColor }}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: `${neon}30` }}>
                <span className="font-black text-lg uppercase tracking-tighter" style={{ color: neon }}>{storeName}</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 opacity-70 hover:opacity-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Search */}
              <div className="my-4 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH..."
                  className="w-full py-2 pl-9 pr-4 text-xs font-bold uppercase tracking-wider rounded border bg-black/40"
                  style={{ borderColor: `${neon}40`, color: headerTextColor }}
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 opacity-50" />
              </div>

              {/* Nav Links */}
              <nav className="flex flex-col gap-3 py-4 text-xs font-bold uppercase tracking-widest border-b opacity-80" style={{ borderColor: `${neon}20` }}>
                <Link href={branding?.store_path_base || '/'} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-100">Home</Link>
                <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-100">Shop Products</a>
                <Link href={`${branding?.store_path_base || ''}/pages/about`} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-100">About</Link>
                <Link href="/hub/login" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-100">Login</Link>
              </nav>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="py-4 border-b" style={{ borderColor: `${neon}20` }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: neon }}>Categories</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`text-left text-xs font-bold uppercase tracking-wider py-1 px-2 rounded transition-colors ${!activeCategory ? 'bg-white/10' : 'opacity-70 hover:opacity-100'}`}
                    >
                      All Drops
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`text-left text-xs font-bold uppercase tracking-wider py-1 px-2 rounded transition-colors ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'bg-white/10' : 'opacity-70 hover:opacity-100'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Contact Footer */}
            <div className="pt-4 border-t text-xs" style={{ borderColor: `${neon}20` }}>
              <StorefrontSocialLinks branding={branding} showContact linkClassName="block text-xs font-bold uppercase tracking-wider opacity-70 hover:opacity-100 py-1" />
            </div>
          </div>
        </div>
      )}

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
                      <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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

      {/* Footer */}
      <footer className="border-t py-10 text-center" style={{ backgroundColor: tc.colors.footerBg, borderColor: `${neon}20` }}>
        <div className="max-w-7xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap justify-center gap-4 text-xs font-bold uppercase tracking-wider" linkClassName="opacity-70 hover:opacity-100 transition-opacity" />
          <p className="text-xs opacity-50">
            © {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" />
          </p>
        </div>
      </footer>
    </div>
  );
}
