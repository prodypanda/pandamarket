/**
 * 'My Followed Feed' Page & AI Recommendations Test Suite
 *
 * Feature Covered:
 *   - Feature 20 / Requirement R3: 'My Followed Feed' Page & AI-Driven 'Centres d'intérêt' Engine
 *     - Section 1: 'Mes Boutiques Suivies' (carousel with unread update badges and store selection)
 *     - Section 2: 'Nouveautés & Baisses de Prix' (chronological timeline strictly from followed stores with discount badges)
 *     - Section 3: 'Découvertes & Boutiques Similaires' (cross-seller recommendations matching interest profile)
 *     - Filtering: 'Tout', 'Baisses de prix' only, 'Nouveautés' only, store-specific filtering
 *     - Empty states, unauthenticated guest teaser, error retry handling, and cart additions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { fetchWithCsrf } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  fetchWithCsrf: vi.fn(),
}));

// ============================================================================
// Types & Contracts (PROJECT.md § Interface Contracts)
// ============================================================================
export interface FollowedStoreItem {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  unread_updates_count: number;
  is_verified: boolean;
}

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

export interface RecommendedProduct {
  id: string;
  store_id: string;
  store_name: string;
  title: string;
  price: number;
  matched_tag: string;
  interest_tags: string[];
}

export interface SimilarStore {
  id: string;
  name: string;
  subdomain: string;
  primary_category: string;
  subscribers_count: number;
  interest_tags: string[];
}

export interface MyFollowedFeedData {
  followed_stores: FollowedStoreItem[];
  timeline_products: FeedTimelineProduct[];
  recommended_products: RecommendedProduct[];
  similar_stores: SimilarStore[];
}

// ============================================================================
// MyFollowedFeedPage Component (Feature 20 High-Fidelity UI)
// ============================================================================
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
  const [cartSuccessId, setCartSuccessId] = useState<string | null>(null);

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
            Votre fil d&apos;actualités exclusif
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
      <section data-testid="section-followed-stores" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>🏪</span> Mes Boutiques Suivies
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold">
              {followedStores.length}
            </span>
          </h2>
          {selectedStoreId && (
            <button
              type="button"
              onClick={() => setSelectedStoreId(null)}
              data-testid="clear-store-filter"
              className="text-xs text-emerald-600 hover:underline font-medium"
            >
              Afficher toutes les boutiques
            </button>
          )}
        </div>

        {followedStores.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800" data-testid="empty-followed-stores">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Vous ne suivez aucune boutique pour le moment.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin" data-testid="followed-stores-carousel">
            {followedStores.map((store) => {
              const isSelected = selectedStoreId === store.id;
              return (
                <button
                  key={store.id}
                  type="button"
                  data-testid={`store-chip-${store.id}`}
                  onClick={() => setSelectedStoreId(isSelected ? null : store.id)}
                  className={`flex-shrink-0 flex items-center gap-2.5 p-2.5 pr-4 rounded-xl border transition-all select-none ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-200'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs">
                    {store.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-xs leading-tight">{store.name}</div>
                    <div className="text-[10px] text-zinc-400">@{store.subdomain}</div>
                  </div>
                  {store.unread_updates_count > 0 && (
                    <span
                      data-testid={`unread-badge-${store.id}`}
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse"
                    >
                      {store.unread_updates_count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Main Grid: Section 2 (Timeline) + Section 3 (Discoveries) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SECTION 2: Nouveautés & Baisses de Prix Timeline */}
        <section data-testid="section-feed-timeline" className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>🔥</span> Nouveautés & Baisses de Prix
            </h2>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg text-xs" data-testid="feed-filter-tabs">
              <button
                type="button"
                data-testid="filter-all"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                Tous les flux
              </button>
              <button
                type="button"
                data-testid="filter-price-drops"
                onClick={() => setActiveFilter('price_drops')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeFilter === 'price_drops'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                📉 Baisses de prix
              </button>
              <button
                type="button"
                data-testid="filter-new-arrivals"
                onClick={() => setActiveFilter('new_arrivals')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  activeFilter === 'new_arrivals'
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                🆕 Nouveautés
              </button>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" data-testid="empty-feed-timeline">
              <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                Aucune nouveauté récente cette semaine dans ce filtre.
              </p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="feed-timeline-list">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  data-testid={`timeline-item-${product.id}`}
                  className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0">
                      📦
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {product.store_name}
                        </span>
                        {product.is_new_arrival && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            NOUVEAU
                          </span>
                        )}
                        {product.discount_percentage && product.discount_percentage > 0 && (
                          <span
                            data-testid={`discount-badge-${product.id}`}
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          >
                            -{product.discount_percentage}%
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm mt-0.5">
                        {product.title}
                      </h3>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                          {product.price.toFixed(3)} TND
                        </span>
                        {product.original_price && product.original_price > product.price && (
                          <span className="text-xs text-zinc-400 line-through">
                            {product.original_price.toFixed(3)} TND
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid={`btn-add-to-cart-${product.id}`}
                    onClick={() => {
                      if (onAddToCart) onAddToCart(product);
                      setCartSuccessId(product.id);
                      setTimeout(() => setCartSuccessId(null), 2000);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      cartSuccessId === product.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'
                    }`}
                  >
                    {cartSuccessId === product.id ? '✓ Ajouté' : 'Ajouter au panier'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 3: Découvertes & Boutiques Similaires */}
        <section data-testid="section-discoveries" className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-zinc-900 dark:to-zinc-900 border border-emerald-100 dark:border-zinc-800">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
              <span>🤖</span> Découvertes & Similaires
            </h2>

            {similarStores.length > 0 && (
              <div className="space-y-3 mb-6" data-testid="similar-stores-list">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Boutiques recommandées
                </div>
                {similarStores.map((s) => (
                  <div
                    key={s.id}
                    data-testid={`similar-store-${s.id}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  >
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{s.name}</div>
                      <div className="text-[10px] text-zinc-400">{s.primary_category}</div>
                    </div>
                    <button
                      type="button"
                      data-testid={`btn-follow-similar-${s.id}`}
                      onClick={() => handleSubscribeRecommended(s)}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg transition-colors"
                    >
                      + Suivre
                    </button>
                  </div>
                ))}
              </div>
            )}

            {recommendedProducts.length > 0 && (
              <div className="space-y-3" data-testid="recommended-products-list">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Produits selon vos intérêts
                </div>
                {recommendedProducts.map((p) => (
                  <div
                    key={p.id}
                    data-testid={`recommended-prod-${p.id}`}
                    className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium">
                        🏷️ #{p.matched_tag}
                      </span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {p.price.toFixed(3)} TND
                      </span>
                    </div>
                    <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {p.title}
                    </div>
                    <div className="text-[10px] text-zinc-400">{p.store_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

// ============================================================================
// Test Suite: MyFollowedFeed (Feature 20 - Tiers 1 to 4)
// ============================================================================
describe('Feature 20: MyFollowedFeed Page & AI Interest Engine (R3)', () => {
  const mockFeedData: MyFollowedFeedData = {
    followed_stores: [
      { id: 'st_1', name: 'Robotics TN', subdomain: 'roboticstn', logo_url: null, unread_updates_count: 3, is_verified: true },
      { id: 'st_2', name: 'Artisanat Nabeul', subdomain: 'artisanat', logo_url: null, unread_updates_count: 0, is_verified: true },
    ],
    timeline_products: [
      {
        id: 'prod_101',
        store_id: 'st_1',
        store_name: 'Robotics TN',
        title: 'Arduino UNO R4 WiFi',
        price: 95.0,
        original_price: 120.0,
        discount_percentage: 20,
        is_new_arrival: false,
        published_at: '2026-08-14T10:00:00Z',
        image_url: null,
      },
      {
        id: 'prod_102',
        store_id: 'st_1',
        store_name: 'Robotics TN',
        title: 'Raspberry Pi 5 8GB',
        price: 340.0,
        is_new_arrival: true,
        published_at: '2026-08-14T11:00:00Z',
        image_url: null,
      },
      {
        id: 'prod_201',
        store_id: 'st_2',
        store_name: 'Artisanat Nabeul',
        title: 'Poterie Faite Main',
        price: 45.0,
        is_new_arrival: true,
        published_at: '2026-08-14T09:00:00Z',
        image_url: null,
      },
    ],
    recommended_products: [
      {
        id: 'rec_1',
        store_id: 'st_rec_1',
        store_name: 'Electro Club',
        title: 'ESP32 Dev Module',
        price: 25.0,
        matched_tag: 'microcontroller',
        interest_tags: ['microcontroller', 'iot'],
      },
    ],
    similar_stores: [
      {
        id: 'st_sim_1',
        name: 'Tunisia IoT Hub',
        subdomain: 'iothub',
        primary_category: 'Electronique',
        subscribers_count: 850,
        interest_tags: ['iot', 'electronics'],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // TIER 1: CORE RENDERING & COMPONENT INTERACTION (Coverage >= 5)
  // =========================================================================
  describe('Tier 1: Core Functional & Component Rendering', () => {
    it('T1.1: renders page header and all 3 core sections (Carousel, Timeline, Discoveries)', () => {
      render(<MyFollowedFeedPage initialData={mockFeedData} />);

      expect(screen.getByText(/Mon Fil Panda/i)).toBeInTheDocument();
      expect(screen.getByTestId('section-followed-stores')).toBeInTheDocument();
      expect(screen.getByTestId('section-feed-timeline')).toBeInTheDocument();
      expect(screen.getByTestId('section-discoveries')).toBeInTheDocument();
    });

    it('T1.2: renders followed stores in Section 1 with store name, subdomain, and unread update badge', () => {
      render(<MyFollowedFeedPage initialData={mockFeedData} />);

      const carousel = screen.getByTestId('followed-stores-carousel');
      expect(within(carousel).getByText('Robotics TN')).toBeInTheDocument();
      expect(within(carousel).getByText('@roboticstn')).toBeInTheDocument();
      expect(screen.getByTestId('unread-badge-st_1')).toHaveTextContent('3');
    });

    it('T1.3: renders chronological timeline items with price, store name, and discount badge', () => {
      render(<MyFollowedFeedPage initialData={mockFeedData} />);

      expect(screen.getByText('Arduino UNO R4 WiFi')).toBeInTheDocument();
      expect(screen.getByText('95.000 TND')).toBeInTheDocument();
      expect(screen.getByTestId('discount-badge-prod_101')).toHaveTextContent('-20%');
    });

    it('T1.4: renders AI-matched recommendations in Section 3 with tag pill and price', () => {
      render(<MyFollowedFeedPage initialData={mockFeedData} />);

      expect(screen.getByText(/ESP32 Dev Module/i)).toBeInTheDocument();
      expect(screen.getByText(/#microcontroller/i)).toBeInTheDocument();
      expect(screen.getByText('Tunisia IoT Hub')).toBeInTheDocument();
    });

    it('T1.5: filters timeline items when clicking "Baisses de prix" filter tab', () => {
      render(<MyFollowedFeedPage initialData={mockFeedData} />);

      const priceDropsBtn = screen.getByTestId('filter-price-drops');
      fireEvent.click(priceDropsBtn);

      // Only Arduino UNO R4 (-20%) should remain
      expect(screen.getByText('Arduino UNO R4 WiFi')).toBeInTheDocument();
      expect(screen.queryByText('Raspberry Pi 5 8GB')).not.toBeInTheDocument();
      expect(screen.queryByText('Poterie Faite Main')).not.toBeInTheDocument();
    });

    it('T1.6: filters timeline items when clicking "Nouveautés" filter tab', () => {
      render(<MyFollowedFeedPage initialData={mockFeedData} />);

      const newArrivalsBtn = screen.getByTestId('filter-new-arrivals');
      fireEvent.click(newArrivalsBtn);

      expect(screen.getByText('Raspberry Pi 5 8GB')).toBeInTheDocument();
      expect(screen.getByText('Poterie Faite Main')).toBeInTheDocument();
      expect(screen.queryByText('Arduino UNO R4 WiFi')).not.toBeInTheDocument();
    });

    it('T1.7: triggers onAddToCart callback with item data when clicking "Ajouter au panier"', () => {
      const handleAddToCart = vi.fn();
      render(<MyFollowedFeedPage initialData={mockFeedData} onAddToCart={handleAddToCart} />);

      const addBtn = screen.getByTestId('btn-add-to-cart-prod_101');
      fireEvent.click(addBtn);

      expect(handleAddToCart).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'prod_101',
          title: 'Arduino UNO R4 WiFi',
          price: 95.0,
        })
      );
      expect(screen.getByText('✓ Ajouté')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY STATES & EDGE CASES (Boundary >= 5)
  // =========================================================================
  describe('Tier 2: Boundary States & Error Handling', () => {
    it('T2.1: renders unauthenticated guest teaser with login call-to-action', () => {
      render(<MyFollowedFeedPage isAuthenticated={false} />);

      expect(screen.getByTestId('guest-feed-teaser')).toBeInTheDocument();
      expect(screen.getByText(/Votre fil d'actualités exclusif/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Se connecter/i })).toHaveAttribute('href', '/login');
    });

    it('T2.2: renders empty followed stores notice when user follows 0 stores', () => {
      const emptyData: MyFollowedFeedData = {
        followed_stores: [],
        timeline_products: [],
        recommended_products: [],
        similar_stores: [],
      };
      render(<MyFollowedFeedPage initialData={emptyData} />);

      expect(screen.getByTestId('empty-followed-stores')).toHaveTextContent('Vous ne suivez aucune boutique pour le moment.');
      expect(screen.getByTestId('empty-feed-timeline')).toHaveTextContent('Aucune nouveauté récente cette semaine dans ce filtre.');
    });

    it('T2.3: renders error alert banner with retry trigger on network failure', async () => {
      (fetchWithCsrf as any).mockRejectedValueOnce(new Error('Erreur réseau 500'));

      render(<MyFollowedFeedPage isAuthenticated={true} initialData={null} />);

      await waitFor(() => {
        expect(screen.getByTestId('feed-error-state')).toBeInTheDocument();
        expect(screen.getByText('Erreur réseau 500')).toBeInTheDocument();
      });
    });

    it('T2.4: handles products with 0 discount or missing original price without rendering broken badges', () => {
      const productNoDiscount: MyFollowedFeedData = {
        followed_stores: [{ id: 's1', name: 'Store 1', subdomain: 's1', logo_url: null, unread_updates_count: 0, is_verified: true }],
        timeline_products: [
          {
            id: 'p_no_disc',
            store_id: 's1',
            store_name: 'Store 1',
            title: 'Simple Product',
            price: 50.0,
            discount_percentage: 0,
            is_new_arrival: false,
            published_at: '2026-08-14T00:00:00Z',
            image_url: null,
          },
        ],
        recommended_products: [],
        similar_stores: [],
      };

      render(<MyFollowedFeedPage initialData={productNoDiscount} />);

      expect(screen.getByText('Simple Product')).toBeInTheDocument();
      expect(screen.queryByTestId('discount-badge-p_no_disc')).not.toBeInTheDocument();
    });

    it('T2.5: handles manual refresh button click and reloads feed datasets', async () => {
      (fetchWithCsrf as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ followed_stores: [], timeline_products: [], recommended_products: [], similar_stores: [] }),
      });

      render(<MyFollowedFeedPage initialData={mockFeedData} />);

      const refreshBtn = screen.getByTestId('feed-refresh-btn');
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith('/api/pd/buyer/subscriptions');
        expect(fetchWithCsrf).toHaveBeenCalledWith('/api/pd/marketplace/recommendations/buyer-interests');
      });
    });
  });

  // =========================================================================
  // TIER 3: CROSS-COMPONENT INTERACTIONS
  // =========================================================================
  describe('Tier 3: Cross-Component Interactions & State Sync', () => {
    it('T3.1: clicking a store chip in Section 1 filters Section 2 Timeline to only that store', () => {
      render(<MyFollowedFeedPage initialData={mockFeedData} />);

      const storeChip = screen.getByTestId('store-chip-st_2');
      fireEvent.click(storeChip);

      // Only Artisanat Nabeul products should appear
      expect(screen.getByText('Poterie Faite Main')).toBeInTheDocument();
      expect(screen.queryByText('Arduino UNO R4 WiFi')).not.toBeInTheDocument();

      // Clear filter
      const clearBtn = screen.getByTestId('clear-store-filter');
      fireEvent.click(clearBtn);

      expect(screen.getByText('Arduino UNO R4 WiFi')).toBeInTheDocument();
    });

    it('T3.2: subscribing to a recommended store in Section 3 moves it to Section 1 Carousel', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      render(<MyFollowedFeedPage initialData={mockFeedData} />);

      expect(screen.getByTestId('similar-store-st_sim_1')).toBeInTheDocument();
      const followBtn = screen.getByTestId('btn-follow-similar-st_sim_1');

      fireEvent.click(followBtn);

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith('/api/pd/stores/st_sim_1/subscribe', { method: 'POST' });
        // Tunisia IoT Hub is now in followed carousel
        expect(screen.getByTestId('store-chip-st_sim_1')).toBeInTheDocument();
        // Removed from recommended list
        expect(screen.queryByTestId('similar-store-st_sim_1')).not.toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // TIER 4: END-TO-END USER JOURNEY SIMULATION
  // =========================================================================
  describe('Tier 4: E2E User Journey Simulation', () => {
    it('T4.1: simulates complete buyer journey on /my-followed-feed: inspect -> filter by discounts -> add to cart -> follow similar store', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const handleAddToCart = vi.fn();
      render(<MyFollowedFeedPage initialData={mockFeedData} onAddToCart={handleAddToCart} />);

      // Step 1: Filter price drops
      fireEvent.click(screen.getByTestId('filter-price-drops'));
      expect(screen.getByText('Arduino UNO R4 WiFi')).toBeInTheDocument();

      // Step 2: Add to cart
      fireEvent.click(screen.getByTestId('btn-add-to-cart-prod_101'));
      expect(handleAddToCart).toHaveBeenCalledTimes(1);

      // Step 3: Follow recommended seller
      fireEvent.click(screen.getByTestId('btn-follow-similar-st_sim_1'));
      await waitFor(() => {
        expect(screen.getByTestId('store-chip-st_sim_1')).toBeInTheDocument();
      });
    });
  });
});
