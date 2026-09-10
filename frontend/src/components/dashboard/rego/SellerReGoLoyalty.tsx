'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Crown,
  Users,
  Send,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Tag,
  ShieldCheck,
  Percent,
  Clock,
  Info,
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
import { BroadcastComposer } from '../BroadcastComposer';
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
  onBroadcastSuccess: (broadcast: BroadcastHistoryItem, quota: number) => void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoLoyalty({
  data,
  loading: _loading,
  error,
  activeTab,
  onTabChange,
  subscribers,
  subscribersLoading: _subscribersLoading,
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
  onRefresh: _onRefresh,
  onBroadcastSuccess,
  dir = 'ltr',
}: SellerReGoLoyaltyProps) {
  const { t: _t } = useLocale();
  const [showTrustDrawer, setShowTrustDrawer] = useState(false);

  const kpis = data?.kpis;
  const broadcasts = data?.broadcasts || [];
  const governorates = data?.governorate_distribution || {};

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
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)] rounded-full">
              Programme VIP Marchand
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] border border-[var(--rego-border,#dedede)] rounded-full">
              Trust Score : {kpis?.trust_score?.overall != null ? `${kpis.trust_score.overall}%` : '—'}
            </span>
          </div>
        }
        secondaryAction={
          <div className="flex items-center rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-0.5">
            <button
              onClick={() => onTabChange('overview')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                  : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
              }`}
            >
              Vue d&apos;Ensemble
            </button>
            <button
              onClick={() => onTabChange('broadcasts')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                activeTab === 'broadcasts'
                  ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                  : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
              }`}
            >
              Diffusions & Coupons ({broadcasts.length})
            </button>
            <button
              onClick={() => onTabChange('subscribers')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                activeTab === 'subscribers'
                  ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                  : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
              }`}
            >
              Abonnés ({subscribersTotal || kpis?.total_subscribers || 0})
            </button>
          </div>
        }
        primaryAction={
          <button
            onClick={() => setShowTrustDrawer(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Détails Trust Score</span>
          </button>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <ReGoKpiHero
              label="Total Abonnés Boutique"
              value={(kpis?.total_subscribers || 0).toLocaleString('fr-TN')}
              hint="Acheteurs ayant souscrit aux alertes"
              icon={Users}
              accent
            />
            <ReGoKpiHero
              label="Nouveaux cette Semaine"
              value={`+${kpis?.new_this_week || 0}`}
              hint={`Croissance : +${(kpis?.growth_rate_pct || 0).toFixed(1)}%`}
              icon={TrendingUp}
            />
            <ReGoKpiHero
              label="Acheteurs Vérifiés"
              value={`${kpis?.verified_pct || 0}%`}
              hint="Clients ayant déjà passé commande"
              icon={ShieldCheck}
            />
            <ReGoKpiHero
              label="Diffusions Restantes"
              value={`${kpis?.broadcasts_remaining_this_week || 0} / sem.`}
              hint="Notifications directes autorisées"
              icon={Send}
            />
          </div>
        }
        mainContent={
          activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* Top: Composer + Regional Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <ReGoCard
                    title="Diffuser une Notification Privée aux Abonnés"
                    subtitle="Envoyez un code promotionnel exclusif directement sur le flux mobile de vos abonnés"
                    icon={Send}
                  >
                    <BroadcastComposer
                      totalSubscribers={kpis?.total_subscribers || 0}
                      verifiedSubscribers={data?.verified_subscribers || 0}
                      remainingQuota={kpis?.broadcasts_remaining_this_week || 0}
                      onSuccess={onBroadcastSuccess}
                    />
                  </ReGoCard>
                </div>

                <div className="lg:col-span-5">
                  <ReGoCard
                    title="Répartition Géographique de l'Audience"
                    subtitle="Origine régionale de vos abonnés en Tunisie"
                    icon={MapPin}
                  >
                    <div className="space-y-2.5">
                      {Object.keys(governorates).length === 0 ? (
                        <p className="text-xs text-[var(--rego-ink-3,#949494)] py-6 text-center">
                          Données géographiques en cours d&apos;agrégation...
                        </p>
                      ) : (
                        Object.entries(governorates)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 6)
                          .map(([gov, count]) => {
                            const total = kpis?.total_subscribers || 1;
                            const pct = Math.round((count / total) * 100);
                            return (
                              <div key={gov} className="space-y-1">
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <span className="text-[var(--rego-fg,#111111)]">{gov}</span>
                                  <span className="text-[var(--rego-ink-2,#737373)] font-mono">
                                    {count} ({pct}%)
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-[var(--rego-surface,#f5f5f5)] overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--rego-accent,#ad0505)] rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </ReGoCard>
                </div>
              </div>

              {/* Recent Broadcasts */}
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
                          <tr key={b.id} className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors">
                            <td className="py-3 px-3 font-bold text-[var(--rego-fg,#111111)]">
                              {b.title}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-[var(--rego-accent,#ad0505)]">
                              <span className="px-2 py-0.5 rounded bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] border border-[var(--rego-accent-line,rgba(173,5,5,0.2))]">
                                {b.coupon_code}
                              </span>
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
                              <ReGoStatusChip
                                status={b.status === 'active' || b.status === 'sent' ? 'ok' : 'neutral'}
                                label={b.status === 'active' ? 'Actif' : b.status === 'sent' ? 'Envoyé' : 'Expiré'}
                                size="xs"
                              />
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
            /* Broadcasts Tab */
            <ReGoCard
              title="Campagnes & Codes Promo Diffusés"
              subtitle="Toutes les opérations promotionnelles adressées aux abonnés de la boutique"
              icon={Send}
            >
              {broadcasts.length === 0 ? (
                <div className="py-12 text-center">
                  <Tag className="w-8 h-8 text-[var(--rego-ink-3,#949494)] mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">Aucune diffusion</h4>
                  <p className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5">
                    Utilisez l&apos;onglet Vue d&apos;Ensemble pour envoyer votre premier code promotionnel.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
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
                        <tr key={b.id} className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors">
                          <td className="py-3 px-3 font-bold text-[var(--rego-fg,#111111)]">
                            {b.title}
                          </td>
                          <td className="py-3 px-3 text-[var(--rego-ink-2,#737373)] max-w-xs truncate">
                            {b.message}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[var(--rego-accent,#ad0505)]">
                            <span className="px-2 py-0.5 rounded bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] border border-[var(--rego-accent-line,rgba(173,5,5,0.2))]">
                              {b.coupon_code}
                            </span>
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
                            <ReGoStatusChip
                              status={b.status === 'active' || b.status === 'sent' ? 'ok' : 'neutral'}
                              label={b.status === 'active' ? 'Actif' : b.status === 'sent' ? 'Envoyé' : 'Expiré'}
                              size="xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReGoCard>
          ) : (
            /* Subscribers Tab */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-2xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
                  <input
                    type="text"
                    placeholder="Rechercher par email, nom ou ville..."
                    value={subscribersSearch}
                    onChange={(e) => onSubscribersSearchChange(e.target.value)}
                    className="w-full ps-8 pe-3 py-1.5 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)] focus:bg-[var(--rego-bg,#ffffff)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--rego-ink-2,#737373)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subscribersVerifiedFilter}
                      onChange={(e) => onSubscribersVerifiedFilterChange(e.target.checked)}
                      className="rounded border-[var(--rego-border,#dedede)] text-[var(--rego-accent,#ad0505)] focus:ring-0"
                    />
                    <span>Acheteurs vérifiés uniquement</span>
                  </label>

                  <button
                    onClick={onExportCsv}
                    disabled={exportingCsv}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{exportingCsv ? 'Export...' : 'Exporter CSV'}</span>
                  </button>
                </div>
              </div>

              <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs border-collapse">
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
                      {subscribers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-[var(--rego-ink-3,#949494)]">
                            Aucun abonné trouvé correspondant aux critères.
                          </td>
                        </tr>
                      ) : (
                        subscribers.map((s) => (
                          <tr key={s.id} className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors">
                            <td className="py-3 px-3 font-bold text-[var(--rego-fg,#111111)]">
                              {s.first_name || s.last_name
                                ? `${s.first_name || ''} ${s.last_name || ''}`.trim()
                                : 'Abonné Anonyme'}
                            </td>
                            <td className="py-3 px-3 font-mono text-[var(--rego-ink-2,#737373)]">
                              {s.email}
                            </td>
                            <td className="py-3 px-3 text-[var(--rego-fg,#111111)]">
                              {s.city || 'Non renseigné'}
                            </td>
                            <td className="py-3 px-3">
                              {s.is_verified_buyer ? (
                                <ReGoStatusChip status="ok" label="Acheteur Vérifié" size="xs" />
                              ) : (
                                <ReGoStatusChip status="neutral" label="Prospect" size="xs" />
                              )}
                            </td>
                            <td className="py-3 px-3 text-[11px] text-[var(--rego-ink-2,#737373)]">
                              {s.notify_price_drops && <span>Baisses de prix </span>}
                              {s.notify_new_products && <span>· Nouveautés</span>}
                            </td>
                            <td className="py-3 px-3 text-[var(--rego-ink-3,#949494)]">
                              {new Date(s.created_at).toLocaleDateString('fr-TN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {subscribersTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 text-xs">
                    <span className="text-[var(--rego-ink-2,#737373)]">
                      Page {subscribersPage} sur {subscribersTotalPages} ({subscribersTotal} abonnés)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSubscribersPageChange(subscribersPage - 1)}
                        disabled={subscribersPage <= 1}
                        className="p-1 rounded border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                      <button
                        onClick={() => onSubscribersPageChange(subscribersPage + 1)}
                        disabled={subscribersPage >= subscribersTotalPages}
                        className="p-1 rounded border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 disabled:opacity-40"
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
                onClick={() => setShowTrustDrawer(false)}
                className="w-full px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-white hover:opacity-90 transition-all shadow-2xs"
              >
                Fermer
              </button>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--rego-fg,#111111)]">Score de Confiance Global</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {kpis?.trust_score?.overall ?? 100} / 100
                  </span>
                </div>
                <p className="text-[11px] text-[var(--rego-ink-2,#737373)] leading-relaxed">
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
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{kpis?.trust_score?.rating_component ?? 40} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border border-[var(--rego-border,#dedede)]">
                    <span>Respect des Délais d&apos;Expédition (SLA)</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{kpis?.trust_score?.sla_component ?? 35} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border border-[var(--rego-border,#dedede)]">
                    <span>Fidélisation & Rétention des Abonnés</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{kpis?.trust_score?.subscribers_log_component ?? 25} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border border-[var(--rego-border,#dedede)]">
                    <span>Pénalités Litiges / Refus COD</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      -{kpis?.trust_score?.dispute_penalty ?? 0} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ReGoDrawer>
        }
      />
    </div>
  );
}
