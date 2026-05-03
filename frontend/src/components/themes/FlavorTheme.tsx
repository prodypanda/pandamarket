import React from 'react';
import { ThemeConfig } from '../../lib/themes';
import { ShoppingBag, ShoppingCart, UtensilsCrossed, Clock, Flame } from 'lucide-react';
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
 * Flavor Theme — Food, restaurants, bakeries, gourmet products.
 * Warm off-white background, burnt orange/terracotta accent,
 * bold typography, appetizing card layout with rounded corners.
 */
export function FlavorTheme({ theme, storeName, products = [], branding }: ThemeProps) {
  const accentColor = branding?.primary_color || '#D4451A';
  const displayProducts = products.length > 0 ? products : [
    { id: '1', title: 'Coffret Pâtisseries Fines', price: 45, images: [], category: 'Pâtisserie' },
    { id: '2', title: 'Huile d\'Olive Extra Vierge', price: 32, images: [], category: 'Épicerie' },
    { id: '3', title: 'Assortiment Makroudh', price: 28, images: [], category: 'Traditionnel' },
    { id: '4', title: 'Café Torréfié Artisanal', price: 22, images: [], category: 'Boissons' },
    { id: '5', title: 'Harissa Maison Bio', price: 15, images: [], category: 'Épicerie' },
    { id: '6', title: 'Coffret Dattes Deglet Nour', price: 55, images: [], category: 'Fruits Secs' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFCF8', color: '#2D1B0E' }}>
      {branding?.favicon_url && <link rel="icon" href={branding.favicon_url} />}

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: 'rgba(255,252,248,0.9)', borderColor: `${accentColor}15` }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={storeName} className="h-9 object-contain" />
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: accentColor }}>
                  <UtensilsCrossed className="w-4.5 h-4.5" strokeWidth={2} />
                </div>
                <span className="text-lg font-extrabold tracking-tight">{storeName}</span>
              </>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#2D1B0E]/60">
            <a href="#" className="hover:text-[#2D1B0E] transition-colors">Menu</a>
            <a href="#" className="hover:text-[#2D1B0E] transition-colors">Spécialités</a>
            <a href="#" className="hover:text-[#2D1B0E] transition-colors">À propos</a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="relative text-[#2D1B0E]/60 hover:text-[#2D1B0E] transition-colors">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white font-bold" style={{ backgroundColor: accentColor }}>0</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6" style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
            <Flame className="w-3.5 h-3.5" />
            Fait maison avec passion
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
            Des saveurs<br />
            <span style={{ color: accentColor }}>authentiques</span>
          </h2>
          <p className="text-base text-[#2D1B0E]/50 leading-relaxed mb-8 max-w-md mx-auto">
            Découvrez nos produits artisanaux préparés avec des ingrédients frais et locaux. Livraison à domicile.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="#products" className="px-7 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: accentColor }}>
              Commander maintenant
            </a>
            <div className="flex items-center gap-1.5 text-sm text-[#2D1B0E]/40">
              <Clock className="w-4 h-4" />
              <span>Livraison en 24-48h</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <div className="max-w-6xl mx-auto px-6 mb-10">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['Tout', 'Pâtisserie', 'Épicerie', 'Traditionnel', 'Boissons', 'Fruits Secs'].map((cat, i) => (
            <button
              key={cat}
              className={`px-5 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all ${
                i === 0 ? 'text-white shadow-md' : 'bg-white border border-[#2D1B0E]/8 text-[#2D1B0E]/60 hover:border-[#2D1B0E]/20'
              }`}
              style={i === 0 ? { backgroundColor: accentColor } : {}}
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
            <Link key={p.id} href={`/hub/products/${p.id}`} className="group block bg-white rounded-2xl overflow-hidden border border-[#2D1B0E]/5 hover:shadow-lg hover:shadow-[#D4451A]/5 transition-all duration-300">
              <div className="aspect-[4/3] overflow-hidden bg-[#FFF0E6] relative">
                {p.images && p.images[0]?.url ? (
                  <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: `${accentColor}20` }}>
                    <ShoppingBag className="w-10 h-10" />
                  </div>
                )}
                {p.category && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-sm" style={{ color: accentColor }}>
                    {p.category}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold line-clamp-1 mb-1.5">{p.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold" style={{ color: accentColor }}>{p.price.toFixed(3)} TND</span>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-75" style={{ backgroundColor: accentColor }}>
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {displayProducts.length === 0 && (
          <div className="text-center py-20 text-[#2D1B0E]/25">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4" />
            <p className="text-sm">Aucun produit pour le moment</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-10 text-center" style={{ borderColor: `${accentColor}10` }}>
        <p className="text-xs text-[#2D1B0E]/30">
          © {new Date().getFullYear()} {storeName} — Propulsé par{' '}
          <Link href="/" className="text-[#16C784] hover:underline">🐼 PandaMarket</Link>
        </p>
      </footer>
    </div>
  );
}
