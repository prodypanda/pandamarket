/**
 * Adversarial Coverage Hardening & UI Invariants Test Suite (Feature 20)
 *
 * Challenger: challenger_m7_2 (Frontend Edge Cases, Multi-tenant Isolation & UI Invariants)
 * Focus:
 *   1. Strict Storefront Isolation: Private store pages (*.pandamarket.tn / store PDP) NEVER render
 *      competitor cross-recommendations; cross-seller discovery is strictly confined to /my-followed-feed.
 *   2. UI Edge Cases & State Robustness:
 *      - StoreFollowButton: Rapid clicks, network rejection rollback, unauthenticated redirect.
 *      - BroadcastComposer: Quota exhaustion (2/week), empty inputs, boundary text length (500 chars).
 *      - Governorate Distribution: 0 subscribers, 100% single-governorate concentration, empty datasets.
 *      - Admin Algorithm Tuning: Clamping 0% to 50%, dirty state revert, AI health diagnostic resilience.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { fetchWithCsrf } from '@/lib/api';

import { StoreFollowButton } from '../components/store/StoreFollowButton';
import { SellerLoyaltyDashboard, type LoyaltyDashboardData } from '../components/dashboard/SellerLoyaltyDashboard';
import { MyFollowedFeedPage, type MyFollowedFeedData } from '../components/feed/MyFollowedFeedPage';
import { AdminAlgorithmSettingsCard, type FeedAlgorithmSettings, type AiTaggingHealthData } from './admin-settings-algorithm.test';
import { MarketplaceSellerPage, type MarketplaceStoreData, type MarketplaceStoreProduct, type MarketplaceCategory } from '../components/store/MarketplaceStorefront';
import { MarketplaceStoreProductDetail } from '../components/store/MarketplaceStoreProductDetail';
import type { MarketplaceThemeSettings } from '../lib/marketplace-theme';
import { LocaleProvider } from '../contexts/LocaleContext';

/// Mock window.matchMedia
const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(mockMatchMedia),
});

vi.mock('@/lib/api', () => ({
  fetchWithCsrf: vi.fn(),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'fr',
    setLocale: vi.fn(),
    dir: 'ltr',
    t: (key: string) => key,
  }),
  LocaleProvider: ({ children }: any) => children,
}));

vi.mock('../../contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'fr',
    setLocale: vi.fn(),
    dir: 'ltr',
    t: (key: string) => key,
  }),
  LocaleProvider: ({ children }: any) => children,
}));

vi.mock('../contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'fr',
    setLocale: vi.fn(),
    dir: 'ltr',
    t: (key: string) => key,
  }),
  LocaleProvider: ({ children }: any) => children,
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    cart: { items: [], total_amount: 0 },
    itemCount: 0,
    getItemCount: () => 0,
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
  }),
  CartProvider: ({ children }: any) => children,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/image-url', () => ({
  getResizedImageUrl: (url: string) => url,
}));

describe('Adversarial Coverage Hardening: Storefront Isolation & UI Invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.matchMedia as any) = vi.fn().mockImplementation(mockMatchMedia);
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      })
    ) as any;
    (fetchWithCsrf as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
  });

  // =========================================================================
  // 1. STRICT STOREFRONT ISOLATION INVARIANTS
  // =========================================================================
  describe('1. Strict Storefront Isolation Invariants', () => {
    const primaryStore: MarketplaceStoreData = {
      id: 'store_artisan_sfax',
      name: 'Artisanat Sfax',
      subdomain: 'artisanatsfax',
      seller_type: 'artisan',
      is_verified: true,
      seller_score: 4.9,
    };

    const storeProducts: MarketplaceStoreProduct[] = [
      {
        id: 'prod_sfax_1',
        title: 'Tapis Traditionnel Sfaxien',
        price: 180.0,
        store_id: 'store_artisan_sfax',
        store_name: 'Artisanat Sfax',
        category: 'Artisanat',
        marketplace_category_slug: 'artisanat',
      },
      {
        id: 'prod_sfax_2',
        title: 'Céramique Emaillée Bleue',
        price: 45.5,
        store_id: 'store_artisan_sfax',
        store_name: 'Artisanat Sfax',
        category: 'Artisanat',
        marketplace_category_slug: 'artisanat',
      },
    ];

    const storeCategories: MarketplaceCategory[] = [
      { id: 'cat_1', name: 'Artisanat', slug: 'artisanat' },
    ];

    const mockThemeSettings: MarketplaceThemeSettings = {
      marketplace_name: 'PandaMarket',
      marketplace_theme: 'panda' as const,
      marketplace_logo_url: '/logo.png',
      marketplace_logo_light_url: '/logo-light.png',
      marketplace_logo_dark_url: '/logo-dark.png',
    };

    it('Invariant 1.1: MarketplaceSellerPage renders strictly store-owned products with zero competitor items', () => {
      render(
        <LocaleProvider>
          <MarketplaceSellerPage
            storeHost="artisanatsfax.pandamarket.tn"
            store={primaryStore}
            products={storeProducts}
            categories={storeCategories}
            marketplaceSettings={mockThemeSettings}
          />
        </LocaleProvider>
      );

      // Verify store header
      expect(screen.getByRole('heading', { level: 1, name: 'Artisanat Sfax' })).toBeInTheDocument();

      // Verify all rendered products belong strictly to this store
      expect(screen.getByText('Tapis Traditionnel Sfaxien')).toBeInTheDocument();
      expect(screen.getByText('Céramique Emaillée Bleue')).toBeInTheDocument();

      // Ensure no external recommendation titles or competitor store labels appear in the DOM
      expect(screen.queryByText(/Découvertes & Similaires/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Boutiques recommandées/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Produits selon vos intérêts/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Competitor/i)).not.toBeInTheDocument();
    });

    it('Invariant 1.2: MarketplaceStoreProductDetail "More from seller" only contains products from that specific seller', () => {
      const currentProduct = {
        ...storeProducts[0],
        description: 'Magnifique tapis artisanal tissé à la main à Sfax.',
        status: 'En stock',
      };

      const relatedProductsFromSameStore = [storeProducts[1]];

      render(
        <LocaleProvider>
          <MarketplaceStoreProductDetail
            storeHost="artisanatsfax.pandamarket.tn"
            store={primaryStore}
            product={currentProduct}
            relatedProducts={relatedProductsFromSameStore}
            ratingData={{ average_rating: 4.9, review_count: 32 }}
            marketplaceSettings={mockThemeSettings}
            locale="fr"
          />
        </LocaleProvider>
      );

      expect(screen.getByRole('heading', { level: 1, name: 'Tapis Traditionnel Sfaxien' })).toBeInTheDocument();
      expect(screen.getByText('More from Artisanat Sfax')).toBeInTheDocument();
      expect(screen.getByText('Céramique Emaillée Bleue')).toBeInTheDocument();

      // Verify strict seller boundary: no competitor cross-sell recommendations
      expect(screen.queryByText(/Découvertes & Boutiques Similaires/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Autres boutiques recommandées/i)).not.toBeInTheDocument();
    });

    it('Invariant 1.3: Cross-seller recommendations and similar stores are exclusively confined to /my-followed-feed', () => {
      const feedData: MyFollowedFeedData = {
        followed_stores: [
          {
            id: 'store_artisan_sfax',
            name: 'Artisanat Sfax',
            subdomain: 'artisanatsfax',
            logo_url: null,
            unread_updates_count: 2,
            is_verified: true,
          },
        ],
        timeline_products: [
          {
            id: 'p1',
            store_id: 'store_artisan_sfax',
            store_name: 'Artisanat Sfax',
            title: 'Tapis Rouge Berbère',
            price: 150.0,
            is_new_arrival: true,
            published_at: new Date().toISOString(),
            image_url: null,
          },
        ],
        recommended_products: [
          {
            id: 'p_rec_1',
            store_id: 'store_competitor_nabeul',
            store_name: 'Poterie Nabeul',
            title: 'Vase Céramique Fait Main',
            price: 35.0,
            matched_tag: 'artisanat',
            interest_tags: ['artisanat', 'ceramique'],
          },
        ],
        similar_stores: [
          {
            id: 'store_competitor_nabeul',
            name: 'Poterie Nabeul',
            subdomain: 'poterienabeul',
            primary_category: 'Artisanat & Décoration',
            subscribers_count: 240,
            interest_tags: ['artisanat', 'poterie'],
          },
        ],
      };

      render(<MyFollowedFeedPage initialData={feedData} isAuthenticated={true} />);

      // On /my-followed-feed, cross-store recommendations are legitimately present
      expect(screen.getByTestId('section-discoveries')).toBeInTheDocument();
      expect(screen.getByTestId('similar-store-store_competitor_nabeul')).toBeInTheDocument();
      expect(screen.getByTestId('recommended-prod-p_rec_1')).toBeInTheDocument();
      expect(screen.getByText(/#artisanat/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. STORE FOLLOW BUTTON ADVERSARIAL EDGE CASES & RECOVERY
  // =========================================================================
  describe('2. StoreFollowButton UI State Robustness & Rollback', () => {
    it('handles rapid clicking with immediate in-flight disabling and prevents multi-dispatch', async () => {
      let resolvePromise: (val: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (fetchWithCsrf as any).mockReturnValueOnce(delayedPromise);

      render(
        <StoreFollowButton
          storeId="store_tn_500"
          storeName="Boutique Test"
          initialSubscribed={false}
          initialCount={10}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_tn_500');

      // Click 1: in-flight request started
      fireEvent.click(btn);
      expect(btn).toBeDisabled();
      expect(screen.getByTestId('follow-spinner')).toBeInTheDocument();

      // Click 2 & 3: should be ignored because disabled
      fireEvent.click(btn);
      fireEvent.click(btn);

      expect(fetchWithCsrf).toHaveBeenCalledTimes(1);

      // Resolve successfully
      await act(async () => {
        resolvePromise!({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              subscribers_count: 11,
              verified_subscribers_count: 0,
            }),
        });
      });

      await waitFor(() => {
        expect(btn).not.toBeDisabled();
        expect(screen.getByTestId('subscriber-count')).toHaveTextContent('11 abonnés');
      });
    });

    it('performs optimistic rollback and displays error banner when server returns 500 error', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Erreur interne du serveur de base de données.' }),
      });

      const onFollowChange = vi.fn();
      render(
        <StoreFollowButton
          storeId="store_tn_500"
          storeName="Boutique Test"
          initialSubscribed={false}
          initialCount={25}
          onFollowChange={onFollowChange}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_tn_500');
      fireEvent.click(btn);

      // Optimistic transition
      expect(onFollowChange).toHaveBeenCalledWith(true, 26);

      // Wait for server error rejection and rollback
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Erreur interne du serveur de base de données.');
        expect(screen.getByTestId('subscriber-count')).toHaveTextContent('25 abonnés');
        expect(onFollowChange).toHaveBeenLastCalledWith(false, 25);
      });
    });

    it('performs optimistic rollback and shows 429 friendly message on rate limit', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      render(
        <StoreFollowButton
          storeId="store_tn_500"
          storeName="Boutique Test"
          initialSubscribed={true}
          initialCount={10}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_tn_500');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Trop de requêtes. Veuillez patienter');
        expect(screen.getByTestId('subscriber-count')).toHaveTextContent('10 abonnés');
      });
    });

    it('redirects unauthenticated buyer when clicking follow', () => {
      const onRequireAuth = vi.fn();
      render(
        <StoreFollowButton
          storeId="store_tn_500"
          storeName="Boutique Test"
          initialSubscribed={false}
          isAuthenticated={false}
          onRequireAuth={onRequireAuth}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_tn_500');
      fireEvent.click(btn);

      expect(onRequireAuth).toHaveBeenCalledTimes(1);
      expect(fetchWithCsrf).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. SELLER LOYALTY & BROADCAST COMPOSER BOUNDARIES
  // =========================================================================
  describe('3. Seller Loyalty Dashboard & Broadcast Composer Boundaries', () => {
    const mockZeroSubsData: LoyaltyDashboardData = {
      kpis: {
        total_subscribers: 0,
        new_this_week: 0,
        verified_pct: 0,
        growth_rate_pct: 0,
        broadcasts_remaining_this_week: 2,
        trust_score: { overall: 4.0, rating_component: 1.6, sla_component: 1.2, subscribers_log_component: 0.0, dispute_penalty: 0.0 },
      },
      broadcasts: [],
      governorate_distribution: {},
    };

    it('Boundary 3.1: displays zero subscribers guidance message and prevents broadcasting when store has 0 subscribers', () => {
      render(<SellerLoyaltyDashboard initialData={mockZeroSubsData} />);

      expect(screen.getByText("Vous n'avez pas encore d'abonnés pour envoyer une diffusion privée.")).toBeInTheDocument();
      expect(screen.queryByTestId('broadcast-form')).not.toBeInTheDocument();
    });

    it('Boundary 3.2: disables composer submission when weekly broadcast quota is exhausted (0/2 remaining)', () => {
      const mockQuotaExhaustedData: LoyaltyDashboardData = {
        ...mockZeroSubsData,
        kpis: {
          ...mockZeroSubsData.kpis,
          total_subscribers: 150,
          broadcasts_remaining_this_week: 0,
        },
      };

      render(<SellerLoyaltyDashboard initialData={mockQuotaExhaustedData} />);

      expect(screen.getByTestId('broadcast-quota-badge')).toHaveTextContent('0/2 diffusions restantes');

      const submitBtn = screen.getByTestId('btn-submit-broadcast');
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveTextContent('Limite hebdomadaire atteinte (2/2)');

      const titleInput = screen.getByTestId('input-broadcast-title');
      expect(titleInput).toBeDisabled();
    });

    it('Boundary 3.3: rejects empty or whitespace-only broadcast title and message', async () => {
      const mockActiveData: LoyaltyDashboardData = {
        ...mockZeroSubsData,
        kpis: {
          ...mockZeroSubsData.kpis,
          total_subscribers: 200,
          broadcasts_remaining_this_week: 2,
        },
      };

      render(<SellerLoyaltyDashboard initialData={mockActiveData} />);

      const form = screen.getByTestId('broadcast-form');
      fireEvent.submit(form);

      expect(screen.getByRole('alert')).toHaveTextContent('Veuillez renseigner le titre et le message de diffusion.');
      expect(fetchWithCsrf).not.toHaveBeenCalled();
    });

    it('Boundary 3.4: handles 100% single-governorate concentration and empty governorates safely without NaN or division-by-zero', () => {
      const singleGovData: LoyaltyDashboardData = {
        ...mockZeroSubsData,
        kpis: { ...mockZeroSubsData.kpis, total_subscribers: 300 },
        governorate_distribution: {
          Sfax: 300,
        },
      };

      const { unmount } = render(<SellerLoyaltyDashboard initialData={singleGovData} />);

      const sfaxRow = screen.getByTestId('gov-row-Sfax');
      expect(sfaxRow).toHaveTextContent('Sfax');
      expect(sfaxRow).toHaveTextContent('300 abonnés (100.0%)');

      unmount();

      // Render fresh instance with empty distribution
      render(<SellerLoyaltyDashboard initialData={{ ...singleGovData, governorate_distribution: {} }} />);
      expect(screen.getByTestId('empty-governorate-data')).toHaveTextContent('Aucune donnée géographique pour le moment.');
    });
  });

  // =========================================================================
  // 4. ADMIN ALGORITHM TUNING CONTROLS & BOUNDARIES
  // =========================================================================
  describe('4. Admin Algorithm Settings Bounds & Diagnostics', () => {
    const mockSettings: FeedAlgorithmSettings = {
      hub_feed_base_sort: 'random',
      hub_feed_personalization_pct: 30,
      ai_auto_tagging_enabled: true,
    };

    const mockHealth: AiTaggingHealthData = {
      total_products: 1500,
      tagged_products: 1450,
      tag_coverage_pct: 96.7,
      pending_tag_jobs: 0,
      top_tags: [{ tag: 'robotique', count: 120 }],
    };

    it('Invariant 4.1: slider is clamped between 0% and 50% min/max limits', () => {
      render(<AdminAlgorithmSettingsCard initialSettings={mockSettings} initialHealth={mockHealth} />);

      const slider = screen.getByTestId('slider-personalization-pct') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('50');

      // Test lower boundary 0%
      fireEvent.change(slider, { target: { value: '0' } });
      expect(screen.getByTestId('personalization-percentage-badge')).toHaveTextContent('0%');
      expect(screen.getByText('🤖 0% Intérêts IA')).toBeInTheDocument();
      expect(screen.getByText('📋 100% Tri Standard')).toBeInTheDocument();

      // Test upper boundary 50%
      fireEvent.change(slider, { target: { value: '50' } });
      expect(screen.getByTestId('personalization-percentage-badge')).toHaveTextContent('50%');
      expect(screen.getByText('🤖 50% Intérêts IA')).toBeInTheDocument();
      expect(screen.getByText('📋 50% Tri Standard')).toBeInTheDocument();
    });

    it('Invariant 4.2: reverts modifications back to persisted configuration when canceling', () => {
      render(<AdminAlgorithmSettingsCard initialSettings={mockSettings} initialHealth={mockHealth} />);

      // Modify sort and slider
      fireEvent.change(screen.getByTestId('select-base-sort'), { target: { value: 'newest' } });
      fireEvent.change(screen.getByTestId('slider-personalization-pct'), { target: { value: '45' } });

      expect(screen.getByTestId('personalization-percentage-badge')).toHaveTextContent('45%');
      expect(screen.getByTestId('unsaved-changes-banner')).toBeInTheDocument();

      // Click cancel/revert
      fireEvent.click(screen.getByTestId('btn-revert-settings'));

      expect(screen.getByTestId('personalization-percentage-badge')).toHaveTextContent('30%');
      const select = screen.getByTestId('select-base-sort') as HTMLSelectElement;
      expect(select.value).toBe('random');
      expect(screen.queryByTestId('unsaved-changes-banner')).not.toBeInTheDocument();
    });

    it('Invariant 4.3: diagnostic card renders 0% coverage and empty top tags gracefully', () => {
      const zeroHealth: AiTaggingHealthData = {
        total_products: 0,
        tagged_products: 0,
        tag_coverage_pct: 0,
        pending_tag_jobs: 0,
        top_tags: [],
      };

      render(<AdminAlgorithmSettingsCard initialSettings={mockSettings} initialHealth={zeroHealth} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.queryByTestId('top-tags-cloud')).not.toBeInTheDocument();
    });
  });
});
