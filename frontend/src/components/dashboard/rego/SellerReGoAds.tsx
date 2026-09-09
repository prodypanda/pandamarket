'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Plus,
  WalletCards,
  Gift,
  Search,
  Eye,
  Edit3,
  Trash2,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BarChart3,
  Layers,
  ShoppingBag,
  Info,
  DollarSign,
  Percent,
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
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export interface Placement {
  id: string;
  name: string;
  format: string;
  default_price: string;
}

export interface Account {
  balance: string;
  reserved_balance: string;
  currency: string;
  total_spend: string;
  active_campaigns: number;
  auto_refill_enabled?: boolean;
  auto_refill_threshold?: string;
  auto_refill_amount?: string;
}

export interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  total_budget: string;
  spent_amount: string;
  bid_amount: string;
  daily_budget: string;
  starts_at?: string;
  ends_at?: string;
  targeting?: Record<string, any>;
  creatives?: Array<{
    id: string;
    title: string;
    description?: string;
    image_url?: string;
    cta_label?: string;
    destination_url?: string;
    product_id?: string;
  }>;
}

export interface Analytics {
  impressions: number;
  clicks: number;
  ctr: number;
  average_cpc: number;
  conversions: number;
  conversion_rate: number;
  revenue: string;
  roas: number;
}

export interface DailyPoint {
  stat_date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: string;
  revenue: string;
}

export interface SellerReGoAdsProps {
  account: Account | null;
  campaigns: Campaign[];
  analytics: Analytics | null;
  daily: DailyPoint[];
  placements: Placement[];
  from: string;
  to: string;
  onSetSellerPreset: (preset: 'today' | '7d' | '30d' | '90d') => void;
  onCreateCampaign: () => void;
  onRefill: () => void;
  onRedeemPromo: () => void;
  onAction: (id: string, name: string) => Promise<void>;
  onEditCampaign: (c: Campaign) => void;
  onPreviewCampaign: (c: Campaign) => void;
  onDeleteCampaign: (c: Campaign) => void;
  error: string;
  successMsg: string;
  loading: boolean;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoAds({
  account,
  campaigns,
  analytics,
  daily: _daily,
  placements: _placements,
  from: _from,
  to: _to,
  onSetSellerPreset,
  onCreateCampaign,
  onRefill,
  onRedeemPromo,
  onAction,
  onEditCampaign,
  onPreviewCampaign,
  onDeleteCampaign,
  error,
  successMsg,
  loading: _loading,
  dir = 'ltr',
}: SellerReGoAdsProps) {
  const { t: _t } = useLocale();
  const [activePreset, setActivePreset] = useState<'today' | '7d' | '30d' | '90d'>('30d');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const balanceNum = parseFloat(account?.balance || '0');
  const isBalanceLow = balanceNum < 5.0;

  const totalPeriodSpend = (analytics?.clicks || 0) * (analytics?.average_cpc || 0);
  const attributedRevenueNum = Number(analytics?.revenue || 0);
  const netMarginTnd = attributedRevenueNum - totalPeriodSpend;
  const isNetMarginPositive = netMarginTnd >= 0;

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.creatives?.[0]?.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter === 'active') return c.status === 'active';
      if (statusFilter === 'paused') return c.status === 'paused';
      if (statusFilter === 'completed') return c.status === 'completed' || c.status === 'budget_exhausted';
      return true;
    });
  }, [campaigns, searchQuery, statusFilter]);

  const handlePresetSelect = (preset: 'today' | '7d' | '30d' | '90d') => {
    setActivePreset(preset);
    onSetSellerPreset(preset);
  };

  return (
    <div dir={dir}>
      <DashboardPageWrapper
        breadcrumbs={[
          { label: 'Accueil', href: '/hub/dashboard' },
          { label: 'Clients & Marketing', href: '/hub/dashboard' },
          { label: 'PandaAds' },
        ]}
        headerTitle="Centre Publicitaire PandaAds"
        headerSubtitle="Boostez la visibilité de vos produits phares sur les emplacements stratégiques de PandaMarket et maximisez votre retour sur investissement net."
        headerIcon={Megaphone}
        statusBadge={
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)] rounded-full">
              Sponsorisation Vendeur
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)] rounded-full">
              Solde : {balanceNum.toFixed(3)} TND
            </span>
          </div>
        }
        secondaryAction={
          <div className="flex items-center gap-2">
            <button
              onClick={onRedeemPromo}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs"
            >
              <Gift className="w-3.5 h-3.5 text-amber-600" />
              <span>Bon Promo</span>
            </button>
            <button
              onClick={onRefill}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs"
            >
              <WalletCards className="w-3.5 h-3.5 text-emerald-600" />
              <span>Recharger Solde</span>
            </button>
          </div>
        }
        primaryAction={
          <button
            onClick={onCreateCampaign}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Créer une Campagne</span>
          </button>
        }
        alertBanner={
          <div className="space-y-2">
            {isBalanceLow && (
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-[var(--rego-r,8px)] border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Solde publicitaire bas ({balanceNum.toFixed(3)} TND) :</strong> Vos annonces risquent d'être interrompues dès épuisement du solde.
                  </span>
                </div>
                <button
                  onClick={onRefill}
                  className="px-3 py-1 bg-amber-600 text-white rounded font-bold text-[11px] hover:bg-amber-700 transition-colors shrink-0"
                >
                  Recharger maintenant
                </button>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-3 p-3.5 rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-3 p-3.5 rounded-[var(--rego-r,8px)] border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        }
        kpiStrip={
          <>
            <ReGoKpiHero
              label="Solde Publicitaire Disponible"
              value={<ReGoAmtBox amount={account?.balance || 0} size="lg" />}
              hint={`Fonds réservés : ${(Number(account?.reserved_balance || 0)).toFixed(3)} TND`}
              icon={WalletCards}
              accent={balanceNum >= 20}
            />
            <ReGoKpiHero
              label="Campagnes en Diffusion"
              value={`${account?.active_campaigns || 0} actives`}
              hint={`Dépenses cumulées : ${(Number(account?.total_spend || 0)).toFixed(3)} TND`}
              icon={Megaphone}
            />
            <ReGoKpiHero
              label="ROAS Global (Période)"
              value={`${analytics?.roas ? Number(analytics.roas).toFixed(2) : '0.00'}x`}
              hint={`Chiffre d'affaires généré : ${(Number(analytics?.revenue || 0)).toFixed(3)} TND`}
              icon={TrendingUp}
              accent={(analytics?.roas || 0) >= 3.0}
            />
            <ReGoKpiHero
              label="Marge Nette Estimée"
              value={<ReGoAmtBox amount={netMarginTnd} size="lg" />}
              hint={isNetMarginPositive ? 'Bénéfice net après coûts pubs' : 'Coûts supérieurs aux revenus'}
              icon={Percent}
            />
          </>
        }
        filterToolbar={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
                <input
                  type="text"
                  placeholder="Rechercher une campagne ou un article..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] focus:bg-[var(--rego-bg,#ffffff)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Status Filter */}
              <div className="flex items-center rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-0.5">
                {[
                  { id: 'all', label: 'Toutes' },
                  { id: 'active', label: 'En diffusion' },
                  { id: 'paused', label: 'En pause' },
                  { id: 'completed', label: 'Épuisées' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id as any)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                      statusFilter === f.id
                        ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                        : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Date Presets */}
              <div className="flex items-center rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-0.5">
                {[
                  { id: 'today', label: 'Aujourd\'hui' },
                  { id: '7d', label: '7j' },
                  { id: '30d', label: '30j' },
                  { id: '90d', label: '90j' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePresetSelect(p.id as any)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                      activePreset === p.id
                        ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                        : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
        mainContent={
          <div className="space-y-6">
            {/* Campaigns Table */}
            {filteredCampaigns.length === 0 ? (
              <ReGoCard>
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--rego-surface,#f5f5f5)] flex items-center justify-center mx-auto mb-3">
                    <Megaphone className="w-6 h-6 text-[var(--rego-ink-3,#949494)]" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
                    {searchQuery || statusFilter !== 'all' ? 'Aucune campagne trouvée' : 'Aucune campagne publicitaire créée'}
                  </h3>
                  <p className="text-xs text-[var(--rego-ink-2,#737373)] max-w-sm mx-auto mt-1 mb-4">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Modifiez vos critères de recherche pour afficher les annonces correspondantes.'
                      : 'Lancez votre première campagne sponsorisée pour afficher vos produits en tête des résultats de recherche.'}
                  </p>
                  <button
                    onClick={onCreateCampaign}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer une Campagne</span>
                  </button>
                </div>
              </ReGoCard>
            ) : (
              <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/60 text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                        <th className="py-3 px-4">Campagne & Produit</th>
                        <th className="py-3 px-4">Emplacement</th>
                        <th className="py-3 px-4">Budget Quotidien / Total</th>
                        <th className="py-3 px-4">Dépensé</th>
                        <th className="py-3 px-4">Statut</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60">
                      {filteredCampaigns.map((c) => {
                        const creative = c.creatives?.[0];
                        const dailyBudget = parseFloat(c.daily_budget || '0');
                        const totalBudget = parseFloat(c.total_budget || '0');
                        const spent = parseFloat(c.spent_amount || '0');

                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors group cursor-pointer"
                            onClick={() => setSelectedCampaign(c)}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] overflow-hidden flex items-center justify-center shrink-0">
                                  {creative?.image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={creative.image_url}
                                      alt={c.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <ShoppingBag className="w-4 h-4 text-[var(--rego-ink-3,#949494)]" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-[var(--rego-fg,#111111)] truncate block">
                                    {c.name}
                                  </span>
                                  {creative?.title && (
                                    <span className="text-[11px] text-[var(--rego-ink-2,#737373)] truncate block">
                                      {creative.title}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)]">
                                {c.campaign_type === 'search'
                                  ? 'Recherche Sponsorisée'
                                  : c.campaign_type === 'home_banner'
                                  ? 'Bannière Accueil'
                                  : 'Catégorie Phare'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <div className="font-bold text-[var(--rego-fg,#111111)]">
                                  <ReGoAmtBox amount={dailyBudget} size="sm" />
                                  <span className="text-[10px] text-[var(--rego-ink-3,#949494)]"> / jour</span>
                                </div>
                                <div className="text-[11px] text-[var(--rego-ink-2,#737373)]">
                                  Total : {totalBudget.toFixed(3)} TND
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <ReGoAmtBox amount={spent} size="sm" />
                            </td>

                            <td className="py-3.5 px-4">
                              <ReGoStatusChip
                                status={
                                  c.status === 'active'
                                    ? 'ok'
                                    : c.status === 'paused'
                                    ? 'warn'
                                    : 'neutral'
                                }
                                label={
                                  c.status === 'active'
                                    ? 'En diffusion'
                                    : c.status === 'paused'
                                    ? 'En pause'
                                    : c.status === 'budget_exhausted'
                                    ? 'Épuisée'
                                    : c.status
                                }
                                size="xs"
                              />
                            </td>

                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {c.status === 'active' ? (
                                  <button
                                    onClick={() => onAction(c.id, 'pause')}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs"
                                  >
                                    Mettre en pause
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => onAction(c.id, 'resume')}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded bg-[var(--rego-fg,#111111)] text-white hover:opacity-90 transition-all shadow-2xs"
                                  >
                                    Activer
                                  </button>
                                )}

                                <button
                                  onClick={() => onPreviewCampaign(c)}
                                  className="p-1.5 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors rounded hover:bg-[var(--rego-surface,#f5f5f5)]"
                                  title="Prévisualiser la publicité"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => onEditCampaign(c)}
                                  className="p-1.5 text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors rounded hover:bg-[var(--rego-surface,#f5f5f5)]"
                                  title="Modifier le budget ou le texte"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => onDeleteCampaign(c)}
                                  className="p-1.5 text-[var(--rego-ink-2,#737373)] hover:text-rose-600 transition-colors rounded hover:bg-rose-50"
                                  title="Supprimer la campagne"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        }
        drawer={
          <ReGoDrawer
            isOpen={!!selectedCampaign}
            onClose={() => setSelectedCampaign(null)}
            title={selectedCampaign?.name || 'Détails de la Campagne'}
            subtitle={selectedCampaign?.campaign_type}
            footer={
              selectedCampaign && (
                <div className="flex items-center justify-between w-full">
                  <button
                    onClick={() => {
                      const c = selectedCampaign;
                      setSelectedCampaign(null);
                      onDeleteCampaign(c);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  >
                    Supprimer
                  </button>
                  <button
                    onClick={() => {
                      const c = selectedCampaign;
                      setSelectedCampaign(null);
                      onEditCampaign(c);
                    }}
                    className="px-4 py-1.5 text-xs font-bold bg-[var(--rego-fg,#111111)] text-white rounded-md hover:opacity-90 transition-all shadow-2xs"
                  >
                    Modifier le budget
                  </button>
                </div>
              )
            }
          >
            {selectedCampaign && (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--rego-ink-2,#737373)]">Statut de diffusion</span>
                    <ReGoStatusChip
                      status={selectedCampaign.status === 'active' ? 'ok' : 'warn'}
                      label={selectedCampaign.status === 'active' ? 'En diffusion' : selectedCampaign.status}
                      size="xs"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--rego-ink-2,#737373)]">Budget quotidien</span>
                    <ReGoAmtBox amount={selectedCampaign.daily_budget} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--rego-ink-2,#737373)]">Budget total alloué</span>
                    <ReGoAmtBox amount={selectedCampaign.total_budget} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--rego-ink-2,#737373)]">Total consommé</span>
                    <ReGoAmtBox amount={selectedCampaign.spent_amount} size="sm" />
                  </div>
                </div>

                {selectedCampaign.creatives?.[0] && (
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] text-[10px] mb-2">
                      Créatif Publicitaire Associé
                    </h4>
                    <div className="p-3 rounded-md border border-[var(--rego-border,#dedede)] bg-white space-y-2">
                      {selectedCampaign.creatives[0].image_url && (
                        <div className="w-full aspect-[2/1] rounded bg-slate-100 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedCampaign.creatives[0].image_url}
                            alt="Aperçu publicitaire"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <h4 className="font-bold text-[var(--rego-fg,#111111)]">
                        {selectedCampaign.creatives[0].title}
                      </h4>
                      {selectedCampaign.creatives[0].description && (
                        <p className="text-[var(--rego-ink-2,#737373)] leading-relaxed">
                          {selectedCampaign.creatives[0].description}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ReGoDrawer>
        }
      />
    </div>
  );
}
