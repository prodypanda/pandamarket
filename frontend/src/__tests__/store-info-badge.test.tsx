import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoreInfoBadge, HomeProduct } from '../components/hub/home-template-shared';

describe('StoreInfoBadge component', () => {
  const sampleProduct: HomeProduct = {
    id: 'prod-123',
    title: 'Artisan Tapis Berbère',
    price: 180,
    store_name: 'Medina Crafts TN',
    store_is_verified: true,
    store_score: 4.9,
  };

  it('renders store name, verified badge, and store score by default', () => {
    render(
      <StoreInfoBadge
        product={sampleProduct}
        marketplaceSettings={{
          hub_card_show_store_name: true,
          hub_card_show_store_verified: true,
          hub_card_show_store_score: true,
        }}
      />
    );

    expect(screen.getByText('Medina Crafts TN')).toBeInTheDocument();
    expect(screen.getByTitle('Boutique Vérifiée')).toBeInTheDocument();
    expect(screen.getByText('4.9')).toBeInTheDocument();
  });

  it('hides store name when hub_card_show_store_name is false', () => {
    render(
      <StoreInfoBadge
        product={sampleProduct}
        marketplaceSettings={{
          hub_card_show_store_name: false,
          hub_card_show_store_verified: true,
          hub_card_show_store_score: true,
        }}
      />
    );

    expect(screen.queryByText('Medina Crafts TN')).not.toBeInTheDocument();
    expect(screen.getByText(/Vérifié/i)).toBeInTheDocument();
    expect(screen.getByText('4.9')).toBeInTheDocument();
  });

  it('hides verified badge when hub_card_show_store_verified is false', () => {
    render(
      <StoreInfoBadge
        product={sampleProduct}
        marketplaceSettings={{
          hub_card_show_store_name: true,
          hub_card_show_store_verified: false,
          hub_card_show_store_score: true,
        }}
      />
    );

    expect(screen.getByText('Medina Crafts TN')).toBeInTheDocument();
    expect(screen.queryByTitle('Boutique Vérifiée')).not.toBeInTheDocument();
    expect(screen.getByText('4.9')).toBeInTheDocument();
  });

  it('hides store score when hub_card_show_store_score is false', () => {
    render(
      <StoreInfoBadge
        product={sampleProduct}
        marketplaceSettings={{
          hub_card_show_store_name: true,
          hub_card_show_store_verified: true,
          hub_card_show_store_score: false,
        }}
      />
    );

    expect(screen.getByText('Medina Crafts TN')).toBeInTheDocument();
    expect(screen.getByTitle('Boutique Vérifiée')).toBeInTheDocument();
    expect(screen.queryByText('4.9')).not.toBeInTheDocument();
  });

  it('does not display a fake hardcoded score when score is 0 or undefined', () => {
    render(
      <StoreInfoBadge
        product={{
          ...sampleProduct,
          store_score: null,
          average_rating: 0,
        }}
        marketplaceSettings={{
          hub_card_show_store_name: true,
          hub_card_show_store_verified: true,
          hub_card_show_store_score: true,
        }}
      />
    );

    expect(screen.getByText('Medina Crafts TN')).toBeInTheDocument();
    expect(screen.getByTitle('Boutique Vérifiée')).toBeInTheDocument();
    expect(screen.queryByText('4.8')).not.toBeInTheDocument();
    expect(screen.queryByText('4.9')).not.toBeInTheDocument();
  });

  it('returns null when all store card options are disabled', () => {
    const { container } = render(
      <StoreInfoBadge
        product={sampleProduct}
        marketplaceSettings={{
          hub_card_show_store_name: false,
          hub_card_show_store_verified: false,
          hub_card_show_store_score: false,
        }}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
