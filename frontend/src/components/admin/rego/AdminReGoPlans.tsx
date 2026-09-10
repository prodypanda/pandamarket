'use client';

import React, { useState } from 'react';
import {
  Crown,
  Sparkles,
  Zap,
  Store,
  Save,
  RotateCcw,
  Plus,
  RefreshCw,
  Copy,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Shield,
  Layers,
  HelpCircle,
  X,
  Loader2,
  DollarSign,
  Building2,
  Check,
} from 'lucide-react';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from '@/components/dashboard/rego/ReGoPrimitives';

export type FeatureKey =
  | 'has_ai_seo'
  | 'has_image_compression'
  | 'has_custom_domain'
  | 'has_page_builder'
  | 'has_direct_payment'
  | 'has_white_label'
  | 'has_own_ai_provider';

export interface PlanLimits {
  id?: string;
  plan_id: string;
  max_products: number;
  max_images_per_product: number;
  max_page_builder_pages: number;
  has_ai_seo: boolean;
  has_image_compression: boolean;
  has_custom_domain: boolean;
  has_page_builder: boolean;
  has_direct_payment: boolean;
  has_white_label: boolean;
  has_own_ai_provider: boolean;
  commission_rate: number;
  ai_tokens_included: number;
  yearly_price: number;
  is_enabled: boolean;
  stores_count?: number;
  verified_stores_count?: number;
  suspended_stores_count?: number;
}

export interface AdminReGoPlansProps {
  plans: PlanLimits[];
  originalPlans: Record<string, PlanLimits>;
  newPlan: PlanLimits;
  setNewPlan: React.Dispatch<React.SetStateAction<PlanLimits>>;
  showCreateForm: boolean;
  setShowCreateForm: (val: boolean) => void;
  deleteTarget: string | null;
  setDeleteTarget: (val: string | null) => void;
  replacementPlanId: string;
  setReplacementPlanId: (val: string) => void;
  loading: boolean;
  saving: string | null;
  message: string;
  error: string;
  dirtyPlanIds: string[];
  totals: {
    stores: number;
    verified: number;
    paidPlans: number;
    enabledPlans: number;
    disabledPlans: number;
    yearlyPotential: number;
  };
  onUpdatePlan: <K extends keyof PlanLimits>(planId: string, field: K, value: PlanLimits[K]) => void;
  onResetPlan: (planId: string) => void;
  onResetAll: () => void;
  onSavePlan: (plan: PlanLimits) => Promise<void>;
  onSaveAll: () => Promise<void>;
  onCreatePlan: () => Promise<void>;
  onDuplicatePlan: (plan: PlanLimits) => void;
  onDeletePlan: (plan: PlanLimits) => Promise<void>;
  onReload: () => Promise<void>;
}

const featureFields: Array<{ key: FeatureKey; label: string; description: string }> = [
  { key: 'has_ai_seo', label: 'Outils IA & SEO', description: 'Génération de fiches et catégorisation automatique par IA Gemini.' },
  { key: 'has_image_compression', label: 'Compression WebP', description: 'Optimisation CDN instantanée sans perte de résolution.' },
  { key: 'has_custom_domain', label: 'Domaine Pro', description: 'Raccordement DNS personnalisé (ex: boutique.tn).' },
  { key: 'has_page_builder', label: 'Page Builder', description: 'Éditeur drag-and-drop de blocs pour le storefront.' },
  { key: 'has_direct_payment', label: 'Paiement Direct', description: 'Encaissement direct Flouci/Konnect sans retenue plateforme.' },
  { key: 'has_white_label', label: 'White Label', description: 'Masquage du badge PandaMarket en pied de page.' },
  { key: 'has_own_ai_provider', label: 'Clé IA Vendeur', description: 'Permet l\'usage d\'une clé API OpenAI/Gemini dédiée.' },
];

function labelFromPlanId(planId: string) {
  return planId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Nouveau plan';
}

export function AdminReGoPlans({
  plans,
  originalPlans,
  newPlan,
  setNewPlan,
  showCreateForm,
  setShowCreateForm,
  deleteTarget,
  setDeleteTarget,
  replacementPlanId,
  setReplacementPlanId,
  loading,
  saving,
  message,
  error,
  dirtyPlanIds,
  totals,
  onUpdatePlan,
  onResetPlan,
  onResetAll,
  onSavePlan,
  onSaveAll,
  onCreatePlan,
  onDuplicatePlan,
  onDeletePlan,
  onReload,
}: AdminReGoPlansProps) {
  const [inspectPlan, setInspectPlan] = useState<PlanLimits | null>(null);

  const planToDelete = plans.find((p) => p.plan_id === deleteTarget);

  return (
    <div className="space-y-6">
      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--rego-border,#dedede)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--rego-accent,#ad0505)]/10 text-[var(--rego-accent,#ad0505)]">
              <Crown className="w-3.5 h-3.5" />
              ReGo SaaS Quota & Tier Studio
            </span>
          </div>
          <h1 className="text-2xl font-black text-[var(--rego-fg,#111111)] tracking-tight mt-1">
            Gestion des Abonnements & Quotas
          </h1>
          <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
            Définissez les paliers d&apos;adhésion, quotas de catalogue, jetons IA et taux de commission par formule
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {dirtyPlanIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={onResetAll}
                disabled={Boolean(saving)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Tout annuler
              </button>
              <button
                type="button"
                onClick={onSaveAll}
                disabled={Boolean(saving)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white text-xs font-bold hover:opacity-90 transition shadow-xs disabled:opacity-50"
              >
                {saving === 'all' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Enregistrement global...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Enregistrer {dirtyPlanIds.length} modification(s)
                  </>
                )}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--rego-r,8px)] bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {showCreateForm ? 'Fermer le formulaire' : 'Créer un plan'}
          </button>
        </div>
      </div>

      {/* ─── Feedback Alerts ─── */}
      {error && (
        <div className="p-3.5 rounded-[var(--rego-r,8px)] bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="p-3.5 rounded-[var(--rego-r,8px)] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* ─── 5 ReGo KPI Hero Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <ReGoKpiHero
          label="Boutiques Hébergées"
          value={totals.stores.toLocaleString('fr-TN')}
          icon={Building2}
          hint="Sur l'ensemble des formules"
        />
        <ReGoKpiHero
          label="Comptes Vérifiés"
          value={totals.verified.toLocaleString('fr-TN')}
          icon={Shield}
          hint="Identité & KYC validés"
        />
        <ReGoKpiHero
          label="Plans Monétisés"
          value={totals.paidPlans.toString()}
          icon={Crown}
          hint="Formules avec prix annuel > 0"
        />
        <ReGoKpiHero
          label="Potentiel ARR"
          value={<ReGoAmtBox amount={totals.yearlyPotential} size="md" />}
          icon={DollarSign}
          hint="Revenu récurrent annuel projeté"
        />
        <ReGoKpiHero
          label="Paliers Disponibles"
          value={`${totals.enabledPlans} / ${plans.length}`}
          icon={Layers}
          hint={`${totals.disabledPlans} palier(s) désactivé(s)`}
        />
      </div>

      {/* ─── Create Plan Drawer / Form ─── */}
      {showCreateForm && (
        <ReGoCard
          title="Créer un nouveau palier d'abonnement"
          subtitle="Définissez les caractéristiques techniques et tarification de la nouvelle formule"
          icon={Plus}
          actions={
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="p-1 rounded text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]"
            >
              <X className="w-4 h-4" />
            </button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Identifiant technique (slug)
                </label>
                <input
                  type="text"
                  value={newPlan.plan_id}
                  onChange={(e) => setNewPlan({ ...newPlan, plan_id: e.target.value })}
                  placeholder="ex: enterprise-2026"
                  className="w-full h-9 px-3 text-xs font-mono font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Prix annuel (TND)
                </label>
                <input
                  type="number"
                  value={newPlan.yearly_price}
                  onChange={(e) => setNewPlan({ ...newPlan, yearly_price: Number(e.target.value) })}
                  className="w-full h-9 px-3 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Commission plateforme (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newPlan.commission_rate}
                  onChange={(e) => setNewPlan({ ...newPlan, commission_rate: Number(e.target.value) })}
                  className="w-full h-9 px-3 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Max Produits (-1 = illimité)
                </label>
                <input
                  type="number"
                  value={newPlan.max_products}
                  onChange={(e) => setNewPlan({ ...newPlan, max_products: Number(e.target.value) })}
                  className="w-full h-9 px-3 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Max Images / Produit
                </label>
                <input
                  type="number"
                  value={newPlan.max_images_per_product}
                  onChange={(e) => setNewPlan({ ...newPlan, max_images_per_product: Number(e.target.value) })}
                  className="w-full h-9 px-3 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Pages Page Builder
                </label>
                <input
                  type="number"
                  value={newPlan.max_page_builder_pages}
                  onChange={(e) => setNewPlan({ ...newPlan, max_page_builder_pages: Number(e.target.value) })}
                  className="w-full h-9 px-3 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider mb-1">
                  Tokens IA Inclus / mois
                </label>
                <input
                  type="number"
                  value={newPlan.ai_tokens_included}
                  onChange={(e) => setNewPlan({ ...newPlan, ai_tokens_included: Number(e.target.value) })}
                  className="w-full h-9 px-3 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>
            </div>

            {/* Feature toggles */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider">
                Modules & Fonctionnalités autorisés
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {featureFields.map((f) => (
                  <label
                    key={f.key}
                    className="flex items-center gap-2 p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg-subtle,#f7f7f7)] text-xs font-semibold cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(newPlan[f.key])}
                      onChange={(e) => setNewPlan({ ...newPlan, [f.key]: e.target.checked })}
                      className="rounded accent-[var(--rego-accent,#ad0505)]"
                    />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onCreatePlan}
                disabled={saving === 'create' || !newPlan.plan_id.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
              >
                {saving === 'create' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  'Créer ce plan'
                )}
              </button>
            </div>
          </div>
        </ReGoCard>
      )}

      {/* ─── Plans Grid ─── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--rego-accent,#ad0505)]" />
          <p className="mt-3 text-xs font-semibold text-[var(--rego-ink-2,#737373)]">Chargement des formules...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center p-12 bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)]">
          <Crown className="w-10 h-10 text-[var(--rego-ink-2,#737373)] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">Aucun palier d&apos;abonnement configuré</h3>
          <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-1">
            Cliquez sur &quot;Créer un plan&quot; pour initier le premier niveau de souscription SaaS.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const isDirty = dirtyPlanIds.includes(plan.plan_id);
            const isSavingThis = saving === plan.plan_id;

            return (
              <div
                key={plan.plan_id}
                className={`rounded-[var(--rego-r,8px)] border bg-[var(--rego-bg,#ffffff)] shadow-xs transition-all ${
                  isDirty
                    ? 'border-[var(--rego-accent,#ad0505)] ring-1 ring-[var(--rego-accent,#ad0505)]/20'
                    : 'border-[var(--rego-border,#dedede)] hover:border-[var(--rego-border-hover,#b0b0b0)]'
                }`}
              >
                {/* Plan Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--rego-border,#dedede)]/70">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--rego-bg-subtle,#f7f7f7)] border border-[var(--rego-border,#dedede)] flex items-center justify-center font-bold text-[var(--rego-fg,#111111)]">
                      <Crown className="w-4 h-4 text-[var(--rego-accent,#ad0505)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-[var(--rego-fg,#111111)]">
                          {labelFromPlanId(plan.plan_id)}
                        </h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--rego-bg-subtle,#f7f7f7)] text-[var(--rego-ink-2,#737373)] border border-[var(--rego-border,#dedede)]">
                          {plan.plan_id}
                        </span>
                        {isDirty && (
                           <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200">
                            Modifié
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--rego-ink-2,#737373)] font-medium">
                        <span>{plan.stores_count || 0} boutique(s)</span>
                        <span>·</span>
                        <span>{plan.verified_stores_count || 0} vérifiée(s)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.is_enabled}
                        onChange={(e) => onUpdatePlan(plan.plan_id, 'is_enabled', e.target.checked)}
                        className="rounded accent-[var(--rego-accent,#ad0505)]"
                      />
                       <span className={plan.is_enabled ? 'text-emerald-700 dark:text-emerald-300' : 'text-[var(--rego-ink-2,#737373)]'}>
                        {plan.is_enabled ? 'Actif' : 'Inactif'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Plan Core Financials */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--rego-bg-subtle,#f7f7f7)]/50 border-b border-[var(--rego-border,#dedede)]/70">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                      Prix Annuel
                    </span>
                    <div className="mt-1 flex items-center gap-1">
                      <input
                        type="number"
                        value={plan.yearly_price}
                        onChange={(e) => onUpdatePlan(plan.plan_id, 'yearly_price', Number(e.target.value))}
                        className="w-20 h-7 px-1.5 text-xs font-bold rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                      />
                      <span className="text-xs font-bold text-[var(--rego-ink-2,#737373)]">TND</span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                      Commission
                    </span>
                    <div className="mt-1 flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={plan.commission_rate}
                        onChange={(e) => onUpdatePlan(plan.plan_id, 'commission_rate', Number(e.target.value))}
                        className="w-16 h-7 px-1.5 text-xs font-bold rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                      />
                      <span className="text-xs font-bold text-[var(--rego-ink-2,#737373)]">%</span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                      Max Produits
                    </span>
                    <input
                      type="number"
                      value={plan.max_products}
                      onChange={(e) => onUpdatePlan(plan.plan_id, 'max_products', Number(e.target.value))}
                      className="mt-1 w-20 h-7 px-1.5 text-xs font-bold rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                    />
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                      Tokens IA / mois
                    </span>
                    <input
                      type="number"
                      value={plan.ai_tokens_included}
                      onChange={(e) => onUpdatePlan(plan.plan_id, 'ai_tokens_included', Number(e.target.value))}
                      className="mt-1 w-20 h-7 px-1.5 text-xs font-bold rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                    />
                  </div>
                </div>

                {/* Secondary Limits */}
                <div className="p-4 grid grid-cols-2 gap-3 border-b border-[var(--rego-border,#dedede)]/70 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1">
                      Max Images / Produit
                    </label>
                    <input
                      type="number"
                      value={plan.max_images_per_product}
                      onChange={(e) => onUpdatePlan(plan.plan_id, 'max_images_per_product', Number(e.target.value))}
                      className="w-full h-7 px-2 text-xs font-medium rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1">
                      Max Pages Page Builder
                    </label>
                    <input
                      type="number"
                      value={plan.max_page_builder_pages}
                      onChange={(e) => onUpdatePlan(plan.plan_id, 'max_page_builder_pages', Number(e.target.value))}
                      className="w-full h-7 px-2 text-xs font-medium rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                    />
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="p-4 space-y-2 border-b border-[var(--rego-border,#dedede)]/70">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                    Modules Inclus
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {featureFields.map((f) => {
                      const enabled = Boolean(plan[f.key]);
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => onUpdatePlan(plan.plan_id, f.key, !enabled)}
                           className={`flex items-center justify-between p-2 rounded-[var(--rego-r,8px)] border text-start transition ${
                             enabled
                               ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900'
                              : 'border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] opacity-70'
                          }`}
                        >
                           <span className="text-[11px] font-bold truncate pe-1">{f.label}</span>
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-white ${
                            enabled ? 'bg-emerald-600' : 'bg-gray-300'
                          }`}>
                            {enabled && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3.5 flex items-center justify-between gap-2 bg-[var(--rego-bg-subtle,#f7f7f7)]/50 rounded-b-[var(--rego-r,8px)]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onDuplicatePlan(plan)}
                      className="inline-flex items-center gap-1 h-7 px-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[11px] font-bold text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-bg,#ffffff)] transition"
                      title="Dupliquer ce palier"
                    >
                      <Copy className="w-3 h-3" />
                      Dupliquer
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(plan.plan_id)}
                       className="inline-flex items-center gap-1 h-7 px-2 rounded-[var(--rego-r,8px)] border border-red-200 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      title="Supprimer ce palier"
                    >
                      <Trash2 className="w-3 h-3" />
                      Supprimer
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isDirty && (
                      <button
                        type="button"
                        onClick={() => onResetPlan(plan.plan_id)}
                        disabled={isSavingThis}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-[11px] font-bold text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-bg,#ffffff)] transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Annuler
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onSavePlan(plan)}
                      disabled={isSavingThis || !isDirty}
                      className="inline-flex items-center gap-1 h-7 px-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white text-[11px] font-bold hover:opacity-90 transition disabled:opacity-50"
                    >
                      {isSavingThis ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Sauvegarde...
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3" />
                          Sauvegarder
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Delete / Migration Modal ─── */}
      {deleteTarget && planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] rounded-[var(--rego-r,8px)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2 rounded-full bg-red-50 dark:bg-red-950/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[var(--rego-fg,#111111)]">
                  Supprimer le plan &quot;{labelFromPlanId(planToDelete.plan_id)}&quot; ?
                </h3>
                <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
                  Cette action est irréversible pour le catalogue d&apos;abonnements.
                </p>
              </div>
            </div>

            {(planToDelete.stores_count || 0) > 0 && (
              <div className="p-3 rounded-[var(--rego-r,8px)] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 space-y-2">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  ⚠️ {planToDelete.stores_count} boutique(s) utilisent actuellement ce plan.
                </p>
                <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase">
                  Migrer automatiquement vers le plan :
                </label>
                <select
                  value={replacementPlanId}
                  onChange={(e) => setReplacementPlanId(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-semibold rounded border border-amber-300 bg-white dark:bg-slate-900 text-[var(--rego-fg,#111111)] outline-none"
                >
                  <option value="">-- Sélectionner un plan de substitution --</option>
                  {plans
                    .filter((p) => p.plan_id !== planToDelete.plan_id)
                    .map((p) => (
                      <option key={p.plan_id} value={p.plan_id}>
                        {labelFromPlanId(p.plan_id)} ({p.plan_id})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setReplacementPlanId('');
                }}
                className="px-3.5 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] text-xs font-bold text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-bg-subtle,#f7f7f7)] transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => onDeletePlan(planToDelete)}
                disabled={
                  saving === `delete-${planToDelete.plan_id}` ||
                  ((planToDelete.stores_count || 0) > 0 && !replacementPlanId)
                }
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[var(--rego-r,8px)] bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition disabled:opacity-50"
              >
                {saving === `delete-${planToDelete.plan_id}` ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  'Confirmer la suppression'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
