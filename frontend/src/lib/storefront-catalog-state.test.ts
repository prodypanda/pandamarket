import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CATALOG_SORT,
  parseCatalogState,
  serializeCatalogState,
  updateCatalogSearchParams,
} from './storefront-catalog-state';

describe('storefront catalog URL state', () => {
  it('normalizes missing, invalid, and legacy values into one state contract', () => {
    const state = parseCatalogState(
      new URLSearchParams(
        'category=%20electronics%20&sort=unknown&price_min=%205%20&in_stock=true&page=0&q=%20phone%20',
      ),
    );

    expect(state).toEqual({
      category: 'electronics',
      sort: DEFAULT_CATALOG_SORT,
      priceMin: '5',
      priceMax: undefined,
      inStock: true,
      q: 'phone',
      page: 1,
    });
  });

  it('preserves unrelated parameters and resets pagination for filter changes', () => {
    const next = updateCatalogSearchParams(
      new URLSearchParams('locale=fr&page=4&category=old&sort=oldest'),
      { category: 'new', in_stock: 'true' },
    );

    expect(next.toString()).toBe('locale=fr&category=new&sort=oldest&in_stock=1');
    expect(parseCatalogState(next).page).toBe(1);
  });

  it('removes defaults and canonicalizes boolean and page serialization', () => {
    const next = updateCatalogSearchParams(
      new URLSearchParams('sort=price_desc&page=2&in_stock=true'),
      { sort: DEFAULT_CATALOG_SORT, in_stock: 'false', page: '1' },
    );

    expect(next.toString()).toBe('');
  });

  it('keeps explicit pagination while retaining every active filter', () => {
    const next = updateCatalogSearchParams(
      new URLSearchParams('category=books&q=history&price_min=10'),
      { page: '3' },
    );

    expect(next.toString()).toBe('category=books&q=history&price_min=10&page=3');
    expect(parseCatalogState(next).page).toBe(3);
  });

  it('serializes a complete state without leaking defaults', () => {
    const next = serializeCatalogState({
      category: ' shoes ',
      sort: 'price_desc',
      priceMin: '20',
      priceMax: undefined,
      inStock: true,
      q: 'summer',
      page: 2,
    });

    expect(next.toString()).toBe('category=shoes&sort=price_desc&price_min=20&in_stock=1&q=summer&page=2');
  });
});
