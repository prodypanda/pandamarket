'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Loader2, Filter, Trash2 } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

const typeIcons: Record<string, string> = {
  'order.placed': '🛒',
  'payment.captured': '💰',
  'verification.approved': '✅',
  'verification.rejected': '❌',
  'ai.job.completed': '🤖',
  'ai.job.failed': '⚠️',
  'wallet.funds_available': '💵',
  'wallet.payout_completed': '🏦',
  'stock.low': '📦',
  'report.created': '🚨',
  'subscription.expiring': '⏰',
  'subscription.expired': '🔴',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const getErrorMessage = useCallback(async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      return data.error?.message || data.message || `${fallback} (${res.status})`;
    } catch {
      return `${fallback} (${res.status})`;
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (filter === 'unread') {
        params.set('unread', 'true');
      }
      const res = await fetchWithCsrf(`/api/pd/notifications?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
        setTotalPages(data.meta?.total_pages || 1);
      } else {
        setError(await getErrorMessage(res, 'Erreur lors du chargement des notifications'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [filter, getErrorMessage, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Erreur lors de la mise à jour'));
        return;
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    }
  };

  const markAllAsRead = async () => {
    setError('');
    setMarkingAll(true);
    try {
      const res = await fetchWithCsrf('/api/pd/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) {
        setError(await getErrorMessage(res, 'Erreur lors de la mise à jour'));
        return;
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (id: string) => {
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        setError(await getErrorMessage(res, 'Erreur lors de la suppression'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#16C784]" />
            Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Restez informé de l&apos;activité de votre boutique.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
            className="flex items-center px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4 mr-2" />
            {filter === 'all' ? 'Non lues uniquement' : 'Toutes'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="flex items-center px-3 py-2 text-sm bg-[#16C784] text-white rounded-lg hover:bg-[#14b576] transition-colors disabled:opacity-50"
            >
              {markingAll ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4 mr-2" />
              )}
              Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#16C784] animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune notification.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors cursor-pointer ${
                  !notif.is_read ? 'bg-[#16C784]/5 border-l-4 border-l-[#16C784]' : ''
                }`}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
              >
                <span className="text-2xl flex-shrink-0">
                  {typeIcons[notif.type] || '📬'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm ${!notif.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {notif.title}
                    </h3>
                    {!notif.is_read && (
                      <span className="w-2 h-2 bg-[#16C784] rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {new Date(notif.created_at).toLocaleDateString('fr-TN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {!notif.is_read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                    className="p-1.5 text-gray-400 hover:text-[#16C784] hover:bg-[#16C784]/10 rounded-lg transition-colors flex-shrink-0"
                    title="Marquer comme lu"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              ← Précédent
            </button>
            <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
