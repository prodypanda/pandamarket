/**
 * frontend/src/hooks/useSocket.ts
 *
 * Production-grade Socket.IO hook for PandaMarket real-time notifications.
 * Connects to the backend WebSocket gateway with JWT auth, exponential backoff
 * reconnection, and automatic channel subscription based on user role.
 *
 * Channels (per notifications-system.md §5):
 *   - `user:{user_id}`   → All users (notification bell live updates)
 *   - `store:{store_id}` → Vendor dashboard (new_order, payment_received, ai_job_done, stock_alert)
 *   - `admin`            → Admin panel (kyc_pending, mandat_pending, new_report)
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/** Events emitted by the backend socketGateway */
export type PdSocketEvent =
  | 'new_order'
  | 'payment_received'
  | 'ai_job_done'
  | 'stock_alert'
  | 'kyc_pending'
  | 'mandat_pending'
  | 'new_report'
  | 'notification';

export interface UseSocketOptions {
  /** JWT access token for authentication */
  token: string | null;
  /** Whether to enable the connection (e.g., only when user is logged in) */
  enabled?: boolean;
}

export interface UseSocketReturn {
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Subscribe to a specific event. Returns an unsubscribe function. */
  on: (event: PdSocketEvent | string, handler: (payload: unknown) => void) => () => void;
  /** The raw socket instance (use sparingly) */
  socket: Socket | null;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:9000';

/**
 * Maximum reconnection attempts before giving up.
 * After this, falls back to polling (handled by NotificationBell's existing 30s interval).
 */
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Base delay for exponential backoff (ms).
 * Actual delay = BASE * 2^attempt, capped at 30s.
 */
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30_000;

export function useSocket({ token, enabled = true }: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !token) {
      // Disconnect if we were connected but conditions changed
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      setSocket(null);
      return;
    }

    // Prevent duplicate connections
    if (socketRef.current?.connected) return;

    const socket = io(BACKEND_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_BASE_DELAY_MS,
      reconnectionDelayMax: RECONNECT_MAX_DELAY_MS,
      timeout: 10_000,
      withCredentials: true,
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      // If the server forcefully disconnected us, don't auto-reconnect
      // (likely an auth issue — token expired)
      if (reason === 'io server disconnect') {
        socket.disconnect();
      }
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      // Socket.IO handles reconnection automatically with backoff
    });

    socketRef.current = socket;
    setSocket(socket);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [token, enabled]);

  const on = useCallback(
    (event: PdSocketEvent | string, handler: (payload: unknown) => void): (() => void) => {
      const socket = socketRef.current;
      if (!socket) {
        // Return a no-op unsubscribe if socket isn't ready
        return () => {};
      }
      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    },
    [],
  );

  return {
    isConnected,
    on,
    socket,
  };
}
