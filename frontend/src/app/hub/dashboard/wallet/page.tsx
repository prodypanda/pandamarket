'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface WalletData {
  balance: number | string | null;
  pending_balance: number | string | null;
  total_earned: number | string | null;
  total_withdrawn: number | string | null;
  payout_mode: 'on_demand' | 'automatic';
}

interface Transaction {
  id: string;
  type: string;
  amount: number | string | null;
  status: string;
  reference?: string;
  created_at: string;
}

function toNumber(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatPrice(price: unknown): string {
  return `${toNumber(price).toFixed(3)} TND`;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  const [payoutMode, setPayoutMode] = useState<'on_demand' | 'automatic'>('on_demand');
  const [savingMode, setSavingMode] = useState(false);
  const [loadError, setLoadError] = useState('');

  const getErrorMessage = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      return data.error?.message || data.message || `${fallback} (${res.status})`;
    } catch {
      return `${fallback} (${res.status})`;
    }
  };

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/wallet/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const w = data.wallet;
        setWallet(w);
        setPayoutMode(w.payout_mode);
      } else {
        setLoadError(await getErrorMessage(res, 'Erreur lors du chargement du wallet'));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur réseau');
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetchWithCsrf(`/api/pd/wallet/me/transactions?page=${txPage}&limit=20`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data || []);
      } else {
        setLoadError(await getErrorMessage(res, 'Erreur lors du chargement des transactions'));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur réseau');
    }
  }, [txPage]);

  useEffect(() => {
    Promise.all([fetchWallet(), fetchTransactions()]).finally(() => setLoading(false));
  }, [fetchWallet, fetchTransactions]);

  const handleWithdraw = async () => {
    setWithdrawError('');
    setWithdrawSuccess('');
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 20) {
      setWithdrawError('Le montant minimum de retrait est de 20 TND');
      return;
    }
    setWithdrawing(true);
    try {
      const res = await fetchWithCsrf('/api/pd/wallet/me/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount, notes: withdrawNotes || undefined }),
      });
      if (res.ok) {
        setWithdrawSuccess('Demande de retrait envoyée avec succès');
        setWithdrawAmount('');
        setWithdrawNotes('');
        fetchWallet();
        fetchTransactions();
      } else {
        const data = await res.json();
        setWithdrawError(data.error?.message || 'Erreur lors du retrait');
      }
    } catch {
      setWithdrawError('Erreur réseau');
    } finally {
      setWithdrawing(false);
    }
  };

  const handlePayoutModeChange = async (mode: 'on_demand' | 'automatic') => {
    setWithdrawError('');
    setWithdrawSuccess('');
    setSavingMode(true);
    try {
      const res = await fetchWithCsrf('/api/pd/wallet/me/payout-mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ payout_mode: mode }),
      });
      if (res.ok) {
        setPayoutMode(mode);
        setWithdrawSuccess('Mode de versement mis à jour');
      } else {
        setWithdrawError(await getErrorMessage(res, 'Erreur lors du changement de mode'));
      }
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingMode(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Mon Wallet</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2 mb-3" />
              <div className="h-8 bg-gray-100 rounded animate-pulse w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mon Wallet</h1>

      {loadError && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
          {loadError}
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#B91C1C] to-[#991B1B] rounded-xl p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 opacity-80" />
            <span className="text-sm font-medium opacity-80">Disponible</span>
          </div>
          <p className="text-3xl font-extrabold">{formatPrice(wallet?.balance || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-500">En attente</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(wallet?.pending_balance || 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Libéré après la période de rétention</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-5 h-5 text-[#B91C1C]" />
            <span className="text-sm font-medium text-gray-500">Total gagné</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(wallet?.total_earned || 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-500">Total retiré</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(wallet?.total_withdrawn || 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payout Mode */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Mode de versement</h2>
          <div className="space-y-3">
            {(['on_demand', 'automatic'] as const).map((mode) => (
              <label
                key={mode}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  payoutMode === mode
                    ? 'border-[#B91C1C] bg-[#B91C1C]/5'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="payout_mode"
                  checked={payoutMode === mode}
                  onChange={() => handlePayoutModeChange(mode)}
                  disabled={savingMode}
                  className="text-[#B91C1C] focus:ring-[#B91C1C]"
                />
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {mode === 'on_demand' ? 'Manuel' : 'Automatique'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {mode === 'on_demand'
                      ? 'Demandez vos retraits manuellement'
                      : 'Versement automatique chaque semaine'}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Withdraw Form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Demander un retrait</h2>
          {withdrawError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{withdrawError}</div>
          )}
          {withdrawSuccess && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">
              {withdrawSuccess}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant (TND)</label>
              <input
                type="number"
                min="20"
                step="0.001"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Min. 20 TND"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
              <input
                type="text"
                value={withdrawNotes}
                onChange={(e) => setWithdrawNotes(e.target.value)}
                placeholder="Référence, commentaire..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#B91C1C] focus:ring-1 focus:ring-[#B91C1C] outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="mt-4 px-6 py-2.5 bg-[#B91C1C] text-white font-semibold rounded-lg hover:bg-[#991B1B] transition-colors disabled:opacity-50"
          >
            {withdrawing ? 'Envoi...' : 'Demander le retrait'}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Historique des transactions</h2>
          <button
            onClick={() => fetchTransactions()}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Montant</th>
                <th className="px-6 py-3">Statut</th>
                <th className="px-6 py-3">Référence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    Aucune transaction
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const txAmount = toNumber(tx.amount);
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-700">
                        {new Date(tx.created_at).toLocaleDateString('fr-TN')}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700 capitalize">{tx.type}</td>
                      <td
                        className={`px-6 py-3 text-sm font-semibold ${
                          txAmount >= 0 ? 'text-[#B91C1C]' : 'text-red-500'
                        }`}
                      >
                        {txAmount >= 0 ? '+' : ''}
                        {formatPrice(txAmount)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            tx.status === 'completed'
                              ? 'bg-green-50 text-green-700'
                              : tx.status === 'pending'
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{tx.reference || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setTxPage((p) => Math.max(1, p - 1))}
            disabled={txPage === 1}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
          <span className="text-sm text-gray-500">Page {txPage}</span>
          <button
            onClick={() => setTxPage((p) => p + 1)}
            disabled={transactions.length < 20}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
