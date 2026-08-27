import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductsTable, ProductItem } from '../components/dashboard/products/ProductsTable';
import { ProductDrawer } from '../components/dashboard/products/ProductDrawer';

describe('PLAN-T3-04: Frontend Monolith Decomposition (Modular Products Component Tree)', () => {
  const sampleProducts: ProductItem[] = [
    {
      id: 'prod_1',
      title: 'Tapis Artisanal Kairouan',
      sku: 'TAP-KAI-001',
      price: 250.0,
      inventory_quantity: 5,
      status: 'active',
      thumbnail: 'https://cdn.pandamarket.tn/tapis.webp',
    },
  ];

  it('renders products table with item metadata and triggers edit callback', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(<ProductsTable products={sampleProducts} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByText('Tapis Artisanal Kairouan')).toBeDefined();
    expect(screen.getByText('250.000 TND')).toBeDefined();
    expect(screen.getByText('5 en stock')).toBeDefined();

    const editBtn = screen.getByRole('button', { name: /Modifier/i });
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(sampleProducts[0]);
  });

  it('renders product drawer tabs and handles form input', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <ProductDrawer
        isOpen={true}
        product={sampleProducts[0]}
        onClose={onClose}
        onSave={onSave}
      />,
    );

    expect(screen.getByText(/Modifier le produit/i)).toBeDefined();

    // Switch to Photos tab
    const photosTab = screen.getByRole('button', { name: /Photos/i });
    fireEvent.click(photosTab);
    expect(screen.getByText(/Ajouter une photo par URL/i)).toBeDefined();

    // Switch to Prix & Stock tab
    const stockTab = screen.getByRole('button', { name: /Prix & Stock/i });
    fireEvent.click(stockTab);
    expect(screen.getByText(/Quantité en stock \*/i)).toBeDefined();
  });
});
