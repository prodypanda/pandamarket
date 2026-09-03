'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Info,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { useDashboardStyle } from '@/contexts/DashboardStyleContext';
import { WalletBentoCockpit } from '@/components/dashboard/WalletBentoCockpit';
import {
  formatTunisianRib,
  validateTunisianRib,
  getTunisianBank,
} from '@/lib/tunisia-banking';

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

const RIB_STORAGE_KEY = 'pandamarket_merchant_rib';

export default function WalletPage() {
  const { t, locale, dir } = useLocale();
  const { dashboardStyle } = useDashboardStyle();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [rib, setRib] = useState('');
  const [ribTouched, setRibTouched] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  const [payoutMode, setPayoutMode] = useState<'on_demand' | 'automatic'>('on_demand');
  const [savingMode, setSavingMode] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Load saved RIB from localStorage on mount
  useEffect(() => {
    try {
      const savedRib = localStorage.getItem(RIB_STORAGE_KEY);
      if (savedRib) {
        setRib(formatTunisianRib(savedRib));
      }
    } catch {
      // Ignore localStorage read errors in private browsing
    }
  }, []);

  const ribValidation = useMemo(() => validateTunisianRib(rib), [rib]);
  const detectedBank = useMemo(() => getTunisianBank(rib), [rib]);
  const ribDigitsCount = useMemo(() => rib.replace(/\D/g, '').length, [rib]);

  const parsedAmount = parseFloat(withdrawAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount >= 20;
  const availableBalance = toNumber(wallet?.balance || 0);
  const isAmountWithinBalance = isValidAmount && parsedAmount <= availableBalance;

  const handleRibChange = (val: string) => {
    const formatted = formatTunisianRib(val);
    setRib(formatted);
    setRibTouched(true);
    try {
      localStorage.setItem(RIB_STORAGE_KEY, formatted);
    } catch {
      // Ignore write errors
    }
  };

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
        setLoadError(await getErrorMessage(res, t('dashboardPages.wallet.loadError')));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t('dashboardPages.wallet.networkError'));
    }
  }, [t]);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetchWithCsrf(`/api/pd/wallet/me/transactions?page=${txPage}&limit=20`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.data || []);
      } else {
        setLoadError(
          await getErrorMessage(res, t('dashboardPages.wallet.loadTransactionsError')),
        );
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t('dashboardPages.wallet.networkError'));
    }
  }, [txPage, t]);

  useEffect(() => {
    Promise.all([fetchWallet(), fetchTransactions()]).finally(() => setLoading(false));
  }, [fetchWallet, fetchTransactions]);

  const handleWithdraw = async () => {
    setWithdrawError('');
    setWithdrawSuccess('');
    setRibTouched(true);

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 20) {
      setWithdrawError(t('dashboardPages.wallet.minWithdrawError'));
      return;
    }

    if (amount > availableBalance) {
      setWithdrawError(`Le montant demandé (${amount.toFixed(3)} TND) dépasse votre solde disponible (${availableBalance.toFixed(3)} TND).`);
      return;
    }

    if (!ribValidation.isValid) {
      setWithdrawError(
        ribValidation.error ||
          'Veuillez saisir un RIB bancaire tunisien valide à 20 chiffres.',
      );
      return;
    }

    setWithdrawing(true);
    try {
      const ribReference = `RIB: ${ribValidation.formattedRib} (${ribValidation.bankName || 'Banque'})`;
      const combinedNotes = [ribReference, withdrawNotes.trim()].filter(Boolean).join(' | ');

      const res = await fetchWithCsrf('/api/pd/wallet/me/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount, notes: combinedNotes || undefined }),
      });
      if (res.ok) {
        setWithdrawSuccess(t('dashboardPages.wallet.withdrawRequestSuccess'));
        setWithdrawAmount('');
        setWithdrawNotes('');
        fetchWallet();
        fetchTransactions();
      } else {
        const data = await res.json();
        setWithdrawError(data.error?.message || t('dashboardPages.wallet.withdrawRequestError'));
      }
    } catch {
      setWithdrawError(t('dashboardPages.wallet.networkError'));
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
        setWithdrawSuccess(t('dashboardPages.wallet.payoutModeUpdated'));
      } else {
        setWithdrawError(await getErrorMessage(res, t('dashboardPages.wallet.payoutModeError')));
      }
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : t('dashboardPages.wallet.networkError'));
    } finally {
      setSavingMode(false);
    }
  };

  const handleRequestPayout = async (amount: number, targetRib: string) => {
    setWithdrawError('');
    setWithdrawSuccess('');

    const res = await fetchWithCsrf('/api/pd/wallet/me/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ amount, notes: `RIB: ${targetRib}` }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.message || t('dashboardPages.wallet.withdrawRequestError'));
    }
    await Promise.all([fetchWallet(), fetchTransactions()]);
  };

  if (loading) {
    return (
      <div className="space-y-6" dir={dir}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('dashboardPages.wallet.title')}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs"
            >
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-1/2 mb-3" />
              <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {dashboardStyle === 'bento' ? (
        <WalletBentoCockpit
          wallet={wallet}
          transactions={transactions}
          onRefresh={async () => {
            await Promise.all([fetchWallet(), fetchTransactions()]);
          }}
          onRequestPayout={handleRequestPayout}
          onPayoutModeChange={handlePayoutModeChange}
          loading={loading}
          requestingPayout={withdrawing}
          dir={dir}
        />
      ) : (
        <>
          {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('dashboardPages.wallet.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gestion du solde marchand, virements bancaires tunisiens et historique des règlements.
          </p>
        </div>
        <button
          onClick={() => {
            fetchWallet();
            fetchTransactions();
          }}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition shadow-2xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Actualiser</span>
        </button>
      </div>

      {loadError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-sm rounded-2xl border border-rose-200 dark:border-rose-900/50 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-700 via-rose-800 to-rose-950 p-6 text-white shadow-md border border-rose-800/40">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-white/10 dark:bg-white/10 p-1.5 backdrop-blur-xs">
              <Wallet className="w-5 h-5 text-rose-100" />
            </div>
            <span className="text-sm font-medium text-rose-100">
              {t('dashboardPages.wallet.available')}
            </span>
          </div>
          <p className="text-3xl font-black tracking-tight">{formatPrice(wallet?.balance || 0)}</p>
          <p className="text-xs text-rose-200/80 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Disponible pour virement bancaire</span>
          </p>
        </div>

        {/* Pending Escrow Balance */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-1.5">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('dashboardPages.wallet.pending')}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatPrice(wallet?.pending_balance || 0)}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Rétention légale (7j après livraison)</span>
          </p>
        </div>

        {/* Total Earned */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-1.5">
              <ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('dashboardPages.wallet.totalEarned')}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatPrice(wallet?.total_earned || 0)}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Cumul net des ventes validées
          </p>
        </div>

        {/* Total Withdrawn */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-1.5">
              <ArrowUpRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('dashboardPages.wallet.totalWithdrawn')}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatPrice(wallet?.total_withdrawn || 0)}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Règlements virés sur votre compte
          </p>
        </div>
      </div>

      {/* Statutory Retention Explanatory Banner */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5 shadow-2xs flex flex-col sm:flex-row items-start gap-4">
        <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400 shrink-0">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="space-y-1 text-xs">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Politique de Rétention Légale & Séquestre Marchand (Rolling Reserve)
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Conformément aux normes réglementaires du commerce électronique en Tunisie et aux directives de la Banque Centrale de Tunisie (BCT), les fonds issus des commandes livrées sont conservés en séquestre pendant une période de rétention légale de <strong>7 jours calendaires</strong> à compter de la confirmation de livraison par le transporteur.
          </p>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
            Ce mécanisme de réserve tournante protège vos transactions contre les retours non livrés (RTO) ou contestations éventuelles. À l&apos;expiration de ce délai, vos fonds sont automatiquement débloqués vers le solde disponible pour un virement bancaire sans frais.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Payout Mode */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <h2 className="font-bold text-slate-900 dark:text-white">{t('wallet.payoutMode')}</h2>
            </div>
            <div className="space-y-3">
              {(['on_demand', 'automatic'] as const).map((mode) => (
                <label
                  key={mode}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    payoutMode === mode
                      ? 'border-rose-500 bg-rose-50/40 dark:border-rose-500/80 dark:bg-rose-950/20'
                      : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="payout_mode"
                    checked={payoutMode === mode}
                    onChange={() => handlePayoutModeChange(mode)}
                    disabled={savingMode}
                    className="mt-1 text-rose-600 focus:ring-rose-500 dark:text-rose-500 dark:focus:ring-rose-400"
                  />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {mode === 'on_demand'
                        ? t('dashboardPages.wallet.manual')
                        : t('wallet.automatic')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {mode === 'on_demand'
                        ? t('dashboardPages.wallet.manualDescription')
                        : t('dashboardPages.wallet.automaticDescription')}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Bank Security Badge Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Compensation Interbancaire SIBTEL</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Tous les virements sortants sont traités quotidiennement via le système de télé-compensation interbancaire tunisien (SIBTEL) avec vérification automatique de la clé RIB (Modulo 97).
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Délai standard : 2 à 3 jours ouvrables</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Frais : 0.000 TND</span>
            </div>
          </div>
        </div>

        {/* Right Columns: Withdrawal Form & Live Summary Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <h2 className="font-bold text-slate-900 dark:text-white">
                  {t('dashboardPages.wallet.withdrawTitle')}
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Solde dispo : <strong className="text-slate-900 dark:text-white">{formatPrice(availableBalance)}</strong>
              </span>
            </div>

            {withdrawError && (
              <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-medium rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}
            {withdrawSuccess && (
              <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{withdrawSuccess}</span>
              </div>
            )}

            <div className="space-y-5">
              {/* Standardized 20-digit Tunisian RIB input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Relevé d&apos;Identité Bancaire (RIB tunisien à 20 chiffres) *
                  </label>
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                    {ribDigitsCount} / 20 chiffres
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={rib}
                    onChange={(e) => handleRibChange(e.target.value)}
                    placeholder="10 001 1234567890123 45"
                    maxLength={23} // 20 digits + 3 spaces
                    className={`w-full px-4 py-2.5 font-mono text-sm tracking-wide rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none transition ${
                      ribTouched && ribDigitsCount === 20
                        ? ribValidation.isValid
                          ? 'border-emerald-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                          : 'border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                    }`}
                  />
                  {ribValidation.isValid && (
                    <div className="absolute right-3 top-2.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Live Bank Identification Badge */}
                <div className="mt-2 min-h-[26px]">
                  {detectedBank && (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span className="font-bold text-rose-700 dark:text-rose-400">[{detectedBank.acronym}]</span>
                      <span>{detectedBank.nameFr}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">({detectedBank.nameAr})</span>
                    </div>
                  )}

                  {ribTouched && ribDigitsCount === 20 && !ribValidation.isValid && (
                    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{ribValidation.error}</span>
                    </p>
                  )}

                  {ribDigitsCount > 0 && ribDigitsCount < 20 && ribTouched && (
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      Format attendu : 2 chiffres banque + 3 guichet + 13 compte + 2 clé RIB (Modulo 97)
                    </p>
                  )}
                </div>
              </div>

              {/* Amount & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t('dashboardPages.wallet.amountLabel')} *
                    </label>
                    <span className="text-[11px] text-slate-400">Min. 20.000 TND</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="20"
                      step="0.001"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.000"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm font-semibold"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                      TND
                    </span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {[50, 100, 200, 500].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWithdrawAmount(preset.toString())}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        {preset} TND
                      </button>
                    ))}
                    {availableBalance >= 20 && (
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount(availableBalance.toFixed(3))}
                        className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 px-2 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
                      >
                        Tout retirer
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('dashboardPages.wallet.notesLabel')}
                  </label>
                  <input
                    type="text"
                    value={withdrawNotes}
                    onChange={(e) => setWithdrawNotes(e.target.value)}
                    placeholder={t('dashboardPages.wallet.notesPlaceholder')}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm"
                  />
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Référence comptable ou motif optionnel
                  </p>
                </div>
              </div>

              {/* Comprehensive Withdrawal Summary Card */}
              {isValidAmount && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-5 space-y-3 animate-in fade-in text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      Récapitulatif du Virement Bancaire
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      Frais plateforme 0 TND
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Montant brut demandé :</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {parsedAmount.toFixed(3)} TND
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Frais de virement PandaMarket :</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        0.000 TND (Gratuit)
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Banque de destination :</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {detectedBank ? detectedBank.nameFr : 'Non identifiée'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Délai estimé d&apos;exécution :</span>
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        2 à 3 jours ouvrables
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/80 dark:border-slate-700 pt-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        Montant Net Viré sur Compte :
                      </span>
                      <p className="text-[11px] text-slate-400">Aucune commission déduite</p>
                    </div>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {parsedAmount.toFixed(3)} TND
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={withdrawing || !isValidAmount || !isAmountWithinBalance || !ribValidation.isValid}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {withdrawing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t('dashboardPages.wallet.sending')}</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      <span>{t('dashboardPages.wallet.requestWithdraw')}</span>
                    </>
                  )}
                </button>
                {!isAmountWithinBalance && isValidAmount && (
                  <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    Le montant demandé dépasse le solde disponible ({formatPrice(availableBalance)}).
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="font-bold text-slate-900 dark:text-white">
              {t('dashboardPages.wallet.transactionHistory')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => fetchTransactions()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/50 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                <th className="px-6 py-3.5">{t('dashboardPages.wallet.date')}</th>
                <th className="px-6 py-3.5">{t('dashboardPages.wallet.type')}</th>
                <th className="px-6 py-3.5">{t('dashboardPages.wallet.amount')}</th>
                <th className="px-6 py-3.5">{t('dashboardPages.common.status')}</th>
                <th className="px-6 py-3.5">{t('dashboardPages.wallet.reference')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    {t('dashboardPages.wallet.noTransactions')}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const txAmount = toNumber(tx.amount);
                  const isPositive = txAmount >= 0;
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString(
                          locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN',
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-medium capitalize">
                        {tx.type}
                      </td>
                      <td
                        className={`px-6 py-3.5 text-xs font-bold ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatPrice(txAmount)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                            tx.status === 'completed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : tx.status === 'pending'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {tx.reference || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setTxPage((p) => Math.max(1, p - 1))}
            disabled={txPage === 1}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" /> {t('dashboardPages.common.previous')}
          </button>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('dashboardPages.wallet.page', { page: txPage })}
          </span>
          <button
            type="button"
            onClick={() => setTxPage((p) => p + 1)}
            disabled={transactions.length < 20}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {t('dashboardPages.common.next')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
