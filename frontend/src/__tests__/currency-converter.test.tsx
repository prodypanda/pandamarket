import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { convertTndTo, formatPriceWithPreview } from '../lib/currency';
import { CurrencyProvider, useCurrency } from '../context/CurrencyContext';
import { CurrencySelector } from '../components/CurrencySelector';

function TestPriceComponent() {
  const { formatPrice } = useCurrency();
  return (
    <div>
      <CurrencySelector />
      <span data-testid="price-display">{formatPrice(100.0)}</span>
    </div>
  );
}

describe('PLAN-M-15: Multi-Currency Display Engine (TND Base with EUR, USD, SAR Preview)', () => {
  it('converts TND amounts accurately based on exchange rates', () => {
    // 100 TND * 0.30 = 30.00 EUR
    expect(convertTndTo(100, 'EUR')).toBe(30);
    // 100 TND * 0.32 = 32.00 USD
    expect(convertTndTo(100, 'USD')).toBe(32);
    // 100 TND * 1.20 = 120.00 SAR
    expect(convertTndTo(100, 'SAR')).toBe(120);
  });

  it('formats price with preview string', () => {
    expect(formatPriceWithPreview(50.0, 'TND')).toBe('50.000 TND');
    expect(formatPriceWithPreview(50.0, 'EUR')).toBe('50.000 TND (≈ 15.00 €)');
    expect(formatPriceWithPreview(50.0, 'USD')).toBe('50.000 TND (≈ 16.00 $)');
  });

  it('updates display preview when changing currency via CurrencySelector', () => {
    render(
      <CurrencyProvider>
        <TestPriceComponent />
      </CurrencyProvider>,
    );

    const priceSpan = screen.getByTestId('price-display');
    expect(priceSpan.textContent).toBe('100.000 TND');

    const select = screen.getByLabelText(/Sélectionner la devise d'affichage/i);
    fireEvent.change(select, { target: { value: 'EUR' } });

    expect(priceSpan.textContent).toBe('100.000 TND (≈ 30.00 €)');
  });
});
