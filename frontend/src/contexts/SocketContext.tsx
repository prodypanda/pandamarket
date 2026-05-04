/**
 * frontend/src/contexts/SocketContext.tsx
 *
 * Global Socket.IO context provider for PandaMarket.
 * Wraps the useSocket hook and provides real-time event subscription
 * to all child components (NotificationBell, dashboard pages, admin panel).
 *
 * Per notifications-system.md §5:
 *   - Vendor dashboard subscribes to `store:{store_id}` events
 *   - Admin panel subscribes to `admin` events
 *   - All users subscribe to `user:{user_id}` events via `notification` event
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSocket, type PdSocketEvent } from '../hooks/useSocket';

interface SocketContextValue {
  /** Whether the WebSocket is currently connected */
  isConnected: boolean;
  /** Subscribe to a real-time event. Returns unsubscribe function. */
  on: (event: PdSocketEvent | string, handler: (payload: unknown) => void) => () => void;
  /** Set the JWT token for authentication */
  setToken: (token: string | null) => void;
  /** Number of new real-time notifications received since last check */
  realtimeNotificationCount: number;
  /** Reset the real-time notification counter (e.g., when bell is opened) */
  resetRealtimeCount: () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [realtimeNotificationCount, setRealtimeNotificationCount] = useState(0);
  const listenersAttached = useRef(false);

  // Try to get token from cookie or localStorage on mount
  useEffect(() => {
    // Check for token in localStorage (set by auth flow)
    const storedToken = typeof window !== 'undefined'
      ? localStorage.getItem('pd_access_token')
      : null;
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const { isConnected, on, socket } = useSocket({
    token,
    enabled: !!token,
  });

  // Listen for the generic `notification` event to increment the counter
  useEffect(() => {
    if (!socket || !isConnected || listenersAttached.current) return;

    const handleNotification = () => {
      setRealtimeNotificationCount((prev) => prev + 1);
    };

    socket.on('notification', handleNotification);
    // Also listen for store-specific events that create notifications
    socket.on('new_order', handleNotification);
    socket.on('payment_received', handleNotification);
    socket.on('ai_job_done', handleNotification);
    socket.on('stock_alert', handleNotification);
    socket.on('kyc_pending', handleNotification);
    socket.on('mandat_pending', handleNotification);
    socket.on('new_report', handleNotification);

    listenersAttached.current = true;

    return () => {
      socket.off('notification', handleNotification);
      socket.off('new_order', handleNotification);
      socket.off('payment_received', handleNotification);
      socket.off('ai_job_done', handleNotification);
      socket.off('stock_alert', handleNotification);
      socket.off('kyc_pending', handleNotification);
      socket.off('mandat_pending', handleNotification);
      socket.off('new_report', handleNotification);
      listenersAttached.current = false;
    };
  }, [socket, isConnected]);

  const resetRealtimeCount = useCallback(() => {
    setRealtimeNotificationCount(0);
  }, []);

  const value: SocketContextValue = {
    isConnected,
    on,
    setToken,
    realtimeNotificationCount,
    resetRealtimeCount,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook to access the Socket.IO context.
 * Must be used within a SocketProvider.
 */
export function useSocketContext(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
