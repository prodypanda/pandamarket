'use client';

import { getResizedImageUrl } from '@/lib/image-url';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  History,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  XCircle,
  Zap,
} from 'lucide-react';

type AiJobType = 'image_compression' | 'seo_generation' | 'page_copy' | 'product_description';
type AiJobStatus = 'queued' | 'processing' | 'completed' | 'failed';
type Language = 'fr' | 'ar' | 'en';
type AiProvider = 'gemini' | 'openai' | 'claude' | 'custom';

interface AiJob {
  id: string;
  type: AiJobType;
  status: AiJobStatus;
  input_url: string | null;
  input_meta?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  tokens_consumed: number;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

interface Credits {
  ai_tokens: number;
  tokens_used: number;
}

interface ProductImage {
  id: string;
  url: string;
  alt_text?: string | null;
  is_thumbnail?: boolean;
}

interface Product {
  id: string;
  title: string;
  status: string;
  thumbnail?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  images?: ProductImage[];
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface PageCopySuggestions {
  seo_title: string;
  seo_description: string;
  hero_title: string;
  cta: string;
}

interface StoreAiProviderState {
  allowed: boolean;
  config: {
    provider: AiProvider;
    model: string;
    base_url: string | null;
    api_key_set: boolean;
    is_enabled: boolean;
  } | null;
}

interface AiPricing {
  job_type: AiJobType;
  tokens_required: number;
}

interface TokenPack {
  id: string;
  label: string;
  tokens: number;
  price_tnd: number;
}

const languageLabelKeys: Record<Language, string> = {
  fr: 'dashboardPages.ai.languages.fr',
  ar: 'dashboardPages.ai.languages.ar',
  en: 'dashboardPages.ai.languages.en',
};

const providerLabelKeys: Record<AiProvider, string> = {
  gemini: 'dashboardPages.ai.providers.gemini',
  openai: 'dashboardPages.ai.providers.openai',
  claude: 'dashboardPages.ai.providers.claude',
  custom: 'dashboardPages.ai.providers.custom',
};

const typeLabelKeys: Record<AiJobType, string> = {
  image_compression: 'dashboardPages.ai.types.image_compression',
  seo_generation: 'dashboardPages.ai.types.seo_generation',
  page_copy: 'dashboardPages.ai.types.page_copy',
  product_description: 'dashboardPages.ai.types.product_description',
};

const statusLabelKeys: Record<AiJobStatus, string> = {
  queued: 'dashboardPages.ai.statuses.queued',
  processing: 'dashboardPages.ai.statuses.processing',
  completed: 'dashboardPages.ai.statuses.completed',
  failed: 'dashboardPages.ai.statuses.failed',
};

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: { message?: string } }).error;
    if (error?.message) return error.message;
  }
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: string }).message;
    if (message) return message;
  }
  return fallback;
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(status: AiJobStatus) {
  if (status === 'completed') return 'bg-green-50 text-green-700 ring-green-100';
  if (status === 'failed') return 'bg-red-50 text-red-700 ring-red-100';
  if (status === 'processing') return 'bg-amber-50 text-amber-700 ring-amber-100';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

function StatusIcon({ status }: { status: AiJobStatus }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'failed') return <XCircle className="h-4 w-4" />;
  if (status === 'processing') return <Loader2 className="h-4 w-4 animate-spin" />;
  return <Clock3 className="h-4 w-4" />;
}

function JobTypeIcon({ type }: { type: AiJobType }) {
  if (type === 'image_compression') return <ImageIcon className="h-4 w-4 text-[#B91C1C]" />;
  if (type === 'seo_generation') return <FileText className="h-4 w-4 text-amber-700" />;
  return <Sparkles className="h-4 w-4 text-[#7F1D1D]" />;
}

export default function AiToolsStudio() {
  const { t, locale } = useLocale();
  const [credits, setCredits] = useState<Credits | null>(null);
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [compressUrl, setCompressUrl] = useState('');
  const [compressProductId, setCompressProductId] = useState('');
  const [compressing, setCompressing] = useState(false);

  const [seoProductId, setSeoProductId] = useState('');
  const [seoLanguage, setSeoLanguage] = useState<Language>('fr');
  const [generating, setGenerating] = useState(false);

  const [copyLanguage, setCopyLanguage] = useState<Language>('fr');
  const [pageTitle, setPageTitle] = useState('');
  const [currentSeoTitle, setCurrentSeoTitle] = useState('');
  const [currentSeoDescription, setCurrentSeoDescription] = useState('');
  const [sectionOutline, setSectionOutline] = useState('');
  const [copyGenerating, setCopyGenerating] = useState(false);
  const [copySuggestions, setCopySuggestions] = useState<PageCopySuggestions | null>(null);

  const [historyType, setHistoryType] = useState<'all' | AiJobType>('all');
  const [historyStatus, setHistoryStatus] = useState<'all' | AiJobStatus>('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [providerState, setProviderState] = useState<StoreAiProviderState | null>(null);
  const [providerForm, setProviderForm] = useState({
    provider: 'gemini' as AiProvider,
    model: 'gemini-1.5-flash',
    base_url: '',
    api_key: '',
    is_enabled: true,
  });
  const [savingProvider, setSavingProvider] = useState(false);
  const [pricing, setPricing] = useState<AiPricing[]>([]);
  const [tokenPacks, setTokenPacks] = useState<TokenPack[]>([]);
  const [buyingPackId, setBuyingPackId] = useState('');

  const selectedCompressionProduct = useMemo(
    () => products.find((product) => product.id === compressProductId) || null,
    [compressProductId, products],
  );

  const imageOptions = useMemo(() => {
    if (!selectedCompressionProduct) return [];
    const mainLabel = t('dashboardPages.ai.imageLabels.main');
    const galleryLabel = t('dashboardPages.ai.imageLabels.gallery', { index: 0 });
    const options = [
      selectedCompressionProduct.thumbnail
        ? { url: selectedCompressionProduct.thumbnail, label: mainLabel }
        : null,
      ...(selectedCompressionProduct.images || []).map((image, index) => ({
        url: image.url,
        label: image.is_thumbnail ? mainLabel : galleryLabel.replace('{index}', String(index + 1)),
      })),
    ].filter((item): item is { url: string; label: string } => Boolean(item?.url));
    const seen = new Set<string>();
    return options.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [selectedCompressionProduct, t]);

  const isUnlimited = credits?.ai_tokens === -1;
  const completedJobs = jobs.filter((job) => job.status === 'completed').length;
  const failedJobs = jobs.filter((job) => job.status === 'failed').length;
  const activeJobs = jobs.filter((job) => job.status === 'queued' || job.status === 'processing').length;
  const priceFor = (type: AiJobType, fallback: number) => pricing.find((item) => item.job_type === type)?.tokens_required ?? fallback;

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/ai/credits', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
      }
    } catch {
      setCredits(null);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/products?limit=100', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data || []);
      }
    } catch {
      setProducts([]);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(historyPage),
      limit: '20',
    });
    if (historyType !== 'all') params.set('type', historyType);
    if (historyStatus !== 'all') params.set('status', historyStatus);

    try {
      const res = await fetchWithCsrf(`/api/pd/ai/history?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        setMeta(data.meta || null);
      }
    } catch {
      setJobs([]);
      setMeta(null);
    }
  }, [historyPage, historyStatus, historyType]);

  const fetchProviderConfig = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/ai/provider-config', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setProviderState(data);
      if (data.config) {
        setProviderForm({
          provider: data.config.provider || 'gemini',
          model: data.config.model || 'gemini-1.5-flash',
          base_url: data.config.base_url || '',
          api_key: '',
          is_enabled: data.config.is_enabled !== false,
        });
      }
    } catch {
      setProviderState(null);
    }
  }, []);

  const fetchPricing = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/ai/pricing', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setPricing(Array.isArray(data.pricing) ? data.pricing : []);
    } catch {
      setPricing([]);
    }
  }, []);

  const fetchTokenPacks = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/ai/token-packs', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setTokenPacks(Array.isArray(data.packs) ? data.packs : []);
    } catch {
      setTokenPacks([]);
    }
  }, []);

  useEffect(() => {
    void Promise.all([fetchCredits(), fetchProducts(), fetchJobs(), fetchProviderConfig(), fetchPricing(), fetchTokenPacks()]).finally(() => setLoading(false));
  }, [fetchCredits, fetchJobs, fetchPricing, fetchProducts, fetchProviderConfig, fetchTokenPacks]);

  useEffect(() => {
    if (!imageOptions.length || compressUrl) return;
    setCompressUrl(imageOptions[0].url);
  }, [compressUrl, imageOptions]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyStatus, historyType]);

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 5000);
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchCredits(), fetchProducts(), fetchJobs(), fetchProviderConfig(), fetchPricing(), fetchTokenPacks()]);
    setRefreshing(false);
  };

  const handleBuyTokenPack = async (packId: string) => {
    setBuyingPackId(packId);
    try {
      const res = await fetchWithCsrf('/api/pd/ai/buy-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pack_id: packId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getErrorMessage(data, t('dashboardPages.ai.errors.buyTokensFailed')));
      setCredits(data.credits || null);
      showFeedback(t('dashboardPages.ai.feedback.tokensBought'));
      void refreshAll();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.ai.errors.network'), true);
    } finally {
      setBuyingPackId('');
    }
  };

  const handleSaveProvider = async () => {
    setSavingProvider(true);
    try {
      const res = await fetchWithCsrf('/api/pd/ai/provider-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...providerForm,
          base_url: providerForm.base_url.trim() || undefined,
          api_key: providerForm.api_key.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getErrorMessage(data, t('dashboardPages.ai.errors.configFailed')));
      setProviderState(data);
      setProviderForm((current) => ({ ...current, api_key: '' }));
      showFeedback(t('dashboardPages.ai.feedback.configSaved'));
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.ai.errors.network'), true);
    } finally {
      setSavingProvider(false);
    }
  };

  const handleDeleteProvider = async () => {
    setSavingProvider(true);
    try {
      const res = await fetchWithCsrf('/api/pd/ai/provider-config', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getErrorMessage(data, t('dashboardPages.ai.errors.deleteFailed')));
      setProviderState((current) => current ? { ...current, config: null } : current);
      setProviderForm((current) => ({ ...current, api_key: '', is_enabled: false }));
      showFeedback(t('dashboardPages.ai.feedback.configDeleted'));
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.ai.errors.network'), true);
    } finally {
      setSavingProvider(false);
    }
  };

  const handleCompress = async () => {
    if (!compressUrl.trim()) {
      showFeedback(t('dashboardPages.ai.errors.imageUrlRequired'), true);
      return;
    }
    setCompressing(true);
    try {
      const res = await fetchWithCsrf('/api/pd/ai/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          image_url: compressUrl.trim(),
          product_id: compressProductId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getErrorMessage(data, t('dashboardPages.ai.errors.compressFailed')));
      showFeedback(t('dashboardPages.ai.feedback.compressStarted'));
      setCompressUrl('');
      void refreshAll();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.ai.errors.network'), true);
    } finally {
      setCompressing(false);
    }
  };

  const handleSeoGenerate = async () => {
    if (!seoProductId) {
      showFeedback(t('dashboardPages.ai.errors.selectProductForSeo'), true);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetchWithCsrf('/api/pd/ai/seo-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_id: seoProductId,
          language: seoLanguage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getErrorMessage(data, t('dashboardPages.ai.errors.seoFailed')));
      showFeedback(t('dashboardPages.ai.feedback.seoStarted'));
      void refreshAll();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.ai.errors.network'), true);
    } finally {
      setGenerating(false);
    }
  };

  const handlePageCopy = async () => {
    if (!pageTitle.trim()) {
      showFeedback(t('dashboardPages.ai.errors.pageTitleRequired'), true);
      return;
    }
    setCopyGenerating(true);
    try {
      const res = await fetchWithCsrf('/api/pd/ai/page-copy-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          page_title: pageTitle.trim(),
          current_seo_title: currentSeoTitle.trim() || undefined,
          current_seo_description: currentSeoDescription.trim() || undefined,
          section_outline: sectionOutline
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
          language: copyLanguage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getErrorMessage(data, t('dashboardPages.ai.errors.copyFailed')));
      setCopySuggestions(data.suggestions || null);
      showFeedback(t('dashboardPages.ai.feedback.copyGenerated'));
      void refreshAll();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : t('dashboardPages.ai.errors.network'), true);
    } finally {
      setCopyGenerating(false);
    }
  };

  const jobTarget = (job: AiJob) => {
    const productId = asString(job.input_meta?.product_id);
    const product = productId ? products.find((item) => item.id === productId) : null;
    if (product) return product.title;
    if (job.type === 'page_copy') return asString(job.input_meta?.page_title) || t('dashboardPages.ai.jobTargetPageBuilder');
    if (job.input_url) return t('dashboardPages.ai.jobTargetImage');
    return productId || '—';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-[2rem] bg-amber-50" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl border border-gray-100 bg-white p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 w-1/2 rounded bg-gray-100" />
                <div className="h-20 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-amber-100 bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-6 text-white shadow-2xl shadow-red-950/10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-amber-100">
              <Sparkles className="h-3.5 w-3.5" />
              {t('dashboardPages.ai.heroBadge')}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">{t('dashboardPages.ai.title')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-50/85">
              {t('dashboardPages.ai.subtitle')}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100/20 p-3">
                <Zap className="h-5 w-5 text-amber-100" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100/80">{t('dashboardPages.ai.balanceLabel')}</p>
                <p className="text-2xl font-black">{isUnlimited ? '∞' : credits?.ai_tokens || 0} {t('dashboardPages.ai.tokensUnit')}</p>
                <p className="text-xs text-amber-50/70">{credits?.tokens_used || 0} {t('dashboardPages.ai.tokensUsed')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {success && (
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-semibold text-green-700">{success}</div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: t('dashboardPages.ai.stats.active'), value: activeJobs, icon: Clock3 },
          { label: t('dashboardPages.ai.stats.completed'), value: completedJobs, icon: CheckCircle2 },
          { label: t('dashboardPages.ai.stats.failed'), value: failedJobs, icon: XCircle },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xl shadow-slate-900/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">{item.label}</p>
                <p className="mt-2 text-2xl font-black text-gray-950">{item.value}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-[#B91C1C]">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-950">
              <Zap className="h-5 w-5 text-[#B91C1C]" />
              {t('dashboardPages.ai.buyTokensTitle')}
            </h2>
            <p className="mt-1 text-sm font-semibold text-gray-500">
              {t('dashboardPages.ai.buyTokensSubtitle')}
            </p>
          </div>
          {isUnlimited && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
              {t('dashboardPages.ai.unlimitedPlan')}
            </span>
          )}
        </div>
        {isUnlimited ? (
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            {t('dashboardPages.ai.unlimitedIncluded')}
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {tokenPacks.map((pack) => (
              <div key={pack.id} className="rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-amber-50/50 p-5">
                <p className="text-sm font-black text-gray-950">{pack.label}</p>
                <p className="mt-2 text-3xl font-black text-[#7F1D1D]">{pack.tokens}</p>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">{t('dashboardPages.ai.tokensUnit')}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-gray-900">{pack.price_tnd.toFixed(3)} TND</span>
                  <button
                    type="button"
                    onClick={() => void handleBuyTokenPack(pack.id)}
                    disabled={Boolean(buyingPackId)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-2 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-50"
                  >
                    {buyingPackId === pack.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {t('dashboardPages.ai.buy')}
                  </button>
                </div>
              </div>
            ))}
            {tokenPacks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-500 md:col-span-3">
                {t('dashboardPages.ai.noPacks')}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-gray-950">
              <Zap className="h-5 w-5 text-[#B91C1C]" />
              {t('dashboardPages.ai.providerTitle')}
            </h2>
            <p className="mt-1 text-sm font-semibold text-gray-500">
              {t('dashboardPages.ai.providerSubtitle')}
            </p>
          </div>
          {providerState?.config?.api_key_set && (
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-100">
              {t('dashboardPages.ai.keyConfigured')}
            </span>
          )}
        </div>
        {providerState && !providerState.allowed ? (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            {t('dashboardPages.ai.providerNotAllowed')}
          </div>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-5">
            <select
              value={providerForm.provider}
              onChange={(e) => setProviderForm((current) => ({ ...current, provider: e.target.value as AiProvider }))}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            >
              {Object.entries(providerLabelKeys).map(([value, key]) => (
                <option key={value} value={value}>{t(key)}</option>
              ))}
            </select>
            <input
              value={providerForm.model}
              onChange={(e) => setProviderForm((current) => ({ ...current, model: e.target.value }))}
              placeholder={t('dashboardPages.ai.modelPlaceholder')}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <input
              value={providerForm.base_url}
              onChange={(e) => setProviderForm((current) => ({ ...current, base_url: e.target.value }))}
              placeholder={t('dashboardPages.ai.baseUrlPlaceholder')}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <input
              type="password"
              value={providerForm.api_key}
              onChange={(e) => setProviderForm((current) => ({ ...current, api_key: e.target.value }))}
              placeholder={providerState?.config?.api_key_set ? t('dashboardPages.ai.newKeyPlaceholder') : t('dashboardPages.ai.apiKeyPlaceholder')}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProviderForm((current) => ({ ...current, is_enabled: !current.is_enabled }))}
                className={`rounded-2xl px-4 py-3 text-xs font-black ring-1 ${providerForm.is_enabled ? 'bg-green-50 text-green-700 ring-green-100' : 'bg-gray-50 text-gray-500 ring-gray-100'}`}
              >
                {providerForm.is_enabled ? t('dashboardPages.ai.active') : t('dashboardPages.ai.inactive')}
              </button>
              <button
                type="button"
                onClick={() => void handleSaveProvider()}
                disabled={savingProvider}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-50"
              >
                {savingProvider ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('dashboardPages.ai.save')}
              </button>
              {providerState?.config && (
                <button
                  type="button"
                  onClick={() => void handleDeleteProvider()}
                  disabled={savingProvider}
                  className="rounded-2xl border border-red-100 bg-red-50 px-3 py-3 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-red-50 p-3 text-[#B91C1C]">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-950">{t('dashboardPages.ai.compressTitle')}</h2>
              <p className="text-xs font-semibold text-gray-400">{priceFor('image_compression', 1)} {t('dashboardPages.ai.tokensPerImage')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <select
              value={compressProductId}
              onChange={(e) => {
                setCompressProductId(e.target.value);
                setCompressUrl('');
              }}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            >
              <option value="">{t('dashboardPages.ai.externalOrNoProduct')}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.title}</option>
              ))}
            </select>
            {imageOptions.length > 0 && (
              <select
                value={compressUrl}
                onChange={(e) => setCompressUrl(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
              >
                {imageOptions.map((image) => (
                  <option key={image.url} value={image.url}>{image.label}</option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={compressUrl}
              onChange={(e) => setCompressUrl(e.target.value)}
              placeholder={t('dashboardPages.ai.imageUrlPlaceholder')}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <button
              type="button"
              onClick={handleCompress}
              disabled={compressing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-50"
            >
              {compressing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              {compressing ? t('dashboardPages.ai.compressing') : t('dashboardPages.ai.compress')}
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-950">{t('dashboardPages.ai.seoTitle')}</h2>
              <p className="text-xs font-semibold text-gray-400">{priceFor('seo_generation', 2)} {t('dashboardPages.ai.tokensPerProduct')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <select
              value={seoProductId}
              onChange={(e) => setSeoProductId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            >
              <option value="">{t('dashboardPages.ai.selectProduct')}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.title}</option>
              ))}
            </select>
            <select
              value={seoLanguage}
              onChange={(e) => setSeoLanguage(e.target.value as Language)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            >
              {Object.entries(languageLabelKeys).map(([value, key]) => (
                <option key={value} value={value}>{t(key)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSeoGenerate}
              disabled={generating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {generating ? t('dashboardPages.ai.generating') : t('dashboardPages.ai.generateSeo')}
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-red-50 p-3 text-[#7F1D1D]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-950">{t('dashboardPages.ai.pageCopyTitle')}</h2>
              <p className="text-xs font-semibold text-gray-400">{priceFor('page_copy', 2)} {t('dashboardPages.ai.tokensPerProposal')}</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder={t('dashboardPages.ai.pageTitlePlaceholder')}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <input
              type="text"
              value={currentSeoTitle}
              onChange={(e) => setCurrentSeoTitle(e.target.value)}
              placeholder={t('dashboardPages.ai.currentSeoTitlePlaceholder')}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <textarea
              value={currentSeoDescription}
              onChange={(e) => setCurrentSeoDescription(e.target.value)}
              placeholder={t('dashboardPages.ai.currentSeoDescriptionPlaceholder')}
              rows={2}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <textarea
              value={sectionOutline}
              onChange={(e) => setSectionOutline(e.target.value)}
              placeholder={t('dashboardPages.ai.sectionsPlaceholder')}
              rows={3}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            />
            <select
              value={copyLanguage}
              onChange={(e) => setCopyLanguage(e.target.value as Language)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
            >
              {Object.entries(languageLabelKeys).map(([value, key]) => (
                <option key={value} value={value}>{t(key)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handlePageCopy}
              disabled={copyGenerating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:opacity-50"
            >
              {copyGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {copyGenerating ? t('dashboardPages.ai.generating') : t('dashboardPages.ai.generateProposal')}
            </button>
          </div>
        </section>
      </div>

      {copySuggestions && (
        <section className="rounded-[2rem] border border-amber-100 bg-amber-50/60 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-[#7F1D1D]">{t('dashboardPages.ai.lastProposalTitle')}</h2>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(
                  `${copySuggestions.seo_title}\n${copySuggestions.seo_description}\n${copySuggestions.hero_title}\n${copySuggestions.cta}`,
                );
              }}
              className="rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-black text-[#B91C1C] transition hover:bg-amber-50"
            >
              {t('dashboardPages.ai.copy')}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.entries(copySuggestions).map(([key, value]) => (
              <div key={key} className="rounded-2xl bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">{t(`dashboardPages.ai.copyFields.${key}`)}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-slate-900/5">
        <div className="flex flex-col gap-4 border-b border-gray-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gray-50 p-3 text-gray-500">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-950">{t('dashboardPages.ai.historyTitle')}</h2>
              <p className="text-xs font-semibold text-gray-400">{meta?.total || jobs.length} {t('dashboardPages.ai.jobsRecorded')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={historyType}
              onChange={(e) => setHistoryType(e.target.value as 'all' | AiJobType)}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-700 outline-none focus:border-[#B91C1C]"
            >
              <option value="all">{t('dashboardPages.ai.allTypes')}</option>
              {Object.entries(typeLabelKeys).map(([value, key]) => (
                <option key={value} value={value}>{t(key)}</option>
              ))}
            </select>
            <select
              value={historyStatus}
              onChange={(e) => setHistoryStatus(e.target.value as 'all' | AiJobStatus)}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-700 outline-none focus:border-[#B91C1C]"
            >
              <option value="all">{t('dashboardPages.ai.allStatuses')}</option>
              {Object.entries(statusLabelKeys).map(([value, key]) => (
                <option key={value} value={value}>{t(key)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 text-xs font-black text-gray-600 transition hover:bg-gray-100"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t('dashboardPages.ai.refresh')}
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {jobs.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-gray-400">{t('dashboardPages.ai.noJobs')}</div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="p-5 transition hover:bg-amber-50/30">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-[#7F1D1D]">
                        <JobTypeIcon type={job.type} />
                        {t(typeLabelKeys[job.type]) || job.type}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${statusClass(job.status)}`}>
                        <StatusIcon status={job.status} />
                        {t(statusLabelKeys[job.status]) || job.status}
                      </span>
                    </div>
                    <p className="mt-3 truncate text-sm font-black text-gray-950">{jobTarget(job)}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-400">{formatDate(job.created_at, locale)} · {job.tokens_consumed || 0} {t('dashboardPages.ai.tokensUnit')}</p>
                    {job.error_message && (
                      <p className="mt-2 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">{job.error_message}</p>
                    )}
                    {job.status === 'completed' && job.output && (
                      <div className="mt-3 rounded-2xl bg-gray-50 p-3 text-xs text-gray-600">
                        {job.type === 'image_compression' && (
                          <div className="space-y-1">
                            <p className="font-bold text-gray-800">{t('dashboardPages.ai.outputLabels.gain')}: {String(job.output.saved_percent ?? 0)}%</p>
                            {asString(job.output.output_url) && (
                              <a
                                href={asString(job.output.output_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-black text-[#B91C1C]"
                              >
                                {t('dashboardPages.ai.viewCompressedImage')} <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                        {job.type === 'seo_generation' && (
                          <div className="space-y-1">
                            <p><span className="font-black text-gray-800">{t('dashboardPages.ai.outputLabels.title')}:</span> {asString(job.output.title)}</p>
                            <p><span className="font-black text-gray-800">{t('dashboardPages.ai.outputLabels.description')}:</span> {asString(job.output.description)}</p>
                          </div>
                        )}
                        {job.type === 'page_copy' && (
                          <div className="space-y-1">
                            <p><span className="font-black text-gray-800">{t('dashboardPages.ai.outputLabels.hero')}:</span> {asString(job.output.hero_title)}</p>
                            <p><span className="font-black text-gray-800">{t('dashboardPages.ai.outputLabels.cta')}:</span> {asString(job.output.cta)}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="shrink-0 rounded-full bg-gray-50 px-3 py-1 font-mono text-[11px] font-bold text-gray-400">{job.id.slice(-10)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {meta && meta.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 p-4">
            <button
              type="button"
              onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
              disabled={historyPage <= 1}
              className="rounded-full px-4 py-2 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
            >
              {t('dashboardPages.ai.previous')}
            </button>
            <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
              {t('dashboardPages.ai.page')} {meta.page} / {meta.total_pages}
            </span>
            <button
              type="button"
              onClick={() => setHistoryPage((page) => Math.min(meta.total_pages, page + 1))}
              disabled={historyPage >= meta.total_pages}
              className="rounded-full px-4 py-2 text-sm font-black text-[#B91C1C] transition hover:bg-amber-50 disabled:opacity-40"
            >
              {t('dashboardPages.ai.next')}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
