'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState, useMemo } from 'react';
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
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  History,
  TrendingUp,
  CreditCard,
  X,
  FileJson,
  PauseCircle,
  PlayCircle,
  Calendar,
  DollarSign,
  Calculator,
  Gift,
  Activity,
  Radio,
  Bookmark,
  RotateCcw,
  Copy,
  Send,
  MoreVertical,
  MessageSquare,
  ShieldAlert,
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
  gateway_reference?: string;
  checkout_url?: string;
  status: 'pending' | 'pending_proof' | 'pending_review' | 'captured' | 'rejected' | 'failed' | 'cancelled' | 'expired';
  proof_url?: string;
  rejection_reason?: string;
  created_at: string;
  expires_at?: string;
  reviewed_at?: string;
  metadata?: any;
}

interface ActivityLog {
  id: string;
  action: string;
  actor_id?: string;
  actor_type: string;
  actor_email?: string;
  metadata: any;
  created_at: string;
}

interface WebhookLog {
  id: string;
  intent_id?: string;
  gateway: string;
  event_type: string;
  status: 'success' | 'failed' | 'pending_retry';
  payload: any;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

interface StatsData {
  gateway_breakdown: Array<{ gateway: string; count: number; total_amount: number }>;
  plan_breakdown: Array<{ target_plan: string; count: number }>;
  revenue_this_month: number;
  revenue_last_month: number;
  captured_count: number;
  rejected_count: number;
  pending_proof_count: number;
  pending_review_count: number;
  avg_review_hours: number;
  conversion_rate: number;
  rejection_rate: number;
}

interface ProrationData {
  current_plan: string;
  target_plan: string;
  remaining_days: number;
  current_yearly_price: number;
  target_yearly_price: number;
  unused_current_credit: number;
  remaining_target_cost: number;
  net_proration_amount: number;
  available_store_credits: number;
}

interface AdjustmentRecord {
  id: string;
  type: string;
  amount: number;
  currency: string;
  reason?: string;
  created_by_email?: string;
  created_at: string;
}

const GATEWAY_NAMES: Record<string, string> = {
  manual_mandat: 'Mandat Minute / Virement',
  flouci: 'Flouci',
  konnect: 'Konnect',
  paypal: 'PayPal',
  cod: 'Sur Facture / COD',
};

const PLAN_BADGES: Record<string, string> = {
  free: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  starter: 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200',
  regular: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200',
  agency: 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200',
  pro: 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200',
  golden: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200',
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

function safeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export default function SubscriptionOrdersPage() {
  const { t, dir } = useLocale();
  const tr = (t?.('admin.subscriptionOrders') as any) || {};

  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, total_pages: 1 });
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters & Sorting
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [targetPlanFilter, setTargetPlanFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);

  // Batch Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRejectionReason, setBulkRejectionReason] = useState<string>('');
  const [bulkMigrationTargetPlan, setBulkMigrationTargetPlan] = useState<string>('pro');

  // Modals & Drawers
  const [reviewOrder, setReviewOrder] = useState<SubscriptionOrder | null>(null);
  const [drawerOrder, setDrawerOrder] = useState<SubscriptionOrder | null>(null);
  const [drawerLogs, setDrawerLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const [invoiceOrder, setInvoiceOrder] = useState<SubscriptionOrder | null>(null);
  const [quotaOrder, setQuotaOrder] = useState<SubscriptionOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Diagnostics & Webhook Modal
  const [diagnosticsOrder, setDiagnosticsOrder] = useState<SubscriptionOrder | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  // Lifecycle Feature Modals
  const [prorationOrder, setProrationOrder] = useState<SubscriptionOrder | null>(null);
  const [prorationData, setProrationData] = useState<ProrationData | null>(null);
  const [prorationTargetPlan, setProrationTargetPlan] = useState<string>('pro');
  const [prorationTiming, setProrationTiming] = useState<'immediate' | 'next_cycle'>('immediate');

  const [pauseModalOrder, setPauseModalOrder] = useState<SubscriptionOrder | null>(null);
  const [pauseResumeDate, setPauseResumeDate] = useState<string>('');

  const [extendModalOrder, setExtendModalOrder] = useState<SubscriptionOrder | null>(null);
  const [extendType, setExtendType] = useState<'trial' | 'grace_period'>('trial');
  const [extensionDays, setExtensionDays] = useState<number>(14);

  const [creditModalOrder, setCreditModalOrder] = useState<SubscriptionOrder | null>(null);
  const [creditType, setCreditType] = useState<'credit' | 'discount' | 'refund'>('credit');
  const [creditAmount, setCreditAmount] = useState<string>('50');
  const [creditReasonText, setCreditReasonText] = useState<string>('');
  const [storeAdjustments, setStoreAdjustments] = useState<AdjustmentRecord[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/admin/subscription-orders/stats', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch {
      // Ignore stats error silently
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (gatewayFilter !== 'all') params.append('gateway', gatewayFilter);
      if (targetPlanFilter !== 'all') params.append('target_plan', targetPlanFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (minAmount) params.append('min_amount', minAmount);
      if (maxAmount) params.append('max_amount', maxAmount);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      params.append('page', String(page));
      params.append('limit', '20');

      const res = await fetchWithCsrf(`/api/pd/admin/subscription-orders?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.subscription_orders || []);
        if (data.pagination) setPagination(data.pagination);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || tr.errorReview || 'Failed to load subscription orders');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, gatewayFilter, targetPlanFilter, searchTerm, fromDate, toDate, minAmount, maxAmount, sortBy, sortOrder, page, tr.errorReview]);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders, fetchStats]);

  // Dynamic Sticky Summary Calculation based on filtered table data
  const filteredMetrics = useMemo(() => {
    let totalArr = 0;
    let activeCount = 0;
    let pastDueCount = 0;
    let failedCount = 0;
    let cancelledCount = 0;

    orders.forEach((o) => {
      const amt = Number(o.amount || 0);
      totalArr += amt;

      if (o.status === 'captured') activeCount++;
      else if (o.status === 'pending_proof' || o.status === 'pending_review') pastDueCount++;
      else if (o.status === 'rejected' || o.status === 'failed') failedCount++;
      else if (o.status === 'cancelled' || o.status === 'expired') cancelledCount++;
    });

    const totalCount = orders.length || 1;
    const activeRatio = ((activeCount / totalCount) * 100).toFixed(1);
    const mrr = (totalArr / 12).toFixed(0);

    return {
      totalArr: totalArr.toFixed(0),
      mrr,
      activeCount,
      pastDueCount,
      activeRatio,
      failedCount,
      cancelledCount,
    };
  }, [orders]);

  // Presets
  const applyPreset = (preset: string) => {
    setPage(1);
    if (preset === 'high_value') {
      setStatusFilter('all');
      setGatewayFilter('all');
      setTargetPlanFilter('all');
      setMinAmount('400');
      setMaxAmount('');
    } else if (preset === 'pending_mandats') {
      setStatusFilter('pending_proof');
      setGatewayFilter('manual_mandat');
      setTargetPlanFilter('all');
      setMinAmount('');
      setMaxAmount('');
    } else if (preset === 'pending_review') {
      setStatusFilter('pending_review');
      setGatewayFilter('all');
      setTargetPlanFilter('all');
      setMinAmount('');
      setMaxAmount('');
    } else if (preset === 'pro_upgrades') {
      setStatusFilter('all');
      setGatewayFilter('all');
      setTargetPlanFilter('pro');
      setMinAmount('');
      setMaxAmount('');
    } else if (preset === 'reset') {
      setStatusFilter('all');
      setGatewayFilter('all');
      setTargetPlanFilter('all');
      setSearchTerm('');
      setFromDate('');
      setToDate('');
      setMinAmount('');
      setMaxAmount('');
    }
  };

  const fetchActivityLogs = async (intentId: string) => {
    setLoadingLogs(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/subscription-orders/${intentId}/activity`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDrawerLogs(data.activity_logs || []);
      }
    } catch {
      // Ignore log fetch error
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleAddAdminNote = async () => {
    if (!drawerOrder || !adminNoteInput.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/subscription-orders/${drawerOrder.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note: adminNoteInput.trim() }),
      });
      if (res.ok) {
        setAdminNoteInput('');
        fetchActivityLogs(drawerOrder.id);
      }
    } catch {
      // Ignore note add error
    } finally {
      setSubmittingNote(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(`Copied ${label} to clipboard!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const fetchDiagnostics = async (intentId?: string) => {
    setLoadingDiagnostics(true);
    try {
      const url = intentId
        ? `/api/pd/admin/subscription-orders/diagnostics?intent_id=${intentId}`
        : '/api/pd/admin/subscription-orders/diagnostics';
      const res = await fetchWithCsrf(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setWebhookLogs(data.webhook_logs || []);
      }
    } catch {
      // Ignore diagnostics fetch error
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  const openDrawer = (order: SubscriptionOrder) => {
    setDrawerOrder(order);
    fetchActivityLogs(order.id);
  };

  const openDiagnostics = (order: SubscriptionOrder) => {
    setDiagnosticsOrder(order);
    fetchDiagnostics(order.id);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

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

  const handleReview = async (decision: 'approved' | 'rejected', orderToReview = reviewOrder) => {
    if (!orderToReview) return;
    if (decision === 'rejected' && !rejectionReason.trim()) {
      setError(tr.rejectionReason || 'Veuillez fournir un motif de refus.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetchWithCsrf(`/api/pd/admin/subscription-orders/${orderToReview.id}/review`, {
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
            ? (tr.approveSuccess || '🎉 Commande d\'abonnement approuvée !').replace('{plan}', orderToReview.target_plan.toUpperCase()).replace('{store}', orderToReview.store_name)
            : tr.rejectSuccess || 'Commande refusée. Motif transmis au vendeur.'
        );
        setReviewOrder(null);
        setDrawerOrder(null);
        setRejectionReason('');
        await fetchOrders();
        await fetchStats();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || tr.errorReview || 'Erreur lors de la révision');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  // Lifecycle Action Handlers
  const handleCalculateProration = async (storeId: string, plan: string) => {
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/subscription-orders/proration?store_id=${storeId}&target_plan=${plan}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProrationData(data);
      }
    } catch {
      // Ignore proration fetch error
    }
  };

  const handleExecuteProrationSwitch = async () => {
    if (!prorationOrder) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/subscription-orders/manual-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          store_id: prorationOrder.store_id,
          target_plan: prorationTargetPlan,
          effective_timing: prorationTiming,
        }),
      });
      if (res.ok) {
        setSuccess(`🎉 Plan changé avec succès vers ${prorationTargetPlan.toUpperCase()} (${prorationTiming === 'immediate' ? 'Immédiat' : 'Prochain cycle'}) !`);
        setProrationOrder(null);
        setProrationData(null);
        await fetchOrders();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Erreur lors du changement de plan');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePauseSubscription = async () => {
    if (!pauseModalOrder) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/subscription-orders/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          store_id: pauseModalOrder.store_id,
          resume_at: pauseResumeDate || undefined,
        }),
      });
      if (res.ok) {
        setSuccess(`Abonnement de la boutique ${pauseModalOrder.store_name} mis en pause.`);
        setPauseModalOrder(null);
        await fetchOrders();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Erreur lors de la mise en pause');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResumeSubscription = async (storeId: string) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/subscription-orders/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ store_id: storeId }),
      });
      if (res.ok) {
        setSuccess('Abonnement réactivé avec succès !');
        await fetchOrders();
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!extendModalOrder) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/subscription-orders/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          store_id: extendModalOrder.store_id,
          type: extendType,
          extension_days: extensionDays,
        }),
      });
      if (res.ok) {
        setSuccess(`Période de ${extendType === 'trial' ? 'essai' : 'grâce'} prolongée de ${extensionDays} jours !`);
        setExtendModalOrder(null);
        await fetchOrders();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Erreur lors de la prolongation');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAdjustment = async () => {
    if (!creditModalOrder) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/subscription-orders/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          store_id: creditModalOrder.store_id,
          intent_id: creditModalOrder.id,
          type: creditType,
          amount: creditAmount,
          reason: creditReasonText || undefined,
        }),
      });
      if (res.ok) {
        setSuccess(`Ajustement / crédit de ${creditAmount} TND appliqué avec succès !`);
        setCreditModalOrder(null);
        await fetchOrders();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Erreur d\'ajustement');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchStoreAdjustments = async (storeId: string) => {
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/subscription-orders/adjustments/${storeId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStoreAdjustments(data.adjustments || []);
      }
    } catch {
      // Ignore adjustment fetch error
    }
  };

  const handleCancelOrder = async (intentId: string) => {
    if (!confirm(tr.confirmCancel || 'Voulez-vous vraiment annuler cette commande d\'abonnement ?')) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/subscription-orders/${intentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Cancelled by admin' }),
      });
      if (res.ok) {
        setSuccess(tr.cancelSuccess || 'Commande annulée avec succès.');
        if (drawerOrder?.id === intentId) setDrawerOrder(null);
        await fetchOrders();
        await fetchStats();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || tr.errorCancel || 'Erreur d\'annulation');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrder = async (intentId: string) => {
    if (!confirm(tr.confirmDelete || 'Voulez-vous vraiment supprimer définitivement cette commande ? Irréversible.')) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/subscription-orders/${intentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setSuccess(tr.deleteSuccess || 'Commande supprimée avec succès.');
        if (drawerOrder?.id === intentId) setDrawerOrder(null);
        await fetchOrders();
        await fetchStats();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || tr.errorDelete || 'Erreur de suppression');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'cancel' | 'delete' | 'pause' | 'resume' | 'migrate' | 'retry') => {
    if (selectedIds.length === 0) return;
    if (action === 'reject' && !bulkRejectionReason.trim()) {
      setError(tr.bulkReason || 'Motif commun requis pour le refus groupé.');
      return;
    }

    const selectedStoreIds = orders.filter((o) => selectedIds.includes(o.id)).map((o) => o.store_id);

    const confirmMsg =
      action === 'approve' ? tr.confirmBulkApprove?.replace('{count}', String(selectedIds.length)) :
      action === 'reject' ? tr.confirmBulkReject?.replace('{count}', String(selectedIds.length)) :
      action === 'cancel' ? tr.confirmBulkCancel?.replace('{count}', String(selectedIds.length)) :
      action === 'pause' ? `Mettre en pause les ${selectedIds.length} abonnements sélectionnés ?` :
      action === 'resume' ? `Réactiver les ${selectedIds.length} abonnements sélectionnés ?` :
      action === 'migrate' ? `Faire migrer les ${selectedIds.length} abonnements vers ${bulkMigrationTargetPlan.toUpperCase()} ?` :
      action === 'retry' ? `Relancer la vérification de paiement pour ${selectedIds.length} commandes ?` :
      tr.confirmBulkDelete?.replace('{count}', String(selectedIds.length));

    if (!confirm(confirmMsg || `Procéder à l'action groupée (${action}) sur ${selectedIds.length} commande(s) ?`)) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/subscription-orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          intent_ids: selectedIds,
          store_ids: selectedStoreIds,
          action,
          reason: bulkRejectionReason.trim() || undefined,
          target_plan: action === 'migrate' ? bulkMigrationTargetPlan : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuccess((tr.bulkSuccess || 'Opération effectuée : {processed}/{total} traitée(s).').replace('{processed}', String(data.processed)).replace('{total}', String(data.total)));
        setSelectedIds([]);
        setBulkRejectionReason('');
        await fetchOrders();
        await fetchStats();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Erreur lors de l\'action groupée');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Order ID', 'Store Name', 'Subdomain', 'Seller Email', 'From Plan', 'Target Plan', 'Amount TND', 'Gateway', 'Status', 'Proof URL', 'Created At'];
    const rows = orders.map((o) => [
      safeCsvValue(o.id),
      safeCsvValue(o.store_name),
      safeCsvValue(o.store_subdomain),
      safeCsvValue(o.seller_email),
      safeCsvValue(o.from_plan),
      safeCsvValue(o.target_plan),
      safeCsvValue(o.amount),
      safeCsvValue(o.gateway),
      safeCsvValue(o.status),
      safeCsvValue(o.proof_url || ''),
      safeCsvValue(new Date(o.created_at).toISOString()),
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
    const blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pandamarket_subscription_orders_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div dir={dir} className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Crown className="w-8 h-8 text-[#B91C1C]" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {tr.title || 'Platform Subscription Orders'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tr.subtitle || 'Manage and review vendor subscription orders across Mandat Minute, B2B Invoices, Flouci, PayPal & Konnect'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
          >
            <Download className="w-4 h-4" /> {tr.exportCsv || 'Export CSV'}
          </button>
          <button
            onClick={exportJSON}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
          >
            <FileJson className="w-4 h-4" /> {tr.exportJson || 'Export JSON'}
          </button>
          <button
            onClick={() => { fetchOrders(); fetchStats(); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> {tr.refresh || 'Refresh'}
          </button>
        </div>
      </div>

      {/* Sticky Dynamic Top Summary Analytics Bar */}
      <div className="sticky top-2 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-md transition-all">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filtered MRR / ARR</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {filteredMetrics.mrr} TND <span className="text-xs font-normal text-slate-400">/mo ({filteredMetrics.totalArr} TND ARR)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active vs Past-Due Ratio</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {filteredMetrics.activeRatio}% <span className="text-xs font-normal text-slate-400">({filteredMetrics.activeCount} Active / {filteredMetrics.pastDueCount} Past Due)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-xl text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Failed / Rejected Count</p>
              <p className="text-lg font-black text-red-600 dark:text-red-400">
                {filteredMetrics.failedCount} <span className="text-xs font-normal text-slate-400">orders</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cancelled / Expired</p>
              <p className="text-lg font-black text-slate-700 dark:text-slate-300">
                {filteredMetrics.cancelledCount} <span className="text-xs font-normal text-slate-400">subscriptions</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Alerts */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold rounded-2xl">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-sm font-medium rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Saved Custom View Presets Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
        <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
          <Bookmark className="w-3.5 h-3.5 text-[#B91C1C]" /> Filter Presets:
        </span>
        <button onClick={() => applyPreset('high_value')} className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 hover:bg-amber-100">
          💰 High-Value (&gt; 400 TND)
        </button>
        <button onClick={() => applyPreset('pending_mandats')} className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100">
          📑 Pending Mandat Proofs
        </button>
        <button onClick={() => applyPreset('pending_review')} className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 hover:bg-purple-100">
          ⏳ Awaiting Admin Review
        </button>
        <button onClick={() => applyPreset('pro_upgrades')} className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 font-bold border border-red-200 dark:border-red-800 hover:bg-red-100">
          👑 Pro/Enterprise Upgrades
        </button>
        <button onClick={() => applyPreset('reset')} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 ml-auto flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Reset Filters
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <CheckSquare className="w-5 h-5 text-amber-600" />
            <span>{(tr.selectedCount || '{count} selected').replace('{count}', String(selectedIds.length))}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              value={bulkRejectionReason}
              onChange={(e) => setBulkRejectionReason(e.target.value)}
              placeholder={tr.bulkReason || 'Rejection reason...'}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none text-xs flex-1 md:flex-initial"
            />

            <select
              value={bulkMigrationTargetPlan}
              onChange={(e) => setBulkMigrationTargetPlan(e.target.value)}
              className="px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold outline-none"
            >
              <option value="starter">Migrate to Starter</option>
              <option value="regular">Migrate to Regular</option>
              <option value="agency">Migrate to Agency</option>
              <option value="pro">Migrate to Pro</option>
              <option value="golden">Migrate to Golden</option>
              <option value="platinum">Migrate to Platinum</option>
            </select>

            <button onClick={() => handleBulkAction('approve')} disabled={submitting} className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50">
              Approve
            </button>
            <button onClick={() => handleBulkAction('reject')} disabled={submitting} className="px-3 py-1.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50">
              Reject
            </button>
            <button onClick={() => handleBulkAction('pause')} disabled={submitting} className="px-3 py-1.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50">
              Pause
            </button>
            <button onClick={() => handleBulkAction('resume')} disabled={submitting} className="px-3 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
              Resume
            </button>
            <button onClick={() => handleBulkAction('migrate')} disabled={submitting} className="px-3 py-1.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50">
              Migrate Plan
            </button>
            <button onClick={() => handleBulkAction('retry')} disabled={submitting} className="px-3 py-1.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50">
              Retry Payment
            </button>
            <button onClick={() => handleBulkAction('cancel')} disabled={submitting} className="px-3 py-1.5 bg-slate-600 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={() => handleBulkAction('delete')} disabled={submitting} className="px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl hover:bg-black disabled:opacity-50">
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filters & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder={tr.search || 'Search by store, email or ID...'}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-[#B91C1C] bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 outline-none"
          >
            <option value="all">{tr.statusFilter || 'All Statuses'}</option>
            <option value="pending_review">⏳ {tr.statusPendingReview || 'Pending Review'}</option>
            <option value="pending_proof">📑 {tr.statusPendingProof || 'Pending Proof'}</option>
            <option value="captured">✅ {tr.statusCaptured || 'Captured / Active'}</option>
            <option value="rejected">❌ {tr.statusRejected || 'Rejected'}</option>
            <option value="cancelled">🚫 {tr.statusCancelled || 'Cancelled'}</option>
            <option value="expired">⚠️ {tr.statusExpired || 'Expired'}</option>
          </select>

          <select
            value={gatewayFilter}
            onChange={(e) => { setGatewayFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 outline-none"
          >
            <option value="all">{tr.gatewayFilter || 'All Gateways'}</option>
            <option value="manual_mandat">{tr.gatewayMandat || 'Mandat Minute / Wire'}</option>
            <option value="cod">{tr.gatewayCod || 'B2B Invoice / COD'}</option>
            <option value="flouci">Flouci</option>
            <option value="paypal">PayPal</option>
            <option value="konnect">Konnect</option>
          </select>

          <select
            value={targetPlanFilter}
            onChange={(e) => { setTargetPlanFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 outline-none"
          >
            <option value="all">All Target Plans</option>
            <option value="starter">Starter</option>
            <option value="regular">Regular</option>
            <option value="agency">Agency</option>
            <option value="pro">Pro</option>
            <option value="golden">Golden</option>
            <option value="platinum">Platinum</option>
          </select>
        </div>

        {/* Date Range & Amount Range Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Min Amount (TND)</label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Max Amount (TND)</label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
              placeholder="10000"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">{tr.loading || 'Loading subscription orders...'}</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Crown className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-300">{tr.empty || 'No subscription orders found'}</p>
            <p className="text-xs text-slate-400">{tr.emptyHint || 'Try adjusting your search or filters.'}</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-4 w-10">
                      <button onClick={toggleSelectAll} className="p-1 text-slate-400 hover:text-slate-700">
                        {selectedIds.length === orders.length && orders.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[#B91C1C]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-4 cursor-pointer" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center gap-1">
                        {tr.order || 'Order'} <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-4 cursor-pointer" onClick={() => handleSort('store_name')}>
                      <div className="flex items-center gap-1">
                        {tr.storeAndSeller || 'Store & Seller'} <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-4 cursor-pointer" onClick={() => handleSort('target_plan')}>
                      <div className="flex items-center gap-1">
                        {tr.planChange || 'Plan Change'} <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-4 cursor-pointer" onClick={() => handleSort('amount')}>
                      <div className="flex items-center gap-1">
                        {tr.amount || 'Amount'} <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-4">{tr.method || 'Gateway'}</th>
                    <th className="px-4 py-4">{tr.receiptInvoice || 'Receipt / Invoice'}</th>
                    <th className="px-4 py-4 cursor-pointer" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">
                        {tr.status || 'Health & Status'} <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right">Inline Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
                  {orders.map((order) => {
                    const isSelected = selectedIds.includes(order.id);
                    return (
                      <tr key={order.id} className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''}`}>
                        <td className="px-4 py-4">
                          <button onClick={() => toggleSelectOrder(order.id)} className="p-1 text-slate-400 hover:text-slate-700">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-[#B91C1C]" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-4 font-mono text-[#B91C1C] font-bold">
                          <div className="flex items-center gap-1">
                            <span className="cursor-pointer hover:underline" onClick={() => openDrawer(order)}>#{order.id.slice(-8).toUpperCase()}</span>
                            <button onClick={() => copyToClipboard(order.id, 'Subscription ID')} className="p-1 text-slate-400 hover:text-slate-700" title="Copy Subscription ID">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-900 dark:text-white cursor-pointer hover:underline" onClick={() => openDrawer(order)}>{order.store_name}</span>
                              <a href={`https://${order.store_subdomain}.pandamarket.tn`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-700" title="Open Storefront">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <span className="text-slate-400 font-mono text-[11px]">{order.store_subdomain}.pandamarket.tn</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px]">{order.seller_email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {order.from_plan.toUpperCase()}
                            </span>
                            <span>→</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${PLAN_BADGES[order.target_plan] || 'bg-slate-100 text-slate-800'}`}>
                              {order.target_plan.toUpperCase()}
                            </span>
                            <button
                              onClick={() => setQuotaOrder(order)}
                              title={tr.quotaTitle || 'Compare Quotas'}
                              className="p-1 text-slate-400 hover:text-slate-700"
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5" /> {tr.proof || 'Proof'} <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">{tr.proofNone || 'None'}</span>
                          )}
                          <button
                            onClick={() => setInvoiceOrder(order)}
                            title={tr.invoiceTitle || 'Print B2B Invoice'}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 ml-1"
                          >
                            <Printer className="w-3.5 h-3.5" /> {tr.invoice || 'Invoice'}
                          </button>
                        </td>
                        {/* Color-Coded Health & Status Badges */}
                        <td className="px-4 py-4">
                          {order.status === 'captured' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Active / Captured
                            </span>
                          )}
                          {order.status === 'pending_review' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                              <Clock className="w-3.5 h-3.5" /> Past-Due / In Review
                            </span>
                          )}
                          {order.status === 'pending_proof' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800">
                              <FileText className="w-3.5 h-3.5" /> Pending Proof (Grace)
                            </span>
                          )}
                          {(order.status === 'rejected' || order.status === 'failed') && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
                              <ShieldAlert className="w-3.5 h-3.5" /> Failed / Dunning (3+ Retries)
                            </span>
                          )}
                          {(order.status === 'cancelled' || order.status === 'expired') && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                              <Ban className="w-3.5 h-3.5" /> Cancelled / Expired
                            </span>
                          )}
                          {order.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Pending Initiation
                            </span>
                          )}
                        </td>
                        {/* Inline Actions Menu */}
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {order.status === 'pending_review' || order.status === 'pending_proof' ? (
                              <button
                                onClick={() => setReviewOrder(order)}
                                className="px-2.5 py-1.5 bg-[#B91C1C] text-white font-bold rounded-lg text-xs hover:bg-[#991B1B] shadow-sm inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> {tr.review || 'Review'}
                              </button>
                            ) : null}

                            <button
                              onClick={() => copyToClipboard(`https://pandamarket.tn/hub/dashboard/subscription?intent_id=${order.id}`, 'Vendor Portal Link')}
                              title="Send / Copy Portal Direct Link"
                              className="p-1.5 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openDiagnostics(order)}
                              title="Webhook & Sync Diagnostics"
                              className="p-1.5 border border-slate-200 dark:border-slate-800 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/40"
                            >
                              <Activity className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => { setProrationOrder(order); setProrationTargetPlan(order.target_plan); handleCalculateProration(order.store_id, order.target_plan); }}
                              title="Prorated Manual Switch"
                              className="p-1.5 border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setPauseModalOrder(order)}
                              title="Pause / Resume"
                              className="p-1.5 border border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setExtendModalOrder(order)}
                              title="Extend Trial / Grace Period"
                              className="p-1.5 border border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40"
                            >
                              <Gift className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => { setCreditModalOrder(order); fetchStoreAdjustments(order.store_id); }}
                              title="One-Off Credits & Adjustments"
                              className="p-1.5 border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openDrawer(order)}
                              className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              {tr.details || 'Details'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div>
                Showing Page <span className="font-bold text-slate-900 dark:text-white">{pagination.page}</span> of{' '}
                <span className="font-bold text-slate-900 dark:text-white">{pagination.total_pages}</span> ({pagination.total} total orders)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Webhook & Diagnostics Modal */}
      {diagnosticsOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Radio className="w-5 h-5 text-teal-600" /> Webhook & Payment Sync Diagnostics
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Order #{diagnosticsOrder.id.slice(-8).toUpperCase()} ({diagnosticsOrder.store_name})</p>
              </div>
              <button onClick={() => setDiagnosticsOrder(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDiagnostics ? (
              <p className="text-xs text-slate-400">Loading webhook event diagnostics...</p>
            ) : webhookLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                No external webhook callbacks received yet for this order.
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {webhookLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white uppercase">{log.gateway} - {log.event_type}</span>
                        {log.status === 'success' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">SYNC SUCCESS</span>
                        )}
                        {log.status === 'failed' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">SYNC FAILED</span>
                        )}
                        {log.status === 'pending_retry' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">PENDING RETRY</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString('fr-TN')}</span>
                    </div>

                    {log.error_message && (
                      <p className="text-red-600 font-mono text-[11px] bg-red-50 dark:bg-red-950/40 p-2 rounded-lg">{log.error_message}</p>
                    )}

                    <pre className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 font-mono text-[10px] text-slate-600 dark:text-slate-400 overflow-x-auto">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setDiagnosticsOrder(null)} className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Proration & Manual Switch Modal */}
      {prorationOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#B91C1C]" /> Prorated Manual Plan Switch
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Boutique: {prorationOrder.store_name}</p>
              </div>
              <button onClick={() => setProrationOrder(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target Plan</label>
                <select
                  value={prorationTargetPlan}
                  onChange={(e) => {
                    setProrationTargetPlan(e.target.value);
                    handleCalculateProration(prorationOrder.store_id, e.target.value);
                  }}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="starter">Starter (50 TND/year)</option>
                  <option value="regular">Regular (150 TND/year)</option>
                  <option value="agency">Agency (400 TND/year)</option>
                  <option value="pro">Pro (800 TND/year)</option>
                  <option value="golden">Golden (1,500 TND/year)</option>
                  <option value="platinum">Platinum (3,000 TND/year)</option>
                </select>
              </div>

              {prorationData && (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs space-y-2">
                  <p className="font-bold text-blue-900 dark:text-blue-200 uppercase text-[10px]">Calcul de Prorata Automatique :</p>
                  <div className="flex justify-between"><span>Jours restants sur plan actuel :</span><span className="font-bold">{prorationData.remaining_days} jours</span></div>
                  <div className="flex justify-between"><span>Crédit plan actuel non utilisé :</span><span className="font-bold text-emerald-600">{prorationData.unused_current_credit.toFixed(3)} TND</span></div>
                  <div className="flex justify-between"><span>Coût plan cible restant :</span><span className="font-bold text-blue-600">{prorationData.remaining_target_cost.toFixed(3)} TND</span></div>
                  <div className="flex justify-between border-t border-blue-200 dark:border-blue-800 pt-2 font-black text-sm">
                    <span>Net à régulariser :</span>
                    <span className={prorationData.net_proration_amount >= 0 ? 'text-[#B91C1C]' : 'text-emerald-600'}>
                      {prorationData.net_proration_amount >= 0 ? `+${prorationData.net_proration_amount.toFixed(3)} TND (À payer)` : `${prorationData.net_proration_amount.toFixed(3)} TND (Crédit)`}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Prise d&apos;effet</label>
                <div className="flex gap-4 text-xs font-bold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="timing"
                      checked={prorationTiming === 'immediate'}
                      onChange={() => setProrationTiming('immediate')}
                    /> Immédiat avec prorata
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="timing"
                      checked={prorationTiming === 'next_cycle'}
                      onChange={() => setProrationTiming('next_cycle')}
                    /> Au prochain cycle d&apos;échéance
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setProrationOrder(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs">
                Annuler
              </button>
              <button onClick={handleExecuteProrationSwitch} disabled={submitting} className="flex-1 py-3 bg-[#B91C1C] text-white font-bold rounded-xl text-xs hover:bg-[#991B1B]">
                {submitting ? 'Application...' : 'Basculer le Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause / Resume Modal */}
      {pauseModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <PauseCircle className="w-5 h-5 text-amber-600" /> Pause & Reprise d&apos;Abonnement
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Boutique: {pauseModalOrder.store_name}</p>
              </div>
              <button onClick={() => setPauseModalOrder(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Mettre en pause l&apos;abonnement bloquera temporairement les limites payantes sans supprimer les données de la boutique.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date de reprise automatique (Optionnel)</label>
                <input
                  type="date"
                  value={pauseResumeDate}
                  onChange={(e) => setPauseResumeDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => handleResumeSubscription(pauseModalOrder.store_id)} disabled={submitting} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700">
                <PlayCircle className="w-4 h-4 inline mr-1" /> Reprendre Direct
              </button>
              <button onClick={handlePauseSubscription} disabled={submitting} className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700">
                Mettre en Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trial & Grace Period Extension Modal */}
      {extendModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-600" /> Prolongation Essai & Période de Grâce
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Boutique: {extendModalOrder.store_name}</p>
              </div>
              <button onClick={() => setExtendModalOrder(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Type de Prolongation</label>
                <select
                  value={extendType}
                  onChange={(e) => setExtendType(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="trial">Période d&apos;essai gratuite (Trial)</option>
                  <option value="grace_period">Période de grâce après échéance (Grace Period)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre de jours à ajouter</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setExtendModalOrder(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs">
                Annuler
              </button>
              <button onClick={handleExtendTrial} disabled={submitting} className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl text-xs hover:bg-purple-700">
                Prolonger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual One-Off Credits & Adjustments Modal */}
      {creditModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" /> Crédits & Ajustements Vendeur
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Boutique: {creditModalOrder.store_name}</p>
              </div>
              <button onClick={() => setCreditModalOrder(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Type d&apos;ajustement</label>
                  <select
                    value={creditType}
                    onChange={(e) => setCreditType(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="credit">Ajout de Crédit Solde (TND)</option>
                    <option value="discount">Remise / Remise Commerciale</option>
                    <option value="refund">Remboursement Partiel</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Montant (TND)</label>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Raison / Note Interne</label>
                <input
                  type="text"
                  value={creditReasonText}
                  onChange={(e) => setCreditReasonText(e.target.value)}
                  placeholder="ex: Geste commercial suite au retard de validation..."
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              {/* Adjustments History */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">Historique des Ajustements</h4>
                {storeAdjustments.length === 0 ? (
                  <p className="text-slate-400 italic">Aucun ajustement enregistré.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {storeAdjustments.map((adj) => (
                      <div key={adj.id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="font-bold uppercase text-[10px] text-slate-700 dark:text-slate-300">{adj.type}</span>
                          <p className="text-[10px] text-slate-500">{adj.reason || 'Pas de motif'}</p>
                        </div>
                        <span className="font-black text-emerald-600">{Number(adj.amount).toFixed(3)} TND</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setCreditModalOrder(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs">
                Annuler
              </button>
              <button onClick={handleAddAdjustment} disabled={submitting} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700">
                Appliquer l&apos;ajustement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rich Slide-Over Drawer for Order Details, Notes & Audit Trail */}
      {drawerOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl overflow-y-auto p-6 sm:p-8 space-y-6 text-slate-900 dark:text-slate-100 border-l border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#B91C1C]">Subscription Slide-Over Inspector</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  #{drawerOrder.id.slice(-8).toUpperCase()}
                  <button onClick={() => copyToClipboard(drawerOrder.id, 'Order ID')} className="p-1 text-slate-400 hover:text-slate-600" title="Copy Subscription ID">
                    <Copy className="w-4 h-4" />
                  </button>
                </h3>
              </div>
              <button onClick={() => setDrawerOrder(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
              <div>
                <p className="text-slate-400 font-bold uppercase">Store Name</p>
                <p className="font-bold text-slate-900 dark:text-white">{drawerOrder.store_name}</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">{drawerOrder.store_subdomain}.pandamarket.tn</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase">Seller Email</p>
                <p className="font-bold text-slate-900 dark:text-white">{drawerOrder.seller_email}</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase">Plan Change</p>
                <p className="font-bold text-slate-900 dark:text-white">{drawerOrder.from_plan.toUpperCase()} → {drawerOrder.target_plan.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase">Amount & Method</p>
                <p className="font-black text-[#B91C1C] text-sm">{Number(drawerOrder.amount).toFixed(0)} TND ({GATEWAY_NAMES[drawerOrder.gateway] || drawerOrder.gateway})</p>
              </div>
            </div>

            {/* Quick Internal Admin Notes Form */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" /> Internal Admin Notes
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Add internal note (e.g. Verified wire receipt via phone...)"
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs outline-none"
                />
                <button
                  onClick={handleAddAdminNote}
                  disabled={submittingNote || !adminNoteInput.trim()}
                  className="px-3 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Note
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Proof of Payment</h4>
              {drawerOrder.proof_url ? (
                <div className="space-y-2">
                  <a
                    href={drawerOrder.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 font-bold text-xs hover:bg-blue-100 transition-all border border-blue-200 dark:border-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Full Receipt Document
                  </a>
                  {/\.(jpg|jpeg|png|webp)/i.test(drawerOrder.proof_url) && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-56">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={drawerOrder.proof_url} alt="Proof" className="w-full object-contain max-h-56 bg-slate-950/5" />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                  No proof receipt file attached to this order yet.
                </p>
              )}
            </div>

            <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#B91C1C]" /> Audit Trail & History Timeline
              </h4>
              {loadingLogs ? (
                <p className="text-xs text-slate-400">Loading activity timeline...</p>
              ) : drawerLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No activity recorded for this order.</p>
              ) : (
                <div className="space-y-3 pl-3 border-l-2 border-slate-200 dark:border-slate-800">
                  {drawerLogs.map((log) => (
                    <div key={log.id} className="relative text-xs space-y-0.5">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-[#B91C1C]" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white uppercase">{log.action}</span>
                        <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString('fr-TN')}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                        By: <span className="font-semibold text-slate-700 dark:text-slate-300">{log.actor_email || log.actor_type}</span> ({log.actor_type})
                      </p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <pre className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950 text-[10px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setInvoiceOrder(drawerOrder)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-200"
              >
                View Invoice
              </button>
              {((drawerOrder.status as string) === 'pending' || (drawerOrder.status as string) === 'pending_review' || (drawerOrder.status as string) === 'pending_proof') && (
                <button
                  onClick={() => handleCancelOrder(drawerOrder.id)}
                  className="flex-1 py-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold rounded-xl text-xs hover:bg-red-100"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {tr.reviewTitle || 'Validation Commande'} #{reviewOrder.id.slice(-8).toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Boutique: <span className="font-bold text-slate-900 dark:text-white">{reviewOrder.store_name}</span> ({reviewOrder.seller_email})
                </p>
              </div>
              <button onClick={() => setReviewOrder(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
              <div>
                <p className="text-slate-400 font-bold uppercase">{tr.targetPlan || 'Target Plan'}</p>
                <p className="text-base font-black text-slate-900 dark:text-white">{reviewOrder.target_plan.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase">{tr.expectedAmount || 'Amount'}</p>
                <p className="text-base font-black text-[#B91C1C]">{Number(reviewOrder.amount).toFixed(0)} TND</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{tr.rejectionReason || 'Rejection reason'}</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={tr.rejectionPlaceholder || 'Indicate reason if rejecting...'}
                rows={2}
                className="w-full p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-xl text-xs outline-none focus:border-[#B91C1C]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleReview('rejected')}
                disabled={submitting}
                className="flex-1 py-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold rounded-xl text-xs hover:bg-red-100 disabled:opacity-50"
              >
                {tr.reject || 'Reject Order'}
              </button>
              <button
                onClick={() => handleReview('approved')}
                disabled={submitting}
                className="flex-1 py-3 bg-[#B91C1C] text-white font-bold rounded-xl text-xs hover:bg-[#991B1B] shadow-md disabled:opacity-50"
              >
                {submitting ? (tr.approving || 'Activating...') : (tr.approve || 'Approve & Activate Plan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B2B Proforma Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 my-8 text-slate-900 border border-slate-200">
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div>
                <h2 className="text-2xl font-black text-[#B91C1C]">PandaMarket SARL</h2>
                <p className="text-xs text-slate-500 mt-1">Plateforme B2B e-Commerce & Marketplace</p>
                <p className="text-xs text-slate-500">MF / CIN: 01234567 • Tunis, Tunisie</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-slate-100 text-slate-800 font-black text-xs rounded-full uppercase">{tr.invoiceTitle || 'FACTURE PROFORMA B2B'}</span>
                <p className="text-xs font-mono font-bold mt-2">{tr.invoiceNumber || 'No.'} : SUB-{invoiceOrder.id.slice(-8).toUpperCase()}</p>
                <p className="text-xs text-slate-500">{tr.invoiceDate || 'Date'} : {new Date(invoiceOrder.created_at).toLocaleDateString('fr-TN')}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between text-xs">
              <div>
                <p className="font-bold text-slate-500 uppercase text-[10px]">{tr.invoiceClient || 'Client / Seller'} :</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{invoiceOrder.store_name}</p>
                <p className="text-slate-600">Subdomain: {invoiceOrder.store_subdomain}.pandamarket.tn</p>
                <p className="text-slate-600">Email: {invoiceOrder.seller_email}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-500 uppercase text-[10px]">{tr.invoicePayMode || 'Payment Method'} :</p>
                <p className="font-bold text-slate-900 mt-0.5">{GATEWAY_NAMES[invoiceOrder.gateway] || invoiceOrder.gateway}</p>
                <p className="text-slate-600">{tr.invoiceStatus || 'Status'} : <span className="font-bold uppercase">{invoiceOrder.status}</span></p>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <th className="py-2">{tr.invoiceDesignation || 'Designation'}</th>
                  <th className="py-2 text-center">{tr.invoiceDuration || 'Duration'}</th>
                  <th className="py-2 text-right">{tr.invoiceAmountHt || 'Amount HT'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-3">
                    <p className="font-bold text-slate-900">{tr.invoiceAnnual || 'Annual Subscription'} {invoiceOrder.target_plan.toUpperCase()}</p>
                    <p className="text-[11px] text-slate-500">{tr.invoiceAnnualDesc || 'Full access to e-Commerce features & platform services'}</p>
                  </td>
                  <td className="py-3 text-center">{tr.invoiceYear || '1 Year'}</td>
                  <td className="py-3 text-right font-bold">{Number(invoiceOrder.amount).toFixed(3)} TND</td>
                </tr>
              </tbody>
            </table>

            <div className="border-t border-slate-200 pt-4 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs text-right">
                <div className="flex justify-between text-slate-600">
                  <span>{tr.invoiceSubtotal || 'Subtotal HT'} :</span>
                  <span className="font-bold">{Number(invoiceOrder.amount).toFixed(3)} TND</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{tr.invoiceVat || 'VAT (0% exempt)'} :</span>
                  <span className="font-bold">0.000 TND</span>
                </div>
                <div className="flex justify-between text-base font-black text-[#B91C1C] border-t border-slate-200 pt-2">
                  <span>{tr.invoiceTotal || 'Total TTC'} :</span>
                  <span>{Number(invoiceOrder.amount).toFixed(3)} TND</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setInvoiceOrder(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
              >
                {tr.close || 'Close'}
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-[#B91C1C] text-white font-bold rounded-xl text-xs hover:bg-[#991B1B] shadow-md flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> {tr.invoicePrint || 'Print / Save PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quota Drawer */}
      {quotaOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {tr.quotaTitle || 'Quota Comparison'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr.quotaStore || 'Store'}: {quotaOrder.store_name}</p>
              </div>
              <button onClick={() => setQuotaOrder(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="font-bold text-slate-500 uppercase text-[10px]">{tr.quotaOldPlan || 'Old Plan'} ({quotaOrder.from_plan.toUpperCase()})</p>
                <p className="font-bold text-slate-900 dark:text-white">• {PLAN_LIMITS_SUMMARY[quotaOrder.from_plan]?.products || 'Standard'}</p>
                <p className="font-bold text-slate-900 dark:text-white">• Commission: {PLAN_LIMITS_SUMMARY[quotaOrder.from_plan]?.commission || '15%'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 space-y-2">
                <p className="font-bold text-red-700 dark:text-red-300 uppercase text-[10px]">{tr.quotaNewPlan || 'New Plan'} ({quotaOrder.target_plan.toUpperCase()})</p>
                <p className="font-bold text-slate-900 dark:text-white">• {PLAN_LIMITS_SUMMARY[quotaOrder.target_plan]?.products || 'Unlimited'}</p>
                <p className="font-bold text-slate-900 dark:text-white">• Commission: {PLAN_LIMITS_SUMMARY[quotaOrder.target_plan]?.commission || '0%'}</p>
              </div>
            </div>

            <button
              onClick={() => setQuotaOrder(null)}
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-200"
            >
              {tr.close || 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}