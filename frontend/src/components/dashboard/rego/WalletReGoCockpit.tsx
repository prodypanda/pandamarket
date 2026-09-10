'use client';

import React, { useState, useMemo } from 'react';
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
  CreditCard,
  Copy,
  Check,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Search,
  Lock,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import {
  formatTunisianRib,
  validateTunisianRib,
  getTunisianBank,
} from '@/lib/tunisia-banking';

export interface WalletReGoCockpitProps {
  wallet: {
    balance: number | string | null;
    pending_balance: number | string | null;
    total_earned: number | string | null;
    total_withdrawn: number | string | null;
    payout_mode?: 'on_demand' | 'automatic';
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
}

function toNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function WalletReGoCockpit({
  wallet,
  transactions,
  onRefresh,
  onRequestPayout,
  loading,
  requestingPayout = false,
  dir = 'ltr',
}: WalletReGoCockpitProps) {
  const { t } = useLocale();

  const balance = toNumber(wallet?.balance);
  const pendingBalance = toNumber(wallet?.pending_balance);
  const totalEarned = toNumber(wallet?.total_earned);
  const totalWithdrawn = toNumber(wallet?.total_withdrawn);

  // Payout Form State
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [ribInput, setRibInput] = useState<string>('');
  const [ribTouched, setRibTouched] = useState<boolean>(false);
  const [payoutSuccess, setPayoutSuccess] = useState<boolean>(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  // Selected Transaction for Drawer
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Filter state
  const [searchTx, setSearchTx] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');

  // Validate RIB Modulo 97
  const cleanedRib = ribInput.replace(/\s+/g, '');
  const isRibValid = validateTunisianRib(cleanedRib);
  const bankInfo = getTunisianBank(cleanedRib);

  // Validate Payout Amount
  const parsedAmount = parseFloat(payoutAmount) || 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= balance;

  const handleRibChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 20);
    setRibInput(formatTunisianRib(raw));
    setRibTouched(true);
  };

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRequestPayout || !isRibValid || !isAmountValid || requestingPayout) return;

    setPayoutError(null);
    setPayoutSuccess(false);

    try {
      await onRequestPayout(parsedAmount, cleanedRib);
      setPayoutSuccess(true);
      setPayoutAmount('');
      setTimeout(() => setPayoutSuccess(false), 5000);
    } catch (err: any) {
      setPayoutError(err?.message || 'Erreur lors de la demande de virement');
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (searchTx.trim()) {
        const q = searchTx.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(q);
        const refMatch = (tx.reference || '').toLowerCase().includes(q);
        const idMatch = tx.id.toLowerCase().includes(q);
        if (!descMatch && !refMatch && !idMatch) return false;
      }
      return true;
    });
  }, [transactions, filterType, searchTx]);

  return (
    <div className="space-y-6">
      {/* LAYER 4: Telemetry & KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <ReGoKpiHero
          label="Solde Disponible (Virable)"
          value={<ReGoAmtBox amount={balance} size="md" />}
          hint="Immédiatement virable vers votre RIB"
          icon={Wallet}
        />
        <ReGoKpiHero
          label="En Cours de Collecte COD"
          value={<ReGoAmtBox amount={pendingBalance} size="md" />}
          hint="Auprès des transporteurs tunisiens"
          icon={Clock3}
        />
        <ReGoKpiHero
          label="Total Gains Cumulés"
          value={<ReGoAmtBox amount={totalEarned} size="md" />}
          hint="Chiffre d'affaires net cumulé"
          icon={TrendingUp}
        />
        <ReGoKpiHero
          label="Total Retraits Effectués"
          value={<ReGoAmtBox amount={totalWithdrawn} size="md" />}
          hint="Virements bancaires honorés"
          icon={Building2}
        />
      </div>

      {/* LAYER 6: Main Operational Working Area */}
      <ReGoSplitCard
        left={
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#ad0505]" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Demande de Virement RIB
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold">
                Modulo 97 Conforme
              </span>
            </div>

            <form onSubmit={handleSubmitPayout} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Montant du Virement (TND)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="1"
                    max={balance}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Ex: 500.000"
                    className="w-full pl-3 pe-16 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-[#ad0505] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(String(balance))}
                    className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Solde maximal disponible : <span className="font-bold">{balance.toFixed(3)} TND</span>
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  RIB Tunisien (20 chiffres)
                </label>
                <input
                  type="text"
                  value={ribInput}
                  onChange={handleRibChange}
                  placeholder="08 000 00000000000 00"
                  className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs font-bold font-mono tracking-wider focus:outline-none ${
                    ribTouched
                      ? isRibValid
                        ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-500'
                        : 'border-rose-400 focus:ring-2 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#ad0505]'
                  }`}
                />

                {/* Bank detection badge */}
                {bankInfo && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200/70 dark:border-emerald-800/50">
                    <span className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {bankInfo.name} ({bankInfo.code})
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">RIB Valide</span>
                  </div>
                )}

                {ribTouched && !isRibValid && cleanedRib.length === 20 && (
                  <p className="mt-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                    Clé de contrôle Modulo 97 invalide. Vérifiez les 20 chiffres de votre relevé.
                  </p>
                )}
              </div>

              {payoutSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Demande de virement transmise à l&apos;équipe financière !</span>
                </div>
              )}

              {payoutError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 text-xs font-bold flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{payoutError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!isRibValid || !isAmountValid || requestingPayout || balance <= 0}
                className="w-full py-2.5 rounded-xl bg-[#ad0505] hover:bg-[#8f0404] disabled:opacity-50 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{requestingPayout ? 'Transmission...' : 'Déclencher le virement bancaire'}</span>
              </button>
            </form>
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Grand Livre des Écritures ({filteredTransactions.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => void onRefresh()}
                disabled={loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
                title="Actualiser les écritures"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold">Aucune écriture comptable</p>
                <p className="text-[11px] mt-0.5">Les mouvements financiers apparaîtront lors des ventes et retraits.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {filteredTransactions.map((tx) => {
                  const amount = toNumber(tx.amount);
                  const isCredit = tx.type === 'credit' || tx.type === 'sale' || amount > 0;
                  const dateStr = new Date(tx.created_at).toLocaleDateString('fr-TN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          isCredit
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                        }`}>
                          {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {tx.description || tx.type}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="font-mono">Réf: {tx.reference || tx.id.slice(-8).toUpperCase()}</span>
                            <span>•</span>
                            <span>{dateStr}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-end shrink-0">
                        <span className={`text-xs font-mono font-bold ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                          {isCredit ? '+' : '-'}
                          {Math.abs(amount).toFixed(3)} TND
                        </span>
                        <div className="mt-0.5">
                          <ReGoStatusChip
                            status={tx.status === 'completed' ? 'ok' : tx.status === 'pending' ? 'warn' : 'neutral'}
                            label={tx.status || 'Confirmé'}
                            size="xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        }
      />

      {/* Transaction Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        title={selectedTx ? `Écriture #${selectedTx.id.slice(-8).toUpperCase()}` : 'Détail de l\'opération'}
        subtitle={selectedTx ? `Date: ${new Date(selectedTx.created_at).toLocaleString('fr-TN')}` : ''}
      >
        {selectedTx && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Opération Comptable
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Nature</span>
                <span className="text-xs font-bold uppercase">{selectedTx.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Référence</span>
                <span className="text-xs font-mono font-bold">{selectedTx.reference || selectedTx.id}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Montant comptabilisé</span>
                <ReGoAmtBox amount={toNumber(selectedTx.amount)} size="md" />
              </div>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
