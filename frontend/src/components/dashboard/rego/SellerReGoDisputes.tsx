'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Flag,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  ShieldAlert,
  Search,
  Eye,
  RefreshCw,
  FileText,
  Truck,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export type ReportStatus = 'open' | 'investigating' | 'awaiting_buyer' | 'awaiting_seller' | 'resolved' | 'dismissed';
export type ReportPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Report {
  id: string;
  store_id: string;
  order_id: string | null;
  reporter_email?: string | null;
  category?: string | null;
  priority?: ReportPriority | null;
  reason: string;
  status: ReportStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at?: string | null;
  resolved_at: string | null;
}

export interface ReportSummary {
  total: number;
  open: number;
  investigating: number;
  resolved: number;
  dismissed: number;
  high_priority: number;
}

export interface ReportMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  summary?: ReportSummary;
}

export interface SellerReGoDisputesProps {
  reports: Report[];
  meta: ReportMeta;
  loading: boolean;
  filter: 'all' | ReportStatus;
  onFilterChange: (f: 'all' | ReportStatus) => void;
  page: number;
  onPageChange: (p: number) => void;
  onRefresh: () => void;
  error: string;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoDisputes({
  reports,
  meta,
  loading: _loading,
  filter,
  onFilterChange,
  page,
  onPageChange,
  onRefresh,
  error,
  dir: _dir = 'ltr',
}: SellerReGoDisputesProps) {
  const { t: _t, locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  const getStatusBadge = (status: ReportStatus): { label: string; chipStatus: 'ok' | 'warn' | 'err' | 'info' | 'neutral' } => {
    switch (status) {
      case 'open':
        return { label: 'Nouveau Litige', chipStatus: 'err' };
      case 'investigating':
        return { label: 'En Analyse Admin', chipStatus: 'warn' };
      case 'awaiting_seller':
        return { label: 'Action Vendeur Requise', chipStatus: 'err' };
      case 'awaiting_buyer':
        return { label: 'En Attente Acheteur', chipStatus: 'info' };
      case 'resolved':
        return { label: 'Litige Résolu', chipStatus: 'ok' };
      case 'dismissed':
        return { label: 'Classé Sans Suite', chipStatus: 'neutral' };
      default:
        return { label: status, chipStatus: 'neutral' };
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        (r.order_id || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q) ||
        (r.reporter_email || '').toLowerCase().includes(q)
      );
    });
  }, [reports, searchQuery]);

  // Telemetry KPIs
  const openCount = meta.summary?.open ?? reports.filter((r) => r.status === 'open' || r.status === 'awaiting_seller').length;
  const resolvedCount = meta.summary?.resolved ?? reports.filter((r) => r.status === 'resolved').length;
  const totalCount = meta.total || reports.length;
  const resolutionRate = totalCount > 0 ? ((resolvedCount / totalCount) * 100).toFixed(1) : '100.0';

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Outils & Support', href: '/hub/dashboard' },
        { label: 'Litiges & Réclamations', href: '/hub/dashboard/reports' },
      ]}
      headerTitle="Gestion des Litiges & Réclamations Clients"
      headerSubtitle="Traitez les réclamations de vos acheteurs, fournissez vos justificatifs de livraison et trouvez des résolutions amiables."
      headerIcon={Flag}
      statusBadge={
        openCount > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
            <span>{openCount} dossier(s) nécessitant une réponse</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tous les litiges sont résolus</span>
          </div>
        )
      }
      primaryAction={
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualiser</span>
        </button>
      }
      secondaryAction={
        <Link
          href="/hub/dashboard/orders"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs"
        >
          <Truck className="w-3.5 h-3.5 text-indigo-500" />
          <span>Voir les Commandes</span>
        </Link>
      }
      alertBanner={
        error ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-rose-700 dark:text-rose-400 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : undefined
      }
      kpiStrip={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReGoKpiHero
            label="Litiges en Attente"
            value={String(openCount)}
            hint="Réponse vendeur sous 48h"
            icon={ShieldAlert}
            accent={openCount > 0}
          />
          <ReGoKpiHero
            label="Taux de Résolution Amiable"
            value={`${resolutionRate}%`}
            hint="Score de satisfaction client"
            icon={CheckCircle}
          />
          <ReGoKpiHero
            label="Délai Moyen de Réponse"
            value="~6 heures"
            hint="Rapidité de traitement marchand"
            icon={Clock}
          />
          <ReGoKpiHero
            label="Total des Dossiers"
            value={String(totalCount)}
            hint="Historique des signalements"
            icon={FileText}
          />
        </div>
      }
      filterToolbar={
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par commande, motif ou client..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => onFilterChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tous ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => onFilterChange('awaiting_seller')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === 'awaiting_seller'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Action Requise
              </button>
              <button
                type="button"
                onClick={() => onFilterChange('investigating')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === 'investigating'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                En Cours Admin
              </button>
              <button
                type="button"
                onClick={() => onFilterChange('resolved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === 'resolved'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Résolus
              </button>
            </div>
          </div>
        </div>
      }
      mainContent={
        <ReGoCard
          title="Registre des Réclamations & Litiges"
          subtitle="Suivi contradictoire des dossiers soumis par les acheteurs PandaMarket"
          icon={Flag}
        >
          <div className="space-y-4 pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Réf. Litige</th>
                    <th className="py-2.5 px-3">Commande Rattachée</th>
                    <th className="py-2.5 px-3">Acheteur</th>
                    <th className="py-2.5 px-3">Motif de la Réclamation</th>
                    <th className="py-2.5 px-3">Date Signalement</th>
                    <th className="py-2.5 px-3">Statut & Priorité</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                  {filteredReports.length > 0 ? (
                    filteredReports.map((report) => {
                      const badge = getStatusBadge(report.status);
                      return (
                        <tr key={report.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              CASE-{report.id.slice(0, 8).toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {report.order_id ? (
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                #{report.order_id.slice(0, 8).toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-slate-400">Signalement Général</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {report.reporter_email || 'Client Anonyme'}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <p className="truncate text-slate-900 dark:text-white font-medium" title={report.reason}>
                              {report.reason}
                            </p>
                            {report.category && (
                              <span className="text-[10px] text-slate-400 block mt-0.5 capitalize">
                                Catégorie : {report.category}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {new Date(report.created_at).toLocaleDateString(dateLocale, {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-3">
                            <ReGoStatusChip label={badge.label} status={badge.chipStatus} />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/hub/dashboard/reports/${report.id}`}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1"
                              >
                                <span>Ouvrir Dossier</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => setSelectedReport(report)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Inspection Rapide"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        Aucun litige ou réclamation client trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {meta.total_pages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500">
                <span>Page {page} sur {meta.total_pages}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={page >= meta.total_pages}
                    onClick={() => onPageChange(page + 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        </ReGoCard>
      }
      drawer={
        <ReGoDrawer
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title="Aperçu Rapide du Litige"
          subtitle={selectedReport ? `Réf: CASE-${selectedReport.id.slice(0, 8).toUpperCase()}` : ''}
        >
          {selectedReport && (
            <div className="space-y-4 text-xs font-medium text-slate-700 dark:text-slate-300">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Commande :</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedReport.order_id || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Acheteur :</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedReport.reporter_email || 'Client'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Statut :</span>
                  <ReGoStatusChip label={getStatusBadge(selectedReport.status).label} status={getStatusBadge(selectedReport.status).chipStatus} />
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-900 dark:text-white block mb-1">Motif déclaré par le client :</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl leading-relaxed">
                  {selectedReport.reason}
                </div>
              </div>

              {selectedReport.admin_notes && (
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">Instructions arbitrage PandaMarket :</span>
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-900 dark:text-amber-200 leading-relaxed">
                    {selectedReport.admin_notes}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href={`/hub/dashboard/reports/${selectedReport.id}`}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <span>Accéder au Dossier d'Arbitrage Complet</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </ReGoDrawer>
      }
    />
  );
}
