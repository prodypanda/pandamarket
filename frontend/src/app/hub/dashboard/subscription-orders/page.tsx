'use client';

import { fetchWithCsrf } from '@/lib/api';
import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import Link from 'next/link';
import {
  ReceiptText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
  Printer,
  X,
  CreditCard,
  Crown,
  FileText,
  Building,
  Loader2,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface SubscriptionOrder {
  id: string;
  store_id: string;
  user_id: string;
  from_plan: string;
  target_plan: string;
  amount: number | string;
  currency: string;
  gateway: string;
  gateway_reference?: string | null;
  checkout_url?: string | null;
  status: 'pending' | 'pending_proof' | 'pending_review' | 'captured' | 'paid' | 'failed' | 'cancelled' | 'rejected';
  proof_url?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

interface SummaryStats {
  total_spent_tnd: number;
  paid_count: number;
  pending_count: number;
}

interface OrdersResponse {
  orders: SubscriptionOrder[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  summary: SummaryStats;
}

const GATEWAY_NAMES: Record<string, string> = {
  flouci: 'Flouci (Carte bancaire)',
  konnect: 'Konnect Pay',
  paypal: 'PayPal International',
  manual_mandat: 'Mandat Minute / STB',
  cod: 'Paiement COD',
};

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  captured: { label: 'Payé / Actif', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  paid: { label: 'Payé / Actif', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  pending_review: { label: 'En validation Admin', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  pending_proof: { label: 'Attente du Reçu', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: <Clock className="w-3.5 h-3.5" /> },
  pending: { label: 'En attente', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700', icon: <Clock className="w-3.5 h-3.5" /> },
  failed: { label: 'Paiement Échoué', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: <XCircle className="w-3.5 h-3.5" /> },
  rejected: { label: 'Refusé par Admin', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Annulé', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-500', icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function SubscriptionOrdersPage() {
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({ total_spent_tnd: 0, paid_count: 0, pending_count: 0 });
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionOrder | null>(null);
  const [uploadModalOrder, setUploadModalOrder] = useState<SubscriptionOrder | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        search: searchQuery.trim(),
      });
      const res = await fetchWithCsrf(`/api/pd/subscriptions/orders?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Échec du chargement des commandes d\'abonnement');
      const data: OrdersResponse = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.meta?.total_pages || 1);
      setTotalRecords(data.meta?.total || 0);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, searchQuery]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Voulez-vous vraiment annuler cette commande d\'abonnement ?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf('/api/pd/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ intent_id: orderId }),
      });
      if (res.ok) {
        setSuccess('Commande d\'abonnement annulée avec succès');
        await loadOrders();
      } else {
        const data = await res.json();
        setError(data.error?.message || 'Erreur lors de l\'annulation');
      }
    } catch {
      setError('Erreur réseau lors de l\'annulation');
    }
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetchWithCsrf('/api/pd/media/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error('Échec du téléversement du justificatif');
    const data = await res.json();
    return data.url || data.path;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const handleUploadProof = async () => {
    if (!uploadModalOrder) return;
    setError('');
    setSuccess('');
    setUploading(true);

    try {
      let finalUrl = proofUrl;
      if (proofFile) {
        finalUrl = await handleFileUpload(proofFile);
      }

      if (!finalUrl) {
        setError('Veuillez sélectionner un fichier ou renseigner une URL.');
        setUploading(false);
        return;
      }

      const res = await fetchWithCsrf('/api/pd/subscriptions/upload-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          intent_id: uploadModalOrder.id,
          proof_url: finalUrl,
        }),
      });

      if (res.ok) {
        setSuccess('🎉 Reçu de paiement transmis avec succès ! En attente de validation.');
        setUploadModalOrder(null);
        setProofFile(null);
        setProofUrl('');
        await loadOrders();
      } else {
        const data = await res.json();
        setError(data.error?.message || 'Échec de la transmission du reçu');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-8 text-white shadow-2xl shadow-slate-900/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-100 ring-1 ring-white/10 self-start">
            <ReceiptText className="h-4 w-4" />
            Historique des Factures & Commandes Plateforme
          </div>
          <Link
            href="/hub/dashboard/subscription"
            className="inline-flex items-center gap-2 rounded-full bg-[#B91C1C] hover:bg-[#991B1B] px-5 py-2.5 text-xs font-black text-white transition shadow-lg self-start sm:self-auto"
          >
            <Crown className="h-4 w-4 text-yellow-300" />
            Changer ou Upgrader de Plan
          </Link>
        </div>
        <h1 className="mt-5 text-3xl font-black sm:text-4xl">Commandes & Factures d&apos;Abonnement</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
          Consultez l&apos;ensemble des commandes d&apos;abonnement effectuées sur la plateforme, téléchargez vos factures officielles et transmettez vos preuves de virement.
        </p>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Investi sur la Plateforme</span>
          <p className="text-3xl font-black text-slate-900">{summary.total_spent_tnd.toFixed(2)} TND</p>
          <p className="text-xs text-slate-500 font-medium">{summary.paid_count} facture(s) acquittée(s)</p>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Commandes en Attente</span>
          <p className="text-3xl font-black text-amber-600">{summary.pending_count}</p>
          <p className="text-xs text-slate-500 font-medium">Reçus de virement ou validation admin</p>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Gestion des Abonnements</span>
          <Link
            href="/hub/dashboard/subscription"
            className="inline-flex items-center gap-1.5 text-sm font-black text-[#B91C1C] hover:underline"
          >
            <span>Voir les détails du plan actuel</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-slate-500 font-medium">Starter, Pro, Agency & Sur-mesure</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          {[
            { id: 'all', label: 'Toutes' },
            { id: 'captured', label: 'Payées' },
            { id: 'pending_review', label: 'En Validation' },
            { id: 'pending_proof', label: 'Attente Reçu' },
            { id: 'cancelled', label: 'Annulées' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par N° commande ou plan..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-[#B91C1C]"
          />
        </div>
      </div>

      {/* Main Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#B91C1C]" />
            <p className="text-xs font-bold text-slate-600">Chargement des commandes d&apos;abonnement...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center">
            <ReceiptText className="w-12 h-12 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-800">Aucune commande d&apos;abonnement trouvée</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Vous n&apos;avez pas encore passé de commande d&apos;abonnement correspondant aux critères sélectionnés.
            </p>
            <Link
              href="/hub/dashboard/subscription"
              className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-[#B91C1C] px-5 py-2.5 text-xs font-bold text-white shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              Découvrir les plans d&apos;abonnement
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">N° Commande</th>
                  <th className="px-6 py-4">Formule</th>
                  <th className="px-6 py-4">Montant</th>
                  <th className="px-6 py-4">Mode de Paiement</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions / Facture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {orders.map((ord) => {
                  const badge = STATUS_BADGES[ord.status] || STATUS_BADGES.pending;
                  const isPaid = ord.status === 'captured' || ord.status === 'paid';
                  const isPendingProof = ord.status === 'pending_proof' || ord.status === 'pending';

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        #{ord.id.slice(-10)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-extrabold text-slate-900 uppercase">
                          {ord.target_plan}
                        </span>
                        {ord.from_plan && (
                          <span className="text-[11px] text-slate-400 block">
                            (Depuis {ord.from_plan})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900">
                        {Number(ord.amount).toFixed(2)} {ord.currency || 'TND'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {GATEWAY_NAMES[ord.gateway] || ord.gateway}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(ord.created_at).toLocaleDateString('fr-TN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text}`}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isPaid && (
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(ord)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 hover:bg-slate-100 shadow-sm"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                            <span>Facture</span>
                          </button>
                        )}

                        {isPendingProof && (
                          <button
                            type="button"
                            onClick={() => setUploadModalOrder(ord)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 font-bold text-white hover:bg-amber-700 shadow-sm"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Reçu</span>
                          </button>
                        )}

                        {(ord.status === 'pending' || ord.status === 'pending_proof') && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(ord.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-rose-600 hover:bg-rose-50"
                          >
                            <span>Annuler</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-semibold">
              Page {page} sur {totalPages} ({totalRecords} enregistrement(s))
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Précédent</span>
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-50"
              >
                <span>Suivant</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl space-y-6 my-8 print:p-0 print:shadow-none">
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-[#B91C1C]">PandaMarket Platform</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">FACTURE DE SERVICE</h2>
                <p className="text-xs font-mono text-slate-500 mt-0.5">Réf: INV-{selectedInvoice.id.slice(-8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 rounded-full text-xs">
                  ✓ PAYÉE & ACQUITTÉE
                </span>
                <p className="text-xs text-slate-500 mt-2">
                  Date: {new Date(selectedInvoice.created_at).toLocaleDateString('fr-TN')}
                </p>
              </div>
            </div>

            {/* Billed To / Company Details */}
            <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Prestataire</span>
                <p className="font-black text-slate-900">PandaMarket SARL</p>
                <p className="text-slate-600">Plateforme E-Commerce B2B</p>
                <p className="text-slate-600">MF: 1234567/A/P/000</p>
                <p className="text-slate-600">Tunis, Tunisie</p>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">Bénéficiaire / Boutique</span>
                <p className="font-black text-slate-900">N° Store #{selectedInvoice.store_id.slice(-8)}</p>
                <p className="text-slate-600">Abonnement Formule {selectedInvoice.target_plan.toUpperCase()}</p>
                <p className="text-slate-600">Règlement via {GATEWAY_NAMES[selectedInvoice.gateway] || selectedInvoice.gateway}</p>
              </div>
            </div>

            {/* Invoice Line Items */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Description du Service</th>
                    <th className="p-3">Période</th>
                    <th className="p-3 text-right">Montant (TND)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">
                        Abonnement Plateforme — Plan {selectedInvoice.target_plan.toUpperCase()}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Accès complet au catalogue, builder et outils marketplace
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">1 An</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {Number(selectedInvoice.amount).toFixed(2)} TND
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Invoice Totals */}
            <div className="flex justify-between items-center pt-2">
              <div className="text-xs text-slate-500 space-y-1">
                <p>TVA non applicable / Exonérée d&apos;impôt direct</p>
                <p>Facture générée automatiquement par la plateforme PandaMarket</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-bold uppercase block">Total Net Payé</span>
                <span className="text-2xl font-black text-slate-900">{Number(selectedInvoice.amount).toFixed(2)} TND</span>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-md"
              >
                <Printer className="w-4 h-4" />
                Imprimer la Facture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Proof Modal */}
      {uploadModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Transmettre le Reçu de Paiement</h3>
                <p className="text-xs text-slate-500">Commande #{uploadModalOrder.id.slice(-8)} — Plan {uploadModalOrder.target_plan.toUpperCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Building className="w-4 h-4 text-amber-700" /> Mandat Minute / STB Bancaire
                </p>
                <p>RIB STB : <strong>10 000 0000000000000 00</strong> (PandaMarket SARL)</p>
                <p>Vous pouvez téléverser votre reçu ci-dessous.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">Fichier Reçu / Justificatif (Image/PDF)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#B91C1C] file:text-white hover:file:bg-[#991B1B] cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">OU Lien / URL de l&apos;image</label>
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-2xl text-xs outline-none focus:border-[#B91C1C]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUploadModalOrder(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs hover:bg-slate-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleUploadProof}
                disabled={uploading}
                className="flex-1 py-3 bg-[#B91C1C] text-white font-bold rounded-2xl text-xs hover:bg-[#991B1B] disabled:opacity-50"
              >
                {uploading ? 'Transmission...' : 'Soumettre le Reçu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
