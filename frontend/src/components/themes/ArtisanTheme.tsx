'use client';

import React, { useState } from 'react';
import { ShoppingBag, MapPin, Star, Search, Menu, X, Play, Phone, Mail } from 'lucide-react';
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
import { ThemeLayout } from './ThemeLayout';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';
import { StorefrontSocialLinks } from './StorefrontSocialLinks';

/**
 * Artisan Theme — Handmade goods, crafts, organic products.
 * Warm cream background, earthy brown tones, organic shapes,
 * hand-drawn feel with rounded cards and textured accents.
 */
export function ArtisanTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const earthBrown = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const allProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Savon Artisanal Lavande', price: 18, images: [], category: 'Soins' },
        { id: '2', title: 'Bol en Céramique', price: 45, images: [], category: 'Maison' },
        { id: '3', title: 'Huile d\'Olive Bio', price: 32, images: [], category: 'Alimentaire' },
        { id: '4', title: 'Bougie Parfumée', price: 28, images: [], category: 'Maison' },
        { id: '5', title: 'Panier Tressé', price: 65, images: [], category: 'Décoration' },
        { id: '6', title: 'Miel de Montagne', price: 42, images: [], category: 'Alimentaire' },
      ];

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

  const headerTextColor = getLogoSurfaceForColor(tc.colors.headerBg) === 'dark' ? '#FFFFFF' : tc.colors.text;
  const footerTextColor = getLogoSurfaceForColor(tc.colors.footerBg) === 'dark' ? '#FFFFFF' : tc.colors.text;

  return (
    <div
      className={`${theme.typography.fontFamily} min-h-screen flex flex-col`}
      style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}
    >
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header
        className="border-b transition-colors"
        style={{ backgroundColor: tc.colors.headerBg, color: headerTextColor, borderColor: `${earthBrown}20` }}
      >
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-black/5"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link href={branding?.store_path_base || '/'} className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-10 object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                    style={{ backgroundColor: earthBrown }}
                  >
                    {storeName.charAt(0)}
                  </div>
                  <h1 className="text-xl font-semibold font-serif tracking-tight">{storeName}</h1>
                </div>
              )}
            </Link>
          </div>

          {/* Header Search Bar */}
          <div className="hidden sm:flex items-center relative flex-1 max-w-xs mx-4">
            <input
              type="text"
              placeholder="Rechercher une création..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-1.5 pl-4 pr-9 rounded-full text-xs outline-none border transition-colors bg-white/50"
              style={{ borderColor: `${earthBrown}30` }}
            />
            <Search className="w-3.5 h-3.5 absolute right-3 opacity-60 pointer-events-none" />
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a href="#products" className="hover:opacity-70 transition-opacity">Boutique</a>
              <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-70 transition-opacity">Notre Histoire</Link>
              <Link href="/hub/login" className="hover:opacity-70 transition-opacity">Connexion</Link>
            </nav>

            <StorefrontThemeCartLink
              storeId={branding?.store_id}
              storeHost={branding?.store_host}
              storePathBase={branding?.store_path_base}
              primaryColor={earthBrown}
              iconColor={headerTextColor}
              className="inline-flex items-center hover:opacity-70 transition-opacity"
            />
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div
            className="absolute inset-y-0 left-0 w-80 max-w-[85vw] shadow-2xl overflow-y-auto flex flex-col"
            style={{ backgroundColor: tc.colors.background, color: tc.colors.text }}
          >
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: `${earthBrown}20` }}>
              <span className="font-serif font-semibold text-lg">{storeName}</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md hover:bg-black/5" aria-label="Fermer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 space-y-6">
              {/* Mobile Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher une création..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2 pl-3 pr-9 rounded-full border text-xs outline-none bg-white/60"
                  style={{ borderColor: `${earthBrown}30` }}
                />
                <Search className="w-4 h-4 absolute right-3 top-2.5 opacity-50" />
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <h3 className="text-xs uppercase tracking-wider font-semibold opacity-50 px-2 mb-2">Navigation</h3>
                <Link
                  href={branding?.store_path_base || '/'}
                  className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-black/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Accueil
                </Link>
                <a
                  href="#products"
                  className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-black/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Boutique
                </a>
                <Link
                  href={`${branding?.store_path_base || ''}/pages/about`}
                  className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-black/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Notre Histoire
                </Link>
                <Link
                  href="/hub/login"
                  className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-black/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Connexion
                </Link>
              </div>

              {/* Category Links */}
              {categories.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-xs uppercase tracking-wider font-semibold opacity-50 px-2 mb-2">Catégories</h3>
                  <button
                    onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!activeCategory ? 'bg-black/10 font-bold' : 'hover:bg-black/5'}`}
                  >
                    Toutes les catégories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-black/10 font-bold' : 'hover:bg-black/5'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Store Contact */}
              {(branding?.contact_email || branding?.contact_phone || branding?.address) && (
                <div className="pt-4 border-t space-y-2 text-xs opacity-75" style={{ borderColor: `${earthBrown}20` }}>
                  <h3 className="text-xs uppercase tracking-wider font-semibold opacity-70 mb-2">Atelier & Contact</h3>
                  {branding.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" style={{ color: earthBrown }} />
                      <span>{branding.contact_email}</span>
                    </div>
                  )}
                  {branding.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" style={{ color: earthBrown }} />
                      <span>{branding.contact_phone}</span>
                    </div>
                  )}
                  {branding.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" style={{ color: earthBrown }} />
                      <span>{branding.address}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                        <img
                          src={getStoreProductImage(p)}
                          alt={p.title}
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

      {/* Footer */}
      <footer
        className="border-t border-[#5C4033]/10 py-10 text-center text-xs mt-auto"
        style={{ backgroundColor: tc.colors.footerBg, color: footerTextColor }}
      >
        <StorefrontSocialLinks
          branding={branding}
          showContact
          className="mb-4 flex flex-wrap items-center justify-center gap-4 text-xs opacity-80"
          linkClassName="hover:underline font-medium"
        />
        <p className="opacity-70">
          © {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" />
        </p>
      </footer>
    </div>
  );
}
