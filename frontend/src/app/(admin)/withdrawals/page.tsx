'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  ArrowUpRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Store,
  RefreshCw,
} from 'lucide-react';

interface Withdrawal {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
  store_id: string;
  store_name: string;
}

function formatPrice(price: number): string {
  return `${Math.abs(price).toFixed(3)} TND`;
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/withdrawals?page=${page}&limit=20`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data.data || []);
        setTotalPages(data.meta?.total_pages || 1);
        setTotal(data.meta?.total || 0);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    void fetchWithdrawals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdrawal Queue</h1>
          <p className="text-gray-500 mt-1">
            View all vendor payout transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchWithdrawals()}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-[#B91C1C] rounded-lg text-sm font-medium">
            <Wallet className="w-4 h-4" />
            {total} withdrawal{total !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No withdrawals found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Balance After
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(w.created_at).toLocaleDateString('fr-TN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {w.store_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-semibold text-red-600">
                            -{formatPrice(w.amount)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatPrice(w.balance_after)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {w.description || '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                        {w.id.slice(-8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
