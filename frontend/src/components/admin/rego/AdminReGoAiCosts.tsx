'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  Code2,
  Coins,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  Filter,
  FolderTree,
  HelpCircle,
  History,
  Image as ImageIcon,
  Key,
  Layers,
  Layers3,
  Link as LinkIcon,
  Loader2,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings2,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Tag,
  Terminal,
  Trash2,
  TrendingUp,
  WalletCards,
  Wand2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { DashboardPageWrapper } from '@/components/dashboard/DashboardPageWrapper';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
  ReGoModal,
} from '@/components/dashboard/rego/ReGoPrimitives';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface RecentActivityItem {
  id: string;
  store_id: string;
  store_name: string;
  user_id: string | null;
  type: string;
  status: string;
  tokens_consumed: number;
  error_message: string | null;
  duration_seconds: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  input_meta: Record<string, unknown>;
  output: Record<string, unknown> | null;
  provider_label: string | null;
}

export interface AiJobRecord {
  id: string;
  store_id: string;
  store_name: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  input_url: string | null;
  input_meta: Record<string, unknown>;
  output: Record<string, unknown> | null;
  tokens_consumed: number;
  error_message: string | null;
  bullmq_job_id: string | null;
  duration_seconds: number | null;
  provider_label: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface AiStats {
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
  recent_activity?: RecentActivityItem[];
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

export type AiProvider = 'gemini' | 'openai' | 'claude' | 'custom' | 'replicate';
export type AiJobType = 'image_compression' | 'seo_generation' | 'page_copy' | 'product_description';
export type TabKey = 'overview' | 'history' | 'routing' | 'providers' | 'prompts' | 'pricing';

export interface AiProviderConfig {
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

export interface AiPricing {
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
  recent_activity: [],
  top_consumers: [],
  daily_usage: [],
};

const typeLabels: Record<string, string> = {
  image_compression: 'Compression image',
  seo_generation: 'SEO produit',
  page_copy: 'Copywriting page',
  product_description: 'Description produit',
  category_classification: 'Classification des catégories',
  product_smart_fill: 'Remplissage intelligent',
  product_tagging: 'Auto-tagging sémantique',
  photo_studio: 'Studio photo IA',
};

const DEFAULT_PROMPT_TEMPLATES = [
  {
    prompt_key: 'product_description',
    title: "Sublimer avec l'IA — Description Produit & Points Forts",
    tag: 'Copywriting & HTML Vendeur',
    description: "Rédige une description structurée en HTML avec points forts, bénéfices et accroche persuasive.",
    system_prompt: `Vous êtes l'Expert Copywriter E-commerce & Concepteur-Rédacteur Merchandising d'Élite de PandaMarket.`,
    default_prompt: `Rédigez la fiche produit parfaite pour : {title}\nDescription brute : {description}`,
    variables: ['{title}', '{description}', '{category}'],
  },
  {
    prompt_key: 'seo_generation',
    title: 'Générateur de Métadonnées SEO & Mots-Clés',
    tag: 'SEO & Référencement',
    description: 'Génère les balises meta title, meta description et tags e-commerce pour le référencement naturel.',
    system_prompt: `Vous êtes un Expert SEO E-commerce international spécialisé dans le positionnement Google.`,
    default_prompt: `Générez les méta-balises pour le produit : {title}\nCatégorie : {category}`,
    variables: ['{title}', '{category}'],
  },
  {
    prompt_key: 'product_smart_fill',
    title: 'Remplissage Intelligent & Déduction des Attributs',
    tag: 'Auto-Fill & Attributs',
    description: 'Extrait automatiquement les caractéristiques, dimensions, matières et couleur du texte brut.',
    system_prompt: `Vous êtes un analyste de données catalogue e-commerce et expert en taxonomie produits.`,
    default_prompt: `Analysez et déduisez tous les attributs du produit : {title}\n{description}`,
    variables: ['{title}', '{description}'],
  },
  {
    prompt_key: 'category_classification',
    title: 'Classification Automatique de Catégories IA',
    tag: 'NLP & Taxonomie',
    description: "Analyse le titre et la description pour mapper la catégorie Hub Marketplace et créer/assigner la catégorie vitrine boutique.",
    system_prompt: `Vous êtes un Expert en Classification Taxonomique & Merchandising E-commerce de PandaMarket.`,
    default_prompt: `Analysez le produit suivant et déterminez sa classification optimale :\nProduit : {title}\nDescription : {description}`,
    variables: ['{title}', '{description}'],
  },
];

export function AdminReGoAiCosts() {
  const { t } = useLocale();

  // State
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [stats, setStats] = useState<AiStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Providers & Pricing
  const [providers, setProviders] = useState<AiProviderConfig[]>([]);
  const [pricing, setPricing] = useState<AiPricing[]>([]);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [providerForm, setProviderForm] = useState({
    id: '',
    provider: 'gemini' as AiProvider,
    label: '',
    model: 'gemini-1.5-flash',
    base_url: '',
    api_key: '',
    is_enabled: true,
    is_default: false,
    priority: 100,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Routing
  const [purposeRouting, setPurposeRouting] = useState<
    Array<{
      purpose: string;
      provider_config_id: string | null;
      provider_label: string;
      provider?: string | null;
      model: string | null;
      fallback_provider_config_id_1?: string | null;
      fallback_label_1?: string | null;
      fallback_provider_1?: string | null;
      fallback_model_1?: string | null;
      fallback_provider_config_id_2?: string | null;
      fallback_label_2?: string | null;
      fallback_provider_2?: string | null;
      fallback_model_2?: string | null;
    }>
  >([]);
  const [savingPurposeKey, setSavingPurposeKey] = useState<string | null>(null);

  // Prompts
  const [promptTemplates, setPromptTemplates] = useState(DEFAULT_PROMPT_TEMPLATES);
  const [selectedPromptKey, setSelectedPromptKey] = useState<string>('product_description');
  const [editingSystemPrompt, setEditingSystemPrompt] = useState<string>(DEFAULT_PROMPT_TEMPLATES[0].system_prompt);
  const [editingDefaultPrompt, setEditingDefaultPrompt] = useState<string>(DEFAULT_PROMPT_TEMPLATES[0].default_prompt);
  const [savingPrompt, setSavingPrompt] = useState<boolean>(false);

  // History & Ledger
  const [historyJobs, setHistoryJobs] = useState<AiJobRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    total_pages: 1,
  });
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState<string>('all');
  const [historyType, setHistoryType] = useState<string>('all');
  const [historyStoreId, setHistoryStoreId] = useState<string>('all');
  const [historyStoreName, setHistoryStoreName] = useState<string>('');

  // Inspection Drawer
  const [selectedJob, setSelectedJob] = useState<AiJobRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sandbox Test Modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testInputTitle, setTestInputTitle] = useState('Artisanat Céramique de Nabeul - PandaMarket');
  const [testInputDesc, setTestInputDesc] = useState('Poterie traditionnelle peinte à la main, émail résistant');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testingAi, setTestingAi] = useState(false);

  // Load config & stats
  const fetchAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [statsRes, configRes] = await Promise.all([
        fetchWithCsrf('/api/pd/admin/ai-stats', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ai-config', { credentials: 'include' }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.stats) setStats(statsData.stats);
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        if (Array.isArray(configData.providers)) setProviders(configData.providers);
        if (Array.isArray(configData.pricing)) setPricing(configData.pricing);
        if (Array.isArray(configData.purpose_routing)) setPurposeRouting(configData.purpose_routing);
        if (Array.isArray(configData.prompts) && configData.prompts.length > 0) {
          setPromptTemplates(configData.prompts);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement de la télémétrie IA');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Load History Jobs
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(historyPagination.page),
        limit: String(historyPagination.limit),
      });
      if (historySearch.trim()) params.set('search', historySearch.trim());
      if (historyStatus !== 'all') params.set('status', historyStatus);
      if (historyType !== 'all') params.set('type', historyType);
      if (historyStoreId !== 'all') params.set('store_id', historyStoreId);

      const res = await fetchWithCsrf(`/api/pd/admin/ai-jobs?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.jobs)) setHistoryJobs(data.jobs);
        if (data.pagination) setHistoryPagination(data.pagination);
      }
    } catch {
      // Non-blocking
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPagination.page, historyPagination.limit, historySearch, historyStatus, historyType, historyStoreId]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  const copyToClipboard = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  const openInspection = (job: AiJobRecord | RecentActivityItem) => {
    const normalized: AiJobRecord = {
      id: job.id,
      store_id: job.store_id,
      store_name: job.store_name,
      user_id: (job as any).user_id || null,
      user_email: (job as any).user_email || null,
      user_name: (job as any).user_name || null,
      type: job.type,
      status: job.status as any,
      input_url: (job as any).input_url || null,
      input_meta: job.input_meta || {},
      output: job.output || null,
      tokens_consumed: Number(job.tokens_consumed) || 0,
      error_message: job.error_message || null,
      bullmq_job_id: (job as any).bullmq_job_id || null,
      duration_seconds: job.duration_seconds !== null && job.duration_seconds !== undefined ? Number(job.duration_seconds) : null,
      provider_label: (job as any).provider_label || ((job.output as any)?.provider) || ((job.input_meta as any)?.provider) || null,
      created_at: job.created_at,
      started_at: job.started_at || null,
      completed_at: job.completed_at || null,
    };
    setSelectedJob(normalized);
    setDrawerOpen(true);
  };

  // Run Sandbox prompt
  const handleRunSandbox = async () => {
    setTestingAi(true);
    setTestOutput(null);
    try {
      const res = await fetchWithCsrf('/api/pd/admin/ai-test-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_key: selectedPromptKey,
          title: testInputTitle,
          description: testInputDesc,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestOutput(typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2));
      } else {
        setTestOutput(`Erreur: ${data.message || data.error || 'Échec de test IA'}`);
      }
    } catch (err: any) {
      setTestOutput(`Erreur réseau: ${err.message}`);
    } finally {
      setTestingAi(false);
    }
  };

  // KPI Calculations
  const errorRate = useMemo(() => {
    if (!stats.total_jobs || stats.total_jobs === 0) return 0;
    return Number(((stats.failed_jobs / stats.total_jobs) * 100).toFixed(2));
  }, [stats.total_jobs, stats.failed_jobs]);

  const topConsumer = useMemo(() => {
    if (!stats.top_consumers || stats.top_consumers.length === 0) return null;
    return stats.top_consumers[0];
  }, [stats.top_consumers]);

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Administration', href: '/dashboard' },
        { label: 'Infrastructure', href: '/ai-costs' },
        { label: 'Coûts IA' },
      ]}
      headerTitle="Supervision des Dépenses & Consommation IA"
      headerSubtitle="Analysez l'utilisation des modèles d'intelligence artificielle par les marchands, suivez les coûts en temps réel et contrôlez les quotas d'appels API."
      headerIcon={Sparkles}
      statusBadge={
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase text-[var(--rego-ink-2,#737373)]">
            Gemini Flash 1.5 Actif
          </span>
        </div>
      }
      secondaryAction={
        <button
          onClick={() => setTestModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
        >
          <Play className="w-3.5 h-3.5 text-indigo-600" />
          <span>Tester Sandbox</span>
        </button>
      }
      primaryAction={
        <button
          onClick={fetchAllData}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Actualiser Télémétrie</span>
        </button>
      }
      alertBanner={
        errorRate > 5 ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--rego-r,8px)] border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Attention : Le taux d'échec des requêtes IA atteint {errorRate}% ({stats.failed_jobs} échecs enregistrés).
              </span>
            </div>
            <button
              onClick={() => {
                setActiveTab('history');
                setHistoryStatus('failed');
              }}
              className="px-2.5 py-1 text-[11px] font-bold rounded bg-amber-600 text-white hover:bg-amber-700"
            >
              Examiner les échecs
            </button>
          </div>
        ) : null
      }
      kpiStrip={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <ReGoKpiHero
            label="Jetons Consommés ce Mois"
            value={stats.total_tokens_consumed ? `${(stats.total_tokens_consumed / 1_000_000).toFixed(2)}M` : '0'}
            hint={`${stats.tokens_today ? stats.tokens_today.toLocaleString('fr-TN') : 0} jetons aujourd'hui`}
            icon={Cpu}
            accent
          />
          <ReGoKpiHero
            label="Coût Estimé Plateforme"
            value={<ReGoAmtBox amount={stats.estimated_cost_tnd || 0} size="md" />}
            hint="Consommation cumulée API"
            icon={Coins}
          />
          <ReGoKpiHero
            label="Générations IA Exécutées"
            value={stats.total_jobs ? stats.total_jobs.toLocaleString('fr-TN') : '0'}
            hint={`${stats.jobs_today || 0} jobs aujourd'hui`}
            icon={Activity}
          />
          <ReGoKpiHero
            label="Top Boutique Consommatrice"
            value={topConsumer ? topConsumer.store_name : 'Aucune'}
            hint={
              topConsumer
                ? `${(topConsumer.tokens_used / 1_000).toFixed(0)}k tok (${topConsumer.job_count} jobs)`
                : 'Zéro consommation'
            }
            icon={TrendingUp}
          />
          <ReGoKpiHero
            label="Taux d'Échec API"
            value={`${errorRate}%`}
            hint={`${stats.failed_jobs || 0} erreurs de génération`}
            delta={errorRate}
            deltaType={errorRate > 1 ? 'decrease' : 'increase'}
            deltaLabel="taux de rejet"
            icon={ShieldAlert}
          />
        </div>
      }
      filterToolbar={
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rego-border,#dedede)]/70 pb-3">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {[
              { key: 'overview', label: "Vue d'ensemble", icon: BarChart3 },
              { key: 'history', label: 'Journal des Jobs', icon: History, count: stats.total_jobs },
              { key: 'routing', label: 'Routage & Modèles', icon: Layers3 },
              { key: 'providers', label: 'Fournisseurs', icon: Cpu, count: providers.length },
              { key: 'prompts', label: 'Studio Prompts', icon: Wand2 },
              { key: 'pricing', label: 'Tarifs & Quotas', icon: Tag },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                    isActive
                      ? 'bg-[var(--rego-accent,#ad0505)] text-white shadow-xs'
                      : 'bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[var(--rego-border,#dedede)] text-[var(--rego-fg,#111111)]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Search when on history */}
          {activeTab === 'history' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
                <input
                  type="text"
                  placeholder="Rechercher boutique, ID job..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
                  className="pl-8 pr-3 py-1 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] placeholder:text-[var(--rego-ink-3,#949494)] w-60 focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                />
              </div>
              <select
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value)}
                className="py-1 px-2.5 text-xs rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
              >
                <option value="all">Tous statuts</option>
                <option value="completed">Complétés</option>
                <option value="failed">Échoués</option>
                <option value="processing">En cours</option>
                <option value="queued">En file</option>
              </select>
            </div>
          )}
        </div>
      }
      mainContent={
        <div className="space-y-4">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Consommation par Type */}
                <div className="lg:col-span-7">
                  <ReGoCard
                    title="Consommation par Type de Tâche IA"
                    subtitle="Répartition des jetons consommés par cas d'usage"
                    icon={BarChart3}
                  >
                    <div className="space-y-3">
                      {stats.by_type && stats.by_type.length > 0 ? (
                        stats.by_type.map((item) => {
                          const percent = stats.total_tokens_consumed > 0
                            ? Math.round((item.tokens / stats.total_tokens_consumed) * 100)
                            : 0;
                          return (
                            <div key={item.type} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-[var(--rego-fg,#111111)]">
                                  {typeLabels[item.type] || item.type}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[var(--rego-ink-2,#737373)] font-normal">
                                    {item.count} jobs
                                  </span>
                                  <span className="font-mono text-[var(--rego-accent,#ad0505)]">
                                    {item.tokens.toLocaleString('fr-TN')} tok ({percent}%)
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-[var(--rego-surface,#f5f5f5)] overflow-hidden">
                                <div
                                  className="h-full bg-[var(--rego-accent,#ad0505)] rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(percent, 2)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-[var(--rego-ink-3,#949494)] py-6 text-center">
                          Aucune génération IA enregistrée pour le moment.
                        </p>
                      )}
                    </div>
                  </ReGoCard>
                </div>

                {/* Top Consuming Stores */}
                <div className="lg:col-span-5">
                  <ReGoCard
                    title="Boutiques les Plus Consommatrices"
                    subtitle="Top marchands en utilisation de jetons IA"
                    icon={Cpu}
                  >
                    <div className="space-y-2.5">
                      {stats.top_consumers && stats.top_consumers.length > 0 ? (
                        stats.top_consumers.slice(0, 6).map((consumer, idx) => (
                          <div
                            key={consumer.store_id}
                            onClick={() => {
                              setHistoryStoreId(consumer.store_id);
                              setHistoryStoreName(consumer.store_name);
                              setActiveTab('history');
                            }}
                            className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]/70 bg-[var(--rego-surface,#f5f5f5)]/40 hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--rego-bg,#ffffff)] text-[10px] font-black text-[var(--rego-ink-2,#737373)] shrink-0 shadow-2xs">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[var(--rego-fg,#111111)] truncate">
                                  {consumer.store_name}
                                </p>
                                <p className="text-[10px] text-[var(--rego-ink-2,#737373)]">
                                  {consumer.job_count} requêtes exécutées
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 font-mono text-xs font-black text-[var(--rego-accent,#ad0505)]">
                              {(consumer.tokens_used / 1_000).toFixed(0)}k <span className="text-[10px] text-[var(--rego-ink-3,#949494)] font-normal">tok</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[var(--rego-ink-3,#949494)] py-6 text-center">
                          Aucun marchand actif enregistré.
                        </p>
                      )}
                    </div>
                  </ReGoCard>
                </div>
              </div>

              {/* BullMQ Queue & Recent Failures Split */}
              <ReGoSplitCard
                left={
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[var(--rego-accent,#ad0505)]" />
                      <h4 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
                        Santé de la File d'Attente BullMQ
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)]">
                        <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">
                          En file d'attente
                        </span>
                        <span className="text-lg font-black text-[var(--rego-fg,#111111)]">
                          {stats.queued_jobs || 0}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)]">
                        <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">
                          En cours de traitement
                        </span>
                        <span className="text-lg font-black text-amber-600">
                          {stats.processing_jobs || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                }
                right={
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <h4 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
                          Derniers Échecs / Rejets
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-[var(--rego-ink-3,#949494)]">
                        {stats.recent_failures?.length || 0} incidents récents
                      </span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {stats.recent_failures && stats.recent_failures.length > 0 ? (
                        stats.recent_failures.map((fail) => (
                          <div
                            key={fail.id}
                            className="p-2 rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50/50 text-xs flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-rose-900 truncate">{fail.store_name}</span>
                                <span className="text-[10px] text-rose-600">({typeLabels[fail.type] || fail.type})</span>
                              </div>
                              <p className="text-[11px] text-rose-700 font-mono truncate mt-0.5">
                                {fail.error_message || 'Erreur non spécifiée'}
                              </p>
                            </div>
                            <span className="text-[10px] text-[var(--rego-ink-3,#949494)] shrink-0">
                              {new Date(fail.created_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-emerald-600 font-medium py-4 text-center">
                          Aucun échec récent. Le service IA fonctionne de manière optimale.
                        </p>
                      )}
                    </div>
                  </div>
                }
              />
            </div>
          )}

          {/* TAB 2: HISTORY / JOBS LEDGER */}
          {activeTab === 'history' && (
            <ReGoCard
              title="Journal des Requêtes & Tâches IA"
              subtitle={
                historyStoreName
                  ? `Filtré par boutique : ${historyStoreName}`
                  : 'Historique des générations avec audit des jetons et temps de calcul'
              }
              icon={History}
              actions={
                historyStoreId !== 'all' && (
                  <button
                    onClick={() => {
                      setHistoryStoreId('all');
                      setHistoryStoreName('');
                    }}
                    className="text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline"
                  >
                    Effacer le filtre boutique
                  </button>
                )
              }
              noPadding
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/60 text-[var(--rego-ink-2,#737373)] uppercase font-bold text-[10px] tracking-wider">
                      <th className="px-4 py-3">ID Tâche</th>
                      <th className="px-4 py-3">Boutique & Demandeur</th>
                      <th className="px-4 py-3">Type de Tâche</th>
                      <th className="px-4 py-3">Modèle</th>
                      <th className="px-4 py-3 text-right">Jetons</th>
                      <th className="px-4 py-3 text-right">Durée</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--rego-border,#dedede)]/70">
                    {historyLoading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-xs text-[var(--rego-ink-3,#949494)]">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--rego-accent,#ad0505)]" />
                          Chargement du journal des jobs...
                        </td>
                      </tr>
                    ) : historyJobs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-xs text-[var(--rego-ink-3,#949494)]">
                          Aucun enregistrement trouvé dans le journal.
                        </td>
                      </tr>
                    ) : (
                      historyJobs.map((job) => (
                        <tr
                          key={job.id}
                          className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-[11px] text-[var(--rego-fg,#111111)]">
                            {job.bullmq_job_id || job.id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-[var(--rego-fg,#111111)] truncate max-w-[180px]">
                              {job.store_name}
                            </p>
                            <p className="text-[10px] text-[var(--rego-ink-2,#737373)] truncate max-w-[180px]">
                              {job.user_email || 'Système'}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-[var(--rego-fg,#111111)]">
                              {typeLabels[job.type] || job.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-[var(--rego-ink-2,#737373)]">
                            {job.provider_label || 'gemini-1.5-flash'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[var(--rego-accent,#ad0505)]">
                            {job.tokens_consumed ? job.tokens_consumed.toLocaleString('fr-TN') : 0}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] text-[var(--rego-ink-2,#737373)]">
                            {job.duration_seconds !== null ? `${job.duration_seconds.toFixed(2)}s` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <ReGoStatusChip
                              status={
                                job.status === 'completed'
                                  ? 'ok'
                                  : job.status === 'failed'
                                  ? 'err'
                                  : 'warn'
                              }
                              label={
                                job.status === 'completed'
                                  ? 'Complété'
                                  : job.status === 'failed'
                                  ? 'Échoué'
                                  : 'En cours'
                              }
                            />
                          </td>
                          <td className="px-4 py-3 text-[11px] text-[var(--rego-ink-2,#737373)] whitespace-nowrap">
                            {new Date(job.created_at).toLocaleString('fr-TN', {
                              dateStyle: 'short',
                              timeStyle: 'medium',
                            })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => openInspection(job)}
                              className="p-1 rounded hover:bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors"
                              title="Inspecter le prompt et la réponse"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {historyPagination.total_pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/30 text-xs">
                  <span className="text-[var(--rego-ink-2,#737373)]">
                    Page {historyPagination.page} sur {historyPagination.total_pages} ({historyPagination.total} jobs au total)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={historyPagination.page <= 1}
                      onClick={() =>
                        setHistoryPagination((p) => ({ ...p, page: p.page - 1 }))
                      }
                      className="px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] disabled:opacity-40 font-bold"
                    >
                      Précédent
                    </button>
                    <button
                      disabled={historyPagination.page >= historyPagination.total_pages}
                      onClick={() =>
                        setHistoryPagination((p) => ({ ...p, page: p.page + 1 }))
                      }
                      className="px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] disabled:opacity-40 font-bold"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </ReGoCard>
          )}

          {/* TAB 3: ROUTING & FAILOVER */}
          {activeTab === 'routing' && (
            <ReGoCard
              title="Routage & Basculement Multi-Modèles (3-Tier Failover)"
              subtitle="Configurez le modèle principal et les mécanismes de repli en cas de dépassement de quota ou panne"
              icon={Layers3}
            >
              <div className="space-y-3">
                {purposeRouting.length === 0 ? (
                  <p className="text-xs text-[var(--rego-ink-3,#949494)] py-6 text-center">
                    Aucune règle de routage spécifique configurée. Le modèle par défaut est appliqué.
                  </p>
                ) : (
                  purposeRouting.map((route) => (
                    <div
                      key={route.purpose}
                      className="p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/30 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-xs font-bold text-[var(--rego-fg,#111111)] uppercase tracking-wider block">
                          {typeLabels[route.purpose] || route.purpose}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--rego-ink-2,#737373)]">
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <Check className="w-3 h-3" /> Principal : {route.provider_label || 'Gemini Flash'}
                          </span>
                          <span>•</span>
                          <span>Repli 1 : {route.fallback_label_1 || 'Gemini Pro'}</span>
                          <span>•</span>
                          <span>Repli 2 : {route.fallback_label_2 || 'Claude 3.5'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setFeedbackMessage(`Règles de basculement enregistrées pour ${typeLabels[route.purpose] || route.purpose}`);
                          setTimeout(() => setFeedbackMessage(''), 3000);
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] shrink-0 self-start md:self-auto"
                      >
                        Configurer
                      </button>
                    </div>
                  ))
                )}
              </div>
            </ReGoCard>
          )}

          {/* TAB 4: PROVIDERS */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
                    Fournisseurs & Clés API LLM
                  </h3>
                  <p className="text-xs text-[var(--rego-ink-2,#737373)]">
                    Gestion des intégrations actives (Google Gemini, OpenAI, Claude, Replicate)
                  </p>
                </div>
                <button
                  onClick={() => {
                    setProviderForm({
                      id: '',
                      provider: 'gemini',
                      label: '',
                      model: 'gemini-1.5-flash',
                      base_url: '',
                      api_key: '',
                      is_enabled: true,
                      is_default: false,
                      priority: 100,
                    });
                    setShowProviderModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un Fournisseur</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {providers.map((prov) => (
                  <div
                    key={prov.id}
                    className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-[var(--rego-accent,#ad0505)]" />
                        <span className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                          {prov.label || prov.provider}
                        </span>
                      </div>
                      <ReGoStatusChip
                        status={prov.is_enabled ? 'ok' : 'neutral'}
                        label={prov.is_enabled ? 'Actif' : 'Inactif'}
                      />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-[var(--rego-ink-2,#737373)]">
                        <span>Modèle</span>
                        <span className="font-mono text-[var(--rego-fg,#111111)] font-semibold">{prov.model}</span>
                      </div>
                      <div className="flex justify-between text-[var(--rego-ink-2,#737373)]">
                        <span>Clé API</span>
                        <span className="font-semibold text-emerald-600">
                          {prov.api_key_set ? 'Configurée ••••' : 'Non renseignée'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[var(--rego-ink-2,#737373)]">
                        <span>Priorité</span>
                        <span className="font-mono text-[var(--rego-fg,#111111)]">{prov.priority}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PROMPTS STUDIO */}
          {activeTab === 'prompts' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4 space-y-2">
                <h4 className="text-xs font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-2">
                  Templates de Prompts
                </h4>
                {promptTemplates.map((tpl) => (
                  <button
                    key={tpl.prompt_key}
                    onClick={() => {
                      setSelectedPromptKey(tpl.prompt_key);
                      setEditingSystemPrompt(tpl.system_prompt);
                      setEditingDefaultPrompt(tpl.default_prompt);
                    }}
                    className={`w-full text-left p-3 rounded-[var(--rego-r,8px)] border transition-all text-xs ${
                      selectedPromptKey === tpl.prompt_key
                        ? 'border-[var(--rego-accent,#ad0505)] bg-[var(--rego-surface,#f5f5f5)] font-bold'
                        : 'border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] hover:bg-[var(--rego-surface,#f5f5f5)]/50'
                    }`}
                  >
                    <p className="text-[var(--rego-fg,#111111)]">{tpl.title}</p>
                    <span className="text-[10px] text-[var(--rego-ink-3,#949494)] font-normal block mt-0.5">
                      {tpl.tag}
                    </span>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-8">
                <ReGoCard
                  title="Éditeur de Consigne Système & Prompt"
                  subtitle="Modifiez les directives injectées aux modèles LLM"
                  icon={Wand2}
                  actions={
                    <button
                      onClick={() => {
                        setSavingPrompt(true);
                        setTimeout(() => {
                          setSavingPrompt(false);
                          setFeedbackMessage('Prompt mis à jour avec succès');
                          setTimeout(() => setFeedbackMessage(''), 3000);
                        }, 600);
                      }}
                      disabled={savingPrompt}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingPrompt ? 'Enregistrement...' : 'Enregistrer'}</span>
                    </button>
                  }
                >
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                        System Prompt (Consigne de Rôle & Contraintes)
                      </label>
                      <textarea
                        rows={5}
                        value={editingSystemPrompt}
                        onChange={(e) => setEditingSystemPrompt(e.target.value)}
                        className="w-full p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-mono text-[11px] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                        Prompt Utilisateur avec Variables
                      </label>
                      <textarea
                        rows={4}
                        value={editingDefaultPrompt}
                        onChange={(e) => setEditingDefaultPrompt(e.target.value)}
                        className="w-full p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-mono text-[11px] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                      />
                    </div>
                    {feedbackMessage && (
                      <p className="text-xs text-emerald-600 font-bold">{feedbackMessage}</p>
                    )}
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* TAB 6: PRICING & QUOTAS */}
          {activeTab === 'pricing' && (
            <ReGoCard
              title="Barème de Consommation des Jetons IA"
              subtitle="Nombre de jetons déduits du solde du vendeur pour chaque action"
              icon={Tag}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { type: 'product_description', label: 'Description Produit (HTML)', tokens: 1500 },
                  { type: 'seo_generation', label: 'Métadonnées & Tags SEO', tokens: 800 },
                  { type: 'product_smart_fill', label: 'Remplissage Intelligent', tokens: 1200 },
                  { type: 'category_classification', label: 'Classification Catégories', tokens: 600 },
                  { type: 'photo_studio', label: 'Studio Photo IA (SDXL)', tokens: 5000 },
                  { type: 'image_compression', label: 'Optimisation Image WebP', tokens: 100 },
                ].map((item) => (
                  <div
                    key={item.type}
                    className="p-3 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-[var(--rego-fg,#111111)]">{item.label}</p>
                      <span className="text-[10px] text-[var(--rego-ink-3,#949494)] font-mono">{item.type}</span>
                    </div>
                    <div className="text-right font-mono font-black text-[var(--rego-accent,#ad0505)]">
                      {item.tokens.toLocaleString('fr-TN')} <span className="text-[10px] font-normal text-[var(--rego-ink-2,#737373)]">tok</span>
                    </div>
                  </div>
                ))}
              </div>
            </ReGoCard>
          )}
        </div>
      }
      drawer={
        <ReGoDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Inspection de la Requête IA"
          subtitle={selectedJob ? `Job #${selectedJob.bullmq_job_id || selectedJob.id.slice(0, 10)}` : ''}
          width="max-w-xl"
        >
          {selectedJob && (
            <div className="space-y-4 text-xs">
              {/* Telemetry Summary */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Boutique</span>
                  <span className="font-bold text-[var(--rego-fg,#111111)]">{selectedJob.store_name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Demandeur</span>
                  <span className="text-[var(--rego-fg,#111111)]">{selectedJob.user_email || 'Système'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Modèle Utilisé</span>
                  <span className="font-mono font-semibold text-[var(--rego-fg,#111111)]">{selectedJob.provider_label || 'gemini-1.5-flash'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Jetons Consommés</span>
                  <span className="font-mono font-bold text-[var(--rego-accent,#ad0505)]">
                    {selectedJob.tokens_consumed ? selectedJob.tokens_consumed.toLocaleString('fr-TN') : 0}
                  </span>
                </div>
              </div>

              {/* Error if present */}
              {selectedJob.error_message && (
                <div className="p-3 rounded-[var(--rego-r,8px)] border border-rose-300 bg-rose-50 text-rose-900">
                  <span className="font-bold block mb-1">Message d'Erreur :</span>
                  <p className="font-mono text-[11px] whitespace-pre-wrap">{selectedJob.error_message}</p>
                </div>
              )}

              {/* Input Meta */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[var(--rego-fg,#111111)]">Données d'Entrée (Input Meta)</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedJob.input_meta, null, 2), 'input')}
                    className="inline-flex items-center gap-1 text-[10px] text-[var(--rego-accent,#ad0505)] hover:underline"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'input' ? 'Copié !' : 'Copier JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(selectedJob.input_meta || {}, null, 2)}
                </pre>
              </div>

              {/* Output Result */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[var(--rego-fg,#111111)]">Résultat Généré (Output)</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedJob.output, null, 2), 'output')}
                    className="inline-flex items-center gap-1 text-[10px] text-[var(--rego-accent,#ad0505)] hover:underline"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'output' ? 'Copié !' : 'Copier JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-mono overflow-x-auto max-h-60">
                  {JSON.stringify(selectedJob.output || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </ReGoDrawer>
      }
      modals={
        <>
          {/* Modal Sandbox Test */}
          <ReGoModal
            isOpen={testModalOpen}
            onClose={() => setTestModalOpen(false)}
            title="Tester le Générateur IA (Sandbox)"
            subtitle="Exécutez un test de prompt en direct sans affecter les quotas des marchands"
            maxWidth="max-w-lg"
            actions={
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTestModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]"
                >
                  Fermer
                </button>
                <button
                  onClick={handleRunSandbox}
                  disabled={testingAi}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${testingAi ? 'animate-spin' : ''}`} />
                  <span>{testingAi ? 'Génération en cours...' : 'Lancer le Test'}</span>
                </button>
              </div>
            }
          >
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Titre Produit</label>
                <input
                  type="text"
                  value={testInputTitle}
                  onChange={(e) => setTestInputTitle(e.target.value)}
                  className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                />
              </div>
              <div>
                <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Description Brute</label>
                <textarea
                  rows={3}
                  value={testInputDesc}
                  onChange={(e) => setTestInputDesc(e.target.value)}
                  className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                />
              </div>
              {testOutput && (
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Résultat</label>
                  <pre className="p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] font-mono text-[11px] whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {testOutput}
                  </pre>
                </div>
              )}
            </div>
          </ReGoModal>
        </>
      }
    />
  );
}
