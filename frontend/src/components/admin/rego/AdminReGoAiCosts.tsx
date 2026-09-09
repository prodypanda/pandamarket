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
  Edit3,
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
  job_type: string;
  tokens_required: number;
  updated_at?: string;
}

export interface PurposeRouteItem {
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
}

export interface PromptTemplateItem {
  prompt_key: string;
  title: string;
  tag: string;
  description: string;
  system_prompt: string;
  default_prompt: string;
  variables: string[];
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
  photo_studio_background: 'Détourage & Fond Studio',
  text_summarization: 'Résumé & Analyse',
  content_generation: 'Génération de Contenu',
  image_generation: "Génération d'Images",
  image_upscaling: 'Upscaling 4K',
  image_enhancement: 'Sublimation Photo',
  image_background_removal: 'Détourage Intelligent',
};

const PURPOSE_MODULES = [
  {
    key: 'product_description',
    icon: Sparkles,
    label: "Sublimer avec l'IA (Description Produit)",
    badge: 'Copywriting & HTML Vendeur',
    desc: 'Génération automatique de descriptions structurées en HTML (<h3>, <ul>, points forts, réassurance).',
  },
  {
    key: 'seo_generation',
    icon: Search,
    label: 'Métadonnées SEO & Mots-Clés',
    badge: 'SEO & Référencement',
    desc: 'Génération des balises meta title, meta description et tags optimisés pour Google.',
  },
  {
    key: 'product_smart_fill',
    icon: Wand2,
    label: 'Assistant Création Express — Smart Fill',
    badge: 'Génération Multi-Champs 360°',
    desc: 'Infère l’ensemble des champs d’une fiche produit à partir d’une photo ou de mots-clés.',
  },
  {
    key: 'category_classification',
    icon: FolderTree,
    label: 'Classification Automatique de Catégories',
    badge: 'NLP & Taxonomie Multi-Niveaux',
    desc: 'Mappe la catégorie Hub Marketplace et crée ou assigne la catégorie vitrine boutique.',
  },
  {
    key: 'product_tagging',
    icon: Tag,
    label: 'Auto-Tagging Sémantique Catalogue',
    badge: 'Gemini NLP / Tags Intérêts',
    desc: 'Extraction sémantique automatique de 4 à 8 tags d’intérêt pour chaque produit publié.',
  },
  {
    key: 'page_copy',
    icon: FileText,
    label: 'Générateur de Rédaction de Page Landing',
    badge: 'Copywriting & Titres',
    desc: 'Rédige des accroches percutantes et des textes promotionnels pour les boutiques.',
  },
  {
    key: 'image_compression',
    icon: Layers,
    label: 'Compression & Optimisation WebP',
    badge: 'Performance & Bande Passante',
    desc: 'Conversion WebP haute performance réduisant les temps de chargement storefront.',
  },
  {
    key: 'photo_studio',
    icon: ImageIcon,
    label: 'Studio Photo IA & Mise en Scène',
    badge: 'Imagerie Haute Résolution',
    desc: 'Mise en scène produit dans un décor de studio professionnel avec éclairage maîtrisé.',
  },
];

const DEFAULT_PROMPT_TEMPLATES: PromptTemplateItem[] = [
  {
    prompt_key: 'product_description',
    title: "Sublimer avec l'IA — Description Produit & Points Forts",
    tag: 'Copywriting & HTML Vendeur',
    description: "Rédige une description structurée en HTML avec points forts, bénéfices et accroche persuasive.",
    system_prompt: `Vous êtes l'Expert Copywriter E-commerce & Concepteur-Rédacteur Merchandising d'Élite de PandaMarket.
Votre mission est de concevoir des fiches produits captivantes, vendeuses et hautement structurées, respectant les standards des plus grandes boutiques en ligne.
Répondez exclusivement par un objet JSON valide avec les clés : suggested_title, summary, description_html.`,
    default_prompt: `Rédigez la fiche produit parfaite pour : {title}\nDescription brute : {description}\nCatégorie : {category}`,
    variables: ['{title}', '{description}', '{category}', '{language}'],
  },
  {
    prompt_key: 'seo_generation',
    title: 'Générateur de Métadonnées SEO & Mots-Clés',
    tag: 'SEO & Référencement',
    description: 'Génère les balises meta title, meta description et tags e-commerce pour le référencement naturel.',
    system_prompt: `Vous êtes un Expert SEO E-commerce international spécialisé dans le positionnement Google.
Répondez exclusivement par un objet JSON valide avec les clés : meta_title, meta_description, keywords.`,
    default_prompt: `Générez les méta-balises pour le produit : {title}\nCatégorie : {category}\nDescription : {description}`,
    variables: ['{title}', '{category}', '{description}'],
  },
  {
    prompt_key: 'product_smart_fill',
    title: 'Remplissage Intelligent & Déduction des Attributs',
    tag: 'Auto-Fill & Attributs',
    description: 'Extrait automatiquement les caractéristiques, dimensions, matières et couleur du texte brut.',
    system_prompt: `Vous êtes un analyste de données catalogue e-commerce et expert en taxonomie produits.
Répondez exclusivement par un objet JSON valide avec les clés : optimized_title, summary, attributes, tags.`,
    default_prompt: `Analysez et déduisez tous les attributs du produit : {title}\n{description}`,
    variables: ['{title}', '{description}', '{category}', '{raw_input}'],
  },
  {
    prompt_key: 'category_classification',
    title: 'Classification Automatique de Catégories IA',
    tag: 'NLP & Taxonomie',
    description: "Analyse le titre et la description pour mapper la catégorie Hub Marketplace et créer/assigner la catégorie vitrine boutique.",
    system_prompt: `Vous êtes un Expert en Classification Taxonomique & Merchandising E-commerce de PandaMarket.
Répondez exclusivement par un objet JSON valide avec les clés : marketplace_category_id, marketplace_category_name, storefront_category_name.`,
    default_prompt: `Analysez le produit suivant et déterminez sa classification optimale :\nProduit : {title}\nDescription : {description}`,
    variables: ['{title}', '{description}', '{category}'],
  },
  {
    prompt_key: 'page_copy',
    title: 'Générateur de Rédaction de Page Landing',
    tag: 'SEO & Copywriting',
    description: 'Rédige des accroches percutantes et des textes promotionnels pour les boutiques.',
    system_prompt: `Vous êtes un concepteur-rédacteur et stratège SEO pour marques D2C.
Répondez exclusivement par un objet JSON valide avec les clés : hero_title, cta, seo_title, seo_description.`,
    default_prompt: `Rédigez le contenu pour la page : {title}\nDescription : {description}`,
    variables: ['{title}', '{description}', '{language}'],
  },
];

const DEFAULT_PRICING: AiPricing[] = [
  { job_type: 'product_description', tokens_required: 2 },
  { job_type: 'seo_generation', tokens_required: 2 },
  { job_type: 'page_copy', tokens_required: 1 },
  { job_type: 'category_classification', tokens_required: 2 },
  { job_type: 'image_compression', tokens_required: 1 },
  { job_type: 'product_smart_fill', tokens_required: 3 },
  { job_type: 'product_tagging', tokens_required: 1 },
  { job_type: 'photo_studio', tokens_required: 5 },
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
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  // Providers & Pricing
  const [providers, setProviders] = useState<AiProviderConfig[]>([]);
  const [pricing, setPricing] = useState<AiPricing[]>(DEFAULT_PRICING);
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
  const [savingProvider, setSavingProvider] = useState(false);
  const [deletingProviderId, setDeletingProviderId] = useState<string | null>(null);
  const [savingPricing, setSavingPricing] = useState(false);

  // Routing
  const [purposeRouting, setPurposeRouting] = useState<PurposeRouteItem[]>([]);
  const [savingPurposeKey, setSavingPurposeKey] = useState<string | null>(null);

  // Prompts
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplateItem[]>(DEFAULT_PROMPT_TEMPLATES);
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
  const [historySummary, setHistorySummary] = useState({
    total: 0,
    completed_count: 0,
    failed_count: 0,
    active_count: 0,
    total_tokens: 0,
    avg_duration_seconds: 0,
  });
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState<string>('all');
  const [historyType, setHistoryType] = useState<string>('all');
  const [historyStoreId, setHistoryStoreId] = useState<string>('all');
  const [historyStoreName, setHistoryStoreName] = useState<string>('');

  // Inspection Drawer
  const [selectedJob, setSelectedJob] = useState<AiJobRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'input' | 'output' | 'trace'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sandbox Test Modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testPurpose, setTestPurpose] = useState('product_description');
  const [testInputTitle, setTestInputTitle] = useState('Artisanat Céramique de Nabeul - PandaMarket');
  const [testInputDesc, setTestInputDesc] = useState('Poterie traditionnelle peinte à la main, émail résistant');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testTelemetry, setTestTelemetry] = useState<{ provider?: string; duration?: number; tokens?: number } | null>(null);
  const [testingAi, setTestingAi] = useState(false);

  // Helper notification
  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage(msg);
    setFeedbackType(type);
    setTimeout(() => setFeedbackMessage(''), 4000);
  };

  // Load all configurations & telemetry
  const fetchAllData = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const [statsRes, configRes, routingRes, promptsRes] = await Promise.all([
        fetchWithCsrf('/api/pd/admin/ai-stats', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ai-config', { credentials: 'include' }),
        fetchWithCsrf('/api/pd/admin/ai/purpose-routing', { credentials: 'include' }).catch(() => null),
        fetchWithCsrf('/api/pd/admin/ai/prompts', { credentials: 'include' }).catch(() => null),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          ...DEFAULT_STATS,
          ...statsData,
          credits: { ...DEFAULT_STATS.credits, ...(statsData.credits || {}) },
          by_type: Array.isArray(statsData.by_type) ? statsData.by_type : [],
          by_status: Array.isArray(statsData.by_status) ? statsData.by_status : [],
          recent_failures: Array.isArray(statsData.recent_failures) ? statsData.recent_failures : [],
          recent_activity: Array.isArray(statsData.recent_activity) ? statsData.recent_activity : [],
          top_consumers: Array.isArray(statsData.top_consumers) ? statsData.top_consumers : [],
          daily_usage: Array.isArray(statsData.daily_usage) ? statsData.daily_usage : [],
        });
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        if (Array.isArray(configData.providers)) setProviders(configData.providers);
        if (Array.isArray(configData.pricing) && configData.pricing.length > 0) {
          setPricing(configData.pricing);
        }
      }

      if (routingRes && routingRes.ok) {
        const routeData = await routingRes.json();
        if (Array.isArray(routeData.routing)) {
          setPurposeRouting(routeData.routing);
        }
      }

      if (promptsRes && promptsRes.ok) {
        const promptData = await promptsRes.json();
        if (Array.isArray(promptData.templates) && promptData.templates.length > 0) {
          setPromptTemplates((prev) =>
            prev.map((tpl) => {
              const remote = promptData.templates.find((t: any) => t.prompt_key === tpl.prompt_key);
              return remote ? { ...tpl, system_prompt: remote.system_prompt, default_prompt: remote.default_prompt } : tpl;
            }),
          );
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
        const rawJobs = Array.isArray(data.data) ? data.data : Array.isArray(data.jobs) ? data.jobs : [];
        setHistoryJobs(rawJobs);
        if (data.pagination) setHistoryPagination(data.pagination);
        if (data.summary) setHistorySummary(data.summary);
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

  // Filter History for a specific store from Overview
  const openHistoryForStore = (storeId: string, storeName: string) => {
    setHistoryStoreId(storeId);
    setHistoryStoreName(storeName);
    setHistorySearch('');
    setHistoryStatus('all');
    setHistoryType('all');
    setActiveTab('history');
  };

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
    setDrawerTab('overview');
    setDrawerOpen(true);
  };

  // Provider Mutations
  const handleOpenNewProviderModal = () => {
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
  };

  const handleOpenEditProviderModal = (p: AiProviderConfig) => {
    setProviderForm({
      id: p.id,
      provider: p.provider,
      label: p.label,
      model: p.model,
      base_url: p.base_url || '',
      api_key: '',
      is_enabled: p.is_enabled,
      is_default: p.is_default,
      priority: p.priority,
    });
    setShowProviderModal(true);
  };

  const handleSaveProvider = async () => {
    if (!providerForm.label.trim() || !providerForm.model.trim()) {
      showFeedback('Le libellé et le modèle sont obligatoires.', 'error');
      return;
    }

    setSavingProvider(true);
    try {
      const payload: Record<string, unknown> = {
        provider: providerForm.provider,
        label: providerForm.label.trim(),
        model: providerForm.model.trim(),
        base_url: providerForm.base_url.trim() || null,
        is_enabled: providerForm.is_enabled,
        is_default: providerForm.is_default,
        priority: Number(providerForm.priority) || 100,
      };
      if (providerForm.api_key.trim()) {
        payload.api_key = providerForm.api_key.trim();
      }

      const isEditing = Boolean(providerForm.id);
      const url = isEditing ? `/api/pd/admin/ai-providers/${providerForm.id}` : '/api/pd/admin/ai-providers';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetchWithCsrf(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Erreur lors de l’enregistrement du fournisseur');

      await fetchAllData();
      setShowProviderModal(false);
      showFeedback(isEditing ? 'Fournisseur LLM mis à jour avec succès.' : 'Nouveau fournisseur LLM ajouté.');
    } catch (err: any) {
      showFeedback(err?.message || 'Erreur réseau', 'error');
    } finally {
      setSavingProvider(false);
    }
  };

  const handleDeleteProvider = async (id: string, label: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le fournisseur IA "${label}" ?`)) return;

    setDeletingProviderId(id);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/ai-providers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Suppression impossible');

      await fetchAllData();
      showFeedback(`Fournisseur "${label}" supprimé.`);
    } catch (err: any) {
      showFeedback(err?.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeletingProviderId(null);
    }
  };

  // Purpose Routing 3-Tier Multi-Model Mutation
  const handleUpdatePurposeRouting = async (
    purpose: string,
    primaryId: string | null,
    fallback1Id: string | null,
    fallback2Id: string | null,
  ) => {
    setSavingPurposeKey(purpose);
    try {
      const res = await fetchWithCsrf('/api/pd/admin/ai/purpose-routing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          purpose,
          provider_config_id: primaryId || null,
          fallback_provider_config_id_1: fallback1Id || null,
          fallback_provider_config_id_2: fallback2Id || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Erreur lors de la mise à jour du routage');

      if (Array.isArray(data.routing)) {
        setPurposeRouting(data.routing);
      }
      showFeedback(`Routage 3-niveaux enregistré pour "${typeLabels[purpose] || purpose}".`);
    } catch (err: any) {
      showFeedback(err?.message || 'Impossible d’enregistrer le routage', 'error');
    } finally {
      setSavingPurposeKey(null);
    }
  };

  // Prompts Studio Mutation
  const handleSelectPrompt = (key: string) => {
    setSelectedPromptKey(key);
    const target = promptTemplates.find((t) => t.prompt_key === key);
    if (target) {
      setEditingSystemPrompt(target.system_prompt || '');
      setEditingDefaultPrompt(target.default_prompt || '');
    }
  };

  const handleInsertVariable = (varName: string) => {
    setEditingDefaultPrompt((prev) => `${prev} ${varName}`);
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/ai/prompts/${selectedPromptKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          system_prompt: editingSystemPrompt,
          default_prompt: editingDefaultPrompt,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Erreur lors de l’enregistrement du prompt');

      if (data.template) {
        setPromptTemplates((prev) =>
          prev.map((t) => (t.prompt_key === selectedPromptKey ? { ...t, ...data.template } : t)),
        );
      }
      showFeedback('Directives du prompt enregistrées avec succès.');
    } catch (err: any) {
      showFeedback(err?.message || 'Impossible de sauvegarder le prompt', 'error');
    } finally {
      setSavingPrompt(false);
    }
  };

  // Pricing & Quotas Mutation
  const handlePricingChange = (jobType: string, tokens: number) => {
    setPricing((prev) => {
      const existing = prev.find((p) => p.job_type === jobType);
      if (existing) {
        return prev.map((p) => (p.job_type === jobType ? { ...p, tokens_required: Math.max(0, tokens) } : p));
      }
      return [...prev, { job_type: jobType, tokens_required: Math.max(0, tokens) }];
    });
  };

  const handleSavePricing = async () => {
    setSavingPricing(true);
    try {
      const payload = {
        prices: pricing.map((p) => ({
          job_type: p.job_type,
          tokens_required: Number(p.tokens_required) || 0,
        })),
      };

      const res = await fetchWithCsrf('/api/pd/admin/ai-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Erreur lors de l’enregistrement des prix');

      if (Array.isArray(data.pricing)) {
        setPricing(data.pricing);
      }
      showFeedback('Barème des jetons IA mis à jour avec succès.');
    } catch (err: any) {
      showFeedback(err?.message || 'Impossible de mettre à jour les prix', 'error');
    } finally {
      setSavingPricing(false);
    }
  };

  // Run Sandbox prompt test
  const handleRunSandbox = async () => {
    setTestingAi(true);
    setTestOutput(null);
    setTestTelemetry(null);
    try {
      const res = await fetchWithCsrf('/api/pd/admin/ai-test-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          purpose: testPurpose,
          title: testInputTitle,
          description: testInputDesc,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.result) {
        setTestOutput(typeof data.result === 'object' ? JSON.stringify(data.result, null, 2) : String(data.result));
        if (data.telemetry) {
          setTestTelemetry({
            provider: data.telemetry.provider || data.telemetry.model,
            duration: data.telemetry.duration_ms,
            tokens: data.telemetry.tokens_consumed,
          });
        }
      } else {
        setTestOutput(data.error?.message || 'Erreur de génération du sandbox.');
      }
    } catch (err: any) {
      setTestOutput(err?.message || 'Erreur réseau lors de l’exécution.');
    } finally {
      setTestingAi(false);
    }
  };

  const maxDailyTokens = useMemo(() => Math.max(...stats.daily_usage.map((day) => day.tokens), 1), [stats.daily_usage]);
  const activeProvidersCount = useMemo(() => providers.filter((p) => p.is_enabled).length, [providers]);

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Superadmin', href: '/admin/overview' },
        { label: 'Intelligence Artificielle', href: '/ai-costs' },
      ]}
      headerTitle="Supervision IA & Maîtrise des Coûts"
      headerSubtitle="Monitoring télémétrique, routage 3-niveaux, barème de jetons et templates LLM en direct"
      headerIcon={Cpu}
      primaryAction={
        <button
          onClick={fetchAllData}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] hover:opacity-90 text-white text-xs font-bold transition-all shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      }
      secondaryAction={
        <div className="flex items-center gap-2">
          {feedbackMessage && (
            <div
              className={`px-3 py-1.5 rounded-[var(--rego-r,8px)] text-xs font-bold animate-fade-in flex items-center gap-1.5 ${
                feedbackType === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {feedbackType === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{feedbackMessage}</span>
            </div>
          )}
          <button
            onClick={() => setTestModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] hover:bg-[var(--rego-surface,#f5f5f5)] text-xs font-bold text-[var(--rego-fg,#111111)] shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] transition-all"
          >
            <Play className="w-3.5 h-3.5 text-[var(--rego-accent,#ad0505)]" />
            <span>Tester Sandbox</span>
          </button>
        </div>
      }
      mainContent={
        <div className="space-y-6">
          {/* TOP HERO KPIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <ReGoKpiHero
              label="Jetons Consommés (Total)"
              value={stats.total_tokens_consumed.toLocaleString('fr-TN')}
              hint={`${stats.tokens_today.toLocaleString('fr-TN')} consommés aujourd'hui`}
              accent
              icon={Coins}
            />
            <ReGoKpiHero
              label="Opérations IA Réalisées"
              value={stats.total_jobs.toLocaleString('fr-TN')}
              hint={`${stats.jobs_today} requêtes générées ce jour`}
              icon={Sparkles}
            />
            <ReGoKpiHero
              label="Comptes Marchands Actifs"
              value={stats.credits.active_wallets.toString()}
              hint={`${stats.credits.unlimited_wallets} forfaits avec IA illimitée`}
              icon={WalletCards}
            />
            <ReGoKpiHero
              label="Fournisseurs LLM Actifs"
              value={activeProvidersCount.toString()}
              hint={`${providers.length} connecteurs configurés`}
              icon={Cpu}
            />
          </div>

          {/* SECONDARY LEDGER BALANCE BOX */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] space-y-1 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
              <span className="text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider block">
                Solde Restant (Comptes Finis)
              </span>
              <p className="text-xl font-mono font-black text-[var(--rego-fg,#111111)]">
                {stats.credits.finite_tokens_remaining.toLocaleString('fr-TN')} <span className="text-xs font-normal text-[var(--rego-ink-2,#737373)]">tok</span>
              </p>
              <span className="text-[10px] text-[var(--rego-ink-3,#949494)] block">
                Total des crédits marchands non expirés
              </span>
            </div>

            <div className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] space-y-1 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
              <span className="text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider block">
                Jetons Déduits du Solde
              </span>
              <p className="text-xl font-mono font-black text-emerald-700">
                {stats.credits.tokens_used.toLocaleString('fr-TN')} <span className="text-xs font-normal text-[var(--rego-ink-2,#737373)]">tok</span>
              </p>
              <span className="text-[10px] text-[var(--rego-ink-3,#949494)] block">
                Consommation réelle vérifiée en base
              </span>
            </div>

            <div className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] space-y-1 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
              <span className="text-[11px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider block">
                Coût Télémétrique Estimé
              </span>
              <p className="text-xl font-mono font-black text-[var(--rego-accent,#ad0505)]">
                {stats.estimated_cost_tnd.toFixed(3)} <span className="text-xs font-normal text-[var(--rego-ink-2,#737373)]">TND</span>
              </p>
              <span className="text-[10px] text-[var(--rego-ink-3,#949494)] block">
                Équivalent devises d'après barème
              </span>
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <div className="flex border-b border-[var(--rego-border,#dedede)] overflow-x-auto gap-2 text-xs font-bold text-[var(--rego-ink-2,#737373)] pb-px">
            {[
              { key: 'overview', label: 'Vue d’ensemble & Télémétrie', icon: BarChart3 },
              { key: 'history', label: 'Historique & Audit (Ledger)', icon: History },
              { key: 'routing', label: 'Routage & Failover 3-Niveaux', icon: Layers3 },
              { key: 'providers', label: 'Fournisseurs & Clés API', icon: Cpu },
              { key: 'prompts', label: 'Prompts Studio (Templates)', icon: Wand2 },
              { key: 'pricing', label: 'Barème & Quotas Jetons', icon: Tag },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 whitespace-nowrap transition-all ${
                    isActive
                      ? 'border-[var(--rego-accent,#ad0505)] text-[var(--rego-fg,#111111)]'
                      : 'border-transparent hover:text-[var(--rego-fg,#111111)]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--rego-accent,#ad0505)]' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Usage Chronologique (30 jours) */}
                <div className="lg:col-span-8">
                  <ReGoCard
                    title="Consommation des Jetons (30 derniers jours)"
                    subtitle="Volume journalier des tokens consommés à travers la plateforme"
                    icon={Activity}
                  >
                    <div className="h-44 flex items-end gap-1 pt-6 px-2">
                      {stats.daily_usage.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[var(--rego-ink-3,#949494)]">
                          Aucune donnée télémétrique sur les 30 derniers jours.
                        </div>
                      ) : (
                        stats.daily_usage.map((day) => {
                          const heightPct = Math.max(8, (day.tokens / maxDailyTokens) * 100);
                          return (
                            <div
                              key={day.date}
                              className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end"
                            >
                              <div
                                style={{ height: `${heightPct}%` }}
                                className="w-full rounded-t-[3px] bg-[var(--rego-accent,#ad0505)]/80 hover:bg-[var(--rego-accent,#ad0505)] transition-all cursor-pointer"
                              />
                              {/* Hover Tooltip */}
                              <div className="absolute -top-10 bg-[var(--rego-fg,#111111)] text-[var(--rego-bg,#ffffff)] text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 font-mono shadow-md">
                                {day.date} : {day.tokens.toLocaleString('fr-TN')} tokens ({day.jobs} jobs)
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-[var(--rego-ink-3,#949494)] font-mono pt-2 border-t border-[var(--rego-border,#dedede)] mt-2">
                      <span>Il y a 30 jours</span>
                      <span>Aujourd'hui</span>
                    </div>
                  </ReGoCard>
                </div>

                {/* Répartition par Type d'Usage */}
                <div className="lg:col-span-4">
                  <ReGoCard
                    title="Répartition par Type d'Usage"
                    subtitle="Ventilation de la consommation IA"
                    icon={FolderTree}
                  >
                    <div className="space-y-3 pt-2">
                      {stats.by_type.length === 0 ? (
                        <p className="text-xs text-[var(--rego-ink-3,#949494)] text-center py-6">
                          Aucune action enregistrée.
                        </p>
                      ) : (
                        stats.by_type.map((item) => {
                          const pct = stats.total_tokens_consumed
                            ? Math.round((item.tokens / stats.total_tokens_consumed) * 100)
                            : 0;
                          return (
                            <div key={item.type} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-[var(--rego-fg,#111111)]">
                                  {typeLabels[item.type] || item.type}
                                </span>
                                <span className="font-mono text-[var(--rego-ink-2,#737373)] font-semibold">
                                  {item.tokens.toLocaleString('fr-TN')} tok ({pct}%)
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[var(--rego-surface,#f5f5f5)] overflow-hidden">
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

              {/* Top Consommateurs & Activité Récente */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Top Consuming Stores */}
                <div className="lg:col-span-6">
                  <ReGoCard
                    title="Top Boutiques Consommatrices"
                    subtitle="Marchands ayant consommé le plus de crédits IA (cliquez pour filtrer l'historique)"
                    icon={Coins}
                  >
                    <div className="space-y-2">
                      {stats.top_consumers.length === 0 ? (
                        <p className="text-xs text-[var(--rego-ink-3,#949494)] py-6 text-center">
                          Aucune consommation enregistrée.
                        </p>
                      ) : (
                        stats.top_consumers.map((c, i) => (
                          <div
                            key={c.store_id}
                            onClick={() => openHistoryForStore(c.store_id, c.store_name)}
                            className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer transition-colors border border-transparent hover:border-[var(--rego-border,#dedede)]"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-[var(--rego-surface,#f5f5f5)] text-[10px] font-bold font-mono flex items-center justify-center text-[var(--rego-ink-2,#737373)]">
                                {i + 1}
                              </span>
                              <div>
                                <p className="text-xs font-bold text-[var(--rego-fg,#111111)] hover:text-[var(--rego-accent,#ad0505)] flex items-center gap-1">
                                  <span>{c.store_name}</span>
                                  <ArrowUpRight className="w-3 h-3 text-[var(--rego-ink-3,#949494)]" />
                                </p>
                                <span className="text-[10px] text-[var(--rego-ink-3,#949494)] font-mono">
                                  {c.job_count} opérations
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-xs text-[var(--rego-accent,#ad0505)]">
                                {c.tokens_used.toLocaleString('fr-TN')}
                              </span>
                              <span className="text-[10px] text-[var(--rego-ink-3,#949494)] block">tokens</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ReGoCard>
                </div>

                {/* Activité Récente & Diagnostics */}
                <div className="lg:col-span-6">
                  <ReGoCard
                    title="Journal d'Activité en Direct"
                    subtitle="20 dernières requêtes exécutées"
                    icon={Activity}
                  >
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {(!stats.recent_activity || stats.recent_activity.length === 0) ? (
                        <p className="text-xs text-[var(--rego-ink-3,#949494)] py-6 text-center">
                          Aucune activité récente.
                        </p>
                      ) : (
                        stats.recent_activity.map((act) => (
                          <div
                            key={act.id}
                            onClick={() => openInspection(act)}
                            className="flex items-center justify-between p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] hover:bg-[var(--rego-surface,#f5f5f5)] cursor-pointer transition-colors text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[var(--rego-fg,#111111)] truncate max-w-[140px]">
                                  {act.store_name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] font-semibold">
                                  {typeLabels[act.type] || act.type}
                                </span>
                              </div>
                              <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">
                                {act.provider_label || 'gemini-1.5-flash'} • {act.duration_seconds ? `${act.duration_seconds}s` : 'instantané'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-[var(--rego-accent,#ad0505)]">
                                +{act.tokens_consumed} tok
                              </span>
                              <ReGoStatusChip
                                status={act.status === 'completed' ? 'ok' : act.status === 'failed' ? 'err' : 'warn'}
                                label={act.status === 'completed' ? 'Succès' : act.status === 'failed' ? 'Erreur' : act.status}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ReGoCard>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HISTORY & AUDIT LEDGER */}
          {activeTab === 'history' && (
            <ReGoCard
              title="Registre d'Audit des Opérations IA"
              subtitle="Traçabilité complète de chaque inférence, consommation de jetons et inspection des métadonnées"
              icon={History}
              actions={
                <button
                  onClick={fetchHistory}
                  disabled={historyLoading}
                  className="p-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                  title="Rafraîchir l'historique"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                </button>
              }
            >
              {/* Telemetry Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)]/60 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-ink-2,#737373)] block">Total Jobs</span>
                  <span className="font-bold text-[var(--rego-fg,#111111)]">{historySummary.total}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Complétés</span>
                  <span className="font-bold text-emerald-700">{historySummary.completed_count}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Échoués</span>
                  <span className="font-bold text-rose-700">{historySummary.failed_count}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--rego-accent,#ad0505)] block">Tokens Déduits</span>
                  <span className="font-mono font-bold text-[var(--rego-accent,#ad0505)]">
                    {historySummary.total_tokens.toLocaleString('fr-TN')}
                  </span>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
                    placeholder="Rechercher boutique, ID job, e-mail..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                  />
                </div>

                {/* Status filter */}
                <select
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs text-[var(--rego-fg,#111111)]"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="completed">Complété</option>
                  <option value="failed">Échoué</option>
                  <option value="processing">En cours</option>
                  <option value="queued">En attente</option>
                </select>

                {/* Type filter */}
                <select
                  value={historyType}
                  onChange={(e) => setHistoryType(e.target.value)}
                  className="px-2.5 py-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-xs text-[var(--rego-fg,#111111)]"
                >
                  <option value="all">Tous les types</option>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>

                {/* Active store filter chip */}
                {historyStoreId !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)]/10 text-[var(--rego-accent,#ad0505)] text-xs font-bold">
                    <span>Boutique : {historyStoreName || historyStoreId.slice(0, 8)}</span>
                    <button
                      onClick={() => {
                        setHistoryStoreId('all');
                        setHistoryStoreName('');
                      }}
                      className="hover:opacity-75"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] uppercase text-[10px] font-bold tracking-wider border-b border-[var(--rego-border,#dedede)]">
                    <tr>
                      <th className="px-4 py-2.5">Job ID</th>
                      <th className="px-4 py-2.5">Boutique & Demandeur</th>
                      <th className="px-4 py-2.5">Opération</th>
                      <th className="px-4 py-2.5">Modèle</th>
                      <th className="px-4 py-2.5 text-right">Tokens</th>
                      <th className="px-4 py-2.5 text-right">Durée</th>
                      <th className="px-4 py-2.5">Statut</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5 text-center">Inspecter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--rego-border,#dedede)]">
                    {historyLoading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-[var(--rego-ink-2,#737373)]">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--rego-accent,#ad0505)] mb-2" />
                          <span>Chargement des journaux télémétriques...</span>
                        </td>
                      </tr>
                    ) : historyJobs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-[var(--rego-ink-3,#949494)]">
                          Aucun enregistrement trouvé pour ces critères de recherche.
                        </td>
                      </tr>
                    ) : (
                      historyJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors">
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
                              className="p-1.5 rounded hover:bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] transition-colors"
                              title="Inspecter le prompt, la réponse et la trace"
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/30 text-xs mt-3 rounded-[var(--rego-r,8px)]">
                  <span className="text-[var(--rego-ink-2,#737373)]">
                    Page {historyPagination.page} sur {historyPagination.total_pages} ({historyPagination.total} jobs au total)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={historyPagination.page <= 1}
                      onClick={() => setHistoryPagination((p) => ({ ...p, page: p.page - 1 }))}
                      className="px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] disabled:opacity-40 font-bold"
                    >
                      Précédent
                    </button>
                    <button
                      disabled={historyPagination.page >= historyPagination.total_pages}
                      onClick={() => setHistoryPagination((p) => ({ ...p, page: p.page + 1 }))}
                      className="px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] disabled:opacity-40 font-bold"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </ReGoCard>
          )}

          {/* TAB 3: ROUTING & 3-TIER MULTI-MODEL FAILOVER */}
          {activeTab === 'routing' && (
            <div className="space-y-4">
              <ReGoCard
                title="Routage & Basculement Multi-Modèles (3-Tier Failover)"
                subtitle="Configurez le modèle principal et les 2 niveaux de repli automatique en cas de panne ou dépassement de quota"
                icon={Layers3}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PURPOSE_MODULES.map((item) => {
                    const currentRoute = purposeRouting.find((r) => r.purpose === item.key);
                    const isSaving = savingPurposeKey === item.key;
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.key}
                        className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] space-y-3.5 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-accent,#ad0505)]">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-[var(--rego-fg,#111111)]">{item.label}</h4>
                              <span className="text-[10px] text-[var(--rego-ink-3,#949494)] font-mono">{item.key}</span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-ink-2,#737373)]">
                            {item.badge}
                          </span>
                        </div>

                        <p className="text-[11px] text-[var(--rego-ink-2,#737373)] leading-relaxed">
                          {item.desc}
                        </p>

                        {/* 3-Tier Selectors */}
                        <div className="space-y-2 pt-2 border-t border-[var(--rego-border,#dedede)] text-xs">
                          {/* Tier 1: Primary */}
                          <div>
                            <label className="text-[10px] font-bold text-[var(--rego-fg,#111111)] uppercase tracking-wider block mb-1 flex items-center justify-between">
                              <span className="text-emerald-700 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Tier 1 : Modèle Principal
                              </span>
                            </label>
                            <select
                              value={currentRoute?.provider_config_id || ''}
                              onChange={(e) =>
                                handleUpdatePurposeRouting(
                                  item.key,
                                  e.target.value || null,
                                  currentRoute?.fallback_provider_config_id_1 || null,
                                  currentRoute?.fallback_provider_config_id_2 || null,
                                )
                              }
                              disabled={isSaving}
                              className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 font-semibold text-xs text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                            >
                              <option value="">Pile de priorité par défaut</option>
                              {providers.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label} ({p.provider.toUpperCase()} - {p.model})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Tier 2: Fallback 1 */}
                          <div>
                            <label className="text-[10px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider block mb-1">
                              Tier 2 : Repli 1 (Failover)
                            </label>
                            <select
                              value={currentRoute?.fallback_provider_config_id_1 || ''}
                              onChange={(e) =>
                                handleUpdatePurposeRouting(
                                  item.key,
                                  currentRoute?.provider_config_id || null,
                                  e.target.value || null,
                                  currentRoute?.fallback_provider_config_id_2 || null,
                                )
                              }
                              disabled={isSaving}
                              className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 text-xs text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                            >
                              <option value="">(Aucun repli niveau 1)</option>
                              {providers.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label} ({p.provider.toUpperCase()} - {p.model})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Tier 3: Fallback 2 */}
                          <div>
                            <label className="text-[10px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider block mb-1">
                              Tier 3 : Repli 2 (Ultime recours)
                            </label>
                            <select
                              value={currentRoute?.fallback_provider_config_id_2 || ''}
                              onChange={(e) =>
                                handleUpdatePurposeRouting(
                                  item.key,
                                  currentRoute?.provider_config_id || null,
                                  currentRoute?.fallback_provider_config_id_1 || null,
                                  e.target.value || null,
                                )
                              }
                              disabled={isSaving}
                              className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 text-xs text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                            >
                              <option value="">(Aucun repli niveau 2)</option>
                              {providers.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label} ({p.provider.toUpperCase()} - {p.model})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {isSaving && (
                          <div className="text-[10px] text-[var(--rego-accent,#ad0505)] font-bold flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Enregistrement en direct...</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ReGoCard>
            </div>
          )}

          {/* TAB 4: PROVIDERS */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)]">
                    Fournisseurs & Moteurs LLM Connectés
                  </h3>
                  <p className="text-xs text-[var(--rego-ink-2,#737373)]">
                    Gestion des intégrations actives (Google Gemini, OpenAI, Claude Anthropic, Replicate, Proxies Privés)
                  </p>
                </div>
                <button
                  onClick={handleOpenNewProviderModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un Fournisseur</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {providers.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-xs text-[var(--rego-ink-3,#949494)] border border-dashed rounded-[var(--rego-r,8px)]">
                    Aucun fournisseur d'IA configuré. Cliquez sur "Ajouter un Fournisseur" pour en enregistrer un.
                  </div>
                ) : (
                  providers.map((prov) => (
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
                        <div className="flex items-center gap-1.5">
                          {prov.is_default && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
                              Défaut
                            </span>
                          )}
                          <ReGoStatusChip
                            status={prov.is_enabled ? 'ok' : 'neutral'}
                            label={prov.is_enabled ? 'Actif' : 'Inactif'}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-[var(--rego-ink-2,#737373)]">
                          <span>Moteur & Modèle</span>
                          <span className="font-mono text-[var(--rego-fg,#111111)] font-semibold">{prov.model}</span>
                        </div>
                        <div className="flex justify-between text-[var(--rego-ink-2,#737373)]">
                          <span>Clé API</span>
                          <span className={prov.api_key_set ? 'font-semibold text-emerald-600' : 'text-rose-600 font-semibold'}>
                            {prov.api_key_set ? 'Configurée ••••' : 'Non renseignée'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[var(--rego-ink-2,#737373)]">
                          <span>Priorité</span>
                          <span className="font-mono text-[var(--rego-fg,#111111)]">{prov.priority}</span>
                        </div>
                        {prov.base_url && (
                          <div className="flex justify-between text-[var(--rego-ink-2,#737373)]">
                            <span>Proxy URL</span>
                            <span className="font-mono text-[10px] truncate max-w-[140px] text-[var(--rego-ink-2,#737373)]">
                              {prov.base_url}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions Card Footer */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--rego-border,#dedede)]">
                        <button
                          onClick={() => handleOpenEditProviderModal(prov)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] hover:bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-bold text-[var(--rego-fg,#111111)]"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Modifier</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProvider(prov.id, prov.label)}
                          disabled={deletingProviderId === prov.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--rego-r,8px)] border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[11px] font-bold text-rose-700 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PROMPTS STUDIO */}
          {activeTab === 'prompts' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4 space-y-2">
                <h4 className="text-xs font-bold uppercase text-[var(--rego-ink-2,#737373)] mb-2">
                  Templates & Modèles de Consignes
                </h4>
                {promptTemplates.map((tpl) => (
                  <button
                    key={tpl.prompt_key}
                    onClick={() => handleSelectPrompt(tpl.prompt_key)}
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
                  title="Éditeur de Consigne Système & Prompt Utilisateur"
                  subtitle="Modifiez en direct les instructions injectées aux modèles LLM lors des générations"
                  icon={Wand2}
                  actions={
                    <button
                      onClick={handleSavePrompt}
                      disabled={savingPrompt}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <Save className={`w-3.5 h-3.5 ${savingPrompt ? 'animate-spin' : ''}`} />
                      <span>{savingPrompt ? 'Sauvegarde en cours...' : 'Enregistrer'}</span>
                    </button>
                  }
                >
                  <div className="space-y-4 text-xs">
                    {/* Variable Chips */}
                    {promptTemplates.find((t) => t.prompt_key === selectedPromptKey)?.variables && (
                      <div className="p-2.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)]/60 border border-[var(--rego-border,#dedede)] space-y-1.5">
                        <span className="text-[10px] font-bold text-[var(--rego-ink-2,#737373)] uppercase tracking-wider block">
                          Variables d'injection disponibles (cliquez pour insérer) :
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {promptTemplates
                            .find((t) => t.prompt_key === selectedPromptKey)!
                            .variables.map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => handleInsertVariable(v)}
                                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] hover:border-[var(--rego-accent,#ad0505)] hover:text-[var(--rego-accent,#ad0505)] transition-colors"
                              >
                                {v}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                        System Prompt (Consigne de Rôle & Contraintes)
                      </label>
                      <textarea
                        rows={6}
                        value={editingSystemPrompt}
                        onChange={(e) => setEditingSystemPrompt(e.target.value)}
                        className="w-full p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-mono text-[11px] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">
                        Prompt Utilisateur (Gabarit avec variables)
                      </label>
                      <textarea
                        rows={5}
                        value={editingDefaultPrompt}
                        onChange={(e) => setEditingDefaultPrompt(e.target.value)}
                        className="w-full p-2.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-mono text-[11px] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                      />
                    </div>
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* TAB 6: PRICING & QUOTAS */}
          {activeTab === 'pricing' && (
            <ReGoCard
              title="Barème de Consommation des Jetons IA"
              subtitle="Configurez le nombre exact de jetons déduits du solde du vendeur pour chaque appel d'inférence"
              icon={Tag}
              actions={
                <button
                  onClick={handleSavePricing}
                  disabled={savingPricing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Save className={`w-3.5 h-3.5 ${savingPricing ? 'animate-spin' : ''}`} />
                  <span>{savingPricing ? 'Sauvegarde...' : 'Enregistrer les Tarifs'}</span>
                </button>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {pricing.map((item) => (
                  <div
                    key={item.job_type}
                    className="p-3.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[var(--rego-fg,#111111)]">
                        {typeLabels[item.job_type] || item.job_type}
                      </p>
                      <span className="text-[10px] text-[var(--rego-ink-3,#949494)] font-mono">{item.job_type}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={0}
                        max={10000}
                        value={item.tokens_required}
                        onChange={(e) => handlePricingChange(item.job_type, parseInt(e.target.value, 10) || 0)}
                        className="w-16 p-1.5 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-right font-mono font-bold text-xs text-[var(--rego-accent,#ad0505)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)]"
                      />
                      <span className="text-[11px] font-semibold text-[var(--rego-ink-2,#737373)]">tok</span>
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
              {/* Drawer Navigation Tabs */}
              <div className="flex border-b border-[var(--rego-border,#dedede)] gap-2 text-[11px] font-bold">
                {[
                  { key: 'overview', label: 'Aperçu' },
                  { key: 'input', label: 'Entrée (Input Meta)' },
                  { key: 'output', label: 'Résultat (Output)' },
                  { key: 'trace', label: 'Trace & Timing' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setDrawerTab(t.key as any)}
                    className={`pb-2 border-b-2 transition-all ${
                      drawerTab === t.key
                        ? 'border-[var(--rego-accent,#ad0505)] text-[var(--rego-fg,#111111)]'
                        : 'border-transparent text-[var(--rego-ink-2,#737373)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB: OVERVIEW */}
              {drawerTab === 'overview' && (
                <div className="space-y-3">
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
                        {selectedJob.tokens_consumed ? selectedJob.tokens_consumed.toLocaleString('fr-TN') : 0} tok
                      </span>
                    </div>
                  </div>

                  {selectedJob.error_message && (
                    <div className="p-3 rounded-[var(--rego-r,8px)] border border-rose-300 bg-rose-50 text-rose-900 space-y-1">
                      <span className="font-bold block text-[11px]">Message d'Erreur LLM :</span>
                      <p className="font-mono text-[11px] whitespace-pre-wrap">{selectedJob.error_message}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: INPUT META */}
              {drawerTab === 'input' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[var(--rego-fg,#111111)]">Données d'Entrée (Input Meta)</span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedJob.input_meta, null, 2), 'input')}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-accent,#ad0505)] hover:underline"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey === 'input' ? 'Copié !' : 'Copier JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-mono overflow-x-auto max-h-80 border border-[var(--rego-border,#dedede)]">
                    {JSON.stringify(selectedJob.input_meta || {}, null, 2)}
                  </pre>
                </div>
              )}

              {/* TAB: OUTPUT */}
              {drawerTab === 'output' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[var(--rego-fg,#111111)]">Résultat Généré (Output)</span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedJob.output, null, 2), 'output')}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--rego-accent,#ad0505)] hover:underline"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey === 'output' ? 'Copié !' : 'Copier JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] text-[11px] font-mono overflow-x-auto max-h-80 border border-[var(--rego-border,#dedede)]">
                    {JSON.stringify(selectedJob.output || {}, null, 2)}
                  </pre>
                </div>
              )}

              {/* TAB: TRACE */}
              {drawerTab === 'trace' && (
                <div className="space-y-2 p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] font-mono text-[11px]">
                  <div className="flex justify-between py-1 border-b border-[var(--rego-border,#dedede)]">
                    <span className="text-[var(--rego-ink-2,#737373)]">BullMQ Job ID :</span>
                    <span className="font-bold">{selectedJob.bullmq_job_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--rego-border,#dedede)]">
                    <span className="text-[var(--rego-ink-2,#737373)]">Créé le :</span>
                    <span>{new Date(selectedJob.created_at).toLocaleString('fr-TN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--rego-border,#dedede)]">
                    <span className="text-[var(--rego-ink-2,#737373)]">Démarré le :</span>
                    <span>{selectedJob.started_at ? new Date(selectedJob.started_at).toLocaleString('fr-TN') : '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--rego-border,#dedede)]">
                    <span className="text-[var(--rego-ink-2,#737373)]">Terminé le :</span>
                    <span>{selectedJob.completed_at ? new Date(selectedJob.completed_at).toLocaleString('fr-TN') : '-'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--rego-ink-2,#737373)]">Durée Totale :</span>
                    <span className="font-bold text-[var(--rego-accent,#ad0505)]">
                      {selectedJob.duration_seconds !== null ? `${selectedJob.duration_seconds.toFixed(2)} secondes` : '-'}
                    </span>
                  </div>
                </div>
              )}
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
            maxWidth="max-w-xl"
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
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Moteur & Usage Testé</label>
                <select
                  value={testPurpose}
                  onChange={(e) => setTestPurpose(e.target.value)}
                  className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-semibold"
                >
                  {PURPOSE_MODULES.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Titre Produit / Intitulé</label>
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

              {testTelemetry && (
                <div className="p-2.5 rounded-[var(--rego-r,8px)] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex justify-between font-mono">
                  <span>Modèle : {testTelemetry.provider}</span>
                  <span>Temps : {testTelemetry.duration}ms</span>
                  <span>Tokens : {testTelemetry.tokens}</span>
                </div>
              )}

              {testOutput && (
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Résultat Généré</label>
                  <pre className="p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] font-mono text-[11px] whitespace-pre-wrap max-h-56 overflow-y-auto border border-[var(--rego-border,#dedede)]">
                    {testOutput}
                  </pre>
                </div>
              )}
            </div>
          </ReGoModal>

          {/* Modal Add / Edit Provider */}
          <ReGoModal
            isOpen={showProviderModal}
            onClose={() => setShowProviderModal(false)}
            title={providerForm.id ? 'Modifier le Fournisseur IA' : 'Ajouter un Fournisseur LLM'}
            subtitle="Configurez les paramètres de connexion de l'API d'inférence"
            maxWidth="max-w-lg"
            actions={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowProviderModal(false)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] hover:bg-[var(--rego-surface,#f5f5f5)]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveProvider}
                  disabled={savingProvider}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Save className={`w-3.5 h-3.5 ${savingProvider ? 'animate-spin' : ''}`} />
                  <span>{savingProvider ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
              </div>
            }
          >
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Moteur LLM</label>
                  <select
                    value={providerForm.provider}
                    onChange={(e) => setProviderForm((f) => ({ ...f, provider: e.target.value as AiProvider }))}
                    className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="claude">Claude (Anthropic)</option>
                    <option value="replicate">Replicate (SDXL / Flux)</option>
                    <option value="custom">Proxy Privé / Custom LLM</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Libellé d'Affichage</label>
                  <input
                    type="text"
                    value={providerForm.label}
                    onChange={(e) => setProviderForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Ex: Gemini Flash Prod"
                    className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Nom du Modèle</label>
                  <input
                    type="text"
                    value={providerForm.model}
                    onChange={(e) => setProviderForm((f) => ({ ...f, model: e.target.value }))}
                    placeholder="Ex: gemini-1.5-flash"
                    className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Priorité (1 - 9999)</label>
                  <input
                    type="number"
                    value={providerForm.priority}
                    onChange={(e) => setProviderForm((f) => ({ ...f, priority: parseInt(e.target.value, 10) || 100 }))}
                    className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">Clé API Secrète</label>
                <input
                  type="password"
                  value={providerForm.api_key}
                  onChange={(e) => setProviderForm((f) => ({ ...f, api_key: e.target.value }))}
                  placeholder={providerForm.id ? 'Laisser vide pour conserver la clé actuelle' : 'sk-... ou clé API'}
                  className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--rego-fg,#111111)] block mb-1">URL de Base / Endpoint Proxy (Optionnel)</label>
                <input
                  type="text"
                  value={providerForm.base_url}
                  onChange={(e) => setProviderForm((f) => ({ ...f, base_url: e.target.value }))}
                  placeholder="https://votre-proxy.com/v1"
                  className="w-full p-2 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)]">
                <label className="flex items-center gap-2 font-bold text-[var(--rego-fg,#111111)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerForm.is_enabled}
                    onChange={(e) => setProviderForm((f) => ({ ...f, is_enabled: e.target.checked }))}
                    className="rounded text-[var(--rego-accent,#ad0505)]"
                  />
                  <span>Fournisseur Actif</span>
                </label>
                <label className="flex items-center gap-2 font-bold text-[var(--rego-fg,#111111)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerForm.is_default}
                    onChange={(e) => setProviderForm((f) => ({ ...f, is_default: e.target.checked }))}
                    className="rounded text-[var(--rego-accent,#ad0505)]"
                  />
                  <span>Fournisseur par Défaut</span>
                </label>
              </div>
            </div>
          </ReGoModal>
        </>
      }
    />
  );
}
