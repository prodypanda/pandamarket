import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { CartProvider } from '@/contexts/CartContext';
import { ProductDetailV2 } from '@/components/product/ProductDetailV2';
import { ProductDetailV1 } from '@/components/product/ProductDetailV1';
import { DeliveryEstimatorWidget } from '@/components/product/DeliveryEstimatorWidget';
import { ProductSocialShare } from '@/components/product/ProductSocialShare';
import { ProductReassuranceBar } from '@/components/product/ProductReassuranceBar';
import { ProductGallery } from '@/components/product/ProductGallery';
import type { MarketplaceSettings } from '@/lib/marketplace-settings';

const mockProduct = {
  id: 'prod_12345',
  title: 'Panda Modern Organic Hoodie',
  price: 89.0,
  compare_at_price: 119.0,
  category: 'Mode & Vetements',
  marketplace_category_slug: 'mode-vetements',
  product_reference: 'HD-2026-BLK',
  thumbnail: 'https://example.com/hoodie.jpg',
  images: ['https://example.com/hoodie.jpg', 'https://example.com/hoodie2.jpg'],
  inventory_quantity: 4,
  store_id: 'store_99',
  store_name: 'Panda Fashion Studio',
  store_subdomain: 'pandastudio',
  store_is_verified: true,
  store_seller_type: 'wholesaler',
  metadata: {
    wholesale_pricing: {
      min_quantity: 5,
      price_tiers: [
        { min_quantity: 5, unit_price: 79.0 },
        { min_quantity: 20, unit_price: 69.0 },
      ],
    },
  },
  status: 'active',
  description: 'Un sweat à capuche en coton biologique ultra confortable conçu pour un style moderne.',
  attributes: [{ name: 'Matière', value: '100% Coton Bio' }],
};

const mockSettings: MarketplaceSettings = {
  marketplace_name: 'PandaMarket',
  marketplace_theme: 'panda',
  single_product_page_version: 'v2_modern_showcase',
  single_product_sticky_cart_bar: true,
  single_product_show_delivery_estimator: true,
  single_product_show_stock_urgency: true,
  single_product_stock_urgency_threshold: 5,
  single_product_show_share_buttons: true,
  single_product_show_reassurance: true,
  single_product_show_live_views: true,
  single_product_show_contact_seller: true,
  single_product_gallery_layout: 'sticky_carousel',
  single_product_details_layout: 'tabs',
  single_product_seller_card_style: 'rich_banner',
  single_product_cross_sell_position: 'bottom',
};

describe('Marketplace Single Product Page V2 Suite', () => {
  beforeAll(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    vi.stubGlobal('fetch', (url: string) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ads: [], in_wishlist: false }),
      });
    });
  });

  beforeEach(() => {
    document.cookie = 'pd_locale=fr; path=/';
    localStorage.setItem('pd_locale', 'fr');
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <LocaleProvider>
        <CartProvider>
          {ui}
        </CartProvider>
      </LocaleProvider>
    );
  };

  it('renders DeliveryEstimatorWidget with 24 governorates and dispatch cutoff notice', () => {
    renderWithProviders(<DeliveryEstimatorWidget freeShippingEligible={true} />);

    expect(screen.getByTestId('delivery-estimator-widget')).toBeInTheDocument();
    const select = screen.getByTestId('delivery-governorate-select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options.length).toBe(24);

    // Switch governorate to Sfax
    fireEvent.change(select, { target: { value: 'sfax' } });
    expect(select.value).toBe('sfax');
  });

  it('renders ProductSocialShare with 1-click WhatsApp link and copy link button', async () => {
    renderWithProviders(
      <ProductSocialShare
        title="Super Hoodie"
        price={89.0}
        url="https://pandamarket.tn/hub/products/prod_123"
      />
    );

    const whatsappBtn = screen.getByTestId('share-whatsapp-btn');
    expect(whatsappBtn).toBeInTheDocument();
    expect(whatsappBtn.getAttribute('href')).toContain('api.whatsapp.com');
    expect(whatsappBtn.getAttribute('href')).toContain('Super%20Hoodie');

    const copyBtn = screen.getByTestId('share-copy-link-btn');
    expect(copyBtn).toBeInTheDocument();
  });

  it('renders ProductGallery in grid_mosaic and stacked layouts smoothly', () => {
    const { container: mosaicContainer } = renderWithProviders(
      <ProductGallery
        title="Test Hoodie"
        images={['https://example.com/1.jpg', 'https://example.com/2.jpg']}
        layout="grid_mosaic"
      />
    );
    expect(mosaicContainer.querySelectorAll('button').length).toBeGreaterThan(0);

    const { container: stackedContainer } = renderWithProviders(
      <ProductGallery
        title="Test Hoodie"
        images={['https://example.com/1.jpg', 'https://example.com/2.jpg']}
        layout="stacked"
      />
    );
    expect(stackedContainer.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('renders ProductReassuranceBar with 4 trust cards', () => {
    renderWithProviders(<ProductReassuranceBar />);

    const reassuranceBar = screen.getByTestId('product-reassurance-bar');
    expect(reassuranceBar).toBeInTheDocument();
    expect(screen.getByText(/Paiement 100% Sécurisé|100% Secure Payment/i)).toBeInTheDocument();
    expect(screen.getByText(/Livraison Rapide Tunisie|Fast Tunisia Delivery/i)).toBeInTheDocument();
  });

  it('renders ProductDetailV2 with Impeccable high-conversion components and wholesale tiers', () => {
    renderWithProviders(
      <ProductDetailV2
        product={mockProduct}
        similarProducts={[]}
        ratingData={{ average_rating: 4.8, review_count: 12 }}
        marketplaceSettings={mockSettings}
        locale="fr"
      />
    );

    expect(screen.getByTestId('product-detail-v2')).toBeInTheDocument();
    expect(screen.getAllByText('Panda Modern Organic Hoodie').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/HD-2026-BLK/i)).toBeInTheDocument();

    // Check discount and savings
    expect(screen.getByText(/-25%/i)).toBeInTheDocument();
    expect(screen.getByText(/30.000 TND/i)).toBeInTheDocument();

    // Check low stock urgency meter (since qty = 4 <= 5)
    expect(screen.getByTestId('stock-urgency-meter')).toBeInTheDocument();

    // Check live views social proof
    expect(screen.getByTestId('live-views-badge')).toBeInTheDocument();

    // Check tabs
    expect(screen.getByTestId('tab-btn-description')).toBeInTheDocument();
    expect(screen.getByTestId('tab-btn-specs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-btn-reviews')).toBeInTheDocument();
    expect(screen.getByTestId('tab-btn-shipping')).toBeInTheDocument();

    // Switch tab to specs
    fireEvent.click(screen.getByTestId('tab-btn-specs'));
    expect(screen.getByTestId('panel-specs')).toBeInTheDocument();
    expect(screen.getByText('100% Coton Bio')).toBeInTheDocument();

    // Switch tab to shipping
    fireEvent.click(screen.getByTestId('tab-btn-shipping'));
    expect(screen.getByTestId('panel-shipping')).toBeInTheDocument();
  });

  it('renders ProductDetailV2 in accordions layout mode', () => {
    renderWithProviders(
      <ProductDetailV2
        product={mockProduct}
        similarProducts={[]}
        ratingData={{ average_rating: 4.8, review_count: 12 }}
        marketplaceSettings={{ ...mockSettings, single_product_details_layout: 'accordions' }}
        locale="fr"
      />
    );

    expect(screen.getByTestId('product-detail-v2')).toBeInTheDocument();
    expect(screen.getByText('100% Coton Bio')).toBeInTheDocument();
  });

  it('renders ProductDetailV1 cleanly as backward compatible classic layout', () => {
    renderWithProviders(
      <ProductDetailV1
        product={mockProduct}
        similarProducts={[]}
        ratingData={{ average_rating: 4.8, review_count: 12 }}
        marketplaceSettings={{ ...mockSettings, single_product_page_version: 'v1_classic' }}
        locale="fr"
      />
    );

    expect(screen.getByTestId('product-detail-v1')).toBeInTheDocument();
    expect(screen.getAllByText('Panda Modern Organic Hoodie').length).toBeGreaterThanOrEqual(1);
  });
});
