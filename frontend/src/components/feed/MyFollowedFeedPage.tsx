'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Compass, LogIn, PackageSearch, Radio, RefreshCw, Store } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { FollowedStoresCarousel, type FollowedStoreItem } from './FollowedStoresCarousel';
import { FeedTimeline, type FeedTimelineProduct } from './FeedTimeline';
import { DiscoverSimilarStores, type SimilarStore, type RecommendedProduct } from './DiscoverSimilarStores';

export type { FollowedStoreItem, FeedTimelineProduct, RecommendedProduct, SimilarStore };

export interface MyFollowedFeedData {
  followed_stores: FollowedStoreItem[];
  timeline_products: FeedTimelineProduct[];
  recommended_products: RecommendedProduct[];
  similar_stores: SimilarStore[];
}

export const MyFollowedFeedPage: React.FC<{
  initialData?: MyFollowedFeedData | null;
  isAuthenticated?: boolean;
  onAddToCart?: (product: FeedTimelineProduct) => void;
}> = ({ initialData = null, isAuthenticated = true, onAddToCart }) => {
  const [data, setData] = useState<MyFollowedFeedData | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData && isAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'price_drops' | 'new_arrivals'>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const loadFeedData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [subsRes, recsRes] = await Promise.all([
        fetchWithCsrf('/api/pd/buyer/subscriptions'),
        fetchWithCsrf('/api/pd/marketplace/recommendations/buyer-interests'),
      ]);

      if (!subsRes.ok || !recsRes.ok) throw new Error('Erreur lors du chargement du fil personnalisé.');

      const subsJson = await subsRes.json();
      const recsJson = await recsRes.json();
      setData({
        followed_stores: subsJson.followed_stores || [],
        timeline_products: subsJson.timeline_products || [],
        recommended_products: recsJson.recommended_products || [],
        similar_stores: recsJson.similar_stores || [],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le fil.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!initialData && isAuthenticated) void loadFeedData();
  }, [initialData, isAuthenticated, loadFeedData]);

  const handleSubscribeRecommended = async (store: SimilarStore) => {
    try {
      await fetchWithCsrf(`/api/pd/stores/${store.id}/subscribe`, { method: 'POST' });
      setData((prev) => prev ? {
        ...prev,
        followed_stores: [...prev.followed_stores, {
          id: store.id,
          name: store.name,
          subdomain: store.subdomain,
          logo_url: null,
          unread_updates_count: 0,
          is_verified: true,
        }],
        similar_stores: prev.similar_stores.filter((item) => item.id !== store.id),
      } : prev);
    } catch {
      setError('Erreur lors de l’abonnement à la boutique.');
    }
  };

  const filteredProducts = useMemo(() => (data?.timeline_products || []).filter((product) => {
    if (selectedStoreId && product.store_id !== selectedStoreId) return false;
    if (activeFilter === 'price_drops' && (!product.discount_percentage || product.discount_percentage <= 0)) return false;
    if (activeFilter === 'new_arrivals' && !product.is_new_arrival) return false;
    return true;
  }), [data, activeFilter, selectedStoreId]);

  if (!isAuthenticated) {
    return (
      <main className="min-h-[70vh] bg-[#f4f5ef] px-4 py-12 dark:bg-[#111310]" data-testid="guest-feed-teaser">
        <div className="mx-auto grid max-w-5xl gap-10 border-y border-[#171a16] py-10 dark:border-[#e7eadf] md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-2xl">
            <Radio className="mb-6 h-9 w-9 text-[#087f5b]" aria-hidden="true" />
            <h1 className="max-w-xl text-4xl font-black leading-[1.02] text-[#171a16] dark:text-[#f4f5ef] sm:text-5xl">
              Votre marché, organisé autour des boutiques que vous suivez.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#555c52] dark:text-[#b7bcae]">
              Connectez-vous pour retrouver les nouveaux arrivages, les changements de prix et les découvertes adaptées à vos intérêts.
            </p>
          </div>
          <a href="/login" className="inline-flex h-12 items-center justify-center gap-3 rounded-md bg-[#171a16] px-5 text-sm font-bold text-white transition-colors hover:bg-[#087f5b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#087f5b] dark:bg-[#f4f5ef] dark:text-[#171a16]">
            <LogIn className="h-4 w-4" /> Se connecter <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f5ef] px-4 py-8 dark:bg-[#111310]" data-testid="feed-loading-state">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-28 border-y border-[#c8ccbf] dark:border-[#34382f]" />
          <div className="mt-8 h-24 border-b border-[#c8ccbf] dark:border-[#34382f]" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <div className="space-y-0">{[1, 2, 3].map((item) => <div key={item} className="h-40 border-b border-[#c8ccbf] bg-white/55 dark:border-[#34382f] dark:bg-white/[0.03]" />)}</div>
            <div className="h-96 border-y border-[#c8ccbf] dark:border-[#34382f]" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[70vh] bg-[#f4f5ef] px-4 py-12 dark:bg-[#111310]" role="alert" data-testid="feed-error-state">
        <div className="mx-auto max-w-5xl border-y border-[#b42318] py-8 text-[#78150f] dark:text-[#ffb4aa]">
          <AlertTriangle className="h-8 w-8" aria-hidden="true" />
          <h1 className="mt-5 text-3xl font-black">Erreur de chargement</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6">{error}</p>
          <button type="button" onClick={loadFeedData} className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-[#b42318] px-4 text-sm font-bold text-white hover:bg-[#8f1c13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b42318]">
            <RefreshCw className="h-4 w-4" /> Réessayer
          </button>
        </div>
      </main>
    );
  }

  const followedStores = data?.followed_stores || [];
  const recommendedProducts = data?.recommended_products || [];
  const similarStores = data?.similar_stores || [];
  const updateCount = data?.timeline_products.length || 0;

  return (
    <main className="min-h-screen bg-[#f4f5ef] text-[#171a16] selection:bg-[#087f5b] selection:text-white dark:bg-[#111310] dark:text-[#f4f5ef]" data-testid="my-followed-feed-page">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <header className="border-y border-[#171a16] py-5 dark:border-[#e7eadf]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#087f5b]"><Radio className="h-4 w-4" /> Fil acheteur en direct</div>
              <h1 className="text-4xl font-black leading-none sm:text-5xl">Mon Fil Panda</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#596055] dark:text-[#b8bdae]">Nouveautés, remises exclusives et suggestions personnalisées de vos boutiques préférées.</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2 text-sm"><Store className="h-4 w-4 text-[#087f5b]" /><strong>{followedStores.length}</strong><span className="text-[#697065] dark:text-[#aeb4a6]">boutiques</span></div>
              <div className="flex items-center gap-2 text-sm"><PackageSearch className="h-4 w-4 text-[#c2412d]" /><strong>{updateCount}</strong><span className="text-[#697065] dark:text-[#aeb4a6]">mises à jour</span></div>
              <div className="flex items-center gap-2 text-sm"><Compass className="h-4 w-4 text-[#2456a6]" /><strong>{recommendedProducts.length}</strong><span className="text-[#697065] dark:text-[#aeb4a6]">découvertes</span></div>
              <button type="button" onClick={loadFeedData} data-testid="feed-refresh-btn" className="inline-flex h-10 items-center gap-2 rounded-md border border-[#171a16] px-3 text-xs font-bold transition-colors hover:bg-[#171a16] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#087f5b] dark:border-[#e7eadf] dark:hover:bg-[#e7eadf] dark:hover:text-[#171a16]">
                <RefreshCw className="h-4 w-4" /> Actualiser
              </button>
            </div>
          </div>
        </header>

        <div className="mt-8">
          <FollowedStoresCarousel followedStores={followedStores} selectedStoreId={selectedStoreId} onSelectStore={setSelectedStoreId} />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(300px,0.86fr)]">
          <FeedTimeline products={filteredProducts} activeFilter={activeFilter} onFilterChange={setActiveFilter} onAddToCart={onAddToCart} />
          <DiscoverSimilarStores similarStores={similarStores} recommendedProducts={recommendedProducts} onFollowStore={handleSubscribeRecommended} />
        </div>
      </div>
    </main>
  );
};
