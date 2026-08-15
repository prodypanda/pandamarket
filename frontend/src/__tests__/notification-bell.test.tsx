/**
 * NotificationBell Unit & Integration Test Suite — Milestone M3 (Feature 20 R2)
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
let mockSocketOn: ((event: string, handler: (payload: any) => void) => () => void) | null = null;
let registeredSocketHandler: ((payload: any) => void) | null = null;
let mockResetRealtimeCount = vi.fn();

vi.mock('../contexts/SocketContext', () => ({
  useSocketContext: () => ({
    isConnected: true,
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

describe('Milestone M3: NotificationBell Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredSocketHandler = null;

    // Default global fetch mock
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/pd/notifications/unread-count')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ unread_count: 3 }),
        });
      }
      if (url.includes('/api/pd/notifications?limit=10')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'notif_1',
                type: 'store_price_drop',
                title: '🏷️ 3 baisses de prix chez Tech TN',
                message: 'Tech TN a baissé le prix de 3 articles !',
                is_read: false,
                created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                data: { store_id: 'str_tech', store_name: 'Tech TN', items_count: 3 },
              },
              {
                id: 'notif_2',
                type: 'store_new_product',
                title: '✨ 2 nouveaux produits chez Artisanat Sfax',
                message: 'Artisanat Sfax a publié 2 nouveaux articles !',
                is_read: true,
                created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                data: { store_id: 'str_artisanat', store_name: 'Artisanat Sfax', items_count: 2 },
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('T1: renders the bell button and loads unread count badge', async () => {
    render(<NotificationBell />);

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    expect(bellBtn).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('T2: caps unread badge at 99+ when unreadCount exceeds 99', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/pd/notifications/unread-count')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ unread_count: 142 }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  it('T3: opens popover dropdown and lists notifications on click', async () => {
    render(<NotificationBell />);

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    await act(async () => {
      fireEvent.click(bellBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('🏷️ 3 baisses de prix chez Tech TN')).toBeInTheDocument();
      expect(screen.getByText('✨ 2 nouveaux produits chez Artisanat Sfax')).toBeInTheDocument();
    });
  });

  it('T4: marks single unread notification as read on click and navigates', async () => {
    (fetchWithCsrf as any).mockResolvedValue({ ok: true });

    render(<NotificationBell />);

    // Open dropdown
    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    await act(async () => {
      fireEvent.click(bellBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('🏷️ 3 baisses de prix chez Tech TN')).toBeInTheDocument();
    });

    // Click on unread item
    const unreadItem = screen.getByText('🏷️ 3 baisses de prix chez Tech TN');
    await act(async () => {
      fireEvent.click(unreadItem);
    });

    expect(fetchWithCsrf).toHaveBeenCalledWith('/api/pd/notifications/notif_1/read', expect.objectContaining({
      method: 'PATCH',
    }));
    expect(mockPush).toHaveBeenCalledWith('/my-followed-feed?store=str_tech');
  });

  it('T5: marks all notifications as read when clicking "Tout marquer lu"', async () => {
    (fetchWithCsrf as any).mockResolvedValue({ ok: true });

    render(<NotificationBell />);

    // Open dropdown
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

    expect(fetchWithCsrf).toHaveBeenCalledWith('/api/pd/notifications/read-all', expect.objectContaining({
      method: 'PATCH',
    }));
  });

  it('T6: increments unread count in real-time when WebSocket "notification" event arrives', async () => {
    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    expect(registeredSocketHandler).toBeDefined();

    // Trigger simulated socket event
    act(() => {
      if (registeredSocketHandler) {
        registeredSocketHandler({
          id: 'notif_realtime',
          type: 'store_price_drop',
          title: 'New Price Drop',
          message: 'Price dropped on screen',
        });
      }
    });

    // Unread count should increment from 3 to 4
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  it('T7: closes popover when pressing Escape key', async () => {
    render(<NotificationBell />);

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('🏷️ 3 baisses de prix chez Tech TN')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('🏷️ 3 baisses de prix chez Tech TN')).not.toBeInTheDocument();
    });
  });
});
