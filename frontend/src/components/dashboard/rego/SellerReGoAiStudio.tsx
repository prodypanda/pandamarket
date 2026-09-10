'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Zap,
  Image as ImageIcon,
  FileText,
  Check,
  Copy,
  AlertCircle,
  CheckCircle2,
  Clock,
  Coins,
  Settings,
  Key,
  ShieldCheck,
  Eye,
  History as HistoryIcon,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export type AiJobType = 'image_compression' | 'seo_generation' | 'page_copy' | 'product_description';
export type AiJobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type Language = 'fr' | 'ar' | 'en';
export type AiProvider = 'gemini' | 'openai' | 'claude' | 'custom';

export interface AiJob {
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

export interface Credits {
  ai_tokens: number;
  tokens_used: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text?: string | null;
  is_thumbnail?: boolean;
}

export interface Product {
  id: string;
  title: string;
  status: string;
  thumbnail?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  images?: ProductImage[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PageCopySuggestions {
  seo_title: string;
  seo_description: string;
  hero_title: string;
  cta: string;
}

export interface StoreAiProviderState {
  allowed: boolean;
  config: {
    provider: AiProvider;
    model: string;
    base_url: string | null;
    api_key_set: boolean;
    is_enabled: boolean;
  } | null;
}

export interface AiPricing {
  job_type: AiJobType;
  tokens_required: number;
}

export interface TokenPack {
  id: string;
  label: string;
  tokens: number;
  price_tnd: number;
}

export interface SellerReGoAiStudioProps {
  credits: Credits | null;
  jobs: AiJob[];
  products: Product[];
  meta: PaginationMeta | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  success: string;
  // Actions
  onRefresh: () => void;
  // Tool 1: Compression
  compressUrl: string;
  compressProductId: string;
  compressing: boolean;
  onCompressUrlChange: (url: string) => void;
  onCompressProductIdChange: (id: string) => void;
  onCompress: () => void;
  // Tool 2: SEO Generate
  seoProductId: string;
  seoLanguage: Language;
  generatingSeo: boolean;
  onSeoProductIdChange: (id: string) => void;
  onSeoLanguageChange: (lang: Language) => void;
  onSeoGenerate: () => void;
  // Tool 3: Page Copy
  copyLanguage: Language;
  pageTitle: string;
  currentSeoTitle: string;
  currentSeoDescription: string;
  sectionOutline: string;
  copyGenerating: boolean;
  copySuggestions: PageCopySuggestions | null;
  onCopyLanguageChange: (lang: Language) => void;
  onPageTitleChange: (v: string) => void;
  onCurrentSeoTitleChange: (v: string) => void;
  onCurrentSeoDescriptionChange: (v: string) => void;
  onSectionOutlineChange: (v: string) => void;
  onPageCopy: () => void;
  // History filters
  historyType: 'all' | AiJobType;
  historyStatus: 'all' | AiJobStatus;
  historyPage: number;
  onHistoryTypeChange: (t: 'all' | AiJobType) => void;
  onHistoryStatusChange: (s: 'all' | AiJobStatus) => void;
  onHistoryPageChange: (p: number) => void;
  // Token packs & BYOK
  pricing: AiPricing[];
  tokenPacks: TokenPack[];
  buyingPackId: string;
  onBuyTokenPack: (packId: string) => void;
  providerState: StoreAiProviderState | null;
  providerForm: {
    provider: AiProvider;
    model: string;
    base_url: string;
    api_key: string;
    is_enabled: boolean;
  };
  savingProvider: boolean;
  onProviderFormChange: React.Dispatch<React.SetStateAction<{
    provider: AiProvider;
    model: string;
    base_url: string;
    api_key: string;
    is_enabled: boolean;
  }>>;
  onSaveProvider: () => void;
  onDeleteProvider: () => void;
  dir?: 'ltr' | 'rtl';
}

const typeLabelKeys: Record<AiJobType, string> = {
  image_compression: 'dashboardPages.ai.typeImageCompression',
  seo_generation: 'dashboardPages.ai.typeSeoGeneration',
  page_copy: 'dashboardPages.ai.typePageCopy',
  product_description: 'dashboardPages.ai.typeProductDescription',
};

const statusLabelKeys: Record<AiJobStatus, string> = {
  queued: 'dashboardPages.ai.statusQueued',
  processing: 'dashboardPages.ai.statusProcessing',
  completed: 'dashboardPages.ai.statusCompleted',
  failed: 'dashboardPages.ai.statusFailed',
};

const languageLabelKeys: Record<Language, string> = {
  fr: 'dashboardPages.ai.langFr',
  ar: 'dashboardPages.ai.langAr',
  en: 'dashboardPages.ai.langEn',
};

const providerLabelKeys: Record<AiProvider, string> = {
  gemini: 'dashboardPages.ai.providerGemini',
  openai: 'dashboardPages.ai.providerOpenai',
  claude: 'dashboardPages.ai.providerClaude',
  custom: 'dashboardPages.ai.providerCustom',
};

export function SellerReGoAiStudio({
  credits,
  jobs,
  products,
  meta,
  loading,
  refreshing,
  error,
  success,
  onRefresh,
  compressUrl,
  compressProductId,
  compressing,
  onCompressUrlChange,
  onCompressProductIdChange,
  onCompress,
  seoProductId,
  seoLanguage,
  generatingSeo,
  onSeoProductIdChange,
  onSeoLanguageChange,
  onSeoGenerate,
  copyLanguage,
  pageTitle,
  currentSeoTitle,
  currentSeoDescription,
  sectionOutline,
  copyGenerating,
  copySuggestions,
  onCopyLanguageChange,
  onPageTitleChange,
  onCurrentSeoTitleChange,
  onCurrentSeoDescriptionChange,
  onSectionOutlineChange,
  onPageCopy,
  historyType,
  historyStatus,
  historyPage,
  onHistoryTypeChange,
  onHistoryStatusChange,
  onHistoryPageChange,
  pricing,
  tokenPacks,
  buyingPackId,
  onBuyTokenPack,
  providerState,
  providerForm,
  savingProvider,
  onProviderFormChange,
  onSaveProvider,
  onDeleteProvider,
  dir = 'ltr',
}: SellerReGoAiStudioProps) {
  const { t, locale } = useLocale();
  const [activeTab, setActiveTab] = useState<'copy' | 'seo' | 'compress' | 'history' | 'settings'>('copy');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<AiJob | null>(null);

  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const isUnlimited = credits?.ai_tokens === -1;
  const remainingTokens = isUnlimited
    ? '∞'
    : Math.max(0, (credits?.ai_tokens ?? 0) - (credits?.tokens_used ?? 0)).toLocaleString(dateLocale);
  const tokensUsed = (credits?.tokens_used ?? 0).toLocaleString(dateLocale);
  const completedJobsCount = jobs.filter((j) => j.status === 'completed').length;
  const activeJobsCount = jobs.filter((j) => j.status === 'queued' || j.status === 'processing').length;
  const priceFor = (type: AiJobType, fallback: number) => pricing.find((item) => item.job_type === type)?.tokens_required ?? fallback;

  const activeProviderLabel = providerState?.config?.provider
    ? t(providerLabelKeys[providerState.config.provider])
    : t('dashboardPages.ai.providerGemini');

  const tabButtonClass = (isActive: boolean) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
      isActive
        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
    }`;

  const formatJobDate = (value: string) =>
    new Date(value).toLocaleString(dateLocale, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: t('nav.home'), href: '/hub/dashboard' },
        { label: t('dashboardPages.ai.title'), href: '/hub/dashboard/ai' },
      ]}
      headerTitle={t('dashboardPages.ai.title')}
      headerSubtitle={t('dashboardPages.ai.subtitle')}
      headerIcon={Sparkles}
      statusBadge={
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <Zap className="w-3.5 h-3.5 text-indigo-500 fill-current" />
          <span>{activeProviderLabel}</span>
        </div>
      }
      primaryAction={
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? t('dashboardPages.ai.generating') : t('dashboardPages.ai.refresh')}</span>
        </button>
      }
      secondaryAction={
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs"
        >
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <span>{t('dashboardPages.ai.buyTokensTitle')}</span>
        </button>
      }
      alertBanner={
        error ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-rose-700 dark:text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : success ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        ) : undefined
      }
      kpiStrip={
        loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-slate-50 dark:bg-slate-900 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ReGoKpiHero
              label={t('dashboardPages.ai.balanceLabel')}
              value={remainingTokens}
              hint={isUnlimited ? t('dashboardPages.ai.unlimitedPlan') : t('dashboardPages.ai.tokensUnit')}
              icon={Sparkles}
              accent={true}
            />
            <ReGoKpiHero
              label={t('dashboardPages.ai.tokensUsed')}
              value={tokensUsed}
              icon={Coins}
            />
            <ReGoKpiHero
              label={t('dashboardPages.ai.statsCompleted')}
              value={String(completedJobsCount)}
              icon={CheckCircle2}
            />
            <ReGoKpiHero
              label={t('dashboardPages.ai.statsActive')}
              value={String(activeJobsCount)}
              icon={Clock}
            />
          </div>
        )
      }
      filterToolbar={
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button type="button" onClick={() => setActiveTab('copy')} className={tabButtonClass(activeTab === 'copy')}>
            <FileText className="w-4 h-4" />
            <span>{t('dashboardPages.ai.pageCopyTitle')}</span>
          </button>
          <button type="button" onClick={() => setActiveTab('seo')} className={tabButtonClass(activeTab === 'seo')}>
            <Sparkles className="w-4 h-4" />
            <span>{t('dashboardPages.ai.seoTitle')}</span>
          </button>
          <button type="button" onClick={() => setActiveTab('compress')} className={tabButtonClass(activeTab === 'compress')}>
            <ImageIcon className="w-4 h-4" />
            <span>{t('dashboardPages.ai.compressTitle')}</span>
          </button>
          <button type="button" onClick={() => setActiveTab('history')} className={tabButtonClass(activeTab === 'history')}>
            <HistoryIcon className="w-4 h-4" />
            <span>{t('dashboardPages.ai.historyTitle')} ({jobs.length})</span>
          </button>
          <button type="button" onClick={() => setActiveTab('settings')} className={tabButtonClass(activeTab === 'settings')}>
            <Settings className="w-4 h-4" />
            <span>{t('dashboardPages.ai.providerTitle')}</span>
          </button>
        </div>
      }
      mainContent={
        <div className="space-y-6">
          {/* TAB 1: PAGE COPY HELPER (real /api/pd/ai/page-copy-helper) */}
          {activeTab === 'copy' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <ReGoCard
                  title={t('dashboardPages.ai.pageCopyTitle')}
                  subtitle={t('dashboardPages.ai.subtitle')}
                  icon={FileText}
                  badge={
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {priceFor('page_copy', 2)} {t('dashboardPages.ai.tokensPerProposal')}
                    </span>
                  }
                >
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('dashboardPages.ai.pageTitlePlaceholder')} <span className="text-rose-500 dark:text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={pageTitle}
                        onChange={(e) => onPageTitleChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('dashboardPages.ai.currentSeoTitlePlaceholder')}
                      </label>
                      <input
                        type="text"
                        value={currentSeoTitle}
                        onChange={(e) => onCurrentSeoTitleChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('dashboardPages.ai.currentSeoDescriptionPlaceholder')}
                      </label>
                      <textarea
                        rows={2}
                        value={currentSeoDescription}
                        onChange={(e) => onCurrentSeoDescriptionChange(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('dashboardPages.ai.sectionsPlaceholder')}
                      </label>
                      <textarea
                        rows={3}
                        value={sectionOutline}
                        onChange={(e) => onSectionOutlineChange(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={copyLanguage}
                        onChange={(e) => onCopyLanguageChange(e.target.value as Language)}
                        className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                      >
                        {Object.entries(languageLabelKeys).map(([value, key]) => (
                          <option key={value} value={value}>{t(key)}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!pageTitle.trim() || copyGenerating}
                        onClick={onPageCopy}
                        className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
                      >
                        {copyGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{t('dashboardPages.ai.generating')}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>{t('dashboardPages.ai.generateProposal')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </ReGoCard>
              </div>

              <div className="lg:col-span-6 space-y-4">
                <ReGoCard
                  title={t('dashboardPages.ai.lastProposalTitle')}
                  subtitle={t('dashboardPages.ai.feedbackCopyGenerated')}
                  badge={
                    copySuggestions ? (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `${copySuggestions.seo_title}\n${copySuggestions.seo_description}\n${copySuggestions.hero_title}\n${copySuggestions.cta}`,
                            'copy_all',
                          )
                        }
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800"
                      >
                        {copiedKey === 'copy_all' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'copy_all' ? 'Copié !' : t('dashboardPages.ai.copy')}</span>
                      </button>
                    ) : undefined
                  }
                >
                  <div className="pt-2">
                    {copySuggestions ? (
                      <div className="space-y-2.5">
                        {Object.entries(copySuggestions).map(([key, value]) => (
                          <div
                            key={key}
                            onClick={() => copyToClipboard(String(value), `copy_${key}`)}
                            className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {t(`dashboardPages.ai.copyFields.${key}`)}
                              </span>
                              {copiedKey === `copy_${key}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                              {String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-14 text-center text-slate-400 dark:text-slate-600">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-semibold">{t('dashboardPages.ai.errorPageTitleRequired')}</p>
                      </div>
                    )}
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* TAB 2: SEO GENERATION (real /api/pd/ai/seo-generate) */}
          {activeTab === 'seo' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <ReGoCard
                  title={t('dashboardPages.ai.seoTitle')}
                  subtitle={t('dashboardPages.ai.feedbackSeoStarted')}
                  icon={Sparkles}
                  badge={
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {priceFor('seo_generation', 2)} {t('dashboardPages.ai.tokensPerProduct')}
                    </span>
                  }
                >
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('dashboardPages.ai.selectProduct')} <span className="text-rose-500 dark:text-rose-400">*</span>
                      </label>
                      <select
                        value={seoProductId}
                        onChange={(e) => onSeoProductIdChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                      >
                        <option value="">{t('dashboardPages.ai.selectProduct')}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <select
                      value={seoLanguage}
                      onChange={(e) => onSeoLanguageChange(e.target.value as Language)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                    >
                      {Object.entries(languageLabelKeys).map(([value, key]) => (
                        <option key={value} value={value}>{t(key)}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!seoProductId || generatingSeo}
                      onClick={onSeoGenerate}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      {generatingSeo ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{t('dashboardPages.ai.generating')}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>{t('dashboardPages.ai.generateSeo')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </ReGoCard>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <ReGoCard
                  title={t('dashboardPages.ai.lastProposalTitle')}
                  subtitle={t('dashboardPages.ai.feedbackSeoStarted')}
                >
                  <div className="pt-2 space-y-2.5">
                    {seoProductId ? (
                      (() => {
                        const selected = products.find((p) => p.id === seoProductId);
                        if (!selected) return null;
                        return (
                          <div className="space-y-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                                {t('dashboardPages.ai.copyFields.seo_title')}
                              </span>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {selected.seo_title || '—'}
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                                {t('dashboardPages.ai.copyFields.seo_description')}
                              </span>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {selected.seo_description || '—'}
                              </p>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="py-14 text-center text-slate-400 dark:text-slate-600">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-semibold">{t('dashboardPages.ai.selectProduct')}</p>
                      </div>
                    )}
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* TAB 3: COMPRESSION TOOL (real /api/pd/ai/compress) */}
          {activeTab === 'compress' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <ReGoCard
                  title={t('dashboardPages.ai.compressTitle')}
                  subtitle={t('dashboardPages.ai.feedbackCompressStarted')}
                  icon={ImageIcon}
                  badge={
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {priceFor('image_compression', 1)} {t('dashboardPages.ai.tokensPerImage')}
                    </span>
                  }
                >
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('dashboardPages.ai.externalOrNoProduct')}
                      </label>
                      <select
                        value={compressProductId}
                        onChange={(e) => onCompressProductIdChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                      >
                        <option value="">{t('dashboardPages.ai.externalOrNoProduct')}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('dashboardPages.ai.imageUrlPlaceholder')} <span className="text-rose-500 dark:text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={compressUrl}
                        onChange={(e) => onCompressUrlChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!compressUrl.trim() || compressing}
                      onClick={onCompress}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      {compressing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{t('dashboardPages.ai.compressing')}</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4" />
                          <span>{t('dashboardPages.ai.compress')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </ReGoCard>
              </div>

              <div className="lg:col-span-6 space-y-4">
                <ReGoCard
                  title={t('dashboardPages.ai.jobTargetImage')}
                  subtitle={t('dashboardPages.ai.viewCompressedImage')}
                >
                  <div className="pt-2">
                    {compressUrl ? (
                      <div className="aspect-video w-full rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={compressUrl}
                          alt="Preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video w-full rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-40" />
                        <span className="text-xs font-semibold">{t('dashboardPages.ai.imageUrlPlaceholder')}</span>
                      </div>
                    )}
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* TAB 4: HISTORY TABLE (real /api/pd/ai/history with filters) */}
          {activeTab === 'history' && (
            <ReGoCard
              title={t('dashboardPages.ai.historyTitle')}
              subtitle={`${meta?.total || jobs.length} ${t('dashboardPages.ai.jobsRecorded')}`}
              icon={HistoryIcon}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={historyType}
                    onChange={(e) => onHistoryTypeChange(e.target.value as 'all' | AiJobType)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-none"
                  >
                    <option value="all">{t('dashboardPages.ai.allTypes')}</option>
                    {Object.entries(typeLabelKeys).map(([value, key]) => (
                      <option key={value} value={value}>{t(key)}</option>
                    ))}
                  </select>
                  <select
                    value={historyStatus}
                    onChange={(e) => onHistoryStatusChange(e.target.value as 'all' | AiJobStatus)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold outline-none"
                  >
                    <option value="all">{t('dashboardPages.ai.allStatuses')}</option>
                    {Object.entries(statusLabelKeys).map(([value, key]) => (
                      <option key={value} value={value}>{t(key)}</option>
                    ))}
                  </select>
                </div>
              }
            >
              <div className="space-y-4 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">{t('dashboardPages.ai.allTypes')}</th>
                        <th className="py-2.5 px-3">{t('dashboardPages.ai.allStatuses')}</th>
                        <th className="py-2.5 px-3">{t('dashboardPages.ai.tokensUnit')}</th>
                        <th className="py-2.5 px-3">{t('dashboardPages.ai.page')}</th>
                        <th className="py-2.5 px-3 text-right">Détails</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                      {jobs.length > 0 ? (
                        jobs.map((job) => (
                          <tr key={job.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-3">
                              <span className="font-bold capitalize text-slate-900 dark:text-white">
                                {t(typeLabelKeys[job.type]) || job.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <ReGoStatusChip
                                label={t(statusLabelKeys[job.status]) || job.status}
                                status={
                                  job.status === 'completed'
                                    ? 'ok'
                                    : job.status === 'failed'
                                    ? 'err'
                                    : 'warn'
                                }
                              />
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                {job.tokens_consumed} {t('dashboardPages.ai.tokensUnit')}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                              {formatJobDate(job.created_at)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedJob(job)}
                                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            {t('dashboardPages.ai.noJobs')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {meta && meta.total_pages > 1 && (
                  <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                    <span>{t('dashboardPages.ai.page')} {historyPage} / {meta.total_pages}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={historyPage <= 1}
                        onClick={() => onHistoryPageChange(historyPage - 1)}
                        className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                      >
                        {t('dashboardPages.ai.previous')}
                      </button>
                      <button
                        type="button"
                        disabled={historyPage >= meta.total_pages}
                        onClick={() => onHistoryPageChange(historyPage + 1)}
                        className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                      >
                        {t('dashboardPages.ai.next')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </ReGoCard>
          )}

          {/* TAB 5: TOKEN PACKS & BYOK API KEY SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <ReGoCard
                title={t('dashboardPages.ai.buyTokensTitle')}
                subtitle={t('dashboardPages.ai.buyTokensSubtitle')}
                icon={Coins}
                badge={
                  isUnlimited ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                      {t('dashboardPages.ai.unlimitedPlan')}
                    </span>
                  ) : undefined
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {isUnlimited ? (
                    <div className="col-span-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t('dashboardPages.ai.unlimitedIncluded')}
                    </div>
                  ) : tokenPacks.length > 0 ? (
                    tokenPacks.map((pack) => (
                      <div
                        key={pack.id}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col justify-between gap-4"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{pack.label}</span>
                          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                            {pack.tokens.toLocaleString(dateLocale)} <span className="text-xs font-bold text-slate-400">{t('dashboardPages.ai.tokensUnit')}</span>
                          </div>
                          <div className="mt-2 text-sm font-black text-indigo-600 dark:text-indigo-400">
                            {pack.price_tnd.toFixed(3)} TND
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={buyingPackId === pack.id}
                          onClick={() => onBuyTokenPack(pack.id)}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                          {buyingPackId === pack.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                          <span>{t('dashboardPages.ai.buy')}</span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 py-6 text-center text-slate-400 text-xs">
                      {t('dashboardPages.ai.noPacks')}
                    </div>
                  )}
                </div>
              </ReGoCard>

              <ReGoCard
                title={t('dashboardPages.ai.providerTitle')}
                subtitle={t('dashboardPages.ai.providerSubtitle')}
                icon={Key}
                badge={
                  providerState?.config?.api_key_set ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                      {t('dashboardPages.ai.keyConfigured')}
                    </span>
                  ) : undefined
                }
              >
                {providerState && !providerState.allowed ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs font-bold text-amber-800 dark:text-amber-400">
                    {t('dashboardPages.ai.providerNotAllowed')}
                  </div>
                ) : (
                  <div className="space-y-4 pt-2 max-w-xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('dashboardPages.ai.providerTitle')}
                      </label>
                      <select
                        value={providerForm.provider}
                        onChange={(e) => onProviderFormChange((prev) => ({ ...prev, provider: e.target.value as AiProvider }))}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                      >
                        {Object.entries(providerLabelKeys).map(([value, key]) => (
                          <option key={value} value={value}>{t(key)}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('dashboardPages.ai.modelPlaceholder')}
                      </label>
                      <input
                        type="text"
                        value={providerForm.model}
                        onChange={(e) => onProviderFormChange((prev) => ({ ...prev, model: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('dashboardPages.ai.baseUrlPlaceholder')}
                      </label>
                      <input
                        type="text"
                        value={providerForm.base_url}
                        onChange={(e) => onProviderFormChange((prev) => ({ ...prev, base_url: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('dashboardPages.ai.apiKeyPlaceholder')}
                      </label>
                      <input
                        type="password"
                        value={providerForm.api_key}
                        onChange={(e) => onProviderFormChange((prev) => ({ ...prev, api_key: e.target.value }))}
                        placeholder={providerState?.config?.api_key_set ? t('dashboardPages.ai.newKeyPlaceholder') : t('dashboardPages.ai.apiKeyPlaceholder')}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        disabled={savingProvider}
                        onClick={onSaveProvider}
                        className="py-2.5 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                      >
                        {savingProvider ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        <span>{t('dashboardPages.ai.save')}</span>
                      </button>
                      {providerState?.config && (
                        <button
                          type="button"
                          disabled={savingProvider}
                          onClick={onDeleteProvider}
                          className="py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition-all disabled:opacity-50"
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </ReGoCard>
            </div>
          )}
        </div>
      }
      drawer={
        <ReGoDrawer
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title={t('dashboardPages.ai.historyTitle')}
          subtitle={selectedJob ? `Réf: ${selectedJob.id}` : ''}
        >
          {selectedJob && (
            <div className="space-y-4 text-xs font-medium text-slate-700 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">{t('dashboardPages.ai.allTypes')}:</span>
                  <span className="font-bold text-slate-900 dark:text-white capitalize">{t(typeLabelKeys[selectedJob.type]) || selectedJob.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">{t('dashboardPages.ai.allStatuses')}:</span>
                  <ReGoStatusChip
                    label={t(statusLabelKeys[selectedJob.status]) || selectedJob.status}
                    status={selectedJob.status === 'completed' ? 'ok' : selectedJob.status === 'failed' ? 'err' : 'warn'}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">{t('dashboardPages.ai.tokensUnit')}:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{selectedJob.tokens_consumed} {t('dashboardPages.ai.tokensUnit')}</span>
                </div>
              </div>

              {selectedJob.output && (
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">{t('dashboardPages.ai.lastProposalTitle')}:</span>
                  <pre className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedJob.output, null, 2)}
                  </pre>
                </div>
              )}

              {selectedJob.error_message && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400">
                  <span className="font-bold block mb-1">{t('dashboardPages.ai.statusFailed')}:</span>
                  {selectedJob.error_message}
                </div>
              )}
            </div>
          )}
        </ReGoDrawer>
      }
    />
  );
}
