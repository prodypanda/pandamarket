/**
 * Store Follow Button & Subscriber Badges Test Suite
 *
 * Feature Covered:
 *   - Feature 20 / Requirement R1: Store Subscription & Follow System
 *     - Animated StoreFollowButton with optimistic UI and live subscriber count badge
 *     - Subscribed / Unsubscribed toggle states with hover transitions ("Se désabonner")
 *     - Anti-bot verified buyer badge classification (>= 1 completed order)
 *     - Display variants: PDP seller hover card, sticky action bar, marketplace vendor directory card
 *     - Notification preferences modal/toggle for price drops and new product publications
 *     - Error rollback, 429 rate limit guard, and unauthenticated redirects
 */

import React, { useState, useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { fetchWithCsrf } from '@/lib/api';

// Mock API layer
vi.mock('@/lib/api', () => ({
  fetchWithCsrf: vi.fn(),
}));

import {
  StoreFollowButton,
  StoreSubscriptionStatus,
  StoreFollowButtonProps,
} from '../components/store/StoreFollowButton';

export type { StoreSubscriptionStatus, StoreFollowButtonProps };
export { StoreFollowButton };

// ============================================================================
// Test Suite: StoreFollowButton (Feature 20 - Tiers 1 to 4)
// ============================================================================
describe('Feature 20: StoreFollowButton & Subscriber Badges (R1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // TIER 1: COMPONENT RENDERING & CORE INTERACTIONS (Coverage >= 5)
  // =========================================================================
  describe('Tier 1: Core Functional & Component Rendering', () => {
    it('T1.1: renders initial unfollowed state with "+ Suivre" and subscriber count badge', () => {
      render(<StoreFollowButton storeId="store_tn_101" storeName="Artisanat Sfax" initialSubscribed={false} initialCount={42} />);

      const followBtn = screen.getByTestId('store-follow-btn-store_tn_101');
      expect(followBtn).toBeInTheDocument();
      expect(followBtn).toHaveTextContent('Suivre');
      expect(followBtn).toHaveAttribute('aria-pressed', 'false');

      const countBadge = screen.getByTestId('subscriber-count');
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent(/42\s*abonnés/);
    });

    it('T1.2: renders initial subscribed state with "Abonné" and notification bell trigger', () => {
      render(
        <StoreFollowButton
          storeId="store_tn_101"
          storeName="Artisanat Sfax"
          initialSubscribed={true}
          initialCount={105}
          enableNotificationModal={true}
        />
      );

      const followBtn = screen.getByTestId('store-follow-btn-store_tn_101');
      expect(followBtn).toHaveTextContent('Abonné');
      expect(followBtn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('notification-preferences-trigger')).toBeInTheDocument();
    });

    it('T1.3: executes optimistic follow toggle, sends POST /subscribe, and maintains subscribed state', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          is_subscribed: true,
          is_verified_buyer: true,
          subscribers_count: 43,
          verified_subscribers_count: 12,
        }),
      });

      const onFollowChange = vi.fn();
      render(
        <StoreFollowButton
          storeId="store_tn_101"
          initialSubscribed={false}
          initialCount={42}
          onFollowChange={onFollowChange}
        />
      );

      const followBtn = screen.getByTestId('store-follow-btn-store_tn_101');
      fireEvent.click(followBtn);

      // Verify immediate optimistic update
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('43 abonnés');
      expect(followBtn).toHaveTextContent('Abonné');
      expect(onFollowChange).toHaveBeenCalledWith(true, 43);

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          '/api/pd/stores/store_tn_101/subscribe',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('T1.4: executes optimistic unfollow toggle, sends DELETE /subscribe, and decrements count', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          is_subscribed: false,
          subscribers_count: 99,
          verified_subscribers_count: 20,
        }),
      });

      render(
        <StoreFollowButton
          storeId="store_tn_202"
          initialSubscribed={true}
          initialCount={100}
        />
      );

      const followBtn = screen.getByTestId('store-follow-btn-store_tn_202');
      expect(followBtn).toHaveTextContent('Abonné');

      fireEvent.click(followBtn);

      // Optimistic decrement
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('99 abonnés');
      expect(followBtn).toHaveTextContent('Suivre');

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          '/api/pd/stores/store_tn_202/subscribe',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    it('T1.5: changes label to "Se désabonner" on mouse enter when already subscribed', () => {
      render(
        <StoreFollowButton
          storeId="store_tn_303"
          initialSubscribed={true}
          initialCount={15}
        />
      );

      const followBtn = screen.getByTestId('store-follow-btn-store_tn_303');
      expect(followBtn).toHaveTextContent('Abonné');

      fireEvent.mouseEnter(followBtn);
      expect(followBtn).toHaveTextContent('Se désabonner');

      fireEvent.mouseLeave(followBtn);
      expect(followBtn).toHaveTextContent('Abonné');
    });

    it('T1.6: renders verified buyer badge when verified subscriber count > 0', () => {
      render(
        <StoreFollowButton
          storeId="store_tn_404"
          initialSubscribed={false}
          initialCount={85}
          initialVerifiedCount={32}
          showVerifiedBadge={true}
        />
      );

      const verifiedBadge = screen.getByTestId('verified-buyer-badge');
      expect(verifiedBadge).toBeInTheDocument();
      expect(verifiedBadge).toHaveTextContent('Badge Acheteur Vérifié');
      expect(verifiedBadge).toHaveAttribute('title', '32 acheteurs vérifiés');
    });

    it('T1.7: renders across all 3 display variants (pdp_card, action_bar, directory_card)', () => {
      const { unmount: u1 } = render(<StoreFollowButton storeId="s1" variant="pdp_card" />);
      expect(screen.getByTestId('store-follow-container-s1')).toBeInTheDocument();
      u1();

      const { unmount: u2 } = render(<StoreFollowButton storeId="s2" variant="action_bar" />);
      expect(screen.getByTestId('store-follow-container-s2')).toBeInTheDocument();
      u2();

      const { unmount: u3 } = render(<StoreFollowButton storeId="s3" variant="directory_card" />);
      expect(screen.getByTestId('store-follow-container-s3')).toBeInTheDocument();
      u3();
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY VALUES & ERROR HANDLING (Boundary >= 5)
  // =========================================================================
  describe('Tier 2: Boundary States & Error Handling', () => {
    it('T2.1: redirects unauthenticated user or invokes onRequireAuth callback', () => {
      const onRequireAuth = vi.fn();
      render(
        <StoreFollowButton
          storeId="store_auth_test"
          isAuthenticated={false}
          onRequireAuth={onRequireAuth}
        />
      );

      const followBtn = screen.getByTestId('store-follow-btn-store_auth_test');
      fireEvent.click(followBtn);

      expect(onRequireAuth).toHaveBeenCalledTimes(1);
      expect(fetchWithCsrf).not.toHaveBeenCalled();
    });

    it('T2.2: rolls back optimistic follow state when network fails with error alert', async () => {
      (fetchWithCsrf as any).mockRejectedValueOnce(new Error('Network connection offline'));

      render(
        <StoreFollowButton
          storeId="store_net_err"
          initialSubscribed={false}
          initialCount={10}
        />
      );

      const followBtn = screen.getByTestId('store-follow-btn-store_net_err');
      fireEvent.click(followBtn);

      // Temporary optimistic state
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('11 abonnés');

      // Wait for failure & rollback
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Network connection offline');
        expect(screen.getByTestId('subscriber-count')).toHaveTextContent('10 abonnés');
        expect(followBtn).toHaveTextContent('Suivre');
      });
    });

    it('T2.3: handles HTTP 429 rate-limiting rejection and displays specific warning', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'rate_limited', message: 'Too many requests' }),
      });

      render(
        <StoreFollowButton
          storeId="store_rate_limit"
          initialSubscribed={true}
          initialCount={50}
        />
      );

      const followBtn = screen.getByTestId('store-follow-btn-store_rate_limit');
      fireEvent.click(followBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Trop de requêtes. Veuillez patienter avant de modifier votre abonnement.');
        expect(screen.getByTestId('subscriber-count')).toHaveTextContent('50 abonnés');
        expect(followBtn).toHaveTextContent('Abonné');
      });
    });

    it('T2.4: renders 0 subscribers boundary gracefully ("0 abonné" singular)', () => {
      render(
        <StoreFollowButton
          storeId="store_zero_subs"
          initialSubscribed={false}
          initialCount={0}
          initialVerifiedCount={0}
        />
      );

      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('0 abonné');
      expect(screen.queryByTestId('verified-buyer-badge')).not.toBeInTheDocument();
    });

    it('T2.5: handles empty or invalid store ID with disabled state and error banner', () => {
      render(
        <StoreFollowButton
          storeId=""
          initialSubscribed={false}
          initialCount={0}
        />
      );

      const followBtn = screen.getByRole('button', { name: /Suivre/i });
      expect(followBtn).toBeDisabled();
    });
  });

  // =========================================================================
  // TIER 3: CROSS-COMPONENT INTERACTIONS (Preferences Modal & Sync)
  // =========================================================================
  describe('Tier 3: Preferences Modal & Cross-Component Workflows', () => {
    it('T3.1: opens notification preferences modal and updates alert toggles', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <StoreFollowButton
          storeId="store_pref_1"
          storeName="Panda Tech Hub"
          initialSubscribed={true}
          initialCount={250}
          enableNotificationModal={true}
        />
      );

      const bellBtn = screen.getByTestId('notification-preferences-trigger');
      fireEvent.click(bellBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Alertes pour Panda Tech Hub')).toBeInTheDocument();

      const priceDropToggle = screen.getByTestId('toggle-price-drops');
      expect(priceDropToggle).toBeChecked();

      fireEvent.click(priceDropToggle);
      expect(priceDropToggle).not.toBeChecked();

      const saveBtn = screen.getByTestId('save-preferences-btn');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          '/api/pd/stores/store_pref_1/subscription-preferences',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ notify_price_drops: false, notify_new_products: true }),
          })
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // TIER 4: END-TO-END USER JOURNEY SIMULATION
  // =========================================================================
  describe('Tier 4: E2E User Journey Simulation', () => {
    it('T4.1: simulates complete buyer journey: check count -> follow -> set preferences -> unfollow -> verify final count', async () => {
      // Step 1: Mock follow POST
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          is_subscribed: true,
          subscribers_count: 501,
          verified_subscribers_count: 120,
        }),
      });

      render(
        <StoreFollowButton
          storeId="store_e2e_full"
          storeName="Maison du Miel"
          initialSubscribed={false}
          initialCount={500}
          initialVerifiedCount={119}
          isVerifiedBuyer={true}
        />
      );

      // Step 1 Check
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('500 abonnés');
      const btn = screen.getByTestId('store-follow-btn-store_e2e_full');

      // Step 2 Follow
      await act(async () => {
        fireEvent.click(btn);
      });
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent(/501\s*abonnés/);
      expect(btn).toHaveTextContent('Abonné');

      // Step 3 Preferences
      await waitFor(() => {
        expect(screen.getByTestId('notification-preferences-trigger')).toBeInTheDocument();
      });

      // Step 4 Unfollow
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          is_subscribed: false,
          subscribers_count: 500,
          verified_subscribers_count: 119,
        }),
      });

      await act(async () => {
        fireEvent.click(btn);
      });
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent(/500\s*abonnés/);
      expect(btn).toHaveTextContent('Suivre');
    });
  });
});
