import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag, Heart, User } from 'lucide-react';
import Link from 'next/link';

interface StoreProduct {
  id: string;
  title: string;
  price: number;
  images?: { url: string }[];
  category?: string;
}

interface StoreBranding {
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  favicon_url?: string;
}

interface ThemeProps {
  theme: ThemeConfig;
  storeName: string;
  products?: StoreProduct[];
  branding?: StoreBranding;
}

/**
 * Boutique Theme — Luxury fashion & lifestyle.
 * Warm ivory background, gold accents, serif typography,
 * generous whitespace, editorial-style product grid.
 */
export function BoutiqueTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const goldAccent = branding?.primary_color || '#C9A96E';
  const displayProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Silk Evening Dress', price: 450, images: [] },
        { id: '2', title: 'Leather Clutch', price: 280, images: [] },
        { id: '3', title: 'Pearl Earrings', price: 195, images: [] },
        { id: '4', title: 'Cashmere Scarf', price: 320, images: [] },
        { id: '5', title: 'Suede Heels', price: 380, images: [] },
        { id: '6', title: 'Gold Bracelet', price: 520, images: [] },
      ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F0EB', color: '#1C1C1C' }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Announcement Bar */}
      <div
        className="text-center py-2 text-xs tracking-[0.2em] uppercase"
        style={{ backgroundColor: goldAccent, color: '#fff' }}
      >
        Livraison gratuite à partir de 200 TND
      </div>

      {/* Header */}
      <header className="border-b" style={{ borderColor: `${goldAccent}30` }}>
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <nav className="hidden md:flex gap-8 text-xs tracking-[0.15em] uppercase font-medium">
            <a href="#" className="hover:opacity-60 transition-opacity">Nouveautés</a>
            <a href="#" className="hover:opacity-60 transition-opacity">Collections</a>
          </nav>

          <div className="text-center flex-1 md:flex-none">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={storeName} className="h-10 mx-auto object-contain" />
            ) : (
              <h1
                className="text-2xl md:text-3xl font-light tracking-[0.2em] uppercase font-serif"
                style={{ color: '#1C1C1C' }}
              >
                {storeName}
              </h1>
            )}
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button className="hover:opacity-60 transition-opacity">
              <User className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button className="hover:opacity-60 transition-opacity">
              <Heart className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button className="hover:opacity-60 transition-opacity relative">
              <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
              <span
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white"
                style={{ backgroundColor: goldAccent }}
              >
                0
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <p
          className="text-xs tracking-[0.3em] uppercase mb-4 font-medium"
          style={{ color: goldAccent }}
        >
          Collection Printemps 2026
        </p>
        <h2 className="text-4xl md:text-6xl font-light tracking-[0.1em] uppercase font-serif mb-6">
          L&apos;Élégance<br />Redéfinie
        </h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
          Découvrez notre sélection de pièces intemporelles, confectionnées avec les matériaux les plus nobles.
        </p>
        <a
          href="#products"
          className="inline-block px-10 py-3 text-xs tracking-[0.2em] uppercase font-medium border transition-all hover:scale-[1.02]"
          style={{ borderColor: goldAccent, color: goldAccent }}
        >
          Découvrir
        </a>
      </section>

      {/* Products */}
      <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-14">
          {displayProducts.map((p) => (
            <Link key={p.id} href={`/hub/products/${p.id}`} className="group block">
              <div className="aspect-[3/4] mb-5 overflow-hidden bg-[#EDE8E1]">
                {p.images && p.images[0]?.url ? (
                  <img
                    src={p.images[0].url}
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
                {p.price.toFixed(3)} TND
              </p>
            </Link>
          ))}
        </div>
        {displayProducts.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4" strokeWidth={1} />
            <p className="text-sm tracking-wide">Aucun produit pour le moment</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-12 text-center" style={{ borderColor: `${goldAccent}20` }}>
        <p className="text-xs tracking-[0.15em] uppercase text-gray-400">
          {storeName} — Propulsé par{' '}
          <Link href="/" className="hover:underline" style={{ color: goldAccent }}>
            🐼 PandaMarket
          </Link>
        </p>
      </footer>
    </div>
  );
}
