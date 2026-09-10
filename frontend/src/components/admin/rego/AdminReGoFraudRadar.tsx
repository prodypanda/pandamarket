'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Radar,
  ShieldAlert,
  AlertTriangle,
  HeartPulse,
  Search,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Ban,
  Key,
  Clock,
  Building2,
  Mail,
  SlidersHorizontal,
  Eye,
  Check,
  Loader2,
  Lock,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export interface FraudRadarItem {
  id: string;
  store_id: string;
  user_id: string;
  store_name: string;
  store_subdomain: string;
  seller_email: string;
  target_plan: string;
  amount: number | string;
  gateway: string;
  status: string;
  created_at: string;
  health_scorecard: {
    score: number;
    level: string;
    risk_flags: string[];
  };
}

export interface AdminReGoFraudRadarProps {
  radarList: FraudRadarItem[];
  loading: boolean;
  error: string;
  success: string;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  riskFilter: string;
  onRiskFilterChange: (val: string) => void;
  onFreezeStore: (storeId: string, storeName: string) => Promise<void>;
  onGenerateMagicLink: (intentId: string) => Promise<void>;
  onMarkManualVerified: (intentId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

function toNumber(val: unknown): number {
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) ? num : 0;
}

export function AdminReGoFraudRadar({
  radarList,
  loading,
  error,
  success,
  searchTerm,
  onSearchChange,
  riskFilter,
  onRiskFilterChange,
  onFreezeStore,
  onGenerateMagicLink,
  onMarkManualVerified,
  onRefresh,
}: AdminReGoFraudRadarProps) {
  const [inspectedItem, setInspectedItem] = useState<FraudRadarItem | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  // Compute telemetry metrics
  const totalAlerts = radarList.length;
  const criticalCount = radarList.filter(
    (item) => item.health_scorecard?.level === 'critical' || item.health_scorecard?.score < 40,
  ).length;
  const highRiskCount = radarList.filter(
    (item) => item.health_scorecard?.level === 'high' || (item.health_scorecard?.score >= 40 && item.health_scorecard?.score < 60),
  ).length;
  const totalSuspectAmount = radarList.reduce((acc, item) => acc + toNumber(item.amount), 0);

  // Filter items
  const filteredList = radarList.filter((item) => {
    if (riskFilter !== 'all') {
      if (riskFilter === 'critical' && item.health_scorecard?.level !== 'critical' && item.health_scorecard?.score >= 40) return false;
      if (riskFilter === 'high' && item.health_scorecard?.level !== 'high') return false;
      if (riskFilter === 'medium' && item.health_scorecard?.level !== 'medium') return false;
      if (riskFilter === 'low' && item.health_scorecard?.level !== 'low') return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchStore = item.store_name?.toLowerCase().includes(q);
      const matchSub = item.store_subdomain?.toLowerCase().includes(q);
      const matchEmail = item.seller_email?.toLowerCase().includes(q);
      const matchPlan = item.target_plan?.toLowerCase().includes(q);
      return matchStore || matchSub || matchEmail || matchPlan;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-gradient-to-r from-[var(--rego-surface,#f5f5f5)] via-[var(--rego-bg,#ffffff)] to-[var(--rego-surface,#f5f5f5)] p-4 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-100 text-rose-700 dark:text-rose-300">
            <Radar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-[var(--rego-fg,#111111)]">
                Radar Anti-Fraude & RTO Télécom
              </h1>
              <ReGoStatusChip
                status={criticalCount > 0 ? 'err' : 'neutral'}
                label={`${totalAlerts} détections heuristiques`}
                size="xs"
              />
            </div>
            <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
              Scorecard de santé marchande · Détection d&apos;anomalies de paiement, usurpations et prévention des retours COD
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] px-3 py-1.5 text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* 2. Feedback Alerts */}
      {error && (
        <div className="rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-[var(--rego-r,8px)] border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* 3. Telemetry KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ReGoKpiHero
          label="Total Dossiers Suspects"
          value={totalAlerts}
          hint="Évalués par le moteur heuristique"
          icon={Radar}
        />
        <ReGoKpiHero
          label="Anomalies Critiques"
          value={criticalCount}
          hint="Score de confiance < 40%"
          accent={criticalCount > 0}
          icon={ShieldAlert}
        />
        <ReGoKpiHero
          label="Risque Élevé"
          value={highRiskCount}
          hint="Score de confiance entre 40% et 60%"
          icon={HeartPulse}
        />
        <ReGoKpiHero
          label="Volume Financier Sous Radar"
          value={<ReGoAmtBox amount={totalSuspectAmount} size="md" />}
          hint="Montant cumulé en millimes"
          icon={Lock}
        />
      </div>

      {/* 4. Filter Toolbar */}
      <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-3.5 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)] pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filtrer par boutique, sous-domaine ou email marchand..."
              className="w-full ps-9 pe-3 py-1.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] placeholder:text-[var(--rego-ink-3,#949494)] focus:border-[var(--rego-accent,#ad0505)] outline-none"
            />
          </div>

          {/* Risk Filter Buttons */}
          <div className="flex items-center gap-1 p-0.5 rounded-[var(--rego-r,6px)] bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)]">
            {(
              [
                { key: 'all', label: 'Tous' },
                { key: 'critical', label: 'Critique' },
                { key: 'high', label: 'Élevé' },
                { key: 'medium', label: 'Modéré' },
                { key: 'low', label: 'Faible' },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => onRiskFilterChange(f.key)}
                className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                  riskFilter === f.key
                    ? 'bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] shadow-2xs'
                    : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Main Fraud Table */}
      <ReGoCard noPadding>
        {loading ? (
          <div className="p-12 text-center text-[var(--rego-ink-2,#737373)]">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-[var(--rego-accent,#ad0505)]" />
            <p className="text-xs font-bold mt-2">Analyse heuristique en cours...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-[var(--rego-ink-2,#737373)] space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
            <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
              Aucune anomalie frauduleuse active
            </h3>
            <p className="text-xs text-[var(--rego-ink-2,#737373)]">
              L&apos;ensemble des transactions et des comptes marchands respecte les seuils de conformité opérationnelle.
            </p>
          </div>
        ) : (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-[var(--rego-border,#dedede)] text-[11px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                  <th className="px-3 py-2.5">Boutique & Marchand</th>
                  <th className="px-3 py-2.5">Plan Cible & Montant</th>
                  <th className="px-3 py-2.5">Scorecard Heuristique</th>
                  <th className="px-3 py-2.5">Drapeaux d&apos;Alerte</th>
                  <th className="px-3 py-2.5">Date Détection</th>
                  <th className="px-3 py-2.5 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                {filteredList.map((item) => {
                  const score = item.health_scorecard?.score ?? 50;
                  const level = item.health_scorecard?.level || 'medium';
                  const isActing = actingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[var(--rego-surface,#f5f5f5)]/50 transition-colors"
                    >
                      {/* 1. Store */}
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                          {item.store_name}
                        </div>
                        <div className="text-[10px] text-[var(--rego-ink-3,#949494)] font-mono">
                          {item.store_subdomain}.pandamarket.tn
                        </div>
                        <div className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5">
                          {item.seller_email}
                        </div>
                      </td>

                      {/* 2. Amount */}
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-bold uppercase text-slate-900 dark:text-white">
                          {item.target_plan}
                        </div>
                        <ReGoAmtBox amount={toNumber(item.amount)} size="sm" />
                        <span className="text-[10px] text-[var(--rego-ink-3,#949494)] font-mono block">
                          Passerelle : {item.gateway}
                        </span>
                      </td>

                      {/* 3. Score */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                score < 40
                                  ? 'bg-rose-600'
                                  : score < 70
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                            />
                          </div>
                          <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                            {score}/100
                          </span>
                        </div>
                        <div className="mt-0.5">
                          <ReGoStatusChip
                            status={score < 40 ? 'err' : score < 70 ? 'warn' : 'ok'}
                            label={
                              level === 'critical'
                                ? 'Risque Critique'
                                : level === 'high'
                                ? 'Risque Élevé'
                                : level === 'medium'
                                ? 'Risque Modéré'
                                : 'Risque Faible'
                            }
                            size="xs"
                          />
                        </div>
                      </td>

                      {/* 4. Flags */}
                      <td className="px-3 py-2.5 max-w-[240px]">
                        <div className="flex flex-wrap gap-1">
                          {item.health_scorecard?.risk_flags && item.health_scorecard.risk_flags.length > 0 ? (
                            item.health_scorecard.risk_flags.map((flag, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200"
                              >
                                {flag}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-[var(--rego-ink-3,#949494)]">
                              Aucun flag spécifique
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Date */}
                      <td className="px-3 py-2.5 text-xs text-[var(--rego-ink-2,#737373)] font-mono">
                        {new Date(item.created_at).toLocaleDateString('fr-TN')}
                      </td>

                      {/* 6. Actions */}
                      <td className="px-3 py-2.5 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectedItem(item)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspecter</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              setActingId(item.id);
                              await onGenerateMagicLink(item.id);
                              setActingId(null);
                            }}
                            disabled={isActing}
                            title="Générer un Magic Link de vérification d'identité"
                            className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              setActingId(item.id);
                              await onFreezeStore(item.store_id, item.store_name);
                              setActingId(null);
                            }}
                            disabled={isActing}
                            title="Geler immédiatement les accès et paiements de la boutique"
                            className="p-1 rounded text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              setActingId(item.id);
                              await onMarkManualVerified(item.id);
                              setActingId(null);
                            }}
                            disabled={isActing}
                            title="Valider manuellement la conformité du compte"
                            className="p-1 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ReGoCard>

      {/* 6. Inspection Drawer */}
      <ReGoDrawer
        isOpen={Boolean(inspectedItem)}
        onClose={() => setInspectedItem(null)}
        title={inspectedItem?.store_name || 'Dossier de Fraude'}
        subtitle={`ID Intention: ${inspectedItem?.id || ''}`}
        width="max-w-xl"
      >
        {inspectedItem && (
          <div className="space-y-4 text-xs">
            <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] p-3 space-y-2 bg-[var(--rego-surface,#f5f5f5)]">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[var(--rego-fg,#111111)]">
                  {inspectedItem.store_name}
                </h4>
                <ReGoStatusChip
                  status={inspectedItem.health_scorecard?.score < 40 ? 'err' : 'warn'}
                  label={`Score ${inspectedItem.health_scorecard?.score}/100`}
                  size="xs"
                />
              </div>
              <p className="font-mono text-[11px] text-[var(--rego-ink-2,#737373)]">
                {inspectedItem.store_subdomain}.pandamarket.tn · {inspectedItem.seller_email}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2.5 rounded border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900">
                <span className="text-[10px] uppercase text-[var(--rego-ink-3,#949494)] block">
                  Montant Transaction
                </span>
                <ReGoAmtBox amount={toNumber(inspectedItem.amount)} size="md" />
              </div>
              <div className="p-2.5 rounded border border-[var(--rego-border,#dedede)] bg-white dark:bg-slate-900">
                <span className="text-[10px] uppercase text-[var(--rego-ink-3,#949494)] block">
                  Passerelle Déclarée
                </span>
                <span className="font-bold text-[var(--rego-fg,#111111)] uppercase">
                  {inspectedItem.gateway}
                </span>
              </div>
            </div>

            <div className="rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50/70 dark:bg-rose-950/40 p-3 space-y-2">
              <h5 className="font-bold text-rose-900 dark:text-rose-300 uppercase text-[11px] tracking-wide">
                Drapeaux d&apos;Alerte Heuristique & Risques Identifiés
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {inspectedItem.health_scorecard?.risk_flags?.map((flag, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-rose-800 border border-rose-300"
                  >
                    ⚠️ {flag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--rego-border,#dedede)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => void onFreezeStore(inspectedItem.store_id, inspectedItem.store_name)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Geler la boutique</span>
              </button>

              <button
                type="button"
                onClick={() => void onMarkManualVerified(inspectedItem.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Valider manuellement</span>
              </button>
            </div>
          </div>
        )}
      </ReGoDrawer>
    </div>
  );
}
