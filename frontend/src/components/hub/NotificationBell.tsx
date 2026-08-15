'use client';

import { fetchWithCsrf } from '@/lib/api';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Tag,
  Sparkles,
  Megaphone,
  ShoppingBag,
  Info,
  Mail,
} from 'lucide-react';
import { useSocketContext } from '../../contexts/SocketContext';

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: {
    store_id?: string;
    store_name?: string;
    items_count?: number;
    products?: Array<{
      id: string;
      title: string;
      price: number;
      old_price?: number;
    }>;
    broadcast_id?: string;
    coupon_code?: string;
    discount_value?: string | number;
    discount_type?: string;
    order_id?: string;
    [key: string]: unknown;
  };
}

export interface NotificationBellProps {
  marketplaceTheme?: 'panda' | 'aliexpress' | 'aliexpress2';
  className?: string;
}

export function NotificationBell({ marketplaceTheme = 'panda', className = '' }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(0);
  const [hasNewRealtime, setHasNewRealtime] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAliExpress = marketplaceTheme === 'aliexpress' || marketplaceTheme === 'aliexpress2';
  const isAliExpress2 = marketplaceTheme === 'aliexpress2';

  const accentColor = isAliExpress ? '#ff4747' : '#16C784';
  const accentBgLight = isAliExpress ? 'bg-[#ff4747]/10 text-[#ff4747]' : 'bg-[#16C784]/10 text-[#16C784]';

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
    // Use longer polling interval when WebSocket is connected (safety net)
    const interval = socketConnected ? 120_000 : 30_000;
    const timer = setInterval(fetchUnreadCountCb, interval);
    return () => clearInterval(timer);
  }, [fetchUnreadCountCb, socketConnected]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
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

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'store_price_drop':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Tag className="w-4 h-4" />
          </div>
        );
      case 'store_new_product':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      case 'seller_broadcast':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
        );
      case 'daily_digest':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4" />
          </div>
        );
      case 'new_order':
      case 'order.placed':
      case 'payment_captured':
        return (
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4" />
          </div>
        );
    }
  }

  function handleNotificationClick(notif: NotificationPayload) {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }

    setIsOpen(false);

    // Deep navigation destination
    if (notif.data?.products && notif.data.products.length === 1 && notif.data.products[0].id) {
      router.push(`/hub/products/${notif.data.products[0].id}`);
    } else if (notif.data?.store_id) {
      router.push(`/my-followed-feed?store=${notif.data.store_id}`);
    } else if (notif.type === 'seller_broadcast') {
      router.push('/my-followed-feed');
    } else if (notif.data?.order_id) {
      router.push('/hub/orders');
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        className={`relative p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${
          isAliExpress2
            ? 'text-white/70 hover:text-white hover:bg-white/10'
            : isAliExpress
            ? 'text-gray-600 dark:text-gray-300 hover:text-[#ff4747] hover:bg-orange-50 dark:hover:bg-white/5'
            : 'text-gray-600 dark:text-gray-300 hover:text-[#16C784] hover:bg-emerald-50 dark:hover:bg-white/5'
        } ${hasNewRealtime ? 'animate-[ring_0.5s_ease-in-out]' : ''}`}
        aria-label="Notifications"
        aria-expanded={isOpen}
        onAnimationEnd={() => setHasNewRealtime(false)}
      >
        <Bell className="w-5 h-5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm ${
              hasNewRealtime ? 'animate-pulse' : ''
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {/* Realtime WebSocket Status Indicator Dot */}
        <span
          className={`absolute bottom-0.5 end-0.5 w-1.5 h-1.5 rounded-full ${
            socketConnected ? 'bg-[#16C784]' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          title={socketConnected ? 'Temps réel actif' : 'Mode polling (30s)'}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute end-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border z-50 overflow-hidden backdrop-blur-lg animate-dropdown-in ${
            isAliExpress2
              ? 'bg-[#09090b]/95 border-white/10 text-white shadow-black/80'
              : 'bg-white dark:bg-[#1A1A2E] border-gray-100 dark:border-white/10 text-gray-900 dark:text-white'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${accentBgLight}`}>
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs font-semibold hover:underline transition-colors"
                style={{ color: accentColor }}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50 dark:divide-white/5">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">
                <div className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mb-2" />
                <p>Chargement...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 mb-2">
                  <Bell className="w-6 h-6 strokeWidth={1.5}" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Aucune notification</p>
                <p className="text-xs text-gray-400 mt-0.5">Vous êtes à jour !</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-gray-50/80 dark:hover:bg-white/5 ${
                    !notif.is_read
                      ? isAliExpress
                        ? 'bg-red-500/[0.04] dark:bg-red-500/[0.08]'
                        : 'bg-[#16C784]/[0.04] dark:bg-[#16C784]/[0.08]'
                      : ''
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  {getNotificationIcon(notif.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-bold truncate ${
                          !notif.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                          style={{ backgroundColor: accentColor }}
                        />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-400">
                      <span>{timeAgo(notif.created_at)}</span>
                      {notif.data?.store_name && (
                        <span className="font-medium text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                          {notif.data.store_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between text-xs">
            <Link
              href="/hub/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="font-semibold transition-colors hover:underline"
              style={{ color: accentColor }}
            >
              Voir toutes les notifications
            </Link>
            <Link
              href="/my-followed-feed"
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Mon fil abonnements →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
