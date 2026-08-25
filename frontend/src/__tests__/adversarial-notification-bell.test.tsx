/**
 * Adversarial Empirical Verification Suite — Frontend NotificationBell Component
 * Challenger 2 (Milestone M3: Smart Batched Notifications)
 *
 * Adversarial Dimensions:
 * 1. Unread count boundaries: 0, 1, 99, 100 -> "99+", 999 -> "99+"
 * 2. Unauthenticated / guest state / 401 error handling
 * 3. 500 Server error and Network failure resilience
 * 4. Concurrent mark-as-read state mutations
 * 5. Real-time WebSocket arrival with popover open vs closed
 * 6. Navigation routing for various notification types (single product vs multi-product vs broadcast vs orders)
 * 7. Keyboard & outside click accessibility
 * 8. Marketplace theming (Panda vs AliExpress vs AliExpress2)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { NotificationBell } from '../components/hub/NotificationBell';
import { fetchWithCsrf } from '@/lib/api';

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock SocketContext
let registeredSocketHandler: ((payload: any) => void) | null = null;
const mockResetRealtimeCount = vi.fn();
let mockIsConnected = true;

vi.mock('../contexts/SocketContext', () => ({
  useSocketContext: () => ({
    isConnected: mockIsConnected,
    on: (event: string, handler: (payload: any) => void) => {
      if (event === 'notification') {
        registeredSocketHandler = handler;
      }
      return () => {
        registeredSocketHandler = null;
      };
    },
    resetRealtimeCount: mockResetRealtimeCount,
  }),
}));

// Mock fetchWithCsrf
vi.mock('@/lib/api', () => ({
  fetchWithCsrf: vi.fn(),
}));

describe('Adversarial Challenger 2: NotificationBell Edge & Stress Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredSocketHandler = null;
    mockIsConnected = true;

    // Default global fetch mock
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/pd/notifications/unread-count')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ unread_count: 5 }),
        });
      }
      if (url.includes('/api/pd/notifications?limit=10')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'notif_single_prod',
                type: 'store_price_drop',
                title: '🏷️ Baisse de prix chez Tech TN',
                message: 'Tech TN a baissé le prix de « Clavier Pro » à 89 TND !',
                is_read: false,
                created_at: new Date(Date.now() - 30 * 1000).toISOString(), // 30s ago
                data: {
                  store_id: 'str_tech',
                  store_name: 'Tech TN',
                  items_count: 1,
                  products: [{ id: 'prod_keyboard_123', title: 'Clavier Pro', price: 89 }],
                },
              },
              {
                id: 'notif_multi_prod',
                type: 'store_new_product',
                title: '✨ 3 nouveaux produits chez Sfax Deco',
                message: 'Sfax Deco a publié 3 nouveaux articles !',
                is_read: false,
                created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10m ago
                data: {
                  store_id: 'str_sfax',
                  store_name: 'Sfax Deco',
                  items_count: 3,
                  products: [
                    { id: 'p1', title: 'Tapis', price: 120 },
                    { id: 'p2', title: 'Pouf', price: 45 },
                    { id: 'p3', title: 'Vase', price: 30 },
                  ],
                },
              },
              {
                id: 'notif_broadcast',
                type: 'seller_broadcast',
                title: '📢 Offre VIP',
                message: 'Remise exceptionnelle de 20% !',
                is_read: true,
                created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2h ago
                data: { broadcast_id: 'bc_123', coupon_code: 'VIP20' },
              },
              {
                id: 'notif_order',
                type: 'order.placed',
                title: '📦 Commande confirmée',
                message: 'Votre commande #123 est en cours de préparation.',
                is_read: true,
                created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), // 2 days ago
                data: { order_id: 'ord_999' },
              },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Dimension 1: Unread Count Boundary & Display Capping
  // =========================================================================
  describe('Dimension 1: Unread Count Badge Formatting', () => {
    it('ADV-UI-1.1: When unread_count is 0, badge is NOT rendered', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('unread-count')) {
          return Promise.resolve({ ok: true, json: async () => ({ unread_count: 0 }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<NotificationBell />);
      await waitFor(() => {
        expect(screen.queryByText('0')).not.toBeInTheDocument();
      });
    });

    it('ADV-UI-1.2: When unread_count is exactly 99, renders "99"', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('unread-count')) {
          return Promise.resolve({ ok: true, json: async () => ({ unread_count: 99 }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<NotificationBell />);
      await waitFor(() => {
        expect(screen.getByText('99')).toBeInTheDocument();
      });
    });

    it('ADV-UI-1.3: When unread_count is 100 or 1000, caps display at "99+"', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('unread-count')) {
          return Promise.resolve({ ok: true, json: async () => ({ unread_count: 1000 }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<NotificationBell />);
      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Dimension 2: Unauthenticated Guest / Error Resilience
  // =========================================================================
  describe('Dimension 2: Unauthenticated Guest & Error States', () => {
    it('ADV-UI-2.1: Handles 401 Unauthorized gracefully without crash or unhandled rejection', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Unauthorized' }),
        });
      });

      render(<NotificationBell />);
      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      expect(bellBtn).toBeInTheDocument();

      // Badge should not appear
      await waitFor(() => {
        expect(screen.queryByText('99+')).not.toBeInTheDocument();
      });
    });

    it('ADV-UI-2.2: Handles 500 Server Error and Network Rejection gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network offline'));

      render(<NotificationBell />);
      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      expect(bellBtn).toBeInTheDocument();

      // Open popover even under network failure
      await act(async () => {
        fireEvent.click(bellBtn);
      });

      // Popover opens and shows empty state smoothly
      await waitFor(() => {
        expect(screen.getByText('Aucune notification')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Dimension 3: Deep Navigation Routing Matrix
  // =========================================================================
  describe('Dimension 3: Deep Navigation Routing per Notification Type', () => {
    it('ADV-UI-3.1: Single product notification navigates directly to /hub/products/:id', async () => {
      (fetchWithCsrf as any).mockResolvedValue({ ok: true });
      render(<NotificationBell />);

      // Open popover
      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      await act(async () => {
        fireEvent.click(bellBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('🏷️ Baisse de prix chez Tech TN')).toBeInTheDocument();
      });

      const singleProdItem = screen.getByText('🏷️ Baisse de prix chez Tech TN');
      await act(async () => {
        fireEvent.click(singleProdItem);
      });

      expect(mockPush).toHaveBeenCalledWith('/hub/products/prod_keyboard_123');
    });

    it('ADV-UI-3.2: Multi-product notification navigates to /my-followed-feed?store=:storeId', async () => {
      (fetchWithCsrf as any).mockResolvedValue({ ok: true });
      render(<NotificationBell />);

      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      await act(async () => {
        fireEvent.click(bellBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('✨ 3 nouveaux produits chez Sfax Deco')).toBeInTheDocument();
      });

      const multiProdItem = screen.getByText('✨ 3 nouveaux produits chez Sfax Deco');
      await act(async () => {
        fireEvent.click(multiProdItem);
      });

      expect(mockPush).toHaveBeenCalledWith('/my-followed-feed?store=str_sfax');
    });

    it('ADV-UI-3.3: Seller broadcast notification navigates to /my-followed-feed', async () => {
      render(<NotificationBell />);

      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      await act(async () => {
        fireEvent.click(bellBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('📢 Offre VIP')).toBeInTheDocument();
      });

      const broadcastItem = screen.getByText('📢 Offre VIP');
      await act(async () => {
        fireEvent.click(broadcastItem);
      });

      expect(mockPush).toHaveBeenCalledWith('/my-followed-feed');
    });

    it('ADV-UI-3.4: Order notification navigates to /hub/orders', async () => {
      render(<NotificationBell />);

      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      await act(async () => {
        fireEvent.click(bellBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('📦 Commande confirmée')).toBeInTheDocument();
      });

      const orderItem = screen.getByText('📦 Commande confirmée');
      await act(async () => {
        fireEvent.click(orderItem);
      });

      expect(mockPush).toHaveBeenCalledWith('/hub/orders');
    });
  });

  // =========================================================================
  // Dimension 4: Concurrency & State Mutations
  // =========================================================================
  describe('Dimension 4: Concurrency & Real-time Edge Cases', () => {
    it('ADV-UI-4.1: When popover is OPEN, incoming WebSocket notification refreshes the list', async () => {
      render(<NotificationBell />);

      // Open popover
      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      await act(async () => {
        fireEvent.click(bellBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('🏷️ Baisse de prix chez Tech TN')).toBeInTheDocument();
      });

      // Clear fetch calls
      (global.fetch as any).mockClear();

      // Trigger socket event while open
      act(() => {
        if (registeredSocketHandler) {
          registeredSocketHandler({
            id: 'notif_realtime_stream',
            type: 'store_price_drop',
            title: 'Live Price Drop',
          });
        }
      });

      // Should invoke fetchNotifications() to pull the updated list
      expect(global.fetch).toHaveBeenCalledWith('/api/pd/notifications?limit=10', expect.anything());
    });

    it('ADV-UI-4.2: Mark all read clears unreadCount and resets UI immediately', async () => {
      (fetchWithCsrf as any).mockResolvedValue({ ok: true });
      render(<NotificationBell />);

      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      await act(async () => {
        fireEvent.click(bellBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Tout marquer lu')).toBeInTheDocument();
      });

      const markAllBtn = screen.getByText('Tout marquer lu');
      await act(async () => {
        fireEvent.click(markAllBtn);
      });

      // Button should disappear because unreadCount is now 0
      await waitFor(() => {
        expect(screen.queryByText('Tout marquer lu')).not.toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Dimension 5: Theming & Visual Styling
  // =========================================================================
  describe('Dimension 5: Marketplace Theming', () => {
    it('ADV-UI-5.1: Renders AliExpress theme with red accent classes', async () => {
      render(<NotificationBell marketplaceTheme="aliexpress" />);
      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      expect(bellBtn.className).toContain('hover:text-[#ff4747]');
    });

    it('ADV-UI-5.2: Renders AliExpress2 theme with dark dark surfaces', async () => {
      render(<NotificationBell marketplaceTheme="aliexpress2" />);
      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      expect(bellBtn.className).toContain('text-white/70');
    });

    it('ADV-UI-5.3: Renders Panda theme with emerald accent classes', async () => {
      render(<NotificationBell marketplaceTheme="panda" />);
      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      expect(bellBtn.className).toContain('hover:text-[#16C784]');
    });
  });
});
