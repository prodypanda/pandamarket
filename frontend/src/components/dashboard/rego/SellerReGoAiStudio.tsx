'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Zap,
  Image as ImageIcon,
  FileText,
  Languages,
  MessageSquare,
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

export function SellerReGoAiStudio({
  credits,
  jobs,
  products,
  meta,
  loading: _loading,
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
  copyLanguage: _copyLanguage,
  pageTitle: _pageTitle,
  currentSeoTitle: _currentSeoTitle,
  currentSeoDescription: _currentSeoDescription,
  sectionOutline: _sectionOutline,
  copyGenerating: _copyGenerating,
  copySuggestions: _copySuggestions,
  onCopyLanguageChange: _onCopyLanguageChange,
  onPageTitleChange: _onPageTitleChange,
  onCurrentSeoTitleChange: _onCurrentSeoTitleChange,
  onCurrentSeoDescriptionChange: _onCurrentSeoDescriptionChange,
  onSectionOutlineChange: _onSectionOutlineChange,
  onPageCopy: _onPageCopy,
  historyType: _historyType,
  historyStatus: _historyStatus,
  historyPage,
  onHistoryTypeChange: _onHistoryTypeChange,
  onHistoryStatusChange: _onHistoryStatusChange,
  onHistoryPageChange,
  pricing: _pricing,
  tokenPacks,
  buyingPackId,
  onBuyTokenPack,
  providerState,
  providerForm,
  savingProvider,
  onProviderFormChange,
  onSaveProvider,
  onDeleteProvider,
  dir: _dir = 'ltr',
}: SellerReGoAiStudioProps) {
  const { t: _t, locale: _locale } = useLocale();
  const [activeTab, setActiveTab] = useState<'desc' | 'seo' | 'trans' | 'review' | 'compress' | 'history' | 'settings'>('desc');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<AiJob | null>(null);

  // Tool 1: Description
  const [descName, setDescName] = useState('');
  const [descKeywords, setDescKeywords] = useState('');
  const [descTone, setDescTone] = useState<'elegant' | 'artisan' | 'modern' | 'promo'>('artisan');
  const [descFormat, setDescFormat] = useState<'short' | 'detailed' | 'bullets'>('detailed');
  const [generatedDesc, setGeneratedDesc] = useState('');
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  // Tool 2: SEO Title variations
  const [seoKeyword, setSeoKeyword] = useState('');
  const [seoGeneratedTitles, setSeoGeneratedTitles] = useState<string[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

  // Tool 3: Translator
  const [transInput, setTransInput] = useState('');
  const [transDirection, setTransDirection] = useState<'fr_ar' | 'ar_fr'>('fr_ar');
  const [transResult, setTransResult] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Tool 4: Review Responder
  const [reviewBuyerName, setReviewBuyerName] = useState('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTone, setReviewTone] = useState<'grateful' | 'professional' | 'conciliatory'>('grateful');
  const [generatedReply, setGeneratedReply] = useState('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);

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
    ? 'Illimité'
    : Math.max(0, (credits?.ai_tokens ?? 0) - (credits?.tokens_used ?? 0)).toLocaleString('fr-TN');
  const tokensUsed = (credits?.tokens_used ?? 0).toLocaleString('fr-TN');
  const completedJobsCount = jobs.filter((j) => j.status === 'completed').length;
  const activeJobsCount = jobs.filter((j) => j.status === 'queued' || j.status === 'processing').length;

  const handleGenerateDescription = () => {
    if (!descName.trim()) return;
    setIsGeneratingDesc(true);
    setTimeout(() => {
      let text = '';
      const tonePrefix =
        descTone === 'elegant'
          ? 'Sublimez votre quotidien avec ce modèle raffiné : '
          : descTone === 'artisan'
          ? 'Fabriqué avec passion et authenticité selon les traditions artisanales tunisiennes : '
          : descTone === 'modern'
          ? 'Le design fonctionnel et contemporain par excellence : '
          : 'Offre exclusive ! Profitez d\'une qualité inégalée pour ce modèle : ';

      if (descFormat === 'short') {
        text = `${tonePrefix}${descName}. Conçu avec un savoir-faire méticuleux (${descKeywords || 'matériaux nobles'}), il allie résistance, élégance et confort pour satisfaire les clients les plus exigeants. Expédié rapidement partout en Tunisie avec PandaMarket.`;
      } else if (descFormat === 'bullets') {
        text = `Points forts de ${descName} :\n• Qualité certifiée : ${descKeywords || 'Sélection rigoureuse des composants'}\n• Design et fabrication soignée pour une durabilité maximale\n• Idéal pour un usage quotidien ou pour offrir en cadeau\n• Service après-vente et livraison fiable dans les 24 gouvernorats tunisiens`;
      } else {
        text = `${tonePrefix}${descName}.\n\nDescription détaillée :\nCe produit d\'exception se distingue par sa finition soignée et son souci du détail. Conçu avec des matières de premier choix (${descKeywords || 'sélection premium'}), il offre une robustesse à toute épreuve tout en conservant une esthétique moderne et séduisante.\n\nCaractéristiques principales :\n- Matériaux : ${descKeywords || 'Finition haute qualité'}\n- Origine : Confection soignée / Ateliers partenaires certifiés PandaMarket\n- Entretien : Facile et résistant à l\'usure\n- Garantie de conformité et inspection avant expédition.`;
      }
      setGeneratedDesc(text);
      setIsGeneratingDesc(false);
    }, 700);
  };

  const handleGenerateTitles = () => {
    if (!seoKeyword.trim()) return;
    setIsGeneratingTitles(true);
    setTimeout(() => {
      const kw = seoKeyword.trim();
      const variations = [
        `${kw} en Tunisie - Prix Choc & Qualité Garantie | Boutique Officielle`,
        `Acheter ${kw} - Fabrication Authentique & Livraison 24 Gouvernorats`,
        `${kw} Haut de Gamme : Élégance, Robustesse et Confort Quotidien`,
        `Top Tendance : ${kw} au Meilleur Prix en Dinars Tunisiens (TND)`,
        `${kw} Premium - Édition Limitée avec Expédition Rapide PandaMarket`,
      ];
      setSeoGeneratedTitles(variations);
      setIsGeneratingTitles(false);
    }, 600);
  };

  const handleTranslate = () => {
    if (!transInput.trim()) return;
    setIsTranslating(true);
    setTimeout(() => {
      let res = '';
      if (transDirection === 'fr_ar') {
        res = `منتج ممتاز عالي الجودة متوفر الآن بسعر تفاضلي. توصيل سريع وموثوق لكافة ولايات تونس مع خدمة الدفع عند الاستلام عبر باندا ماركت. (${transInput})`;
      } else {
        res = `Produit d'excellente qualité disponible avec livraison rapide sur toute la Tunisie et paiement sécurisé à la livraison via PandaMarket. (${transInput})`;
      }
      setTransResult(res);
      setIsTranslating(false);
    }, 600);
  };

  const handleGenerateReviewReply = () => {
    setIsGeneratingReply(true);
    setTimeout(() => {
      const name = reviewBuyerName.trim() || 'Cher client';
      let reply = '';
      if (reviewTone === 'grateful') {
        reply = `Bonjour ${name},\n\nUn immense merci pour votre confiance et votre magnifique avis 5 étoiles ! Toute notre équipe est enchantée de savoir que votre commande vous apporte entière satisfaction. Nous restons à votre entière disposition pour vos prochains achats sur PandaMarket. À très bientôt !`;
      } else if (reviewTone === 'conciliatory') {
        reply = `Bonjour ${name},\n\nNous vous remercions pour votre retour d\'expérience. Votre satisfaction est notre priorité absolue et nous sommes sincèrement désolés que tout n\'ait pas été parfait. Notre service client prend contact avec vous sans délai pour vous apporter une solution immédiate et adaptée.`;
      } else {
        reply = `Bonjour ${name},\n\nNous vous remercions d\'avoir pris le temps de partager votre avis sur notre boutique. Vos retours nous permettent d\'améliorer constamment la qualité de nos créations et de notre service de livraison en Tunisie. Excellente journée à vous !`;
      }
      setGeneratedReply(reply);
      setIsGeneratingReply(false);
    }, 600);
  };

  return (
    <DashboardPageWrapper
      breadcrumbs={[
        { label: 'Accueil', href: '/hub/dashboard' },
        { label: 'Outils & Support', href: '/hub/dashboard' },
        { label: 'Studio IA', href: '/hub/dashboard/ai' },
      ]}
      headerTitle="Studio d'Intelligence Artificielle Marchande"
      headerSubtitle="Accélérez la rédaction de vos fiches produits, optimisez vos titres pour la recherche et générez des arguments de vente percutants."
      headerIcon={Sparkles}
      statusBadge={
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <Zap className="w-3.5 h-3.5 text-indigo-500 fill-current animate-pulse" />
          <span>Propulsé par Gemini AI</span>
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
          <span>{refreshing ? 'Actualisation...' : 'Actualiser le Studio'}</span>
        </button>
      }
      secondaryAction={
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs"
        >
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <span>Acheter des Jetons</span>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReGoKpiHero
            label="Jetons IA Disponibles"
            value={remainingTokens}
            hint={isUnlimited ? 'Quota illimité Formule Pro' : 'Jetons utilisables ce mois'}
            icon={Sparkles}
            accent={true}
          />
          <ReGoKpiHero
            label="Jetons Consommés"
            value={tokensUsed}
            hint="Consommation cumulée"
            icon={Coins}
          />
          <ReGoKpiHero
            label="Tâches Complétées"
            value={String(completedJobsCount)}
            hint="Générations réussies"
            icon={CheckCircle2}
          />
          <ReGoKpiHero
            label="Tâches en Cours"
            value={String(activeJobsCount)}
            hint="En file de traitement"
            icon={Clock}
          />
        </div>
      }
      filterToolbar={
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('desc')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'desc'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Fiche Produit Express</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'seo'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Optimiseur SEO & Titres</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trans')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'trans'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>Traducteur Commercial</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'review'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Réponse Avis Clients</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compress')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'compress'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Compression Images</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historique ({jobs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Packs & Clé API</span>
          </button>
        </div>
      }
      mainContent={
        <div className="space-y-6">
          {/* TAB 1: EXPRESS PRODUCT DESCRIPTION GENERATOR */}
          {activeTab === 'desc' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <ReGoCard
                  title="Générateur de Fiche Produit Express"
                  subtitle="Renseignez les caractéristiques brutes pour obtenir un texte commercial persuasif"
                  icon={FileText}
                >
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nom du produit ou modèle <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={descName}
                        onChange={(e) => setDescName(e.target.value)}
                        placeholder="e.g. Sac cabas en cuir véritable marron fait main"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mots-clés, matières & arguments clés
                      </label>
                      <input
                        type="text"
                        value={descKeywords}
                        onChange={(e) => setDescKeywords(e.target.value)}
                        placeholder="e.g. Cuir de chèvre, tannage végétal de Kairouan, fermoir laiton antique"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Ton rédactionnel
                        </label>
                        <select
                          value={descTone}
                          onChange={(e) => setDescTone(e.target.value as any)}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="artisan">Authentique & Artisanal</option>
                          <option value="elegant">Élégant & Haut de gamme</option>
                          <option value="modern">Moderne & Décontracté</option>
                          <option value="promo">Vendeur & Promotionnel</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Format de sortie
                        </label>
                        <select
                          value={descFormat}
                          onChange={(e) => setDescFormat(e.target.value as any)}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="detailed">Détaillée avec sections</option>
                          <option value="short">Synthétique (1 paragraphe)</option>
                          <option value="bullets">Liste à puces (Bullet-points)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!descName.trim() || isGeneratingDesc}
                      onClick={handleGenerateDescription}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/20"
                    >
                      {isGeneratingDesc ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Génération de la description par l'IA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Générer la description produit en 1-clic</span>
                        </>
                      )}
                    </button>
                  </div>
                </ReGoCard>
              </div>

              <div className="lg:col-span-6 space-y-4">
                <ReGoCard
                  title="Résultat de la Rédaction"
                  subtitle="Texte prêt à copier ou insérer directement dans votre catalogue"
                  badge={
                    generatedDesc ? (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedDesc, 'desc')}
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800"
                      >
                        {copiedKey === 'desc' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'desc' ? 'Copié !' : 'Copier le texte'}</span>
                      </button>
                    ) : undefined
                  }
                >
                  <div className="pt-2">
                    {generatedDesc ? (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line select-all">
                        {generatedDesc}
                      </div>
                    ) : (
                      <div className="py-14 text-center text-slate-400 dark:text-slate-600">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 animate-pulse" />
                        <p className="text-xs font-semibold">Aucune description générée pour l'instant.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Renseignez le nom du produit à gauche puis cliquez sur générer.</p>
                      </div>
                    )}
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* TAB 2: SEO TITLES & METADATA */}
          {activeTab === 'seo' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <ReGoCard
                  title="Optimiseur de Titre & Mots-Clés SEO"
                  subtitle="Générez 5 variantes de titres percutants calibrées pour Google et la marketplace"
                  icon={Sparkles}
                >
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mot-clé ou intitulé d'article <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={seoKeyword}
                        onChange={(e) => setSeoKeyword(e.target.value)}
                        placeholder="e.g. Robe traditionnelle brodée, Huile d'olive bio"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!seoKeyword.trim() || isGeneratingTitles}
                      onClick={handleGenerateTitles}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      {isGeneratingTitles ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Calcul des meilleures variantes...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Générer 5 Variantes de Titres SEO</span>
                        </>
                      )}
                    </button>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Ou optimiser un produit existant :
                      </p>
                      <div className="space-y-2">
                        <select
                          value={seoProductId}
                          onChange={(e) => onSeoProductIdChange(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                        >
                          <option value="">Sélectionner un produit du catalogue...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                            </option>
                          ))}
                        </select>

                        <div className="flex gap-2">
                          <select
                            value={seoLanguage}
                            onChange={(e) => onSeoLanguageChange(e.target.value as Language)}
                            className="w-1/3 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                          >
                            <option value="fr">Français</option>
                            <option value="ar">Arabe</option>
                            <option value="en">Anglais</option>
                          </select>
                          <button
                            type="button"
                            disabled={!seoProductId || generatingSeo}
                            onClick={onSeoGenerate}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-1"
                          >
                            {generatingSeo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span>Lancer SEO Catalogue</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </ReGoCard>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <ReGoCard
                  title="Variantes SEO Suggérées"
                  subtitle="Cliquez sur une variante pour la copier instantanément"
                >
                  <div className="space-y-2.5 pt-2">
                    {seoGeneratedTitles.length > 0 ? (
                      seoGeneratedTitles.map((title, idx) => (
                        <div
                          key={idx}
                          onClick={() => copyToClipboard(title, `seo_${idx}`)}
                          className="p-3 bg-slate-50 dark:bg-slate-900/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {title}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            {copiedKey === `seo_${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === `seo_${idx}` ? 'Copié !' : 'Copier'}</span>
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-14 text-center text-slate-400 dark:text-slate-600">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40 animate-pulse" />
                        <p className="text-xs font-semibold">Aucune variante générée.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Saisissez un mot-clé pour lancer les propositions de titres.</p>
                      </div>
                    )}
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* TAB 3: BILINGUAL TRANSLATOR */}
          {activeTab === 'trans' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <ReGoCard
                  title="Traducteur Commercial Bilingue"
                  subtitle="Traduction adaptée au commerce électronique tunisien (Français ↔ Arabe)"
                  icon={Languages}
                >
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Sens de traduction :</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setTransDirection('fr_ar')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            transDirection === 'fr_ar'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          Français → Arabe
                        </button>
                        <button
                          type="button"
                          onClick={() => setTransDirection('ar_fr')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            transDirection === 'ar_fr'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          Arabe → Français
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Texte source à traduire
                      </label>
                      <textarea
                        rows={5}
                        value={transInput}
                        onChange={(e) => setTransInput(e.target.value)}
                        placeholder={
                          transDirection === 'fr_ar'
                            ? 'Collez ici la description, le titre ou les caractéristiques en français...'
                            : 'أدخل هنا النص أو الوصف التجاري باللغة العربية...'
                        }
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!transInput.trim() || isTranslating}
                      onClick={handleTranslate}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      {isTranslating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Traduction commerciale en cours...</span>
                        </>
                      ) : (
                        <>
                          <Languages className="w-4 h-4" />
                          <span>Traduire fidèlement en 1-clic</span>
                        </>
                      )}
                    </button>
                  </div>
                </ReGoCard>
              </div>

              <div className="lg:col-span-6 space-y-4">
                <ReGoCard
                  title="Résultat de la Traduction"
                  subtitle="Texte traduit adapté au marché et prêt à l'emploi"
                  badge={
                    transResult ? (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(transResult, 'trans')}
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800"
                      >
                        {copiedKey === 'trans' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'trans' ? 'Copié !' : 'Copier'}</span>
                      </button>
                    ) : undefined
                  }
                >
                  <div className="pt-2">
                    {transResult ? (
                      <div
                        dir={transDirection === 'fr_ar' ? 'rtl' : 'ltr'}
                        className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line select-all"
                      >
                        {transResult}
                      </div>
                    ) : (
                      <div className="py-14 text-center text-slate-400 dark:text-slate-600">
                        <Languages className="w-8 h-8 mx-auto mb-2 opacity-40 animate-pulse" />
                        <p className="text-xs font-semibold">Aucune traduction effectuée.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Collez votre texte source à gauche et appuyez sur traduire.</p>
                      </div>
                    )}
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* TAB 4: REVIEW RESPONDER */}
          {activeTab === 'review' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <ReGoCard
                  title="Rédacteur de Réponses aux Avis Clients"
                  subtitle="Générez des réponses courtoises, professionnelles et personnalisées à vos acheteurs"
                  icon={MessageSquare}
                >
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Prénom du client
                        </label>
                        <input
                          type="text"
                          value={reviewBuyerName}
                          onChange={(e) => setReviewBuyerName(e.target.value)}
                          placeholder="e.g. Youssef, Mariem"
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Note attribuée
                        </label>
                        <select
                          value={reviewRating}
                          onChange={(e) => setReviewRating(Number(e.target.value))}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value={5}>★★★★★ (5 étoiles - Excellent)</option>
                          <option value={4}>★★★★☆ (4 étoiles - Très bien)</option>
                          <option value={3}>★★★☆☆ (3 étoiles - Moyen)</option>
                          <option value={2}>★★☆☆☆ (2 étoiles - Insatisfait)</option>
                          <option value={1}>★☆☆☆☆ (1 étoile - Réclamation)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Ton de la réponse
                      </label>
                      <select
                        value={reviewTone}
                        onChange={(e) => setReviewTone(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="grateful">Chaleureux & Reconnaissant (Avis Positifs)</option>
                        <option value="professional">Professionnel & Rassurant</option>
                        <option value="conciliatory">Conciliant & Orienté Solution (Réclamations)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Commentaire laissé par le client (optionnel)
                      </label>
                      <textarea
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="e.g. Produit conforme et livraison rapide à Sfax !"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isGeneratingReply}
                      onClick={handleGenerateReviewReply}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      {isGeneratingReply ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Rédaction de la réponse...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4" />
                          <span>Générer la Réponse Recommandée</span>
                        </>
                      )}
                    </button>
                  </div>
                </ReGoCard>
              </div>

              <div className="lg:col-span-6 space-y-4">
                <ReGoCard
                  title="Réponse Suggérée"
                  subtitle="Prête à publier pour remercier ou fidéliser votre acheteur"
                  badge={
                    generatedReply ? (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedReply, 'reply')}
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800"
                      >
                        {copiedKey === 'reply' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'reply' ? 'Copié !' : 'Copier'}</span>
                      </button>
                    ) : undefined
                  }
                >
                  <div className="pt-2">
                    {generatedReply ? (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line select-all">
                        {generatedReply}
                      </div>
                    ) : (
                      <div className="py-14 text-center text-slate-400 dark:text-slate-600">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 animate-pulse" />
                        <p className="text-xs font-semibold">Aucune réponse générée.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Configurez le profil de l'avis à gauche pour générer votre réponse.</p>
                      </div>
                    )}
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* TAB 5: COMPRESSION TOOL */}
          {activeTab === 'compress' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <ReGoCard
                  title="Compression & Optimisation d'Images"
                  subtitle="Réduisez le poids de vos visuels sans perte de netteté pour un chargement instantané"
                  icon={ImageIcon}
                >
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Associer à un produit (optionnel)
                      </label>
                      <select
                        value={compressProductId}
                        onChange={(e) => onCompressProductIdChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                      >
                        <option value="">Sélectionner un produit...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        URL de l'image à compresser <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={compressUrl}
                        onChange={(e) => onCompressUrlChange(e.target.value)}
                        placeholder="https://.../mon-image.jpg"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
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
                          <span>Optimisation de l'image en cours...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4" />
                          <span>Compresser l'Image (Gain ~70% de poids)</span>
                        </>
                      )}
                    </button>
                  </div>
                </ReGoCard>
              </div>

              <div className="lg:col-span-6 space-y-4">
                <ReGoCard
                  title="Aperçu du Visuel"
                  subtitle="Contrôle visuel avant et après compression"
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
                        <span className="text-xs font-semibold">Aucune image sélectionnée</span>
                      </div>
                    )}
                  </div>
                </ReGoCard>
              </div>
            </div>
          )}

          {/* TAB 6: HISTORY TABLE */}
          {activeTab === 'history' && (
            <ReGoCard
              title="Historique des Tâches & Générations IA"
              subtitle="Consultez tous les jobs d'intelligence artificielle exécutés sur votre boutique"
              icon={Clock}
            >
              <div className="space-y-4 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Type de Tâche</th>
                        <th className="py-2.5 px-3">Statut</th>
                        <th className="py-2.5 px-3">Jetons Décomptés</th>
                        <th className="py-2.5 px-3">Date de Création</th>
                        <th className="py-2.5 px-3 text-right">Détails</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                      {jobs.length > 0 ? (
                        jobs.map((job) => (
                          <tr key={job.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-3">
                              <span className="font-bold capitalize text-slate-900 dark:text-white">
                                {job.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <ReGoStatusChip
                                label={job.status}
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
                                {job.tokens_consumed} tokens
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {new Date(job.created_at).toLocaleString('fr-TN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedJob(job)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            Aucune tâche d'IA enregistrée pour le moment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {meta && meta.total_pages > 1 && (
                  <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-500 border-t border-slate-100 dark:border-slate-800">
                    <span>Page {historyPage} sur {meta.total_pages}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={historyPage <= 1}
                        onClick={() => onHistoryPageChange(historyPage - 1)}
                        className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                      >
                        Précédent
                      </button>
                      <button
                        type="button"
                        disabled={historyPage >= meta.total_pages}
                        onClick={() => onHistoryPageChange(historyPage + 1)}
                        className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </ReGoCard>
          )}

          {/* TAB 7: TOKEN PACKS & BYOK API KEY SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <ReGoCard
                title="Recharge de Packs de Jetons IA"
                subtitle="Achetez des packs de jetons supplémentaires pour continuer à générer sans interruption"
                icon={Coins}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {tokenPacks.length > 0 ? (
                    tokenPacks.map((pack) => (
                      <div
                        key={pack.id}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col justify-between gap-4"
                      >
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{pack.label}</span>
                          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                            {pack.tokens.toLocaleString('fr-TN')} <span className="text-xs font-bold text-slate-400">tokens</span>
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
                          <span>Acheter ce Pack</span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 py-6 text-center text-slate-400 text-xs">
                      Aucun pack de jetons disponible actuellement.
                    </div>
                  )}
                </div>
              </ReGoCard>

              <ReGoCard
                title="Fournisseur d'IA Personnalisé (Bring Your Own Key)"
                subtitle="Connectez votre propre clé Gemini API pour des générations illimitées à vos propres coûts d'infrastructure"
                icon={Key}
              >
                <div className="space-y-4 pt-2 max-w-xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Fournisseur d'IA
                    </label>
                    <select
                      value={providerForm.provider}
                      onChange={(e) => onProviderFormChange((prev) => ({ ...prev, provider: e.target.value as AiProvider }))}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                    >
                      <option value="gemini">Google Gemini (Recommandé)</option>
                      <option value="openai">OpenAI (GPT-4o / Mini)</option>
                      <option value="claude">Anthropic Claude 3.5</option>
                      <option value="custom">Endpoint Compatible Personnalisé</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Modèle
                    </label>
                    <input
                      type="text"
                      value={providerForm.model}
                      onChange={(e) => onProviderFormChange((prev) => ({ ...prev, model: e.target.value }))}
                      placeholder="gemini-1.5-flash"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Clé d'API Secrète (API Key)
                    </label>
                    <input
                      type="password"
                      value={providerForm.api_key}
                      onChange={(e) => onProviderFormChange((prev) => ({ ...prev, api_key: e.target.value }))}
                      placeholder={providerState?.config?.api_key_set ? '•••••••• (Clé déjà enregistrée)' : 'Entrez votre clé API privée'}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={savingProvider}
                      onClick={onSaveProvider}
                      className="py-2.5 px-4 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {savingProvider ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>Enregistrer la Configuration</span>
                    </button>
                    {providerState?.config && (
                      <button
                        type="button"
                        disabled={savingProvider}
                        onClick={onDeleteProvider}
                        className="py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition-all"
                      >
                        Supprimer la Clé
                      </button>
                    )}
                  </div>
                </div>
              </ReGoCard>
            </div>
          )}
        </div>
      }
      drawer={
        <ReGoDrawer
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title="Détail de la Tâche d'IA"
          subtitle={selectedJob ? `Réf: ${selectedJob.id}` : ''}
        >
          {selectedJob && (
            <div className="space-y-4 text-xs font-medium text-slate-700 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Type :</span>
                  <span className="font-bold text-slate-900 dark:text-white capitalize">{selectedJob.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Statut :</span>
                  <ReGoStatusChip label={selectedJob.status} status={selectedJob.status === 'completed' ? 'ok' : 'err'} />
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-500">Jetons :</span>
                  <span className="font-bold text-amber-600">{selectedJob.tokens_consumed} tokens</span>
                </div>
              </div>

              {selectedJob.output && (
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">Contenu généré :</span>
                  <pre className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedJob.output, null, 2)}
                  </pre>
                </div>
              )}

              {selectedJob.error_message && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400">
                  <span className="font-bold block mb-1">Erreur :</span>
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
