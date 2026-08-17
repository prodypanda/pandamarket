import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchPage from '../app/hub/search/page';

// Mock Locale Context
vi.mock('../contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'search.resultsFor') return `${params?.count} résultats pour "${params?.query}"`;
      if (key === 'search.title') return 'Explorer les Produits';
      if (key === 'search.filters') return 'Filtres';
      if (key === 'product.category') return 'Catégories';
      if (key === 'search.priceRange') return 'Gamme de Prix';
      if (key === 'product.vendor') return 'Vendeur';
      if (key === 'search.verifiedOnly') return 'Vendeurs vérifiés uniquement';
      if (key === 'dashboard.sidebar.products') return 'Produits';
      if (key === 'common.loading') return 'Chargement...';
      if (key === 'common.currency') return 'DT';
      if (key === 'common.noResults') return 'Aucun résultat';
      if (key === 'nav.explore') return 'Explorer';
      if (key === 'sellerTypes.all') return 'Tous les vendeurs';
      if (key === 'search.sortOptions.relevance') return 'Pertinence';
      if (key === 'search.sortOptions.priceAsc') return 'Prix croissant';
      if (key === 'search.sortOptions.priceDesc') return 'Prix décroissant';
      if (key === 'search.sortOptions.newest') return 'Nouveautés';
      return key;
    },
    locale: 'fr',
  }),
}));

// Mock Next.js navigation
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

// Mock API calls
const mockFetchWithCsrf = vi.fn();
vi.mock('@/lib/api', () => ({
  fetchWithCsrf: (...args: unknown[]) => mockFetchWithCsrf(...args),
}));

// Mock HubNavbar, HubFooter, SponsoredAdsRail
const mockSponsoredAdsRail = vi.fn();
vi.mock('../components/hub/HubNavbar', () => ({
  HubNavbar: () => <div data-testid="mock-hub-navbar" />,
}));
vi.mock('../components/hub/HubFooter', () => ({
  HubFooter: () => <div data-testid="mock-hub-footer" />,
}));
vi.mock('../components/hub/SponsoredAdsRail', () => ({
  SponsoredAdsRail: (props: any) => {
    mockSponsoredAdsRail(props);
    return <div data-testid="mock-sponsored-ads-rail" data-columns={props.columns} data-limit={props.limit} />;
  },
}));

const mockCategories = [
  { id: 'cat-1', name: 'Artisanat & Tapis', slug: 'artisanat', product_count: 15 },
  { id: 'cat-2', name: 'Huiles & Terroir', slug: 'terroir', product_count: 8 },
  { id: 'cat-3', name: 'Céramique', slug: 'ceramique', product_count: 12 },
  { id: 'cat-4', name: 'Bijoux & Accessoires', slug: 'bijoux', product_count: 5 },
  { id: 'cat-5', name: 'Mode & Habillement', slug: 'mode', product_count: 20 },
  { id: 'cat-6', name: 'Cosmétique Bio', slug: 'cosmetique', product_count: 7 },
  { id: 'cat-7', name: 'High-Tech & Gadgets', slug: 'high-tech', product_count: 3 },
];

const mockProducts = [
  {
    id: 'prod-1',
    title: 'Tapis Berbère Kilim Fait Main',
    price: '180.000',
    compare_at_price: '220.000',
    slug: 'tapis-berbere',
    category: 'Artisanat & Tapis',
    store_name: 'Atelier Kairouan',
    type: 'physical',
  },
  {
    id: 'prod-2',
    title: 'Huile d\'Olive Vierge Extra Bio 1L',
    price: '32.500',
    slug: 'huile-olive-bio',
    category: 'Huiles & Terroir',
    store_name: 'Domaine de Sfax',
    type: 'physical',
  },
];

describe('Marketplace Hub Search Page Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('q');
    mockSearchParams.delete('category');

    // Default categories mock
    mockFetchWithCsrf.mockImplementation((url: string) => {
      if (url.includes('/api/pd/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockCategories }),
        });
      }
      if (url.includes('/api/pd/search')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            hits: mockProducts,
            estimatedTotalHits: mockProducts.length,
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    // Mock global fetch for marketplace settings
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/pd/marketplace/settings')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              marketplace_name: 'PandaMarket TN',
              hub_search_grid_columns: 4,
              hub_search_items_per_page: 24,
            },
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  it('renders compact sidebar with categories and product counts', async () => {
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Artisanat & Tapis').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Huiles & Terroir').length).toBeGreaterThan(0);
    });

    // Check compact product count badge
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('supports category inline quick filter search and show all toggle', async () => {
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Artisanat & Tapis').length).toBeGreaterThan(0);
    });

    // Check "+ Voir tout (7)" button
    const showAllBtn = screen.getByText(/\+ Voir tout \(7\)/i);
    expect(showAllBtn).toBeInTheDocument();
    fireEvent.click(showAllBtn);

    expect(screen.getByText('High-Tech & Gadgets')).toBeInTheDocument();

    // Type in category search
    const categorySearchInput = screen.getByPlaceholderText('Chercher catégorie...');
    fireEvent.change(categorySearchInput, { target: { value: 'Céram' } });

    expect(screen.getByText('Céramique')).toBeInTheDocument();
    expect(screen.queryByText('High-Tech & Gadgets')).not.toBeInTheDocument();
  });

  it('triggers filter query and renders active filter chips when price presets are clicked', async () => {
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getAllByText('20 – 50 DT').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('20 – 50 DT')[0]);

    await waitFor(() => {
      expect(mockFetchWithCsrf).toHaveBeenCalledWith(
        expect.stringContaining('price_min=20&price_max=50'),
      );
    });

    // Check active filter chip above results
    expect(screen.getByText(/Prix: 20 – 50 DT/i)).toBeInTheDocument();
  });

  it('renders products and displays discount percentage pill', async () => {
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Tapis Berbère Kilim Fait Main')).toBeInTheDocument();
      expect(screen.getByText('Huile d\'Olive Vierge Extra Bio 1L')).toBeInTheDocument();
    });

    // -18% discount for product 1 (220 down to 180 = ~18%)
    expect(screen.getByText('-18%')).toBeInTheDocument();
  });

  it('clears all active filters when "Tout effacer" is clicked', async () => {
    render(<SearchPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Artisanat & Tapis').length).toBeGreaterThan(0);
    });

    // Select category in sidebar
    const catButtons = screen.getAllByRole('button');
    const artisanatBtn = catButtons.find((btn) => btn.textContent?.includes('Artisanat & Tapis'));
    expect(artisanatBtn).toBeDefined();
    fireEvent.click(artisanatBtn!);

    // Check active chip
    await waitFor(() => {
      expect(screen.getByText(/Catégorie: artisanat/i)).toBeInTheDocument();
    });

    // Click "Tout effacer"
    const clearBtn = screen.getAllByText(/Tout effacer/i)[0];
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Catégorie: artisanat/i)).not.toBeInTheDocument();
    });
  });

  it('passes configured sponsored columns and count settings to SponsoredAdsRail', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/pd/marketplace/settings')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              marketplace_name: 'PandaMarket TN',
              hub_search_sponsored_enabled: true,
              hub_search_sponsored_columns: 3,
              hub_search_sponsored_count: 8,
            },
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    render(<SearchPage />);

    await waitFor(() => {
      expect(mockSponsoredAdsRail).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: 3,
          limit: 8,
          enabled: true,
          compact: true,
        }),
      );
    });
  });
});
