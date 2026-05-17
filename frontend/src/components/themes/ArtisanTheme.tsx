import React from 'react';
import { ShoppingBag, MapPin, Star } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath, getStoreBrandLogo, getLogoSurfaceForColor, getStoreThemeLogoSurface } from './shared';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';

/**
 * Artisan Theme — Handmade goods, crafts, organic products.
 * Warm cream background, earthy brown tones, organic shapes,
 * hand-drawn feel with rounded cards and textured accents.
 */
export function ArtisanTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const earthBrown = tc.colors.primary;
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.headerBg, getStoreThemeLogoSurface(theme.id)));
  const displayProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Savon Artisanal Lavande', price: 18, images: [], category: 'Soins' },
        { id: '2', title: 'Bol en Céramique', price: 45, images: [], category: 'Maison' },
        { id: '3', title: 'Huile d\'Olive Bio', price: 32, images: [], category: 'Alimentaire' },
        { id: '4', title: 'Bougie Parfumée', price: 28, images: [], category: 'Maison' },
        { id: '5', title: 'Panier Tressé', price: 65, images: [], category: 'Décoration' },
        { id: '6', title: 'Miel de Montagne', price: 42, images: [], category: 'Alimentaire' },
      ];

  return (
    <div className={`${theme.typography.fontFamily} min-h-screen`} style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header className="border-b" style={{ backgroundColor: tc.colors.headerBg, borderColor: `${earthBrown}20` }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href={branding?.store_path_base || '/'} className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="h-10 object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: earthBrown }}
                >
                  {storeName.charAt(0)}
                </div>
                <h1 className="text-xl font-semibold font-serif">{storeName}</h1>
              </div>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#products" className="hover:opacity-70 transition-opacity">Boutique</a>
            <Link href={`${branding?.store_path_base || ''}/pages/about`} className="hover:opacity-70 transition-opacity">Notre Histoire</Link>
            <Link href={`${branding?.store_path_base || ''}/pages/contact`} className="hover:opacity-70 transition-opacity">Contact</Link>
          </nav>

          <StorefrontThemeCartLink storeId={branding?.store_id} storeHost={branding?.store_host} storePathBase={branding?.store_path_base} primaryColor={earthBrown} iconColor={tc.colors.text} className="inline-flex items-center hover:opacity-70 transition-opacity" />
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
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
          <p className="text-base text-[#3E2723]/60 leading-relaxed mb-8 max-w-lg">
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
            <div className="flex items-center gap-1 text-sm text-[#3E2723]/50">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>4.9 — 200+ avis</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <div className="max-w-6xl mx-auto px-6 mb-10">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['Tout', 'Soins', 'Maison', 'Alimentaire', 'Décoration', 'Textile'].map((cat, i) => (
            <button
              key={cat}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                i === 0
                  ? 'text-white'
                  : 'bg-white border border-[#5C4033]/15 text-[#3E2723]/70 hover:border-[#5C4033]/30'
              }`}
              style={i === 0 ? { backgroundColor: earthBrown } : {}}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <main id="products" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
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
          <div className="text-center py-20 text-[#3E2723]/30">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
            <p className="text-sm">Aucun produit pour le moment</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#5C4033]/10 py-10 text-center">
        <p className="text-xs text-[#3E2723]/40">
          © {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" />
        </p>
      </footer>
    </div>
  );
}

