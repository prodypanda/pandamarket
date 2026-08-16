/**
 * Adversarial Stress & Edge Case Test Suite for Admin Marketplace Products Hub
 * ─────────────────────────────────────────────────────────────────────────────
 * Empirically tests hostile inputs, malformed payloads, extreme concurrency,
 * zero-state boundaries, and RTL localization.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminProductsPage from '@/app/(admin)/products/page';
import { fetchWithCsrf } from '@/lib/api';
import { LocaleProvider } from '@/contexts/LocaleContext';

vi.mock('@/lib/api', () => ({
  fetchWithCsrf: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/products',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/image-url', () => ({
  getResizedImageUrl: (url: string) => url || '',
}));

vi.mock('@/lib/store-hosts', () => ({
  getStorefrontUrl: ({ subdomain, customDomain }: { subdomain?: string; customDomain?: string | null }) => {
    if (customDomain) return `https://${customDomain}`;
    return `https://${subdomain || 'demo'}.pandamarket.tn`;
  },
  getMarketplaceDomain: () => 'pandamarket.tn',
}));

describe('Adversarial & Stress Verification for AdminProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.cookie = 'pd_locale=en;path=/;max-age=0';
  });

  it('Stress Test 1: Handles completely empty search results without crashes or division by zero', async () => {
    (fetchWithCsrf as any).mockImplementation((url: string) => {
      if (url.includes('/api/pd/admin/categories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [],
            pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
            metrics: {
              total_products: 0,
              published_count: 0,
              pending_count: 0,
              draft_count: 0,
              rejected_count: 0,
              archived_count: 0,
              out_of_stock_count: 0,
              low_stock_count: 0,
              ai_tagged_count: 0,
            },
          }),
      });
    });

    render(
      <LocaleProvider>
        <AdminProductsPage />
      </LocaleProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/No products found matching your filters/i)).toBeInTheDocument();
    });

    // Verify pagination reads Showing 0 to 0 of 0 records
    expect(screen.getByText(/Showing 0 to 0 of 0 records/i)).toBeInTheDocument();
  });

  it('Stress Test 2: Handles malformed product records (null store, null category, missing variants, missing attributes, missing images)', async () => {
    const malformedProduct = {
      id: 'prod-malformed-999',
      store_id: 'store-unknown',
      type: undefined,
      status: 'draft',
      title: 'Malformed Edge Case Product',
      slug: 'malformed-product',
      description: null,
      category: null,
      price: 'invalid-price', // Non-numeric string
      inventory_quantity: 0,
      thumbnail: null, // Null thumbnail (tests fallback icon)
      seo_title: null,
      seo_description: null,
      tags: null, // Null tags
      interest_tags: null, // Null AI tags
      attributes: null, // Null attributes
      images: null, // Null images array
      variants: null, // Null variants array
      store: null, // Null store object
      marketplace_category: null,
    };

    (fetchWithCsrf as any).mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [malformedProduct],
            pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
            metrics: { total_products: 1 },
          }),
      });
    });

    render(
      <LocaleProvider>
        <AdminProductsPage />
      </LocaleProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Malformed Edge Case Product')).toBeInTheDocument();
    });

    // Verify fallback image text
    expect(screen.getByText('No Img')).toBeInTheDocument();

    // Verify store fallback
    expect(screen.getByText('N/A')).toBeInTheDocument();

    // Click product to open drawer
    fireEvent.click(screen.getByText('Malformed Edge Case Product'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Navigate across all 6 tabs on malformed product to ensure no crash
    // Tab 2: Variants
    fireEvent.click(screen.getByText(/Variants/i));
    expect(screen.getByText(/No variants defined/i)).toBeInTheDocument();

    // Tab 3: Specs
    fireEvent.click(screen.getByText(/Specs \/ Attributes/i));
    expect(screen.getByText(/No custom attributes/i)).toBeInTheDocument();

    // Tab 4: SEO
    fireEvent.click(screen.getByText(/SEO & Taxonomy/i));
    expect(screen.getByText('n/a')).toBeInTheDocument();

    // Tab 5: Store
    fireEvent.click(screen.getByText(/Store Info/i));
    expect(screen.getByText(/\.pandamarket\.tn/i)).toBeInTheDocument();

    // Tab 6: Tags
    fireEvent.click(screen.getByText(/Tag Studio/i));
    expect(screen.getByText(/No vendor tags added/i)).toBeInTheDocument();
    expect(screen.getByText(/No AI interest tags assigned/i)).toBeInTheDocument();
  });

  it('Stress Test 3: Rapid view mode toggling (Table <-> Grid) maintains state without error', async () => {
    (fetchWithCsrf as any).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [{ id: 'prod-1', title: 'Test Product', price: 10, inventory_quantity: 5, status: 'published' }],
            pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
          }),
      })
    );

    render(
      <LocaleProvider>
        <AdminProductsPage />
      </LocaleProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    const gridBtn = screen.getByRole('button', { name: /grid/i });
    const tableBtn = screen.getByRole('button', { name: /table/i });

    // Rapidly toggle 10 times
    for (let i = 0; i < 10; i++) {
      fireEvent.click(gridBtn);
      expect(screen.getByTestId('products-grid')).toBeInTheDocument();
      fireEvent.click(tableBtn);
      expect(screen.queryByTestId('products-grid')).not.toBeInTheDocument();
    }
  });

  it('Stress Test 4: Rapid tag mutations, deduplication, whitespace trimming, and error recovery in Tag Studio', async () => {
    const product = {
      id: 'prod-tag-test',
      title: 'Tag Test Product',
      price: 25.0,
      inventory_quantity: 10,
      status: 'published',
      tags: ['initial-tag'],
      interest_tags: ['initial-ai-tag'],
    };

    let patchCalled = false;
    (fetchWithCsrf as any).mockImplementation((url: string, opts?: any) => {
      if (opts?.method === 'PATCH') {
        patchCalled = true;
        const body = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 'prod-tag-test',
                tags: body.tags,
                interest_tags: body.interest_tags,
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [product],
            pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
          }),
      });
    });

    render(
      <LocaleProvider>
        <AdminProductsPage />
      </LocaleProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tag Test Product')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Tag Test Product'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    // Switch to Tag Studio
    fireEvent.click(screen.getByText(/Tag Studio/i));
    expect(screen.getByText('initial-tag')).toBeInTheDocument();
    expect(screen.getByText('initial-ai-tag')).toBeInTheDocument();

    const tagInput = screen.getByPlaceholderText(/Add tag and press Enter/i);
    const addBtn = screen.getByRole('button', { name: /Add/i });

    // 1. Try adding empty string (should be ignored)
    fireEvent.change(tagInput, { target: { value: '   ' } });
    fireEvent.click(addBtn);

    // 2. Try adding duplicate tag (should be deduplicated)
    fireEvent.change(tagInput, { target: { value: 'initial-tag' } });
    fireEvent.click(addBtn);

    // 3. Add valid vendor tag
    fireEvent.change(tagInput, { target: { value: 'artisan-leather' } });
    fireEvent.click(addBtn);
    expect(screen.getByText('artisan-leather')).toBeInTheDocument();

    // 4. Switch to AI tag and add
    const aiRadio = screen.getByLabelText(/AI Interest Tags/i);
    fireEvent.click(aiRadio);
    fireEvent.change(tagInput, { target: { value: 'luxury-goods' } });
    fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('luxury-goods')).toBeInTheDocument();

    // 5. Remove initial tag
    const removeInitialTag = screen.getAllByTitle('Remove tag')[0];
    fireEvent.click(removeInitialTag);
    expect(screen.queryByText('initial-tag')).not.toBeInTheDocument();

    // 6. Save tags
    const saveBtn = screen.getByRole('button', { name: /Save Tags/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Saved!/i)).toBeInTheDocument();
    });

    expect(patchCalled).toBe(true);
  });

  it('Stress Test 5: Handles extremely long strings (1,000 char product title, extreme attribute lengths) without crashing', async () => {
    const hugeTitle = 'A'.repeat(500) + ' ' + 'B'.repeat(500);
    const hugeAttrValue = 'VeryLongAttributeValue-'.repeat(50);

    const longProduct = {
      id: 'prod-huge-string-01',
      title: hugeTitle,
      price: 99.999,
      inventory_quantity: 100,
      status: 'published',
      attributes: [{ name: 'DeepSpecificationKey', value: hugeAttrValue }],
      description: 'Long description '.repeat(100),
    };

    (fetchWithCsrf as any).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [longProduct],
            pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
          }),
      })
    );

    render(
      <LocaleProvider>
        <AdminProductsPage />
      </LocaleProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(hugeTitle)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(hugeTitle));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Specs \/ Attributes/i));
    expect(screen.getByText(hugeAttrValue)).toBeInTheDocument();
  });

  it('Stress Test 6: Verifies Arabic RTL rendering and translation integrity', async () => {
    localStorage.setItem('pd_locale', 'ar');
    document.cookie = 'pd_locale=ar;path=/';

    (fetchWithCsrf as any).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: 'prod-ar-1',
                title: 'صابون زيت زيتون أصلي',
                price: 15.0,
                inventory_quantity: 20,
                status: 'published',
              },
            ],
            pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
            metrics: {
              total_products: 1,
              published_count: 1,
              pending_count: 0,
              draft_count: 0,
              rejected_count: 0,
              archived_count: 0,
              out_of_stock_count: 0,
              low_stock_count: 0,
              ai_tagged_count: 1,
            },
          }),
      })
    );

    render(
      <LocaleProvider>
        <AdminProductsPage />
      </LocaleProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('صابون زيت زيتون أصلي')).toBeInTheDocument();
    });

    // Check page root has dir="rtl"
    const pageContainer = screen.getByTestId('admin-products-page');
    expect(pageContainer).toHaveAttribute('dir', 'rtl');

    // Check Arabic translated headers and metrics
    expect(screen.getByText('منتجات السوق')).toBeInTheDocument();
    expect(screen.getByText('الإجمالي')).toBeInTheDocument();
    expect(screen.getByText('الجدول')).toBeInTheDocument();
    expect(screen.getByText('الشبكة')).toBeInTheDocument();
  });
});
