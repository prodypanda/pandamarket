'use client';

import React, { useState } from 'react';
import { Check, ListFilter, PackageOpen, ShoppingCart, Sparkles, TrendingDown } from 'lucide-react';

export interface FeedTimelineProduct {
  id: string;
  store_id: string;
  store_name: string;
  title: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  is_new_arrival: boolean;
  published_at: string;
  image_url: string | null;
  interest_tags?: string[];
}

export interface FeedTimelineProps {
  products: FeedTimelineProduct[];
  activeFilter: 'all' | 'price_drops' | 'new_arrivals';
  onFilterChange: (filter: 'all' | 'price_drops' | 'new_arrivals') => void;
  onAddToCart?: (product: FeedTimelineProduct) => void;
}

const filters = [
  { id: 'all' as const, label: 'Tous les flux', icon: ListFilter },
  { id: 'price_drops' as const, label: 'Baisses de prix', icon: TrendingDown },
  { id: 'new_arrivals' as const, label: 'Nouveautés', icon: Sparkles },
];

export const FeedTimeline: React.FC<FeedTimelineProps> = ({ products, activeFilter, onFilterChange, onAddToCart }) => {
  const [cartSuccessId, setCartSuccessId] = useState<string | null>(null);

  const handleAddToCartClick = (product: FeedTimelineProduct) => {
    onAddToCart?.(product);
    setCartSuccessId(product.id);
    window.setTimeout(() => setCartSuccessId(null), 2000);
  };

  return (
    <section data-testid="section-feed-timeline" aria-labelledby="feed-timeline-title">
      <div className="flex flex-col gap-4 border-b-2 border-[#171a16] pb-4 dark:border-[#e7eadf] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="feed-timeline-title" className="text-2xl font-black">Nouveautés &amp; Baisses de Prix</h2>
          <p className="mt-1 text-xs text-[#697065] dark:text-[#aeb4a6]">Le registre chronologique des boutiques que vous suivez.</p>
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto" data-testid="feed-filter-tabs" aria-label="Filtrer le fil">
          {filters.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" data-testid={`filter-${id === 'price_drops' ? 'price-drops' : id === 'new_arrivals' ? 'new-arrivals' : 'all'}`} aria-pressed={activeFilter === id} onClick={() => onFilterChange(id)} className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm px-3 text-[11px] font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f5b] ${activeFilter === id ? 'bg-[#171a16] text-white dark:bg-[#e7eadf] dark:text-[#171a16]' : 'bg-transparent text-[#596055] hover:bg-[#e3e6dc] dark:text-[#b8bdae] dark:hover:bg-[#252922]'}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center border-b border-[#c8ccbf] text-center dark:border-[#34382f]" data-testid="empty-feed-timeline">
          <PackageOpen className="h-8 w-8 text-[#087f5b]" />
          <p className="mt-4 text-sm font-bold">Aucune nouveauté récente cette semaine dans ce filtre.</p>
          <p className="mt-1 text-xs text-[#697065] dark:text-[#aeb4a6]">Essayez un autre filtre ou affichez toutes les boutiques.</p>
        </div>
      ) : (
        <div data-testid="feed-timeline-list">
          {products.map((product) => {
            const added = cartSuccessId === product.id;
            const formattedDate = Number.isNaN(new Date(product.published_at).getTime()) ? '' : new Intl.DateTimeFormat('fr-TN', { day: '2-digit', month: 'short' }).format(new Date(product.published_at));
            return (
              <article key={product.id} data-testid={`timeline-item-${product.id}`} className="group grid gap-4 border-b border-[#c8ccbf] py-5 dark:border-[#34382f] sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
                <div className="aspect-square w-24 overflow-hidden rounded-sm bg-[#e4e7de] dark:bg-[#292d26]">
                  {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" /> : <div className="flex h-full items-center justify-center"><PackageOpen className="h-7 w-7 text-[#697065]" /></div>}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold">
                    <span className="text-[#087f5b]">{product.store_name}</span>
                    {formattedDate && <span className="text-[#858b80]">{formattedDate}</span>}
                    {product.is_new_arrival && <span className="rounded-sm bg-[#2456a6] px-1.5 py-0.5 text-[9px] font-black text-white">NOUVEAU</span>}
                    {!!product.discount_percentage && product.discount_percentage > 0 && <span data-testid={`discount-badge-${product.id}`} className="rounded-sm bg-[#c2412d] px-1.5 py-0.5 text-[9px] font-black text-white">-{product.discount_percentage}%</span>}
                  </div>
                  <h3 className="mt-2 max-w-2xl text-base font-black leading-snug text-[#171a16] dark:text-[#f4f5ef]">{product.title}</h3>
                  <div className="mt-3 flex flex-wrap items-baseline gap-2">
                    <span className="text-lg font-black tabular-nums">{product.price.toFixed(3)} TND</span>
                    {product.original_price && product.original_price > product.price && <span className="text-xs tabular-nums text-[#858b80] line-through">{product.original_price.toFixed(3)} TND</span>}
                    {product.interest_tags?.slice(0, 2).map((tag) => <span key={tag} className="text-[10px] font-bold text-[#697065] dark:text-[#aeb4a6]">#{tag}</span>)}
                  </div>
                </div>
                <button type="button" data-testid={`btn-add-to-cart-${product.id}`} onClick={() => handleAddToCartClick(product)} aria-label={added ? `${product.title} ajouté au panier` : `Ajouter ${product.title} au panier`} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-xs font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f5b] sm:min-w-[132px] ${added ? 'bg-[#087f5b] text-white' : 'bg-[#171a16] text-white hover:bg-[#087f5b] dark:bg-[#e7eadf] dark:text-[#171a16] dark:hover:bg-[#8ff0cb]'}`}>
                  {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}{added ? 'Ajouté' : 'Ajouter au panier'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
