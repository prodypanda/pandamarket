'use client';

import { useState, useEffect, useCallback } from 'react';
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
  { value: 'pd.order.placed', label: 'Order Placed', desc: 'When a new order is received' },
  { value: 'pd.order.fulfilled', label: 'Order Fulfilled', desc: 'When an order is shipped' },
  { value: 'pd.order.cancelled', label: 'Order Cancelled', desc: 'When an order is cancelled' },
  { value: 'pd.payment.captured', label: 'Payment Captured', desc: 'When a payment is confirmed' },
  { value: 'pd.payment.refunded', label: 'Payment Refunded', desc: 'When a refund is processed' },
  { value: 'pd.stock.low', label: 'Stock Low', desc: 'When product stock falls below threshold' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api/pd';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

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
      setError('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

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
      const res = await fetch(`${API_BASE}/vendor/webhooks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, events: newEvents }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewUrl('');
        setNewEvents([]);
        fetchWebhooks();
      } else {
        const data = await res.json();
        setError(data.error?.message ?? 'Failed to create webhook');
      }
    } catch {
      setError('Failed to create webhook');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await fetch(`${API_BASE}/vendor/webhooks/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      fetchWebhooks();
    } catch {
      setError('Failed to update webhook');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    try {
      await fetch(`${API_BASE}/vendor/webhooks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (selectedWebhook === id) setSelectedWebhook(null);
      fetchWebhooks();
    } catch {
      setError('Failed to delete webhook');
    }
  };

  const toggleEvent = (event: string) => {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-panda-green)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Webhook className="w-6 h-6 text-[var(--color-panda-green)]" />
            Webhooks
          </h1>
          <p className="text-gray-500 mt-1">
            Receive real-time notifications when events happen in your store.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-panda-green)] text-white rounded-lg hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">New Webhook</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://your-server.com/webhooks/pandamarket"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-panda-green)] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {AVAILABLE_EVENTS.map((event) => (
                <label
                  key={event.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${
                    newEvents.includes(event.value)
                      ? 'border-[var(--color-panda-green)] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={newEvents.includes(event.value)}
                    onChange={() => toggleEvent(event.value)}
                    className="mt-0.5 accent-[var(--color-panda-green)]"
                  />
                  <div>
                    <div className="font-medium text-sm">{event.label}</div>
                    <div className="text-xs text-gray-500">{event.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || !newUrl || newEvents.length === 0}
              className="px-4 py-2 bg-[var(--color-panda-green)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Create Webhook
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewUrl(''); setNewEvents([]); }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {webhooks.length === 0 && !showCreate ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No webhooks configured</h3>
          <p className="text-gray-500 mt-1">
            Add a webhook to receive real-time event notifications.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className={`bg-white border rounded-xl p-5 ${
                selectedWebhook === wh.id ? 'border-[var(--color-panda-green)] ring-1 ring-[var(--color-panda-green)]' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-mono text-sm text-gray-900 truncate">{wh.url}</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        wh.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {wh.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {wh.consecutive_failures > 0 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                        {wh.consecutive_failures} failures
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {wh.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  {wh.last_delivery_at && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      Last delivery: {new Date(wh.last_delivery_at).toLocaleString()}
                      {wh.last_status_code && (
                        <span className={wh.last_status_code < 300 ? 'text-green-600' : 'text-red-600'}>
                          ({wh.last_status_code})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setSelectedWebhook(selectedWebhook === wh.id ? null : wh.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="View deliveries"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggle(wh.id, wh.is_active)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title={wh.is_active ? 'Disable' : 'Enable'}
                  >
                    {wh.is_active ? (
                      <ToggleRight className="w-5 h-5 text-[var(--color-panda-green)]" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Delivery Logs */}
              {selectedWebhook === wh.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Deliveries</h4>
                  {deliveries.length === 0 ? (
                    <p className="text-sm text-gray-500">No deliveries yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {deliveries.slice(0, 10).map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 text-sm py-2 px-3 bg-gray-50 rounded-lg"
                        >
                          {d.error ? (
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                          <span className="font-mono text-xs text-blue-600">{d.event_type}</span>
                          <span className="text-gray-400">•</span>
                          <span className={`text-xs ${d.status_code && d.status_code < 300 ? 'text-green-600' : 'text-red-600'}`}>
                            {d.status_code ?? 'N/A'}
                          </span>
                          {d.error && (
                            <span className="text-xs text-red-500 truncate">{d.error}</span>
                          )}
                          <span className="ml-auto text-xs text-gray-400">
                            {new Date(d.delivered_at).toLocaleString()}
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
    </div>
  );
}
