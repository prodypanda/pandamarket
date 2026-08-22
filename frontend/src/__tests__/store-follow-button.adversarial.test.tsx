/**
 * Store Follow Button & Subscriber Badges - Adversarial Challenge & Stress Test Suite
 *
 * Challenger: Challenger 2 (UI & Edge Cases)
 * Milestone: M2 - Store Follow Button & Integrations
 *
 * Target Dimensions:
 * 1. Rapid multi-clicks (debouncing, loading state, disabled button, in-flight spinner, duplicate prevention)
 * 2. Network failure simulation & rollback (optimistic updates roll back on 500, network error, malformed response)
 * 3. HTTP 429 rate limit error handling & user-friendly alert display
 * 4. Unauthenticated click handling (onRequireAuth callback vs window.location.href = '/login')
 * 5. Verified buyer badge gating (verifiedCount > 0, showVerifiedBadge flag, dynamic increment/decrement based on isVerifiedBuyer)
 * 6. Preferences modal lifecycle (modal visibility gating, toggle interaction, cancel dismissal vs save PUT dispatch, error handling)
 * 7. Boundary conditions & Prop synchronizations (0 subscriber floor, props sync on rerender, invalid storeId)
 * 8. Accessibility & Variants (aria attributes, role="alert", role="dialog", size & layout variants)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor, act } from '@testing-library/react';
import { fetchWithCsrf } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  fetchWithCsrf: vi.fn(),
}));

import { StoreFollowButton } from '../components/store/StoreFollowButton';

describe('Adversarial UI Stress Tests: StoreFollowButton (Milestone M2)', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // restore location if modified
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  // =========================================================================
  // 1. RAPID MULTI-CLICKS & DEBOUNCING / LOADING STATE
  // =========================================================================
  describe('1. Rapid Multi-Clicks & In-Flight Concurrency Resilience', () => {
    it('prevents multiple API dispatches when rapidly clicked in loading state', async () => {
      let resolvePromise: (val: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (fetchWithCsrf as any).mockReturnValueOnce(delayedPromise);

      render(
        <StoreFollowButton
          storeId="store_rapid_1"
          storeName="Boutique Rapid"
          initialSubscribed={false}
          initialCount={10}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_rapid_1');
      expect(btn).not.toBeDisabled();

      // First click dispatches API request and enters loading state
      fireEvent.click(btn);

      // Verify button is immediately disabled and shows spinner
      expect(btn).toBeDisabled();
      expect(screen.getByTestId('follow-spinner')).toBeInTheDocument();
      expect(btn.className).toContain('cursor-wait');

      // Rapid consecutive clicks while request is in flight
      fireEvent.click(btn);
      fireEvent.click(btn);
      fireEvent.click(btn);

      // Verify fetchWithCsrf was only called ONCE
      expect(fetchWithCsrf).toHaveBeenCalledTimes(1);

      // Resolve the pending promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              is_subscribed: true,
              subscribers_count: 11,
              verified_subscribers_count: 0,
            }),
        });
      });

      // After resolution, spinner should disappear and button is enabled again
      await waitFor(() => {
        expect(btn).not.toBeDisabled();
        expect(screen.queryByTestId('follow-spinner')).not.toBeInTheDocument();
        expect(btn).toHaveTextContent('Abonné');
      });
    });

    it('does not double decrement on rapid unfollow clicks while in flight', async () => {
      let resolvePromise: (val: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (fetchWithCsrf as any).mockReturnValueOnce(delayedPromise);

      render(
        <StoreFollowButton
          storeId="store_rapid_2"
          initialSubscribed={true}
          initialCount={50}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_rapid_2');
      fireEvent.click(btn);

      // Optimistic decrement to 49
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('49 abonnés');
      expect(btn).toBeDisabled();

      // Attempt rapid clicks
      fireEvent.click(btn);
      fireEvent.click(btn);

      expect(fetchWithCsrf).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('49 abonnés');

      // Resolve
      await act(async () => {
        resolvePromise!({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              is_subscribed: false,
              subscribers_count: 49,
              verified_subscribers_count: 0,
            }),
        });
      });

      await waitFor(() => {
        expect(btn).not.toBeDisabled();
        expect(btn).toHaveTextContent('Suivre');
      });
    });
  });

  // =========================================================================
  // 2. NETWORK FAILURE SIMULATION & STATE ROLLBACK
  // =========================================================================
  describe('2. Network Failure & State Rollback', () => {
    it('rolls back follow status, subscriber count, and verified buyer count on network exception', async () => {
      (fetchWithCsrf as any).mockRejectedValueOnce(new TypeError('Failed to fetch (Network disconnected)'));

      const onFollowChange = vi.fn();
      render(
        <StoreFollowButton
          storeId="store_fail_1"
          initialSubscribed={false}
          initialCount={100}
          initialVerifiedCount={25}
          isVerifiedBuyer={true}
          onFollowChange={onFollowChange}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_fail_1');
      fireEvent.click(btn);

      // Check optimistic update happened first
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('101 abonnés');
      expect(screen.getByTestId('verified-buyer-badge')).toHaveAttribute('title', '26 acheteurs vérifiés');
      expect(onFollowChange).toHaveBeenCalledWith(true, 101);

      // Wait for catch block to roll back
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch (Network disconnected)');
        expect(screen.getByTestId('subscriber-count')).toHaveTextContent('100 abonnés');
        expect(screen.getByTestId('verified-buyer-badge')).toHaveAttribute('title', '25 acheteurs vérifiés');
        expect(btn).toHaveTextContent('Suivre');
        expect(onFollowChange).toHaveBeenLastCalledWith(false, 100);
      });
    });

    it('rolls back unfollow status when server returns HTTP 500 with custom error message', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal Database Lock Error' }),
      });

      render(
        <StoreFollowButton
          storeId="store_fail_2"
          initialSubscribed={true}
          initialCount={75}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_fail_2');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Internal Database Lock Error');
        expect(screen.getByTestId('subscriber-count')).toHaveTextContent('75 abonnés');
        expect(btn).toHaveTextContent('Abonné');
      });
    });

    it('rolls back state with fallback error message when server returns 502 Bad Gateway without JSON body', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      render(
        <StoreFollowButton
          storeId="store_fail_3"
          initialSubscribed={false}
          initialCount={5}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_fail_3');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Erreur serveur (502)');
        expect(screen.getByTestId('subscriber-count')).toHaveTextContent('5 abonnés');
        expect(btn).toHaveTextContent('Suivre');
      });
    });
  });

  // =========================================================================
  // 3. HTTP 429 RATE LIMIT ERROR HANDLING
  // =========================================================================
  describe('3. HTTP 429 Rate Limit Handling & Alert Banners', () => {
    it('catches HTTP 429 and displays French rate limit notification, rolling back count', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'rate_limited', message: 'Too many requests' }),
      });

      render(
        <StoreFollowButton
          storeId="store_rate_429"
          initialSubscribed={false}
          initialCount={12}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_rate_429');
      fireEvent.click(btn);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent('Trop de requêtes. Veuillez patienter avant de modifier votre abonnement.');
        expect(screen.getByTestId('subscriber-count')).toHaveTextContent('12 abonnés');
        expect(btn).toHaveTextContent('Suivre');
      });
    });

    it('clears previous rate limit error banner when a subsequent request succeeds', async () => {
      // 1st call: 429 rate limit
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'rate_limited' }),
      });

      render(
        <StoreFollowButton
          storeId="store_retry_success"
          initialSubscribed={false}
          initialCount={20}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_retry_success');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // 2nd call: successful 200
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, subscribers_count: 21 }),
      });

      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByTestId('subscriber-count')).toHaveTextContent('21 abonnés');
        expect(btn).toHaveTextContent('Abonné');
      });
    });
  });

  // =========================================================================
  // 4. UNAUTHENTICATED CLICK REDIRECT & CALLBACK
  // =========================================================================
  describe('4. Unauthenticated Click Handling', () => {
    it('triggers onRequireAuth callback without making network calls when unauthenticated', () => {
      const onRequireAuth = vi.fn();
      render(
        <StoreFollowButton
          storeId="store_unauth_1"
          isAuthenticated={false}
          onRequireAuth={onRequireAuth}
          initialCount={10}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_unauth_1');
      fireEvent.click(btn);

      expect(onRequireAuth).toHaveBeenCalledTimes(1);
      expect(fetchWithCsrf).not.toHaveBeenCalled();
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('10 abonnés');
    });

    it('redirects to /login when unauthenticated and onRequireAuth is not provided', () => {
      const locationMock = { href: 'http://localhost/products/123' };
      Object.defineProperty(window, 'location', {
        writable: true,
        value: locationMock,
      });

      render(
        <StoreFollowButton
          storeId="store_unauth_2"
          isAuthenticated={false}
          initialCount={5}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_unauth_2');
      fireEvent.click(btn);

      expect(window.location.href).toBe('/login');
      expect(fetchWithCsrf).not.toHaveBeenCalled();
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('5 abonnés');
    });
  });

  // =========================================================================
  // 5. VERIFIED BUYER BADGE RENDERING & GATING
  // =========================================================================
  describe('5. Verified Buyer Badge Gating & Anti-Bot Social Proof', () => {
    it('does NOT render verified buyer badge when initialVerifiedCount is 0', () => {
      render(
        <StoreFollowButton
          storeId="store_badge_0"
          initialCount={100}
          initialVerifiedCount={0}
          showVerifiedBadge={true}
        />
      );

      expect(screen.queryByTestId('verified-buyer-badge')).not.toBeInTheDocument();
    });

    it('does NOT render verified buyer badge when showVerifiedBadge is false even if verifiedCount > 0', () => {
      render(
        <StoreFollowButton
          storeId="store_badge_hidden"
          initialCount={100}
          initialVerifiedCount={45}
          showVerifiedBadge={false}
        />
      );

      expect(screen.queryByTestId('verified-buyer-badge')).not.toBeInTheDocument();
    });

    it('renders verified buyer badge with formatted count tooltip when verifiedCount > 0', () => {
      render(
        <StoreFollowButton
          storeId="store_badge_shown"
          initialCount={150}
          initialVerifiedCount={78}
          showVerifiedBadge={true}
        />
      );

      const badge = screen.getByTestId('verified-buyer-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('✓ Badge Acheteur Vérifié');
      expect(badge).toHaveAttribute('title', '78 acheteurs vérifiés');
    });

    it('does NOT increment verifiedCount when unverified buyer (isVerifiedBuyer=false) follows', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, subscribers_count: 51, verified_subscribers_count: 10 }),
      });

      render(
        <StoreFollowButton
          storeId="store_unverified_buyer"
          initialSubscribed={false}
          initialCount={50}
          initialVerifiedCount={10}
          isVerifiedBuyer={false}
          showVerifiedBadge={true}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_unverified_buyer');
      await act(async () => {
        fireEvent.click(btn);
      });

      // Total count increments to 51, verifiedCount remains 10
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('51 abonnés');
      const badge = screen.getByTestId('verified-buyer-badge');
      expect(badge).toHaveAttribute('title', '10 acheteurs vérifiés');
    });

    it('increments verifiedCount dynamically when verified buyer (isVerifiedBuyer=true) follows', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, subscribers_count: 51, verified_subscribers_count: 11 }),
      });

      render(
        <StoreFollowButton
          storeId="store_verified_buyer"
          initialSubscribed={false}
          initialCount={50}
          initialVerifiedCount={10}
          isVerifiedBuyer={true}
          showVerifiedBadge={true}
        />
      );

      const btn = screen.getByTestId('store-follow-btn-store_verified_buyer');
      await act(async () => {
        fireEvent.click(btn);
      });

      // Both counts increment
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('51 abonnés');
      const badge = screen.getByTestId('verified-buyer-badge');
      expect(badge).toHaveAttribute('title', '11 acheteurs vérifiés');
    });
  });

  // =========================================================================
  // 6. PREFERENCES MODAL LIFECYCLE & DISMISSAL
  // =========================================================================
  describe('6. Preferences Modal Lifecycle, Toggles & Dismissal', () => {
    it('hides notification preferences trigger when user is not subscribed', () => {
      render(
        <StoreFollowButton
          storeId="store_modal_1"
          initialSubscribed={false}
          enableNotificationModal={true}
        />
      );

      expect(screen.queryByTestId('notification-preferences-trigger')).not.toBeInTheDocument();
    });

    it('hides notification preferences trigger when enableNotificationModal is false even if subscribed', () => {
      render(
        <StoreFollowButton
          storeId="store_modal_2"
          initialSubscribed={true}
          enableNotificationModal={false}
        />
      );

      expect(screen.queryByTestId('notification-preferences-trigger')).not.toBeInTheDocument();
    });

    it('dismisses modal on "Annuler" click without calling preferences API', () => {
      render(
        <StoreFollowButton
          storeId="store_modal_cancel"
          storeName="Boutique Artisanale"
          initialSubscribed={true}
          enableNotificationModal={true}
        />
      );

      const trigger = screen.getByTestId('notification-preferences-trigger');
      fireEvent.click(trigger);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Alertes pour Boutique Artisanale')).toBeInTheDocument();

      // Click Annuler
      const cancelBtn = screen.getByRole('button', { name: 'Annuler' });
      fireEvent.click(cancelBtn);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(fetchWithCsrf).not.toHaveBeenCalled();
    });

    it('persists modified notification preferences when "Enregistrer" is clicked', async () => {
      (fetchWithCsrf as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      render(
        <StoreFollowButton
          storeId="store_modal_save"
          storeName="Tech Store Tunis"
          initialSubscribed={true}
          enableNotificationModal={true}
        />
      );

      fireEvent.click(screen.getByTestId('notification-preferences-trigger'));

      const priceDropsToggle = screen.getByTestId('toggle-price-drops');
      const newProductsToggle = screen.getByTestId('toggle-new-products');

      expect(priceDropsToggle).toBeChecked();
      expect(newProductsToggle).toBeChecked();

      // Uncheck new products
      fireEvent.click(newProductsToggle);
      expect(newProductsToggle).not.toBeChecked();

      // Save
      fireEvent.click(screen.getByTestId('save-preferences-btn'));

      await waitFor(() => {
        expect(fetchWithCsrf).toHaveBeenCalledWith(
          '/api/pd/stores/store_modal_save/subscription-preferences',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
              notify_price_drops: true,
              notify_new_products: false,
            }),
          })
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('displays error banner when saving preferences fails over network', async () => {
      (fetchWithCsrf as any).mockRejectedValueOnce(new Error('Preferences save failed'));

      render(
        <StoreFollowButton
          storeId="store_modal_fail"
          storeName="Tech Store Tunis"
          initialSubscribed={true}
          enableNotificationModal={true}
        />
      );

      fireEvent.click(screen.getByTestId('notification-preferences-trigger'));
      fireEvent.click(screen.getByTestId('save-preferences-btn'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Impossible d’enregistrer les préférences.');
      });
    });
  });

  // =========================================================================
  // 7. BOUNDARY VALUES & REACT PROP SYNCHRONIZATION
  // =========================================================================
  describe('7. Boundary Values & Dynamic Prop Synchronization', () => {
    it('removes unmounted subscriber listeners without affecting another store instance', () => {
      const first = render(
        <StoreFollowButton
          storeId="store_listener_1"
          initialCount={10}
        />
      );
      const second = render(
        <StoreFollowButton
          storeId="store_listener_2"
          initialCount={20}
        />
      );

      const firstCount = within(first.container).getByTestId('subscriber-count');
      const secondCount = within(second.container).getByTestId('subscriber-count');
      expect(firstCount).toHaveTextContent('10 abonnés');
      expect(secondCount).toHaveTextContent('20 abonnés');

      first.unmount();
      expect(screen.queryByTestId('store-follow-container-store_listener_1')).not.toBeInTheDocument();

      act(() => {
        window.dispatchEvent(
          new CustomEvent('store:subscribers_updated', {
            detail: { store_id: 'store_listener_1', subscribers_count: 99 },
          })
        );
      });
      expect(secondCount).toHaveTextContent('20 abonnés');

      act(() => {
        window.dispatchEvent(
          new CustomEvent('store:subscribers_updated', {
            detail: { store_id: 'store_listener_2', subscribers_count: 21 },
          })
        );
      });
      expect(secondCount).toHaveTextContent('21 abonnés');

      second.unmount();
      expect(screen.queryByTestId('store-follow-container-store_listener_2')).not.toBeInTheDocument();
    });

    it('synchronizes internal state when parent component updates initialCount / initialSubscribed props', () => {
      const { rerender } = render(
        <StoreFollowButton
          storeId="store_sync_1"
          initialSubscribed={false}
          initialCount={10}
          initialVerifiedCount={2}
        />
      );

      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('10 abonnés');
      expect(screen.getByTestId('store-follow-btn-store_sync_1')).toHaveTextContent('Suivre');

      // Parent updates props (e.g. from real-time WebSocket)
      rerender(
        <StoreFollowButton
          storeId="store_sync_1"
          initialSubscribed={true}
          initialCount={25}
          initialVerifiedCount={5}
        />
      );

      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('25 abonnés');
      expect(screen.getByTestId('store-follow-btn-store_sync_1')).toHaveTextContent('Abonné');
      expect(screen.getByTestId('verified-buyer-badge')).toHaveAttribute('title', '5 acheteurs vérifiés');
    });

    it('formats singular "0 abonné" and "1 abonné" correctly in French', () => {
      const { rerender } = render(
        <StoreFollowButton storeId="s_sing_0" initialCount={0} />
      );
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('0 abonné');

      rerender(<StoreFollowButton storeId="s_sing_1" initialCount={1} />);
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('1 abonné');

      rerender(<StoreFollowButton storeId="s_plur_2" initialCount={2} />);
      expect(screen.getByTestId('subscriber-count')).toHaveTextContent('2 abonnés');
    });

    it('disables button when storeId is empty string ("")', () => {
      render(<StoreFollowButton storeId="" />);
      const btn = screen.getByRole('button', { name: /Suivre/i });
      expect(btn).toBeDisabled();
    });

    it('displays error banner and aborts request when storeId is whitespace ("   ")', async () => {
      render(<StoreFollowButton storeId="   " />);
      const btn = screen.getByRole('button', { name: /Suivre/i });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Identifiant boutique invalide.');
        expect(fetchWithCsrf).not.toHaveBeenCalled();
      });
    });

    it('hides subscriber count when showCount is set to false', () => {
      render(
        <StoreFollowButton
          storeId="store_no_count"
          initialCount={50}
          showCount={false}
        />
      );

      expect(screen.queryByTestId('subscriber-count')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 8. ACCESSIBILITY & DISPLAY VARIANTS
  // =========================================================================
  describe('8. Accessibility & Display Variants', () => {
    it('sets correct ARIA attributes on follow toggle button', () => {
      const { rerender } = render(
        <StoreFollowButton storeId="store_aria_1" initialSubscribed={false} />
      );

      const btn = screen.getByTestId('store-follow-btn-store_aria_1');
      expect(btn).toHaveAttribute('aria-pressed', 'false');
      expect(btn).toHaveAttribute('aria-label', 'Suivre');

      rerender(<StoreFollowButton storeId="store_aria_1" initialSubscribed={true} />);
      expect(btn).toHaveAttribute('aria-pressed', 'true');
      expect(btn).toHaveAttribute('aria-label', 'Abonné');

      fireEvent.mouseEnter(btn);
      expect(btn).toHaveAttribute('aria-label', 'Se désabonner');
    });

    it('applies correct styling classes across small, medium, and large sizes', () => {
      const first = render(<StoreFollowButton storeId="s_sm" size="sm" />);
      expect(within(first.container).getByTestId('store-follow-btn-s_sm').className).toContain('px-2.5 py-1 text-xs');
      first.unmount();
      expect(screen.queryByTestId('store-follow-container-s_sm')).not.toBeInTheDocument();

      const second = render(<StoreFollowButton storeId="s_md" size="md" />);
      expect(within(second.container).getByTestId('store-follow-btn-s_md').className).toContain('px-4 py-2 text-sm');
      second.unmount();
      expect(screen.queryByTestId('store-follow-container-s_md')).not.toBeInTheDocument();

      const third = render(<StoreFollowButton storeId="s_lg" size="lg" />);
      expect(within(third.container).getByTestId('store-follow-btn-s_lg').className).toContain('px-6 py-3 text-base');
      third.unmount();
      expect(screen.queryByTestId('store-follow-container-s_lg')).not.toBeInTheDocument();
    });
  });
});
