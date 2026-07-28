'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
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
  Banknote,
  AlertCircle,
  RefreshCw,
  Printer,
  Download,
  Trash2,
  Ban,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  ArrowRight,
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
  status: 'pending' | 'pending_proof' | 'pending_review' | 'captured' | 'rejected' | 'failed' | 'cancelled';
  proof_url?: string;
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
  metadata?: any;
}

const PLAN_BADGES: Record<string, string> = {
  free: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  starter: 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200',
  regular: 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-200',
  agency: 'bg-purple-100 dark:bg-purple-950/30 text-purple-800 dark:text-purple-200',
  pro: 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-200',
  golden: 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200',
  platinum: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
};

const PLAN_LIMITS_SUMMARY: Record<string, { products: string; commission: string; features: string }> = {
  free: { products: '10 products', commission: '15%', features: 'Basic storefront' },
  starter: { products: '50 products', commission: '10%', features: 'Custom Domain, Basic Analytics' },
  regular: { products: '250 products', commission: '7%', features: 'Page Builder (5 pages), AI SEO' },
  agency: { products: '1,000 products', commission: '5%', features: 'Unlimited Pages, Custom Domain' },
  pro: { products: 'Unlimited', commission: '0%', features: 'Direct Payment API, Unlimited Pages, Priority AI' },
  golden: { products: 'Unlimited', commission: '0%', features: 'White Label, Dedicated Support, Unlimited AI' },
  platinum: { products: 'Unlimited', commission: '0%', features: 'Enterprise Suite, Own AI Provider, VIP SLA' },
};

export default function SubscriptionOrdersPage() {
  const { t } = useLocale();
  const tr = (t?.('admin.subscriptionOrders') as any) || {};

  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reviewOrder, setReviewOrder] = useState<SubscriptionOrder | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<SubscriptionOrder | null>(null);
  const [quotaOrder, setQuotaOrder] = useState<SubscriptionOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [bulkRejectionReason, setBulkRejectionReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

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
        setError(data?.error?.message || tr.errorReview || 'Failed to load subscription orders');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, gatewayFilter, searchTerm, tr.errorReview]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleReview = async (decision: 'approved' | 'rejected') => {
    if (!reviewOrder) return;
    if (decision === 'rejected' && !rejectionReason.trim()) {
      setError(tr.rejectionReason || 'Please provide a rejection reason.');
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
            ? (tr.approveSuccess || 'Order approved!').replace('{plan}', reviewOrder.target_plan.toUpperCase()).replace('{store}', reviewOrder.store_name)
            : (tr.rejectSuccess || 'Order rejected.')
        );
        setReviewOrder(null);
        setRejectionReason('');
        await fetchOrders();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || tr.errorReview || 'Error during review');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (intentId: string, reason?: string) => {
    if (!confirm(tr.confirmCancel || 'Are you sure you want to cancel this subscription order?')) return;

    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/subscription-orders/${intentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason || tr.bulkReason || 'Cancelled by Superadmin' }),
      });

      if (res.ok) {
        setSuccess(tr.cancelSuccess || 'Order cancelled successfully.');
        await fetchOrders();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || tr.errorCancel || 'Error during cancellation');
      }
    } catch {
      setError('Network error');
    }
  };

  const handleDeleteOrder = async (intentId: string) => {
    if (!confirm(tr.confirmDelete || 'Are you sure you want to permanently delete this order? This action is irreversible.')) return;

    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/subscription-orders/${intentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setSuccess(tr.deleteSuccess || 'Order deleted successfully.');
        await fetchOrders();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || tr.errorDelete || 'Error during deletion');
      }
    } catch {
      setError('Network error');
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'cancel' | 'delete') => {
    if (selectedIds.length === 0) return;
    if (action === 'reject' && !bulkRejectionReason.trim()) {
      setError(tr.bulkReason || 'Please provide a reason for bulk rejection.');
      return;
    }

    const confirmMsg =
      action === 'approve' ? tr.confirmBulkApprove?.replace('{count}', String(selectedIds.length))
      : action === 'reject' ? tr.confirmBulkReject?.replace('{count}', String(selectedIds.length))
      : action === 'cancel' ? tr.confirmBulkCancel?.replace('{count}', String(selectedIds.length))
      : tr.confirmBulkDelete?.replace('{count}', String(selectedIds.length));

    if (!confirm(confirmMsg)) return;

    setBulkSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetchWithCsrf('/api/pd/admin/subscription-orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          intent_ids: selectedIds,
          action,
          reason: bulkRejectionReason || tr.bulkReason || 'Bulk action by Superadmin',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const processed = data.processed ?? 0;
        const total = data.total ?? selectedIds.length;
        if (processed === total) {
          setSuccess(tr.bulkSuccess?.replace('{processed}', String(processed)).replace('{total}', String(total)) || `${processed}/${total} processed.`);
        } else {
          setSuccess(tr.bulkPartial?.replace('{processed}', String(processed)).replace('{total}', String(total)) || `${processed}/${total} succeeded.`);
        }
        setSelectedIds([]);
        setBulkRejectionReason('');
        await fetchOrders();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Bulk action failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      tr.order || 'Order ID',
      tr.storeAndSeller || 'Store Name',
      'Subdomain',
      'Seller Email',
      'From Plan',
      'To Plan',
      'Amount TND',
      'Gateway',
      'Status',
      'Date',
    ];
    const rows = orders.map((o) => [
      o.id,
      `"${o.store_name}"`,
      o.store_subdomain,
      o.seller_email,
      o.from_plan,
      o.target_plan,
      o.amount,
      o.gateway,
      o.status,
      new Date(o.created_at).toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pandamarket_subscription_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const jsonContent = JSON.stringify(orders, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pandamarket_subscription_orders_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingReviewCount = orders.filter((o) => o.status === 'pending_review' || o.status === 'pending_proof').length;
  const capturedCount = orders.filter((o) => o.status === 'captured').length;
  const totalVolume = orders
    .filter((o) => o.status === 'captured')
    .reduce((acc, o) => acc + Number(o.amount), 0);

  const GATEWAY_NAMES: Record<string, string> = {
    manual_mandat: tr.gatewayMandat || 'Mandat Minute / Virement',
    flouci: tr.gatewayFlouci || 'Flouci',
    konnect: tr.gatewayKonnect || 'Konnect',
    paypal: tr.gatewayPaypal || 'PayPal',
    cod: tr.gatewayCod || 'Sur Facture / COD',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Crown className="w-7 h-7 text-[#B91C1C]" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{tr.title || 'Platform Subscription Orders'}</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tr.subtitle || 'Manage and validate seller subscription orders (Mandat Minute, B2B Invoices, Flouci, PayPal, Konnect)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
          >
            <Download className="w-4 h-4" /> {tr.exportCsv || 'Export CSV'}
          </button>
          <button
            onClick={exportJSON}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
          >
            <FileText className="w-4 h-4" /> {tr.exportJson || 'Export JSON'}
          </button>
          <button
            onClick={fetchOrders}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> {tr.refresh || 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr.stats?.pending || 'Pending Orders'}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{pendingReviewCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr.stats?.captured || 'Captured Subscriptions'}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{capturedCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
            <Banknote className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{tr.stats?.volume || 'Total Volume (TND)'}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{totalVolume.toFixed(0)} TND</p>
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold rounded-2xl">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tr.search || 'Search by store, seller email or ID...'}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-[#B91C1C] focus:bg-white dark:focus:bg-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 outline-none"
            >
              <option value="all">{tr.statusFilter || 'All statuses'}</option>
              <option value="pending_review">{tr.statusPendingReview || 'Awaiting validation'}</option>
              <option value="pending_proof">{tr.statusPendingProof || 'Awaiting seller receipt'}</option>
              <option value="captured">{tr.statusCaptured || 'Activated / paid'}</option>
              <option value="rejected">{tr.statusRejected || 'Rejected'}</option>
              <option value="cancelled">{tr.statusCancelled || 'Cancelled'}</option>
              <option value="failed">{tr.statusFailed || 'Failed'}</option>
              <option value="pending">{tr.statusPending || 'In progress'}</option>
            </select>
          </div>

          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value)}
            className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 outline-none"
          >
            <option value="all">{tr.gatewayFilter || 'All methods'}</option>
            <option value="manual_mandat">{GATEWAY_NAMES.manual_mandat}</option>
            <option value="cod">{GATEWAY_NAMES.cod}</option>
            <option value="flouci">{GATEWAY_NAMES.flouci}</option>
            <option value="paypal">{GATEWAY_NAMES.paypal}</option>
            <option value="konnect">{GATEWAY_NAMES.konnect}</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-amber-900 dark:text-amber-100">{tr.bulkActions || 'Bulk actions'}</span>
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded text-xs font-black">
              {tr.selectedCount?.replace('{count}', String(selectedIds.length)) || `${selectedIds.length} selected`}
            </span>
            <button onClick={toggleSelectAll} className="text-xs text-slate-500 dark:text-slate-400 hover:underline">
              {selectedIds.length === orders.length ? (tr.deselectAll || 'Deselect all') : (tr.selectAll || 'Select all')}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleBulkAction('approve')}
              disabled={bulkSubmitting}
              className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 disabled:opacity-50 shadow-sm inline-flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> {tr.bulkApprove || 'Approve selection'}
            </button>
            <button
              onClick={() => handleBulkAction('reject')}
              disabled={bulkSubmitting}
              className="px-3 py-1.5 bg-red-600 text-white font-bold rounded-lg text-xs hover:bg-red-700 disabled:opacity-50 shadow-sm inline-flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" /> {tr.bulkReject || 'Reject selection'}
            </button>
            <button
              onClick={() => handleBulkAction('cancel')}
              disabled={bulkSubmitting}
              className="px-3 py-1.5 bg-slate-600 text-white font-bold rounded-lg text-xs hover:bg-slate-700 disabled:opacity-50 shadow-sm inline-flex items-center gap-1"
            >
              <Ban className="w-3.5 h-3.5" /> {tr.bulkCancel || 'Cancel selection'}
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={bulkSubmitting}
              className="px-3 py-1.5 bg-red-700 text-white font-bold rounded-lg text-xs hover:bg-red-800 disabled:opacity-50 shadow-sm inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> {tr.bulkDelete || 'Delete selection'}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Rejection Reason Input (shows when reject selected in bulk) */}
      {selectedIds.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            {tr.bulkReason || 'Common reason (required for bulk rejection)'}
          </label>
          <textarea
            value={bulkRejectionReason}
            onChange={(e) => setBulkRejectionReason(e.target.value)}
            placeholder={tr.rejectionPlaceholder || 'Indicate the rejection reason...'}
            rows={2}
            className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#B91C1C] bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">{tr.loading || 'Loading subscription orders...'}</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Crown className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-300">{tr.empty || 'No subscription order found'}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{tr.emptyHint || 'Try adjusting your search filters.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-4 w-10">
                    <button onClick={toggleSelectAll} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                      {selectedIds.length === orders.length && orders.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#B91C1C]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-4">{tr.order || 'Order'}</th>
                  <th className="px-4 py-4">{tr.storeAndSeller || 'Store & Seller'}</th>
                  <th className="px-4 py-4">{tr.planChange || 'Plan Change'}</th>
                  <th className="px-4 py-4">{tr.amount || 'Amount'}</th>
                  <th className="px-4 py-4">{tr.method || 'Method'}</th>
                  <th className="px-4 py-4">{tr.receiptInvoice || 'Receipt / Invoice'}</th>
                  <th className="px-4 py-4">{tr.status || 'Status'}</th>
                  <th className="px-4 py-4 text-right">{tr.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium text-slate-700 dark:text-slate-300">
                {orders.map((order) => {
                  const isSelected = selectedIds.includes(order.id);
                  return (
                    <tr key={order.id} className={`hover:bg-slate-50/70 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''}`}>
                      <td className="px-4 py-4">
                        <button onClick={() => toggleSelectOrder(order.id)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-[#B91C1C]" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-4 font-mono text-[#B91C1C] font-bold">
                        #{order.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">{order.store_name}</span>
                          <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">{order.store_subdomain}.pandamarket.tn</span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">{order.seller_email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {order.from_plan.toUpperCase()}
                          </span>
                          <span>→</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${PLAN_BADGES[order.target_plan] || 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                            {order.target_plan.toUpperCase()}
                          </span>
                          <button
                            onClick={() => setQuotaOrder(order)}
                            title="Compare Quotas"
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-black text-slate-900 dark:text-white text-sm">
                        {Number(order.amount).toFixed(0)} TND
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {GATEWAY_NAMES[order.gateway] || order.gateway}
                        </span>
                      </td>
                      <td className="px-4 py-4 space-x-1">
                        {order.proof_url ? (
                          <a
                            href={order.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" /> {tr.proof || 'Receipt'} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">{tr.proofNone || 'Not provided'}</span>
                        )}
                        <button
                          onClick={() => setInvoiceOrder(order)}
                          title={tr.invoice || 'Print B2B Invoice'}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 ml-1"
                        >
                          <Printer className="w-3.5 h-3.5" /> {tr.invoice || 'Invoice'}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        {order.status === 'captured' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {tr.statusCaptured || 'Activated / Paid'}
                          </span>
                        )}
                        {order.status === 'pending_review' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 animate-pulse">
                            <Clock className="w-3.5 h-3.5" /> {tr.statusPendingReview || 'To Validate'}
                          </span>
                        )}
                        {order.status === 'pending_proof' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200">
                            <FileText className="w-3.5 h-3.5" /> {tr.statusPendingProof || 'Awaiting Receipt'}
                          </span>
                        )}
                        {order.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-200">
                            <XCircle className="w-3.5 h-3.5" /> {tr.statusRejected || 'Rejected'}
                          </span>
                        )}
                        {order.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            <Ban className="w-3.5 h-3.5" /> {tr.statusCancelled || 'Cancelled'}
                          </span>
                        )}
                        {order.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {tr.statusPending || 'In progress'}
                          </span>
                        )}
                        {order.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-200">
                            <XCircle className="w-3.5 h-3.5" /> {tr.statusFailed || 'Failed'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {order.status === 'pending_review' || order.status === 'pending_proof' ? (
                          <button
                            onClick={() => setReviewOrder(order)}
                            className="px-3 py-1.5 bg-[#B91C1C] text-white font-bold rounded-lg text-xs hover:bg-[#991B1B] shadow-sm inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> {tr.review || 'Review & Validate'}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setReviewOrder(order)}
                              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-1 mr-1"
                            >
                              {tr.details || 'Details'}
                            </button>
                            {((order.status as string) === 'pending' || (order.status as string) === 'pending_review' || (order.status as string) === 'pending_proof') && (
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-bold rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1 mr-1"
                              >
                                <Ban className="w-3.5 h-3.5" /> {tr.cancel || 'Cancel'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-bold rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> {tr.delete || 'Delete'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Approve Modal */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {tr.reviewTitle || 'Order validation'} #{reviewOrder.id.slice(-8).toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {tr.storeAndSeller || 'Store'}: <span className="font-bold text-slate-900 dark:text-white">{reviewOrder.store_name}</span> ({reviewOrder.seller_email})
                </p>
              </div>
              <button
                onClick={() => setReviewOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Vendor & Plan Details */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase">{tr.targetPlan || 'Requested plan'}</p>
                <p className="text-base font-black text-slate-900 dark:text-white">{reviewOrder.target_plan.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase">{tr.expectedAmount || 'Expected amount'}</p>
                <p className="text-base font-black text-[#B91C1C]">{Number(reviewOrder.amount).toFixed(0)} TND</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase">{tr.sellerEmail || 'Seller email'}</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{reviewOrder.seller_email}</p>
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase">{tr.method || 'Method'}</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{GATEWAY_NAMES[reviewOrder.gateway] || reviewOrder.gateway}</p>
              </div>
            </div>

            {/* Proof Preview */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">{tr.proofTitle || 'Receipt / proof submitted'}</h4>
              {reviewOrder.proof_url ? (
                <div className="space-y-2">
                  <a
                    href={reviewOrder.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-all border border-blue-200 dark:border-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" /> {tr.viewProof || 'View document'}
                  </a>
                  {/\.(jpg|jpeg|png|webp)/i.test(reviewOrder.proof_url) && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48">
                      <img src={reviewOrder.proof_url} alt="Proof" className="w-full object-contain max-h-48 bg-slate-900/5" />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                  {tr.proofMissing || 'The seller submitted the order without a direct receipt. You can validate manually upon receiving the transfer on the PandaMarket account.'}
                </p>
              )}
            </div>

            {/* Rejection Reason (If rejecting) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{tr.rejectionReason || 'Rejection reason (required if rejected)'}</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={tr.rejectionPlaceholder || 'Indicate the rejection reason...'}
                rows={2}
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-[#B91C1C] bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleReview('rejected')}
                disabled={submitting}
                className="flex-1 py-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold rounded-xl text-xs hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-50"
              >
                {tr.reject || 'Reject order'}
              </button>
              <button
                onClick={() => handleReview('approved')}
                disabled={submitting}
                className="flex-1 py-3 bg-[#B91C1C] text-white font-bold rounded-xl text-xs hover:bg-[#991B1B] shadow-md disabled:opacity-50"
              >
                {submitting ? (tr.approving || 'Activating...') : `${tr.approve || 'Approve & activate plan'} ${reviewOrder.target_plan.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B2B Proforma Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 my-8 text-slate-900 dark:text-white">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-6">
              <div>
                <h2 className="text-2xl font-black text-[#B91C1C]">PandaMarket SARL</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Plateforme B2B e-Commerce & Marketplace</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">MF / CIN: 01234567 • Tunis, Tunisie</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs rounded-full uppercase">{tr.invoiceTitle || 'PROFORMA INVOICE B2B'}</span>
                <p className="text-xs font-mono font-bold mt-2">{tr.invoiceNumber || 'No.'} : SUB-{invoiceOrder.id.slice(-8).toUpperCase()}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tr.invoiceDate || 'Date'} : {new Date(invoiceOrder.created_at).toLocaleDateString('fr-TN')}</p>
              </div>
            </div>

            {/* Vendor Client Info */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between text-xs">
              <div>
                <p className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px]">{tr.invoiceClient || 'Client / seller'} :</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{invoiceOrder.store_name}</p>
                <p className="text-slate-600 dark:text-slate-400">Subdomaine: {invoiceOrder.store_subdomain}.pandamarket.tn</p>
                <p className="text-slate-600 dark:text-slate-400">Email: {invoiceOrder.seller_email}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px]">{tr.invoicePayMode || 'Payment method'} :</p>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{GATEWAY_NAMES[invoiceOrder.gateway] || invoiceOrder.gateway}</p>
                <p className="text-slate-600 dark:text-slate-400">{tr.invoiceStatus || 'Status'} : <span className="font-bold uppercase">{invoiceOrder.status}</span></p>
              </div>
            </div>

            {/* Invoice Items Table */}
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase">
                  <th className="py-2">{tr.invoiceDesignation || 'Designation'}</th>
                  <th className="py-2 text-center">{tr.invoiceDuration || 'Duration'}</th>
                  <th className="py-2 text-right">{tr.invoiceAmountHt || 'Amount HT'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
                <tr>
                  <td className="py-3">
                    <p className="font-bold text-slate-900 dark:text-white">{tr.invoiceAnnual || 'Annual subscription'} {invoiceOrder.target_plan.toUpperCase()}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{tr.invoiceAnnualDesc || 'Unlimited access to e-Commerce features & platform services'}</p>
                  </td>
                  <td className="py-3 text-center">{tr.invoiceYear || '1 year (365 days)'}</td>
                  <td className="py-3 text-right font-bold">{Number(invoiceOrder.amount).toFixed(3)} TND</td>
                </tr>
              </tbody>
            </table>

            {/* Total */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs text-right">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{tr.invoiceSubtotal || 'Subtotal HT'} :</span>
                  <span className="font-bold">{Number(invoiceOrder.amount).toFixed(3)} TND</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{tr.invoiceVat || 'VAT (0% exempt)'} :</span>
                  <span className="font-bold">0.000 TND</span>
                </div>
                <div className="flex justify-between text-base font-black text-[#B91C1C] border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span>{tr.invoiceTotal || 'Total TTC'} :</span>
                  <span>{Number(invoiceOrder.amount).toFixed(3)} TND</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setInvoiceOrder(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {tr.close || 'Close'}
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-[#B91C1C] text-white font-bold rounded-xl text-xs hover:bg-[#991B1B] shadow-md flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> {tr.invoicePrint || 'Print / PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quota & Plan Comparison Drawer */}
      {quotaOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {tr.quotaTitle || 'Quotas & limits comparison'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr.quotaStore || 'Store'}: {quotaOrder.store_name}</p>
              </div>
              <button onClick={() => setQuotaOrder(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <p className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px]">{tr.quotaOldPlan || 'Old plan'} ({quotaOrder.from_plan.toUpperCase()})</p>
                <p className="font-bold text-slate-900 dark:text-white">• {tr.quotaProducts || 'Products'}: {PLAN_LIMITS_SUMMARY[quotaOrder.from_plan]?.products || tr.quotaStandard || 'Standard'}</p>
                <p className="font-bold text-slate-900 dark:text-white">• {tr.quotaCommission || 'Commission'}: {PLAN_LIMITS_SUMMARY[quotaOrder.from_plan]?.commission || '15%'}</p>
                <p className="text-slate-600 dark:text-slate-400">• {tr.quotaFeatures || 'Features'}: {PLAN_LIMITS_SUMMARY[quotaOrder.from_plan]?.features || tr.quotaStandard || 'Standard'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 space-y-2">
                <p className="font-bold text-red-700 dark:text-red-300 uppercase text-[10px]">{tr.quotaNewPlan || 'New plan'} ({quotaOrder.target_plan.toUpperCase()})</p>
                <p className="font-bold text-slate-900 dark:text-white">• {tr.quotaProducts || 'Products'}: {PLAN_LIMITS_SUMMARY[quotaOrder.target_plan]?.products || tr.quotaUnlimited || 'Unlimited'}</p>
                <p className="font-bold text-slate-900 dark:text-white">• {tr.quotaCommission || 'Commission'}: {PLAN_LIMITS_SUMMARY[quotaOrder.target_plan]?.commission || '0%'}</p>
                <p className="text-slate-600 dark:text-slate-400">• {tr.quotaFeatures || 'Features'}: {PLAN_LIMITS_SUMMARY[quotaOrder.target_plan]?.features || tr.quotaUnlimited || 'Unlimited'}</p>
              </div>
            </div>

            <button
              onClick={() => setQuotaOrder(null)}
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              {tr.close || 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}