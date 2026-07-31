'use client';

import React, { useState } from 'react';
import { ShoppingBag, Star, Search, Menu, X, Play } from 'lucide-react';
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
 * Medina Theme — Traditional marketplace feel, ornate borders, warm colors.
 * Deep teal and gold palette, arch-shaped elements, rich textures.
 */
export function MedinaTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const gold = tc.colors.primary;
  const teal = tc.colors.accent;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Zellige Tiles Set', price: 180, images: [], category: 'Decor' },
        { id: '2', title: 'Copper Tea Set', price: 220, images: [], category: 'Kitchen' },
        { id: '3', title: 'Silk Kaftan', price: 450, images: [], category: 'Fashion' },
        { id: '4', title: 'Argan Oil Premium', price: 65, images: [], category: 'Beauty' },
        { id: '5', title: 'Mosaic Mirror', price: 340, images: [], category: 'Decor' },
        { id: '6', title: 'Woven Basket', price: 55, images: [], category: 'Home' },
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

      {/* Top Banner */}
      <div className="text-center py-2 text-xs tracking-widest uppercase font-medium text-white" style={{ backgroundColor: teal }}>
        <Star className="w-3 h-3 inline mr-2" style={{ color: gold }} />Artisanat Authentique — Livraison Tunisie
      </div>

      {/* Header */}
      <header className="border-b sticky top-0 z-40 backdrop-blur-md" style={{ borderColor: `${gold}30`, backgroundColor: tc.colors.headerBg, color: headerTextColor }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border hover:opacity-80 transition-opacity"
              style={{ borderColor: `${gold}40`, color: headerTextColor }}
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href={branding?.store_path_base || '/'} className="inline-block">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-10 object-contain" />
              ) : (
                <h1 className="text-2xl font-serif font-bold tracking-wide" style={{ color: teal }}>{storeName}</h1>
              )}
            </Link>
          </div>

          {/* Header Search Input */}
          <div className="hidden md:flex items-center flex-1 max-w-xs mx-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full py-1.5 pl-9 pr-4 text-xs rounded-full border focus:outline-none"
              style={{ borderColor: `${gold}40`, backgroundColor: tc.colors.background, color: tc.colors.text }}
            />
            <Search className="w-4 h-4 absolute left-3 text-amber-700/50" />
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-xs tracking-[0.15em] uppercase font-medium" style={{ color: '#8B7355' }}>
            <a href="#products" className="hover:opacity-70 transition-opacity">Souk</a>
            <a href="#products" className="hover:opacity-70 transition-opacity">Collections</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-70 transition-opacity">Notre Médina</Link>
            <Link href="/hub/login" className="hover:opacity-70 transition-opacity">Connexion</Link>
          </nav>

          <div className="flex items-center gap-3">
            <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={gold} iconColor={teal} className="inline-flex items-center hover:opacity-70 transition-opacity" />
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full flex flex-col justify-between p-6 shadow-2xl z-10 overflow-y-auto" style={{ backgroundColor: tc.colors.background, color: tc.colors.text }}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: `${gold}30` }}>
                <span className="font-serif font-bold text-lg" style={{ color: teal }}>{storeName}</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 opacity-70 hover:opacity-100" aria-label="Fermer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Search */}
              <div className="my-4 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full py-2 pl-9 pr-4 text-xs rounded-full border"
                  style={{ borderColor: `${gold}40`, backgroundColor: tc.colors.background, color: tc.colors.text }}
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 opacity-50" />
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex flex-col gap-3 py-3 text-xs tracking-wider uppercase font-medium border-b" style={{ borderColor: `${gold}20` }}>
                <Link href={branding?.store_path_base || '/'} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-70">Accueil</Link>
                <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-70">Souk</a>
                <Link href={`${branding?.store_path_base || ''}/pages/about`} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-70">Notre Médina</Link>
                <Link href="/hub/login" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-70">Connexion</Link>
              </nav>

              {/* Category Links */}
              {categories.length > 0 && (
                <div className="py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: gold }}>Catégories</p>
                  <div className="flex flex-col gap-1 text-sm">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`text-left py-1 px-2 rounded ${!activeCategory ? 'font-bold' : 'opacity-80'}`}
                      style={{ color: !activeCategory ? teal : tc.colors.text }}
                    >
                      Tous les articles
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`text-left py-1 px-2 rounded ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'font-bold' : 'opacity-80'}`}
                        style={{ color: activeCategory.toLowerCase() === cat.toLowerCase() ? teal : tc.colors.text }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Contact & Social */}
            <div className="pt-4 border-t text-xs" style={{ borderColor: `${gold}20` }}>
              <StorefrontSocialLinks branding={branding} showContact className="flex flex-col gap-2 opacity-80" />
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
                    {getStoreProductImage(p) ? <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : (
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

      {/* Footer */}
      <footer className="py-10 text-center text-white" style={{ backgroundColor: tc.colors.footerBg }}>
        <div className="max-w-7xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap justify-center gap-4 text-xs" linkClassName="hover:underline text-white/90" />
          <p className="text-xs tracking-wide">{storeName} — <PoweredByMarketplace branding={branding} linkClassName="hover:underline" linkStyle={{ color: gold }} /></p>
        </div>
      </footer>
    </div>
  );
}
