'use client';

import React, { useState } from 'react';
import { Heart, ShoppingBag, User, Search, Menu, X, Play, Phone, Mail, MapPin } from 'lucide-react';
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
 * Boutique Theme — Luxury fashion & lifestyle.
 * Warm ivory background, gold accents, serif typography,
 * generous whitespace, editorial-style product grid.
 */
export function BoutiqueTheme({ theme, storeName, products = [], branding, children }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const goldAccent = tc.colors.accent;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const allProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Silk Evening Dress', price: 450, images: [], category: 'Robes' },
        { id: '2', title: 'Leather Clutch', price: 280, images: [], category: 'Maroquinerie' },
        { id: '3', title: 'Pearl Earrings', price: 195, images: [], category: 'Bijoux' },
        { id: '4', title: 'Cashmere Scarf', price: 320, images: [], category: 'Accessoires' },
        { id: '5', title: 'Suede Heels', price: 380, images: [], category: 'Chaussures' },
        { id: '6', title: 'Gold Bracelet', price: 520, images: [], category: 'Bijoux' },
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

      {/* Announcement Bar */}
      <div
        className="text-center py-2 text-[11px] tracking-[0.25em] uppercase font-medium"
        style={{ backgroundColor: goldAccent, color: '#FFFFFF' }}
      >
        Livraison offerte à partir de 200 TND
      </div>

      {/* Header */}
      <header
        className="border-b transition-colors"
        style={{ backgroundColor: tc.colors.headerBg, color: headerTextColor, borderColor: `${goldAccent}30` }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-1.5 rounded-md hover:opacity-70 transition-opacity"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>

            <nav className="hidden md:flex gap-6 text-xs tracking-[0.15em] uppercase font-medium">
              <a href="#products" className="hover:opacity-60 transition-opacity">Nouveautés</a>
              <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-60 transition-opacity">Maison</Link>
            </nav>
          </div>

          <div className="text-center">
            <Link href={branding?.store_path_base || '/'}>
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-10 mx-auto object-contain" />
              ) : (
                <h1
                  className="text-2xl md:text-3xl font-light tracking-[0.2em] uppercase font-serif"
                  style={{ color: tc.colors.text }}
                >
                  {storeName}
                </h1>
              )}
            </Link>
          </div>

          <div className="flex items-center gap-5">
            {/* Header Search Input */}
            <div className="hidden lg:flex items-center relative max-w-[180px]">
              <input
                type="text"
                placeholder="Recherche..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-1 pl-2 pr-7 text-xs border-b outline-none bg-transparent placeholder-current/40"
                style={{ borderColor: `${goldAccent}50` }}
              />
              <Search className="w-3.5 h-3.5 absolute right-1 opacity-60 pointer-events-none" />
            </div>

            <Link href="/hub/login" className="hidden sm:block hover:opacity-60 transition-opacity" title="Mon Compte">
              <User className="w-5 h-5" strokeWidth={1.5} />
            </Link>
            <Link href="/hub/wishlist" className="hidden sm:block hover:opacity-60 transition-opacity" title="Wishlist">
              <Heart className="w-5 h-5" strokeWidth={1.5} />
            </Link>
            <StorefrontThemeCartLink
              storeId={branding?.store_id}
              storeHost={branding?.store_host}
              storePathBase={branding?.store_path_base}
              primaryColor={goldAccent}
              iconColor={headerTextColor}
              className="inline-flex items-center transition-opacity hover:opacity-60"
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
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: `${goldAccent}20` }}>
              <span className="font-serif tracking-[0.15em] uppercase text-lg">{storeName}</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:opacity-60" aria-label="Fermer">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6 flex-1 space-y-6">
              {/* Mobile Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher une pièce..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2 pl-3 pr-9 border text-xs tracking-wider outline-none"
                  style={{ borderColor: `${goldAccent}40`, backgroundColor: tc.colors.background, color: tc.colors.text }}
                />
                <Search className="w-4 h-4 absolute right-3 top-2.5 opacity-50" />
              </div>

              {/* Navigation Links */}
              <div className="space-y-2">
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-50 mb-3">Navigation</h3>
                <Link
                  href={branding?.store_path_base || '/'}
                  className="block text-xs uppercase tracking-[0.15em] py-1.5 hover:opacity-60"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Accueil
                </Link>
                <a
                  href="#products"
                  className="block text-xs uppercase tracking-[0.15em] py-1.5 hover:opacity-60"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Catalogue
                </a>
                <Link
                  href={`${branding?.store_path_base || ''}/pages/about`}
                  className="block text-xs uppercase tracking-[0.15em] py-1.5 hover:opacity-60"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  À propos
                </Link>
                <Link
                  href="/hub/login"
                  className="block text-xs uppercase tracking-[0.15em] py-1.5 hover:opacity-60"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Connexion
                </Link>
              </div>

              {/* Category Links */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-50 mb-3">Collections</h3>
                  <button
                    onClick={() => { setActiveCategory(''); setMobileMenuOpen(false); }}
                    className={`block w-full text-left text-xs uppercase tracking-[0.15em] py-1.5 ${!activeCategory ? 'font-bold' : 'opacity-80 hover:opacity-100'}`}
                    style={{ color: !activeCategory ? goldAccent : 'inherit' }}
                  >
                    Toutes les collections
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setActiveCategory(cat); setMobileMenuOpen(false); }}
                      className={`block w-full text-left text-xs uppercase tracking-[0.15em] py-1.5 ${activeCategory === cat ? 'font-bold' : 'opacity-80 hover:opacity-100'}`}
                      style={{ color: activeCategory === cat ? goldAccent : 'inherit' }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Store Contact */}
              {(branding?.contact_email || branding?.contact_phone || branding?.address) && (
                <div className="pt-6 border-t space-y-2 text-xs opacity-75" style={{ borderColor: `${goldAccent}20` }}>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-60 mb-2">Service Client</h3>
                  {branding.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" style={{ color: goldAccent }} />
                      <span>{branding.contact_email}</span>
                    </div>
                  )}
                  {branding.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" style={{ color: goldAccent }} />
                      <span>{branding.contact_phone}</span>
                    </div>
                  )}
                  {branding.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" style={{ color: goldAccent }} />
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
        <main className="py-8 max-w-7xl mx-auto px-6 flex-1 w-full">{children}</main>
      ) : (
        <div className="flex-1 w-full">
          {/* Hero (respects heroStyle: banner, split, minimal, video, none) */}
          {tc.heroStyle !== 'none' && (
            <section className="max-w-7xl mx-auto px-6 py-16 md:py-24 text-center">
              {tc.heroStyle === 'split' ? (
                <div className="flex flex-col md:flex-row items-center gap-12 text-left">
                  <div className="flex-1">
                    <p className="text-xs tracking-[0.3em] uppercase mb-4 font-medium" style={{ color: goldAccent }}>
                      Collection Printemps 2026
                    </p>
                    <h2 className="text-4xl md:text-5xl font-light tracking-[0.1em] uppercase font-serif mb-6 leading-tight">
                      {storeName}
                    </h2>
                    <p className="text-sm opacity-70 max-w-md mb-8 leading-relaxed">
                      Découvrez notre sélection de pièces d&apos;exception confectionnées avec précision et passion.
                    </p>
                    <a
                      href="#products"
                      className="inline-block px-10 py-3 text-xs tracking-[0.2em] uppercase font-medium border transition-all hover:scale-[1.02]"
                      style={{ borderColor: goldAccent, color: goldAccent }}
                    >
                      Découvrir
                    </a>
                  </div>
                  <div className="flex-1 w-full aspect-[3/4] border p-4 bg-[#EDE8E1]" style={{ borderColor: `${goldAccent}40` }}>
                    <div className="w-full h-full border border-dashed flex items-center justify-center" style={{ borderColor: `${goldAccent}60` }}>
                      <ShoppingBag className="w-12 h-12 opacity-30" strokeWidth={1} />
                    </div>
                  </div>
                </div>
              ) : tc.heroStyle === 'video' ? (
                <div className="max-w-3xl mx-auto">
                  <p className="text-xs tracking-[0.3em] uppercase mb-4 font-medium" style={{ color: goldAccent }}>
                    Savoir-faire & Maison
                  </p>
                  <h2 className="text-3xl md:text-5xl font-light tracking-[0.1em] uppercase font-serif mb-8">
                    {storeName}
                  </h2>
                  <div className="relative aspect-video border bg-[#EDE8E1] flex items-center justify-center group cursor-pointer" style={{ borderColor: `${goldAccent}40` }}>
                    <div className="w-14 h-14 rounded-full border flex items-center justify-center group-hover:scale-110 transition-transform" style={{ borderColor: goldAccent, color: goldAccent }}>
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : tc.heroStyle === 'minimal' ? (
                <div className="max-w-xl mx-auto py-6">
                  <p className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium" style={{ color: goldAccent }}>
                    Maison {storeName}
                  </p>
                  <h2 className="text-3xl md:text-4xl font-light tracking-[0.15em] uppercase font-serif">
                    Élégance Intemporelle
                  </h2>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  <p className="text-xs tracking-[0.3em] uppercase mb-4 font-medium" style={{ color: goldAccent }}>
                    Collection Exclusive 2026
                  </p>
                  <h2 className="text-4xl md:text-6xl font-light tracking-[0.1em] uppercase font-serif mb-6 leading-tight">
                    L&apos;Élégance<br />Redéfinie
                  </h2>
                  <p className="text-sm opacity-70 max-w-md mx-auto mb-8 leading-relaxed">
                    Découvrez notre sélection de pièces intemporelles, confectionnées avec les matériaux les plus nobles.
                  </p>
                  <a
                    href="#products"
                    className="inline-block px-10 py-3 text-xs tracking-[0.2em] uppercase font-medium border transition-all hover:scale-[1.02]"
                    style={{ borderColor: goldAccent, color: goldAccent }}
                  >
                    Découvrir la collection
                  </a>
                </div>
              )}
            </section>
          )}

          {/* Category Filter Tabs */}
          {categories.length > 0 && (
            <div className="max-w-7xl mx-auto px-6 mb-12 flex flex-wrap justify-center gap-6 text-xs tracking-[0.15em] uppercase">
              <button
                onClick={() => setActiveCategory('')}
                className={`pb-1 border-b-2 transition-all ${!activeCategory ? 'font-bold' : 'opacity-60 hover:opacity-100'}`}
                style={{ borderColor: !activeCategory ? goldAccent : 'transparent' }}
              >
                Tout
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`pb-1 border-b-2 transition-all ${activeCategory === cat ? 'font-bold' : 'opacity-60 hover:opacity-100'}`}
                  style={{ borderColor: activeCategory === cat ? goldAccent : 'transparent' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Main Product Section */}
          <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
            <ThemeLayout
              variation={tc.layoutVariation}
              layout={tc.layout}
              colors={tc.colors}
              categories={categories}
              activeCategory={activeCategory}
            >
              <div className={`grid ${tc.gridClasses}`} style={{ rowGap: '3.5rem' }}>
                {displayProducts.map((p) => (
                  <Link key={p.id} href={getStorefrontProductPath(p, branding?.store_path_base)} className="group block">
                    <div className="aspect-[3/4] mb-5 overflow-hidden bg-[#EDE8E1]">
                      {getStoreProductImage(p) ? (
                        <img
                          src={getStoreProductImage(p)}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#C9A96E]/40">
                          <ShoppingBag className="w-10 h-10" strokeWidth={1} />
                        </div>
                      )}
                    </div>
                    {p.category && (
                      <p className="text-[10px] tracking-[0.2em] uppercase mb-1" style={{ color: goldAccent }}>
                        {p.category}
                      </p>
                    )}
                    <h3 className="text-sm font-medium tracking-wide">{p.title}</h3>
                    <p className="text-sm mt-1" style={{ color: goldAccent }}>
                      {formatStorePrice(p)}
                    </p>
                  </Link>
                ))}
              </div>
              {displayProducts.length === 0 && (
                <div className="text-center py-20 opacity-50">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4" strokeWidth={1} />
                  <p className="text-sm tracking-wide">Aucun produit ne correspond à votre recherche</p>
                </div>
              )}
            </ThemeLayout>
          </main>
        </div>
      )}

      {/* Footer */}
      <footer
        className="border-t py-12 text-center text-xs mt-auto"
        style={{ backgroundColor: tc.colors.footerBg, color: footerTextColor, borderColor: `${goldAccent}20` }}
      >
        <StorefrontSocialLinks
          branding={branding}
          showContact
          className="mb-4 flex flex-wrap items-center justify-center gap-6 text-xs tracking-widest uppercase opacity-90"
          linkClassName="hover:opacity-70 transition-opacity"
        />
        <p className="tracking-[0.15em] uppercase opacity-75">
          © {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="hover:underline" linkStyle={{ color: goldAccent }} />
        </p>
      </footer>
    </div>
  );
}
