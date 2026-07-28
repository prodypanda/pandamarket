'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import {
  Crown,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Building2,
  User,
  Banknote,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface SubscriptionOrder {
  id: string;
  store_id: string;
  user_id: string;
  store_name: string;
  store_subdomain: string;
  seller_email: string;
  reviewer_email?: string;
  from_plan: string;
  target_plan: string;
  amount: string | number;
  currency: string;
  gateway: string;
  status: 'pending' | 'pending_proof' | 'pending_review' | 'captured' | 'rejected' | 'failed';
  proof_url?: string;
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
  metadata?: any;
}

const GATEWAY_NAMES: Record<string, string> = {
  manual_mandat: 'Mandat Minute / Virement',
  flouci: 'Flouci',
  konnect: 'Konnect',
  paypal: 'PayPal',
  cod: 'Cash on Delivery',
};

const PLAN_BADGES: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  starter: 'bg-blue-100 text-blue-800',
  regular: 'bg-indigo-100 text-indigo-800',
  agency: 'bg-purple-100 text-purple-800',
  pro: 'bg-red-100 text-red-800',
  golden: 'bg-amber-100 text-amber-800',
  platinum: 'bg-gray-900 text-white',
};

export default function SubscriptionOrdersPage() {
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected Order for Review
  const [reviewOrder, setReviewOrder] = useState<SubscriptionOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (gatewayFilter !== 'all') params.append('gateway', gatewayFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetchWithCsrf(`/api/pd/admin/subscription-orders?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.subscription_orders || []);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Failed to load subscription orders');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, gatewayFilter, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleReview = async (decision: 'approved' | 'rejected') => {
    if (!reviewOrder) return;
    if (decision === 'rejected' && !rejectionReason.trim()) {
      setError('Veuillez fournir un motif de refus.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetchWithCsrf(`/api/pd/admin/subscription-orders/${reviewOrder.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          decision,
          reason: decision === 'rejected' ? rejectionReason : undefined,
        }),
      });

      if (res.ok) {
        setSuccess(
          decision === 'approved'
            ? `🎉 Commande d'abonnement approuvée ! Le plan ${reviewOrder.target_plan.toUpperCase()} a été activé pour ${reviewOrder.store_name}.`
            : `Commande refusée. Motif transmis au vendeur.`
        );
        setReviewOrder(null);
        setRejectionReason('');
        await fetchOrders();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Erreur lors de la révision');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingReviewCount = orders.filter((o) => o.status === 'pending_review').length;
  const capturedCount = orders.filter((o) => o.status === 'captured').length;
  const totalVolume = orders
    .filter((o) => o.status === 'captured')
    .reduce((acc, o) => acc + Number(o.amount), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Crown className="w-7 h-7 text-[#B91C1C]" />
            <h1 className="text-2xl font-black text-slate-900">Subscription Platform Orders</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gérer et valider les commandes d&apos;abonnements vendeurs (Mandat Minute, Flouci, PayPal, Konnect)
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">En attente de validation</p>
            <p className="text-2xl font-black text-slate-900">{pendingReviewCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Abonnements Activés</p>
            <p className="text-2xl font-black text-slate-900">{capturedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Banknote className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Volume Total Encaissé</p>
            <p className="text-2xl font-black text-slate-900">{totalVolume.toFixed(0)} TND</p>
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-2xl">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par boutique, email vendeur ou ID..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#B91C1C] focus:bg-white bg-slate-50/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 bg-white outline-none"
            >
              <option value="all">Tous les Statuts</option>
              <option value="pending_review">⏳ En attente de preuve / revue</option>
              <option value="pending_proof">📑 Attente Reçu Vendeur</option>
              <option value="captured">✅ Activés / Payés</option>
              <option value="rejected">❌ Refusés</option>
              <option value="failed">⚠️ Échoués</option>
            </select>
          </div>

          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 bg-white outline-none"
          >
            <option value="all">Toutes les méthodes</option>
            <option value="manual_mandat">Mandat Minute</option>
            <option value="flouci">Flouci</option>
            <option value="paypal">PayPal</option>
            <option value="konnect">Konnect</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Chargement des commandes...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Crown className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">Aucune commande d&apos;abonnement trouvée</p>
            <p className="text-xs text-slate-400">Essayez de modifier vos filtres de recherche.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Commande</th>
                  <th className="px-6 py-4">Boutique & Vendeur</th>
                  <th className="px-6 py-4">Changement Plan</th>
                  <th className="px-6 py-4">Montant</th>
                  <th className="px-6 py-4">Méthode</th>
                  <th className="px-6 py-4">Justificatif / Reçu</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono text-[#B91C1C] font-bold">
                      {order.id.slice(-10)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{order.store_name}</span>
                        <span className="text-slate-400 font-mono text-[11px]">{order.store_subdomain}.pandamarket.tn</span>
                        <span className="text-slate-500 text-[11px]">{order.seller_email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          {order.from_plan.toUpperCase()}
                        </span>
                        <span>→</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${PLAN_BADGES[order.target_plan] || 'bg-slate-100 text-slate-800'}`}>
                          {order.target_plan.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900 text-sm">
                      {Number(order.amount).toFixed(0)} TND
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-700">
                        {GATEWAY_NAMES[order.gateway] || order.gateway}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {order.proof_url ? (
                        <a
                          href={order.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5" /> Reçu <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Non fourni</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {order.status === 'captured' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Activé / Payé
                        </span>
                      )}
                      {order.status === 'pending_review' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 animate-pulse">
                          <Clock className="w-3.5 h-3.5" /> En attente de validation
                        </span>
                      )}
                      {order.status === 'pending_proof' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                          <FileText className="w-3.5 h-3.5" /> En attente du reçu
                        </span>
                      )}
                      {order.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-800">
                          <XCircle className="w-3.5 h-3.5" /> Refusé
                        </span>
                      )}
                      {order.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          En cours
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.status === 'pending_review' || order.status === 'pending_proof' ? (
                        <button
                          onClick={() => setReviewOrder(order)}
                          className="px-3 py-1.5 bg-[#B91C1C] text-white font-bold rounded-lg text-xs hover:bg-[#991B1B] shadow-sm flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" /> Valider / Réviser
                        </button>
                      ) : (
                        <button
                          onClick={() => setReviewOrder(order)}
                          className="px-3 py-1.5 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-100 flex items-center gap-1 ml-auto"
                        >
                          Détails
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Validation de la commande #{reviewOrder.id.slice(-8)}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Société/Boutique: <span className="font-bold text-slate-900">{reviewOrder.store_name}</span>
                </p>
              </div>
              <button
                onClick={() => setReviewOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Vendor & Plan Details */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <div>
                <p className="text-slate-400 font-bold uppercase">Plan Demandé</p>
                <p className="text-base font-black text-slate-900">{reviewOrder.target_plan.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase">Montant Attendu</p>
                <p className="text-base font-black text-[#B91C1C]">{Number(reviewOrder.amount).toFixed(0)} TND</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase">Email Vendeur</p>
                <p className="font-bold text-slate-800">{reviewOrder.seller_email}</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase">Méthode</p>
                <p className="font-bold text-slate-800">{GATEWAY_NAMES[reviewOrder.gateway] || reviewOrder.gateway}</p>
              </div>
            </div>

            {/* Proof Preview */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2">Reçu / Justificatif transmis</h4>
              {reviewOrder.proof_url ? (
                <div className="space-y-2">
                  <a
                    href={reviewOrder.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-800 font-bold text-xs hover:bg-blue-100 transition-all border border-blue-200"
                  >
                    <ExternalLink className="w-4 h-4" /> Voir le document complet / image du reçu
                  </a>
                  {/\.(jpg|jpeg|png|webp)/i.test(reviewOrder.proof_url) && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-48">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={reviewOrder.proof_url} alt="Proof" className="w-full object-contain max-h-48 bg-slate-900/5" />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                  Le vendeur a soumis la commande sans reçu direct. Il a la possibilité de l&apos;envoyer par email ou de l&apos;uploader plus tard. Vous pouvez néanmoins valider manuellement dès réception du virement sur le compte PandaMarket.
                </p>
              )}
            </div>

            {/* Rejection Reason (If rejecting) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Motif de refus (Obligatoire si rejeté)</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Indiquez la raison du rejet (ex: Reçu illisible, montant incorrect, virement non reçu...)"
                rows={2}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#B91C1C]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleReview('rejected')}
                disabled={submitting}
                className="flex-1 py-3 bg-red-50 text-red-700 border border-red-200 font-bold rounded-xl text-xs hover:bg-red-100 disabled:opacity-50"
              >
                Refuser la commande
              </button>
              <button
                onClick={() => handleReview('approved')}
                disabled={submitting}
                className="flex-1 py-3 bg-[#B91C1C] text-white font-bold rounded-xl text-xs hover:bg-[#991B1B] shadow-md disabled:opacity-50"
              >
                {submitting ? 'Activation...' : `Approuver & Activer Plan ${reviewOrder.target_plan.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
