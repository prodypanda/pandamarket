'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock3,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  CreditCard,
  Copy,
  Check,
  Banknote,
  Landmark,
  TrendingUp,
  Sparkles,
  Download,
  Zap,
  Sliders,
  FileSpreadsheet,
  CheckCheck,
  Search,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  formatTunisianRib,
  validateTunisianRib,
  getTunisianBank,
} from '@/lib/tunisia-banking';

export interface WalletBentoCockpitProps {
  wallet: {
    balance: number | string | null;
    pending_balance: number | string | null;
    total_earned: number | string | null;
    total_withdrawn: number | string | null;
    payout_mode: 'on_demand' | 'automatic';
    retention_days?: number;
    currency?: string;
  } | null;
  transactions: Array<{
    id: string;
    type: string;
    amount: number | string | null;
    status?: string | null;
    reference?: string | null;
    description?: string | null;
    created_at: string;
  }>;
  onRefresh: () => Promise<void>;
  onRequestPayout?: (amount: number, rib: string) => Promise<void>;
  loading: boolean;
  requestingPayout?: boolean;
  dir?: 'ltr' | 'rtl';
  onPayoutModeChange?: (mode: 'on_demand' | 'automatic') => Promise<void>;
  onExportTransactions?: () => void;
  onExportOrders?: () => void;
  accountingProfile?: {
    legal_name?: string;
    tax_identifier?: string;
    business_registration?: string;
    vat_status?: string;
    bank_rib?: string;
    bank_name?: string;
  } | null;
}

function toNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatTnd(price: unknown, currency = 'TND'): string {
  return `${toNumber(price).toFixed(3)} ${currency}`;
}

const RIB_STORAGE_KEY = 'pandamarket_merchant_rib';

export function WalletBentoCockpit({
  wallet,
  transactions,
  onRefresh,
  onRequestPayout,
  loading,
  requestingPayout = false,
  dir = 'ltr',
  onPayoutModeChange,
  onExportTransactions,
  onExportOrders,
  accountingProfile,
}: WalletBentoCockpitProps) {
  const { t, locale } = useLocale();

  // Instant Payout Launcher State
  const [ribInput, setRibInput] = useState('');
  const [ribTouched, setRibTouched] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutError, setPayoutError] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState('');
  const [isInternalSubmitting, setIsInternalSubmitting] = useState(false);

  // Transactions Stream Filter State
  const [txFilter, setTxFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  // Local payout mode state
  const [currentPayoutMode, setCurrentPayoutMode] = useState<'on_demand' | 'automatic'>(
    wallet?.payout_mode || 'on_demand'
  );
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [modeFeedback, setModeFeedback] = useState('');

  // Synchronize payout mode if wallet changes
  useEffect(() => {
    if (wallet?.payout_mode) {
      setCurrentPayoutMode(wallet.payout_mode);
    }
  }, [wallet?.payout_mode]);

  // Load saved RIB from localStorage or accounting profile
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RIB_STORAGE_KEY);
      if (saved) {
        setRibInput(formatTunisianRib(saved));
        return;
      }
    } catch {
      // Ignore localStorage access failures
    }
    if (accountingProfile?.bank_rib) {
      setRibInput(formatTunisianRib(accountingProfile.bank_rib));
    }
  }, [accountingProfile?.bank_rib]);

  // Derived financial numbers
  const balance = toNumber(wallet?.balance);
  const pendingBalance = toNumber(wallet?.pending_balance);
  const totalEarned = toNumber(wallet?.total_earned);
  const totalWithdrawn = toNumber(wallet?.total_withdrawn);
  const totalFunds = balance + pendingBalance;
  const currency = wallet?.currency || 'TND';

  const availableRatio = totalFunds > 0 ? (balance / totalFunds) * 100 : 0;
  const pendingRatio = totalFunds > 0 ? (pendingBalance / totalFunds) * 100 : 0;

  // Modulo 97 validation and live bank metadata
  const ribValidation = useMemo(() => validateTunisianRib(ribInput), [ribInput]);
  const detectedBank = useMemo(() => getTunisianBank(ribInput), [ribInput]);
  const ribDigitsLength = useMemo(() => ribInput.replace(/\D/g, '').length, [ribInput]);

  const parsedAmount = parseFloat(payoutAmount);
  const isAmountNumeric = !isNaN(parsedAmount);
  const isAmountValid = isAmountNumeric && parsedAmount >= 20 && parsedAmount <= balance;

  const handleRibChange = (val: string) => {
    const formatted = formatTunisianRib(val);
    setRibInput(formatted);
    setRibTouched(true);
    setPayoutError('');
    try {
      localStorage.setItem(RIB_STORAGE_KEY, formatted);
    } catch {
      // Ignore
    }
  };

  const handlePresetAmount = (preset: number | 'max') => {
    if (preset === 'max') {
      setPayoutAmount(balance.toFixed(3));
    } else {
      setPayoutAmount(preset.toString());
    }
    setPayoutError('');
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError('');
    setPayoutSuccess('');
    setRibTouched(true);

    if (!isAmountNumeric || parsedAmount < 20) {
      setPayoutError('Le montant minimum de virement bancaire est de 20.000 TND.');
      return;
    }

    if (parsedAmount > balance) {
      setPayoutError(`Le montant demandé (${parsedAmount.toFixed(3)} TND) dépasse votre solde disponible (${balance.toFixed(3)} TND).`);
      return;
    }

    if (!ribValidation.isValid) {
      setPayoutError(
        ribValidation.error || 'Veuillez saisir un RIB bancaire tunisien valide à 20 chiffres.'
      );
      return;
    }

    if (!onRequestPayout) {
      setPayoutError('Le service de virement direct est temporairement indisponible.');
      return;
    }

    setIsInternalSubmitting(true);
    try {
      await onRequestPayout(parsedAmount, ribValidation.formattedRib || ribInput);
      setPayoutSuccess(`Demande de virement de ${parsedAmount.toFixed(3)} TND vers ${ribValidation.bankName || 'votre banque'} initiée avec succès !`);
      setPayoutAmount('');
    } catch (err) {
      setPayoutError(
        err instanceof Error ? err.message : 'Une erreur est survenue lors de la demande de virement.'
      );
    } finally {
      setIsInternalSubmitting(false);
    }
  };

  const handleTogglePayoutMode = async (mode: 'on_demand' | 'automatic') => {
    if (mode === currentPayoutMode || !onPayoutModeChange) return;
    setIsUpdatingMode(true);
    setModeFeedback('');
    try {
      await onPayoutModeChange(mode);
      setCurrentPayoutMode(mode);
      setModeFeedback(
        mode === 'automatic'
          ? 'Mode automatique activé : virements hebdomadaires chaque lundi.'
          : 'Mode sur demande activé : déclenchez vos virements selon vos besoins.'
      );
      setTimeout(() => setModeFeedback(''), 4000);
    } catch {
      setModeFeedback('Impossible de modifier le mode de virement.');
    } finally {
      setIsUpdatingMode(false);
    }
  };

  const handleCopyReference = (ref: string, id: string) => {
    if (!ref) return;
    try {
      navigator.clipboard?.writeText(ref);
      setCopiedTxId(id);
      setTimeout(() => setCopiedTxId(null), 2000);
    } catch {
      // Fallback
    }
  };

  // Concentric SVG ring parameters
  // Outer ring (Available): radius 52, circumference ~326.73
  // Inner ring (Pending): radius 38, circumference ~238.76
  const outerRadius = 52;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const outerOffset = outerCircumference * (1 - Math.min(availableRatio, 100) / 100);

  const innerRadius = 38;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const innerOffset = innerCircumference * (1 - Math.min(pendingRatio, 100) / 100);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const amountNum = toNumber(tx.amount);
      const isCredit = amountNum >= 0 && tx.type !== 'withdrawal';
      const isDebit = amountNum < 0 || tx.type === 'withdrawal';

      if (txFilter === 'credit' && !isCredit) return false;
      if (txFilter === 'debit' && !isDebit) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const ref = (tx.reference || '').toLowerCase();
        const type = tx.type.toLowerCase();
        const status = (tx.status || '').toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        return (
          ref.includes(query) ||
          type.includes(query) ||
          status.includes(query) ||
          desc.includes(query)
        );
      }
      return true;
    });
  }, [transactions, txFilter, searchQuery]);

  // Fiscal accounting checklist items
  const fiscalChecklist = useMemo(() => {
    const hasTaxId = Boolean(accountingProfile?.tax_identifier?.trim());
    const hasLegalName = Boolean(accountingProfile?.legal_name?.trim());
    const hasTradeRegister = Boolean(accountingProfile?.business_registration?.trim());
    const hasRib = Boolean(accountingProfile?.bank_rib?.trim() || ribValidation.isValid);

    const completed = [hasTaxId, hasLegalName, hasTradeRegister, hasRib].filter(Boolean).length;
    const score = Math.round((completed / 4) * 100);

    return {
      score,
      items: [
        { label: 'Matricule Fiscal (NIF)', valid: hasTaxId },
        { label: 'Raison Sociale Vérifiée', valid: hasLegalName },
        { label: 'Registre de Commerce (RNE)', valid: hasTradeRegister },
        { label: 'RIB Bancaire Certifié SIBTEL', valid: hasRib },
      ],
    };
  }, [accountingProfile, ribValidation.isValid]);

  const isSubmitting = requestingPayout || isInternalSubmitting;

  return (
    <div dir={dir} className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
              <Sparkles className="w-3.5 h-3.5" />
              Bento Cockpit Portefeuille
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              SIBTEL Connect
            </span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Cockpit Financier & Trésorerie
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Vélocité des fonds, virements bancaires instantanés et compensation BCT en temps réel.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onExportTransactions && (
            <button
              type="button"
              onClick={onExportTransactions}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-2xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              Exporter Grand Livre
            </button>
          )}

          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-2xs transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* TOP BENTO GRID: VELOCITY COCKPIT & INSTANT PAYOUT LAUNCHER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FEATURE 1: CASH FLOW VELOCITY CARDS WITH DUAL CONCENTRIC RINGS (7 COLUMNS) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Vélocité de Trésorerie Marchand
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ratio liquidité disponible vs fonds COD en transit
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                Total : {formatTnd(totalFunds, currency)}
              </span>
            </div>

            {/* DUAL RINGS & MAIN KPIS */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              {/* SVG Concentric Progress Ring */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center p-3">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                    {/* Background Tracks */}
                    <circle
                      cx="60"
                      cy="60"
                      r={outerRadius}
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth="7"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r={innerRadius}
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth="7"
                      stroke="currentColor"
                      fill="transparent"
                    />

                    {/* Outer Ring: Available Balance (Emerald) */}
                    <circle
                      cx="60"
                      cy="60"
                      r={outerRadius}
                      className="text-emerald-500 dark:text-emerald-400 transition-all duration-700 ease-out"
                      strokeWidth="7"
                      strokeDasharray={outerCircumference}
                      strokeDashoffset={outerOffset}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />

                    {/* Inner Ring: Pending COD Funds (Amber) */}
                    <circle
                      cx="60"
                      cy="60"
                      r={innerRadius}
                      className="text-amber-500 dark:text-amber-400 transition-all duration-700 ease-out"
                      strokeWidth="7"
                      strokeDasharray={innerCircumference}
                      strokeDashoffset={innerOffset}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>

                  {/* Center Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Disponible
                    </span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {balance.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {currency}
                    </span>
                  </div>
                </div>

                {/* Ring Legends */}
                <div className="mt-3 flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Dispo ({availableRatio.toFixed(0)}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>COD ({pendingRatio.toFixed(0)}%)</span>
                  </div>
                </div>
              </div>

              {/* Velocity Breakdown Cards */}
              <div className="sm:col-span-7 space-y-3">
                {/* Available Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                      Solde Disponible au Retrait
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      100% Liquide
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {formatTnd(balance, currency)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      SIBTEL instantané
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(availableRatio, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Pending COD Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock3 className="w-3.5 h-3.5 text-amber-500" />
                      Fonds COD en Transit (Escrow)
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      Délai J+{wallet?.retention_days ?? 7} BCT
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {formatTnd(pendingBalance, currency)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Aramex & La Poste
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pendingRatio, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TOTAL EARNED & TOTAL WITHDRAWN STRIP */}
          <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Total Revenus Encaissés
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatTnd(totalEarned, currency)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                <ArrowUpRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Total Déjà Transféré
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatTnd(totalWithdrawn, currency)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURE 2: INSTANT PAYOUT LAUNCHER WITH 20-DIGIT RIB & BANK BADGE (5 COLUMNS) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Lanceur de Virement SIBTEL
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Virement bancaire certifié Modulo 97
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
                Frais 0.000 TND
              </span>
            </div>

            {/* FORM */}
            <form onSubmit={handlePayoutSubmit} className="mt-5 space-y-4">
              {/* AMOUNT SELECTOR & PRESETS */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Montant à virer (TND)
                  </label>
                  <span className="text-slate-500 dark:text-slate-400">
                    Max: {balance.toFixed(3)} TND
                  </span>
                </div>

                <div className="mt-1.5 relative">
                  <input
                    type="number"
                    step="0.001"
                    min="20"
                    max={balance}
                    value={payoutAmount}
                    onChange={(e) => {
                      setPayoutAmount(e.target.value);
                      setPayoutError('');
                    }}
                    placeholder="Min. 20.000"
                    disabled={isSubmitting || balance < 20}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition disabled:opacity-50"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-xs font-bold text-slate-500 dark:text-slate-400">
                    TND
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {[50, 100, 200, 500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handlePresetAmount(val)}
                      disabled={isSubmitting || balance < val}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {val} TND
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handlePresetAmount('max')}
                    disabled={isSubmitting || balance <= 0}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Tout virer
                  </button>
                </div>
              </div>

              {/* 20-DIGIT RIB INPUT */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    RIB Bancaire Tunisien (20 chiffres)
                  </label>
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      ribDigitsLength === 20
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {ribDigitsLength}/20 chiffres
                  </span>
                </div>

                <div className="mt-1.5 relative">
                  <input
                    type="text"
                    value={ribInput}
                    onChange={(e) => handleRibChange(e.target.value)}
                    maxLength={23} // 20 digits + 3 spaces
                    placeholder="Ex: 08 000 0000000000000 18"
                    disabled={isSubmitting}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm tracking-wider focus:outline-none focus:ring-2 transition ${
                      ribTouched && !ribValidation.isValid
                        ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500'
                        : ribValidation.isValid
                          ? 'border-emerald-300 dark:border-emerald-800 focus:ring-emerald-500'
                          : 'border-slate-200/80 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-white'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <Landmark className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* LIVE BANK DETECTION BADGE */}
                {detectedBank && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-300/60 dark:border-emerald-700 shrink-0">
                        {detectedBank.acronym}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {detectedBank.nameFr}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-arabic">
                          {detectedBank.nameAr}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                      BIC: {detectedBank.bic}
                    </span>
                  </div>
                )}

                {/* MODULO 97 VALIDATION STATUS */}
                {ribTouched && (
                  <div className="mt-2">
                    {ribValidation.isValid ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Clé RIB {ribValidation.ribKey} valide (Modulo 97 certifié)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{ribValidation.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* FEEDBACK NOTICES */}
              {payoutError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{payoutError}</span>
                </div>
              )}

              {payoutSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{payoutSuccess}</span>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting || !isAmountValid || !ribValidation.isValid}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Traitement SIBTEL en cours...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Initier le Virement Bancaire
                  </>
                )}
              </button>
            </form>
          </div>

          {/* SIBTEL CLEARANCE ACCORDION / GUARANTEE */}
          <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Garantie Compensation SIBTEL
            </span>
            <span>Exécution 24h - 48h ouvrées</span>
          </div>
        </div>
      </div>

      {/* BOTTOM BENTO GRID: FISCAL ACCOUNTING OVERVIEW & RECENT TRANSACTION FLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FEATURE 4: FISCAL ACCOUNTING & BCT ROLLING RESERVE (4 COLUMNS) */}
        <div className="lg:col-span-4 space-y-6">
          {/* BCT 7-DAY ROLLING RESERVE NOTICE */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Réserve Statutaire BCT (J+{wallet?.retention_days ?? 7})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Circulaire Banque Centrale de Tunisie 2020-05
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Conformément à la réglementation monétaire tunisienne régissant les encaissements contre remboursement (COD), une réserve de garantie de 7 jours glissants est appliquée pour protéger les marchands contre les retours de colis non réclamés (RTO).
            </p>

            {/* Micro Flow Steps */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Encaissement Livreur (Aramex/Poste)
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">J+0</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <Clock3 className="w-3.5 h-3.5 text-amber-500" />
                  Période de Rétention COD
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">J+7</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  Transfert Instantané Disponible
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">100%</span>
              </div>
            </div>
          </div>

          {/* PAYOUT MODE TOGGLE & FISCAL PROFILE READY GAUGE */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Mode de Décaissement
                </h3>
              </div>
              {onPayoutModeChange && (
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                  Modifiable
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTogglePayoutMode('on_demand')}
                disabled={isUpdatingMode || !onPayoutModeChange}
                className={`p-3 rounded-xl border text-start transition ${
                  currentPayoutMode === 'on_demand'
                    ? 'border-slate-900 dark:border-white bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <p className="text-xs font-bold">Sur Demande</p>
                <p className="mt-0.5 text-[10px] opacity-80">À votre convenance</p>
              </button>

              <button
                type="button"
                onClick={() => handleTogglePayoutMode('automatic')}
                disabled={isUpdatingMode || !onPayoutModeChange}
                className={`p-3 rounded-xl border text-start transition ${
                  currentPayoutMode === 'automatic'
                    ? 'border-slate-900 dark:border-white bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                }`}
              >
                <p className="text-xs font-bold">Automatique</p>
                <p className="mt-0.5 text-[10px] opacity-80">Lundi matin SIBTEL</p>
              </button>
            </div>

            {modeFeedback && (
              <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {modeFeedback}
              </p>
            )}

            {/* Fiscal Readiness Checklist */}
            <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                  Conformité Fiscale Tunisienne
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {fiscalChecklist.score}%
                </span>
              </div>

              <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    fiscalChecklist.score >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${fiscalChecklist.score}%` }}
                />
              </div>

              <div className="mt-3 space-y-1.5">
                {fiscalChecklist.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400"
                  >
                    <span>{item.label}</span>
                    {item.valid ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Conforme
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">À compléter</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FEATURE 3: RECENT TRANSACTION FLOW CARDS & STREAM (8 COLUMNS) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Flux des Transactions & Mouvements
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
                  {filteredTransactions.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Historique des flux entrants (ventes COD) et sortants (virements bancaires)
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setTxFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  txFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setTxFilter('credit')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  txFilter === 'credit'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Entrées (+)
              </button>
              <button
                type="button"
                onClick={() => setTxFilter('debit')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  txFilter === 'debit'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Virements (-)
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="mt-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par référence, type ou statut..."
              className="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* TRANSACTIONS STREAM */}
          <div className="mt-4 space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center">
                <Banknote className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Aucune transaction correspondante
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Les flux financiers apparaîtront dès la confirmation de vos premières commandes.
                </p>
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const amountNum = toNumber(tx.amount);
                const isPositive = amountNum >= 0 && tx.type !== 'withdrawal';
                const formattedDate = new Date(tx.created_at).toLocaleDateString(
                  locale === 'ar' ? 'ar-TN' : 'fr-TN',
                  {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                );

                const typeLabel =
                  tx.type === 'order_revenue'
                    ? 'Encaissement Vente'
                    : tx.type === 'withdrawal'
                      ? 'Virement Bancaire'
                      : tx.type === 'refund'
                        ? 'Remboursement Client'
                        : tx.type.replace(/_/g, ' ');

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between gap-4"
                  >
                    {/* Left side: Icon + Type + Ref + Date */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2.5 rounded-xl border shrink-0 ${
                          isPositive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-800'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                            {typeLabel}
                          </span>

                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                              tx.status === 'completed'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800'
                                : tx.status === 'pending'
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-800'
                                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-800'
                            }`}
                          >
                            {tx.status || 'completed'}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formattedDate}
                          </span>

                          {tx.reference && (
                            <button
                              type="button"
                              onClick={() => handleCopyReference(tx.reference || '', tx.id)}
                              className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                              title="Copier la référence"
                            >
                              <span>{tx.reference}</span>
                              {copiedTxId === tx.id ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Amount */}
                    <div className="text-end shrink-0">
                      <p
                        className={`text-sm font-extrabold font-mono ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatTnd(amountNum, currency)}
                      </p>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                        SIBTEL Réseau
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
