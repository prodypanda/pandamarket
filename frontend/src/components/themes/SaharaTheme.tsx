'use client';

import React, { useState } from 'react';
import { ShoppingBag, Sun, Search, Menu, X, Play, ChevronRight } from 'lucide-react';
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
 * Sahara Theme — Warm desert tones, Tunisian-inspired patterns.
 * Sandy backgrounds, terracotta accents, geometric borders,
 * warm typography, Mediterranean feel.
 */
export function SaharaTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const accent = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allProducts = products.length > 0 ? products : [
    { id: '1', title: 'Handwoven Rug', price: 350, images: [], category: 'Decor' },
    { id: '2', title: 'Ceramic Tagine', price: 85, images: [], category: 'Kitchen' },
    { id: '3', title: 'Olive Oil Set', price: 45, images: [], category: 'Food' },
    { id: '4', title: 'Leather Pouf', price: 280, images: [], category: 'Furniture' },
    { id: '5', title: 'Brass Lantern', price: 120, images: [], category: 'Lighting' },
    { id: '6', title: 'Embroidered Cushion', price: 65, images: [], category: 'Textiles' },
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
      <header className="border-b-2 sticky top-0 z-40 backdrop-blur-md" style={{ backgroundColor: tc.colors.headerBg, color: headerTextColor, borderColor: `${accent}30` }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 opacity-80 hover:opacity-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link href={branding?.store_path_base || '/'}>
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-10 object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <Sun className="w-6 h-6" style={{ color: accent }} />
                  <h1 className="text-2xl font-bold tracking-wide" style={{ color: headerTextColor }}>{storeName}</h1>
                </div>
              )}
            </Link>
          </div>

          {/* Search bar */}
          <div className="hidden sm:flex items-center flex-1 max-w-xs mx-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher des trésors..."
              className="w-full py-1.5 pl-9 pr-4 text-xs font-semibold rounded-lg border bg-black/5 focus:outline-none"
              style={{ color: headerTextColor, borderColor: `${accent}30` }}
            />
            <Search className="w-4 h-4 absolute left-3 opacity-50" />
          </div>

          <nav className="hidden md:flex gap-8 text-sm font-medium opacity-80">
            <a href="#products" className="hover:opacity-100 transition-opacity">Boutique</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-100 transition-opacity">Notre Histoire</Link>
            <Link href="/hub/login" className="hover:opacity-100 transition-opacity">Connexion</Link>
          </nav>

          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={accent} iconColor={headerTextColor} className="inline-flex items-center hover:opacity-80 transition-opacity" />
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full flex flex-col justify-between p-6 shadow-2xl z-10 overflow-y-auto" style={{ backgroundColor: tc.colors.background, color: tc.colors.text }}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b-2" style={{ borderColor: `${accent}30` }}>
                <span className="font-bold text-lg">{storeName}</span>
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
                  placeholder="Rechercher..."
                  className="w-full py-2 pl-9 pr-4 text-xs font-semibold rounded-lg border bg-black/5"
                  style={{ borderColor: `${accent}30`, color: tc.colors.text }}
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 opacity-50" />
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-3 py-3 text-sm font-medium border-b" style={{ borderColor: `${accent}20` }}>
                <Link href={branding?.store_path_base || '/'} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-80">Accueil</Link>
                <a href="#products" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-80">Boutique</a>
                <Link href={`${branding?.store_path_base || ''}/pages/about`} onClick={() => setMobileMenuOpen(false)} className="hover:opacity-80">Notre Histoire</Link>
                <Link href="/hub/login" onClick={() => setMobileMenuOpen(false)} className="hover:opacity-80">Connexion</Link>
              </nav>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="py-4 border-b" style={{ borderColor: `${accent}20` }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>Catégories</p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                      className={`text-left text-sm py-1.5 px-3 rounded-lg transition-colors ${!activeCategory ? 'font-bold bg-black/5' : 'opacity-70 hover:opacity-100'}`}
                    >
                      Tout
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                        className={`text-left text-sm py-1.5 px-3 rounded-lg transition-colors ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'font-bold bg-black/5' : 'opacity-70 hover:opacity-100'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Footer Links */}
            <div className="pt-4 border-t text-xs" style={{ borderColor: `${accent}20` }}>
              <StorefrontSocialLinks branding={branding} showContact linkClassName="block py-1 opacity-70 hover:opacity-100 font-medium" />
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
            <section className="py-16 md:py-24 text-center" style={{ background: `linear-gradient(180deg, ${accent}08 0%, transparent 100%)` }}>
              <div className="max-w-7xl mx-auto px-6">
                {tc.heroStyle === 'split' ? (
                  <div className="grid md:grid-cols-2 gap-10 items-center text-left">
                    <div>
                      <p className="text-xs tracking-[0.25em] uppercase mb-4 font-semibold" style={{ color: accent }}>Artisanat Tunisien</p>
                      <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">Trésors du <span style={{ color: accent }}>Sahara</span></h2>
                      <p className="text-sm max-w-md mb-8 leading-relaxed opacity-80">Pièces uniques inspirées par les traditions millénaires du désert tunisien.</p>
                      <a href="#products" className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>
                        Explorer
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                    <div className="aspect-video rounded-2xl flex items-center justify-center border p-8 bg-[#FFFBF5]" style={{ borderColor: `${accent}20` }}>
                      <Sun className="w-20 h-20" style={{ color: `${accent}40` }} />
                    </div>
                  </div>
                ) : tc.heroStyle === 'minimal' ? (
                  <div className="py-4">
                    <h2 className="text-3xl font-bold mb-2">{storeName}</h2>
                    <p className="text-xs tracking-widest uppercase opacity-70">Artisanat & Traditions du Sahara</p>
                  </div>
                ) : tc.heroStyle === 'video' ? (
                  <div className="max-w-3xl mx-auto">
                    <div className="aspect-video rounded-2xl border overflow-hidden flex items-center justify-center mb-8 bg-[#FFFBF5]" style={{ borderColor: `${accent}30` }}>
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: accent }}>
                        <Play className="w-8 h-8 fill-current ml-1" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Film Artisanal</h2>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: accent }}>
                      Découvrir la collection
                    </a>
                  </div>
                ) : (
                  <>
                    <p className="text-xs tracking-[0.25em] uppercase mb-4 font-semibold" style={{ color: accent }}>Artisanat Tunisien</p>
                    <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-6">Trésors du<br />Sahara</h2>
                    <p className="text-sm max-w-md mx-auto mb-8 leading-relaxed opacity-80">Pièces uniques inspirées par les traditions millénaires du désert tunisien.</p>
                    <a href="#products" className="inline-block px-8 py-3 rounded-lg text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ backgroundColor: accent }}>Explorer</a>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Category Filter Tabs */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 mb-8 flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveCategory('')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${!activeCategory ? 'text-white' : 'bg-transparent opacity-70 hover:opacity-100'}`}
                style={!activeCategory ? { backgroundColor: accent, borderColor: accent } : { borderColor: `${accent}30` }}
              >
                Tout
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'text-white' : 'bg-transparent opacity-70 hover:opacity-100'}`}
                  style={activeCategory.toLowerCase() === cat.toLowerCase() ? { backgroundColor: accent, borderColor: accent } : { borderColor: `${accent}30` }}
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
                <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block rounded-xl overflow-hidden border transition-all hover:shadow-lg" style={{ borderColor: `${accent}15`, backgroundColor: '#FFFBF5' }}>
                  <div className="aspect-square overflow-hidden bg-[#F5EDE3] relative">
                    {getStoreProductImage(p) ? (
                      <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10" style={{ color: `${accent}25` }} /></div>
                    )}
                    {p.category && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-white/90" style={{ color: accent }}>
                        {p.category}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold line-clamp-1">{p.title}</h3>
                    <p className="text-sm font-bold mt-1" style={{ color: accent }}>{formatStorePrice(p)}</p>
                  </div>
                </Link>
              ))}
            </div>
            {displayProducts.length === 0 && (
              <div className="text-center py-20 opacity-40">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm">Aucun produit trouvé</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t-2 py-10 text-center" style={{ backgroundColor: tc.colors.footerBg, borderColor: `${accent}20` }}>
        <div className="max-w-7xl mx-auto px-6">
          <StorefrontSocialLinks branding={branding} showContact className="mb-4 flex flex-wrap justify-center gap-4 text-xs font-semibold" linkClassName="opacity-70 hover:opacity-100 transition-opacity" />
          <p className="text-xs opacity-60">© {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" /></p>
        </div>
      </footer>
    </div>
  );
}
