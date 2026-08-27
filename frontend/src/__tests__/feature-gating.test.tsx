import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';

const { mockFetchWithCsrf } = vi.hoisted(() => ({
  mockFetchWithCsrf: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  fetchWithCsrf: mockFetchWithCsrf,
}));

import { DashboardSubscriptionProvider, useDashboardSubscription } from '../contexts/DashboardSubscriptionContext';

describe('PLAN-B-13: Feature Gating & Subscription Plan Limits UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly disables gated features for a Free plan seller', async () => {
    mockFetchWithCsrf.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: 'free',
        type: 'standard',
        limits: {
          plan_id: 'free',
          max_products: 5,
          max_images_per_product: 3,
          max_page_builder_pages: 0,
          has_ai_seo: false,
          has_image_compression: false,
          has_custom_domain: false,
          has_page_builder: false,
          has_direct_payment: false,
          has_white_label: false,
          has_own_ai_provider: false,
          commission_rate: 8,
          ai_tokens_included: 0,
          yearly_price: 0,
        },
      }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DashboardSubscriptionProvider>{children}</DashboardSubscriptionProvider>
    );

    const { result } = renderHook(() => useDashboardSubscription(), { wrapper });

    // Free plan has no AI SEO and no Custom Domains
    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toBe('free');
    expect(result.current.isFeatureAllowed('has_ai_seo')).toBe(false);
    expect(result.current.isFeatureAllowed('has_custom_domain')).toBe(false);
    expect(result.current.isFeatureAllowed('has_page_builder')).toBe(false);
  });

  it('correctly enables gated features for a Pro plan seller', async () => {
    mockFetchWithCsrf.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: 'pro',
        type: 'standard',
        limits: {
          plan_id: 'pro',
          max_products: -1,
          max_images_per_product: 15,
          max_page_builder_pages: 10,
          has_ai_seo: true,
          has_image_compression: true,
          has_custom_domain: true,
          has_page_builder: true,
          has_direct_payment: true,
          has_white_label: false,
          has_own_ai_provider: false,
          commission_rate: 3,
          ai_tokens_included: 50000,
          yearly_price: 349,
        },
      }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DashboardSubscriptionProvider>{children}</DashboardSubscriptionProvider>
    );

    const { result } = renderHook(() => useDashboardSubscription(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plan).toBe('pro');
    expect(result.current.isFeatureAllowed('has_ai_seo')).toBe(true);
    expect(result.current.isFeatureAllowed('has_custom_domain')).toBe(true);
    expect(result.current.isFeatureAllowed('has_page_builder')).toBe(true);
  });
});
