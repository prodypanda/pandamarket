import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductsBentoCockpit } from '@/components/dashboard/ProductsBentoCockpit';
import type { Product, Category } from '@/app/hub/dashboard/products/page';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'fr',
    dir: 'ltr' as const,
  }),
}));

describe('ProductsBentoCockpit Component', () => {
  const mockCategories: Category[] = [
    { id: 'cat_artisanat', name: 'Artisanat Tunisien', slug: 'artisanat' },
    { id: 'cat_mode', name: 'Mode & Habillement', slug: 'mode' },
  ];

  const mockProducts: Product[] = [
    {
      id: 'prod_top_velocity',
      title: 'Tapis Kairouan Pure Laine',
      slug: 'tapis-kairouan',
      price: '450.000',
      compare_at_price: '520.000',
      status: 'published',
      inventory_quantity: 12,
      category: 'Artisanat Tunisien',
      marketplace_category_id: 'cat_artisanat',
      marketplace_category_name: 'Artisanat Tunisien',
      product_reference: 'SKU-KRW-01',
      thumbnail: 'https://cdn.pandamarket.tn/tapis.jpg',
      metadata: {
        units_sold: 28,
        total_revenue: 12600,
      },
    },
    {
      id: 'prod_out_of_stock',
      title: 'Jebba Traditionnelle Soie',
      slug: 'jebba-soie',
      price: '180.000',
      status: 'published',
      inventory_quantity: 0,
      category: 'Mode & Habillement',
      marketplace_category_id: 'cat_mode',
      marketplace_category_name: 'Mode & Habillement',
      product_reference: 'SKU-JBB-02',
      thumbnail: 'https://cdn.pandamarket.tn/jebba.jpg',
      metadata: {
        units_sold: 5,
        total_revenue: 900,
      },
    },
    {
      id: 'prod_low_stock',
      title: 'Chéchia Tunisienne Feutre',
      slug: 'chechia-feutre',
      price: '35.000',
      status: 'draft',
      inventory_quantity: 3,
      category: 'Artisanat Tunisien',
      marketplace_category_id: 'cat_artisanat',
      marketplace_category_name: 'Artisanat Tunisien',
      product_reference: 'SKU-CH-03',
      thumbnail: 'https://cdn.pandamarket.tn/chechia.jpg',
      metadata: {
        units_sold: 1,
        total_revenue: 35,
      },
    },
    {
      id: 'prod_regular',
      title: 'Huile d Olive Extra Vierge Chemlali',
      slug: 'huile-olive',
      price: '28.000',
      status: 'published',
      inventory_quantity: 45,
      category: 'Artisanat Tunisien',
      marketplace_category_id: 'cat_artisanat',
      marketplace_category_name: 'Artisanat Tunisien',
      product_reference: 'SKU-OIL-04',
      thumbnail: 'https://cdn.pandamarket.tn/huile.jpg',
    },
  ];

  const createDefaultProps = () => ({
    products: mockProducts,
    loading: false,
    totalProducts: 4,
    storeCounts: {
      total: 4,
      published: 3,
      draft: 1,
      low_stock: 2,
    },
    categories: mockCategories,
    onRefresh: vi.fn(async () => {}),
    onEditProduct: vi.fn(),
    onCreateProduct: vi.fn(),
    onDeleteProduct: vi.fn(),
    onStatusChange: vi.fn(async () => {}),
    onQuickAdjustStock: vi.fn(async () => {}),
    limits: {
      maxProducts: 100,
      currentProducts: 4,
    },
    dir: 'ltr' as const,
  });

  it('renders Bento Cockpit with KPI counters, urgent stock alerts, velocity hero, and visual grid', () => {
    const props = createDefaultProps();
    render(<ProductsBentoCockpit {...props} />);

    // 1. KPI Counters
    expect(screen.getByText('Total Références')).toBeInTheDocument();
    expect(screen.getByText('/ 100 max')).toBeInTheDocument();
    expect(screen.getByText('En Ligne & Publiés')).toBeInTheDocument();
    expect(screen.getByText('Brouillons & Préparation')).toBeInTheDocument();
    expect(screen.getByText('Alertes Inventaire')).toBeInTheDocument();

    // 2. Urgent Stock Alert Deck
    expect(screen.getByText("Deck d'Alerte Inventaire Urgent")).toBeInTheDocument();
    expect(screen.getByText('Rupture immédiate')).toBeInTheDocument();
    expect(screen.getByText(/Stock faible: 3 rest\./i)).toBeInTheDocument();

    // 3. Velocity Hero
    expect(screen.getByText('Top Vélocité Catalogue')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getAllByText('Tapis Kairouan Pure Laine').length).toBeGreaterThanOrEqual(1);

    // 4. Visual Grid
    expect(screen.getByText('SKU-OIL-04')).toBeInTheDocument();
  });

  it('opens stock adjustment modal and triggers onQuickAdjustStock with adjusted quantity', async () => {
    const props = createDefaultProps();
    render(<ProductsBentoCockpit {...props} />);

    // Find and click the stock adjustment button on the out-of-stock item
    const adjustButtons = screen.getAllByRole('button', { name: /Ajuster Stock/i });
    await act(async () => {
      fireEvent.click(adjustButtons[0]);
    });

    // Modal dialog should appear
    expect(screen.getByRole('heading', { name: 'Ajustement Rapide du Stock' })).toBeInTheDocument();

    // Click preset +10 button
    const plusTenBtn = screen.getByRole('button', { name: '+10' });
    await act(async () => {
      fireEvent.click(plusTenBtn);
    });

    // Click submit button
    const submitBtn = screen.getByRole('button', { name: /Enregistrer le stock/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(props.onQuickAdjustStock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'prod_out_of_stock' }),
      10
    );
  });

  it('triggers onEditProduct when clicking edit button or product title', () => {
    const props = createDefaultProps();
    render(<ProductsBentoCockpit {...props} />);

    const editButtons = screen.getAllByTitle('Modifier la fiche produit');
    fireEvent.click(editButtons[0]);

    expect(props.onEditProduct).toHaveBeenCalled();
  });

  it('filters the visual product grid via search input', () => {
    const props = createDefaultProps();
    render(<ProductsBentoCockpit {...props} />);

    const searchInput = screen.getByPlaceholderText(/Rechercher par titre, référence SKU, catégorie/i);
    fireEvent.change(searchInput, { target: { value: 'Huile' } });

    // Huile product card should be present in the grid
    expect(screen.getByTestId('grid-product-prod_regular')).toBeInTheDocument();

    // Other product cards should not be in the filtered grid
    expect(screen.queryByTestId('grid-product-prod_out_of_stock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grid-product-prod_low_stock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grid-product-prod_top_velocity')).not.toBeInTheDocument();

    expect(screen.getByText(/Filtres actifs appliqués/i)).toBeInTheDocument();
  });

  it('renders 1-click PandaAds sponsor shortcut links with encoded query params', () => {
    const props = createDefaultProps();
    render(<ProductsBentoCockpit {...props} />);

    const sponsorLinks = screen.getAllByTitle(/Booster avec PandaAds|Booster ce produit via PandaAds/i);
    expect(sponsorLinks.length).toBeGreaterThanOrEqual(1);

    const firstHref = sponsorLinks[0].getAttribute('href');
    expect(firstHref).toContain('/hub/dashboard/ads?sponsor_product_id=');
    expect(firstHref).toContain('title=');
  });

  it('triggers onStatusChange when status pill button is clicked', async () => {
    const props = createDefaultProps();
    render(<ProductsBentoCockpit {...props} />);

    // Click on a status badge toggle
    const statusToggles = screen.getAllByTitle('Cliquer pour basculer le statut');
    await act(async () => {
      fireEvent.click(statusToggles[0]);
    });

    expect(props.onStatusChange).toHaveBeenCalled();
  });

  it('triggers onDeleteProduct when delete button is clicked', () => {
    const props = createDefaultProps();
    render(<ProductsBentoCockpit {...props} />);

    const deleteButtons = screen.getAllByTitle('Supprimer ce produit');
    fireEvent.click(deleteButtons[0]);

    expect(props.onDeleteProduct).toHaveBeenCalledWith(expect.any(Object));
  });

  it('renders healthy inventory reassurance when no products are low in stock', () => {
    const props = createDefaultProps();
    // Only healthy products
    props.products = [mockProducts[0], mockProducts[3]];
    render(<ProductsBentoCockpit {...props} />);

    expect(screen.getByText('Inventaire sain & approvisionné')).toBeInTheDocument();
  });
});
