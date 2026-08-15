'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

  const loadFeedData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [subsRes, recsRes] = await Promise.all([
        fetchWithCsrf('/api/pd/buyer/subscriptions'),
        fetchWithCsrf('/api/pd/marketplace/recommendations/buyer-interests'),
      ]);

      if (!subsRes.ok || !recsRes.ok) {
        throw new Error('Erreur lors du chargement du fil personnalisé.');
      }

      const subsJson = await subsRes.json();
      const recsJson = await recsRes.json();

      setData({
        followed_stores: subsJson.followed_stores || [],
        timeline_products: subsJson.timeline_products || [],
        recommended_products: recsJson.recommended_products || [],
        similar_stores: recsJson.similar_stores || [],
      });
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le fil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData && isAuthenticated) {
      loadFeedData();
    }
  }, [isAuthenticated]);

  const handleSubscribeRecommended = async (store: SimilarStore) => {
    try {
      await fetchWithCsrf(`/api/pd/stores/${store.id}/subscribe`, { method: 'POST' });
      setData((prev) => {
        if (!prev) return prev;
        const newStore: FollowedStoreItem = {
          id: store.id,
          name: store.name,
          subdomain: store.subdomain,
          logo_url: null,
          unread_updates_count: 0,
          is_verified: true,
        };
        return {
          ...prev,
          followed_stores: [...prev.followed_stores, newStore],
          similar_stores: prev.similar_stores.filter((s) => s.id !== store.id),
        };
      });
    } catch {
      setError('Erreur lors de l’abonnement à la boutique.');
    }
  };

  // Filter Timeline Products
  const filteredProducts = useMemo(() => {
    if (!data?.timeline_products) return [];
    return data.timeline_products.filter((p) => {
      if (selectedStoreId && p.store_id !== selectedStoreId) return false;
      if (activeFilter === 'price_drops' && (!p.discount_percentage || p.discount_percentage <= 0)) return false;
      if (activeFilter === 'new_arrivals' && !p.is_new_arrival) return false;
      return true;
    });
  }, [data, activeFilter, selectedStoreId]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center" data-testid="guest-feed-teaser">
        <div className="p-10 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-4xl mb-4 inline-block">🛍️</span>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Votre fil d'actualités exclusif
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-6 text-sm">
            Suivez vos boutiques préférées pour recevoir en temps réel les baisses de prix, les nouveaux arrivages et des recommandations IA sur mesure.
          </p>
          <a
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Se connecter pour voir mon fil
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6" data-testid="feed-loading-state">
        <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-lg" />
        <div className="h-28 bg-zinc-100 dark:bg-zinc-800/60 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="h-44 bg-zinc-100 dark:bg-zinc-800/60 animate-pulse rounded-xl" />
            <div className="h-44 bg-zinc-100 dark:bg-zinc-800/60 animate-pulse rounded-xl" />
          </div>
          <div className="h-72 bg-zinc-100 dark:bg-zinc-800/60 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6" role="alert" data-testid="feed-error-state">
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl dark:bg-rose-950/40 dark:text-rose-300">
          <h3 className="font-bold text-base mb-1">Erreur de chargement</h3>
          <p className="text-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={loadFeedData}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const followedStores = data?.followed_stores || [];
  const recommendedProducts = data?.recommended_products || [];
  const similarStores = data?.similar_stores || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8" data-testid="my-followed-feed-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>✨</span> Mon Fil Panda
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Nouveautés, remises exclusives et suggestions personnalisées de vos boutiques préférées.
          </p>
        </div>
        <button
          type="button"
          onClick={loadFeedData}
          data-testid="feed-refresh-btn"
          className="px-3 py-2 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* SECTION 1: Mes Boutiques Suivies (Carousel / Strip) */}
      <FollowedStoresCarousel
        followedStores={followedStores}
        selectedStoreId={selectedStoreId}
        onSelectStore={setSelectedStoreId}
      />

      {/* Main Grid: Section 2 (Timeline) + Section 3 (Discoveries) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SECTION 2: Nouveautés & Baisses de Prix Timeline */}
        <FeedTimeline
          products={filteredProducts}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onAddToCart={onAddToCart}
        />

        {/* SECTION 3: Découvertes & Boutiques Similaires */}
        <DiscoverSimilarStores
          similarStores={similarStores}
          recommendedProducts={recommendedProducts}
          onFollowStore={handleSubscribeRecommended}
        />
      </div>
    </div>
  );
};
