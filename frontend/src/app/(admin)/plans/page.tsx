'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Crown,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Sparkles,
  Store,
  Trash2,
  Zap,
} from 'lucide-react';

type FeatureKey = 'has_ai_seo' | 'has_image_compression' | 'has_custom_domain' | 'has_page_builder' | 'has_direct_payment' | 'has_white_label';

interface PlanLimits {
  id?: string;
  plan_id: string;
  max_products: number;
  max_images_per_product: number;
  has_ai_seo: boolean;
  has_image_compression: boolean;
  has_custom_domain: boolean;
  has_page_builder: boolean;
  has_direct_payment: boolean;
  has_white_label: boolean;
  commission_rate: number;
  ai_tokens_included: number;
  yearly_price: number;
  is_enabled: boolean;
  stores_count?: number;
  verified_stores_count?: number;
  suspended_stores_count?: number;
}

const canonicalPlanOrder = ['free', 'starter', 'regular', 'agency', 'pro', 'golden', 'platinum'];

const planTones = [
  'from-slate-500 to-slate-700',
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-fuchsia-600',
  'from-orange-500 to-red-500',
  'from-amber-400 to-yellow-600',
  'from-slate-700 to-slate-950',
];

const planIcons = [Store, Sparkles, Zap, Crown];

const featureFields: Array<{ key: FeatureKey; label: string; description: string }> = [
  { key: 'has_ai_seo', label: 'IA SEO', description: 'Génération SEO assistée par IA.' },
  { key: 'has_image_compression', label: 'Compression', description: 'Optimisation automatique des images.' },
  { key: 'has_custom_domain', label: 'Domaine', description: 'Connexion de domaine personnalisé.' },
  { key: 'has_page_builder', label: 'Builder', description: 'Accès au constructeur de pages.' },
  { key: 'has_direct_payment', label: 'Paiement direct', description: 'Paiement vendeur direct.' },
  { key: 'has_white_label', label: 'White label', description: 'Suppression de la marque PandaMarket.' },
];

const emptyPlan: PlanLimits = {
  plan_id: '',
  max_products: 50,
  max_images_per_product: 5,
  has_ai_seo: true,
  has_image_compression: true,
  has_custom_domain: false,
  has_page_builder: false,
  has_direct_payment: false,
  has_white_label: false,
  commission_rate: 0,
  ai_tokens_included: 50,
  yearly_price: 300,
  is_enabled: true,
  stores_count: 0,
  verified_stores_count: 0,
  suspended_stores_count: 0,
};

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function labelFromPlanId(planId: string) {
  return planId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Nouveau plan';
}

function normalizePlanIdInput(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
}

function getPlanRank(planId: string) {
  const index = canonicalPlanOrder.indexOf(planId);
  return index >= 0 ? index : canonicalPlanOrder.length + planId.charCodeAt(0);
}

function getPlanPresentation(planId: string) {
  const rank = Math.max(0, getPlanRank(planId));
  return {
    label: labelFromPlanId(planId),
    tone: planTones[rank % planTones.length],
    icon: planIcons[rank % planIcons.length],
  };
}

function normalizePlan(raw: Record<string, unknown>): PlanLimits {
  const commission = toNumber(raw.commission_rate);
  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    plan_id: String(raw.plan_id || ''),
    max_products: toNumber(raw.max_products),
    max_images_per_product: toNumber(raw.max_images_per_product),
    has_ai_seo: Boolean(raw.has_ai_seo),
    has_image_compression: Boolean(raw.has_image_compression),
    has_custom_domain: Boolean(raw.has_custom_domain),
    has_page_builder: Boolean(raw.has_page_builder),
    has_direct_payment: Boolean(raw.has_direct_payment),
    has_white_label: Boolean(raw.has_white_label),
    commission_rate: commission <= 1 ? Number((commission * 100).toFixed(2)) : commission,
    ai_tokens_included: toNumber(raw.ai_tokens_included),
    yearly_price: toNumber(raw.yearly_price),
    is_enabled: raw.is_enabled !== false,
    stores_count: toNumber(raw.stores_count),
    verified_stores_count: toNumber(raw.verified_stores_count),
    suspended_stores_count: toNumber(raw.suspended_stores_count),
  };
}

function sortPlans(plans: PlanLimits[]) {
  return [...plans].sort((a, b) => {
    const rankDiff = getPlanRank(a.plan_id) - getPlanRank(b.plan_id);
    if (rankDiff !== 0) return rankDiff;
    return a.yearly_price - b.yearly_price || a.plan_id.localeCompare(b.plan_id);
  });
}

function planSignature(plan: PlanLimits) {
  return JSON.stringify({
    max_products: plan.max_products,
    max_images_per_product: plan.max_images_per_product,
    has_ai_seo: plan.has_ai_seo,
    has_image_compression: plan.has_image_compression,
    has_custom_domain: plan.has_custom_domain,
    has_page_builder: plan.has_page_builder,
    has_direct_payment: plan.has_direct_payment,
    has_white_label: plan.has_white_label,
    commission_rate: Number(plan.commission_rate),
    ai_tokens_included: plan.ai_tokens_included,
    yearly_price: Number(plan.yearly_price),
    is_enabled: Boolean(plan.is_enabled),
  });
}

function formatLimit(value: number, unit: string) {
  return value === -1 ? 'Illimité' : `${value.toLocaleString('fr-TN')} ${unit}`.trim();
}

async function getErrorMessage(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  return data?.error?.message || data?.message || fallback;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanLimits[]>([]);
  const [originalPlans, setOriginalPlans] = useState<Record<string, PlanLimits>>({});
  const [newPlan, setNewPlan] = useState<PlanLimits>({ ...emptyPlan });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [replacementPlanId, setReplacementPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const dirtyPlanIds = useMemo(() => plans
    .filter((plan) => originalPlans[plan.plan_id] && planSignature(plan) !== planSignature(originalPlans[plan.plan_id]))
    .map((plan) => plan.plan_id), [originalPlans, plans]);

  const totals = useMemo(() => {
    const stores = plans.reduce((sum, plan) => sum + Number(plan.stores_count || 0), 0);
    const verified = plans.reduce((sum, plan) => sum + Number(plan.verified_stores_count || 0), 0);
    const paidPlans = plans.filter((plan) => plan.yearly_price > 0).length;
    const enabledPlans = plans.filter((plan) => plan.is_enabled).length;
    const disabledPlans = plans.length - enabledPlans;
    const yearlyPotential = plans.reduce((sum, plan) => sum + Number(plan.stores_count || 0) * Number(plan.yearly_price || 0), 0);
    return { stores, verified, paidPlans, enabledPlans, disabledPlans, yearlyPotential };
  }, [plans]);

  async function loadPlans() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/plans');
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Impossible de charger les plans.'));
      const data = await res.json();
      const rows = Array.isArray(data.data) ? data.data : Array.isArray(data.plans) ? data.plans : [];
      const normalized = sortPlans(rows.map((row: Record<string, unknown>) => normalizePlan(row)));
      setPlans(normalized);
      setOriginalPlans(Object.fromEntries(normalized.map((plan) => [plan.plan_id, plan])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les plans.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  const updatePlan = <K extends keyof PlanLimits>(planId: string, field: K, value: PlanLimits[K]) => {
    setPlans((prev) => prev.map((plan) => (plan.plan_id === planId ? { ...plan, [field]: value } : plan)));
    setMessage('');
    setError('');
  };

  const resetPlan = (planId: string) => {
    const original = originalPlans[planId];
    if (!original) return;
    setPlans((prev) => prev.map((plan) => (plan.plan_id === planId ? original : plan)));
    setMessage('');
  };

  const resetAll = () => {
    setPlans(sortPlans(Object.values(originalPlans)));
    setMessage('');
  };

  const buildPayload = (plan: PlanLimits) => ({
    max_products: Number(plan.max_products),
    max_images_per_product: Number(plan.max_images_per_product),
    has_ai_seo: Boolean(plan.has_ai_seo),
    has_image_compression: Boolean(plan.has_image_compression),
    has_custom_domain: Boolean(plan.has_custom_domain),
    has_page_builder: Boolean(plan.has_page_builder),
    has_direct_payment: Boolean(plan.has_direct_payment),
    has_white_label: Boolean(plan.has_white_label),
    commission_rate: Number(plan.commission_rate),
    ai_tokens_included: Number(plan.ai_tokens_included),
    yearly_price: Number(plan.yearly_price),
    is_enabled: Boolean(plan.is_enabled),
  });

  const savePlan = async (plan: PlanLimits, silent = false) => {
    setSaving(plan.plan_id);
    setMessage('');
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/plans/${encodeURIComponent(plan.plan_id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(plan)),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, `Erreur lors de la mise à jour du plan ${labelFromPlanId(plan.plan_id)}.`));
      const data = await res.json();
      const updated = normalizePlan({ ...plan, ...(data.data || data.plan || {}) });
      setPlans((current) => sortPlans(current.map((item) => (item.plan_id === updated.plan_id ? { ...item, ...updated } : item))));
      setOriginalPlans((current) => ({ ...current, [updated.plan_id]: { ...plan, ...updated } }));
      if (!silent) setMessage(`Plan "${labelFromPlanId(plan.plan_id)}" mis à jour avec succès.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau.');
      throw err;
    } finally {
      setSaving(null);
    }
  };

  const saveAll = async () => {
    const dirtyPlans = plans.filter((plan) => dirtyPlanIds.includes(plan.plan_id));
    if (dirtyPlans.length === 0) return;
    setSaving('all');
    setMessage('');
    setError('');
    try {
      for (const plan of dirtyPlans) {
        await savePlan(plan, true);
      }
      setMessage(`${dirtyPlans.length} plan(s) mis à jour avec succès.`);
    } catch {
      setError('Une ou plusieurs mises à jour ont échoué.');
    } finally {
      setSaving(null);
    }
  };

  const createPlan = async () => {
    const planId = normalizePlanIdInput(newPlan.plan_id);
    if (!planId) {
      setError('Veuillez saisir un identifiant de plan valide.');
      return;
    }
    if (plans.some((plan) => plan.plan_id === planId)) {
      setError('Un plan avec cet identifiant existe déjà.');
      return;
    }
    setSaving('create');
    setError('');
    setMessage('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, ...buildPayload({ ...newPlan, plan_id: planId }) }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Impossible de créer le plan.'));
      const data = await res.json();
      const created = normalizePlan(data.data || data.plan || { ...newPlan, plan_id: planId });
      setPlans((current) => sortPlans([...current, created]));
      setOriginalPlans((current) => ({ ...current, [created.plan_id]: created }));
      setNewPlan({ ...emptyPlan });
      setShowCreateForm(false);
      setMessage(`Plan "${labelFromPlanId(created.plan_id)}" créé avec succès.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau.');
    } finally {
      setSaving(null);
    }
  };

  const duplicatePlan = (plan: PlanLimits) => {
    const duplicateId = normalizePlanIdInput(`${plan.plan_id}-copy`);
    setNewPlan({ ...plan, plan_id: duplicateId, is_enabled: true, stores_count: 0, verified_stores_count: 0, suspended_stores_count: 0 });
    setShowCreateForm(true);
    setMessage('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePlan = async (plan: PlanLimits) => {
    setSaving(`delete-${plan.plan_id}`);
    setError('');
    setMessage('');
    try {
      const body = replacementPlanId ? { replacement_plan_id: replacementPlanId } : {};
      const res = await fetchWithCsrf(`/api/pd/admin/plans/${encodeURIComponent(plan.plan_id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Impossible de supprimer le plan.'));
      setPlans((current) => current.filter((item) => item.plan_id !== plan.plan_id));
      setOriginalPlans((current) => {
        const next = { ...current };
        delete next[plan.plan_id];
        return next;
      });
      setDeleteTarget(null);
      setReplacementPlanId('');
      setMessage(`Plan "${labelFromPlanId(plan.plan_id)}" supprimé avec succès.`);
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#16C784]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100 ring-1 ring-white/15">
              Superadmin
            </span>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-black sm:text-4xl">
              <Settings className="h-8 w-8 text-[#16C784]" />
              Gestion des Plans
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-white/70">
              Créez, supprimez et configurez les plans vendeurs avec prix, limites, commissions, quotas IA et fonctionnalités incluses.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowCreateForm((value) => !value)} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-50">
              <Plus className="h-4 w-4" />
              Ajouter un plan
            </button>
            <button type="button" onClick={() => void loadPlans()} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15">
              <RefreshCw className="h-4 w-4" />
              Recharger
            </button>
            <button type="button" onClick={resetAll} disabled={dirtyPlanIds.length === 0 || saving !== null} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50">
              <RotateCcw className="h-4 w-4" />
              Annuler
            </button>
            <button type="button" onClick={() => void saveAll()} disabled={dirtyPlanIds.length === 0 || saving !== null} className="inline-flex items-center gap-2 rounded-2xl bg-[#16C784] px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/20 transition hover:bg-[#14b876] disabled:cursor-not-allowed disabled:bg-gray-300">
              {saving === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer tout
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Plans disponibles', value: totals.enabledPlans, helper: `${totals.disabledPlans} désactivé(s) · ${totals.paidPlans} payants` },
          { label: 'Boutiques liées', value: totals.stores, helper: `${totals.verified} vérifiées` },
          { label: 'Potentiel annuel', value: `${totals.yearlyPotential.toLocaleString('fr-TN')} TND`, helper: 'Selon les boutiques actuelles' },
          { label: 'Modifications', value: dirtyPlanIds.length, helper: dirtyPlanIds.length ? 'À enregistrer' : 'Tout est synchronisé' },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">{item.label}</p>
            <p className="mt-2 text-2xl font-black text-gray-900">{item.value}</p>
            <p className="mt-1 text-xs font-semibold text-gray-500">{item.helper}</p>
          </div>
        ))}
      </div>

      {message && <Feedback tone="success" message={message} />}
      {error && <Feedback tone="error" message={error} />}

      {showCreateForm && (
        <PlanEditor
          plan={newPlan}
          title="Ajouter un nouveau plan"
          helper="L'identifiant sera utilisé dans les abonnements et les URLs API. Format conseillé: pro-plus, business, enterprise."
          allowPlanIdEdit
          saving={saving === 'create'}
          onPlanIdChange={(value) => setNewPlan((current) => ({ ...current, plan_id: normalizePlanIdInput(value) }))}
          onChange={(field, value) => setNewPlan((current) => ({ ...current, [field]: value }))}
          actions={(
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50">
                Fermer
              </button>
              <button type="button" onClick={() => void createPlan()} disabled={saving !== null} className="inline-flex items-center gap-2 rounded-2xl bg-[#16C784] px-4 py-2 text-sm font-black text-white transition hover:bg-[#14b876] disabled:cursor-not-allowed disabled:bg-gray-300">
                {saving === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Créer le plan
              </button>
            </div>
          )}
        />
      )}

      <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-black text-amber-900">Attention</p>
            <p className="mt-1 text-sm font-semibold text-amber-700">
              Modifier les limites affecte tous les vendeurs liés au plan. Désactiver un plan le retire des nouvelles inscriptions et changements d'abonnement sans impacter les boutiques existantes. Un plan avec boutiques peut être supprimé uniquement avec un plan de remplacement. Le plan Free est protégé.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {plans.map((plan) => {
          const presentation = getPlanPresentation(plan.plan_id);
          const dirty = dirtyPlanIds.includes(plan.plan_id);
          const deleting = deleteTarget === plan.plan_id;
          return (
            <PlanEditor
              key={plan.plan_id}
              plan={plan}
              dirty={dirty}
              title={presentation.label}
              tone={presentation.tone}
              icon={presentation.icon}
              saving={saving === plan.plan_id || saving === `delete-${plan.plan_id}`}
              onChange={(field, value) => updatePlan(plan.plan_id, field, value)}
              actions={(
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-gray-500">
                    <span>{plan.verified_stores_count || 0} boutiques vérifiées · {plan.suspended_stores_count || 0} suspendues</span>
                    <span>{plan.stores_count || 0} boutiques liées</span>
                  </div>
                  {deleting && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-red-700">Confirmer la suppression</p>
                      {(plan.stores_count || 0) > 0 && (
                        <select value={replacementPlanId} onChange={(event) => setReplacementPlanId(event.target.value)} className="mt-2 w-full rounded-xl border border-red-100 bg-white px-3 py-2 text-sm font-bold text-gray-800 outline-none">
                          <option value="">Choisir un plan de remplacement</option>
                          {plans.filter((item) => item.plan_id !== plan.plan_id).map((item) => (
                            <option key={item.plan_id} value={item.plan_id}>{labelFromPlanId(item.plan_id)}</option>
                          ))}
                        </select>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => { setDeleteTarget(null); setReplacementPlanId(''); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-600">
                          Annuler
                        </button>
                        <button type="button" onClick={() => void deletePlan(plan)} disabled={saving !== null || ((plan.stores_count || 0) > 0 && !replacementPlanId)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-gray-300">
                          {saving === `delete-${plan.plan_id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Supprimer définitivement
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                    <button type="button" onClick={() => resetPlan(plan.plan_id)} disabled={!dirty || saving !== null} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                      <RotateCcw className="h-4 w-4" />
                      Réinitialiser
                    </button>
                    <button type="button" onClick={() => duplicatePlan(plan)} disabled={saving !== null} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                      <Copy className="h-4 w-4" />
                      Dupliquer
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(plan.plan_id)} disabled={plan.plan_id === 'free' || saving !== null} className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </button>
                    <button type="button" onClick={() => void savePlan(plan)} disabled={!dirty || saving !== null} className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-[#16C784] px-4 py-2 text-sm font-black text-white transition hover:bg-[#14b876] disabled:cursor-not-allowed disabled:bg-gray-300">
                      {saving === plan.plan_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function Feedback({ tone, message }: { tone: 'success' | 'error'; message: string }) {
  const success = tone === 'success';
  return (
    <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${success ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
      {success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {message}
    </div>
  );
}

function PlanEditor({
  plan,
  title,
  helper,
  tone,
  icon: Icon = Sparkles,
  dirty,
  allowPlanIdEdit,
  saving,
  actions,
  onChange,
  onPlanIdChange,
}: {
  plan: PlanLimits;
  title: string;
  helper?: string;
  tone?: string;
  icon?: typeof Sparkles;
  dirty?: boolean;
  allowPlanIdEdit?: boolean;
  saving: boolean;
  actions: React.ReactNode;
  onChange: <K extends keyof PlanLimits>(field: K, value: PlanLimits[K]) => void;
  onPlanIdChange?: (value: string) => void;
}) {
  const headerTone = tone || 'from-slate-900 to-emerald-800';
  return (
    <section className={`overflow-hidden rounded-[2rem] border bg-white shadow-sm transition ${dirty ? 'border-[#16C784]/40 shadow-emerald-900/10' : 'border-gray-100'}`}>
      <div className={`bg-gradient-to-r ${headerTone} p-5 text-white`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black">{title}</h2>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">{plan.plan_id || 'nouveau-plan'}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span className={'rounded-full px-3 py-1 text-xs font-black ring-1 ' + (plan.is_enabled ? 'bg-emerald-400/20 text-emerald-50 ring-emerald-200/25' : 'bg-red-400/20 text-red-50 ring-red-200/25')}>
              {plan.is_enabled ? 'Activé' : 'Désactivé'}
            </span>
            {dirty && <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black ring-1 ring-white/20">Modifié</span>}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/10">
            <p className="text-[10px] font-black uppercase text-white/55">Boutiques</p>
            <p className="mt-1 text-xl font-black">{plan.stores_count || 0}</p>
          </div>
          <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/10">
            <p className="text-[10px] font-black uppercase text-white/55">Produits</p>
            <p className="mt-1 text-sm font-black">{formatLimit(plan.max_products, '')}</p>
          </div>
          <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/10">
            <p className="text-[10px] font-black uppercase text-white/55">Tokens IA</p>
            <p className="mt-1 text-sm font-black">{formatLimit(plan.ai_tokens_included, '')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {helper && <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">{helper}</p>}
        <button type="button" onClick={() => onChange('is_enabled', !plan.is_enabled)} disabled={saving} className={'flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ' + (plan.is_enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-100 bg-red-50 text-red-700')}>
          <span>
            <span className="block text-sm font-black">{plan.is_enabled ? 'Disponible aux inscriptions' : 'Désactivé pour les nouveaux choix'}</span>
            <span className="mt-1 block text-xs font-semibold opacity-75">Les boutiques existantes conservent ce plan, mais il n'apparaît plus dans les sélecteurs publics quand il est désactivé.</span>
          </span>
          <span className={'h-6 w-11 rounded-full p-0.5 transition ' + (plan.is_enabled ? 'bg-[#16C784]' : 'bg-red-300')}>
            <span className={'block h-5 w-5 rounded-full bg-white transition ' + (plan.is_enabled ? 'translate-x-5' : '')} />
          </span>
        </button>
        {allowPlanIdEdit && (
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-gray-400">Identifiant du plan</span>
            <input value={plan.plan_id} onChange={(event) => onPlanIdChange?.(event.target.value)} placeholder="business-plus" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-black text-gray-900 outline-none focus:border-[#16C784] focus:bg-white focus:ring-4 focus:ring-[#16C784]/10" />
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="Prix annuel" suffix="TND" value={plan.yearly_price} min={0} onChange={(value) => onChange('yearly_price', value)} />
          <NumberField label="Commission" suffix="%" value={plan.commission_rate} min={0} max={100} step={0.1} onChange={(value) => onChange('commission_rate', value)} />
          <NumberField label="Max produits" suffix="-1 = ∞" value={plan.max_products} min={-1} onChange={(value) => onChange('max_products', Math.trunc(value))} />
          <NumberField label="Images / produit" suffix="images" value={plan.max_images_per_product} min={1} onChange={(value) => onChange('max_images_per_product', Math.max(1, Math.trunc(value)))} />
          <NumberField label="Tokens IA inclus" suffix="-1 = ∞" value={plan.ai_tokens_included} min={-1} onChange={(value) => onChange('ai_tokens_included', Math.trunc(value))} />
        </div>

        <div>
          <p className="mb-3 text-sm font-black text-gray-900">Fonctionnalités incluses</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {featureFields.map((feature) => (
              <button key={feature.key} type="button" onClick={() => onChange(feature.key, !plan[feature.key])} disabled={saving} className={`rounded-2xl border p-4 text-left transition ${plan[feature.key] ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'} disabled:cursor-not-allowed disabled:opacity-70`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black">{feature.label}</span>
                  <span className={`h-5 w-9 rounded-full p-0.5 transition ${plan[feature.key] ? 'bg-[#16C784]' : 'bg-gray-300'}`}>
                    <span className={`block h-4 w-4 rounded-full bg-white transition ${plan[feature.key] ? 'translate-x-4' : ''}`} />
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold opacity-75">{feature.description}</p>
              </button>
            ))}
          </div>
        </div>
        {actions}
      </div>
    </section>
  );
}

function NumberField({
  label,
  suffix,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-gray-400">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-[#16C784] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#16C784]/10">
        <input type="number" value={Number.isFinite(value) ? value : 0} min={min} max={max} step={step} onChange={(event) => onChange(toNumber(event.target.value))} className="min-w-0 flex-1 bg-transparent text-sm font-black text-gray-900 outline-none" />
        <span className="whitespace-nowrap text-[11px] font-bold text-gray-400">{suffix}</span>
      </div>
    </label>
  );
}
