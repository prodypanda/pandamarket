'use client';

import React, { useState } from 'react';
import {
  Crown,
  Users,
  Send,
  Download,
  Search,
  AlertCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Tag,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Zap,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';
import { BroadcastComposer } from '../BroadcastComposer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type {
  LoyaltyDashboardData,
  SubscriberItem,
  BroadcastHistoryItem,
} from '../SellerLoyaltyDashboard';

export interface SellerReGoLoyaltyProps {
  data: LoyaltyDashboardData | null;
  loading: boolean;
  error: string | null;
  activeTab: 'overview' | 'subscribers' | 'broadcasts';
  onTabChange: (tab: 'overview' | 'subscribers' | 'broadcasts') => void;
  subscribers: SubscriberItem[];
  subscribersLoading: boolean;
  subscribersTotal: number;
  subscribersPage: number;
  subscribersTotalPages: number;
  subscribersSearch: string;
  onSubscribersSearchChange: (v: string) => void;
  subscribersVerifiedFilter: boolean;
  onSubscribersVerifiedFilterChange: (v: boolean) => void;
  onSubscribersPageChange: (p: number) => void;
  onExportCsv: () => Promise<void>;
  exportingCsv: boolean;
  onRefresh: () => Promise<void>;
  onRefreshSubscribers: () => void | Promise<void>;
  onFlush: () => void | Promise<void>;
  flushing: boolean;
  flushStatus: string | null;
  onBroadcastSuccess: (broadcast: BroadcastHistoryItem, quota: number) => void;
  dir?: 'ltr' | 'rtl';
}

function BroadcastStatusBadge({ status }: { status: BroadcastHistoryItem['status'] }) {
  return (
    <ReGoStatusChip
      status={status === 'active' || status === 'sent' ? 'ok' : 'neutral'}
      label={status === 'active' ? 'Actif' : status === 'sent' ? 'Envoyé' : 'Expiré'}
      size="xs"
    />
  );
}

function CouponCodeCell({ code }: { code: string }) {
  return (
    <span className="px-2 py-0.5 rounded bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] border border-[var(--rego-accent-line,rgba(173,5,5,0.2))] font-mono font-bold text-[var(--rego-accent,#ad0505)]">
      {code}
    </span>
  );
}

export function SellerReGoLoyalty({
  data,
  loading: _loading,
  error,
  activeTab,
  onTabChange,
  subscribers,
  subscribersLoading,
  subscribersTotal,
  subscribersPage,
  subscribersTotalPages,
  subscribersSearch,
  onSubscribersSearchChange,
  subscribersVerifiedFilter,
  onSubscribersVerifiedFilterChange,
  onSubscribersPageChange,
  onExportCsv,
  exportingCsv,
  onRefresh,
  onRefreshSubscribers,
  onFlush,
  flushing,
  flushStatus,
  onBroadcastSuccess,
  dir = 'ltr',
}: SellerReGoLoyaltyProps) {
  const { t } = useLocale();
  const [showTrustDrawer, setShowTrustDrawer] = useState(false);
  const [showFlushConfirm, setShowFlushConfirm] = useState(false);

  const kpis = data?.kpis;
  const broadcasts = data?.broadcasts || [];
  const governorates = data?.governorate_distribution || {};
  const trust = kpis?.trust_score;
  const quota = kpis?.broadcasts_remaining_this_week ?? 0;
  const totalGovSubs = Object.values(governorates).reduce((a, b) => a + b, 0);
  const totalFollowers = data?.total_subscribers ?? kpis?.total_subscribers ?? 0;
  const verifiedFollowers =
    data?.verified_subscribers ?? Math.round((totalFollowers * (kpis?.verified_pct || 0)) / 100);

  return (
    <div dir={dir}>
      <DashboardPageWrapper
        breadcrumbs={[
          { label: 'Accueil', href: '/hub/dashboard' },
          { label: 'Clients & Marketing', href: '/hub/dashboard' },
          { label: 'Abonnés & Fidélité' },
        ]}
        headerTitle="Abonnés, Coupons Privés & Fidélité"
        headerSubtitle="Fidélisez vos acheteurs, envoyez des codes promotionnels exclusifs à vos abonnés et analysez la provenance de votre audience tunisienne."
        headerIcon={Crown}
        statusBadge={
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)] rounded-full">
              Programme VIP Marchand
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)] rounded-full">
              Trust Score : {trust ? trust.overall.toFixed(2) : '—'} / 5
            </span>
            <span data-testid="broadcast-quota-badge">
              <ReGoStatusChip
                status={quota > 0 ? 'ok' : 'warn'}
                label={`${quota}/2 ${t('sellerLoyalty.broadcastQuota') || 'diffusions restantes'}`}
                size="xs"
              />
            </span>
          </div>
        }
        secondaryAction={
          <div className="flex items-center rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-0.5">
            <button
              type="button"
              onClick={() => onTabChange('overview')}
              data-testid="tab-overview"
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                  : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
              }`}
            >
              Vue d&apos;Ensemble
            </button>
            <button
              type="button"
              onClick={() => onTabChange('subscribers')}
              data-testid="tab-subscribers"
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                activeTab === 'subscribers'
                  ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                  : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
              }`}
            >
              Audience & Abonnés ({totalFollowers.toLocaleString('fr-TN')})
            </button>
            <button
              type="button"
              onClick={() => onTabChange('broadcasts')}
              data-testid="tab-broadcasts"
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                activeTab === 'broadcasts'
                  ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                  : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
              }`}
            >
              {t('sellerLoyalty.broadcastTab') || 'Diffusions'} ({quota}/2)
            </button>
          </div>
        }
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            {flushStatus && (
              <span
                role="status"
                className="px-2.5 py-1 text-[10px] font-bold rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                {flushStatus}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowFlushConfirm(true)}
              disabled={flushing}
              data-testid="btn-flush-notifications"
              title="Envoyer immédiatement toutes les alertes de baisse de prix ou nouveautés en attente dans le buffer 15min"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
            >
              {flushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>{flushing ? 'Envoi en cours...' : 'Forcer l’envoi des alertes'}</span>
            </button>
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={_loading}
              title="Actualiser les données de fidélité"
              className="p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] hover:text-[var(--rego-fg,#111111)] transition-colors shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowTrustDrawer(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Détails Trust Score</span>
            </button>
          </div>
        }
        alertBanner={
          error && (
            <div className="flex items-center gap-3 p-3.5 rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )
        }
        kpiStrip={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" data-testid="loyalty-kpis-grid">
            <div data-testid="kpi-total-subscribers" className="contents">
              <ReGoKpiHero
                label={t('sellerLoyalty.totalSubscribers') || 'Total Abonnés'}
                value={totalFollowers.toLocaleString('fr-TN')}
                hint="Audience directe"
                icon={Users}
                accent
              />
            </div>
            <div data-testid="kpi-new-this-week" className="contents">
              <ReGoKpiHero
                label={t('sellerLoyalty.newThisWeek') || 'Nouveaux cette semaine'}
                value={`+${kpis?.new_this_week ?? 0}`}
                hint="Acquisition 7 jours"
                icon={Sparkles}
              />
            </div>
            <div data-testid="kpi-verified-buyers" className="contents">
              <ReGoKpiHero
                label={t('sellerLoyalty.verifiedBuyers') || 'Acheteurs Vérifiés'}
                value={`${kpis?.verified_pct ?? 0}%`}
                hint="Au moins 1 commande validée"
                icon={ShieldCheck}
              />
            </div>
            <div data-testid="kpi-growth-rate" className="contents">
              <ReGoKpiHero
                label={t('sellerLoyalty.growthRate') || 'Taux de Croissance'}
                value={`+${kpis?.growth_rate_pct ?? 0}%`}
                hint="Mensuel consolidé"
                icon={TrendingUp}
              />
            </div>
          </div>
        }
        mainContent={
          activeTab === 'overview' ? (
            <div className="space-y-6">
              <div data-testid="seller-trust-score-card">
                <ReGoCard
                  title={t('sellerLoyalty.trustScore') || 'Score de Confiance Vendeur'}
                  subtitle="Formule logarithmique officielle PandaMarket"
                  icon={ShieldCheck}
                  badge={
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                      {trust ? `${trust.overall.toFixed(2)} / 5.00` : '— / 5.00'}
                    </span>
                  }
                  actions={
                    <button
                      type="button"
                      onClick={() => setShowTrustDrawer(true)}
                      className="px-2.5 py-1 text-[10px] font-bold rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors"
                    >
                      Barème complet
                    </button>
                  }
                >
                  <div className="space-y-3">
                    <p className="text-[11px] leading-relaxed text-[var(--rego-ink-2,#737373)]">
                      Calculé via la formule logarithmique officielle : 0.40·Avis + 0.30·SLA + 0.20·log₁₀(Abonnés Vérifiés+1) - 0.10·Litiges.
                    </p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div className="p-2.5 rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] space-y-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                          ⭐ Avis
                        </span>
                        <span className="text-sm font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          {trust ? trust.rating_component.toFixed(2) : '—'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] space-y-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                          📦 SLA
                        </span>
                        <span className="text-sm font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          {trust ? trust.sla_component.toFixed(2) : '—'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] space-y-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                          👥 Abonnés
                        </span>
                        <span className="text-sm font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          {trust ? `+${trust.subscribers_log_component.toFixed(2)}` : '—'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] space-y-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                          ⚖️ Litiges
                        </span>
                        <span className="text-sm font-black font-mono tabular-nums text-rose-600 dark:text-rose-400">
                          {trust ? `-${trust.dispute_penalty.toFixed(2)}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </ReGoCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <ReGoCard
                    title="Diffuser une Notification Privée aux Abonnés"
                    subtitle="Envoyez un code promotionnel exclusif directement sur le flux mobile de vos abonnés"
                    icon={Send}
                  >
                    <BroadcastComposer
                      totalSubscribers={totalFollowers}
                      verifiedSubscribers={verifiedFollowers}
                      remainingQuota={quota}
                      onSuccess={onBroadcastSuccess}
                    />
                  </ReGoCard>
                </div>

                <div className="lg:col-span-5">
                  <ReGoCard
                    title={t('sellerLoyalty.governoratesDistribution') || 'Répartition par Gouvernorat'}
                    subtitle="Origine géographique de votre audience dans les 24 gouvernorats tunisiens"
                    icon={MapPin}
                    badge={
                      totalGovSubs > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] text-[var(--rego-ink-2,#737373)]">
                          {totalGovSubs.toLocaleString('fr-TN')} abonnés
                        </span>
                      ) : undefined
                    }
                  >
                    {Object.keys(governorates).length === 0 ? (
                      <div
                        className="py-8 text-center text-xs text-[var(--rego-ink-3,#949494)]"
                        data-testid="empty-governorate-data"
                      >
                        Aucune donnée géographique pour le moment.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1" data-testid="governorates-list">
                        {Object.entries(governorates)
                          .sort((a, b) => b[1] - a[1])
                          .map(([gov, count]) => {
                            const pct = totalGovSubs > 0 ? ((count / totalGovSubs) * 100).toFixed(1) : '0.0';
                            return (
                              <div key={gov} data-testid={`gov-row-${gov}`} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <span className="text-[var(--rego-fg,#111111)]">{gov}</span>
                                  <span className="text-[var(--rego-ink-2,#737373)] font-mono">
                                    {count} abonnés ({pct}%)
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-[var(--rego-surface,#f5f5f5)] overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--rego-accent,#ad0505)] rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </ReGoCard>
                </div>
              </div>

              <ReGoCard
                title="Historique des Campagnes de Notification Récentes"
                subtitle="Codes promo envoyés et conversions générées"
                icon={Crown}
              >
                {broadcasts.length === 0 ? (
                  <p className="text-xs text-[var(--rego-ink-2,#737373)] py-6 text-center">
                    Aucune notification privée diffusée à ce jour.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Titre de la Campagne</th>
                          <th className="py-2.5 px-3">Code Promo</th>
                          <th className="py-2.5 px-3">Remise</th>
                          <th className="py-2.5 px-3">Destinataires</th>
                          <th className="py-2.5 px-3">Utilisations</th>
                          <th className="py-2.5 px-3">CA Généré</th>
                          <th className="py-2.5 px-3">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60">
                        {broadcasts.slice(0, 5).map((b) => (
                          <tr key={b.id} data-testid={`broadcast-row-${b.id}`} className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors">
                            <td className="py-3 px-3 whitespace-nowrap text-[var(--rego-ink-3,#949494)]">
                              {new Date(b.created_at).toLocaleDateString('fr-TN')}
                            </td>
                            <td className="py-3 px-3 font-bold text-[var(--rego-fg,#111111)]">
                              {b.title}
                            </td>
                            <td className="py-3 px-3">
                              <CouponCodeCell code={b.coupon_code} />
                            </td>
                            <td className="py-3 px-3 font-bold text-[var(--rego-fg,#111111)]">
                              {b.discount_value}
                            </td>
                            <td className="py-3 px-3 text-[var(--rego-ink-2,#737373)]">
                              {b.recipients_count} abonnés
                            </td>
                            <td className="py-3 px-3 text-[var(--rego-fg,#111111)] font-mono font-bold">
                              {b.claims_count} ({b.claim_rate_pct}%)
                            </td>
                            <td className="py-3 px-3 font-bold">
                              <ReGoAmtBox amount={b.generated_gmv_tnd} size="sm" />
                            </td>
                            <td className="py-3 px-3">
                              <BroadcastStatusBadge status={b.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ReGoCard>
            </div>
          ) : activeTab === 'broadcasts' ? (
            <div className="space-y-6">
              <ReGoCard
                title="Diffuser une Notification Privée aux Abonnés"
                subtitle="Envoyez un code promotionnel exclusif directement sur le flux mobile de vos abonnés"
                icon={Send}
              >
                <BroadcastComposer
                  totalSubscribers={totalFollowers}
                  verifiedSubscribers={verifiedFollowers}
                  remainingQuota={quota}
                  onSuccess={onBroadcastSuccess}
                />
              </ReGoCard>

              <ReGoCard
                title="Campagnes & Codes Promo Diffusés"
                subtitle="Toutes les opérations promotionnelles adressées aux abonnés de la boutique"
                icon={Send}
              >
                {broadcasts.length === 0 ? (
                  <div className="py-12 text-center" data-testid="empty-broadcast-history">
                    <Tag className="w-8 h-8 text-[var(--rego-ink-3,#949494)] mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">Aucune diffusion</h4>
                    <p className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5">
                      Utilisez le formulaire ci-dessus pour envoyer votre premier code promotionnel.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs border-collapse" data-testid="broadcast-history-table">
                      <thead>
                        <tr className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Titre de la Campagne</th>
                          <th className="py-2.5 px-3">Message</th>
                          <th className="py-2.5 px-3">Code Promo</th>
                          <th className="py-2.5 px-3">Remise</th>
                          <th className="py-2.5 px-3">Audience Ciblée</th>
                          <th className="py-2.5 px-3">Utilisations</th>
                          <th className="py-2.5 px-3">CA Généré</th>
                          <th className="py-2.5 px-3">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60">
                        {broadcasts.map((b) => (
                          <tr key={b.id} data-testid={`broadcast-row-${b.id}`} className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors">
                            <td className="py-3 px-3 whitespace-nowrap text-[var(--rego-ink-3,#949494)]">
                              {new Date(b.created_at).toLocaleDateString('fr-TN')}
                            </td>
                            <td className="py-3 px-3 font-bold text-[var(--rego-fg,#111111)]">
                              {b.title}
                            </td>
                            <td className="py-3 px-3 text-[var(--rego-ink-2,#737373)] max-w-xs truncate">
                              {b.message}
                            </td>
                            <td className="py-3 px-3">
                              <CouponCodeCell code={b.coupon_code} />
                            </td>
                            <td className="py-3 px-3 font-bold text-[var(--rego-fg,#111111)]">
                              {b.discount_value}
                            </td>
                            <td className="py-3 px-3 text-[var(--rego-ink-2,#737373)]">
                              {b.target_audience === 'verified_only' ? 'Acheteurs Vérifiés' : 'Tous les abonnés'} ({b.recipients_count})
                            </td>
                            <td className="py-3 px-3 text-[var(--rego-fg,#111111)] font-mono font-bold">
                              {b.claims_count} ({b.claim_rate_pct}%)
                            </td>
                            <td className="py-3 px-3 font-bold">
                              <ReGoAmtBox amount={b.generated_gmv_tnd} size="sm" />
                            </td>
                            <td className="py-3 px-3">
                              <BroadcastStatusBadge status={b.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ReGoCard>
            </div>
          ) : (
            <div className="space-y-4" data-testid="section-subscribers-list">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-2xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
                  <input
                    type="text"
                    placeholder={t('sellerLoyalty.searchPlaceholder') || 'Rechercher par nom, email ou ville...'}
                    value={subscribersSearch}
                    onChange={(e) => onSubscribersSearchChange(e.target.value)}
                    className="w-full ps-8 pe-3 py-1.5 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] focus:bg-[var(--rego-bg,#ffffff)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--rego-ink-2,#737373)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subscribersVerifiedFilter}
                      onChange={(e) => onSubscribersVerifiedFilterChange(e.target.checked)}
                      className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)] focus:ring-0"
                    />
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t('sellerLoyalty.verifiedOnly') || 'Acheteurs vérifiés uniquement'}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => void onRefreshSubscribers()}
                    disabled={subscribersLoading}
                    title="Actualiser la liste"
                    className="p-2 rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] hover:text-[var(--rego-fg,#111111)] transition-colors shadow-2xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${subscribersLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={onExportCsv}
                    disabled={exportingCsv}
                    data-testid="btn-export-subscribers-csv"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{exportingCsv ? 'Export...' : (t('sellerLoyalty.exportCsv') || 'Exporter CSV')}</span>
                  </button>
                </div>
              </div>

              <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse" data-testid="subscribers-table">
                    <thead>
                      <tr className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                        <th className="py-2.5 px-3">Abonné</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Ville</th>
                        <th className="py-2.5 px-3">Statut Acheteur</th>
                        <th className="py-2.5 px-3">Préférences</th>
                        <th className="py-2.5 px-3">Date d&apos;Abonnement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60">
                      {subscribersLoading ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
                            <p className="text-xs text-[var(--rego-ink-2,#737373)]">Chargement de votre audience...</p>
                          </td>
                        </tr>
                      ) : subscribers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center">
                            <Users className="w-7 h-7 text-[var(--rego-ink-3,#949494)] mx-auto mb-2" />
                            <p className="text-xs font-bold text-[var(--rego-fg,#111111)]">Aucun abonné trouvé</p>
                            <p className="mt-1 text-[11px] text-[var(--rego-ink-2,#737373)]">
                              Modifiez vos critères de recherche ou partagez votre boutique.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        subscribers.map((s) => {
                          const fullName = [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Abonné Anonyme';
                          return (
                            <tr key={s.id} data-testid={`subscriber-row-${s.id}`} className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors">
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)] flex items-center justify-center text-[10px] font-black uppercase shrink-0">
                                    {fullName.charAt(0)}
                                  </div>
                                  <span className="font-bold text-[var(--rego-fg,#111111)]">{fullName}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 font-mono text-[var(--rego-ink-2,#737373)]">
                                {s.email}
                              </td>
                              <td className="py-3 px-3 text-[var(--rego-fg,#111111)]">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-[var(--rego-ink-3,#949494)]" />
                                  {s.city || 'Non renseigné'}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                {s.is_verified_buyer ? (
                                  <ReGoStatusChip status="ok" label="Acheteur Vérifié (VIP)" size="xs" />
                                ) : (
                                  <ReGoStatusChip status="neutral" label="Prospect" size="xs" />
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {s.notify_price_drops && (
                                    <span
                                      title="Alertes baisses de prix"
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
                                    >
                                      Baisses
                                    </span>
                                  )}
                                  {s.notify_new_products && (
                                    <span
                                      title="Alertes nouveautés"
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                                    >
                                      Nouveautés
                                    </span>
                                  )}
                                  {!s.notify_price_drops && !s.notify_new_products && (
                                    <span className="text-[11px] text-[var(--rego-ink-3,#949494)]">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-[var(--rego-ink-3,#949494)]">
                                {new Date(s.created_at).toLocaleDateString('fr-TN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {subscribersTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 text-xs">
                    <span className="text-[var(--rego-ink-2,#737373)]">
                      Page {subscribersPage} sur {subscribersTotalPages} ({subscribersTotal} abonnés)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSubscribersPageChange(subscribersPage - 1)}
                        disabled={subscribersPage <= 1}
                        className="p-1 rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors disabled:opacity-40"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSubscribersPageChange(subscribersPage + 1)}
                        disabled={subscribersPage >= subscribersTotalPages}
                        className="p-1 rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors disabled:opacity-40"
                      >
                        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        }
        drawer={
          <ReGoDrawer
            isOpen={showTrustDrawer}
            onClose={() => setShowTrustDrawer(false)}
            title="Barème du Trust Score Marchand"
            subtitle="Indicateurs de confiance et fidélité PandaMarket"
            footer={
              <button
                type="button"
                onClick={() => setShowTrustDrawer(false)}
                className="w-full px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-2xs"
              >
                Fermer
              </button>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--rego-fg,#111111)]">Score de Confiance Global</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {trust ? `${trust.overall.toFixed(2)} / 5.00` : '— / 5.00'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--rego-ink-2,#737373)] leading-relaxed">
                  Formule officielle : 0.40·Avis + 0.30·SLA + 0.20·log₁₀(Abonnés Vérifiés+1) - 0.10·Litiges.
                  Ce score détermine votre éligibilité aux diffusions de coupons en masse et renforce la visibilité de votre boutique dans les recommandations de la marketplace.
                </p>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] text-[10px]">
                  Composantes du Barème
                </h4>
                <div className="space-y-2 text-[var(--rego-fg,#111111)]">
                  <div className="flex items-center justify-between p-2 rounded border border-[var(--rego-border,#dedede)]">
                    <span>Avis & Évaluations Clients</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {trust ? `+${trust.rating_component.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border border-[var(--rego-border,#dedede)]">
                    <span>Respect des Délais d&apos;Expédition (SLA)</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {trust ? `+${trust.sla_component.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border border-[var(--rego-border,#dedede)]">
                    <span>Fidélisation & Rétention des Abonnés</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {trust ? `+${trust.subscribers_log_component.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border border-[var(--rego-border,#dedede)]">
                    <span>Pénalités Litiges / Refus COD</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {trust ? `-${trust.dispute_penalty.toFixed(2)}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ReGoDrawer>
        }
        modals={
          <ConfirmDialog
            isOpen={showFlushConfirm}
            onClose={() => {
              if (!flushing) setShowFlushConfirm(false);
            }}
            onConfirm={async () => {
              await onFlush();
              setShowFlushConfirm(false);
            }}
            loading={flushing}
            title="Forcer l'envoi des alertes ?"
            description="Toutes les alertes de baisse de prix et de nouveautés en attente dans le buffer de 15 minutes seront envoyées immédiatement à vos abonnés concernés."
            confirmLabel="Envoyer Maintenant"
            cancelLabel="Annuler"
            variant="primary"
            dir={dir}
          />
        }
      />
    </div>
  );
}
