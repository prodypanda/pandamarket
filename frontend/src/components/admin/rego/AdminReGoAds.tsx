'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  ShieldAlert,
  BarChart3,
  Users,
  WalletCards,
  FileText,
  Tag,
  Shield,
  Settings,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Plus,
  Check,
  X,
  Lock,
  ExternalLink,
  Loader2,
  Trash2,
  DollarSign,
  TrendingUp,
  Clock,
  Globe,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';
import { AdsPlatformChart } from '@/components/admin/AdsPlatformChart';
import { getResizedImageUrl } from '@/lib/image-url';

export type Summary = { campaigns: number; pending_review: number; active: number; total_spend: string };

export type Campaign = {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  total_budget: string;
  spent_amount: string;
  bid_amount: string;
  store_id: string;
  store_name: string;
  owner_name?: string;
  owner_email?: string;
  account_balance?: string;
  account_reserved_balance?: string;
  account_status?: string;
  created_at: string;
  starts_at?: string;
  ends_at?: string;
  rejection_reason?: string;
  creatives?: Array<{ id: string; title: string; description?: string; image_url?: string; cta_label?: string; destination_url?: string }>;
  placement_names?: string[];
};

export type Account = { id: string; store_id: string; store_name: string; balance: string; reserved_balance: string; status: string; campaign_count: number; total_spend: string };
export type DailyStat = { stat_date: string; impressions: number; clicks: number; conversions: number; spend: string; revenue: string };
export type Review = { id: string; campaign_name: string; store_name: string; reviewer_email?: string; decision: string; reason?: string; created_at: string };
export type Transaction = { id: string; store_name: string; campaign_name?: string; type: string; amount: string; balance_after: string; created_at: string; refunded?: boolean; description?: string };
export type Placement = { id: string; name: string; placement_key: string; format: string; default_price: string; default_pricing_model: string; enabled: boolean };
export type Coupon = { id: string; code: string; amount: string; max_redemptions: number; redemption_count: number; enabled: boolean; expires_at?: string };
export type BlockedIP = { ip_hash: string; reason?: string; blocked_at: string };

export type AdsConfig = {
  ads_enabled: boolean;
  ads_moderation_required: boolean;
  ads_min_refill_tnd: number;
  ads_max_refill_tnd: number;
  ads_min_daily_budget_tnd: number;
  ads_max_campaign_days: number;
  ads_frequency_cap_daily: number;
  ads_click_attribution_days: number;
  ads_view_attribution_days: number;
  ads_sponsored_products_enabled: boolean;
  ads_sponsored_brands_enabled: boolean;
  ads_sponsored_content_enabled: boolean;
  ads_prohibited_terms: string;
  ads_creative_image_required: boolean;
  ads_max_creative_description_length: number;
};

export interface AdminReGoAdsProps {
  activeTab: 'overview' | 'moderation' | 'advertisers' | 'transactions' | 'placements' | 'coupons' | 'fraud' | 'configuration';
  setActiveTab: (tab: 'overview' | 'moderation' | 'advertisers' | 'transactions' | 'placements' | 'coupons' | 'fraud' | 'configuration') => void;
  summary: Summary | null;
  campaigns: Campaign[];
  accounts: Account[];
  daily: DailyStat[];
  reviews: Review[];
  transactions: Transaction[];
  placements: Placement[];
  coupons: Coupon[];
  blockedIPs: BlockedIP[];
  adsConfig: AdsConfig | null;
  adminFrom: string;
  adminTo: string;
  adminGranularity: 'hourly' | 'daily' | 'monthly';
  setAdminFrom: (val: string) => void;
  setAdminTo: (val: string) => void;
  setAdminGranularity: (val: 'hourly' | 'daily' | 'monthly') => void;
  setPresetRange: (preset: 'today' | '7d' | '30d' | '90d') => void;
  modSearch: string;
  setModSearch: (val: string) => void;
  modStatusFilter: string;
  setModStatusFilter: (val: string) => void;
  selectedModCampaigns: string[];
  setSelectedModCampaigns: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCampaign: Campaign | null;
  setSelectedCampaign: (c: Campaign | null) => void;
  rejectReason: string;
  setRejectReason: (val: string) => void;
  loading: boolean;
  error: string;
  successMsg: string;
  onReview: (id: string, decision: 'approved' | 'rejected', reason?: string) => Promise<void>;
  onBulkReview: (decision: 'approved' | 'rejected') => Promise<void>;
  onSuspendCampaign: (id: string) => Promise<void>;
  onCreditAccount: (account: Account) => Promise<void>;
  onAdjustAccount: (account: Account) => Promise<void>;
  onSetAccountStatus: (account: Account) => Promise<void>;
  onCreateCoupon: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleCoupon: (coupon: Coupon) => Promise<void>;
  onRefundTransaction: (tx: Transaction) => Promise<void>;
  onUpdateConfig: (patch: Partial<AdsConfig>) => Promise<void>;
  onUpdatePlacement: (placement: Placement, patch: Record<string, unknown>) => Promise<void>;
  onBlockIP: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onUnblockIP: (ipHash: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

function getStatusChipVariant(status: string): 'ok' | 'warn' | 'err' | 'neutral' | 'info' {
  switch (status.toLowerCase()) {
    case 'active':
    case 'approved':
      return 'ok';
    case 'pending':
    case 'pending_review':
      return 'warn';
    case 'rejected':
    case 'suspended':
      return 'err';
    case 'completed':
      return 'info';
    default:
      return 'neutral';
  }
}

export function AdminReGoAds({
  activeTab,
  setActiveTab,
  summary,
  campaigns,
  accounts,
  daily,
  reviews,
  transactions,
  placements,
  coupons,
  blockedIPs,
  adsConfig,
  adminFrom,
  adminTo,
  adminGranularity,
  setAdminFrom,
  setAdminTo,
  setAdminGranularity,
  setPresetRange,
  modSearch,
  setModSearch,
  modStatusFilter,
  setModStatusFilter,
  selectedModCampaigns,
  setSelectedModCampaigns,
  selectedCampaign,
  setSelectedCampaign,
  rejectReason,
  setRejectReason,
  loading,
  error,
  successMsg,
  onReview,
  onBulkReview,
  onSuspendCampaign,
  onCreditAccount,
  onAdjustAccount,
  onSetAccountStatus,
  onCreateCoupon,
  onToggleCoupon,
  onRefundTransaction,
  onUpdateConfig,
  onUpdatePlacement,
  onBlockIP,
  onUnblockIP,
  onRefresh,
}: AdminReGoAdsProps) {
  const [inspectCreative, setInspectCreative] = useState<Campaign | null>(null);

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(modSearch.toLowerCase()) ||
      (c.store_name || '').toLowerCase().includes(modSearch.toLowerCase());
    const matchesStatus = modStatusFilter === 'all' || c.status === modStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const tabs: Array<{ key: typeof activeTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { key: 'moderation', label: 'Modération', icon: ShieldAlert },
    { key: 'advertisers', label: 'Annonceurs', icon: Users },
    { key: 'transactions', label: 'Transactions', icon: WalletCards },
    { key: 'placements', label: 'Emplacements', icon: FileText },
    { key: 'coupons', label: 'Coupons Promo', icon: Tag },
    { key: 'fraud', label: 'Bouclier Anti-Fraude', icon: Shield },
    { key: 'configuration', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--rego-border,#dedede)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--rego-accent,#ad0505)]/10 text-[var(--rego-accent,#ad0505)]">
              <Megaphone className="w-3.5 h-3.5" />
              ReGo PandaAds Ad Exchange
            </span>
          </div>
          <h1 className="text-2xl font-black text-[var(--rego-fg,#111111)] tracking-tight mt-1">
            PandaAds Régie & Enchères Sponsorisées
          </h1>
          <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
            Surveillez les enchères au clic, approuvez les visuels publicitaires et gérez les plafonds de dépenses des marchands
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ─── Feedback Alerts ─── */}
      {error && (
        <div className="p-3.5 rounded-[var(--rego-r,8px)] bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-[var(--rego-r,8px)] bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ─── 4 ReGo KPI Hero Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ReGoKpiHero
          label="Dépenses Publicitaires"
          value={<ReGoAmtBox amount={summary?.total_spend || 0} size="md" />}
          icon={DollarSign}
          hint="Volume total consommé"
        />
        <ReGoKpiHero
          label="Campagnes Actives"
          value={(summary?.active || 0).toString()}
          icon={TrendingUp}
          hint="En diffusion sur la marketplace"
        />
        <ReGoKpiHero
          label="En Attente de Revue"
          value={(summary?.pending_review || 0).toString()}
          icon={ShieldAlert}
          hint="Modération requise"
        />
        <ReGoKpiHero
          label="Total Campagnes"
          value={(summary?.campaigns || 0).toString()}
          icon={Layers}
          hint="Créées depuis l'ouverture"
        />
      </div>

      {/* ─── Tab Navigation Bar ─── */}
      <div className="border-b border-[var(--rego-border,#dedede)] flex items-center gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-[var(--rego-accent,#ad0505)] text-[var(--rego-accent,#ad0505)]'
                  : 'border-transparent text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.key === 'moderation' && (summary?.pending_review || 0) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-red-600 text-white font-bold">
                  {summary?.pending_review}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: OVERVIEW & CHART ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <ReGoCard
            title="Télémétrie de Performance PandaAds"
            subtitle="Impressions, clics, conversions et chiffre d'affaires publicitaire"
            icon={BarChart3}
            actions={
              <div className="flex items-center gap-1.5">
                {(['today', '7d', '30d', '90d'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPresetRange(preset)}
                    className="px-2 py-1 rounded text-[11px] font-bold border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition text-[var(--rego-fg,#111111)]"
                  >
                    {preset === 'today' ? 'Aujourd\'hui' : preset === '7d' ? '7j' : preset === '30d' ? '30j' : '90j'}
                  </button>
                ))}
              </div>
            }
          >
            <div className="pt-2">
              <AdsPlatformChart daily={daily} />
            </div>
          </ReGoCard>
        </div>
      )}

      {/* ─── TAB 2: MODERATION & ARBITRATION ─── */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          {/* Moderation filters & Bulk Actions */}
          <ReGoCard noPadding>
            <div className="p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-2,#737373)]" />
                <input
                  type="text"
                  value={modSearch}
                  onChange={(e) => setModSearch(e.target.value)}
                  placeholder="Rechercher par nom de campagne ou boutique..."
                  className="w-full h-9 pl-9 pr-3 text-xs font-medium rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={modStatusFilter}
                  onChange={(e) => setModStatusFilter(e.target.value)}
                  className="h-9 px-3 text-xs font-semibold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                >
                  <option value="all">Tous statuts</option>
                  <option value="pending_review">En attente de revue</option>
                  <option value="active">Actives</option>
                  <option value="rejected">Rejetées</option>
                  <option value="suspended">Suspendues</option>
                </select>

                {selectedModCampaigns.length > 0 && (
                  <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--rego-border,#dedede)]">
                    <span className="text-xs font-bold text-[var(--rego-ink-2,#737373)]">
                      {selectedModCampaigns.length} sélectionnée(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => onBulkReview('approved')}
                      className="px-2.5 py-1.5 rounded-[var(--rego-r,8px)] bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                    >
                      Approuver le lot
                    </button>
                    <button
                      type="button"
                      onClick={() => onBulkReview('rejected')}
                      className="px-2.5 py-1.5 rounded-[var(--rego-r,8px)] bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
                    >
                      Rejeter le lot
                    </button>
                  </div>
                )}
              </div>
            </div>
          </ReGoCard>

          {/* Campaigns Stream */}
          {filteredCampaigns.length === 0 ? (
            <div className="text-center p-12 bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)]">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">Aucune campagne en attente</h3>
              <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-1">
                Toutes les créations publicitaires ont été auditées ou aucun filtre ne correspond.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCampaigns.map((camp) => {
                const isSelected = selectedModCampaigns.includes(camp.id);
                const creative = camp.creatives?.[0];

                return (
                  <div
                    key={camp.id}
                    className="bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)] p-4 transition hover:border-[var(--rego-border-hover,#b0b0b0)] shadow-xs"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Left Column: Checkbox, Banner preview & Meta */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedModCampaigns([...selectedModCampaigns, camp.id]);
                            } else {
                              setSelectedModCampaigns(selectedModCampaigns.filter((id) => id !== camp.id));
                            }
                          }}
                          className="mt-1 rounded accent-[var(--rego-accent,#ad0505)]"
                        />

                        {/* Thumbnail preview */}
                        {creative?.image_url ? (
                          <div className="w-20 h-20 rounded-lg overflow-hidden border border-[var(--rego-border,#dedede)] shrink-0 bg-slate-50">
                            <img
                              src={getResizedImageUrl(creative.image_url, 'thumbnail')}
                              alt={creative.title || camp.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-lg border border-[var(--rego-border,#dedede)] shrink-0 bg-[var(--rego-bg-subtle,#f7f7f7)] flex items-center justify-center text-[var(--rego-ink-2,#737373)]">
                            <Megaphone className="w-6 h-6 opacity-40" />
                          </div>
                        )}

                        {/* Campaign Info */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)] truncate">
                              {camp.name}
                            </h3>
                            <ReGoStatusChip
                              status={getStatusChipVariant(camp.status)}
                              label={camp.status}
                            />
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--rego-bg-subtle,#f7f7f7)] border border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)] uppercase">
                              {camp.campaign_type}
                            </span>
                          </div>

                          <p className="text-xs text-[var(--rego-ink-2,#737373)]">
                            Boutique : <strong className="text-[var(--rego-fg,#111111)]">{camp.store_name}</strong>
                            {camp.owner_email && ` (${camp.owner_email})`}
                          </p>

                          {creative?.description && (
                            <p className="text-xs text-[var(--rego-fg,#111111)] line-clamp-2 italic">
                              "{creative.description}"
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--rego-ink-2,#737373)] pt-1">
                            <span>Budget : <ReGoAmtBox amount={camp.total_budget} size="sm" /></span>
                            <span>Consommé : <ReGoAmtBox amount={camp.spent_amount} size="sm" /></span>
                            <span>Enchère CPC : <ReGoAmtBox amount={camp.bid_amount} size="sm" /></span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Actions */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setInspectCreative(camp)}
                          className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspecter le créatif
                        </button>

                        {camp.status === 'pending_review' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onReview(camp.id, 'approved')}
                              className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-[var(--rego-r,8px)] bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approuver
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const reason = window.prompt('Motif du refus de la campagne :');
                                if (reason) void onReview(camp.id, 'rejected', reason);
                              }}
                              className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-[var(--rego-r,8px)] bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                              Rejeter
                            </button>
                          </div>
                        )}

                        {camp.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => onSuspendCampaign(camp.id)}
                            className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-[var(--rego-r,8px)] border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Suspendre la diffusion
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: ADVERTISERS & WALLETS ─── */}
      {activeTab === 'advertisers' && (
        <ReGoCard
          title="Portefeuilles Annonceurs Marchands"
          subtitle="Soldes rechargés, montants réservés pour enchères et encaissements"
          icon={Users}
        >
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--rego-border,#dedede)] text-[10px] font-black uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                  <th className="pb-2">Boutique</th>
                  <th className="pb-2">Statut Régie</th>
                  <th className="pb-2">Solde Disponible</th>
                  <th className="pb-2">Solde Réservé</th>
                  <th className="pb-2">Dépenses Totales</th>
                  <th className="pb-2">Campagnes</th>
                  <th className="pb-2 text-right">Gestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60 font-semibold text-[var(--rego-fg,#111111)]">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[var(--rego-bg-subtle,#f7f7f7)]/50">
                    <td className="py-2.5 font-bold">{acc.store_name}</td>
                    <td className="py-2.5">
                      <ReGoStatusChip
                        status={acc.status === 'active' ? 'ok' : 'err'}
                        label={acc.status}
                      />
                    </td>
                    <td className="py-2.5"><ReGoAmtBox amount={acc.balance} size="sm" /></td>
                    <td className="py-2.5 text-[var(--rego-ink-2,#737373)]"><ReGoAmtBox amount={acc.reserved_balance} size="sm" /></td>
                    <td className="py-2.5"><ReGoAmtBox amount={acc.total_spend} size="sm" /></td>
                    <td className="py-2.5">{acc.campaign_count}</td>
                    <td className="py-2.5 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => onCreditAccount(acc)}
                        className="px-2 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"
                      >
                        + Crédit Promo
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustAccount(acc)}
                        className="px-2 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[11px] font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)]"
                      >
                        Ajuster
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetAccountStatus(acc)}
                        className={`px-2 py-1 rounded-[var(--rego-r,8px)] text-[11px] font-bold ${
                          acc.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {acc.status === 'active' ? 'Suspendre' : 'Réactiver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReGoCard>
      )}

      {/* ─── TAB 4: TRANSACTIONS AUDIT ─── */}
      {activeTab === 'transactions' && (
        <ReGoCard
          title="Grand Livre des Mouvements Publicitaires"
          subtitle="Recharges de soldes, débits d'enchères au clic et remboursements"
          icon={WalletCards}
        >
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--rego-border,#dedede)] text-[10px] font-black uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Boutique</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Montant</th>
                  <th className="pb-2">Solde Après</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60 font-semibold text-[var(--rego-fg,#111111)]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[var(--rego-bg-subtle,#f7f7f7)]/50">
                    <td className="py-2.5 text-[var(--rego-ink-2,#737373)] font-mono">
                      {new Date(tx.created_at).toLocaleDateString('fr-TN')}
                    </td>
                    <td className="py-2.5 font-bold">{tx.store_name}</td>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--rego-bg-subtle,#f7f7f7)] border border-[var(--rego-border,#dedede)] uppercase">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2.5"><ReGoAmtBox amount={tx.amount} size="sm" /></td>
                    <td className="py-2.5 text-[var(--rego-ink-2,#737373)]"><ReGoAmtBox amount={tx.balance_after} size="sm" /></td>
                    <td className="py-2.5 text-[var(--rego-ink-2,#737373)] truncate max-w-xs">{tx.description || '—'}</td>
                    <td className="py-2.5 text-right">
                      {!tx.refunded && (
                        <button
                          type="button"
                          onClick={() => onRefundTransaction(tx)}
                          className="text-[11px] font-bold text-red-600 hover:underline"
                        >
                          Rembourser
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReGoCard>
      )}

      {/* ─── TAB 5: PLACEMENTS & PRICING MODELS ─── */}
      {activeTab === 'placements' && (
        <ReGoCard
          title="Emplacements & Formats Publicitaires"
          subtitle="Gestion des espaces sponsorisés sur le portail et enchères minimales"
          icon={FileText}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {placements.map((plc) => (
              <div
                key={plc.id}
                className="p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-[var(--rego-fg,#111111)]">{plc.name}</h4>
                    <span className="text-[10px] font-mono text-[var(--rego-ink-2,#737373)]">{plc.placement_key}</span>
                  </div>
                  <label className="flex items-center gap-1 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plc.enabled}
                      onChange={(e) => onUpdatePlacement(plc, { enabled: e.target.checked })}
                      className="rounded accent-[var(--rego-accent,#ad0505)]"
                    />
                    <span>{plc.enabled ? 'Actif' : 'Inactif'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">Format</span>
                    <span className="font-bold">{plc.format}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">Prix Min. Enchère</span>
                    <ReGoAmtBox amount={plc.default_price} size="sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ReGoCard>
      )}

      {/* ─── TAB 6: COUPONS & CREDITS ─── */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          <ReGoCard
            title="Créer un Code Promo PandaAds"
            subtitle="Attribuez des crédits publicitaires de bienvenue ou lors de campagnes spéciales"
            icon={Tag}
          >
            <form onSubmit={onCreateCoupon} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">Code Promo</label>
                <input
                  name="code"
                  placeholder="ex: BIENVENUE50"
                  required
                  className="w-full h-8 px-2.5 text-xs font-mono font-bold uppercase rounded border border-[var(--rego-border,#dedede)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">Montant Offert (TND)</label>
                <input
                  name="amount"
                  type="number"
                  step="1"
                  defaultValue="20"
                  required
                  className="w-full h-8 px-2.5 text-xs font-bold rounded border border-[var(--rego-border,#dedede)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">Utilisations Max</label>
                <input
                  name="max_redemptions"
                  type="number"
                  defaultValue="100"
                  required
                  className="w-full h-8 px-2.5 text-xs font-bold rounded border border-[var(--rego-border,#dedede)] outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full h-8 rounded bg-[var(--rego-accent,#ad0505)] text-white text-xs font-bold hover:opacity-90 transition"
                >
                  Générer le coupon
                </button>
              </div>
            </form>
          </ReGoCard>

          <ReGoCard
            title="Codes Promo Actifs"
            subtitle="Historique des coupons émis et taux d'utilisation"
            icon={Tag}
          >
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--rego-border,#dedede)] text-[10px] font-black uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                    <th className="pb-2">Code</th>
                    <th className="pb-2">Crédit</th>
                    <th className="pb-2">Utilisations</th>
                    <th className="pb-2">Statut</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60 font-semibold">
                  {coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--rego-bg-subtle,#f7f7f7)]/50">
                      <td className="py-2 font-mono font-black">{c.code}</td>
                      <td className="py-2"><ReGoAmtBox amount={c.amount} size="sm" /></td>
                      <td className="py-2">{c.redemption_count} / {c.max_redemptions}</td>
                      <td className="py-2">
                        <ReGoStatusChip
                          status={c.enabled ? 'ok' : 'neutral'}
                          label={c.enabled ? 'Actif' : 'Désactivé'}
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onToggleCoupon(c)}
                          className="text-[11px] font-bold text-[var(--rego-accent,#ad0505)] hover:underline"
                        >
                          {c.enabled ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReGoCard>
        </div>
      )}

      {/* ─── TAB 7: FRAUD & CLICK PROTECTION ─── */}
      {activeTab === 'fraud' && (
        <div className="space-y-4">
          <ReGoCard
            title="Bouclier Anti-Fraude & Bloqueur de Bots"
            subtitle="Protection contre les clics artificiels répétés et draining de budget des marchands"
            icon={Shield}
          >
            <form onSubmit={onBlockIP} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">Hash IP ou Signature</label>
                <input
                  name="ip_hash"
                  placeholder="ex: a1b2c3d4..."
                  required
                  className="w-full h-8 px-2.5 text-xs font-mono rounded border border-[var(--rego-border,#dedede)] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">Motif de Blocage</label>
                <input
                  name="reason"
                  placeholder="ex: Suspicion de clic automatisé répété"
                  required
                  className="w-full h-8 px-2.5 text-xs rounded border border-[var(--rego-border,#dedede)] outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full h-8 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
                >
                  Bloquer cette adresse IP
                </button>
              </div>
            </form>
          </ReGoCard>

          <ReGoCard
            title="Adresses IP sous Interdiction"
            subtitle="Liste noire synchronisée avec le filtre d'enchères au clic"
            icon={Shield}
          >
            {blockedIPs.length === 0 ? (
              <p className="text-xs text-[var(--rego-ink-2,#737373)] py-4 text-center">Aucune IP bloquée.</p>
            ) : (
              <div className="divide-y divide-[var(--rego-border,#dedede)]/60 text-xs">
                {blockedIPs.map((b) => (
                  <div key={b.ip_hash} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-[var(--rego-fg,#111111)]">{b.ip_hash}</span>
                      <p className="text-[11px] text-[var(--rego-ink-2,#737373)]">{b.reason || 'Aucun motif précisé'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUnblockIP(b.ip_hash)}
                      className="px-2.5 py-1 rounded text-[11px] font-bold border border-[var(--rego-border,#dedede)] hover:bg-red-50 text-red-600"
                    >
                      Débloquer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ReGoCard>
        </div>
      )}

      {/* ─── TAB 8: GLOBAL CONFIGURATION ─── */}
      {activeTab === 'configuration' && adsConfig && (
        <ReGoCard
          title="Configuration Globale PandaAds"
          subtitle="Plafonds minimaux de recharges en TND, attribution des clics et modération"
          icon={Settings}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <label className="flex items-center gap-2 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg-subtle,#f7f7f7)] font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={adsConfig.ads_enabled}
                onChange={(e) => onUpdateConfig({ ads_enabled: e.target.checked })}
                className="rounded accent-[var(--rego-accent,#ad0505)]"
              />
              <span>Régie PandaAds Activée</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg-subtle,#f7f7f7)] font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={adsConfig.ads_moderation_required}
                onChange={(e) => onUpdateConfig({ ads_moderation_required: e.target.checked })}
                className="rounded accent-[var(--rego-accent,#ad0505)]"
              />
              <span>Modération Humaine Préalable</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg-subtle,#f7f7f7)] font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={adsConfig.ads_creative_image_required}
                onChange={(e) => onUpdateConfig({ ads_creative_image_required: e.target.checked })}
                className="rounded accent-[var(--rego-accent,#ad0505)]"
              />
              <span>Visuel Obligatoire</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs font-semibold">
            <div>
              <span className="block text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">Recharge Min (TND)</span>
              <input
                type="number"
                value={adsConfig.ads_min_refill_tnd}
                onChange={(e) => onUpdateConfig({ ads_min_refill_tnd: Number(e.target.value) })}
                className="w-full h-8 px-2.5 rounded border border-[var(--rego-border,#dedede)] bg-white font-bold"
              />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">Budget Quotidien Min (TND)</span>
              <input
                type="number"
                value={adsConfig.ads_min_daily_budget_tnd}
                onChange={(e) => onUpdateConfig({ ads_min_daily_budget_tnd: Number(e.target.value) })}
                className="w-full h-8 px-2.5 rounded border border-[var(--rego-border,#dedede)] bg-white font-bold"
              />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-1">Fenêtre d'attribution au clic (jours)</span>
              <input
                type="number"
                value={adsConfig.ads_click_attribution_days}
                onChange={(e) => onUpdateConfig({ ads_click_attribution_days: Number(e.target.value) })}
                className="w-full h-8 px-2.5 rounded border border-[var(--rego-border,#dedede)] bg-white font-bold"
              />
            </div>
          </div>
        </ReGoCard>
      )}

      {/* ─── Creative Inspection Drawer ─── */}
      <ReGoDrawer
        isOpen={!!inspectCreative}
        onClose={() => setInspectCreative(null)}
        title={inspectCreative ? `Audit Créatif : ${inspectCreative.name}` : 'Audit Créatif'}
        subtitle={inspectCreative ? `Boutique marchande: ${inspectCreative.store_name}` : undefined}
        width="max-w-xl"
      >
        {inspectCreative && (
          <div className="space-y-4 p-1">
            {/* Creative Banner HD */}
            {inspectCreative.creatives?.[0]?.image_url ? (
              <div className="rounded-lg overflow-hidden border border-[var(--rego-border,#dedede)] bg-slate-900">
                <img
                  src={getResizedImageUrl(inspectCreative.creatives[0].image_url, 'medium')}
                  alt=""
                  className="w-full max-h-64 object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="p-8 text-center rounded-lg border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg-subtle,#f7f7f7)] text-xs text-[var(--rego-ink-2,#737373)]">
                Aucun visuel graphique attaché à cette campagne
              </div>
            )}

            {/* Campaign Details Table */}
            <div className="p-3.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-bg-subtle,#f7f7f7)] border border-[var(--rego-border,#dedede)] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)] font-semibold">Titre de l'annonce :</span>
                <span className="font-bold text-[var(--rego-fg,#111111)]">{inspectCreative.creatives?.[0]?.title || inspectCreative.name}</span>
              </div>
              {inspectCreative.creatives?.[0]?.destination_url && (
                <div className="flex justify-between">
                  <span className="text-[var(--rego-ink-2,#737373)] font-semibold">Lien de destination :</span>
                  <a
                    href={inspectCreative.creatives[0].destination_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Ouvrir la page cible
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)] font-semibold">Enchère maximale au clic :</span>
                <ReGoAmtBox amount={inspectCreative.bid_amount} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--rego-ink-2,#737373)] font-semibold">Budget total alloué :</span>
                <ReGoAmtBox amount={inspectCreative.total_budget} size="sm" />
              </div>
            </div>

            {/* Quick Action Controls */}
            {inspectCreative.status === 'pending_review' && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await onReview(inspectCreative.id, 'approved');
                    setInspectCreative(null);
                  }}
                  className="flex-1 py-2.5 rounded-[var(--rego-r,8px)] bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                >
                  Valider & Diffuser immédiatement
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const reason = window.prompt('Précisez le motif du refus :');
                    if (reason) {
                      await onReview(inspectCreative.id, 'rejected', reason);
                      setInspectCreative(null);
                    }
                  }}
                  className="py-2.5 px-4 rounded-[var(--rego-r,8px)] bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
                >
                  Refuser
                </button>
              </div>
            )}
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
