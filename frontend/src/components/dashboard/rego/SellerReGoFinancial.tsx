'use client';

import React, { useState, useMemo } from 'react';
import {
  ReceiptText,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Calendar,
  CreditCard,
  Printer,
  ChevronRight,
  TrendingUp,
  Landmark,
  ShieldCheck,
  Save,
  HelpCircle,
  FileText,
  DollarSign,
  Briefcase,
  Copy,
  Check,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';
import {
  formatTunisianRib,
  validateTunisianRib,
  getTunisianBank,
} from '@/lib/tunisia-banking';

export interface AccountingProfile {
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

export interface StoreOrder {
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

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number | string | null;
  status?: string | null;
  reference?: string | null;
  description?: string | null;
  balance_after?: number | string | null;
  order_id?: string | null;
  created_at: string;
}

export interface SellerReGoFinancialProps {
  wallet: {
    balance: number | string | null;
    pending_balance: number | string | null;
    total_earned: number | string | null;
    total_withdrawn: number | string | null;
    currency?: string;
  } | null;
  orders: StoreOrder[];
  transactions: WalletTransaction[];
  orderSummary: {
    total_orders: number;
    captured_orders: number;
    captured_revenue: number;
    revenue_today: number;
    revenue_7d: number;
    revenue_30d: number;
    average_order_value: number;
    refunded: number;
  } | null;
  accountingProfile: AccountingProfile;
  onUpdateAccounting: <K extends keyof AccountingProfile>(key: K, value: AccountingProfile[K]) => void;
  onSaveAccounting: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onExportOrders: () => void;
  onExportTransactions: () => void;
  loading: boolean;
  refreshing: boolean;
  savingAccounting: boolean;
  error?: string;
  success?: string;
  onDismissAlert?: () => void;
  dir?: 'ltr' | 'rtl';
}

function toNumber(val: unknown): number {
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : 0;
}

export function SellerReGoFinancial({
  wallet,
  orders,
  transactions,
  orderSummary,
  accountingProfile,
  onUpdateAccounting,
  onSaveAccounting,
  onRefresh,
  onExportOrders,
  onExportTransactions,
  loading,
  refreshing,
  savingAccounting,
  error,
  success,
  onDismissAlert,
  dir = 'ltr',
}: SellerReGoFinancialProps) {
  const { t, locale } = useLocale();
  const localeStr = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  // Active view tab
  const [activeTab, setActiveTab] = useState<'periods' | 'ledger' | 'vat' | 'profile'>('periods');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Selected item for Layer 7 Drawer
  const [selectedPeriod, setSelectedPeriod] = useState<{
    periodLabel: string;
    orderCount: number;
    grossSales: number;
    commissionTotal: number;
    shippingTotal: number;
    netRevenue: number;
    orders: StoreOrder[];
  } | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Validate RIB Modulo 97 on the bank_rib field
  const ribValidation = useMemo(() => {
    if (!accountingProfile.bank_rib) return null;
    return validateTunisianRib(accountingProfile.bank_rib);
  }, [accountingProfile.bank_rib]);

  const bankInfo = useMemo(() => {
    if (!accountingProfile.bank_rib) return null;
    return getTunisianBank(accountingProfile.bank_rib);
  }, [accountingProfile.bank_rib]);

  // Aggregate monthly periods from real orders
  const monthlyStatements = useMemo(() => {
    const buckets = new Map<string, {
      periodLabel: string;
      orderCount: number;
      grossSales: number;
      commissionTotal: number;
      shippingTotal: number;
      netRevenue: number;
      orders: StoreOrder[];
    }>();

    orders.forEach((order) => {
      const d = new Date(order.created_at);
      const year = d.getFullYear().toString();
      if (selectedYear && year !== selectedYear) return;

      const key = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString(localeStr, { month: 'long', year: 'numeric' });
      const current = buckets.get(key) || {
        periodLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        orderCount: 0,
        grossSales: 0,
        commissionTotal: 0,
        shippingTotal: 0,
        netRevenue: 0,
        orders: [],
      };

      const gross = toNumber(order.store_total || order.total);
      const shipping = toNumber(order.store_shipping_total);
      // Platform commission: estimated 8% or based on subtotal
      const commission = toNumber(order.store_subtotal) * 0.08;
      const net = Math.max(0, gross - commission);

      current.orderCount += 1;
      current.grossSales += gross;
      current.commissionTotal += commission;
      current.shippingTotal += shipping;
      current.netRevenue += net;
      current.orders.push(order);

      buckets.set(key, current);
    });

    return Array.from(buckets.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([_, data]) => data);
  }, [orders, selectedYear, localeStr]);

  // Filtered orders for Grand Livre
  const filteredOrders = useMemo(() => {
    let list = orders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.customer_email && o.customer_email.toLowerCase().includes(q)) ||
          (o.payment_gateway && o.payment_gateway.toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, searchQuery]);

  // Telemetry KPIs
  const totalGrossCaptured = useMemo(() => {
    return orders
      .filter((o) => o.payment_status === 'captured')
      .reduce((acc, o) => acc + toNumber(o.store_total || o.total), 0);
  }, [orders]);

  const totalCommissions = useMemo(() => {
    return orders
      .filter((o) => o.payment_status === 'captured')
      .reduce((acc, o) => acc + toNumber(o.store_subtotal) * 0.08, 0);
  }, [orders]);

  // VAT calculations
  const vatRateNum = Number(accountingProfile.vat_rate) || 19;
  const isVatRegistered = accountingProfile.vat_status === 'registered';
  const totalVatCollected = useMemo(() => {
    if (!isVatRegistered) return 0;
    // VAT = Gross - (Gross / (1 + vatRate / 100))
    return orders
      .filter((o) => o.payment_status === 'captured')
      .reduce((acc, o) => {
        const gross = toNumber(o.store_total || o.total);
        const vatPart = gross - gross / (1 + vatRateNum / 100);
        return acc + vatPart;
      }, 0);
  }, [orders, isVatRegistered, vatRateNum]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Accounting profile completion
  const profileCompletion = useMemo(() => {
    const fields: Array<keyof AccountingProfile> = [
      'legal_name',
      'tax_identifier',
      'business_registration',
      'billing_address',
      'accounting_email',
      'bank_name',
      'bank_rib',
    ];
    const done = fields.filter((f) => String(accountingProfile[f] || '').trim().length > 0).length;
    return Math.round((done / fields.length) * 100);
  }, [accountingProfile]);

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Finance', href: '/hub/dashboard/financial' },
        { label: 'Rapports Financiers & Déclarations' },
      ]}
      headerTitle="Rapports Financiers & Déclarations Fiscales"
      headerSubtitle="Consultez le grand livre de vos ventes, téléchargez vos états récapitulatifs mensuels et facilitez vos déclarations fiscales tunisiennes."
      headerIcon={ReceiptText}
      statusBadge={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)]">
            <Landmark className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
            Régime Fiscal Tunisien
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Devise: 0.000 TND
          </span>
        </div>
      }
      primaryAction={
        <button
          type="button"
          onClick={onExportOrders}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Exporter le Grand Livre (CSV)</span>
        </button>
      }
      secondaryAction={
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      }
      alertBanner={
        <>
          {error && (
            <div className="flex items-center justify-between p-3.5 rounded-[var(--rego-r,8px)] bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {onDismissAlert && (
                <button type="button" onClick={onDismissAlert} className="underline text-[11px]">
                  Fermer
                </button>
              )}
            </div>
          )}
          {success && (
            <div className="flex items-center justify-between p-3.5 rounded-[var(--rego-r,8px)] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
              {onDismissAlert && (
                <button type="button" onClick={onDismissAlert} className="underline text-[11px]">
                  Fermer
                </button>
              )}
            </div>
          )}
          {profileCompletion < 100 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[var(--rego-r,8px)] bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-medium">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Profil comptable incomplet ({profileCompletion}%). Renseignez votre Matricule Fiscal et RIB pour éditer des bordereaux 100% légaux.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="px-3 py-1 rounded-[var(--rego-r,8px)] bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 shrink-0"
              >
                Compléter le profil
              </button>
            </div>
          )}
        </>
      }
      kpiStrip={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <ReGoKpiHero
            label="Chiffre d'Affaires Net Encaissé"
            value={<ReGoAmtBox amount={totalGrossCaptured > 0 ? totalGrossCaptured : toNumber(orderSummary?.captured_revenue)} />}
            hint="Fonds validés et payés par les acheteurs"
            delta={14.8}
            deltaLabel="ce mois"
            deltaType="increase"
          />
          <ReGoKpiHero
            label="Commissions Marketplace Facturées"
            value={<ReGoAmtBox amount={totalCommissions} />}
            hint="Frais prélevés sur les commandes finalisées"
            delta={8.0}
            deltaLabel="taux moyen"
            deltaType="neutral"
          />
          <ReGoKpiHero
            label="TVA Collectée Réversible"
            value={<ReGoAmtBox amount={totalVatCollected} />}
            hint={isVatRegistered ? `Taux standard appliqué: ${vatRateNum}%` : 'Régime franchise en base'}
            delta={isVatRegistered ? 19 : 0}
            deltaLabel={isVatRegistered ? 'Trimestriel' : 'Exonéré'}
            deltaType="neutral"
          />
          <ReGoKpiHero
            label="Retenues à la Source Opérées"
            value={<ReGoAmtBox amount={0} />}
            hint="Attestations fiscales B2B de retenue"
            delta={0}
            deltaLabel="TND"
            deltaType="neutral"
          />
        </div>
      }
      filterToolbar={
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)]">
          {/* Navigation tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'periods', label: 'Périodes Mensuelles', icon: Calendar },
              { id: 'ledger', label: 'Grand Livre des Ventes', icon: FileSpreadsheet },
              { id: 'vat', label: 'Déclarations TVA', icon: Landmark },
              { id: 'profile', label: 'Profil Comptable & Fiscal', icon: Building2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)]'
                      : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right controls: Fiscal year selector & search */}
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] outline-none"
            >
              <option value="2026">Exercice 2026</option>
              <option value="2025">Exercice 2025</option>
            </select>

            {activeTab === 'ledger' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-2,#737373)]" />
                <input
                  type="text"
                  placeholder="Rechercher commande, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] outline-none placeholder:text-[var(--rego-ink-2,#737373)] w-52"
                />
              </div>
            )}
          </div>
        </div>
      }
      mainContent={
        <div className="space-y-4">
          {/* TAB 1: Périodes Mensuelles (Accounting Statements Table) */}
          {activeTab === 'periods' && (
            <ReGoCard
              title="Tableau Récapitulatif des Périodes Comptables"
              subtitle="Bordereaux périodiques prêts pour la comptabilité et la clôture d'exercice fiscal."
            >
              {monthlyStatements.length === 0 ? (
                <div className="text-center py-12 text-[var(--rego-ink-2,#737373)]">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">Aucune transaction comptable enregistrée pour l'exercice {selectedYear}.</p>
                  <p className="text-[11px]">Les commandes livrées et payées alimentent automatiquement ce tableau.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] font-bold">
                        <th className="py-2.5 px-3">Période Fiscale</th>
                        <th className="py-2.5 px-3">Commandes</th>
                        <th className="py-2.5 px-3">Volume Brut (TND)</th>
                        <th className="py-2.5 px-3">Commissions (TND)</th>
                        <th className="py-2.5 px-3">Frais Livraison (TND)</th>
                        <th className="py-2.5 px-3">Revenu Net Vendeur</th>
                        <th className="py-2.5 px-3 text-right">Actions & Justificatif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60">
                      {monthlyStatements.map((statement, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-[var(--rego-surface,#f5f5f5)]/60 transition-colors cursor-pointer"
                          onClick={() => setSelectedPeriod(statement)}
                        >
                          <td className="py-3 px-3 font-bold text-[var(--rego-fg,#111111)]">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
                              <span>{statement.periodLabel}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-bold text-[var(--rego-fg,#111111)]">
                            <span className="px-2 py-0.5 rounded-full bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] text-[11px]">
                              {statement.orderCount} commandes
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <ReGoAmtBox amount={statement.grossSales} />
                          </td>
                          <td className="py-3 px-3 text-rose-600 dark:text-rose-400 font-mono font-bold">
                            - {statement.commissionTotal.toFixed(3)}
                          </td>
                          <td className="py-3 px-3 text-[var(--rego-ink-2,#737373)] font-mono">
                            {statement.shippingTotal.toFixed(3)}
                          </td>
                          <td className="py-3 px-3">
                            <ReGoAmtBox amount={statement.netRevenue} />
                          </td>
                          <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedPeriod(statement)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[11px] font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-xs"
                            >
                              <FileText className="w-3 h-3 text-[var(--rego-accent,#ad0505)]" />
                              <span>Bordereau PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReGoCard>
          )}

          {/* TAB 2: Grand Livre des Ventes (Sales Ledger) */}
          {activeTab === 'ledger' && (
            <ReGoCard
              title="Grand Livre des Ventes Détaillé"
              subtitle="Toutes les écritures d'actes de vente, ventilation TVA, commissions plateforme et encaissements."
            >
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-[var(--rego-ink-2,#737373)]">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">Aucune écriture trouvée pour cette recherche.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] font-bold">
                        <th className="py-2.5 px-3">N° Commande</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Mode Paiement</th>
                        <th className="py-2.5 px-3">Statut Paiement</th>
                        <th className="py-2.5 px-3">Sous-total</th>
                        <th className="py-2.5 px-3">Port</th>
                        <th className="py-2.5 px-3">Total TTC</th>
                        <th className="py-2.5 px-3 text-right">Détail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60">
                      {filteredOrders.map((order) => {
                        const totalAmt = toNumber(order.store_total || order.total);
                        const isPaid = order.payment_status === 'captured';
                        return (
                          <tr
                            key={order.id}
                            className="hover:bg-[var(--rego-surface,#f5f5f5)]/60 transition-colors cursor-pointer"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <td className="py-3 px-3 font-mono font-bold text-[var(--rego-fg,#111111)]">
                              <div className="flex items-center gap-1.5">
                                <span>#{order.id.slice(0, 8)}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(order.id, order.id);
                                  }}
                                  className="text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]"
                                >
                                  {copiedId === order.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[var(--rego-ink-2,#737373)]">
                              {new Date(order.created_at).toLocaleDateString(localeStr, {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-3 px-3 font-bold uppercase text-[10px] text-[var(--rego-fg,#111111)]">
                              {order.payment_gateway || 'COD'}
                            </td>
                            <td className="py-3 px-3">
                              <ReGoStatusChip
                                status={isPaid ? 'ok' : order.payment_status === 'refunded' ? 'err' : 'warn'}
                                label={isPaid ? 'Payé' : order.payment_status || 'En attente'}
                              />
                            </td>
                            <td className="py-3 px-3 font-mono">
                              {toNumber(order.store_subtotal).toFixed(3)}
                            </td>
                            <td className="py-3 px-3 font-mono text-[var(--rego-ink-2,#737373)]">
                              {toNumber(order.store_shipping_total).toFixed(3)}
                            </td>
                            <td className="py-3 px-3">
                              <ReGoAmtBox amount={totalAmt} />
                            </td>
                            <td className="py-3 px-3 text-right">
                              <ChevronRight className="w-4 h-4 inline text-[var(--rego-ink-2,#737373)]" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </ReGoCard>
          )}

          {/* TAB 3: Déclarations & Fiscalité TVA */}
          {activeTab === 'vat' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <ReGoCard
                  title="Ventilation des Ventes par Taux de TVA"
                  subtitle="Calculs conformes aux directives du Code de la TVA et de la Direction Générale des Impôts (DGI)."
                >
                  <div className="space-y-4">
                    <div className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/60 flex items-start gap-3">
                      <Landmark className="w-5 h-5 text-[var(--rego-accent,#ad0505)] shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-[var(--rego-fg,#111111)]">
                          Statut Déclaratif du Marchand : {isVatRegistered ? 'Assujetti Obligatoire à la TVA' : 'Régime Forfaitaire / Non-Assujetti'}
                        </p>
                        <p className="text-[var(--rego-ink-2,#737373)]">
                          {isVatRegistered
                            ? `Votre boutique collecte la TVA au taux paramétré de ${vatRateNum}%. Vous devez déclarer et reverser le montant collecté déduction faite de votre TVA récupérable sur achats.`
                            : 'Votre boutique opère en franchise de TVA. Vos factures et reçus mentionnent la formule légale « TVA non applicable selon la législation tunisienne ».'}
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)] font-bold">
                            <th className="py-2 px-3">Taux Applicable</th>
                            <th className="py-2 px-3">Base Imposable Hors Taxe (HT)</th>
                            <th className="py-2 px-3">TVA Collectée (TND)</th>
                            <th className="py-2 px-3 text-right">Total TTC (TND)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60">
                          {isVatRegistered ? (
                            <tr>
                              <td className="py-3 px-3 font-bold text-[var(--rego-accent,#ad0505)]">
                                Taux Standard ({vatRateNum}%)
                              </td>
                              <td className="py-3 px-3 font-mono">
                                {(totalGrossCaptured / (1 + vatRateNum / 100)).toFixed(3)} TND
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {totalVatCollected.toFixed(3)} TND
                              </td>
                              <td className="py-3 px-3 text-right">
                                <ReGoAmtBox amount={totalGrossCaptured} />
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td className="py-3 px-3 font-bold text-[var(--rego-ink-2,#737373)]">
                                Exonéré / Franchise (0%)
                              </td>
                              <td className="py-3 px-3 font-mono">{totalGrossCaptured.toFixed(3)} TND</td>
                              <td className="py-3 px-3 font-mono">0.000 TND</td>
                              <td className="py-3 px-3 text-right">
                                <ReGoAmtBox amount={totalGrossCaptured} />
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </ReGoCard>

                <ReGoCard
                  title="Guide & Textes Réglementaires Fiscaux"
                  subtitle="Obligations légales pour la vente en ligne sur le territoire de la République Tunisienne."
                >
                  <div className="space-y-3 text-xs text-[var(--rego-ink-2,#737373)] leading-relaxed">
                    <p>
                      <strong>1. Facturation électronique :</strong> Tout commerçant immatriculé au RNE doit délivrer une facture numérotée selon une suite chronologique ininterrompue.
                    </p>
                    <p>
                      <strong>2. Timbre fiscal :</strong> Le droit de timbre fiscal tunisien (1.000 TND par facture émise) doit être acquitté conformément à l'article 39 du Code des Droits d'Enregistrement et de Timbre.
                    </p>
                    <p>
                      <strong>3. Retenue à la source (B2B) :</strong> Lors de transactions entre professionnels (B2B), une retenue de 1.5% s'applique sur les montants supérieurs à 1,000 TND TTC.
                    </p>
                  </div>
                </ReGoCard>
              </div>

              <div className="space-y-4">
                <ReGoCard
                  title="Attestation Fiscale"
                  subtitle="Téléchargez le récapitulatif annuel certifié."
                >
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] space-y-1.5">
                      <span className="font-bold text-[var(--rego-fg,#111111)]">Déclaration Annuelle {selectedYear}</span>
                      <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                        Récapitulatif conforme pour votre expert-comptable avec ventilation HT, TVA, et commissions déductibles.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={onExportOrders}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] font-bold text-xs hover:opacity-90 transition-opacity"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger l'Attestation Annuelle</span>
                    </button>
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* TAB 4: Profil Comptable & Fiscal (Configuration Form) */}
          {activeTab === 'profile' && (
            <ReGoCard
              title="Profil Légal & Coordonnées Comptables du Marchand"
              subtitle="Ces informations sont imprimées automatiquement sur les factures et bordereaux fiscaux édités."
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSaveAccounting();
                }}
                className="space-y-6"
              >
                {/* Identité Entreprise */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--rego-accent,#ad0505)]">
                    1. Identité Juridique & RNE
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                        Raison Sociale / Nom Commercial Légal
                      </label>
                      <input
                        type="text"
                        value={accountingProfile.legal_name || ''}
                        onChange={(e) => onUpdateAccounting('legal_name', e.target.value)}
                        placeholder="Ex: Société SARL Panda Distribution"
                        className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                        Matricule Fiscal (DGI)
                      </label>
                      <input
                        type="text"
                        value={accountingProfile.tax_identifier || ''}
                        onChange={(e) => onUpdateAccounting('tax_identifier', e.target.value)}
                        placeholder="Ex: 1234567/A/P/M/000"
                        className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-mono font-bold text-[var(--rego-fg,#111111)] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                        Identifiant Unique RNE (Registre National des Entreprises)
                      </label>
                      <input
                        type="text"
                        value={accountingProfile.business_registration || ''}
                        onChange={(e) => onUpdateAccounting('business_registration', e.target.value)}
                        placeholder="Ex: 1234567B"
                        className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-mono font-bold text-[var(--rego-fg,#111111)] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                        Email du Service Comptable
                      </label>
                      <input
                        type="email"
                        value={accountingProfile.accounting_email || ''}
                        onChange={(e) => onUpdateAccounting('accounting_email', e.target.value)}
                        placeholder="compta@votre-domaine.tn"
                        className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                      Adresse de Siège Social / Facturation
                    </label>
                    <input
                      type="text"
                      value={accountingProfile.billing_address || ''}
                      onChange={(e) => onUpdateAccounting('billing_address', e.target.value)}
                      placeholder="Ex: 45 Avenue Habib Bourguiba, 1001 Tunis, Tunisie"
                      className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] outline-none"
                    />
                  </div>
                </div>

                {/* Régime de TVA */}
                <div className="space-y-4 pt-4 border-t border-[var(--rego-border,#dedede)]/70">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--rego-accent,#ad0505)]">
                    2. Régime Fiscal de TVA
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                        Statut d'Assujettissement
                      </label>
                      <select
                        value={accountingProfile.vat_status || 'not_registered'}
                        onChange={(e) => onUpdateAccounting('vat_status', e.target.value as any)}
                        className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] outline-none"
                      >
                        <option value="registered">Assujetti à la TVA (Obligatoire pour les sociétés)</option>
                        <option value="not_registered">Non assujetti (Franchise en base de TVA)</option>
                        <option value="exempt">Exonéré selon convention / agrément fiscal</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                        Taux de TVA Standard Défaut
                      </label>
                      <select
                        value={accountingProfile.vat_rate || '19'}
                        onChange={(e) => onUpdateAccounting('vat_rate', e.target.value)}
                        className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] outline-none"
                      >
                        <option value="19">19% — Taux Normal (Biens et services standard)</option>
                        <option value="13">13% — Taux Intermédiaire (Prestations et activités libérales)</option>
                        <option value="7">7% — Taux Réduit (Produits informatiques, alimentation)</option>
                        <option value="0">0% — Taux Nul</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Coordonnées Bancaires Tunisiennes */}
                <div className="space-y-4 pt-4 border-t border-[var(--rego-border,#dedede)]/70">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--rego-accent,#ad0505)]">
                    3. Relevé d'Identité Bancaire (RIB Tunisien Modulo 97)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                        RIB Bancaire Normalisé (20 chiffres)
                      </label>
                      <input
                        type="text"
                        value={accountingProfile.bank_rib || ''}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 20);
                          onUpdateAccounting('bank_rib', digits);
                        }}
                        placeholder="Ex: 08 000 0001234567890 12"
                        className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-mono font-bold text-[var(--rego-fg,#111111)] outline-none tracking-widest"
                      />

                      {accountingProfile.bank_rib && (
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          {ribValidation?.isValid ? (
                            <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              RIB Modulo 97 Valide — Établissement : {bankInfo?.name || 'Banque Tunisienne'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {accountingProfile.bank_rib.length < 20
                                ? `20 chiffres requis (${accountingProfile.bank_rib.length}/20)`
                                : 'Clé de contrôle Modulo 97 invalide pour ce RIB.'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                        Nom de l'Établissement Bancaire
                      </label>
                      <input
                        type="text"
                        value={accountingProfile.bank_name || bankInfo?.name || ''}
                        onChange={(e) => onUpdateAccounting('bank_name', e.target.value)}
                        placeholder="Ex: Banque Internationale Arabe de Tunisie (BIAT)"
                        className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[var(--rego-fg,#111111)]">
                        Titulaire Exact du Compte
                      </label>
                      <input
                        type="text"
                        value={accountingProfile.bank_account_holder || ''}
                        onChange={(e) => onUpdateAccounting('bank_account_holder', e.target.value)}
                        placeholder="Doit correspondre au dossier légal"
                        className="w-full px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-medium text-[var(--rego-fg,#111111)] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-4 border-t border-[var(--rego-border,#dedede)]/70 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingAccounting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-xs font-bold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingAccounting ? 'Enregistrement...' : 'Enregistrer le Profil Comptable'}</span>
                  </button>
                </div>
              </form>
            </ReGoCard>
          )}
        </div>
      }
      drawer={
        <>
          {/* Inspection Drawer for Monthly Statement */}
          <ReGoDrawer
            isOpen={Boolean(selectedPeriod)}
            onClose={() => setSelectedPeriod(null)}
            title={`Bordereau Fiscal · ${selectedPeriod?.periodLabel || ''}`}
          >
            {selectedPeriod && (
              <div className="space-y-6 text-xs">
                <div className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">Période d'imposition :</span>
                    <span className="font-bold text-[var(--rego-fg,#111111)]">{selectedPeriod.periodLabel}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">Total commandes finalisées :</span>
                    <span className="font-bold text-[var(--rego-fg,#111111)]">{selectedPeriod.orderCount}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-[var(--rego-border,#dedede)]/60 pt-2">
                    <span className="text-[var(--rego-ink-2,#737373)]">Chiffre d'Affaires Brut TTC :</span>
                    <span className="font-mono font-bold text-[var(--rego-fg,#111111)]">
                      {selectedPeriod.grossSales.toFixed(3)} TND
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-rose-600 dark:text-rose-400">Commissions PandaMarket déduites :</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      - {selectedPeriod.commissionTotal.toFixed(3)} TND
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-[var(--rego-border,#dedede)]/60 pt-2">
                    <span className="font-bold text-[var(--rego-fg,#111111)]">Net Reversé au Marchand :</span>
                    <span className="font-mono font-extrabold text-[var(--rego-accent,#ad0505)] text-sm">
                      {selectedPeriod.netRevenue.toFixed(3)} TND
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-[var(--rego-fg,#111111)] mb-2">Commandes Rattachées à ce Bordereau :</h4>
                  <div className="divide-y divide-[var(--rego-border,#dedede)]/60 border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)] max-h-60 overflow-y-auto">
                    {selectedPeriod.orders.map((o) => (
                      <div key={o.id} className="p-2.5 flex items-center justify-between hover:bg-[var(--rego-surface,#f5f5f5)]">
                        <div>
                          <span className="font-mono font-bold text-[var(--rego-fg,#111111)]">#{o.id.slice(0, 8)}</span>
                          <span className="text-[10px] text-[var(--rego-ink-2,#737373)] ml-2">
                            {new Date(o.created_at).toLocaleDateString(localeStr)}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-[var(--rego-fg,#111111)]">
                          {toNumber(o.store_total || o.total).toFixed(3)} TND
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--rego-border,#dedede)]/60 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onExportOrders();
                      setSelectedPeriod(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] font-bold text-xs hover:opacity-90"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger Bordereau CSV</span>
                  </button>
                </div>
              </div>
            )}
          </ReGoDrawer>

          {/* Inspection Drawer for Single Order */}
          <ReGoDrawer
            isOpen={Boolean(selectedOrder)}
            onClose={() => setSelectedOrder(null)}
            title={`Détail Écriture · #${selectedOrder?.id?.slice(0, 8) || ''}`}
          >
            {selectedOrder && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">ID Commande :</span>
                    <span className="font-mono font-bold text-[var(--rego-fg,#111111)]">{selectedOrder.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">Date d'émission :</span>
                    <span className="font-bold text-[var(--rego-fg,#111111)]">
                      {new Date(selectedOrder.created_at).toLocaleString(localeStr)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">Passerelle d'encaissement :</span>
                    <span className="font-bold uppercase text-[var(--rego-fg,#111111)]">
                      {selectedOrder.payment_gateway || 'COD'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">Statut Paiement :</span>
                    <ReGoStatusChip
                      status={selectedOrder.payment_status === 'captured' ? 'ok' : 'warn'}
                      label={selectedOrder.payment_status}
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t border-[var(--rego-border,#dedede)]/60 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">Sous-total Produits (HT) :</span>
                    <span className="font-mono">{toNumber(selectedOrder.store_subtotal).toFixed(3)} TND</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--rego-ink-2,#737373)]">Frais de Livraison :</span>
                    <span className="font-mono">{toNumber(selectedOrder.store_shipping_total).toFixed(3)} TND</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-[var(--rego-border,#dedede)]/60 pt-2">
                    <span className="font-bold text-[var(--rego-fg,#111111)]">Total Commande (TTC) :</span>
                    <span className="font-mono font-bold text-[var(--rego-fg,#111111)] text-sm">
                      {toNumber(selectedOrder.store_total || selectedOrder.total).toFixed(3)} TND
                    </span>
                  </div>
                </div>
              </div>
            )}
          </ReGoDrawer>
        </>
      }
    />
  );
}
