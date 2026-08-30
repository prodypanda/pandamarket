'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
import {
  Undo2,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Store,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

interface AdminRefundRow {
  id: string;
  order_id: string;
  store_id: string;
  store_name: string | null;
  owner_email: string | null;
  requested_by: string | null;
  amount: string;
  currency: string;
  reason_code: string;
  reason: string | null;
  status: string;
  created_at: string;
  decision_metadata: Record<string, unknown> | null;
  gate: Record<string, unknown> | null;
}

function formatPrice(value: number): string {
  return `${Math.abs(value).toFixed(3)} TND`;
}

const REASON_LABELS: Record<string, string> = {
  customer_request: 'Customer request',
  out_of_stock: 'Out of stock',
  damaged_item: 'Damaged item',
  late_delivery: 'Late delivery',
  duplicate_order: 'Duplicate order',
  goodwill: 'Goodwill',
  other: 'Other',
};

export default function AdminRefundReviewPage() {
  const [refunds, setRefunds] = useState<AdminRefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [decidingId, setDecidingId] = useState('');
  const [rejectTarget, setRejectTarget] = useState<AdminRefundRow | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/refunds/review-queue?page=${page}&limit=20`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setRefunds(data.data || []);
        setTotalPages(data.meta?.total_pages || 1);
        setTotal(data.meta?.total || 0);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    void fetchRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const decide = async (refund: AdminRefundRow, decision: 'approve' | 'reject', note?: string) => {
    setDecidingId(refund.id);
    setError('');
    setFeedback('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/refunds/${refund.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ decision, note }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Decision failed');
        return;
      }
      setFeedback(
        decision === 'approve'
          ? `Refund #${refund.id.slice(-8)} approved — the seller can now process it.`
          : `Refund #${refund.id.slice(-8)} rejected.`,
      );
      setRejectTarget(null);
      setRejectNote('');
      await fetchRefunds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setDecidingId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refund Review Queue</h1>
          <p className="text-gray-500 mt-1">
            Refunds held by the approval gate: not-yet-delivered orders and amounts above the auto-process threshold.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRefunds()}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-[#B91C1C] rounded-lg text-sm font-medium">
            <ShieldAlert className="w-4 h-4" />
            {total} refund{total !== 1 ? 's' : ''} awaiting review
          </div>
        </div>
      </div>

      {(error || feedback) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error || feedback}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : refunds.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No refunds awaiting review</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Store</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gate</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {refunds.map((r) => {
                    const gate = r.gate || {};
                    const delivered = gate.order_delivered === true;
                    const threshold = gate.auto_process_threshold_tnd;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors align-top">
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString('fr-TN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">
                          #{r.order_id.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Store className="w-3.5 h-3.5 text-gray-400" />
                            {r.store_name || r.store_id.slice(-8)}
                          </div>
                          {r.owner_email && <p className="text-xs text-gray-400 mt-0.5">{r.owner_email}</p>}
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-gray-900 whitespace-nowrap">
                          {formatPrice(parseFloat(r.amount))}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-[220px]">
                          <p className="font-semibold">{REASON_LABELS[r.reason_code] || r.reason_code}</p>
                          {r.reason && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{r.reason}</p>}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px]">
                          {delivered ? (
                            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
                              Delivered · above {threshold !== undefined && threshold !== null ? `${threshold} TND` : 'threshold'}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700">
                              Not delivered · always reviewed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => decide(r, 'approve')}
                              disabled={decidingId === r.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {decidingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => { setRejectTarget(r); setRejectNote(''); }}
                              disabled={decidingId === r.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <span className="text-xs font-bold text-gray-400">
                  Page {page} of {totalPages} · {total} refunds
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-xl border border-gray-200 bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-gray-900">Reject refund</h3>
            <p className="mt-1 text-sm text-gray-500">
              Refund of <strong>{formatPrice(parseFloat(rejectTarget.amount))}</strong> on order #
              {rejectTarget.order_id.slice(-8).toUpperCase()} ({rejectTarget.store_name || 'store'}). The seller will be
              notified. A note is required.
            </p>
            <textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (visible in the audit log)"
              className="mt-4 w-full rounded-xl border border-gray-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-red-400 focus:bg-white"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setRejectTarget(null); setRejectNote(''); }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectNote.trim() || decidingId === rejectTarget.id}
                onClick={() => decide(rejectTarget, 'reject', rejectNote.trim())}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {decidingId === rejectTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
