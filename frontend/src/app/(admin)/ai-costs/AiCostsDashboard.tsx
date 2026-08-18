'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
  Sparkles,
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

// ==========================================
// TYPES & DATA STRUCTURES
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

type AiProvider = 'gemini' | 'openai' | 'claude' | 'custom' | 'replicate';
type AiJobType = 'image_compression' | 'seo_generation' | 'page_copy' | 'product_description';
type TabKey = 'overview' | 'history' | 'routing' | 'providers' | 'prompts' | 'pricing';

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

const typeBadgeStyles: Record<string, { bg: string; text: string; border: string }> = {
  category_classification: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  product_description: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  product_smart_fill: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  product_tagging: { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  page_copy: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  seo_generation: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  image_compression: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  photo_studio: { bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-200 dark:border-fuchsia-800' },
};

const providerLabels: Record<AiProvider, { name: string; color: string; badge: string }> = {
  gemini: { name: 'Google Gemini', color: 'text-blue-600 bg-blue-50 border-blue-200', badge: 'bg-blue-600 text-white' },
  openai: { name: 'OpenAI GPT', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', badge: 'bg-emerald-600 text-white' },
  claude: { name: 'Anthropic Claude', color: 'text-amber-700 bg-amber-50 border-amber-200', badge: 'bg-amber-700 text-white' },
  replicate: { name: 'Replicate SDXL', color: 'text-purple-600 bg-purple-50 border-purple-200', badge: 'bg-purple-600 text-white' },
  custom: { name: 'Custom Endpoint', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', badge: 'bg-indigo-600 text-white' },
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

const DEFAULT_PROMPT_TEMPLATES = [
  {
    prompt_key: 'product_description',
    title: "Sublimer avec l'IA — Description Produit & Points Forts",
    tag: 'Copywriting & HTML Vendeur',
    description: "Rédige une description structurée en HTML avec points forts, bénéfices et accroche persuasive lors de l'utilisation du bouton 'Sublimer avec l'IA' par le vendeur.",
    system_prompt: `Vous êtes l'Expert Copywriter E-commerce & Concepteur-Rédacteur Merchandising d'Élite de PandaMarket.
Votre mission est de concevoir des fiches produits captivantes, vendeuses et hautement structurées, respectant les standards des plus grandes boutiques en ligne (Amazon A+, Shopify Plus, D2C).

Principes directeurs de rédaction :
1. Psychologie d'achat : Traduisez systématiquement chaque caractéristique technique en un bénéfice concret, émotionnel et rassurant pour l'acheteur.
2. Clarté & Hiérarchie Visuelle : Structurez le texte avec des balises HTML sémantiques strictes (<h3>, <p>, <strong>, <em>, <ul>, <li>) pour une lecture fluide et immédiate.
3. Authenticité & Confiance : Adoptez un ton raffiné, percutant et professionnel sans formulations creuses ni superlatifs mensongers.
4. Réponse JSON Stricte : Répondez TOUJOURS exclusivement par un objet JSON valide sans aucun texte additionnel.`,
    default_prompt: `Rédigez une description e-commerce hautement persuasive et structurée en HTML pour le produit suivant :

📦 INFORMATIONS PRODUIT :
- Titre : {title}
- Catégorie : {category}
- Attributs & Spécifications : {attributes}
- Description brute actuelle : {current_description}
- Langue ciblée : {language}
- Tonalité : {tone} (professionnel, élégant, séduisant et orienté conversion)

🎯 STRUCTURE HTML OBLIGATOIRE (pour "description_html") :
1. <p><strong>Accroche engageante :</strong> Mise en valeur du produit et de son bénéfice principal.</p>
2. <h3>✨ Points Forts & Avantages Clés</h3>
   <ul>
     <li><strong>Qualité & Conception :</strong> Confection soignée et matériaux de premier choix.</li>
     <li><strong>Praticité & Design :</strong> Utilisation intuitive et esthétique irréprochable.</li>
     <li><strong>Durabilité :</strong> Robuste et pensé pour durer dans le temps.</li>
   </ul>
3. <h3>📋 Spécifications & Détails Techniques</h3>
   <ul>
     <li>Spécifications précises issues des attributs et dimensions.</li>
   </ul>
4. <h3>💡 Conseils & Utilisation</h3>
   <p>Recommandations d'entretien, de mise en valeur ou conseils d'usage pratique.</p>

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE :
{
  "description_html": "<h3>...</h3><p>...</p><ul><li>...</li></ul>",
  "summary": "Une phrase d'accroche percutante et mémorable résumant l'essence du produit pour la vitrine."
}`,
    variables: ['{title}', '{category}', '{attributes}', '{current_description}', '{language}', '{tone}'],
  },
  {
    prompt_key: 'product_tagging',
    title: 'Auto-Tagging Sémantique Catalogue & Intérêts',
    tag: 'NLP & Semantic Tags',
    description: "Extrait 5 à 10 tags d'intérêt sémantiques normalisés pour chaque produit afin d'alimenter l'algorithme de recommandation et le flux d'intérêt acheteur du Hub.",
    system_prompt: `Vous êtes l'IA Analyste Sémantique et Taxonomie E-commerce de PandaMarket.
Votre rôle est d'analyser en profondeur les données des produits (titre, catégorie, description, matériaux, usage) et d'extraire entre 5 et 10 tags d'intérêt sémantiques normalisés pour alimenter l'algorithme de recommandation personnalisé et le flux d'intérêt acheteur.

Règles de normalisation des tags :
1. Format : Minuscules uniquement, sans accents, sans caractères spéciaux.
2. Mots composés : Séparés par des tirets (ex: "decoration-interieure", "fait-main", "cuir-veritable").
3. Couverture multi-dimensionnelle obligatoire : Nature du produit, matière/texture, usage/contexte, et style/thème.
4. Longueur : 2 à 30 caractères par tag.
5. Zéro redondance : Tags uniques, distincts et hautement pertinents.`,
    default_prompt: `Analysez le produit suivant et extrayez entre 5 et 10 tags sémantiques d'intérêt acheteur normalisés :

📦 PRODUIT :
- Titre : {title}
- Catégorie : {category}
- Description : {description}

RÈGLES STRICTES :
- Tous les tags doivent être en minuscules, sans accents, séparés par un tiret pour les mots composés.
- Couvrez : la nature du produit, le matériau, le domaine d'usage, et le style/thème.

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE :
{
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}`,
    variables: ['{title}', '{category}', '{description}'],
  },
  {
    prompt_key: 'product_smart_fill',
    title: 'Assistant Création Express — Smart Fill IA',
    tag: 'Génération Multi-Champs 360°',
    description: "À partir d'une simple photo, d'un titre brut ou de quelques mots-clés, génère l'intégralité des attributs, dimensions, tags, descriptions et spécifications en un seul appel.",
    system_prompt: `Vous êtes l'IA Super-Assistante de PandaMarket pour la création et la publication express de produits e-commerce.
À partir d'un ensemble minimal d'informations (une photo, un titre informel ou quelques mots-clés), votre rôle est d'inférer et de générer l'ensemble des champs d'une fiche produit complète, professionnelle et immédiatement publiable.`,
    default_prompt: `Générez une fiche produit complète et optimisée à partir des éléments fournis ci-dessous :

📦 ÉLÉMENTS BRUTS FOURNIS :
- Titre ou Mots-clés bruts : {raw_input}
- Image : {image_url}
- Catégorie suggérée : {category}
- Langue : {language}

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE :
{
  "optimized_title": "Titre Vendeur et Clair",
  "summary": "Accroche vitrine en 1 phrase.",
  "description_html": "<h3>...</h3><p>...</p><ul><li>...</li></ul>",
  "attributes": {
    "matiere": "Coton Bio / Acier / etc.",
    "couleur": "Noir / Doré / etc.",
    "style": "Moderne / Vintage"
  },
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`,
    variables: ['{raw_input}', '{image_url}', '{category}', '{language}'],
  },
  {
    prompt_key: 'photo_studio_background',
    title: 'Studio Photo & Remplacement de Fond',
    tag: 'Imagerie Studio HD',
    description: "Détoure le produit avec précision et l'intègre dans un décor studio haut de gamme avec ombres réalistes.",
    system_prompt: `Vous êtes un photographe studio produit et directeur de la photographie commerciale pour catalogues de luxe. Vous êtes spécialisé dans la mise en scène produit en haute définition, la gestion de l'éclairage de studio, le détourage ultra-précis et le rendu photoréaliste.`,
    default_prompt: `Photographie commerciale de produit haute définition avec détourage impeccable et intégration harmonieuse dans le décor suivant : {preset_description}.

Directives artistiques et techniques :
- Détourage précis sans artefact de contour ni halo
- Éclairage studio diffus et naturel (Softbox & Ring light), éliminant les reflets agressifs
- Ombres portées douces et réalistes respectant la perspective et le plan de pose
- Profondeur de champ équilibrée mettant en valeur la matière et les détails du produit
- Rendu 8k UHD net, propre, sans compression, optimisé pour conversion e-commerce`,
    variables: ['{preset_description}', '{title}'],
  },
  {
    prompt_key: 'photo_studio_gallery',
    title: 'Générateur de Mockups & Galerie Produit',
    tag: 'Lifestyle & Mockups',
    description: "Génère des visuels publicitaires lifestyle et des mockups de mise en situation réelle pour booster l'engagement.",
    system_prompt: `Vous êtes un directeur artistique e-commerce et photographe publicitaire spécialisé dans les visuels lifestyle et les mockups de mise en situation réelle.`,
    default_prompt: `Créez une prise de vue lifestyle publicitaire et authentique pour le produit "{title}".

Style visuel : {style_description}.

Directives de composition :
- Cadrage dynamique en situation réelle d'usage (lifestyle authentique ou studio moderne)
- Lumière ambiante naturelle et esthétique mettant en valeur le produit comme élément central
- Présentation haut de gamme renforçant le désir d'achat et la perception de valeur
- Résolution 4K ultra-nette, textures riches et fidélité absolue au produit`,
    variables: ['{title}', '{style_description}'],
  },
  {
    prompt_key: 'photo_studio_upscale',
    title: "Sublimateur d'Éclairage & Haute Définition",
    tag: 'Restauration & 4K UHD',
    description: 'Améliore la netteté, calibre la balance des blancs, sublime les textures et réhausse la lumière globale.',
    system_prompt: `Vous êtes un maître retoucheur numérique et étalonneur colorimétrique e-commerce spécialisé dans l'optimisation HD et la sublimation d'images produit.`,
    default_prompt: `Amélioration et restauration HD de la photographie du produit :
- Amplification de la netteté et micro-contrastes sur les textures et matériaux
- Équilibrage précis de la balance des blancs et réhaussement de la dynamique lumineuse
- Débruitage propre sans effet de lissage excessif
- Couleurs vibrantes, naturelles et fidèles à la réalité
- Rendu final cristal-net de qualité professionnelle 4K UHD`,
    variables: ['{title}'],
  },
  {
    prompt_key: 'page_copy',
    title: 'Générateur de Rédaction de Page Landing',
    tag: 'SEO & Copywriting',
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
    variables: ['{page_title}', '{language}'],
  },
  {
    prompt_key: 'category_classification',
    title: 'Classification Automatique de Catégories IA',
    tag: 'NLP & Taxonomie',
    description: "Analyse le titre et la description pour mapper la catégorie Hub Marketplace et créer ou sélectionner la catégorie vitrine boutique sur-mesure.",
    system_prompt: `Vous êtes un Expert en Classification Taxonomique & Merchandising E-commerce d'élite de PandaMarket.
Votre mission est d'analyser avec une précision chirurgicale le produit soumis (titre, description) et d'établir deux taxonomies distinctes :

1. 🌐 TAXONOMIE MARKETPLACE HUB (Globale, standardisée & contrainte) :
   - Vous devez OBLIGATOIREMENT choisir la catégorie ou sous-catégorie la plus spécifique parmi les catégories PandaMarket Hub fournies.
   - Renvoyez son "marketplace_category_id" exact et son "marketplace_category_name" exact.

2. 🏪 TAXONOMIE VITRINE BOUTIQUE (Merchandising libre, spécialisé & vendeur) :
   - La boutique privée du vendeur n'a AUCUNE contrainte de taxonomie standard.
   - Étape A : Examinez les catégories vitrine existantes du vendeur. Si l'une d'elles (catégorie ou sous-catégorie) correspond fidèlement au produit, réutilisez-la en indiquant son nom exact, son id et "created_new": false.
   - Étape B : Si AUCUNE catégorie existante ne convient précisément : NE CLONEZ PAS aveuglément la catégorie Marketplace Hub si elle est générique (ex: "Chaussures", "Mode", "Alimentation", "Électronique"). Créez un nom de catégorie vitrine sur-mesure, élégant, attractif et spécifique au créneau du produit (ex: "Sneakers & Baskets Sportswear", "Huiles d'Olive & Terroir", "Vases & Céramiques Émaillées", "Sacs en Cuir Artisanal", "Robes de Soirée & Caftans", etc.) et indiquez "created_new": true.
   - Étape C (Hiérarchie Vitrine) : Si le vendeur possède déjà une catégorie parente pertinente (ex: "Chaussures" ou "Maison"), vous pouvez définir "storefront_parent_category_id" avec l'ID de cette catégorie existante afin d'y imbriquer la nouvelle sous-catégorie créée.`,
    default_prompt: `Analysez le produit suivant et déterminez sa classification optimale pour le Hub et pour la Vitrine Boutique :

📦 PRODUIT À CLASSIFIER :
- Titre : {title}
- Description : {description}
- Langue : {language}

🌐 Catégories Marketplace Hub disponibles (choix contraint avec ID) :
{marketplace_categories}

🏪 Catégories Vitrine Boutique existantes du vendeur :
{storefront_categories}

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE SANS TEXTE ADDITIONNEL :
{
  "marketplace_category_id": "id exact de la catégorie du Hub choisie",
  "marketplace_category_name": "Nom exact de la catégorie du Hub",
  "storefront_category_name": "Nom de catégorie vitrine spécifique (existante ou créée sur-mesure)",
  "storefront_category_id": "id si catégorie vitrine existante, sinon null",
  "storefront_parent_category_id": "id de la catégorie parente vitrine existante si applicable, sinon null",
  "created_new": false,
  "confidence": 0.95
}`,
    variables: ['{title}', '{description}', '{marketplace_categories}', '{storefront_categories}', '{language}'],
  },
];

const PURPOSE_MODULES = [
  {
    key: 'product_description',
    icon: Sparkles,
    label: "Sublimer avec l'IA (Description Produit)",
    badge: 'Copywriting & HTML Vendeur',
    desc: 'Génération automatique de descriptions structurées en HTML (<h3>, <ul>, points forts, réassurance) pour le bouton "Sublimer avec l\'IA" de la fiche produit.',
  },
  {
    key: 'product_tagging',
    icon: Tag,
    label: 'Auto-Tagging Sémantique Catalogue',
    badge: 'Gemini NLP / Tags Intérêts',
    desc: 'Extraction sémantique automatique de 4 à 8 tags d’intérêt pour chaque produit publié et le flux personnalisé.',
  },
  {
    key: 'text_summarization',
    icon: Sparkles,
    label: 'Résumé & Analyse Brute',
    badge: 'NLP & Tokenization',
    desc: 'Analyse rapide des fiches produits, extraction des points clés et synthèse.',
  },
  {
    key: 'content_generation',
    icon: FileText,
    label: 'Génération de Fiche & HTML',
    badge: 'Copywriting & SEO',
    desc: 'Rédaction intelligente des titres commerciaux, descriptions HTML riches et balises.',
  },
  {
    key: 'image_generation',
    icon: Wand2,
    label: "Génération d'Images & Mockups",
    badge: 'Diffusion & Photoréalisme',
    desc: 'Création de visuels publicitaires, décors studio et mises en situation réelles.',
  },
  {
    key: 'image_upscaling',
    icon: Layers,
    label: 'Upscaling & Clarté 4K',
    badge: 'Résolution & Débruitage',
    desc: 'Amélioration de la netteté, restitution des textures et agrandissement HD.',
  },
  {
    key: 'image_enhancement',
    icon: Zap,
    label: 'Sublimation Photo Studio',
    badge: 'Colorimétrie & Lumière',
    desc: 'Étalonnage de la balance des blancs, éclairage de studio et micro-contrastes.',
  },
  {
    key: 'image_background_removal',
    icon: Activity,
    label: 'Détourage Intelligent',
    badge: 'Segmentation & Masque',
    desc: 'Détourage précis sans halo ni artefact pour intégration studio.',
  },
  {
    key: 'category_classification',
    icon: FolderTree,
    label: 'Classification Automatique de Catégories (NLP & Taxonomie)',
    badge: 'Classification & Taxonomie Multi-Niveaux',
    desc: "Analyse le titre et la description pour sélectionner la catégorie Hub optimale et créer/assigner la catégorie vitrine boutique.",
  },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AiCostsDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [stats, setStats] = useState<AiStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [configMessage, setConfigMessage] = useState('');

  // Providers & Pricing state
  const [providers, setProviders] = useState<AiProviderConfig[]>([]);
  const [pricing, setPricing] = useState<AiPricing[]>([]);
  const [providerForm, setProviderForm] = useState({ ...emptyProviderForm });
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Purpose Routing state
  const [purposeRouting, setPurposeRouting] = useState<
    Array<{ purpose: string; provider_config_id: string | null; provider_label: string; model: string | null }>
  >([]);
  const [savingPurposeKey, setSavingPurposeKey] = useState<string | null>(null);
  const [savedPurposeKeys, setSavedPurposeKeys] = useState<Record<string, boolean>>({});

  // Prompt Templates state
  const [promptTemplates, setPromptTemplates] = useState(DEFAULT_PROMPT_TEMPLATES);
  const [selectedPromptKey, setSelectedPromptKey] = useState<string>('product_smart_fill');
  const [editingSystemPrompt, setEditingSystemPrompt] = useState<string>(DEFAULT_PROMPT_TEMPLATES[0].system_prompt);
  const [editingDefaultPrompt, setEditingDefaultPrompt] = useState<string>(DEFAULT_PROMPT_TEMPLATES[0].default_prompt);
  const [savingPrompt, setSavingPrompt] = useState<boolean>(false);
  const [promptMessage, setPromptMessage] = useState<string>('');

  // Sandbox Test state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testInputTitle, setTestInputTitle] = useState('Montre Chronographe Automatique Panda Luxury');
  const [testInputDesc, setTestInputDesc] = useState('Boîtier acier 42mm, étanche 100m, verre saphir, mouvement suisse');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testingAi, setTestingAi] = useState(false);

  // Activity Log State (Overview)
  const [activityFilter, setActivityFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [failureSearch, setFailureSearch] = useState('');

  // History Tab state
  const [historyJobs, setHistoryJobs] = useState<AiJobRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 20,
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
  const [historySortBy, setHistorySortBy] = useState<string>('created_at');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');

  // Inspection Drawer state
  const [selectedJob, setSelectedJob] = useState<AiJobRecord | null>(null);
  const [inspectionDrawerOpen, setInspectionDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'input' | 'output' | 'trace'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Restore saved tab
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pandamarket_admin_aicosts_tab');
      if (saved && ['overview', 'history', 'routing', 'providers', 'prompts', 'pricing'].includes(saved)) {
        setActiveTab(saved as TabKey);
      }
    } catch {}
  }, []);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('pandamarket_admin_aicosts_tab', tab);
    } catch {}
  };

  const copyToClipboard = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
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
    setInspectionDrawerOpen(true);
  };

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/admin/ai-config', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setProviders(Array.isArray(data.providers) ? data.providers : []);
        setPricing(Array.isArray(data.pricing) ? data.pricing : []);
      }

      // Fetch Purpose Routing
      const routeRes = await fetchWithCsrf('/api/pd/admin/ai/purpose-routing', { credentials: 'include' });
      const routeData = await routeRes.json().catch(() => ({}));
      if (routeRes.ok && Array.isArray(routeData.routing)) {
        setPurposeRouting(routeData.routing);
      }

      // Fetch Prompts
      const promptRes = await fetchWithCsrf('/api/pd/admin/ai/prompts', { credentials: 'include' });
      const promptData = await promptRes.json().catch(() => ({}));
      if (promptRes.ok && Array.isArray(promptData.templates) && promptData.templates.length > 0) {
        setPromptTemplates((prev) =>
          prev.map((tpl) => {
            const remote = promptData.templates.find((t: any) => t.prompt_key === tpl.prompt_key);
            return remote ? { ...tpl, system_prompt: remote.system_prompt, default_prompt: remote.default_prompt } : tpl;
          }),
        );
      }
    } catch {
      // Fallback to local defaults
    }
  }, []);

  const fetchStats = useCallback(
    async (background = false) => {
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
          recent_activity: Array.isArray(data.recent_activity) ? data.recent_activity : [],
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
    },
    [fetchConfig],
  );

  const fetchHistory = useCallback(
    async (
      page = 1,
      overrides?: {
        search?: string;
        status?: string;
        type?: string;
        store_id?: string;
        limit?: number;
      },
    ) => {
      setHistoryLoading(true);
      try {
        const currentLimit = overrides?.limit || historyPagination.limit || 20;
        const currentStatus = overrides?.status !== undefined ? overrides.status : historyStatus;
        const currentType = overrides?.type !== undefined ? overrides.type : historyType;
        const currentStoreId = overrides?.store_id !== undefined ? overrides.store_id : historyStoreId;
        const currentSearch = overrides?.search !== undefined ? overrides.search : historySearch;

        const queryParams = new URLSearchParams({
          page: String(page),
          limit: String(currentLimit),
          status: currentStatus,
          type: currentType,
          store_id: currentStoreId,
          search: currentSearch,
          sort_by: historySortBy,
          sort_order: historySortOrder,
        });

        const res = await fetchWithCsrf(`/api/pd/admin/ai-jobs?${queryParams.toString()}`, {
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.data)) {
          setHistoryJobs(data.data);
          if (data.pagination) setHistoryPagination(data.pagination);
          if (data.summary) setHistorySummary(data.summary);
        }
      } catch {
        // Silent error
      } finally {
        setHistoryLoading(false);
      }
    },
    [historyPagination.limit, historyStatus, historyType, historyStoreId, historySearch, historySortBy, historySortOrder],
  );

  const openHistoryForStore = (storeId: string, storeName: string) => {
    setHistoryStoreId(storeId);
    setHistoryStoreName(storeName);
    setHistorySearch('');
    setHistoryStatus('all');
    setHistoryType('all');
    handleTabChange('history');
    void fetchHistory(1, { store_id: storeId, search: '', status: 'all', type: 'all' });
  };

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'history') {
      void fetchHistory(historyPagination.page);
    }
  }, [activeTab, fetchHistory, historyPagination.page]);

  // Provider Actions
  const resetProviderForm = () => {
    setProviderForm({ ...emptyProviderForm });
    setShowProviderModal(true);
  };

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
    setShowProviderModal(true);
  };

  const saveProvider = async () => {
    setSavingConfig(true);
    setError('');
    setConfigMessage('');
    try {
      const payload = {
        provider: providerForm.provider,
        label: providerForm.label.trim(),
        model: providerForm.model.trim(),
        base_url: providerForm.base_url.trim() || null,
        api_key: providerForm.api_key.trim() || undefined,
        is_enabled: providerForm.is_enabled,
        is_default: providerForm.is_default,
        priority: Number(providerForm.priority) || 100,
      };

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
      if (!res.ok) throw new Error(data.error?.message || 'Enregistrement impossible');

      await fetchConfig();
      setShowProviderModal(false);
      setConfigMessage(isEditing ? 'Fournisseur IA mis à jour avec succès.' : 'Nouveau fournisseur IA ajouté.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingConfig(false);
    }
  };

  const deleteProvider = async (id: string) => {
    setDeletingId(id);
    setError('');
    setConfigMessage('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/ai-providers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Suppression impossible');
      await fetchConfig();
      setConfigMessage('Fournisseur IA supprimé.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setDeletingId(null);
    }
  };

  // Purpose Routing Action with instant optimistic update
  const updatePurposeRouting = async (purpose: string, providerConfigId: string | null) => {
    const targetProvider = providers.find((p) => p.id === providerConfigId);

    // Optimistic UI state update
    setPurposeRouting((prev) => {
      const idx = prev.findIndex((r) => r.purpose === purpose);
      const updatedItem = {
        purpose,
        provider_config_id: providerConfigId,
        provider_label: targetProvider ? `${targetProvider.label} (${providerLabels[targetProvider.provider].name} - ${targetProvider.model})` : 'Pile de Priorité Défaut',
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
        setConfigMessage(`Routage assigné avec succès pour "${purpose}".`);
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

  // Prompt Templates Actions
  const handleSelectPrompt = (key: string) => {
    setSelectedPromptKey(key);
    const target = promptTemplates.find((t) => t.prompt_key === key);
    if (target) {
      setEditingSystemPrompt(target.system_prompt || '');
      setEditingDefaultPrompt(target.default_prompt || '');
      setPromptMessage('');
    }
  };

  const insertVariable = (varName: string) => {
    setEditingDefaultPrompt((prev) => prev + ` ${varName}`);
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
        setPromptTemplates((prev) => prev.map((t) => (t.prompt_key === selectedPromptKey ? { ...t, ...data.template } : t)));
        setPromptMessage('Prompt système et modèle d’exécution enregistrés avec succès !');
        setTimeout(() => setPromptMessage(''), 4000);
      } else {
        throw new Error(data.error?.message || "Erreur d'enregistrement");
      }
    } catch (err) {
      setPromptMessage(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingPrompt(false);
    }
  };

  // Pricing Actions
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
      setConfigMessage('Tarification des tokens mise à jour avec succès.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setSavingConfig(false);
    }
  };

  // Sandbox Test Generator Simulator
  const runSandboxTest = () => {
    setTestingAi(true);
    setTestOutput(null);
    setTimeout(() => {
      setTestOutput(
        JSON.stringify(
          {
            suggested_title: `${testInputTitle} - Édition Spéciale 2026`,
            suggested_description: `<h3>Excellence & Précision Horlogère</h3>\n<p>Découvrez l'élégance intemporelle de la <strong>${testInputTitle}</strong>. Conçue avec des matériaux nobles pour les passionnés d'horlogerie exigeants.</p>\n<ul>\n  <li><strong>Boîtier :</strong> ${testInputDesc}</li>\n  <li><strong>Précision :</strong> Calibre automatique certifié avec réserve de marche 48h</li>\n  <li><strong>Garantie :</strong> Garantie internationale 2 ans PandaMarket Concierge</li>\n</ul>`,
            suggested_hub_category_name: 'Bijouterie & Horlogerie',
            suggested_hub_subcategory_name: 'Montres Homme Automatiques',
            suggested_storefront_category: 'Montres Luxe',
            suggested_storefront_subcategory: 'Modèles Sport-Chic',
            execution_telemetry: {
              active_engine: providers[0]?.label || 'Environment Gemini fallback',
              latency_ms: 385,
              tokens_consumed: 2,
              status: 'success',
            },
          },
          null,
          2,
        ),
      );
      setTestingAi(false);
    }, 900);
  };

  const maxDailyTokens = useMemo(() => Math.max(...stats.daily_usage.map((day) => day.tokens), 1), [stats.daily_usage]);
  const activeProvidersCount = useMemo(() => providers.filter((p) => p.is_enabled).length, [providers]);
  const configuredRoutesCount = useMemo(() => purposeRouting.filter((r) => r.provider_config_id).length, [purposeRouting]);



  const selectedTemplate = useMemo(
    () => promptTemplates.find((t) => t.prompt_key === selectedPromptKey) || promptTemplates[0],
    [promptTemplates, selectedPromptKey],
  );

  return (
    <div className="space-y-6">
      {/* 1. MINIMALIST GOVERNANCE HEADER */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-[#B91C1C] text-white shadow-md shadow-red-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#B91C1C]">
                  Superadmin Hub
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Moteurs Connectés: <strong className="text-slate-800 dark:text-slate-200">{activeProvidersCount}</strong>
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Gouvernance IA & Gestion des Coûts
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                Supervision du routage multi-moteurs, prompts système, clés API et consommation de tokens.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setTestModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
            >
              <Terminal className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Tester un Prompt IA
            </button>
            <button
              type="button"
              onClick={resetProviderForm}
              className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2 text-xs font-black text-white hover:bg-[#991B1B] shadow-sm shadow-red-500/20 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouveau Moteur IA
            </button>
            <button
              type="button"
              onClick={() => void fetchStats(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#B91C1C]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50/90 dark:bg-red-950/30 p-3 text-xs font-bold text-red-700 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {configMessage && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 dark:bg-emerald-950/30 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>{configMessage}</span>
            </div>
            <button type="button" onClick={() => setConfigMessage('')} className="p-1 hover:bg-emerald-100 rounded">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* 2. MODULAR NAVIGATION TABS */}
        <div className="mt-6 flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          {[
            { id: 'overview', label: "Vue d'Ensemble & Métriques", icon: BarChart3, badge: `${stats.total_jobs} jobs` },
            { id: 'history', label: 'Historique des Requêtes & Logs', icon: History, badge: `${historySummary.total || stats.total_jobs} requêtes` },
            { id: 'routing', label: 'Routage par Usage', icon: Sparkles, badge: `${configuredRoutesCount}/6 assignés` },
            { id: 'providers', label: 'Fournisseurs & Clés API', icon: Server, badge: `${providers.length} moteurs` },
            { id: 'prompts', label: 'Prompts Système & Studio', icon: FileCode, badge: `${promptTemplates.length} templates` },
            { id: 'pricing', label: 'Tarification & Wallets', icon: Coins, badge: `${pricing.length} modules` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as TabKey)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <tab.icon className={`h-3.5 w-3.5 ${isActive ? 'text-[#B91C1C] dark:text-[#B91C1C]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                    isActive
                      ? 'bg-white/20 dark:bg-black/10 text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Tokens Aujourd&apos;hui</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.tokens_today.toLocaleString()}
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Total historique: <strong>{stats.total_tokens_consumed.toLocaleString()}</strong> tokens
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Coût Estimé Plateforme</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.estimated_cost_tnd.toFixed(3)} <span className="text-xs font-bold text-slate-400">TND</span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Sur la base des tokens et modèles exécutés
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">File & Exécution Active</span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  <Clock3 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.processing_jobs + stats.queued_jobs}
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                {stats.processing_jobs} en traitement · {stats.queued_jobs} en attente
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Taux d&apos;Échec</span>
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.total_jobs > 0 ? ((stats.failed_jobs / stats.total_jobs) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                {stats.failed_jobs} échecs sur {stats.total_jobs} requêtes
              </p>
            </div>
          </div>

          {/* 30-Day Activity Chart & Top Consumers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Consommation des 30 Derniers Jours</h2>
                  <p className="text-xs text-slate-500 font-medium">Volumétrie journalière des tokens et requêtes IA</p>
                </div>
                <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                  {stats.jobs_today} requêtes aujourd&apos;hui
                </span>
              </div>

              {loading ? (
                <div className="h-48 animate-pulse rounded-xl bg-slate-50 dark:bg-slate-800" />
              ) : stats.daily_usage.length > 0 ? (
                <div>
                  <div className="flex h-44 items-end gap-1 pt-4">
                    {stats.daily_usage.map((day, i) => {
                      const height = (day.tokens / maxDailyTokens) * 100;
                      return (
                        <div key={day.date} className="group relative flex-1" title={`${day.date}: ${day.tokens} tokens, ${day.jobs} jobs`}>
                          <div
                            className={`w-full rounded-t transition-all duration-300 ${
                              i === stats.daily_usage.length - 1
                                ? 'bg-[#B91C1C]'
                                : 'bg-slate-200 dark:bg-slate-700 hover:bg-[#B91C1C]/70'
                            }`}
                            style={{ height: `${Math.max(height, 4)}%` }}
                          />
                          <div className="absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 group-hover:block">
                            <div className="whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] text-white shadow-xl">
                              <p className="font-bold">{new Date(day.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</p>
                              <p className="text-amber-300 font-black">{day.tokens} tokens</p>
                              <p className="text-slate-400">{day.jobs} jobs</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-between text-[10px] font-bold text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span>{new Date(stats.daily_usage[0]?.date).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' })}</span>
                    <span>Aujourd&apos;hui</span>
                  </div>
                </div>
              ) : (
                <div className="flex h-44 items-center justify-center text-xs font-semibold text-slate-400">
                  Aucun historique de consommation enregistré.
                </div>
              )}
            </div>

            {/* Top Store Consumers (Interactive & Clickable) */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Boutiques les Plus Consommatrices</h2>
                  <p className="text-[11px] text-slate-400">Cliquez pour filtrer les requêtes IA</p>
                </div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Top {stats.top_consumers.length}</span>
              </div>

              {stats.top_consumers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-semibold">Aucune boutique active enregistrée.</div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {stats.top_consumers.slice(0, 6).map((consumer, i) => (
                    <div
                      key={consumer.store_id}
                      onClick={() => openHistoryForStore(consumer.store_id, consumer.store_name)}
                      className="group flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-red-50/40 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-900/50 cursor-pointer transition-all text-xs"
                      title={`Voir l'historique complet des requêtes de ${consumer.store_name}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-300 group-hover:bg-[#B91C1C] group-hover:text-white transition-colors">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-[#B91C1C] transition-colors truncate">
                              {consumer.store_name}
                            </p>
                            <Link
                              href={`/stores?search=${encodeURIComponent(consumer.store_name)}`}
                              onClick={(e) => e.stopPropagation()}
                              target="_blank"
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                              title="Ouvrir la fiche boutique"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {consumer.job_count} requêtes · <span className="text-[#B91C1C] font-semibold">Filtrer logs</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-[#B91C1C] flex-shrink-0">
                          {consumer.tokens_used.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">tok</span>
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#B91C1C] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Usage by Type & Queue Health */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <BarChart3 className="w-4 h-4 text-[#B91C1C]" />
                <h3 className="text-sm font-black">Consommation par Type</h3>
              </div>
              <div className="space-y-2.5">
                {stats.by_type.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Aucune donnée</p>
                ) : (
                  stats.by_type.map((item) => (
                    <div key={item.type} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>{typeLabels[item.type] || item.type}</span>
                        <span className="text-[#B91C1C] font-black">{item.count} jobs</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{item.tokens.toLocaleString()} tokens consommés</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Activity className="w-4 h-4 text-[#B91C1C]" />
                <h3 className="text-sm font-black">Santé de la File d&apos;Attente</h3>
              </div>
              <div className="space-y-2.5">
                {stats.by_status.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Aucune tâche en file</p>
                ) : (
                  stats.by_status.map((item) => (
                    <div key={item.status} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                      <span className="font-bold capitalize text-slate-700 dark:text-slate-300">{item.status}</span>
                      <span className="font-black text-slate-900 dark:text-white text-sm">{item.count.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <WalletCards className="w-4 h-4 text-[#B91C1C]" />
                <h3 className="text-sm font-black">Portefeuilles & Crédits Vendeurs</h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                  <p className="text-[10px] font-bold text-amber-700 uppercase">Wallets Actifs</p>
                  <p className="mt-1 text-lg font-black text-amber-900 dark:text-amber-300">{stats.credits.active_wallets}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                  <p className="text-[10px] font-bold text-purple-700 uppercase">Forfaits Illimités</p>
                  <p className="mt-1 text-lg font-black text-purple-900 dark:text-purple-300">{stats.credits.unlimited_wallets}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <p className="text-[10px] font-bold text-blue-700 uppercase">Solde Restant</p>
                  <p className="mt-1 text-lg font-black text-blue-900 dark:text-blue-300">{stats.credits.finite_tokens_remaining.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">Tokens Utilisés</p>
                  <p className="mt-1 text-lg font-black text-emerald-900 dark:text-emerald-300">{stats.credits.tokens_used.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Activity Log (Recent Successes & Failures) */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Journal Récent des Opérations IA</h3>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:text-slate-400">
                    Dernières exécutions
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Flux en direct des requêtes IA, statut d&apos;exécution, tokens consommés et diagnostics</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Filter Pills */}
                <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                  {(['all', 'completed', 'failed'] as const).map((filterKey) => {
                    const isActive = activityFilter === filterKey;
                    const count =
                      filterKey === 'all'
                        ? (stats.recent_activity || []).length
                        : filterKey === 'completed'
                          ? (stats.recent_activity || []).filter((j) => j.status === 'completed').length
                          : (stats.recent_activity || []).filter((j) => j.status === 'failed').length;

                    return (
                      <button
                        key={filterKey}
                        type="button"
                        onClick={() => setActivityFilter(filterKey)}
                        className={`rounded-lg px-2.5 py-1 transition-all ${
                          isActive
                            ? filterKey === 'failed'
                              ? 'bg-red-600 text-white shadow-sm'
                              : filterKey === 'completed'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {filterKey === 'all' ? 'Tous' : filterKey === 'completed' ? 'Succès' : 'Échecs'} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Local Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    placeholder="Filtrer ce journal..."
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#B91C1C]"
                  />
                </div>

                {/* Switch to Full History Tab */}
                <button
                  type="button"
                  onClick={() => handleTabChange('history')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-black text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <span>Consulter tout l&apos;historique</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#B91C1C]" />
                </button>
              </div>
            </div>

            {/* Activity Table */}
            {(() => {
              const baseList = stats.recent_activity && stats.recent_activity.length > 0 ? stats.recent_activity : stats.recent_failures.map((f) => ({
                id: f.id,
                store_id: f.store_id,
                store_name: f.store_name,
                user_id: null,
                type: f.type,
                status: 'failed',
                tokens_consumed: 0,
                error_message: f.error_message,
                duration_seconds: null,
                created_at: f.created_at,
                started_at: null,
                completed_at: f.completed_at,
                input_meta: {},
                output: null,
                provider_label: null,
              }));

              const filtered = baseList.filter((item) => {
                if (activityFilter === 'completed' && item.status !== 'completed') return false;
                if (activityFilter === 'failed' && item.status !== 'failed') return false;
                if (!activitySearch.trim()) return true;
                const term = activitySearch.toLowerCase();
                return (
                  item.store_name.toLowerCase().includes(term) ||
                  (item.error_message && item.error_message.toLowerCase().includes(term)) ||
                  item.type.toLowerCase().includes(term) ||
                  item.id.toLowerCase().includes(term) ||
                  (item.status && item.status.toLowerCase().includes(term))
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-8 text-center text-xs font-semibold text-slate-400">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1.5 text-emerald-600" />
                    Aucune opération correspondant aux filtres dans le journal récent.
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                        <th className="pb-3">Boutique</th>
                        <th className="pb-3">Type d&apos;Usage</th>
                        <th className="pb-3">Statut</th>
                        <th className="pb-3">Tokens</th>
                        <th className="pb-3">Durée</th>
                        <th className="pb-3">Résumé / Diagnostic</th>
                        <th className="pb-3 text-right">Date</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filtered.map((item) => {
                        const style = typeBadgeStyles[item.type] || { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200' };

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 font-bold text-slate-900 dark:text-white">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openHistoryForStore(item.store_id, item.store_name)}
                                  className="hover:text-[#B91C1C] hover:underline text-left font-bold"
                                  title="Filtrer toutes les requêtes de cette boutique"
                                >
                                  {item.store_name}
                                </button>
                              </div>
                            </td>
                            <td className="py-3">
                              <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                                {typeLabels[item.type] || item.type}
                              </span>
                            </td>
                            <td className="py-3">
                              {item.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <Check className="w-3 h-3" /> Succès
                                </span>
                              ) : item.status === 'failed' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/50 px-2 py-0.5 text-[10px] font-black text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                                  <X className="w-3 h-3" /> Échec
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  <Loader2 className="w-3 h-3 animate-spin" /> {item.status}
                                </span>
                              )}
                            </td>
                            <td className="py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {item.tokens_consumed > 0 ? (
                                <span className="text-[#B91C1C] font-black">{item.tokens_consumed} tok</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                              {item.duration_seconds !== null ? `${item.duration_seconds}s` : '—'}
                            </td>
                            <td className="py-3 max-w-xs truncate">
                              {item.status === 'failed' ? (
                                <span className="text-red-600 dark:text-red-400 font-medium truncate block" title={item.error_message || 'Échec'}>
                                  {item.error_message || 'Échec d’exécution IA'}
                                </span>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400 truncate block">
                                  {item.provider_label || 'Génération complétée avec succès'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right text-slate-400 text-[11px] whitespace-nowrap">
                              {new Date(item.created_at).toLocaleString('fr-TN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openInspection(item)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
                                title="Inspecter la requête et la réponse complète"
                              >
                                <Eye className="w-3 h-3 text-[#B91C1C]" />
                                <span>Inspecter</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FULL REQUEST & RESPONSE HISTORY AUDIT STUDIO */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top KPI Metrics for Filtered History */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Requêtes</span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  <History className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {historySummary.total.toLocaleString()}
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Sur les filtres actuellement actifs
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Taux de Réussite</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {historySummary.total > 0
                  ? ((historySummary.completed_count / historySummary.total) * 100).toFixed(1)
                  : 100}%
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                {historySummary.completed_count} succès · {historySummary.failed_count} échecs
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Tokens Déduits</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {historySummary.total_tokens.toLocaleString()}
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Tokens de calcul consommés
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Latence Moyenne</span>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {historySummary.avg_duration_seconds > 0 ? `${historySummary.avg_duration_seconds}s` : '—'}
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Temps moyen de génération IA
              </p>
            </div>
          </div>

          {/* Main Filter & Data Table Card */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
            {/* Header & Controls Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    Journal & Audit Détaillé des Requêtes IA
                  </h2>
                  <span className="rounded-full bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 text-[10px] font-black text-[#B91C1C]">
                    {historySummary.total} requêtes enregistrées
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Inspectez les prompts envoyés aux modèles, les réponses brutes JSON générées, les durées de calcul et les erreurs.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchHistory(historyPagination.page)}
                  disabled={historyLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin text-[#B91C1C]' : ''}`} />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Text Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void fetchHistory(1, { search: historySearch });
                  }}
                  placeholder="Rechercher boutique, ID, erreur..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-[#B91C1C]"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={historyStatus}
                  onChange={(e) => {
                    setHistoryStatus(e.target.value);
                    void fetchHistory(1, { status: e.target.value });
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-[#B91C1C]"
                >
                  <option value="all">Tous les Statuts</option>
                  <option value="completed">Succès (Completed)</option>
                  <option value="failed">Échecs (Failed)</option>
                  <option value="processing">En Cours (Processing)</option>
                  <option value="queued">En File (Queued)</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={historyType}
                  onChange={(e) => {
                    setHistoryType(e.target.value);
                    void fetchHistory(1, { type: e.target.value });
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-[#B91C1C]"
                >
                  <option value="all">Tous les Usages IA</option>
                  <option value="category_classification">Classification des catégories</option>
                  <option value="product_description">Description produit</option>
                  <option value="product_smart_fill">Smart Fill (Création 360°)</option>
                  <option value="product_tagging">Auto-tagging sémantique</option>
                  <option value="page_copy">Copywriting vitrine</option>
                  <option value="seo_generation">SEO & Meta Tags</option>
                  <option value="image_compression">Compression d&apos;image</option>
                </select>
              </div>

              {/* Store Filter / Reset */}
              <div className="flex items-center gap-2">
                {historyStoreId !== 'all' ? (
                  <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs font-bold text-[#B91C1C]">
                    <span className="truncate">Boutique: {historyStoreName || historyStoreId}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryStoreId('all');
                        setHistoryStoreName('');
                        void fetchHistory(1, { store_id: 'all' });
                      }}
                      className="p-0.5 hover:bg-red-100 rounded text-red-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void fetchHistory(1)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-center"
                  >
                    Filtrer
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryStatus('all');
                    setHistoryType('all');
                    setHistoryStoreId('all');
                    setHistoryStoreName('');
                    void fetchHistory(1, { search: '', status: 'all', type: 'all', store_id: 'all' });
                  }}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  title="Réinitialiser tous les filtres"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Table */}
            {historyLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#B91C1C]" />
                <p className="text-xs font-bold text-slate-400">Chargement de l&apos;historique des requêtes...</p>
              </div>
            ) : historyJobs.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-12 text-center space-y-2">
                <History className="w-8 h-8 mx-auto text-slate-400" />
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">Aucune requête trouvée</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Aucune exécution d&apos;IA ne correspond aux critères de recherche actuels.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                      <th className="pb-3">Date & ID</th>
                      <th className="pb-3">Boutique</th>
                      <th className="pb-3">Type d&apos;Usage</th>
                      <th className="pb-3">Moteur / Modèle</th>
                      <th className="pb-3">Tokens</th>
                      <th className="pb-3">Durée</th>
                      <th className="pb-3">Statut</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {historyJobs.map((job) => {
                      const style = typeBadgeStyles[job.type] || {
                        bg: 'bg-slate-100 dark:bg-slate-800',
                        text: 'text-slate-700 dark:text-slate-300',
                        border: 'border-slate-200',
                      };

                      return (
                        <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                {new Date(job.created_at).toLocaleDateString('fr-TN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                                <span>
                                  {new Date(job.created_at).toLocaleTimeString('fr-TN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })}
                                </span>
                                <span>·</span>
                                <span className="truncate max-w-[90px]" title={job.id}>{job.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openHistoryForStore(job.store_id, job.store_name)}
                                  className="font-bold text-slate-900 dark:text-white hover:text-[#B91C1C] hover:underline text-left"
                                  title="Filtrer cette boutique"
                                >
                                  {job.store_name}
                                </button>
                                <Link
                                  href={`/stores?search=${encodeURIComponent(job.store_name)}`}
                                  target="_blank"
                                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                                  title="Voir boutique"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              </div>
                              {job.user_email && (
                                <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{job.user_email}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${style.bg} ${style.text} ${style.border}`}>
                              {typeLabels[job.type] || job.type}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {job.provider_label || 'Auto Moteur'}
                            </span>
                          </td>
                          <td className="py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {job.tokens_consumed > 0 ? (
                              <span className="text-[#B91C1C] font-black">{job.tokens_consumed} <span className="text-[10px] text-slate-400 font-normal">tok</span></span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {job.duration_seconds !== null ? `${job.duration_seconds}s` : '—'}
                          </td>
                          <td className="py-3">
                            {job.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <Check className="w-3 h-3" /> Succès
                              </span>
                            ) : job.status === 'failed' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/50 px-2 py-0.5 text-[10px] font-black text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800" title={job.error_message || ''}>
                                <X className="w-3 h-3" /> Échec
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <Loader2 className="w-3 h-3 animate-spin" /> {job.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openInspection(job)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-[#B91C1C] hover:text-[#B91C1C] transition-all shadow-xs"
                            >
                              <Code2 className="w-3.5 h-3.5 text-[#B91C1C]" />
                              <span>Inspecter</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {historyPagination.total_pages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs font-bold text-slate-500">
                <div>
                  Affichage de {(historyPagination.page - 1) * historyPagination.limit + 1} à{' '}
                  {Math.min(historyPagination.page * historyPagination.limit, historyPagination.total)} sur{' '}
                  {historyPagination.total} requêtes
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={historyPagination.page <= 1 || historyLoading}
                    onClick={() => void fetchHistory(historyPagination.page - 1)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Précédent</span>
                  </button>

                  <span className="px-2 text-xs font-black text-slate-900 dark:text-white">
                    Page {historyPagination.page} / {historyPagination.total_pages}
                  </span>

                  <button
                    type="button"
                    disabled={historyPagination.page >= historyPagination.total_pages || historyLoading}
                    onClick={() => void fetchHistory(historyPagination.page + 1)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <span>Suivant</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MULTI-ENGINE PURPOSE ROUTING */}
      {/* ========================================================================= */}
      {activeTab === 'routing' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Routage Multi-Moteurs IA par Usage</h2>
                  <span className="rounded-full bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 text-[10px] font-black text-[#B91C1C]">
                    {configuredRoutesCount}/6 modules configurés
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                  Assignez le modèle d&apos;IA optimal à chaque tâche e-commerce spécifique (GPT-4o pour le copywriting, Gemini pour la vitesse, Nemotron ou Replicate pour la photo).
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {PURPOSE_MODULES.map((item) => {
                const currentRoute = purposeRouting.find((r) => r.purpose === item.key);
                const isSaving = savingPurposeKey === item.key;
                const isSaved = savedPurposeKeys[item.key];
                const activeProvider = providers.find((p) => p.id === currentRoute?.provider_config_id);

                return (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#B91C1C]">
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-black text-sm text-slate-900 dark:text-white">{item.label}</h3>
                            <span className="text-[10px] font-bold text-slate-400">{item.badge}</span>
                          </div>
                        </div>

                        {isSaving && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> Enregistrement...
                          </span>
                        )}
                        {isSaved && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                            <Check className="w-3 h-3 text-emerald-600" /> Enregistré
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                    </div>

                    <div className="space-y-2.5 border-t border-slate-200/60 dark:border-slate-700/60 pt-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold uppercase text-slate-400 text-[10px]">Moteur Actif</span>
                        {activeProvider ? (
                          <span className="font-bold text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                            {activeProvider.label}
                          </span>
                        ) : (
                          <span className="font-bold text-[10px] text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                            Pile Défaut
                          </span>
                        )}
                      </div>

                      <select
                        value={currentRoute?.provider_config_id || ''}
                        disabled={isSaving}
                        onChange={(e) => void updatePurposeRouting(item.key, e.target.value || null)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-black text-slate-900 dark:text-white outline-none focus:border-[#B91C1C] disabled:opacity-50"
                      >
                        <option value="">Pile de Priorité Défaut</option>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label} ({providerLabels[p.provider].name} - {p.model})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void updatePurposeRouting(item.key, currentRoute?.provider_config_id || null)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin text-[#B91C1C]" /> : <Save className="w-3 h-3 text-[#B91C1C]" />}
                        <span>{isSaved ? 'Enregistré avec succès !' : 'Enregistrer ce routage'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AI PROVIDERS & API KEYS */}
      {/* ========================================================================= */}
      {activeTab === 'providers' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Fournisseurs IA & Clés API</h2>
                <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                  Gérez les intégrations avec Gemini, OpenAI, Claude, Replicate ou vos propres endpoints LLM personnalisés.
                </p>
              </div>
              <button
                type="button"
                onClick={resetProviderForm}
                className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2.5 text-xs font-black text-white hover:bg-[#991B1B] shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                Ajouter un Fournisseur
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {providers.length === 0 ? (
                <div className="col-span-full py-16 text-center text-xs font-semibold text-slate-400">
                  Aucun fournisseur IA configuré. Cliquez sur &quot;Ajouter un Fournisseur&quot; pour démarrer.
                </div>
              ) : (
                providers.map((provider) => {
                  const meta = providerLabels[provider.provider] || providerLabels.custom;
                  return (
                    <div
                      key={provider.id}
                      className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                        provider.is_default
                          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/10'
                          : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${meta.badge}`}>
                            {meta.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {provider.is_default && (
                              <span className="rounded-md bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:text-amber-200">
                                Défaut
                              </span>
                            )}
                            {provider.api_key_set && (
                              <span className="rounded-md bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
                                <Key className="w-2.5 h-2.5" /> Clé Active
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="mt-3 text-base font-black text-slate-900 dark:text-white">{provider.label}</h3>
                        <p className="mt-1 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{provider.model}</p>
                        {provider.base_url && (
                          <p className="mt-1 text-[11px] font-mono text-slate-400 truncate" title={provider.base_url}>
                            {provider.base_url}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 border-t border-slate-200/60 dark:border-slate-700/60 pt-3">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span>Priorité d&apos;appel :</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{provider.priority}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => editProvider(provider)}
                            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteProvider(provider.id)}
                            disabled={deletingId === provider.id}
                            className="p-1.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                            title="Supprimer ce fournisseur"
                          >
                            {deletingId === provider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SYSTEM PROMPTS & STUDIO TEMPLATES */}
      {/* ========================================================================= */}
      {activeTab === 'prompts' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Gestionnaire des Prompts Système & Modèles Initiaux</h2>
                <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                  Personnalisez le ton, le persona, les directives de sortie JSON et les templates transmis aux modèles d&apos;IA.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void savePromptTemplate()}
                disabled={savingPrompt}
                className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-5 py-2.5 text-xs font-black text-white hover:bg-[#991B1B] shadow-sm disabled:opacity-50 transition-all"
              >
                {savingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer ce Prompt
              </button>
            </div>

            {promptMessage && (
              <div className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {promptMessage}
              </div>
            )}

            {/* Template Selector Row */}
            <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              {promptTemplates.map((tpl) => {
                const isSelected = selectedPromptKey === tpl.prompt_key;
                return (
                  <button
                    key={tpl.prompt_key}
                    type="button"
                    onClick={() => handleSelectPrompt(tpl.prompt_key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#B91C1C] text-white shadow-sm shadow-red-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tpl.title}
                  </button>
                );
              })}
            </div>

            {/* Editor Workspace */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: System Persona */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Prompt Système / Persona de l&apos;IA
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Définit le rôle, l&apos;expertise et les contraintes éthiques fondamentales.
                  </p>
                  <textarea
                    rows={8}
                    value={editingSystemPrompt}
                    onChange={(e) => setEditingSystemPrompt(e.target.value)}
                    placeholder="Rôle et consignes de comportement..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 font-mono text-xs text-slate-900 dark:text-white outline-none focus:bg-white focus:border-[#B91C1C] leading-relaxed"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Variables Disponibles</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                    Cliquez sur une variable pour l&apos;insérer dans le prompt d&apos;exécution :
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(selectedTemplate.variables || ['{title}', '{description}', '{language}']).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 font-mono text-[10px] font-black text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
                      >
                        + {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Execution Template */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Template de Prompt d&apos;Exécution (Default Prompt)
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Structure exacte de la requête avec variables dynamiques et directives de format JSON.
                  </p>
                  <textarea
                    rows={14}
                    value={editingDefaultPrompt}
                    onChange={(e) => setEditingDefaultPrompt(e.target.value)}
                    placeholder="Instructions détaillées..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 font-mono text-xs text-slate-900 dark:text-white outline-none focus:bg-white focus:border-[#B91C1C] leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PRICING & TOKEN ECONOMICS */}
      {/* ========================================================================= */}
      {activeTab === 'pricing' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Coût en Tokens par Fonctionnalité</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Définissez la quantité de tokens déduite du portefeuille du vendeur lors de chaque exécution.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {pricing.map((price) => (
                  <div
                    key={price.job_type}
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{typeLabels[price.job_type] || price.job_type}</h4>
                      <p className="text-[11px] font-mono text-slate-400">{price.job_type}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        value={price.tokens_required}
                        onChange={(e) =>
                          setPricing((current) =>
                            current.map((item) =>
                              item.job_type === price.job_type ? { ...item, tokens_required: Math.max(0, Number(e.target.value)) } : item,
                            ),
                          )
                        }
                        className="w-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-[#B91C1C] text-center"
                      />
                      <span className="text-xs font-bold text-slate-400">Tokens</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void savePricing()}
                disabled={savingConfig}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-3 text-sm font-black text-white hover:bg-[#991B1B] disabled:opacity-50 shadow-sm transition-all"
              >
                {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer la Tarification Tokens
              </button>
            </div>

            {/* Token Pool Economics Card */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Économie du Pool de Tokens</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Les boutiques sur forfaits Starter ou Free consomment leur solde de tokens inclus. Les forfaits Pro & Enterprise bénéficient de l&apos;usage illimité.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                  <span className="font-bold text-amber-800 dark:text-amber-200">Recommandation PandaMarket</span>
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                    Fixez la compression d&apos;image à 1 token et la génération de fiche produit à 2 tokens pour un amortissement optimal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT AI PROVIDER */}
      {/* ========================================================================= */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {providerForm.id ? 'Modifier le Fournisseur IA' : 'Ajouter un Fournisseur IA'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">Configurez les paramètres du modèle et l&apos;authentification</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProviderModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Type de Fournisseur</label>
                <select
                  value={providerForm.provider}
                  onChange={(e) => setProviderForm((prev) => ({ ...prev, provider: e.target.value as AiProvider }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 font-bold text-slate-900 dark:text-white outline-none focus:border-[#B91C1C]"
                >
                  {Object.entries(providerLabels).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Libellé d&apos;Affichage</label>
                <input
                  type="text"
                  value={providerForm.label}
                  onChange={(e) => setProviderForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="Ex: Gemini 1.5 Flash (Production)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 font-bold text-slate-900 dark:text-white outline-none focus:border-[#B91C1C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Identifiant Modèle</label>
                  <input
                    type="text"
                    value={providerForm.model}
                    onChange={(e) => setProviderForm((prev) => ({ ...prev, model: e.target.value }))}
                    placeholder="gemini-1.5-flash / gpt-4o"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-[#B91C1C]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Priorité d&apos;Appel</label>
                  <input
                    type="number"
                    value={providerForm.priority}
                    onChange={(e) => setProviderForm((prev) => ({ ...prev, priority: Number(e.target.value) }))}
                    placeholder="100"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 font-bold text-slate-900 dark:text-white outline-none focus:border-[#B91C1C]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Base URL (Optionnel pour Custom LLM)</label>
                <input
                  type="text"
                  value={providerForm.base_url}
                  onChange={(e) => setProviderForm((prev) => ({ ...prev, base_url: e.target.value }))}
                  placeholder="https://api.openai.com/v1 ou https://integrate.api.nvidia.com/v1"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 font-mono text-slate-900 dark:text-white outline-none focus:border-[#B91C1C]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {providerForm.id ? 'Nouvelle Clé API (Laisser vide pour conserver)' : 'Clé API Secrète'}
                </label>
                <input
                  type="password"
                  value={providerForm.api_key}
                  onChange={(e) => setProviderForm((prev) => ({ ...prev, api_key: e.target.value }))}
                  placeholder={providerForm.id ? '••••••••••••••••' : 'Entrez la clé API...'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 font-mono text-slate-900 dark:text-white outline-none focus:border-[#B91C1C]"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerForm.is_enabled}
                    onChange={(e) => setProviderForm((prev) => ({ ...prev, is_enabled: e.target.checked }))}
                    className="rounded border-slate-300 text-[#B91C1C] focus:ring-[#B91C1C]"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Activer ce moteur</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerForm.is_default}
                    onChange={(e) => setProviderForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                    className="rounded border-slate-300 text-[#B91C1C] focus:ring-[#B91C1C]"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Définir par Défaut</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowProviderModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void saveProvider()}
                disabled={savingConfig || !providerForm.label.trim() || !providerForm.model.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-5 py-2 text-xs font-black text-white hover:bg-[#991B1B] disabled:opacity-50"
              >
                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OUT INSPECTION DRAWER: AI REQUEST & RESPONSE PAYLOAD AUDIT */}
      {/* ========================================================================= */}
      {inspectionDrawerOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#B91C1C]">
                  <Code2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                      Inspection de la Requête IA
                    </h3>
                    {selectedJob.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3" /> Succès
                      </span>
                    ) : selectedJob.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/50 px-2 py-0.5 text-[10px] font-black text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                        <X className="w-3 h-3" /> Échec
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <Loader2 className="w-3 h-3 animate-spin" /> {selectedJob.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-slate-500 font-mono">{selectedJob.id}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedJob.id, 'job_id')}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      title="Copier l'ID de requête"
                    >
                      {copiedKey === 'job_id' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      {selectedJob.store_name}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectionDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Fermer le panneau d'inspection"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Sub-nav Tabs */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto text-xs font-bold">
              {[
                { key: 'overview', label: 'Vue Synthétique', icon: Eye },
                { key: 'input', label: 'Requête & Prompt (Input)', icon: Terminal },
                { key: 'output', label: 'Réponse Modèle (Output)', icon: Sparkles },
                { key: 'trace', label: 'Diagnostic & Erreurs', icon: ShieldAlert },
              ].map((tab) => {
                const isActive = drawerTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setDrawerTab(tab.key as any)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                      isActive
                        ? 'border-[#B91C1C] text-[#B91C1C] font-black'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* TAB 1: OVERVIEW */}
              {drawerTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Type d&apos;Usage</p>
                      <p className="font-black text-slate-900 dark:text-white">
                        {typeLabels[selectedJob.type] || selectedJob.type}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Tokens Déduits</p>
                      <p className="font-black text-[#B91C1C] text-sm font-mono">
                        {selectedJob.tokens_consumed} <span className="text-[10px] text-slate-400 font-normal">tok</span>
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Durée d&apos;Exécution</p>
                      <p className="font-black text-slate-900 dark:text-white font-mono text-sm">
                        {selectedJob.duration_seconds !== null ? `${selectedJob.duration_seconds} s` : '—'}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Moteur / Modèle IA</p>
                      <p className="font-black text-indigo-600 dark:text-indigo-400 font-mono text-[11px] truncate">
                        {selectedJob.provider_label || 'Auto-Routing Prioritaire'}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Boutique</p>
                      <div className="flex items-center gap-1">
                        <p className="font-black text-slate-900 dark:text-white truncate">
                          {selectedJob.store_name}
                        </p>
                        <Link
                          href={`/stores?search=${encodeURIComponent(selectedJob.store_name)}`}
                          target="_blank"
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Utilisateur / Auteur</p>
                      <p className="font-black text-slate-900 dark:text-white truncate">
                        {selectedJob.user_name || selectedJob.user_email || selectedJob.user_id || 'Système'}
                      </p>
                    </div>
                  </div>

                  {/* Execution Timeline */}
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 p-4 space-y-3">
                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                      Chronologie d&apos;Exécution
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block font-bold">1. Reçue / Créée</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {new Date(selectedJob.created_at).toLocaleTimeString('fr-TN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">2. Démarrée</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {selectedJob.started_at
                            ? new Date(selectedJob.started_at).toLocaleTimeString('fr-TN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">3. Terminée</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {selectedJob.completed_at
                            ? new Date(selectedJob.completed_at).toLocaleTimeString('fr-TN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Summary of Output */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-900 dark:text-white text-xs">
                        {selectedJob.status === 'completed' ? 'Aperçu du Résultat IA' : 'Détail de l’Anomalie'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setDrawerTab(selectedJob.status === 'completed' ? 'output' : 'trace')}
                        className="text-[11px] font-bold text-[#B91C1C] hover:underline"
                      >
                        Voir tout →
                      </button>
                    </div>

                    {selectedJob.status === 'failed' ? (
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 font-medium">
                        {selectedJob.error_message || 'Échec de traitement par le moteur IA.'}
                      </div>
                    ) : selectedJob.output ? (
                      <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] max-h-40 overflow-y-auto leading-relaxed">
                        {JSON.stringify(selectedJob.output, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-slate-400 italic">Aucune donnée de sortie disponible.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: REQUEST & PROMPT PAYLOAD (INPUT) */}
              {drawerTab === 'input' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Structured Parameters Breakdown */}
                  {selectedJob.input_meta && Object.keys(selectedJob.input_meta).length > 0 && (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                      <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                        Paramètres d&apos;Entrée Extraits
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Object.entries(selectedJob.input_meta)
                          .filter(([k]) => !['prompt', 'system_prompt'].includes(k))
                          .map(([key, val]) => (
                            <div key={key} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">{key}</span>
                              <span className="font-medium text-slate-900 dark:text-white truncate block">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Prompt Text if available */}
                  {(selectedJob.input_meta as any)?.prompt && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-900 dark:text-white">Prompt Système & Instruction Modèle</h4>
                        <button
                          type="button"
                          onClick={() => copyToClipboard((selectedJob.input_meta as any).prompt, 'prompt_text')}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                        >
                          {copiedKey === 'prompt_text' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'prompt_text' ? 'Copié !' : 'Copier le Prompt'}</span>
                        </button>
                      </div>
                      <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap">
                        {(selectedJob.input_meta as any).prompt}
                      </pre>
                    </div>
                  )}

                  {/* Raw Input JSON */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-900 dark:text-white">Payload d&apos;Entrée Complet (JSON)</h4>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(JSON.stringify(selectedJob.input_meta, null, 2), 'input_json')}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                      >
                        {copiedKey === 'input_json' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'input_json' ? 'Copié !' : 'Copier le JSON d\'Entrée'}</span>
                      </button>
                    </div>
                    <pre className="p-4 rounded-2xl bg-slate-950 text-indigo-300 font-mono text-[11px] leading-relaxed max-h-80 overflow-y-auto">
                      {JSON.stringify(selectedJob.input_meta, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: MODEL RESPONSE (OUTPUT) */}
              {drawerTab === 'output' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Visual Renderings */}
                  {selectedJob.output && (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h4 className="font-black text-slate-900 dark:text-white">Rendu Visuel de la Réponse IA</h4>
                        <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                          JSON Structuré Valide
                        </span>
                      </div>

                      {/* HTML Description preview */}
                      {(selectedJob.output as any)?.description_html && (
                        <div className="space-y-2">
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Aperçu Description HTML :</span>
                          <div
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 prose prose-xs dark:prose-invert max-w-none text-slate-800 dark:text-slate-200"
                            dangerouslySetInnerHTML={{ __html: (selectedJob.output as any).description_html }}
                          />
                        </div>
                      )}

                      {/* Category Classification preview */}
                      {((selectedJob.output as any)?.marketplace_category_name || (selectedJob.output as any)?.storefront_category_name) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                            <span className="text-[10px] font-bold text-blue-700 uppercase">Catégorie Marketplace</span>
                            <p className="font-black text-slate-900 dark:text-white mt-1">
                              {(selectedJob.output as any).marketplace_category_name || 'Non spécifiée'}
                            </p>
                            {(selectedJob.output as any).marketplace_subcategory_name && (
                              <p className="text-[11px] text-blue-600 dark:text-blue-400">
                                ↳ {(selectedJob.output as any).marketplace_subcategory_name}
                              </p>
                            )}
                          </div>

                          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase">Vitrine Boutique (Storefront)</span>
                            <p className="font-black text-slate-900 dark:text-white mt-1">
                              {(selectedJob.output as any).storefront_category_name || 'Non spécifiée'}
                            </p>
                            {(selectedJob.output as any).storefront_subcategory_name && (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                ↳ {(selectedJob.output as any).storefront_subcategory_name}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tags preview */}
                      {Array.isArray((selectedJob.output as any)?.tags) && (
                        <div className="space-y-2">
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">Tags Sémantiques Extraits :</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(selectedJob.output as any).tags.map((t: string) => (
                              <span
                                key={t}
                                className="rounded-md bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raw Output JSON */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-900 dark:text-white">Réponse Brute du Moteur (JSON)</h4>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(JSON.stringify(selectedJob.output, null, 2), 'output_json')}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                      >
                        {copiedKey === 'output_json' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'output_json' ? 'Copié !' : 'Copier la Réponse JSON'}</span>
                      </button>
                    </div>
                    <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-80 overflow-y-auto">
                      {selectedJob.output ? JSON.stringify(selectedJob.output, null, 2) : 'null'}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 4: DIAGNOSTIC & TRACE */}
              {drawerTab === 'trace' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {selectedJob.status === 'failed' ? (
                    <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 p-5 space-y-3">
                      <div className="flex items-center gap-2.5 text-red-700 dark:text-red-300 font-black text-sm">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span>Détails de l&apos;Échec d&apos;Exécution IA</span>
                      </div>
                      <p className="font-mono text-xs text-red-900 dark:text-red-200 bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-red-200 dark:border-red-900/40 whitespace-pre-wrap">
                        {selectedJob.error_message || 'Aucun message d’erreur explicite fourni.'}
                      </p>
                      <div className="text-[11px] text-red-600 dark:text-red-400 space-y-1">
                        <p>• Vérifiez le solde de tokens du vendeur dans son wallet PandaMarket.</p>
                        <p>• Vérifiez la validité de la clé API du fournisseur dans l&apos;onglet Fournisseurs & Clés API.</p>
                        <p>• Vérifiez si le modèle spécifié est accessible et répond aux quotas.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 p-5 flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                      <div>
                        <h4 className="font-black text-emerald-800 dark:text-emerald-300">Exécution Sans Anomalie</h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                          La requête a été achevée avec succès en {selectedJob.duration_seconds !== null ? `${selectedJob.duration_seconds}s` : 'quelques millisecondes'} et a consommé {selectedJob.tokens_consumed} tokens.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Full Job Raw JSON */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-900 dark:text-white">Objet d&apos;Audit Complet (Diagnostic Brut)</h4>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(JSON.stringify(selectedJob, null, 2), 'job_full_json')}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                      >
                        {copiedKey === 'job_full_json' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'job_full_json' ? 'Copié !' : 'Copier l\'Audit Complet'}</span>
                      </button>
                    </div>
                    <pre className="p-4 rounded-2xl bg-slate-950 text-slate-300 font-mono text-[11px] leading-relaxed max-h-72 overflow-y-auto">
                      {JSON.stringify(selectedJob, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-[11px] text-slate-400 font-mono">PandaMarket AI Governance Hub</span>
              <button
                type="button"
                onClick={() => setInspectionDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AI SANDBOX TESTER */}
      {/* ========================================================================= */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Simulateur & Sandbox IA</h3>
                  <p className="text-xs text-slate-400 font-medium">Testez les prompts et la réponse JSON en temps réel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Titre / Mots-clés de Test</label>
                <input
                  type="text"
                  value={testInputTitle}
                  onChange={(e) => setTestInputTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 font-bold text-slate-900 dark:text-white outline-none focus:border-[#B91C1C]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description Brute d&apos;Entrée</label>
                <textarea
                  rows={3}
                  value={testInputDesc}
                  onChange={(e) => setTestInputDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 font-medium text-slate-900 dark:text-white outline-none focus:border-[#B91C1C]"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={runSandboxTest}
                  disabled={testingAi}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {testingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Exécuter le Test IA
                </button>
              </div>

              {testOutput && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Sortie JSON Générée :</span>
                  <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
                    {testOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
