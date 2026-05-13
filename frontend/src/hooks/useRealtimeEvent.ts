/**
 * frontend/src/hooks/useRealtimeEvent.ts
 *
 * Convenience hook for subscribing to specific real-time events
 * in dashboard/admin pages. Automatically handles cleanup.
 *
 * Usage:
 *   useRealtimeEvent('new_order', (payload) => {
 *     // Handle new order in vendor dashboard
 *     refreshOrders();
 *   });
 */

'use client';

import { useEffect, useRef } from 'react';
import { useSocketContext } from '../contexts/SocketContext';
import type { PdSocketEvent } from './useSocket';

/**
 * Subscribe to a real-time WebSocket event.
 * The handler is automatically cleaned up on unmount or when dependencies change.
 *
 * @param event - The event name to listen for
 * @param handler - Callback invoked when the event fires
 * @param deps - Additional dependencies that should trigger re-subscription
 */
export function useRealtimeEvent(
  event: PdSocketEvent | string,
  handler: (payload: unknown) => void,
  deps: unknown[] = [],
): void {
  const { on, isConnected } = useSocketContext();
  const handlerRef = useRef(handler);

  // Keep handler ref up to date without re-subscribing
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = on(event, (payload: unknown) => {
      handlerRef.current(payload);
    });

    return unsubscribe;
  }, [event, isConnected, on, ...deps]);
}
