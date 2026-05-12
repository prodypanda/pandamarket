'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useSocketContext } from '../../contexts/SocketContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(0);
  const [hasNewRealtime, setHasNewRealtime] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // WebSocket integration — live push notifications
  let socketConnected = false;
  let socketOn: ((event: string, handler: (payload: unknown) => void) => () => void) | null = null;
  let resetRealtimeCount: (() => void) | null = null;
  try {
    const ctx = useSocketContext();
    socketConnected = ctx.isConnected;
    socketOn = ctx.on;
    resetRealtimeCount = ctx.resetRealtimeCount;
  } catch {
    // SocketProvider not available — fallback to polling only
  }

  // Set initial timestamp on mount
  useEffect(() => {
    setNow(Date.now());
  }, []);

  /**
   * When WebSocket is connected, listen for real-time notification events.
   * This replaces the 30s polling with instant push when WS is available.
   * Falls back to polling if WS is unavailable (per notifications-system.md §5.2).
   */
  useEffect(() => {
    if (!socketOn || !socketConnected) return;

    const unsubscribe = socketOn('notification', () => {
      // Increment unread count immediately without a full API call
      setUnreadCount((prev) => prev + 1);
      setHasNewRealtime(true);
      // If dropdown is open, refresh the list
      if (isOpen) {
        fetchNotifications();
      }
    });

    return unsubscribe;
  }, [socketOn, socketConnected, isOpen]);

  // Fetch unread count on mount and periodically (fallback when WS unavailable)
  const fetchUnreadCountCb = useCallback(fetchUnreadCount, []);
  useEffect(() => {
    fetchUnreadCountCb();
    // Use longer polling interval when WebSocket is connected (just a safety net)
    const interval = socketConnected ? 120_000 : 30_000;
    const timer = setInterval(fetchUnreadCountCb, interval);
    return () => clearInterval(timer);
  }, [fetchUnreadCountCb, socketConnected]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchUnreadCount() {
    try {
      const res = await fetch('/api/pd/notifications/unread-count', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch {
      // silently fail
    }
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch('/api/pd/notifications?limit=10', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetchWithCsrf(`/api/pd/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  }

  async function markAllAsRead() {
    try {
      await fetchWithCsrf('/api/pd/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  }

  function toggleDropdown() {
    if (!isOpen) {
      fetchNotifications();
      // Reset the real-time counter when opening the dropdown
      if (resetRealtimeCount) resetRealtimeCount();
    }
    setIsOpen(!isOpen);
  }

  // Update the "now" timestamp when dropdown opens or notifications change
  useEffect(() => {
    if (isOpen) {
      setNow(Date.now());
      const timer = setInterval(() => setNow(Date.now()), 60_000);
      return () => clearInterval(timer);
    }
  }, [isOpen, notifications]);

  function timeAgo(dateStr: string): string {
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'à l\'instant';
    if (minutes < 60) return `il y a ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-150 ${
          hasNewRealtime ? 'animate-[ring_0.5s_ease-in-out]' : ''
        }`}
        aria-label="Notifications"
        onAnimationEnd={() => setHasNewRealtime(false)}
      >
        <Bell className="w-5 h-5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ${
            hasNewRealtime ? 'animate-pulse' : ''
          }`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {/* WebSocket connection indicator (subtle dot) */}
        <span
          className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
            socketConnected ? 'bg-[#16C784]' : 'bg-gray-300'
          }`}
          title={socketConnected ? 'Temps réel actif' : 'Mode polling'}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-[#16C784] hover:text-[#14b576] font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-400">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                Aucune notification
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notif.is_read ? 'bg-[#16C784]/5' : ''
                  }`}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${!notif.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="w-2 h-2 bg-[#16C784] rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-[#16C784] hover:text-[#14b576] font-medium"
              >
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
