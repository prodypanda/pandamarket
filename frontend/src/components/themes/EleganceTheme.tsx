'use client';

import React, { useState } from 'react';
import { ShoppingBag, Menu, Search, X, Play } from 'lucide-react';
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
 * Elegance Theme — Minimalist luxury with generous whitespace.
 * Serif headings (font-serif), muted palette, editorial grid, large imagery, understated sophistication.
 */
export function EleganceTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const accent = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const allProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Merino Wool Coat', price: 680, images: [], category: 'Outerwear' },
        { id: '2', title: 'Silk Blouse', price: 320, images: [], category: 'Tops' },
        { id: '3', title: 'Leather Loafers', price: 450, images: [], category: 'Footwear' },
        { id: '4', title: 'Cashmere Sweater', price: 390, images: [], category: 'Knitwear' },
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
      <header className="border-b sticky top-0 z-40 backdrop-blur-md" style={{ backgroundColor: tc.colors.headerBg, color: headerTextColor, borderColor: `${tc.colors.text}15` }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <button className="md:hidden p-1.5 opacity-80 hover:opacity-100" onClick={() => setMobileMenuOpen(true)} aria-label="Menu">
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>

          <Link href={branding?.store_path_base || '/'} className="flex-1 text-center md:text-left">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="h-9 object-contain" />
            ) : (
              <h1 className="text-2xl md:text-3xl font-serif font-light tracking-wide" style={{ color: headerTextColor }}>{storeName}</h1>
            )}
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs tracking-[0.2em] uppercase opacity-70">
            <a href="#products" className="hover:opacity-100 transition-opacity">Collections</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-100 transition-opacity">À propos</Link>
            <Link href="/hub/login" className="hover:opacity-100 transition-opacity">Connexion</Link>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setSearchOpen(!searchOpen)} className="opacity-70 hover:opacity-100 transition-opacity" aria-label="Recherche">
              <Search className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={accent} iconColor={headerTextColor} className="inline-flex items-center opacity-70 hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Collapsible Search Input */}
        {searchOpen && (
          <div className="border-t py-3 px-6 max-w-6xl mx-auto flex items-center gap-3" style={{ borderColor: `${tc.colors.text}10` }}>
            <Search className="w-4 h-4 opacity-50" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une pièce..."
              className="w-full text-sm bg-transparent focus:outline-none tracking-wide"
              style={{ color: headerTextColor }}
              autoFocus
            />
            <button onClick={() => setSearchOpen(false)} className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100">
              Fermer
            </button>
          </div>
        )}
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full flex flex-col justify-between p-8 shadow-2xl z-10 overflow-y-auto" style={{ backgroundColor: tc.colors.background, color: tc.colors.text }}>
            <div>
              <div className="flex items-center justify-between pb-6 border-b" style={{ borderColor: `${tc.colors.text}15` }}>
                <span className="font-serif text-xl tracking-wide">{storeName}</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 opacity-60 hover:opacity-100">
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Search */}
              <div className="my-6 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full py-2 pl-9 pr-4 text-xs tracking-wider uppercase border-b bg-transparent"
                  style={{ borderColor: `${tc.colors.text}30`, color: tc.colors.text }}
                />
                <Search className="w-4 h-4 absolute left-1 top-2.5 opacity-50" strokeWidth={1.5} />
              </div>

              {/* Navigation */}
              <nav className="flex flex-col gap-4 py-4 text-xs tracking-[0.2em] uppercase border-b opacity-80" style={{ borderColor: `${tc.colors.text}15` }}>
                <Link href={branding?.store_path_base || '/'} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-100">Accueil</Link>
                <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-100">Collections</a>
                <Link href={`${branding?.store_path_base || ''}/pages/about`} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-100">À propos</Link>
                <Link href="/hub/login" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-100">Connexion</Link>
              </nav>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="py-6 border-b" style={{ borderColor: `${tc.colors.text}15` }}>
                  <p className="text-[10px] tracking-[0.25em] uppercase font-bold mb-3 opacity-50">Catégories</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`text-left text-xs tracking-wider uppercase py-1 transition-opacity ${!activeCategory ? 'font-bold opacity-100' : 'opacity-60 hover:opacity-100'}`}
                    >
                      Toutes les pièces
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`text-left text-xs tracking-wider uppercase py-1 transition-opacity ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'font-bold opacity-100' : 'opacity-60 hover:opacity-100'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Social links */}
            <div className="pt-6 border-t" style={{ borderColor: `${tc.colors.text}15` }}>
              <StorefrontSocialLinks branding={branding} showContact linkClassName="block text-xs uppercase tracking-widest opacity-60 hover:opacity-100 py-1" />
            </div>
          </div>
        </div>
      )}

      {/* Main Body */}
      {children ? (
        <main className="py-8 flex-1">{children}</main>
      ) : (
        <div className="flex-1">
          {/* Hero */}
          {tc.heroStyle !== 'none' && (
            <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
              {tc.heroStyle === 'split' ? (
                <div className="grid md:grid-cols-2 gap-12 items-center text-left">
                  <div>
                    <p className="text-xs tracking-[0.3em] uppercase opacity-50 mb-4">Curated Selection</p>
                    <h2 className="text-4xl md:text-6xl font-serif font-light leading-[1.1] mb-6">
                      Less is<br />More
                    </h2>
                    <p className="text-sm opacity-60 max-w-sm leading-relaxed mb-8">
                      Timeless pieces crafted with intention. Quality over quantity, always.
                    </p>
                    <a
                      href="#products"
                      className="inline-block px-10 py-3.5 text-xs tracking-[0.2em] uppercase border transition-all duration-300 hover:bg-black hover:text-white"
                      style={{ borderColor: `${tc.colors.text}40` }}
                    >
                      Shop Now
                    </a>
                  </div>
                  <div className="aspect-[3/4] max-w-sm mx-auto w-full bg-stone-100 flex items-center justify-center p-8 border" style={{ borderColor: `${tc.colors.text}10` }}>
                    <ShoppingBag className="w-16 h-16 opacity-20" strokeWidth={1} />
                  </div>
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className="py-8">
                  <h2 className="text-3xl font-serif font-light tracking-widest uppercase mb-2">{storeName}</h2>
                  <p className="text-xs tracking-[0.25em] uppercase opacity-50">Luxury & Elegance</p>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="max-w-3xl mx-auto">
                  <div className="aspect-video bg-stone-100 flex items-center justify-center mb-8 border" style={{ borderColor: `${tc.colors.text}10` }}>
                    <div className="w-14 h-14 rounded-full border border-black/20 flex items-center justify-center">
                      <Play className="w-6 h-6 fill-current ml-1 opacity-70" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-serif font-light tracking-wide mb-4">Editorial Film</h2>
                  <a href="#products" className="inline-block px-8 py-3 text-xs tracking-[0.2em] uppercase border" style={{ borderColor: `${tc.colors.text}40` }}>
                    Explore Collection
                  </a>
                </div>
              ) : (
                <>
                  <p className="text-xs tracking-[0.3em] uppercase opacity-50 mb-6">Curated Selection</p>
                  <h2 className="text-5xl md:text-7xl font-serif font-light leading-[1.1] mb-8">
                    Less is<br />More
                  </h2>
                  <p className="text-sm opacity-60 max-w-sm mx-auto leading-relaxed mb-10">
                    Timeless pieces crafted with intention. Quality over quantity, always.
                  </p>
                  <a
                    href="#products"
                    className="inline-block px-12 py-4 text-xs tracking-[0.2em] uppercase border transition-all duration-300 hover:bg-black hover:text-white"
                    style={{ borderColor: `${tc.colors.text}40` }}
                  >
                    Shop Now
                  </a>
                </>
              )}
            </section>
          )}

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="max-w-6xl mx-auto px-6 mb-12 flex justify-center flex-wrap gap-6 text-xs tracking-[0.2em] uppercase">
              <button
                onClick={() => setActiveCategory('')}
                className={`pb-1 border-b-2 transition-all ${!activeCategory ? 'font-bold border-current opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
              >
                Tout
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`pb-1 border-b-2 transition-all ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'font-bold border-current opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Products Grid */}
          <main id="products" className="max-w-6xl mx-auto px-6 pb-32">
            <div className={`grid ${tc.gridClasses}`}>
              {displayProducts.map((p) => (
                <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block">
                  <div className="aspect-[3/4] mb-6 overflow-hidden bg-gray-100 relative">
                    {getStoreProductImage(p) ? (
                      <img
                        src={getStoreProductImage(p)}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-30">
                        <ShoppingBag className="w-8 h-8" strokeWidth={1} />
                      </div>
                    )}
                    {p.category && (
                      <span className="absolute top-3 left-3 text-[9px] tracking-[0.2em] uppercase font-semibold px-2 py-0.5 bg-white/80 backdrop-blur-sm">
                        {p.category}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-serif tracking-wide">{p.title}</h3>
                  <p className="text-xs opacity-60 mt-2">{formatStorePrice(p)}</p>
                </Link>
              ))}
            </div>
            {displayProducts.length === 0 && (
              <div className="text-center py-20 opacity-40">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" strokeWidth={1} />
                <p className="text-sm tracking-wide">No products yet</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t py-16 text-center" style={{ backgroundColor: tc.colors.footerBg, borderColor: `${tc.colors.text}15` }}>
        <div className="max-w-6xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-6 flex flex-wrap justify-center gap-6 text-xs uppercase tracking-[0.15em]" linkClassName="opacity-60 hover:opacity-100 transition-opacity" />
          <p className="text-xs opacity-50 tracking-wide">
            © {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" />
          </p>
        </div>
      </footer>
    </div>
  );
}
