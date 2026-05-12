'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { Receipt, Check, X, Eye, DollarSign, Loader2 } from 'lucide-react';

interface MandatProof {
  id: string;
  order_id: string;
  customer_email: string;
  amount_expected: number | string;
  image_url: string;
  created_at: string;
  uploaded_by: string;
}

function toAmount(value: number | string): number {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export default function AdminMandatsPage() {
  const [mandats, setMandats] = useState<MandatProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchMandats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCsrf('/api/pd/admin/mandats/pending?limit=100');
      if (!res.ok) throw new Error('Failed to load mandat proofs');
      const data = await res.json();
      setMandats(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mandat proofs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMandats();
  }, [fetchMandats]);

  async function approveMandat(id: string) {
    setActionId(id);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/mandats/${id}/approve`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error('Failed to approve mandat proof');
      await fetchMandats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve mandat proof');
    } finally {
      setActionId(null);
    }
  }

  async function rejectMandat(id: string) {
    const rejectionReason = rejectReasons[id]?.trim();
    if (!rejectionReason) {
      setError('Rejection reason is required');
      return;
    }

    setActionId(id);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/mandats/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });
      if (!res.ok) throw new Error('Failed to reject mandat proof');
      setRejectReasons((current) => ({ ...current, [id]: '' }));
      await fetchMandats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject mandat proof');
    } finally {
      setActionId(null);
    }
  }

  async function openProof(fileRef: string) {
    if (/^https?:\/\//i.test(fileRef)) {
      window.open(fileRef, '_blank', 'noopener,noreferrer');
      return;
    }

    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/files/access?key=${encodeURIComponent(fileRef)}`);
      if (!res.ok) throw new Error('Failed to open mandat proof');
      const data = await res.json();
      if (data.download_url) window.open(data.download_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open mandat proof');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mandat Minute Validation</h1>
          <p className="text-gray-500 mt-1">{mandats.length} proofs awaiting validation.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium">
          <Receipt className="w-4 h-4" />
          {mandats.length} pending
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-100 bg-white py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : mandats.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
            <Receipt className="mx-auto mb-3 h-12 w-12 text-[#16C784]" />
            <h3 className="text-lg font-semibold text-gray-900">No pending mandat proofs</h3>
            <p className="mt-1 text-sm text-gray-500">All Mandat Minute proofs have been reviewed.</p>
          </div>
        ) : mandats.map((mandat) => {
          const amountExpected = toAmount(mandat.amount_expected);
          return (
          <div
            key={mandat.id}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Order #{mandat.order_id.slice(-8).toUpperCase()}
                </h3>
                <p className="text-sm text-gray-500">
                  {mandat.customer_email} • Uploaded{' '}
                  {new Date(mandat.created_at).toLocaleDateString('fr-TN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#16C784]/10 text-[#16C784] rounded-full text-sm font-bold">
                <DollarSign className="w-4 h-4" />
                {amountExpected.toFixed(3)} TND
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Proof of Payment</p>
                <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => openProof(mandat.image_url)}
                    className="flex items-center gap-2 text-sm font-medium text-[#16C784] hover:underline"
                  >
                    <Eye className="w-4 h-4" /> View Full Image
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Expected Amount</p>
                <p className="text-3xl font-bold text-gray-900">
                  {amountExpected.toFixed(3)} TND
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Verify that the receipt matches this amount.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => approveMandat(mandat.id)}
                disabled={actionId === mandat.id}
                className="flex items-center gap-2 px-4 py-2 bg-[#16C784] text-white rounded-lg text-sm font-medium hover:bg-[#14b576] transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Approve
              </button>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  placeholder="Rejection reason..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                  value={rejectReasons[mandat.id] || ''}
                  onChange={(event) =>
                    setRejectReasons((current) => ({
                      ...current,
                      [mandat.id]: event.target.value,
                    }))
                  }
                />
                <button
                  onClick={() => rejectMandat(mandat.id)}
                  disabled={actionId === mandat.id}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
