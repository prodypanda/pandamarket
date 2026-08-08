'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Check,
  Clock3,
  Coins,
  Cpu,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  TrendingUp,
  Trash2,
  WalletCards,
  XCircle,
} from 'lucide-react';

interface AiStats {
  total_jobs: number;
  total_tokens_consumed: number;
  jobs_today: number;
  tokens_today: number;
  compression_jobs: number;
  seo_jobs: number;
  page_copy_jobs: number;
  failed_jobs: number;
  processing_jobs: number;
  queued_jobs: number;
  estimated_cost_tnd: number;
  credits: {
    active_wallets: number;
    unlimited_wallets: number;
    finite_tokens_remaining: number;
    tokens_used: number;
  };
  by_type: {
    type: string;
    count: number;
    tokens: number;
  }[];
  by_status: {
    status: string;
    count: number;
  }[];
  recent_failures: {
    id: string;
    store_id: string;
    store_name: string;
    type: string;
    error_message: string | null;
    created_at: string;
    completed_at: string | null;
  }[];
  top_consumers: {
    store_id: string;
    store_name: string;
    tokens_used: number;
    job_count: number;
  }[];
  daily_usage: {
    date: string;
    tokens: number;
    jobs: number;
  }[];
}

type AiProvider = 'gemini' | 'openai' | 'claude' | 'custom' | 'replicate';
type AiJobType = 'image_compression' | 'seo_generation' | 'page_copy' | 'product_description';

interface AiProviderConfig {
  id: string;
  provider: AiProvider;
  label: string;
  model: string;
  base_url: string | null;
  api_key_set: boolean;
  is_enabled: boolean;
  is_default: boolean;
  priority: number;
}

interface AiPricing {
  job_type: AiJobType;
  tokens_required: number;
}

const DEFAULT_STATS: AiStats = {
  total_jobs: 0,
  total_tokens_consumed: 0,
  jobs_today: 0,
  tokens_today: 0,
  compression_jobs: 0,
  seo_jobs: 0,
  page_copy_jobs: 0,
  failed_jobs: 0,
  processing_jobs: 0,
  queued_jobs: 0,
  estimated_cost_tnd: 0,
  credits: {
    active_wallets: 0,
    unlimited_wallets: 0,
    finite_tokens_remaining: 0,
    tokens_used: 0,
  },
  by_type: [],
  by_status: [],
  recent_failures: [],
  top_consumers: [],
  daily_usage: [],
};

const typeLabels: Record<string, string> = {
  image_compression: 'Compression image',
  seo_generation: 'SEO produit',
  page_copy: 'Copy page',
  product_description: 'Description produit',
};

const providerLabels: Record<AiProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  claude: 'Claude',
  custom: 'Custom',
  replicate: 'Replicate',
};

const emptyProviderForm = {
  id: '',
  provider: 'gemini' as AiProvider,
  label: '',
  model: 'gemini-1.5-flash',
  base_url: '',
  api_key: '',
  is_enabled: true,
  is_default: false,
  priority: 100,
};

const statusLabels: Record<string, string> = {
  queued: 'En attente',
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échoué',
};

function statusClass(status: string) {
  if (status === 'completed') return 'bg-green-50 text-green-700 ring-green-100';
  if (status === 'failed') return 'bg-red-50 text-red-700 ring-red-100';
  if (status === 'processing') return 'bg-amber-50 text-amber-700 ring-amber-100';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-TN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AiCostsDashboard() {
  const [stats, setStats] = useState<AiStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [configMessage, setConfigMessage] = useState('');
  const [providers, setProviders] = useState<AiProviderConfig[]>([]);
  const [pricing, setPricing] = useState<AiPricing[]>([]);
  const [providerForm, setProviderForm] = useState({ ...emptyProviderForm });
  const [savingConfig, setSavingConfig] = useState(false);

const DEFAULT_PROMPT_TEMPLATES = [
  {
    prompt_key: 'product_smart_fill',
    title: 'Générateur Intelligent de Fiche Produit',
    description: 'Génère le titre commercial, description HTML enrichie, atouts clés et catégorisation complète Hub & Boutique.',
    system_prompt: `Vous êtes l'Assistant IA Expert en E-commerce et Merchandising de PandaMarket. Votre mission est de concevoir des fiches produits d'un niveau d'excellence digne des plus grands sites e-commerce mondiaux. Vous maîtrisez le SEO, la psychologie d'achat, le copywriting persuasif et la structuration sémantique HTML. Vous devez transformer les informations brutes fournies (titre, mots-clés, brouillon ou image) en une fiche produit complète, captivante, précise et parfaitement catégorisée.`,
    default_prompt: `Analysez attentivement les données fournies et générez une fiche produit complète, vendeuse et prête à publier.

Données du produit d'entrée :
- Titre / Mots-clés : {title}
- Description brute : {description}
- Langue ciblée : {language}

Consignes strictes de rédaction :
1. Titre commercial : Vendeur, clair, optimisé pour la recherche, mentionnant les atouts majeurs (max 100 caractères).
2. Description HTML : Riche, séduisante et bien structurée (max 3000 caractères). Utilisez EXCLUSIVEMENT les balises <h3>, <p>, <strong>, <em>, <ul>, <li>. Structure recommandée :
   - Accroche percutante et bénéfice principal
   - Caractéristiques et points forts sous forme de liste à puces (<ul><li>...</li></ul>)
   - Conseils d'utilisation ou détails techniques
   - Réassurance qualité / satisfaction client
3. Catégorisation intelligente : Associez le produit à la catégorie et sous-catégorie les plus pertinentes du PandaMarket Hub, ainsi qu'aux catégories recommandées pour la vitrine de la boutique.

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE SANS AUCUN TEXTE AUTOUR, SELON CE FORMAT :
{
  "suggested_title": "Titre commercial attractif et optimisé",
  "suggested_description": "<p>Description HTML structurée avec <h3>, <strong>, <ul> et <li>...</p>",
  "suggested_hub_category_name": "Catégorie principale du Hub",
  "suggested_hub_subcategory_name": "Sous-catégorie du Hub",
  "suggested_storefront_category": "Catégorie vitrine boutique",
  "suggested_storefront_subcategory": "Sous-catégorie vitrine boutique"
}`,
  },
  {
    prompt_key: 'photo_studio_background',
    title: 'Studio Photo & Remplacement de Fond',
    description: 'Détoure le produit avec précision et l\'intègre dans un décor studio haut de gamme avec ombres réalistes.',
    system_prompt: `Vous êtes un photographe studio produit et directeur de la photographie commerciale pour catalogues de luxe. Vous êtes spécialisé dans la mise en scène produit en haute définition, la gestion de l'éclairage de studio, le détourage ultra-précis et le rendu photoréaliste.`,
    default_prompt: `Photographie commerciale de produit haute définition avec détourage impeccable et intégration harmonieuse dans le décor suivant : {preset_description}.

Directives artistiques et techniques :
- Détourage précis sans artefact de contour ni halo
- Éclairage studio diffus et naturel (Softbox & Ring light), éliminant les reflets agressifs
- Ombres portées douces et réalistes respectant la perspective et le plan de pose
- Profondeur de champ équilibrée mettant en valeur la matière et les détails du produit
- Rendu 8k UHD net, propre, sans compression, optimisé pour conversion e-commerce`,
  },
  {
    prompt_key: 'photo_studio_gallery',
    title: 'Générateur de Mockups & Galerie Produit',
    description: 'Génère des visuels publicitaires lifestyle et des mockups de mise en situation réelle pour booster l\'engagement.',
    system_prompt: `Vous êtes un directeur artistique e-commerce et photographe publicitaire spécialisé dans les visuels lifestyle et les mockups de mise en situation réelle.`,
    default_prompt: `Créez une prise de vue lifestyle publicitaire et authentique pour le produit "{title}".

Style visuel : {style_description}.

Directives de composition :
- Cadrage dynamique en situation réelle d'usage (lifestyle authentique ou studio moderne)
- Lumière ambiante naturelle et esthétique mettant en valeur le produit comme élément central
- Présentation haut de gamme renforçant le désir d'achat et la perception de valeur
- Résolution 4K ultra-nette, textures riches et fidélité absolue au produit`,
  },
  {
    prompt_key: 'photo_studio_upscale',
    title: "Sublimateur d'Éclairage & Haute Définition",
    description: 'Améliore la netteté, calibre la balance des blancs, sublime les textures et réhausse la lumière globale.',
    system_prompt: `Vous êtes un maître retoucheur numérique et étalonneur colorimétrique e-commerce spécialisé dans l'optimisation HD et la sublimation d'images produit.`,
    default_prompt: `Amélioration et restauration HD de la photographie du produit :
- Amplification de la netteté et micro-contrastes sur les textures et matériaux
- Équilibrage précis de la balance des blancs et réhaussement de la dynamique lumineuse
- Débruitage propre sans effet de lissage excessif
- Couleurs vibrantes, naturelles et fidèles à la réalité
- Rendu final cristal-net de qualité professionnelle 4K UHD`,
  },
  {
    prompt_key: 'page_copy',
    title: 'Générateur de Rédaction de Page Landing',
    description: 'Rédige des accroches percutantes, des titres accrocheurs et des méta-données SEO optimisées pour les pages.',
    system_prompt: `Vous êtes un concepteur-rédacteur (Copywriter) et stratège SEO d'élite pour marques D2C et marketplaces e-commerce. Votre objectif est de concevoir des textes percutants, mémorables et orientés conversion.`,
    default_prompt: `Rédigez le contenu rédactionnel et SEO pour la page de boutique : {page_title}.

Langue ciblée : {language}.

Directives :
- Titre SEO : percutant, riche en mots-clés stratégiques (50-60 caractères max).
- Meta-description SEO : incitative au clic avec proposition de valeur claire (140-155 caractères max).
- Titre Hero de la page : accroche forte et inspirante pour capter l'attention instantanément.
- Bouton d'action (CTA) : engageant et incitatif.

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE :
{
  "seo_title": "Titre SEO optimisé",
  "seo_description": "Meta description persuasive",
  "hero_title": "Titre principal accrocheur",
  "cta": "Texte du bouton d'action"
}`,
  },
];

  // Multi-Engine Purpose Routing & Prompt Templates State
  const [purposeRouting, setPurposeRouting] = useState<Array<{ purpose: string; provider_config_id: string | null; provider_label: string; model: string | null }>>([]);
  const [savingPurposeKey, setSavingPurposeKey] = useState<string | null>(null);
  const [savedPurposeKeys, setSavedPurposeKeys] = useState<Record<string, boolean>>({});
  const [promptTemplates, setPromptTemplates] = useState<Array<{ prompt_key: string; title: string; description: string | null; system_prompt: string; default_prompt: string }>>(DEFAULT_PROMPT_TEMPLATES);
  const [selectedPromptKey, setSelectedPromptKey] = useState<string>('product_smart_fill');
  const [editingSystemPrompt, setEditingSystemPrompt] = useState<string>(DEFAULT_PROMPT_TEMPLATES[0].system_prompt);
  const [editingDefaultPrompt, setEditingDefaultPrompt] = useState<string>(DEFAULT_PROMPT_TEMPLATES[0].default_prompt);
  const [savingPrompt, setSavingPrompt] = useState<boolean>(false);
  const [promptMessage, setPromptMessage] = useState<string>('');

  const maxDailyTokens = useMemo(
    () => Math.max(...stats.daily_usage.map((day) => day.tokens), 1),
    [stats.daily_usage],
  );

  const totalActiveJobs = stats.processing_jobs + stats.queued_jobs;

  const fetchConfig = useCallback(async () => {
    const res = await fetchWithCsrf('/api/pd/admin/ai-config', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || 'Impossible de charger la configuration IA');
    setProviders(Array.isArray(data.providers) ? data.providers : []);
    setPricing(Array.isArray(data.pricing) ? data.pricing : []);

    // Fetch Purpose Routing
    try {
      const routeRes = await fetchWithCsrf('/api/pd/admin/ai/purpose-routing', { credentials: 'include' });
      const routeData = await routeRes.json().catch(() => ({}));
      if (routeRes.ok && Array.isArray(routeData.routing)) {
        setPurposeRouting(routeData.routing);
      }
    } catch {
      // optional fallback
    }

    // Fetch Prompt Templates
    try {
      const promptRes = await fetchWithCsrf('/api/pd/admin/ai/prompts', { credentials: 'include' });
      const promptData = await promptRes.json().catch(() => ({}));
      if (promptRes.ok && Array.isArray(promptData.templates)) {
        setPromptTemplates(promptData.templates);
        const current = promptData.templates.find((t: any) => t.prompt_key === selectedPromptKey) || promptData.templates[0];
        if (current) {
          setSelectedPromptKey(current.prompt_key);
          setEditingSystemPrompt(current.system_prompt || '');
          setEditingDefaultPrompt(current.default_prompt || '');
        }
      }
    } catch {
      // optional fallback
    }
  }, [selectedPromptKey]);

  const fetchStats = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/ai-stats', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Impossible de charger les statistiques IA');
      setStats({
        ...DEFAULT_STATS,
        ...data,
        credits: { ...DEFAULT_STATS.credits, ...(data.credits || {}) },
        by_type: Array.isArray(data.by_type) ? data.by_type : [],
        by_status: Array.isArray(data.by_status) ? data.by_status : [],
        recent_failures: Array.isArray(data.recent_failures) ? data.recent_failures : [],
        top_consumers: Array.isArray(data.top_consumers) ? data.top_consumers : [],
        daily_usage: Array.isArray(data.daily_usage) ? data.daily_usage : [],
      });
      await fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchConfig]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const editProvider = (provider: AiProviderConfig) => {
    setProviderForm({
      id: provider.id,
      provider: provider.provider,
      label: provider.label,
      model: provider.model,
      base_url: provider.base_url || '',
      api_key: '',
      is_enabled: provider.is_enabled,
      is_default: provider.is_default,
      priority: provider.priority,
    });
    setConfigMessage('');
  };

  const resetProviderForm = () => {
    setProviderForm({ ...emptyProviderForm });
    setConfigMessage('');
  };

  const saveProvider = async () => {
    setSavingConfig(true);
    setError('');
    setConfigMessage('');
    try {
      const res = await fetchWithCsrf(
        providerForm.id ? `/api/pd/admin/ai-providers/${encodeURIComponent(providerForm.id)}` : '/api/pd/admin/ai-providers',
        {
          method: providerForm.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            provider: providerForm.provider,
            label: providerForm.label.trim(),
            model: providerForm.model.trim(),
            base_url: providerForm.base_url.trim() || undefined,
            api_key: providerForm.api_key.trim() || undefined,
            is_enabled: providerForm.is_enabled,
            is_default: providerForm.is_default,
            priority: Number(providerForm.priority),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Sauvegarde fournisseur impossible');
      await fetchConfig();
      resetProviderForm();
      setConfigMessage('Fournisseur IA sauvegardé.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingConfig(false);
    }
  };

  const deleteProvider = async (id: string) => {
    setSavingConfig(true);
    setError('');
    setConfigMessage('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/ai-providers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Suppression impossible');
      await fetchConfig();
      if (providerForm.id === id) resetProviderForm();
      setConfigMessage('Fournisseur IA supprimé.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingConfig(false);
    }
  };

  const updatePurposeRouting = async (purpose: string, providerConfigId: string | null) => {
    // 1. Optimistic state update so select never snaps back to default
    const targetProvider = providers.find((p) => p.id === providerConfigId);
    setPurposeRouting((prev) => {
      const idx = prev.findIndex((r) => r.purpose === purpose);
      const updatedItem = {
        purpose,
        provider_config_id: providerConfigId,
        provider_label: targetProvider ? `${targetProvider.label} (${providerLabels[targetProvider.provider]} - ${targetProvider.model})` : 'Pile de Priorité Défaut',
        model: targetProvider?.model || null,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedItem };
        return next;
      }
      return [...prev, updatedItem];
    });

    setSavingPurposeKey(purpose);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/ai/purpose-routing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose, provider_config_id: providerConfigId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.routing)) {
        setPurposeRouting(data.routing);
        setSavedPurposeKeys((prev) => ({ ...prev, [purpose]: true }));
        setConfigMessage(`Routage mis à jour avec succès pour le module "${purpose}".`);
        setTimeout(() => {
          setSavedPurposeKeys((prev) => ({ ...prev, [purpose]: false }));
        }, 3000);
      } else {
        throw new Error(data.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du routage IA par usage.');
      await fetchConfig();
    } finally {
      setSavingPurposeKey(null);
    }
  };

  const handleSelectPrompt = (key: string) => {
    setSelectedPromptKey(key);
    const target = promptTemplates.find((t) => t.prompt_key === key);
    if (target) {
      setEditingSystemPrompt(target.system_prompt || '');
      setEditingDefaultPrompt(target.default_prompt || '');
      setPromptMessage('');
    }
  };

  const savePromptTemplate = async () => {
    setSavingPrompt(true);
    setPromptMessage('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/ai/prompts/${selectedPromptKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: editingSystemPrompt,
          default_prompt: editingDefaultPrompt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.template) {
        setPromptTemplates((prev) => prev.map((t) => (t.prompt_key === selectedPromptKey ? data.template : t)));
        setPromptMessage('Prompt système enregistré avec succès !');
      } else {
        throw new Error(data.error?.message || 'Erreur d\'enregistrement');
      }
    } catch (err) {
      setPromptMessage(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingPrompt(false);
    }
  };

  const savePricing = async () => {
    setSavingConfig(true);
    setError('');
    setConfigMessage('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/ai-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prices: pricing }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Sauvegarde des prix IA impossible');
      setPricing(Array.isArray(data.pricing) ? data.pricing : pricing);
      setConfigMessage('Prix IA sauvegardés.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingConfig(false);
    }
  };

  const statCards = [
    { label: 'Total AI Jobs', value: stats.total_jobs.toLocaleString(), icon: Cpu, color: 'text-[#B91C1C] bg-amber-50' },
    { label: 'Tokens Consumed', value: stats.total_tokens_consumed.toLocaleString(), icon: Coins, color: 'text-[#B91C1C] bg-[#B91C1C]/10' },
    { label: 'Tokens Today', value: stats.tokens_today.toLocaleString(), icon: TrendingUp, color: 'text-amber-700 bg-amber-50' },
    { label: 'Est. API Cost', value: `${stats.estimated_cost_tnd.toFixed(3)} TND`, icon: Sparkles, color: 'text-red-600 bg-red-50' },
    { label: 'Compression Jobs', value: stats.compression_jobs.toLocaleString(), icon: ImageIcon, color: 'text-[#7F1D1D] bg-red-50' },
    { label: 'SEO Jobs', value: stats.seo_jobs.toLocaleString(), icon: FileText, color: 'text-amber-700 bg-amber-50' },
    { label: 'Page Copy Jobs', value: stats.page_copy_jobs.toLocaleString(), icon: Sparkles, color: 'text-[#B91C1C] bg-amber-50' },
    { label: 'Active Queue', value: totalActiveJobs.toLocaleString(), icon: Clock3, color: 'text-amber-700 bg-amber-50' },
    { label: 'Failed Jobs', value: stats.failed_jobs.toLocaleString(), icon: XCircle, color: 'text-red-700 bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-6 text-white shadow-2xl shadow-slate-900/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
              <Sparkles className="h-6 w-6 text-amber-100" />
            </div>
            <div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-amber-100">
                Superadmin AI governance
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight">AI Cost Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Monitor AI usage, queue health, failed jobs, wallet exposure and estimated platform cost.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchStats(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}
      {configMessage && (
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700">
          {configMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5 xl:col-span-2">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-950">AI Providers</h2>
              <p className="mt-1 text-sm font-semibold text-gray-500">
                Configure platform API keys, default provider and fallback priority.
              </p>
            </div>
            <button
              type="button"
              onClick={resetProviderForm}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              New provider
            </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            <input
              value={providerForm.label}
              onChange={(e) => setProviderForm((current) => ({ ...current, label: e.target.value }))}
              placeholder="Label"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <select
              value={providerForm.provider}
              onChange={(e) => setProviderForm((current) => ({ ...current, provider: e.target.value as AiProvider }))}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            >
              {Object.entries(providerLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              value={providerForm.model}
              onChange={(e) => setProviderForm((current) => ({ ...current, model: e.target.value }))}
              placeholder="Model"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <input
              type="number"
              value={providerForm.priority}
              onChange={(e) => setProviderForm((current) => ({ ...current, priority: Number(e.target.value) }))}
              placeholder="Priority"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <input
              value={providerForm.base_url}
              onChange={(e) => setProviderForm((current) => ({ ...current, base_url: e.target.value }))}
              placeholder="Base URL optional"
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10 lg:col-span-2"
            />
            <input
              type="password"
              value={providerForm.api_key}
              onChange={(e) => setProviderForm((current) => ({ ...current, api_key: e.target.value }))}
              placeholder={providerForm.id ? 'New API key optional' : 'API key'}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProviderForm((current) => ({ ...current, is_enabled: !current.is_enabled }))}
                className={`rounded-2xl px-3 py-3 text-xs font-black ring-1 ${providerForm.is_enabled ? 'bg-green-50 text-green-700 ring-green-100' : 'bg-gray-50 text-gray-500 ring-gray-100'}`}
              >
                {providerForm.is_enabled ? 'Enabled' : 'Disabled'}
              </button>
              <button
                type="button"
                onClick={() => setProviderForm((current) => ({ ...current, is_default: !current.is_default }))}
                className={`rounded-2xl px-3 py-3 text-xs font-black ring-1 ${providerForm.is_default ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-gray-50 text-gray-500 ring-gray-100'}`}
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => void saveProvider()}
                disabled={savingConfig || !providerForm.label.trim() || !providerForm.model.trim()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-50"
              >
                {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {providers.length === 0 ? (
              <p className="rounded-2xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">No provider configured.</p>
            ) : providers.map((provider) => (
              <div key={provider.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-gray-950">{provider.label}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      {providerLabels[provider.provider]} · {provider.model} · priority {provider.priority}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {provider.is_default && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700">Default</span>}
                    {provider.api_key_set && <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-black text-green-700">Key</span>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => editProvider(provider)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-600 ring-1 ring-gray-200">
                    Edit
                  </button>
                  <button type="button" onClick={() => void deleteProvider(provider.id)} disabled={savingConfig} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
          <h2 className="text-lg font-black text-gray-950">AI Token Prices</h2>
          <p className="mt-1 text-sm font-semibold text-gray-500">Set the token cost for each AI feature.</p>
          <div className="mt-5 space-y-3">
            {pricing.map((price) => (
              <label key={price.job_type} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4">
                <span className="text-sm font-black text-gray-800">{typeLabels[price.job_type]}</span>
                <input
                  type="number"
                  min={0}
                  value={price.tokens_required}
                  onChange={(e) => setPricing((current) => current.map((item) => (
                    item.job_type === price.job_type ? { ...item, tokens_required: Math.max(0, Number(e.target.value)) } : item
                  )))}
                  className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-black text-gray-900 outline-none focus:border-[#B91C1C]"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void savePricing()}
            disabled={savingConfig}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white hover:bg-[#991B1B] disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Enregistrer Tarification Tokens
          </button>
        </section>
      </div>

      {/* Multi-Engine Purpose Routing Manager */}
      <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-950">Routage Multi-Moteurs IA par Usage</h2>
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-black text-[#B91C1C]">
                {purposeRouting.filter((r) => r.provider_config_id).length} Moteurs Spécifiques Assignés
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-500">
              Attribuez un moteur d&apos;IA spécifique (OpenAI, Gemini, Claude, Custom) à chaque type de tâche e-commerce.
            </p>
          </div>
          <Sparkles className="h-6 w-6 text-[#B91C1C] flex-shrink-0" />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { key: 'text_summarization', label: '📝 Résumé & Analyse', desc: 'Analyse rapide des descriptions brutes.' },
            { key: 'content_generation', label: '✍️ Génération de Contenu', desc: 'Rédaction des titres et fiches produit HTML.' },
            { key: 'image_generation', label: '🎨 Génération d\'Images', desc: 'Mockups et décors studio IA.' },
            { key: 'image_upscaling', label: '🔍 Upscaling HD', desc: 'Amélioration de la netteté et résolution.' },
            { key: 'image_enhancement', label: '✨ Amélioration Photo', desc: 'Balance des couleurs et éclairage.' },
            { key: 'image_background_removal', label: '✂️ Détourage', desc: 'Suppression automatique du fond.' },
          ].map((item) => {
            const currentRoute = purposeRouting.find((r) => r.purpose === item.key);
            const isSaving = savingPurposeKey === item.key;
            const isSaved = savedPurposeKeys[item.key];
            const activeProvider = providers.find((p) => p.id === currentRoute?.provider_config_id);

            return (
              <div key={item.key} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 flex flex-col justify-between transition-all hover:border-gray-200">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-black text-sm text-gray-900">{item.label}</h3>
                    {isSaving && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Enregistrement...
                      </span>
                    )}
                    {isSaved && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <Check className="w-3 h-3 text-emerald-600" /> Enregistré
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-black uppercase text-gray-400">Moteur Assigné</label>
                    {activeProvider ? (
                      <span className="font-bold text-[10px] text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                        {activeProvider.label}
                      </span>
                    ) : (
                      <span className="font-bold text-[10px] text-gray-500 bg-gray-200/60 px-1.5 py-0.5 rounded">
                        Pile Défaut
                      </span>
                    )}
                  </div>

                  <select
                    value={currentRoute?.provider_config_id || ''}
                    disabled={isSaving}
                    onChange={(e) => void updatePurposeRouting(item.key, e.target.value || null)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-900 outline-none focus:border-[#B91C1C] disabled:opacity-50"
                  >
                    <option value="">Pile de Priorité Défaut</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} ({providerLabels[p.provider]} - {p.model})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void updatePurposeRouting(item.key, currentRoute?.provider_config_id || null)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-1.5 text-[11px] font-black text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#B91C1C]" />
                    ) : (
                      <Save className="w-3 h-3 text-[#B91C1C]" />
                    )}
                    <span>{isSaved ? 'Enregistré avec succès !' : 'Enregistrer ce routage'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* System Prompts & Initial Templates Manager */}
      <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-950">Gestionnaire des Prompts Système & Modèles Initiaux</h2>
            <p className="mt-1 text-sm font-semibold text-gray-500">
              Personnalisez les prompts de référence envoyés aux modèles d&apos;IA pour ajuster le ton, le format et les règles métier.
            </p>
          </div>
          <FileText className="h-6 w-6 text-[#B91C1C]" />
        </div>

        {promptMessage && (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
            {promptMessage}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-b border-gray-100 pb-3">
          {promptTemplates.map((tpl) => (
            <button
              key={tpl.prompt_key}
              type="button"
              onClick={() => handleSelectPrompt(tpl.prompt_key)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                selectedPromptKey === tpl.prompt_key
                  ? 'bg-[#B91C1C] text-white shadow-md shadow-[#B91C1C]/20'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tpl.title}
            </button>
          ))}
        </div>

        {selectedPromptKey && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-600 mb-1">
                Prompt Système / Persona de l&apos;IA (System Prompt)
              </label>
              <textarea
                rows={3}
                value={editingSystemPrompt}
                onChange={(e) => setEditingSystemPrompt(e.target.value)}
                placeholder="Rôle et consignes de comportement pour l'IA..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs text-gray-900 outline-none focus:bg-white focus:border-[#B91C1C]"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-600 mb-1">
                Template de Prompt d&apos;Exécution (Default Prompt)
              </label>
              <textarea
                rows={7}
                value={editingDefaultPrompt}
                onChange={(e) => setEditingDefaultPrompt(e.target.value)}
                placeholder="Instructions détaillées avec variables {title}, {description}, {language}..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs text-gray-900 outline-none focus:bg-white focus:border-[#B91C1C]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => void savePromptTemplate()}
                disabled={savingPrompt}
                className="flex items-center gap-2 rounded-2xl bg-[#B91C1C] px-6 py-3 text-xs font-black text-white hover:bg-[#991B1B] disabled:opacity-50"
              >
                {savingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer le Prompt Système
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xl shadow-slate-900/5">
            <div className="mb-3 flex items-center gap-3">
              <div className={`rounded-2xl p-2 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-500">{card.label}</span>
            </div>
            {loading ? (
              <div className="h-8 w-20 animate-pulse rounded bg-gray-100" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">Token Usage (30 days)</h3>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
              {stats.jobs_today} jobs today
            </span>
          </div>
          {loading ? (
            <div className="h-48 animate-pulse rounded-lg bg-gray-50" />
          ) : stats.daily_usage.length > 0 ? (
            <>
              <div className="flex h-48 items-end gap-[3px]">
                {stats.daily_usage.map((day, i) => {
                  const height = (day.tokens / maxDailyTokens) * 100;
                  return (
                    <div
                      key={day.date}
                      className="group relative flex-1"
                      title={`${day.date}: ${day.tokens} tokens, ${day.jobs} jobs`}
                    >
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          i === stats.daily_usage.length - 1
                            ? 'bg-[#B91C1C]'
                            : 'bg-amber-200/70 group-hover:bg-amber-300'
                        }`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 group-hover:block">
                        <div className="whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
                          <p className="font-medium">{new Date(day.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</p>
                          <p className="text-amber-300">{day.tokens} tokens</p>
                          <p className="text-gray-400">{day.jobs} jobs</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-gray-400">
                <span>{new Date(stats.daily_usage[0]?.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</span>
                <span>Today</span>
              </div>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">No AI usage data yet</div>
          )}
        </div>

        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-gray-900">Top Consumers</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-gray-50" />
              ))}
            </div>
          ) : stats.top_consumers.length > 0 ? (
            <ul className="space-y-3">
              {stats.top_consumers.slice(0, 8).map((consumer, i) => (
                <li key={consumer.store_id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-5 text-xs font-bold text-gray-400">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{consumer.store_name}</p>
                      <p className="text-xs text-gray-400">{consumer.job_count} jobs</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-[#B91C1C]">{consumer.tokens_used.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No consumers yet</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#B91C1C]" />
            <h3 className="text-lg font-black text-gray-900">Usage by Type</h3>
          </div>
          <div className="space-y-3">
            {stats.by_type.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No type data</p>
            ) : (
              stats.by_type.map((item) => (
                <div key={item.type} className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-gray-900">{typeLabels[item.type] || item.type}</span>
                    <span className="text-sm font-black text-[#B91C1C]">{item.count}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-gray-400">{item.tokens.toLocaleString()} tokens</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#B91C1C]" />
            <h3 className="text-lg font-black text-gray-900">Queue Health</h3>
          </div>
          <div className="space-y-3">
            {stats.by_status.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No status data</p>
            ) : (
              stats.by_status.map((item) => (
                <div key={item.status} className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${statusClass(item.status)}`}>
                    {statusLabels[item.status] || item.status}
                  </span>
                  <span className="text-lg font-black text-gray-900">{item.count.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-[#B91C1C]" />
            <h3 className="text-lg font-black text-gray-900">Credit Wallets</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Active wallets', value: stats.credits.active_wallets },
              { label: 'Unlimited', value: stats.credits.unlimited_wallets },
              { label: 'Finite remaining', value: stats.credits.finite_tokens_remaining },
              { label: 'Wallet used', value: stats.credits.tokens_used },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">{item.label}</p>
                <p className="mt-2 text-xl font-black text-[#7F1D1D]">{item.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-black text-gray-900">Recent Failures</h3>
          </div>
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
            {stats.failed_jobs.toLocaleString()} total failed
          </span>
        </div>
        {stats.recent_failures.length === 0 ? (
          <p className="rounded-2xl bg-green-50 p-6 text-center text-sm font-bold text-green-700">No recent AI failures.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                  <th className="py-3 pr-4">Store</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Error</th>
                  <th className="py-3 pr-4">Time</th>
                  <th className="py-3 pr-4">Job</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recent_failures.map((failure) => (
                  <tr key={failure.id} className="text-sm">
                    <td className="py-3 pr-4 font-bold text-gray-900">{failure.store_name}</td>
                    <td className="py-3 pr-4 text-gray-600">{typeLabels[failure.type] || failure.type}</td>
                    <td className="max-w-[360px] py-3 pr-4 text-red-700">
                      <span className="line-clamp-2">{failure.error_message || 'Unknown failure'}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{formatDate(failure.completed_at || failure.created_at)}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-400">{failure.id.slice(-10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
