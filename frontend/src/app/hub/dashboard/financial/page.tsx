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
import { useLocale } from '@/contexts/LocaleContext';
import { useDashboardStyle } from '@/contexts/DashboardStyleContext';
import { WalletBentoCockpit } from '@/components/dashboard/WalletBentoCockpit';

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

function formatDate(value?: string | null, localeStr = 'fr-TN') {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(localeStr, {
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
  const { t, locale, dir } = useLocale();
  const { dashboardStyle } = useDashboardStyle();
  const localeStr = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
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
      const key = date.toLocaleDateString(localeStr, { month: 'short', day: '2-digit' });
      buckets.set(key, (buckets.get(key) || 0) + toNumber(order.store_total || order.total));
    });
    const rows = Array.from(buckets.entries()).slice(-12).map(([label, total]) => ({ label, total }));
    const max = Math.max(...rows.map((row) => row.total), 1);
    return rows.map((row) => ({ ...row, percentage: Math.max(6, Math.round((row.total / max) * 100)) }));
  }, [capturedOrders, localeStr]);

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
    if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.financial.errorLoadWallet')));
    const data = await res.json();
    setWallet(data.wallet || null);
  }, [t]);

  const fetchTransactions = useCallback(async () => {
    const res = await fetchWithCsrf(`/api/pd/wallet/me/transactions?page=${txPage}&limit=20`, { credentials: 'include' });
    if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.financial.errorLoadTransactions')));
    const data = await res.json();
    setTransactions(Array.isArray(data.data) ? data.data : []);
    setTxMeta(data.meta || { page: txPage, total_pages: 1, total: 0 });
  }, [txPage, t]);

  const fetchOrders = useCallback(async () => {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 90);
    const dateFromStr = dateFrom.toISOString().slice(0, 10);
    const res = await fetchWithCsrf(`/api/pd/orders/store?limit=100&date_from=${dateFromStr}`, { credentials: 'include' });
    if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.financial.errorLoadSales')));
    const data = await res.json();
    setOrders(Array.isArray(data.data) ? data.data : []);
    setOrderSummary(data.meta?.summary || null);
  }, [t]);

  const fetchStore = useCallback(async () => {
    const [storeRes, subscriptionRes] = await Promise.all([
      fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' }),
      fetchWithCsrf('/api/pd/subscriptions/current', { credentials: 'include' }),
    ]);
    if (!storeRes.ok) throw new Error(await getErrorMessage(storeRes, t('dashboardPages.financial.errorLoadStore')));
    const storeData = await storeRes.json();
    const nextStore = storeData.store || null;
    setStore(nextStore);
    setAccountingForm(normalizeAccountingProfile(nextStore?.settings?.accounting_profile));
    if (subscriptionRes.ok) {
      const subscriptionData = await subscriptionRes.json();
      setLimits(subscriptionData.limits || null);
    }
  }, [t]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchWallet(), fetchTransactions(), fetchOrders(), fetchStore()]);
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.financial.errorRefresh'), true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders, fetchStore, fetchTransactions, fetchWallet, t]);

  useEffect(() => {
    Promise.all([fetchWallet(), fetchTransactions(), fetchOrders(), fetchStore()])
      .catch((err) => setError(err instanceof Error ? err.message : t('dashboardPages.financial.errorLoadFinancial')))
      .finally(() => setLoading(false));
  }, [fetchOrders, fetchStore, fetchTransactions, fetchWallet, t]);

  const handlePayoutModeChange = async (mode: PayoutMode) => {
    setSavingMode(true);
    try {
      const res = await fetchWithCsrf('/api/pd/wallet/me/payout-mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ payout_mode: mode }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.financial.errorUpdatePayoutMode')));
      const data = await res.json();
      setWallet(data.wallet || null);
      showFeedback(t('dashboardPages.financial.successPayoutModeUpdated'));
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.financial.errorUpdatePayoutMode'), true);
    } finally {
      setSavingMode(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!Number.isFinite(amount) || amount < 20) {
      showFeedback(t('dashboardPages.financial.errorMinWithdrawal'), true);
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
      if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.financial.errorRequestWithdrawal')));
      const data = await res.json();
      setWallet(data.wallet || null);
      setWithdrawAmount('');
      setWithdrawNotes('');
      showFeedback(t('dashboardPages.financial.successWithdrawalSent'));
      void refreshAll();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.financial.errorRequestWithdrawal'), true);
    } finally {
      setWithdrawing(false);
    }
  };

  const handlePaymentSave = async () => {
    const body = Object.fromEntries(Object.entries(paymentForm).filter(([, value]) => value.trim()));
    if (!Object.keys(body).length) {
      showFeedback(t('dashboardPages.financial.errorFillPaymentCredential'), true);
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
      if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.financial.errorSavePayment')));
      setPaymentForm({ flouci_app_token: '', flouci_app_secret: '', konnect_api_key: '', konnect_receiver_wallet: '' });
      showFeedback(t('dashboardPages.financial.successPaymentSaved'));
      void fetchStore();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.financial.errorSavePayment'), true);
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
      if (!res.ok) throw new Error(await getErrorMessage(res, t('dashboardPages.financial.errorSaveAccounting')));
      const data = await res.json();
      setStore(data.store || null);
      showFeedback(t('dashboardPages.financial.successAccountingSaved'));
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.financial.errorSaveAccounting'), true);
    } finally {
      setSavingAccounting(false);
    }
  };

  const exportOrders = () => {
    downloadCsv('seller-orders-accounting.csv', [
      [t('dashboardPages.financial.csvOrderId'), t('dashboardPages.common.date'), t('dashboardPages.financial.csvPaymentStatus'), t('dashboardPages.financial.csvGateway'), t('dashboardPages.financial.csvSubtotal'), t('dashboardPages.financial.csvShipping'), t('dashboardPages.financial.csvTotal'), t('dashboardPages.financial.csvCustomer')],
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
      [t('dashboardPages.financial.csvTransactionId'), t('dashboardPages.common.date'), t('dashboardPages.financial.type'), t('dashboardPages.financial.amount'), t('dashboardPages.financial.csvBalanceAfter'), t('dashboardPages.financial.csvOrderId'), t('dashboardPages.financial.csvDescription')],
      ...transactions.map((tx) => [tx.id, tx.created_at, tx.type, toNumber(tx.amount), toNumber(tx.balance_after), tx.order_id || '', tx.description || '']),
    ]);
  };

  const updateAccounting = <K extends keyof AccountingProfile>(key: K, value: AccountingProfile[K]) => {
    setAccountingForm((current) => ({ ...current, [key]: value }));
  };

  if (loading) {
    return (
      <div dir={dir} className="space-y-6">
        <div className="h-44 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800" />)}
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: FinancialTab; label: string; icon: typeof Wallet }> = [
    { id: 'overview', label: t('dashboardPages.financial.tabOverview'), icon: BarChart3 },
    { id: 'wallet', label: t('dashboardPages.financial.tabWallet'), icon: Wallet },
    { id: 'payments', label: t('dashboardPages.financial.tabPayments'), icon: CreditCard },
    { id: 'accounting', label: t('dashboardPages.financial.tabAccounting'), icon: ReceiptText },
  ];

  const kpis = [
    { label: t('dashboardPages.financial.availableBalance'), value: formatMoney(wallet?.balance, currency), icon: Wallet },
    { label: t('dashboardPages.financial.pendingBalance'), value: formatMoney(wallet?.pending_balance, currency), icon: Banknote },
    { label: t('dashboardPages.financial.kpi30dRevenue'), value: formatMoney(orderSummary?.revenue_30d, currency), icon: ArrowDownLeft },
    { label: t('dashboardPages.financial.kpiWithdrawnTotal'), value: formatMoney(wallet?.total_withdrawn, currency), icon: ArrowUpRight },
  ];

  return (
    <div dir={dir} className="space-y-6 sm:space-y-8">
      {dashboardStyle === 'bento' ? (
        <WalletBentoCockpit
          wallet={wallet}
          transactions={transactions}
          onRefresh={refreshAll}
          onRequestPayout={async (amount, targetRib) => {
            const res = await fetchWithCsrf('/api/pd/wallet/me/withdraw', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ amount, notes: `RIB: ${targetRib}` }),
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error?.message || t('dashboardPages.financial.errorRequestWithdrawal'));
            }
            const data = await res.json();
            setWallet(data.wallet || null);
            await Promise.all([fetchTransactions(), fetchOrders()]);
          }}
          onPayoutModeChange={handlePayoutModeChange}
          onExportTransactions={exportTransactions}
          onExportOrders={exportOrders}
          accountingProfile={accountingForm}
          loading={loading}
          requestingPayout={withdrawing}
          dir={dir}
        />
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              <ReceiptText className="h-3.5 w-3.5" />
              {t('dashboardPages.financial.sellerFinanceCenter')}
            </span>
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t('dashboardPages.financial.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t('dashboardPages.financial.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white shadow-2xs transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t('dashboardPages.financial.refresh')}
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm font-medium text-rose-700 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
              </div>
              <div className="rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-3 text-slate-900 dark:text-white">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboardPages.financial.revenuePerformance')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.financial.revenuePerformanceDesc')}</p>
              </div>
              <button
                type="button"
                onClick={exportOrders}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <Download className="h-4 w-4" />
                {t('dashboardPages.financial.exportOrders')}
              </button>
            </div>
            <div className="mt-6 flex h-72 items-end gap-2 rounded-2xl bg-slate-50/50 dark:bg-slate-850/50 p-4 border border-slate-200/80 dark:border-slate-800">
              {monthlyBars.length > 0 ? monthlyBars.map((bar) => (
                <div key={bar.label} className="flex h-full flex-1 flex-col justify-end gap-2 text-center">
                  <div className="rounded-t-xl bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm" style={{ height: `${bar.percentage}%` }} />
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{bar.label}</span>
                </div>
              )) : (
                <div className="flex flex-1 items-center justify-center text-sm font-medium text-slate-400 dark:text-slate-500">{t('dashboardPages.financial.noCapturedRevenue')}</div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboardPages.financial.accountingReadiness')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.financial.accountingReadinessDesc')}</p>
            <div className="mt-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('dashboardPages.financial.profileCompletion')}</p>
                  <p className="mt-2 text-4xl font-bold text-slate-900 dark:text-white">{accountingCompletion}%</p>
                </div>
                <ShieldCheck className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full rounded-full bg-slate-900 dark:bg-white transition-all" style={{ width: `${accountingCompletion}%` }} />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('dashboardPages.financial.capturedOrders')}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{orderSummary?.captured_orders || 0}</p>
              </div>
              <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('dashboardPages.financial.averageOrder')}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatMoney(orderSummary?.average_order_value, currency)}</p>
              </div>
              <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('dashboardPages.financial.today')}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatMoney(orderSummary?.revenue_today, currency)}</p>
              </div>
              <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('dashboardPages.financial.sevenDays')}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatMoney(orderSummary?.revenue_7d, currency)}</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboardPages.financial.payoutSettings')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.financial.payoutSettingsDesc')}</p>
            <div className="mt-5 space-y-3">
              {(['on_demand', 'automatic'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => void handlePayoutModeChange(mode)}
                  disabled={savingMode}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    wallet?.payout_mode === mode
                      ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="block text-sm font-bold">{mode === 'on_demand' ? t('dashboardPages.financial.manualPayout') : t('dashboardPages.financial.automaticPayout')}</span>
                  <span className="mt-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    {mode === 'on_demand' ? t('dashboardPages.financial.manualPayoutDesc') : t('dashboardPages.financial.automaticPayoutDesc')}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
              <h3 className="font-bold text-slate-900 dark:text-white">{t('dashboardPages.financial.requestWithdrawal')}</h3>
              <div className="mt-4 space-y-3">
                <input
                  type="number"
                  min={20}
                  step="0.001"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                  placeholder={t('dashboardPages.financial.amountPlaceholder')}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
                />
                <input
                  value={withdrawNotes}
                  onChange={(event) => setWithdrawNotes(event.target.value)}
                  placeholder={t('dashboardPages.financial.notesPlaceholder')}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
                />
                <button
                  type="button"
                  onClick={() => void handleWithdraw()}
                  disabled={withdrawing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-3 text-sm font-medium text-white shadow-2xs transition disabled:opacity-50"
                >
                  {withdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                  {t('dashboardPages.financial.requestPayout')}
                </button>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboardPages.financial.walletLedger')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.financial.walletLedgerDesc')}</p>
              </div>
              <button
                type="button"
                onClick={exportTransactions}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <Download className="h-4 w-4" />
                {t('dashboardPages.financial.csv')}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">{t('dashboardPages.common.date')}</th>
                    <th className="px-6 py-3">{t('dashboardPages.financial.type')}</th>
                    <th className="px-6 py-3">{t('dashboardPages.financial.amount')}</th>
                    <th className="px-6 py-3">{t('dashboardPages.financial.reference')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((tx) => {
                    const amount = toNumber(tx.amount);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-600 dark:text-slate-300">{formatDate(tx.created_at, localeStr)}</td>
                        <td className="px-6 py-3 font-semibold capitalize text-slate-900 dark:text-white">{tx.type.replaceAll('_', ' ')}</td>
                        <td className={`px-6 py-3 font-bold ${amount >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{amount >= 0 ? '+' : ''}{formatMoney(amount, currency)}</td>
                        <td className="px-6 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{tx.order_id || tx.reference || tx.id.slice(-8)}</td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center font-medium text-slate-400 dark:text-slate-500">{t('dashboardPages.financial.noWalletTransactions')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4">
              <button
                type="button"
                onClick={() => setTxPage((page) => Math.max(1, page - 1))}
                disabled={txPage === 1}
                className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4" /> {t('dashboardPages.financial.previous')}
              </button>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('dashboardPages.financial.page')} {txMeta.page || txPage} / {txMeta.total_pages || 1}</span>
              <button
                type="button"
                onClick={() => setTxPage((page) => page + 1)}
                disabled={txPage >= (txMeta.total_pages || 1)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 transition"
              >
                {t('dashboardPages.financial.next')} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'payments' && (
        <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"><CreditCard className="h-5 w-5 text-slate-900 dark:text-white" /> {t('dashboardPages.financial.paymentProviderCredentials')}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.financial.paymentProviderDesc')}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${paymentConfigured ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-900/60' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-900/60'}`}>
              {paymentConfigured ? t('dashboardPages.financial.credentialsSaved') : t('dashboardPages.financial.notConfigured')}
            </span>
          </div>
          {!directPaymentEligible ? (
            <div className="mt-5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-sm font-semibold text-amber-800 dark:text-amber-300">
              {t('dashboardPages.financial.directPaymentRequired')}
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
                <h3 className="font-bold text-slate-900 dark:text-white">{t('dashboardPages.financial.flouci')}</h3>
                <div className="mt-4 space-y-3">
                  <input
                    type="password"
                    value={paymentForm.flouci_app_token}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, flouci_app_token: event.target.value }))}
                    placeholder={t('dashboardPages.financial.flouciAppToken')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
                  />
                  <input
                    type="password"
                    value={paymentForm.flouci_app_secret}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, flouci_app_secret: event.target.value }))}
                    placeholder={t('dashboardPages.financial.flouciAppSecret')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
                <h3 className="font-bold text-slate-900 dark:text-white">{t('dashboardPages.financial.konnect')}</h3>
                <div className="mt-4 space-y-3">
                  <input
                    type="password"
                    value={paymentForm.konnect_api_key}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, konnect_api_key: event.target.value }))}
                    placeholder={t('dashboardPages.financial.konnectApiKey')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
                  />
                  <input
                    value={paymentForm.konnect_receiver_wallet}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, konnect_receiver_wallet: event.target.value }))}
                    placeholder={t('dashboardPages.financial.konnectReceiverWallet')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handlePaymentSave()}
                disabled={savingPayment}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-3 text-sm font-medium text-white shadow-2xs transition disabled:opacity-50 lg:col-span-2"
              >
                {savingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('dashboardPages.financial.savePaymentCredentials')}
              </button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'accounting' && (
        <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"><Landmark className="h-5 w-5 text-slate-900 dark:text-white" /> {t('dashboardPages.financial.accountingProfile')}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.financial.accountingProfileDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleAccountingSave()}
              disabled={savingAccounting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 text-sm font-medium text-white shadow-2xs transition disabled:opacity-50"
            >
              {savingAccounting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('dashboardPages.financial.saveAccountingProfile')}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboardPages.financial.legalCompanyName')}
              <input
                value={accountingForm.legal_name}
                onChange={(event) => updateAccounting('legal_name', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboardPages.financial.taxIdentifier')}
              <input
                value={accountingForm.tax_identifier}
                onChange={(event) => updateAccounting('tax_identifier', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboardPages.financial.businessRegistration')}
              <input
                value={accountingForm.business_registration}
                onChange={(event) => updateAccounting('business_registration', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboardPages.financial.accountingEmail')}
              <input
                type="email"
                value={accountingForm.accounting_email}
                onChange={(event) => updateAccounting('accounting_email', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboardPages.financial.vatStatus')}
              <select
                value={accountingForm.vat_status}
                onChange={(event) => updateAccounting('vat_status', event.target.value as AccountingProfile['vat_status'])}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              >
                <option value="not_registered" className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{t('dashboardPages.financial.vatNotRegistered')}</option>
                <option value="registered" className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{t('dashboardPages.financial.vatRegistered')}</option>
                <option value="exempt" className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{t('dashboardPages.financial.vatExempt')}</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboardPages.financial.vatRate')}
              <input
                value={accountingForm.vat_rate}
                onChange={(event) => updateAccounting('vat_rate', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboardPages.financial.invoicePrefix')}
              <input
                value={accountingForm.invoice_prefix}
                onChange={(event) => updateAccounting('invoice_prefix', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboardPages.financial.nextInvoiceNumber')}
              <input
                value={accountingForm.next_invoice_number}
                onChange={(event) => updateAccounting('next_invoice_number', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboardPages.financial.fiscalYearStart')}
              <input
                value={accountingForm.fiscal_year_start}
                onChange={(event) => updateAccounting('fiscal_year_start', event.target.value)}
                placeholder="01-01"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboardPages.financial.bankName')}
              <input
                value={accountingForm.bank_name}
                onChange={(event) => updateAccounting('bank_name', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboardPages.financial.bankAccountHolder')}
              <input
                value={accountingForm.bank_account_holder}
                onChange={(event) => updateAccounting('bank_account_holder', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboardPages.financial.rib')}
              <input
                value={accountingForm.bank_rib}
                onChange={(event) => updateAccounting('bank_rib', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300 md:col-span-2">
              {t('dashboardPages.financial.iban')}
              <input
                value={accountingForm.bank_iban}
                onChange={(event) => updateAccounting('bank_iban', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300 md:col-span-2">
              {t('dashboardPages.financial.billingAddress')}
              <textarea
                rows={3}
                value={accountingForm.billing_address}
                onChange={(event) => updateAccounting('billing_address', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-300 md:col-span-2">
              {t('dashboardPages.financial.invoiceFooter')}
              <textarea
                rows={3}
                value={accountingForm.invoice_footer}
                onChange={(event) => updateAccounting('invoice_footer', event.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={exportOrders}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <FileText className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              {t('dashboardPages.financial.exportSalesCsv')}
            </button>
            <button
              type="button"
              onClick={exportTransactions}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Download className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              {t('dashboardPages.financial.exportWalletCsv')}
            </button>
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );
}
