'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Webhook,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  consecutive_failures: number;
  last_delivery_at: string | null;
  last_status_code: number | null;
  created_at: string;
}

interface DeliveryLog {
  id: string;
  event_type: string;
  status_code: number | null;
  error: string | null;
  attempt: number;
  delivered_at: string;
}

const AVAILABLE_EVENTS = [
  { value: 'pd.order.placed', key: 'orderPlaced' },
  { value: 'pd.order.fulfilled', key: 'orderFulfilled' },
  { value: 'pd.order.cancelled', key: 'orderCancelled' },
  { value: 'pd.payment.captured', key: 'paymentCaptured' },
  { value: 'pd.product.created', key: 'productCreated' },
  { value: 'pd.product.published', key: 'productPublished' },
  { value: 'pd.stock.low', key: 'stockLow' },
];

const API_BASE = '/api/pd';

export default function WebhooksPage() {
  const { t, locale, dir } = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create form state
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/vendor/webhooks`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.data ?? []);
      }
    } catch {
      setError(t('dashboardPages.webhooks.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchDeliveries = useCallback(async (webhookId: string) => {
    try {
      const res = await fetch(`${API_BASE}/vendor/webhooks/${webhookId}/deliveries`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.data ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  useEffect(() => {
    if (selectedWebhook) {
      fetchDeliveries(selectedWebhook);
    }
  }, [selectedWebhook, fetchDeliveries]);

  const handleCreate = async () => {
    if (!newUrl || newEvents.length === 0) return;
    setCreating(true);
    try {
      const res = await fetchWithCsrf(`${API_BASE}/vendor/webhooks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, events: newEvents }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewSecret(data.secret ?? null);
        setShowCreate(false);
        setNewUrl('');
        setNewEvents([]);
        fetchWebhooks();
      } else {
        const data = await res.json();
        setError(data.error?.message ?? t('dashboardPages.webhooks.errors.createFailed'));
      }
    } catch {
      setError(t('dashboardPages.webhooks.errors.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await fetchWithCsrf(`${API_BASE}/vendor/webhooks/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      fetchWebhooks();
    } catch {
      setError(t('dashboardPages.webhooks.errors.updateFailed'));
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await fetchWithCsrf(`${API_BASE}/vendor/webhooks/${deleteTargetId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (selectedWebhook === deleteTargetId) setSelectedWebhook(null);
      setDeleteTargetId(null);
      fetchWebhooks();
    } catch {
      setError(t('dashboardPages.webhooks.errors.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const toggleEvent = (event: string) => {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  if (loading) {
    return (
      <div dir={dir} className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Webhook className="w-6 h-6 text-slate-900 dark:text-white" />
            {t('dashboardPages.webhooks.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {t('dashboardPages.webhooks.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium rounded-xl shadow-2xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('dashboardPages.webhooks.addWebhook')}
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 flex items-center gap-2 text-rose-700 dark:text-rose-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 font-bold">×</button>
        </div>
      )}

      {newSecret && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-200">{t('dashboardPages.webhooks.signingSecret')}</p>
              <p className="text-sm mt-1 text-amber-800 dark:text-amber-300">{t('dashboardPages.webhooks.signingSecretDesc')}</p>
              <code className="block mt-2 break-all rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-700/60 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white">
                {newSecret}
              </code>
            </div>
            <button onClick={() => setNewSecret(null)} className="ml-auto text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 font-bold">×</button>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('dashboardPages.webhooks.newWebhook')}</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('dashboardPages.webhooks.endpointUrl')}</label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://your-server.com/webhooks/pandamarket"
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('dashboardPages.webhooks.eventsLabel')}</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {AVAILABLE_EVENTS.map((event) => {
                const isSelected = newEvents.includes(event.value);
                return (
                  <label
                    key={event.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${
                      isSelected
                        ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800/80'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEvent(event.value)}
                      className="mt-0.5 text-slate-900 focus:ring-slate-900 dark:text-white dark:focus:ring-white rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850"
                    />
                    <div>
                      <div className="font-medium text-sm text-slate-900 dark:text-white">
                        {t(`dashboardPages.webhooks.events.${event.key}.label`)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t(`dashboardPages.webhooks.events.${event.key}.desc`)}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || !newUrl || newEvents.length === 0}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium rounded-xl shadow-2xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {t('dashboardPages.webhooks.createWebhook')}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewUrl(''); setNewEvents([]); }}
              className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
            >
              {t('dashboardPages.webhooks.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {webhooks.length === 0 && !showCreate ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <Webhook className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t('dashboardPages.webhooks.noWebhooks')}</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {t('dashboardPages.webhooks.noWebhooksDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-2xs transition-colors ${
                selectedWebhook === wh.id ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white' : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    <span className="font-mono text-sm text-slate-900 dark:text-white truncate">{wh.url}</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        wh.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {wh.is_active ? t('dashboardPages.webhooks.active') : t('dashboardPages.webhooks.inactive')}
                    </span>
                    {wh.consecutive_failures > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                        {t('dashboardPages.webhooks.failures', { count: wh.consecutive_failures })}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {wh.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200/50 dark:border-slate-750"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  {wh.last_delivery_at && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      {t('dashboardPages.webhooks.lastDelivery')}{' '}
                      {new Date(wh.last_delivery_at).toLocaleString(dateLocale)}
                      {wh.last_status_code && (
                        <span className={wh.last_status_code < 300 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400 font-medium'}>
                          ({wh.last_status_code})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setSelectedWebhook(selectedWebhook === wh.id ? null : wh.id)}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={t('dashboardPages.webhooks.viewDeliveries')}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggle(wh.id, wh.is_active)}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={wh.is_active ? t('dashboardPages.webhooks.disable') : t('dashboardPages.webhooks.enable')}
                  >
                    {wh.is_active ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title={t('dashboardPages.webhooks.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Delivery Logs */}
              {selectedWebhook === wh.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t('dashboardPages.webhooks.recentDeliveries')}</h4>
                  {deliveries.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.webhooks.noDeliveries')}</p>
                  ) : (
                    <div className="space-y-2">
                      {deliveries.slice(0, 10).map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 text-sm py-2 px-3 bg-slate-50/50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800/60"
                        >
                          {d.error ? (
                            <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                          )}
                          <span className="font-mono text-xs text-sky-600 dark:text-sky-400">{d.event_type}</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className={`text-xs font-medium ${d.status_code && d.status_code < 300 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {d.status_code ?? t('dashboardPages.webhooks.notAvailable')}
                          </span>
                          {d.error && (
                            <span className="text-xs text-rose-600 dark:text-rose-400 truncate">{d.error}</span>
                          )}
                          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                            {new Date(d.delivered_at).toLocaleString(dateLocale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteTargetId && (
        <ConfirmDialog
          isOpen={!!deleteTargetId}
          onClose={() => {
            if (!deleting) setDeleteTargetId(null);
          }}
          onConfirm={confirmDelete}
          title={t('dashboardPages.webhooks.delete') || 'Supprimer le webhook'}
          description={t('dashboardPages.webhooks.confirmDelete') || 'Êtes-vous sûr de vouloir supprimer ce webhook ?'}
          confirmLabel={t('dashboardPages.webhooks.delete') || 'Supprimer'}
          cancelLabel={t('dashboardPages.common.cancel') || 'Annuler'}
          variant="danger"
          loading={deleting}
          dir={dir}
        />
      )}
    </div>
  );
}
