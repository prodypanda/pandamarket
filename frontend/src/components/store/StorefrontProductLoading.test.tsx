import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { StorefrontProductLoadingProvider } from './StorefrontProductLoading';
import type { StoreProduct } from '../themes/shared';
import { StorefrontProductLoadingContext } from './StorefrontProductLoadingContext';

const product = (id: string): StoreProduct => ({ id, title: `Product ${id}`, price: 10 });

function Consumer() {
  const context = React.useContext(StorefrontProductLoadingContext);
  return (
    <>
      <div id="products" />
      <div data-testid="products">{context?.products.map((item) => item.id).join(',')}</div>
      <button type="button" onClick={() => void context?.loadNextPage()}>next</button>
    </>
  );
}

describe('StorefrontProductLoadingProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('requests the next tenant-scoped 24-product page and appends without duplicates', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      data: [product('p2'), product('p3')],
      meta: { page: 2, limit: 24, total: 3, total_pages: 2, has_next: false },
    }), { status: 200 }));

    render(
      <StorefrontProductLoadingProvider
        storeId="store_1"
        initialProducts={[product('p1'), product('p2')]}
        initialMeta={{ page: 1, limit: 24, total: 3, total_pages: 2, has_next: true }}
        mode="load_more"
      >
        <Consumer />
      </StorefrontProductLoadingProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'next' }));
    await waitFor(() => expect(screen.getByTestId('products')).toHaveTextContent('p1,p2,p3'));
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), window.location.origin);
    expect(url.searchParams.get('store_id')).toBe('store_1');
    expect(url.searchParams.get('limit')).toBe('24');
    expect(url.searchParams.get('page')).toBe('2');
  });

  it('prevents concurrent duplicate page requests', async () => {
    const fetchMock = vi.mocked(fetch);
    let resolveRequest!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { resolveRequest = resolve; }));

    render(
      <StorefrontProductLoadingProvider
        storeId="store_1"
        initialProducts={[product('p1')]}
        initialMeta={{ page: 1, limit: 24, total: 2, total_pages: 2, has_next: true }}
        mode="infinite"
      >
        <Consumer />
      </StorefrontProductLoadingProvider>,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'next' }).click();
      screen.getByRole('button', { name: 'next' }).click();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveRequest(new Response(JSON.stringify({ data: [product('p2')], meta: { page: 2, total_pages: 2, has_next: false } }), { status: 200 }));
    await waitFor(() => expect(screen.getByTestId('products')).toHaveTextContent('p1,p2'));
  });
});
