import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BackInStockAlertButton } from '../components/product/BackInStockAlertButton';
import { BroadcastComposer } from '../components/dashboard/BroadcastComposer';
import { FollowedStoresCarousel } from '../components/feed/FollowedStoresCarousel';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
  fetchWithCsrf: vi.fn(),
}));

describe('Frontend Feature 20 Components — BackInStockAlertButton, BroadcastComposer & Stories', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('BackInStockAlertButton', () => {
    it('renders "M\'avertir lors du réassort" when not subscribed', async () => {
      vi.spyOn(api, 'fetchWithCsrf').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscribed: false }),
      } as any);

      render(
        <BackInStockAlertButton
          productId="prod_123"
          productTitle="Sweat Panda"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('btn-back-in-stock-alert')).toBeInTheDocument();
      });

      expect(screen.getByText(/M'alerter lors du réassort/i)).toBeInTheDocument();
    });

    it('opens modal for guest user to input email', async () => {
      vi.spyOn(api, 'fetchWithCsrf').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscribed: false }),
      } as any);

      render(
        <BackInStockAlertButton
          productId="prod_123"
          productTitle="Sweat Panda"
          isAuthenticated={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('btn-back-in-stock-alert')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('btn-back-in-stock-alert'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('nom@exemple.com')).toBeInTheDocument();
    });
  });

  describe('BroadcastComposer Audience Segmentation', () => {
    it('toggles between All Subscribers and VIP Verified Buyers', () => {
      render(
        <BroadcastComposer
          totalSubscribers={120}
          verifiedSubscribers={45}
          remainingQuota={2}
        />
      );

      expect(screen.getByText(/Tous les abonnés/i)).toBeInTheDocument();
      expect(screen.getByText(/Acheteurs vérifiés/i)).toBeInTheDocument();
      expect(screen.getAllByText(/120/).length).toBeGreaterThan(0);
      expect(screen.getByText('45')).toBeInTheDocument();
    });
  });

  describe('FollowedStoresCarousel Stories & Flash Drops', () => {
    it('renders store with flash drop badge and story ring', () => {
      const stores = [
        {
          id: 'store_1',
          name: 'Panda Fashion',
          subdomain: 'pandafashion',
          logo_url: null,
          unread_updates_count: 3,
          is_verified: true,
          has_active_story: true,
          active_flash_drop: {
            title: 'Vente Flash -30%',
            discount: '-30%',
          },
        },
      ];

      render(
        <FollowedStoresCarousel
          followedStores={stores}
          selectedStoreId={null}
          onSelectStore={vi.fn()}
        />
      );

      expect(screen.getByText('Panda Fashion')).toBeInTheDocument();
      expect(screen.getByText('-30%')).toBeInTheDocument();
    });
  });
});
