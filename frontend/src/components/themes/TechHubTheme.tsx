import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag, ShoppingCart, Zap, ChevronRight, Cpu } from 'lucide-react';
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
 * TechHub Theme — Electronics, gadgets, tech products.
 * Dark background, cyan/electric blue accents, sharp edges,
 * grid-based layout with spec-card style product cards.
 */
export function TechHubTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const accentColor = branding?.primary_color || '#00D4FF';
  const displayProducts = products.length > 0
    ? products
    : [
        { id: '1', title: 'Wireless Pro Earbuds', price: 189, images: [], category: 'Audio' },
        { id: '2', title: 'Mechanical Keyboard RGB', price: 350, images: [], category: 'Peripherals' },
        { id: '3', title: 'Ultra-Wide Monitor 34"', price: 1200, images: [], category: 'Displays' },
        { id: '4', title: 'Gaming Mouse 16K DPI', price: 95, images: [], category: 'Peripherals' },
        { id: '5', title: 'USB-C Hub 12-in-1', price: 75, images: [], category: 'Accessories' },
        { id: '6', title: 'Portable SSD 2TB', price: 280, images: [], category: 'Storage' },
        { id: '7', title: 'Webcam 4K HDR', price: 165, images: [], category: 'Video' },
        { id: '8', title: 'Smart LED Strip 5m', price: 55, images: [], category: 'Lighting' },
      ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A', color: '#E0E0E0' }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header className="border-b border-white/5 sticky top-0 z-50 backdrop-blur-xl" style={{ backgroundColor: 'rgba(10,10,10,0.85)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={storeName} className="h-8 object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <Cpu className="w-6 h-6" style={{ color: accentColor }} />
                <span className="text-lg font-bold tracking-tight">{storeName}</span>
              </div>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Products</a>
            <a href="#" className="hover:text-white transition-colors">Deals</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
              style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
            >
              <Zap className="w-4 h-4" />
              Deals
            </button>
            <button className="relative hover:text-white transition-colors text-gray-400">
              <ShoppingCart className="w-5 h-5" />
              <span
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold"
                style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
              >
                0
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[150px] opacity-10"
            style={{ backgroundColor: accentColor }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-2xl">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border"
              style={{ borderColor: `${accentColor}40`, color: accentColor, backgroundColor: `${accentColor}10` }}
            >
              <Zap className="w-3 h-3" />
              Nouveautés Tech
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
              La tech de<br />
              <span style={{ color: accentColor }}>demain</span>,<br />
              disponible aujourd&apos;hui
            </h2>
            <p className="text-base text-gray-400 leading-relaxed mb-8 max-w-lg">
              Découvrez notre sélection de produits tech haute performance.
              Livraison rapide partout en Tunisie.
            </p>
            <a
              href="#products"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-bold transition-all hover:shadow-lg hover:shadow-[#00D4FF]/20 hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
            >
              Explorer le catalogue
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Products */}
      <main id="products" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold">Tous les produits</h3>
          <span className="text-sm text-gray-500">{displayProducts.length} articles</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayProducts.map((p) => (
            <Link
              key={p.id}
              href={`/hub/products/${p.id}`}
              className="group block rounded-lg overflow-hidden border border-white/5 hover:border-white/15 transition-all duration-300"
              style={{ backgroundColor: '#111111' }}
            >
              <div className="aspect-square overflow-hidden bg-[#1A1A1A] relative">
                {p.images && p.images[0]?.url ? (
                  <img
                    src={p.images[0].url}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: `${accentColor}20` }}>
                    <ShoppingBag className="w-10 h-10" />
                  </div>
                )}
                {p.category && (
                  <span
                    className="absolute top-3 left-3 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                  >
                    {p.category}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-medium text-white line-clamp-1 mb-2">{p.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: accentColor }}>
                    {p.price.toFixed(3)} TND
                  </span>
                  <span
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium px-2 py-1 rounded"
                    style={{ backgroundColor: accentColor, color: '#0A0A0A' }}
                  >
                    Voir
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {displayProducts.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
            <p className="text-sm">Aucun produit pour le moment</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 text-center">
        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} {storeName} — Propulsé par{' '}
          <Link href="/" className="text-[#16C784] hover:underline">
            🐼 PandaMarket
          </Link>
        </p>
      </footer>
    </div>
  );
}
