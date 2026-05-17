import React from 'react';
import { Search, Menu, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { type ThemeProps, useThemeCustomization, colorVars, formatStorePrice, getStoreProductImage, getStorefrontProductPath, getStoreBrandLogo, getLogoSurfaceForColor, getStoreThemeLogoSurface } from './shared';
import { ThemeLayout } from './ThemeLayout';
import { StorefrontThemeCartLink } from './StorefrontThemeCartLink';
import { PoweredByMarketplace } from './PoweredByMarketplace';

export function ClassicTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const tc = useThemeCustomization(theme, branding);
  const logoUrl = getStoreBrandLogo(branding, getLogoSurfaceForColor(tc.colors.primary, getStoreThemeLogoSurface(theme.id)));
  const displayProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Wireless Headphones', price: 149, images: [] },
        { id: '2', title: 'Smart Watch', price: 299, images: [] },
        { id: '3', title: 'Bluetooth Speaker', price: 89, images: [] },
        { id: '4', title: 'Power Bank', price: 45, images: [] },
      ];

  const categories = [...new Set(displayProducts.map((p) => p.category).filter(Boolean))] as string[];

  return (
    <div
      className={`${theme.typography.fontFamily} min-h-screen`}
      style={{ ...colorVars(tc.colors), backgroundColor: tc.colors.background, color: tc.colors.text }}
    >
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: tc.colors.primary, color: tc.colors.background }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Menu className="w-6 h-6 lg:hidden" />
            <Link href={branding?.store_path_base || '/'}>
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="h-8 object-contain" />
              ) : (
                <h1 className={`text-2xl ${theme.typography.headingStyle}`}>{storeName}</h1>
              )}
            </Link>
          </div>
          <div className="hidden lg:flex flex-1 max-w-lg mx-8 relative">
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full py-2 px-4 rounded-md focus:outline-none focus:ring-2"
              style={{ color: tc.colors.text, backgroundColor: tc.colors.background }}
            />
            <Search className="w-5 h-5 absolute right-3 top-2.5" style={{ color: `${tc.colors.text}60` }} />
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/hub/login" className="text-sm font-medium hover:opacity-80 transition-opacity">Connexion</Link>
            <StorefrontThemeCartLink
              storeId={branding?.store_id}
              storeHost={branding?.store_host}
              storePathBase={branding?.store_path_base}
              primaryColor={tc.colors.accent}
              iconColor={tc.colors.background}
              className="inline-flex items-center transition-opacity hover:opacity-80"
              icon="cart"
            />
          </div>
        </div>
      </header>

      {/* Hero */}
      {tc.heroStyle !== 'none' && (
        <section
          className="py-16 text-center"
          style={{
            backgroundColor: tc.heroStyle === 'banner' ? tc.colors.primary : tc.colors.secondary,
            color: tc.heroStyle === 'banner' ? tc.colors.background : tc.colors.text,
          }}
        >
          <div className="max-w-4xl mx-auto px-6">
            {tc.heroStyle === 'split' ? (
              <div className="flex items-center gap-10 text-left">
                <div className="flex-1">
                  <h2 className={`text-3xl md:text-4xl mb-3 ${theme.typography.headingFont || ''} ${theme.typography.headingStyle}`}>
                    Bienvenue chez {storeName}
                  </h2>
                  <p className="opacity-70 mb-6">Découvrez nos produits de qualité sélectionnés avec soin.</p>
                  <a href="#products" className="inline-block px-6 py-2.5 rounded-md text-sm font-semibold" style={{ backgroundColor: tc.colors.accent, color: tc.colors.background }}>
                    Voir le catalogue
                  </a>
                </div>
                <div className="flex-1 hidden md:block aspect-[4/3] rounded-lg" style={{ backgroundColor: `${tc.colors.text}10` }} />
              </div>
            ) : tc.heroStyle === 'minimal' ? (
              <h2 className={`text-2xl ${theme.typography.headingFont || ''} ${theme.typography.headingStyle}`}>
                {storeName}
              </h2>
            ) : (
              <>
                <h2 className={`text-3xl md:text-5xl mb-4 ${theme.typography.headingFont || ''} ${theme.typography.headingStyle}`}>
                  Bienvenue chez {storeName}
                </h2>
                <p className="text-lg opacity-80 mb-6">Découvrez nos produits de qualité sélectionnés avec soin.</p>
              </>
            )}
          </div>
        </section>
      )}

      {/* Products */}
      <main id="products" className="py-12">
        <ThemeLayout variation={tc.layoutVariation} layout={tc.layout} colors={tc.colors} categories={categories}>
          <h2 className="text-xl font-bold pb-4 mb-6" style={{ borderBottom: `1px solid ${tc.colors.text}15`, color: tc.colors.text }}>
            Produits en vedette
          </h2>
          <div className={`grid ${tc.gridClasses}`}>
            {displayProducts.map((p) => (
              <Link
                key={p.id}
                href={getStorefrontProductPath(p, branding?.store_path_base)}
                className="rounded-md overflow-hidden hover:shadow-lg transition-shadow duration-300 block border"
                style={{ backgroundColor: tc.colors.background, borderColor: `${tc.colors.text}15` }}
              >
                <div className="aspect-square w-full overflow-hidden" style={{ backgroundColor: tc.colors.secondary }}>
                  {getStoreProductImage(p) ? (
                    <img src={getStoreProductImage(p)} alt={p.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ color: `${tc.colors.text}30` }}>
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium line-clamp-1" style={{ color: tc.colors.text }}>{p.title}</h3>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-bold" style={{ color: tc.colors.accent }}>{formatStorePrice(p)}</span>
                    <span className="px-3 py-1 text-sm font-medium rounded transition-colors" style={{ backgroundColor: tc.colors.secondary, color: tc.colors.text }}>
                      Voir
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {displayProducts.length === 0 && (
            <div className="text-center py-20" style={{ color: `${tc.colors.text}50` }}>
              <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
              <p>Aucun produit pour le moment</p>
            </div>
          )}
        </ThemeLayout>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs" style={{ backgroundColor: tc.colors.footerBg, color: `${tc.colors.background}80` }}>
        <p>© {new Date().getFullYear()} {storeName} — <PoweredByMarketplace branding={branding} linkClassName="text-[#16C784] hover:underline" /></p>
      </footer>
    </div>
  );
}

