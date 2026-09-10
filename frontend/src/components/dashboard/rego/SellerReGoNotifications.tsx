'use client';

import React from 'react';
import {
  Bell,
  CheckCheck,
  Check,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Package,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
  Filter,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface SellerReGoNotificationsProps {
  notifications: NotificationItem[];
  loading: boolean;
  page: number;
  totalPages: number;
  filter: 'all' | 'unread';
  markingAll: boolean;
  error: string;
  onMarkAsRead: (id: string) => Promise<void> | void;
  onMarkAllAsRead: () => Promise<void> | void;
  onPageChange: (p: number) => void;
  onFilterChange: (f: 'all' | 'unread') => void;
  onRefresh: () => Promise<void> | void;
  dir?: 'ltr' | 'rtl';
}

function getNotificationIcon(type: string) {
  if (type.startsWith('order.')) return <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
  if (type.startsWith('payment.') || type.startsWith('wallet.')) return <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
  if (type.startsWith('stock.')) return <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
  if (type.startsWith('verification.')) return <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
  if (type.startsWith('ai.')) return <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
  return <AlertTriangle className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
}

export function SellerReGoNotifications({
  notifications,
  loading,
  page,
  totalPages,
  filter,
  markingAll,
  error,
  onMarkAsRead,
  onMarkAllAsRead,
  onPageChange,
  onFilterChange,
  onRefresh,
  dir = 'ltr',
}: SellerReGoNotificationsProps) {
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const orderAlerts = notifications.filter((n) => n.type.startsWith('order.')).length;
  const stockAlerts = notifications.filter((n) => n.type.startsWith('stock.')).length;

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Espace Vendeur', href: '/hub/dashboard' },
        { label: 'Notifications' },
      ]}
      headerTitle="Centre de Notifications & Alertes Vendeur"
      headerSubtitle="Suivez les alertes de commandes, livraisons, seuils d'inventaire et états financiers en temps réel."
      headerIcon={Bell}
      statusBadge={
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          ReGo LiveSignals
        </span>
      }
      primaryAction={
        <button
          onClick={() => void onMarkAllAsRead()}
          disabled={markingAll || unreadCount === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40"
        >
          {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
          <span>Tout marquer comme lu</span>
        </button>
      }
      secondaryAction={
        <button
          onClick={() => void onRefresh()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      }
      mainContent={
        <div className="space-y-6" dir={dir}>
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Telemetry KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReGoKpiHero
              label="Total Notifications"
              value={notifications.length}
              hint="Alertes enregistrées sur ce flux"
              icon={Bell}
              accent
            />
            <ReGoKpiHero
              label="Non Lues"
              value={unreadCount}
              hint="En attente de consultation"
              icon={CheckCheck}
            />
            <ReGoKpiHero
              label="Flux Commandes"
              value={orderAlerts}
              hint="Nouvelles ventes & livraisons"
              icon={ShoppingBag}
            />
            <ReGoKpiHero
              label="Alertes Stock"
              value={stockAlerts}
              hint="Seuils d'inventaire bas"
              icon={Package}
            />
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onFilterChange('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Toutes ({notifications.length})
              </button>
              <button
                onClick={() => onFilterChange('unread')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  filter === 'unread'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>Non lues</span>
                {unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[var(--rego-accent,#ad0505)]" />
                )}
              </button>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Page {page} / {totalPages}
            </span>
          </div>

          {/* Notifications List */}
          <ReGoCard noPadding>
            {loading ? (
              <div className="py-16 flex justify-center items-center">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Inbox className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Boîte de notifications vide
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    {filter === 'unread'
                      ? 'Toutes vos alertes ont été lues et traitées avec succès.'
                      : 'Aucun message système ou alerte n\'a encore été généré pour votre boutique.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 transition flex items-start justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                      !n.is_read ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {n.title}
                          </h4>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[var(--rego-accent,#ad0505)] shrink-0" />
                          )}
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {n.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {new Date(n.created_at).toLocaleDateString('fr-TN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {!n.is_read && (
                      <button
                        onClick={() => void onMarkAsRead(n.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer"
                        title="Marquer comme lu"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Précédent</span>
                </button>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Page {page} de {totalPages}
                </span>
                <button
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 transition cursor-pointer"
                >
                  <span>Suivant</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </ReGoCard>
        </div>
      }
    />
  );
}
