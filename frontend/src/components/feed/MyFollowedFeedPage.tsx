'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Compass, LogIn, PackageSearch, Radio, RefreshCw, Store, Sparkles } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { HubNavbar } from '@/components/hub/HubNavbar';
import { HubFooter } from '@/components/hub/HubFooter';
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
  showNavAndFooter?: boolean;
}> = ({ initialData = null, isAuthenticated = true, onAddToCart, showNavAndFooter = true }) => {
  let cartContext: ReturnType<typeof useCart> | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    cartContext = useCart();
  } catch {
    cartContext = undefined;
  }

  const [data, setData] = useState<MyFollowedFeedData | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData && isAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'price_drops' | 'new_arrivals'>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const handleAddToCart = useCallback((product: FeedTimelineProduct) => {
    if (onAddToCart) {
      onAddToCart(product);
    } else if (cartContext?.addToCart) {
      cartContext.addToCart({
        product_id: product.id,
        title: product.title,
        price: product.price,
        quantity: 1,
        store_id: product.store_id,
        store_name: product.store_name,
        image_url: product.image_url,
      });
    }
  }, [cartContext, onAddToCart]);

  const loadFeedData = useCallback(async (refreshing = false) => {
    if (!isAuthenticated) return;
    if (refreshing) setIsRefreshing(true);
    else setLoading(true);
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
      setIsRefreshing(false);
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

  const followedStores = data?.followed_stores || [];
  const recommendedProducts = data?.recommended_products || [];
  const similarStores = data?.similar_stores || [];
  const updateCount = data?.timeline_products.length || 0;

  const content = (
    <>
      {!isAuthenticated && (
        <main className="min-h-[70vh] bg-gradient-to-b from-gray-50 to-white px-4 py-16 dark:from-[#0b0f17] dark:to-[#12161f]" data-testid="guest-feed-teaser">
          <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200/80 bg-white/90 p-8 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#161a22]/90 sm:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#087f5b] shadow-inner dark:bg-emerald-950/50 dark:text-emerald-400">
                <Radio className="h-8 w-8 animate-pulse" />
              </div>
              <h1 className="mt-6 text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
                Votre marché, organisé autour des boutiques que vous suivez.
              </h1>
              <p className="mt-3 max-w-xl text-base text-gray-500 dark:text-gray-400">
                Connectez-vous pour retrouver en temps réel les nouveaux arrivages, les baisses de prix et les découvertes adaptées à vos centres d&apos;intérêt.
              </p>
              <a
                href="/login"
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gray-900 px-7 text-sm font-bold text-white shadow-lg shadow-gray-900/20 transition hover:bg-[#087f5b] hover:shadow-emerald-900/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f5b] dark:bg-emerald-500 dark:text-gray-900 dark:hover:bg-emerald-400"
              >
                <LogIn className="h-4 w-4" />
                <span>Se connecter pour voir mon fil</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </main>
      )}

      {isAuthenticated && loading && (
        <main className="min-h-screen bg-gray-50/50 px-4 py-8 dark:bg-[#0b0f17]" data-testid="feed-loading-state">
          <div className="mx-auto max-w-7xl animate-pulse space-y-6">
            <div className="h-28 rounded-2xl bg-gray-200/70 dark:bg-white/5" />
            <div className="h-32 rounded-2xl bg-gray-200/70 dark:bg-white/5" />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,0.86fr)]">
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-36 rounded-2xl bg-gray-200/70 dark:bg-white/5" />
                ))}
              </div>
              <div className="h-96 rounded-2xl bg-gray-200/70 dark:bg-white/5" />
            </div>
          </div>
        </main>
      )}

      {isAuthenticated && !loading && error && (
        <main className="min-h-[70vh] bg-gray-50/50 px-4 py-12 dark:bg-[#0b0f17]" role="alert" data-testid="feed-error-state">
          <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50/80 p-8 text-center text-red-900 shadow-lg dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-600 dark:text-red-400" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-black">Erreur de chargement</h2>
            <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => void loadFeedData(false)}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow-md transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <RefreshCw className="h-4 w-4" /> Réessayer
            </button>
          </div>
        </main>
      )}

      {isAuthenticated && !loading && !error && (
        <main className="min-h-screen bg-gray-50/60 text-gray-900 dark:bg-[#0b0f17] dark:text-white" data-testid="my-followed-feed-page">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {/* Page Header */}
            <header className="rounded-3xl border border-gray-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#161a22]/90 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-[#087f5b] dark:bg-emerald-950/50 dark:text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <Radio className="h-3.5 w-3.5" />
                    <span>Fil acheteur en direct</span>
                  </div>

                  <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
                    Mon Fil Panda
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    Nouveautés, remises exclusives et suggestions personnalisées de vos boutiques préférées.
                  </p>
                </div>

                {/* Stats & Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-gray-200/80 bg-gray-50/80 px-3.5 py-2 text-xs font-bold dark:border-white/10 dark:bg-white/5">
                    <Store className="h-4 w-4 text-[#087f5b] dark:text-emerald-400" />
                    <span className="font-black text-gray-900 dark:text-white">{followedStores.length}</span>
                    <span className="text-gray-500 dark:text-gray-400">boutiques</span>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-gray-200/80 bg-gray-50/80 px-3.5 py-2 text-xs font-bold dark:border-white/10 dark:bg-white/5">
                    <PackageSearch className="h-4 w-4 text-[#c2412d] dark:text-red-400" />
                    <span className="font-black text-gray-900 dark:text-white">{updateCount}</span>
                    <span className="text-gray-500 dark:text-gray-400">mises à jour</span>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-gray-200/80 bg-gray-50/80 px-3.5 py-2 text-xs font-bold dark:border-white/10 dark:bg-white/5">
                    <Compass className="h-4 w-4 text-[#2456a6] dark:text-blue-400" />
                    <span className="font-black text-gray-900 dark:text-white">{recommendedProducts.length}</span>
                    <span className="text-gray-500 dark:text-gray-400">découvertes</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void loadFeedData(true)}
                    disabled={isRefreshing}
                    data-testid="feed-refresh-btn"
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-xs font-black text-gray-800 shadow-sm transition hover:bg-gray-50 hover:shadow dark:border-white/10 dark:bg-[#1f242e] dark:text-white dark:hover:bg-[#282e3b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f5b] disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#087f5b]' : ''}`} />
                    <span>Actualiser</span>
                  </button>
                </div>
              </div>
            </header>

            {/* Carousel / Store Selector Rail */}
            <div className="mt-6">
              <FollowedStoresCarousel
                followedStores={followedStores}
                selectedStoreId={selectedStoreId}
                onSelectStore={setSelectedStoreId}
              />
            </div>

            {/* Feed Timeline + Discovery Sidebar */}
            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,0.86fr)]">
              <FeedTimeline
                products={filteredProducts}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onAddToCart={handleAddToCart}
              />
              <DiscoverSimilarStores
                similarStores={similarStores}
                recommendedProducts={recommendedProducts}
                onFollowStore={handleSubscribeRecommended}
              />
            </div>
          </div>
        </main>
      )}
    </>
  );

  if (!showNavAndFooter) {
    return content;
  }

  return (
    <>
      <HubNavbar />
      {content}
      <HubFooter />
    </>
  );
};
