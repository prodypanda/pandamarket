'use client';

import { fetchWithCsrf } from '@/lib/api';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Loader2,
  ReceiptText,
  RefreshCw,
  Save,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type PayoutMode = 'on_demand' | 'automatic';
type FinancialTab = 'overview' | 'wallet' | 'payments' | 'accounting';

interface VendorWallet {
  balance: number | string | null;
  pending_balance: number | string | null;
  total_earned: number | string | null;
  total_withdrawn: number | string | null;
  payout_mode: PayoutMode;
  retention_days?: number;
  currency?: string;
}

interface WalletTransaction {
  id: string;
  type: string;
  amount: number | string | null;
  status?: string | null;
  reference?: string | null;
  description?: string | null;
  balance_after?: number | string | null;
  order_id?: string | null;
  available_at?: string | null;
  created_at: string;
}

interface StoreOrder {
  id: string;
  status: string;
  payment_status: string;
  payment_gateway: string;
  store_subtotal?: number | string | null;
  store_shipping_total?: number | string | null;
  store_total?: number | string | null;
  total?: number | string | null;
  currency?: string | null;
  customer_email?: string | null;
  created_at: string;
}

interface OrderSummary {
  total_orders: number;
  captured_orders: number;
  captured_revenue: number;
  revenue_today: number;
  revenue_7d: number;
  revenue_30d: number;
  average_order_value: number;
  refunded: number;
}

interface StoreSettings {
  accounting_profile?: Partial<AccountingProfile>;
  [key: string]: unknown;
}

interface StoreInfo {
  id: string;
  name: string;
  subscription_plan: string;
  payment_config?: unknown;
  settings?: StoreSettings | null;
}

interface AccountingProfile {
  legal_name: string;
  tax_identifier: string;
  business_registration: string;
  vat_status: 'not_registered' | 'registered' | 'exempt';
  vat_rate: string;
  invoice_prefix: string;
  next_invoice_number: string;
  fiscal_year_start: string;
  accounting_email: string;
  billing_address: string;
  bank_name: string;
  bank_account_holder: string;
  bank_iban: string;
  bank_rib: string;
  invoice_footer: string;
}

interface SubscriptionLimits {
  has_direct_payment?: boolean;
}

const emptyAccountingProfile: AccountingProfile = {
  legal_name: '',
  tax_identifier: '',
  business_registration: '',
  vat_status: 'not_registered',
  vat_rate: '0',
  invoice_prefix: 'INV',
  next_invoice_number: '1',
  fiscal_year_start: '01-01',
  accounting_email: '',
  billing_address: '',
  bank_name: '',
  bank_account_holder: '',
  bank_iban: '',
  bank_rib: '',
  invoice_footer: '',
};

function toNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMoney(value: unknown, currency = 'TND') {
  return `${toNumber(value).toFixed(3)} ${currency}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-TN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeAccountingProfile(value: unknown): AccountingProfile {
  if (!value || typeof value !== 'object') return emptyAccountingProfile;
  const source = value as Partial<AccountingProfile>;
  return {
    ...emptyAccountingProfile,
    ...source,
    vat_status: source.vat_status === 'registered' || source.vat_status === 'exempt' ? source.vat_status : 'not_registered',
  };
}

export default function FinancialPage() {
  const [activeTab, setActiveTab] = useState<FinancialTab>('overview');
  const [wallet, setWallet] = useState<VendorWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txMeta, setTxMeta] = useState({ page: 1, total_pages: 1, total: 0 });
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [accountingForm, setAccountingForm] = useState<AccountingProfile>(emptyAccountingProfile);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [savingAccounting, setSavingAccounting] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    flouci_app_token: '',
    flouci_app_secret: '',
    konnect_api_key: '',
    konnect_receiver_wallet: '',
  });

  const currency = wallet?.currency || 'TND';
  const directPaymentEligible = Boolean(limits?.has_direct_payment);
  const paymentConfigured = Boolean(store?.payment_config);

  const capturedOrders = useMemo(
    () => orders.filter((order) => order.payment_status === 'captured'),
    [orders],
  );

  const monthlyBars = useMemo(() => {
    const buckets = new Map<string, number>();
    capturedOrders.forEach((order) => {
      const date = new Date(order.created_at);
      const key = date.toLocaleDateString('fr-TN', { month: 'short', day: '2-digit' });
      buckets.set(key, (buckets.get(key) || 0) + toNumber(order.store_total || order.total));
    });
    const rows = Array.from(buckets.entries()).slice(-12).map(([label, total]) => ({ label, total }));
    const max = Math.max(...rows.map((row) => row.total), 1);
    return rows.map((row) => ({ ...row, percentage: Math.max(6, Math.round((row.total / max) * 100)) }));
  }, [capturedOrders]);

  const accountingCompletion = useMemo(() => {
    const required: Array<keyof AccountingProfile> = ['legal_name', 'tax_identifier', 'billing_address', 'accounting_email', 'bank_name', 'bank_account_holder'];
    const done = required.filter((key) => accountingForm[key].trim()).length;
    return Math.round((done / required.length) * 100);
  }, [accountingForm]);

  const showFeedback = (message: string, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
  };

  const fetchWallet = useCallback(async () => {
    const res = await fetchWithCsrf('/api/pd/wallet/me', { credentials: 'include' });
    if (!res.ok) throw new Error(await getErrorMessage(res, 'Unable to load wallet'));
    const data = await res.json();
    setWallet(data.wallet || null);
  }, []);

  const fetchTransactions = useCallback(async () => {
    const res = await fetchWithCsrf(`/api/pd/wallet/me/transactions?page=${txPage}&limit=20`, { credentials: 'include' });
    if (!res.ok) throw new Error(await getErrorMessage(res, 'Unable to load wallet transactions'));
    const data = await res.json();
    setTransactions(Array.isArray(data.data) ? data.data : []);
    setTxMeta(data.meta || { page: txPage, total_pages: 1, total: 0 });
  }, [txPage]);

  const fetchOrders = useCallback(async () => {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 90);
    const dateFromStr = dateFrom.toISOString().slice(0, 10);
    const res = await fetchWithCsrf(`/api/pd/orders/store?limit=100&date_from=${dateFromStr}`, { credentials: 'include' });
    if (!res.ok) throw new Error(await getErrorMessage(res, 'Unable to load sales data'));
    const data = await res.json();
    setOrders(Array.isArray(data.data) ? data.data : []);
    setOrderSummary(data.meta?.summary || null);
  }, []);

  const fetchStore = useCallback(async () => {
    const [storeRes, subscriptionRes] = await Promise.all([
      fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' }),
      fetchWithCsrf('/api/pd/subscriptions/current', { credentials: 'include' }),
    ]);
    if (!storeRes.ok) throw new Error(await getErrorMessage(storeRes, 'Unable to load store settings'));
    const storeData = await storeRes.json();
    const nextStore = storeData.store || null;
    setStore(nextStore);
    setAccountingForm(normalizeAccountingProfile(nextStore?.settings?.accounting_profile));
    if (subscriptionRes.ok) {
      const subscriptionData = await subscriptionRes.json();
      setLimits(subscriptionData.limits || null);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchWallet(), fetchTransactions(), fetchOrders(), fetchStore()]);
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Unable to refresh financial data', true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders, fetchStore, fetchTransactions, fetchWallet]);

  useEffect(() => {
    Promise.all([fetchWallet(), fetchTransactions(), fetchOrders(), fetchStore()])
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load financial data'))
      .finally(() => setLoading(false));
  }, [fetchOrders, fetchStore, fetchTransactions, fetchWallet]);

  const handlePayoutModeChange = async (mode: PayoutMode) => {
    setSavingMode(true);
    try {
      const res = await fetchWithCsrf('/api/pd/wallet/me/payout-mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ payout_mode: mode }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Unable to update payout mode'));
      const data = await res.json();
      setWallet(data.wallet || null);
      showFeedback('Payout mode updated.');
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Unable to update payout mode', true);
    } finally {
      setSavingMode(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!Number.isFinite(amount) || amount < 20) {
      showFeedback('Minimum withdrawal amount is 20 TND.', true);
      return;
    }
    setWithdrawing(true);
    try {
      const res = await fetchWithCsrf('/api/pd/wallet/me/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount, notes: withdrawNotes.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Unable to request withdrawal'));
      const data = await res.json();
      setWallet(data.wallet || null);
      setWithdrawAmount('');
      setWithdrawNotes('');
      showFeedback('Withdrawal request sent.');
      void refreshAll();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Unable to request withdrawal', true);
    } finally {
      setWithdrawing(false);
    }
  };

  const handlePaymentSave = async () => {
    const body = Object.fromEntries(Object.entries(paymentForm).filter(([, value]) => value.trim()));
    if (!Object.keys(body).length) {
      showFeedback('Fill at least one payment credential before saving.', true);
      return;
    }
    setSavingPayment(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/payment-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Unable to save payment credentials'));
      setPaymentForm({ flouci_app_token: '', flouci_app_secret: '', konnect_api_key: '', konnect_receiver_wallet: '' });
      showFeedback('Payment credentials saved and encrypted.');
      void fetchStore();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Unable to save payment credentials', true);
    } finally {
      setSavingPayment(false);
    }
  };

  const handleAccountingSave = async () => {
    setSavingAccounting(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: { accounting_profile: accountingForm } }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Unable to save accounting profile'));
      const data = await res.json();
      setStore(data.store || null);
      showFeedback('Accounting profile saved.');
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Unable to save accounting profile', true);
    } finally {
      setSavingAccounting(false);
    }
  };

  const exportOrders = () => {
    downloadCsv('seller-orders-accounting.csv', [
      ['Order ID', 'Date', 'Payment status', 'Gateway', 'Subtotal', 'Shipping', 'Total', 'Customer'],
      ...orders.map((order) => [
        order.id,
        order.created_at,
        order.payment_status,
        order.payment_gateway,
        toNumber(order.store_subtotal),
        toNumber(order.store_shipping_total),
        toNumber(order.store_total || order.total),
        order.customer_email || '',
      ]),
    ]);
  };

  const exportTransactions = () => {
    downloadCsv('seller-wallet-transactions.csv', [
      ['Transaction ID', 'Date', 'Type', 'Amount', 'Balance after', 'Order ID', 'Description'],
      ...transactions.map((tx) => [tx.id, tx.created_at, tx.type, toNumber(tx.amount), toNumber(tx.balance_after), tx.order_id || '', tx.description || '']),
    ]);
  };

  const updateAccounting = <K extends keyof AccountingProfile>(key: K, value: AccountingProfile[K]) => {
    setAccountingForm((current) => ({ ...current, [key]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-[2rem] bg-slate-100" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: FinancialTab; label: string; icon: typeof Wallet }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'wallet', label: 'Wallet & payouts', icon: Wallet },
    { id: 'payments', label: 'Payment providers', icon: CreditCard },
    { id: 'accounting', label: 'Comptabilité', icon: ReceiptText },
  ];

  const kpis = [
    { label: 'Available wallet', value: formatMoney(wallet?.balance, currency), icon: Wallet, tone: 'from-[#3B0D0D] to-[#B91C1C] text-white' },
    { label: 'Pending release', value: formatMoney(wallet?.pending_balance, currency), icon: Banknote, tone: 'bg-white text-gray-950' },
    { label: '30d revenue', value: formatMoney(orderSummary?.revenue_30d, currency), icon: ArrowDownLeft, tone: 'bg-white text-gray-950' },
    { label: 'Withdrawn total', value: formatMoney(wallet?.total_withdrawn, currency), icon: ArrowUpRight, tone: 'bg-white text-gray-950' },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-amber-100 bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-6 text-white shadow-2xl shadow-red-950/10">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-300/25 blur-3xl" />
        <div className="absolute -bottom-28 left-8 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-100">
              <ReceiptText className="h-3.5 w-3.5" />
              Seller finance center
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Financial & Accounting</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-amber-50/80">
              Manage wallet funds, payouts, payment credentials, accounting identity, tax details, exports, and sales finance information in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className={`rounded-3xl border border-gray-100 p-5 shadow-xl shadow-slate-900/5 ${item.tone}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] opacity-60">{item.label}</p>
                <p className="mt-2 text-2xl font-black">{item.value}</p>
              </div>
              <div className="rounded-2xl bg-amber-50/80 p-3 text-[#B91C1C]">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-amber-100 bg-amber-50/60 p-1.5 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
              activeTab === tab.id ? 'bg-white text-[#B91C1C] shadow-sm ring-1 ring-amber-100' : 'text-slate-500 hover:bg-white/60 hover:text-[#7F1D1D]'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-950">Revenue performance</h2>
                <p className="mt-1 text-sm font-semibold text-gray-500">Captured sales over the last 90 days.</p>
              </div>
              <button type="button" onClick={exportOrders} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-700 hover:bg-gray-50">
                <Download className="h-4 w-4" />
                Export orders
              </button>
            </div>
            <div className="mt-6 flex h-72 items-end gap-2 rounded-3xl bg-gradient-to-b from-amber-50 to-white p-4">
              {monthlyBars.length > 0 ? monthlyBars.map((bar) => (
                <div key={bar.label} className="flex h-full flex-1 flex-col justify-end gap-2 text-center">
                  <div className="rounded-t-2xl bg-[#B91C1C] shadow-lg shadow-red-900/10" style={{ height: `${bar.percentage}%` }} />
                  <span className="text-[10px] font-bold text-gray-400">{bar.label}</span>
                </div>
              )) : (
                <div className="flex flex-1 items-center justify-center text-sm font-bold text-gray-400">No captured revenue yet.</div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
            <h2 className="text-lg font-black text-gray-950">Accounting readiness</h2>
            <p className="mt-1 text-sm font-semibold text-gray-500">Complete your legal and accounting information for clean records.</p>
            <div className="mt-6 rounded-3xl border border-amber-100 bg-amber-50 p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Profile completion</p>
                  <p className="mt-2 text-4xl font-black text-[#7F1D1D]">{accountingCompletion}%</p>
                </div>
                <ShieldCheck className="h-10 w-10 text-[#B91C1C]" />
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#B91C1C]" style={{ width: `${accountingCompletion}%` }} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold text-gray-400">Captured orders</p>
                <p className="mt-1 text-2xl font-black text-gray-950">{orderSummary?.captured_orders || 0}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold text-gray-400">Average order</p>
                <p className="mt-1 text-2xl font-black text-gray-950">{formatMoney(orderSummary?.average_order_value, currency)}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold text-gray-400">Today</p>
                <p className="mt-1 text-2xl font-black text-gray-950">{formatMoney(orderSummary?.revenue_today, currency)}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold text-gray-400">7 days</p>
                <p className="mt-1 text-2xl font-black text-gray-950">{formatMoney(orderSummary?.revenue_7d, currency)}</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
            <h2 className="text-lg font-black text-gray-950">Payout settings</h2>
            <p className="mt-1 text-sm font-semibold text-gray-500">Choose how you want to request or receive available wallet funds.</p>
            <div className="mt-5 space-y-3">
              {(['on_demand', 'automatic'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => void handlePayoutModeChange(mode)}
                  disabled={savingMode}
                  className={`w-full rounded-2xl border p-4 text-left transition ${wallet?.payout_mode === mode ? 'border-[#B91C1C] bg-red-50 text-[#7F1D1D]' : 'border-gray-100 bg-gray-50 text-gray-700 hover:bg-white'}`}
                >
                  <span className="block text-sm font-black">{mode === 'on_demand' ? 'Manual payout requests' : 'Automatic payout mode'}</span>
                  <span className="mt-1 block text-xs font-semibold opacity-70">
                    {mode === 'on_demand' ? 'Request withdrawals when you decide.' : 'Prepare wallet for automatic payout processing.'}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-3xl border border-gray-100 bg-gray-50 p-5">
              <h3 className="font-black text-gray-950">Request withdrawal</h3>
              <div className="mt-4 space-y-3">
                <input
                  type="number"
                  min={20}
                  step="0.001"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                  placeholder="Amount, min. 20 TND"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
                />
                <input
                  value={withdrawNotes}
                  onChange={(event) => setWithdrawNotes(event.target.value)}
                  placeholder="Notes or bank reference"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
                />
                <button
                  type="button"
                  onClick={() => void handleWithdraw()}
                  disabled={withdrawing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-5 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-50"
                >
                  {withdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                  Request payout
                </button>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-slate-900/5">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-gray-950">Wallet ledger</h2>
                <p className="text-sm font-semibold text-gray-500">All wallet credits, payouts, refunds, and add-on purchases.</p>
              </div>
              <button type="button" onClick={exportTransactions} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-black text-gray-700 hover:bg-gray-50">
                <Download className="h-4 w-4" />
                CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-black uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => {
                    const amount = toNumber(tx.amount);
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-semibold text-gray-600">{formatDate(tx.created_at)}</td>
                        <td className="px-6 py-3 font-bold capitalize text-gray-900">{tx.type.replaceAll('_', ' ')}</td>
                        <td className={`px-6 py-3 font-black ${amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>{amount >= 0 ? '+' : ''}{formatMoney(amount, currency)}</td>
                        <td className="px-6 py-3 text-gray-500">{tx.order_id || tx.reference || tx.id.slice(-8)}</td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center font-bold text-gray-400">No wallet transactions yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <button type="button" onClick={() => setTxPage((page) => Math.max(1, page - 1))} disabled={txPage === 1} className="inline-flex items-center gap-1 text-sm font-bold text-gray-500 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm font-bold text-gray-500">Page {txMeta.page || txPage} / {txMeta.total_pages || 1}</span>
              <button type="button" onClick={() => setTxPage((page) => page + 1)} disabled={txPage >= (txMeta.total_pages || 1)} className="inline-flex items-center gap-1 text-sm font-bold text-gray-500 disabled:opacity-40">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'payments' && (
        <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-gray-950"><CreditCard className="h-5 w-5 text-[#B91C1C]" /> Payment provider credentials</h2>
              <p className="mt-1 text-sm font-semibold text-gray-500">Configure Flouci or Konnect credentials for direct payments. Secrets are encrypted server-side.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${paymentConfigured ? 'bg-green-50 text-green-700 ring-green-100' : 'bg-amber-50 text-amber-700 ring-amber-100'}`}>
              {paymentConfigured ? 'Credentials saved' : 'Not configured'}
            </span>
          </div>
          {!directPaymentEligible ? (
            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
              Direct payment configuration requires a plan that includes direct payments. Upgrade your subscription to enable provider credentials.
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="font-black text-gray-950">Flouci</h3>
                <div className="mt-4 space-y-3">
                  <input type="password" value={paymentForm.flouci_app_token} onChange={(event) => setPaymentForm((current) => ({ ...current, flouci_app_token: event.target.value }))} placeholder="Flouci app token" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" />
                  <input type="password" value={paymentForm.flouci_app_secret} onChange={(event) => setPaymentForm((current) => ({ ...current, flouci_app_secret: event.target.value }))} placeholder="Flouci app secret" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" />
                </div>
              </div>
              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="font-black text-gray-950">Konnect</h3>
                <div className="mt-4 space-y-3">
                  <input type="password" value={paymentForm.konnect_api_key} onChange={(event) => setPaymentForm((current) => ({ ...current, konnect_api_key: event.target.value }))} placeholder="Konnect API key" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" />
                  <input value={paymentForm.konnect_receiver_wallet} onChange={(event) => setPaymentForm((current) => ({ ...current, konnect_receiver_wallet: event.target.value }))} placeholder="Konnect receiver wallet" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" />
                </div>
              </div>
              <button type="button" onClick={() => void handlePaymentSave()} disabled={savingPayment} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-5 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-50 lg:col-span-2">
                {savingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save encrypted payment credentials
              </button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'accounting' && (
        <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-gray-950"><Landmark className="h-5 w-5 text-[#B91C1C]" /> Accounting profile</h2>
              <p className="mt-1 text-sm font-semibold text-gray-500">Store legal, tax, invoice, and bank information for accounting records and exports.</p>
            </div>
            <button type="button" onClick={() => void handleAccountingSave()} disabled={savingAccounting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-5 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-50">
              {savingAccounting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save accounting profile
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-bold text-gray-700">Legal company name<input value={accountingForm.legal_name} onChange={(event) => updateAccounting('legal_name', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700">Tax identifier / Matricule fiscal<input value={accountingForm.tax_identifier} onChange={(event) => updateAccounting('tax_identifier', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700">Business registration<input value={accountingForm.business_registration} onChange={(event) => updateAccounting('business_registration', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700">Accounting email<input type="email" value={accountingForm.accounting_email} onChange={(event) => updateAccounting('accounting_email', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700">VAT status<select value={accountingForm.vat_status} onChange={(event) => updateAccounting('vat_status', event.target.value as AccountingProfile['vat_status'])} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"><option value="not_registered">Not registered</option><option value="registered">Registered</option><option value="exempt">Exempt</option></select></label>
            <label className="space-y-1 text-sm font-bold text-gray-700">VAT rate %<input value={accountingForm.vat_rate} onChange={(event) => updateAccounting('vat_rate', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700">Invoice prefix<input value={accountingForm.invoice_prefix} onChange={(event) => updateAccounting('invoice_prefix', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700">Next invoice number<input value={accountingForm.next_invoice_number} onChange={(event) => updateAccounting('next_invoice_number', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700">Fiscal year start<input value={accountingForm.fiscal_year_start} onChange={(event) => updateAccounting('fiscal_year_start', event.target.value)} placeholder="01-01" className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700">Bank name<input value={accountingForm.bank_name} onChange={(event) => updateAccounting('bank_name', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700">Bank account holder<input value={accountingForm.bank_account_holder} onChange={(event) => updateAccounting('bank_account_holder', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700">RIB<input value={accountingForm.bank_rib} onChange={(event) => updateAccounting('bank_rib', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700 md:col-span-2">IBAN<input value={accountingForm.bank_iban} onChange={(event) => updateAccounting('bank_iban', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700 md:col-span-2">Billing address<textarea rows={3} value={accountingForm.billing_address} onChange={(event) => updateAccounting('billing_address', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
            <label className="space-y-1 text-sm font-bold text-gray-700 md:col-span-2">Invoice footer<textarea rows={3} value={accountingForm.invoice_footer} onChange={(event) => updateAccounting('invoice_footer', event.target.value)} className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10" /></label>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button type="button" onClick={exportOrders} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-black text-gray-700 hover:bg-white">
              <FileText className="h-4 w-4 text-[#B91C1C]" />
              Export sales accounting CSV
            </button>
            <button type="button" onClick={exportTransactions} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-black text-gray-700 hover:bg-white">
              <Download className="h-4 w-4 text-[#B91C1C]" />
              Export wallet ledger CSV
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
