'use client';

import { fetchWithCsrf } from '@/lib/api';
import { ProductDescriptionEditor } from '@/components/product/ProductDescription';
import { updateOnboardingStep } from '@/lib/onboarding';
import { getHubProductHref } from '@/lib/product-links';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  Filter,
  Grid,
  Image as ImageIcon,
  Images,
  Info,
  Key,
  Layers,
  LayoutGrid,
  Link as LinkIcon,
  List,
  Loader2,
  Lock,
  Megaphone,
  MoreHorizontal,
  MoreVertical,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Shield,
  ShoppingBag,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Tags,
  Trash2,
  TrendingUp,
  Upload,
  Wand2,
  X,
  XCircle,
  Zap,
  ZoomIn,
  ArrowLeftRight,
  Crop,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '../../../../contexts/LocaleContext';

// =========================================================================
// TYPES & DATA STRUCTURES
// =========================================================================

interface ProductImage {
  id: string;
  url: string;
  alt_text?: string | null;
  position: number;
  is_thumbnail: boolean;
}

interface ProductAttribute {
  name: string;
  value: string;
}

interface WholesalePriceTier {
  min_quantity: number;
  unit_price: number;
}

interface WholesalePricing {
  enabled?: boolean;
  min_quantity?: number;
  price_tiers?: WholesalePriceTier[];
}

interface WholesalePriceTierForm {
  min_quantity: string;
  unit_price: string;
}

interface ProductVariant {
  id?: string;
  sku?: string | null;
  title: string;
  price: string | number;
  inventory_quantity: number;
  options?: Record<string, string>;
}

interface ProductVariantForm {
  id?: string;
  sku: string;
  title: string;
  price: string;
  inventory_quantity: string;
  option_name: string;
  option_value: string;
  options?: Record<string, string>;
}

interface OptionDimension {
  id: string;
  name: string;
  values: string[];
  inputValue?: string;
}

interface Product {
  id: string;
  type?: string;
  title: string;
  slug?: string;
  description?: string | null;
  category?: string | null;
  product_reference?: string | null;
  marketplace_category_id?: string | null;
  storefront_category_id?: string | null;
  marketplace_category_name?: string | null;
  marketplace_category_slug?: string | null;
  storefront_category_name?: string | null;
  store_subdomain?: string | null;
  price: string | number;
  status: string;
  inventory_quantity: number;
  thumbnail?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  tags?: string[];
  attributes?: ProductAttribute[];
  metadata?: {
    wholesale_pricing?: WholesalePricing;
  } & Record<string, unknown>;
  images?: ProductImage[];
  max_downloads?: number | null;
  download_expires_hours?: number | null;
  digital_file_key?: string | null;
  digital_file_name?: string | null;
  digital_file_content_type?: string | null;
  digital_file_size?: string | number | null;
  variants?: ProductVariant[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  parent_name?: string | null;
  is_default?: boolean;
  is_active?: boolean;
  product_count?: number;
}

interface MediaItem {
  url: string;
  product_id: string;
  product_title: string;
  alt_text?: string | null;
  is_thumbnail?: boolean;
}

interface ProductForm {
  type: string;
  title: string;
  slug: string;
  product_reference: string;
  price: string;
  marketplace_category_id: string;
  storefront_category_id: string;
  inventory_quantity: string;
  description: string;
  thumbnail: string;
  gallery_images: string[];
  seo_title: string;
  seo_description: string;
  tags: string;
  attributes: ProductAttribute[];
  max_downloads: string;
  download_expires_hours: string;
  digital_file_key: string;
  digital_file_name: string;
  digital_file_content_type: string;
  digital_file_size: string;
  license_keys: string;
  wholesale_min_quantity: string;
  wholesale_price_tiers: WholesalePriceTierForm[];
  cost_price: string;
  variants: ProductVariantForm[];
  status: string;
}

type DrawerTab = 'general' | 'pricing' | 'taxonomy' | 'description' | 'media' | 'seo' | 'digital';
type ViewMode = 'table' | 'grid';

const emptyForm: ProductForm = {
  type: 'physical',
  title: '',
  slug: '',
  product_reference: '',
  price: '',
  marketplace_category_id: '',
  storefront_category_id: '',
  inventory_quantity: '10',
  description: '',
  thumbnail: '',
  gallery_images: [],
  seo_title: '',
  seo_description: '',
  tags: '',
  attributes: [],
  max_downloads: '5',
  download_expires_hours: '72',
  digital_file_key: '',
  digital_file_name: '',
  digital_file_content_type: '',
  digital_file_size: '',
  license_keys: '',
  wholesale_min_quantity: '2',
  wholesale_price_tiers: [{ min_quantity: '2', unit_price: '' }],
  cost_price: '',
  variants: [],
  status: 'published',
};

const STUDIO_PRESETS = [
  { id: 'marbre', name: 'Marbre Blanc Carrare', icon: '🏛️', desc: 'Plateau marbré noble avec reflets doux' },
  { id: 'gradient', name: 'Gradient Minimaliste', icon: '🎨', desc: 'Dégradé studio épuré et lumière diffuse' },
  { id: 'bois', name: 'Chêne Massif Naturel', icon: '🪵', desc: 'Table en bois chaleureux et ombres 3D' },
  { id: 'sable', name: 'Sable du Désert', icon: '🏖️', desc: 'Texture minérale chaude de style lifestyle' },
  { id: 'nature', name: 'Nature & Végétal', icon: '🌿', desc: 'Atmosphère fraîche avec feuilles et lumière douce' },
  { id: 'luxe_dark', name: 'Studio Dark Luxe', icon: '🌑', desc: 'Fond sombre feutré avec néons subtils' },
];

export interface WholesalePreset {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tiers: Array<{ min_quantity: string; discountPct: number }>;
}

const WHOLESALE_PRESETS: WholesalePreset[] = [
  {
    id: 'retailers',
    name: 'Boutiques & Détaillants',
    desc: '-15% dès 10 pcs, -25% dès 50 pcs',
    icon: '🏢',
    tiers: [
      { min_quantity: '10', discountPct: 15 },
      { min_quantity: '50', discountPct: 25 },
    ],
  },
  {
    id: 'distributors',
    name: 'Grands Comptes & Distributeurs',
    desc: '-25% dès 50 pcs, -40% dès 200 pcs, -50% dès 500 pcs',
    icon: '🚚',
    tiers: [
      { min_quantity: '50', discountPct: 25 },
      { min_quantity: '200', discountPct: 40 },
      { min_quantity: '500', discountPct: 50 },
    ],
  },
  {
    id: 'linear',
    name: 'Dégressif Linéaire 4 Paliers',
    desc: '-5%, -10%, -15%, -20% par paliers',
    icon: '📈',
    tiers: [
      { min_quantity: '5', discountPct: 5 },
      { min_quantity: '15', discountPct: 10 },
      { min_quantity: '30', discountPct: 15 },
      { min_quantity: '50', discountPct: 20 },
    ],
  },
  {
    id: 'aggressive',
    name: 'Déstockage & Volume Massif',
    desc: '-30% dès 20 pcs, -55% dès 100 pcs',
    icon: '⚡',
    tiers: [
      { min_quantity: '20', discountPct: 30 },
      { min_quantity: '100', discountPct: 55 },
    ],
  },
];

export interface OptionPreset {
  id: string;
  category: 'fashion' | 'beauty' | 'tech' | 'home' | 'food' | 'jewelry';
  categoryLabel: string;
  name: string;
  optionName: string;
  icon: string;
  values: string[];
}

const OPTION_PRESETS: OptionPreset[] = [
  // 1. MODE & HABILLEMENT (Fashion)
  { id: 'size_adult', category: 'fashion', categoryLabel: '👗 Mode', name: 'Tailles Adultes (XS-3XL)', optionName: 'Taille', icon: '👕', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] },
  { id: 'size_kids', category: 'fashion', categoryLabel: '👗 Mode', name: 'Tailles Enfants & Bébés', optionName: 'Taille', icon: '👶', values: ['0-3m', '3-6m', '6-12m', '1-2 ans', '3-4 ans', '5-6 ans'] },
  { id: 'shoes_adult', category: 'fashion', categoryLabel: '👗 Mode', name: 'Pointures Chaussures (36-46)', optionName: 'Pointure', icon: '👟', values: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] },
  { id: 'colors_essential', category: 'fashion', categoryLabel: '👗 Mode', name: 'Couleurs Essentielles', optionName: 'Couleur', icon: '🎨', values: ['Noir', 'Blanc', 'Bleu Marine', 'Gris Anthracite', 'Beige Sable', 'Bordeaux', 'Kaki', 'Camel'] },
  { id: 'colors_pastel', category: 'fashion', categoryLabel: '👗 Mode', name: 'Couleurs Pastel & Tendances', optionName: 'Couleur', icon: '🌸', values: ['Rose Poudré', 'Vert Sauge', 'Bleu Ciel', 'Lilas', 'Terracotta', 'Moutarde'] },
  { id: 'textile_materials', category: 'fashion', categoryLabel: '👗 Mode', name: 'Matières & Textiles', optionName: 'Matière', icon: '🧵', values: ['100% Coton', 'Lin Naturel', 'Soie Sauvage', 'Cuir Véritable', 'Laine Mérinos', 'Denim'] },
  { id: 'clothing_fit', category: 'fashion', categoryLabel: '👗 Mode', name: 'Coupes & Silhouettes', optionName: 'Coupe', icon: '👔', values: ['Slim Fit', 'Regular Fit', 'Oversize', 'Coupe Droite', 'Ajusté'] },

  // 2. BEAUTÉ, PARFUMS & SOINS (Beauty)
  { id: 'perfume_volume', category: 'beauty', categoryLabel: '💄 Beauté', name: 'Flacons & Parfums (ml)', optionName: 'Contenance', icon: '🧴', values: ['15ml', '30ml', '50ml', '100ml', '200ml'] },
  { id: 'foundation_shades', category: 'beauty', categoryLabel: '💄 Beauté', name: 'Teintes Teint & Poudres', optionName: 'Teinte', icon: '💄', values: ['01 Ivoire Clair', '02 Beige Naturel', '03 Doré Sable', '04 Miel Chaud', '05 Caramel', '06 Ébène'] },
  { id: 'fragrances_notes', category: 'beauty', categoryLabel: '💄 Beauté', name: 'Notes & Fragrances', optionName: 'Fragrance', icon: '✨', values: ["Fleur d'Oranger", 'Vanille Bourbon', 'Jasmin Oriental', 'Oud Boisé', 'Musc Blanc', 'Ambre'] },
  { id: 'skin_types', category: 'beauty', categoryLabel: '💄 Beauté', name: 'Types de Peau & Formules', optionName: 'Type de Peau', icon: '🧪', values: ['Peau Normale', 'Peau Sèche', 'Peau Grasse', 'Peau Mixte', 'Peau Sensible'] },

  // 3. HIGH-TECH, MOBILES & INFORMATIQUE (Tech)
  { id: 'storage_capacity', category: 'tech', categoryLabel: '💻 Tech', name: 'Stockage Mémoire (Go/To)', optionName: 'Capacité', icon: '💾', values: ['64 Go', '128 Go', '256 Go', '512 Go', '1 To', '2 To'] },
  { id: 'ram_memory', category: 'tech', categoryLabel: '💻 Tech', name: 'Mémoire Vive RAM', optionName: 'RAM', icon: '⚡', values: ['8 Go', '16 Go', '32 Go', '64 Go'] },
  { id: 'screen_diagonal', category: 'tech', categoryLabel: '💻 Tech', name: "Diagonale d'Écran", optionName: 'Écran', icon: '🖥️', values: ['13.3"', '14"', '15.6"', '16"', '24"', '27"', '32"', '55"', '65"'] },
  { id: 'tech_connectors', category: 'tech', categoryLabel: '💻 Tech', name: 'Connectique & Interfaces', optionName: 'Connectivité', icon: '🔌', values: ['USB-C', 'Lightning', 'Sans-fil Bluetooth', 'HDMI 2.1', 'Wi-Fi 6E'] },
  { id: 'tech_colors', category: 'tech', categoryLabel: '💻 Tech', name: 'Finitions Métallisées Tech', optionName: 'Finition', icon: '📱', values: ['Gris Sidéral', 'Argent Titane', 'Noir Minuit', 'Or Stellaire', 'Bleu Abysse'] },

  // 4. MAISON, MOBILIER & DÉCO (Home)
  { id: 'bedding_dimensions', category: 'home', categoryLabel: '🏡 Maison', name: 'Dimensions Matelas & Lits', optionName: 'Dimension', icon: '🛏️', values: ['90x190 cm (1 Place)', '140x190 cm (Standard)', '160x200 cm (Queen)', '180x200 cm (King)', '200x200 cm'] },
  { id: 'sofa_seats', category: 'home', categoryLabel: '🏡 Maison', name: 'Configuration Canapés & Salons', optionName: 'Configuration', icon: '🛋️', values: ['Fauteuil 1 Place', 'Canapé 2 Places', 'Canapé 3 Places', 'Angle Gauche', 'Angle Droit'] },
  { id: 'furniture_materials', category: 'home', categoryLabel: '🏡 Maison', name: 'Finitions Bois, Marbre & Métal', optionName: 'Finition', icon: '🪵', values: ['Chêne Naturel', 'Noyer Foncé', 'Marbre Blanc', 'Marbre Noir', 'Laiton Brossé', 'Acier Noir Mat'] },
  { id: 'lighting_temp', category: 'home', categoryLabel: '🏡 Maison', name: 'Température de Lumière', optionName: 'Éclairage', icon: '💡', values: ['Blanc Chaud 2700K', 'Blanc Neutre 4000K', 'Blanc Froid 6500K', 'RGB Ambiance'] },

  // 5. TERROIR, ÉPICERIE FINE & SAVEURS (Food)
  { id: 'food_weights', category: 'food', categoryLabel: '🍯 Terroir', name: 'Conditionnement Poids (g/kg)', optionName: 'Poids', icon: '⚖️', values: ['100g', '250g', '500g', '1 kg', '2.5 kg', '5 kg', '10 kg'] },
  { id: 'oil_bottles', category: 'food', categoryLabel: '🍯 Terroir', name: 'Bouteilles & Bidons Huile/Vinaigre', optionName: 'Volume', icon: '🫒', values: ['250ml', '500ml', '750ml', '1 Litre', 'Bidon 3L', 'Bidon 5L'] },
  { id: 'coffee_grind', category: 'food', categoryLabel: '🍯 Terroir', name: 'Mouture Café & Infusion', optionName: 'Mouture', icon: '☕', values: ['En Grains', 'Moulu Espresso', 'Moulu Filtre', 'Dosettes ESE', 'Capsules Compatibles'] },
  { id: 'olive_varieties', category: 'food', categoryLabel: '🍯 Terroir', name: "Variétés Huile d'Olive Tunisienne", optionName: 'Variété', icon: '🌿', values: ['Chétoui Extra Vierge', 'Sahli Douce', 'Bio Certifiée', 'Aromatisée Romarin'] },
  { id: 'honey_varieties', category: 'food', categoryLabel: '🍯 Terroir', name: 'Miels Artisanaux de Tunisie', optionName: 'Variété', icon: '🍯', values: ['Miel de Thym', "Miel d'Eucalyptus", 'Miel Toutes Fleurs', "Miel d'Oranger", 'Miel de Forêt'] },

  // 6. BIJOUX, MONTRES & ACCESSOIRES (Jewelry)
  { id: 'ring_sizes', category: 'jewelry', categoryLabel: '💍 Bijoux', name: 'Tailles Bagues & Alliances', optionName: 'Tour de Doigt', icon: '💍', values: ['Taille 48', 'Taille 50', 'Taille 52', 'Taille 54', 'Taille 56', 'Taille 58', 'Taille 60', 'Taille 62'] },
  { id: 'precious_metals', category: 'jewelry', categoryLabel: '💍 Bijoux', name: 'Métaux Précieux & Placages', optionName: 'Métal', icon: '👑', values: ['Argent 925', 'Or Jaune 18K', 'Or Blanc 18K', 'Or Rose 18K', 'Plaqué Or 3 Microns', 'Acier Inoxydable 316L'] },
  { id: 'necklace_lengths', category: 'jewelry', categoryLabel: '💍 Bijoux', name: 'Longueur Chaînes & Colliers', optionName: 'Longueur', icon: '💎', values: ['40 cm (Ras-de-cou)', '45 cm (Princesse)', '50 cm (Sautoir court)', '60 cm (Sautoir long)'] },
];

function formatPrice(price: string | number) {
  const amount = Number(price);
  return `${Number.isFinite(amount) ? amount.toFixed(3) : '0.000'} TND`;
}

function normalizePermalink(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseLicenseKeys(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((key) => key.trim())
        .filter(Boolean),
    ),
  );
}

function parseWholesalePriceTiers(tiers: WholesalePriceTierForm[]): WholesalePriceTier[] {
  return tiers
    .map((tier) => ({
      min_quantity: Number(tier.min_quantity),
      unit_price: Number(tier.unit_price),
    }))
    .filter((tier) => Number.isInteger(tier.min_quantity) && tier.min_quantity >= 2 && Number.isFinite(tier.unit_price) && tier.unit_price >= 0)
    .sort((a, b) => a.min_quantity - b.min_quantity);
}

function parseProductVariants(variants: ProductVariantForm[]) {
  return variants
    .map((variant) => {
      const options: Record<string, string> = { ...(variant.options || {}) };
      if (variant.option_name?.trim() && variant.option_value?.trim()) {
        options[variant.option_name.trim()] = variant.option_value.trim();
      }
      return {
        id: variant.id,
        sku: variant.sku.trim() || null,
        title: variant.title.trim(),
        price: Number(variant.price),
        inventory_quantity: Number(variant.inventory_quantity || 0),
        options,
      };
    })
    .filter((variant) => variant.title || variant.sku || Object.keys(variant.options || {}).length > 0);
}

function generateCartesianCombinations(dimensions: OptionDimension[]): Array<Record<string, string>> {
  const activeDims = dimensions.filter((d) => d.name.trim() && d.values.length > 0);
  if (activeDims.length === 0) return [];

  return activeDims.reduce<Array<Record<string, string>>>(
    (acc, dim) => {
      const results: Array<Record<string, string>> = [];
      for (const current of acc) {
        for (const val of dim.values) {
          results.push({ ...current, [dim.name.trim()]: val.trim() });
        }
      }
      return results;
    },
    [{}]
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'published':
      return { label: 'Publié', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' };
    case 'pending_approval':
      return { label: 'En attente', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' };
    case 'draft':
      return { label: 'Brouillon', badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300' };
    case 'rejected':
      return { label: 'Rejeté', badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300' };
    case 'archived':
      return { label: 'Archivé', badge: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400' };
    default:
      return { label: status, badge: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
}

function getTypeBadge(type?: string) {
  switch (type) {
    case 'digital':
      return { label: 'Numérique', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' };
    case 'serial':
      return { label: 'Licence / Clé', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300' };
    case 'service':
      return { label: 'Prestation', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300' };
    default:
      return { label: 'Physique', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300' };
  }
}

async function getErrorMessage(res: Response, fallback = 'Échec de la requête') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function syncFirstProductOnboarding(productTotal: number, currentProducts: Product[]) {
  const primaryProduct = currentProducts[0] || null;
  updateOnboardingStep('first_product', {
    completed: productTotal > 0,
    metadata: {
      product_count: productTotal,
      first_product_id: primaryProduct?.id || null,
      first_product_title: primaryProduct?.title || null,
      first_product_status: primaryProduct?.status || null,
      first_product_price: primaryProduct?.price || null,
      first_product_inventory: primaryProduct?.inventory_quantity || null,
      has_thumbnail: Boolean(primaryProduct?.thumbnail),
      category: primaryProduct?.marketplace_category_name || primaryProduct?.category || null,
      storefront_category: primaryProduct?.storefront_category_name || null,
      updated_from: 'products_page',
    },
  }).catch(() => undefined);
}

// =========================================================================
// MAIN PRODUCTS PAGE COMPONENT
// =========================================================================

export default function ProductsPage() {
  const { t, locale } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('general');
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // View Mode & Selection
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showLivePreview, setShowLivePreview] = useState(true);

  // 1-Click Variant Matrix Generator State
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [matrixDimensions, setMatrixDimensions] = useState<OptionDimension[]>([
    { id: '1', name: 'Taille', values: ['S', 'M', 'L'], inputValue: '' },
    { id: '2', name: 'Couleur', values: ['Noir', 'Blanc'], inputValue: '' },
  ]);
  const [matrixDefaultPrice, setMatrixDefaultPrice] = useState('');
  const [matrixDefaultStock, setMatrixDefaultStock] = useState('5');
  const [matrixSkuPrefix, setMatrixSkuPrefix] = useState('');
  const [selectedVariantIndexes, setSelectedVariantIndexes] = useState<Set<number>>(new Set());
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<string>('all');
  const [presetSearch, setPresetSearch] = useState<string>('');

  // Batch Variant Editing in Tab 2
  const [batchVariantPrice, setBatchVariantPrice] = useState('');
  const [batchVariantStock, setBatchVariantStock] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDigitalFile, setUploadingDigitalFile] = useState(false);
  const [compressingImages, setCompressingImages] = useState(false);
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const [enhancingDescription, setEnhancingDescription] = useState(false);

  // Categories
  const [marketplaceCategories, setMarketplaceCategories] = useState<Category[]>([]);
  const [storefrontCategories, setStorefrontCategories] = useState<Category[]>([]);
  const [newStorefrontCategory, setNewStorefrontCategory] = useState('');
  const [newStorefrontParent, setNewStorefrontParent] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Media Picker
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'thumbnail' | 'gallery'>('thumbnail');

  // Pagination & Stats
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sellerType, setSellerType] = useState<'retailer' | 'wholesaler' | 'hybrid'>('retailer');
  const [marketplaceName, setMarketplaceName] = useState('PandaMarket');
  const isWholesaleSeller = sellerType === 'wholesaler' || sellerType === 'hybrid';

  // AI Smart Fill & Photo Studio
  const [smartFillLoading, setSmartFillLoading] = useState(false);
  const [showSmartFillModal, setShowSmartFillModal] = useState(false);
  const [smartFillSuggestions, setSmartFillSuggestions] = useState<{
    suggested_title: string;
    suggested_description: string;
    suggested_hub_category_name: string;
    suggested_hub_subcategory_name: string;
    suggested_storefront_category: string;
    suggested_storefront_subcategory: string;
  } | null>(null);
  const [photoStudioLoading, setPhotoStudioLoading] = useState(false);
  const [rawOriginalImage, setRawOriginalImage] = useState<string>('');
  const [processedStudioImage, setProcessedStudioImage] = useState<string>('');
  const [studioSliderPos, setStudioSliderPos] = useState<number>(50);
  const [studioAspectRatio, setStudioAspectRatio] = useState<'1:1' | '4:5' | '16:9' | '3:4'>('1:1');
  const [studioZoomEnabled, setStudioZoomEnabled] = useState<boolean>(false);
  const [studioHistory, setStudioHistory] = useState<Array<{ id: string; presetName: string; imageUrl: string; timestamp: string }>>([]);

  // -----------------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // -----------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMatrixModal) setShowMatrixModal(false);
        else if (showSmartFillModal) setShowSmartFillModal(false);
        else if (showMediaPicker) setShowMediaPicker(false);
        else if (showDrawer) resetForm();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (showDrawer) {
          e.preventDefault();
          void handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDrawer, showMatrixModal, showSmartFillModal, showMediaPicker, form, editingProduct]);

  // -----------------------------------------------------------------------
  // DATA FETCHING
  // -----------------------------------------------------------------------

  const fetchStore = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const nextSellerType = data.store?.seller_type;
        if (nextSellerType === 'wholesaler' || nextSellerType === 'hybrid' || nextSellerType === 'retailer') {
          setSellerType(nextSellerType);
        }
      }
    } catch {
      setSellerType('retailer');
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/products?page=${page}&limit=20`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const nextProducts = Array.isArray(data.data) ? (data.data as Product[]) : [];
        const nextTotal = Number(data.meta?.total || 0);
        setProducts(nextProducts);
        setTotalPages(data.meta?.total_pages || 1);
        setTotalProducts(nextTotal);
        if (page === 1) {
          syncFirstProductOnboarding(nextTotal, nextProducts);
        }
      } else {
        setError(await getErrorMessage(res, 'Impossible de charger le catalogue'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchCategories = useCallback(async () => {
    try {
      const [marketplaceRes, storefrontRes] = await Promise.all([
        fetchWithCsrf(`/api/pd/categories?locale=${locale}`, { credentials: 'include' }),
        fetchWithCsrf('/api/pd/stores/me/categories', { credentials: 'include' }),
      ]);
      if (marketplaceRes.ok) {
        const data = await marketplaceRes.json();
        setMarketplaceCategories(data.data || []);
      }
      if (storefrontRes.ok) {
        const data = await storefrontRes.json();
        setStorefrontCategories(data.data || []);
      }
    } catch {
      setError('Impossible de charger les catégories');
    }
  }, [locale]);

  const fetchMediaItems = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/media?limit=100', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.data || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchStore();
    fetchCategories();
    fetchMediaItems();
  }, [fetchStore, fetchCategories, fetchMediaItems]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === '1' || params.get('new') === '1') {
      setShowDrawer(true);
    }
    const editId = params.get('edit');
    if (editId) {
      if (editingProduct?.id === editId) return;
      const existingProduct = products.find((p) => p.id === editId);
      if (existingProduct) {
        startEdit(existingProduct);
      }
    }
  }, [products, editingProduct]);

  // -----------------------------------------------------------------------
  // PRODUCT COMPUTATIONS & KPI METRICS
  // -----------------------------------------------------------------------

  const publishedCount = useMemo(() => products.filter((p) => p.status === 'published').length, [products]);
  const draftCount = useMemo(() => products.filter((p) => p.status === 'draft' || p.status === 'pending_approval').length, [products]);
  const lowStockCount = useMemo(() => products.filter((p) => p.inventory_quantity <= 5).length, [products]);
  const totalStockCount = useMemo(() => products.reduce((acc, p) => acc + (p.inventory_quantity || 0), 0), [products]);

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(term);
        const matchesSku = p.product_reference?.toLowerCase().includes(term);
        const matchesCategory = p.marketplace_category_name?.toLowerCase().includes(term) || p.storefront_category_name?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesSku && !matchesCategory) return false;
      }
      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'low_stock') {
          if (p.inventory_quantity > 5) return false;
        } else if (p.status !== statusFilter) {
          return false;
        }
      }
      // Type
      if (typeFilter !== 'all' && (p.type || 'physical') !== typeFilter) {
        return false;
      }
      // Category
      if (categoryFilter !== 'all' && p.marketplace_category_id !== categoryFilter && p.storefront_category_id !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [products, search, statusFilter, typeFilter, categoryFilter]);

  // -----------------------------------------------------------------------
  // 1-CLICK VARIANT MATRIX GENERATION ENGINE
  // -----------------------------------------------------------------------

  const matrixCombinationsCount = useMemo(() => {
    const activeDims = matrixDimensions.filter((d) => d.name.trim() && d.values.length > 0);
    if (activeDims.length === 0) return 0;
    return activeDims.reduce((acc, dim) => acc * dim.values.length, 1);
  }, [matrixDimensions]);

  const filteredPresets = useMemo(() => {
    return OPTION_PRESETS.filter((preset) => {
      if (presetCategoryFilter !== 'all' && preset.category !== presetCategoryFilter) {
        return false;
      }
      if (presetSearch.trim()) {
        const term = presetSearch.toLowerCase();
        const matchName = preset.name.toLowerCase().includes(term);
        const matchOpt = preset.optionName.toLowerCase().includes(term);
        const matchVal = preset.values.some((v) => v.toLowerCase().includes(term));
        if (!matchName && !matchOpt && !matchVal) return false;
      }
      return true;
    });
  }, [presetCategoryFilter, presetSearch]);

  const handleApplyMatrixGenerator = () => {
    const combinations = generateCartesianCombinations(matrixDimensions);
    if (combinations.length === 0) {
      setError('Veuillez ajouter au moins une option avec des valeurs valides.');
      return;
    }

    const baseTitle = form.title.trim() || 'Produit';
    const baseRef = matrixSkuPrefix.trim() || form.product_reference.trim() || normalizePermalink(baseTitle).slice(0, 8).toUpperCase();
    const defaultPrice = matrixDefaultPrice.trim() || form.price || '0.000';
    const defaultStock = matrixDefaultStock.trim() || '5';

    const newVariants: ProductVariantForm[] = combinations.map((combo) => {
      const optionEntries = Object.entries(combo);
      const firstEntry = optionEntries[0] || ['Option', 'Valeur'];
      const subTitle = optionEntries.map(([_, v]) => v).join(' / ');
      const skuSuffix = optionEntries.map(([_, v]) => normalizePermalink(v).toUpperCase()).join('-');
      const sku = `${baseRef}-${skuSuffix}`;

      return {
        sku,
        title: `${baseTitle} - ${subTitle}`,
        price: defaultPrice,
        inventory_quantity: defaultStock,
        option_name: firstEntry[0],
        option_value: firstEntry[1],
        options: combo,
      };
    });

    setForm((curr) => ({
      ...curr,
      variants: [...curr.variants, ...newVariants],
    }));

    setShowMatrixModal(false);
    setSuccess(`🎉 ${newVariants.length} déclinaisons générées automatiquement avec succès !`);
  };

  const handleApplyOptionPreset = (preset: (typeof OPTION_PRESETS)[0]) => {
    setMatrixDimensions((prev) => {
      const existingIdx = prev.findIndex((d) => d.name.toLowerCase() === preset.optionName.toLowerCase());
      if (existingIdx >= 0) {
        return prev.map((d, i) => (i === existingIdx ? { ...d, values: Array.from(new Set([...d.values, ...preset.values])) } : d));
      }
      return [...prev, { id: String(Date.now()), name: preset.optionName, values: [...preset.values], inputValue: '' }];
    });
  };

  const handleAddValueToDimension = (dimIndex: number, rawValue: string) => {
    const val = rawValue.trim();
    if (!val) return;
    setMatrixDimensions((prev) =>
      prev.map((dim, idx) => {
        if (idx !== dimIndex) return dim;
        if (dim.values.includes(val)) return { ...dim, inputValue: '' };
        return { ...dim, values: [...dim.values, val], inputValue: '' };
      })
    );
  };

  const handleRemoveValueFromDimension = (dimIndex: number, valueIndex: number) => {
    setMatrixDimensions((prev) =>
      prev.map((dim, idx) => {
        if (idx !== dimIndex) return dim;
        return { ...dim, values: dim.values.filter((_, vi) => vi !== valueIndex) };
      })
    );
  };

  // Wholesale Preset Strategy Handler
  const handleApplyWholesalePreset = (preset: WholesalePreset) => {
    const basePrice = parseFloat(form.price);
    if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
      setError('Veuillez d’abord renseigner un prix unitaire de détail public valide (ex: 50.000 TND).');
      return;
    }

    const calculatedTiers = preset.tiers.map((t) => {
      const discountedPrice = Math.max(0.001, basePrice * (1 - t.discountPct / 100));
      return {
        min_quantity: t.min_quantity,
        unit_price: discountedPrice.toFixed(3),
      };
    });

    setForm((curr) => ({
      ...curr,
      wholesale_min_quantity: calculatedTiers[0]?.min_quantity || '2',
      wholesale_price_tiers: calculatedTiers,
    }));
    setSuccess(`Stratégie de prix de gros "${preset.name}" appliquée avec succès !`);
  };

  // Batch Variant Table Actions in Drawer
  const handleSelectAllVariants = () => {
    if (selectedVariantIndexes.size === form.variants.length) {
      setSelectedVariantIndexes(new Set());
    } else {
      setSelectedVariantIndexes(new Set(form.variants.map((_, i) => i)));
    }
  };

  const handleToggleSelectVariant = (index: number) => {
    setSelectedVariantIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleApplyBatchVariantPrice = () => {
    if (!batchVariantPrice || selectedVariantIndexes.size === 0) return;
    setForm((curr) => ({
      ...curr,
      variants: curr.variants.map((v, i) => (selectedVariantIndexes.has(i) ? { ...v, price: batchVariantPrice } : v)),
    }));
    setSuccess(`Prix appliqué à ${selectedVariantIndexes.size} variante(s).`);
  };

  const handleApplyBatchVariantStock = () => {
    if (!batchVariantStock || selectedVariantIndexes.size === 0) return;
    setForm((curr) => ({
      ...curr,
      variants: curr.variants.map((v, i) => (selectedVariantIndexes.has(i) ? { ...v, inventory_quantity: batchVariantStock } : v)),
    }));
    setSuccess(`Stock appliqué à ${selectedVariantIndexes.size} variante(s).`);
  };

  const handleDeleteSelectedVariants = () => {
    if (selectedVariantIndexes.size === 0) return;
    setForm((curr) => ({
      ...curr,
      variants: curr.variants.filter((_, i) => !selectedVariantIndexes.has(i)),
    }));
    setSelectedVariantIndexes(new Set());
    setSuccess('Variantes sélectionnées supprimées.');
  };

  // -----------------------------------------------------------------------
  // AI SMART FILL & PHOTO STUDIO HANDLERS
  // -----------------------------------------------------------------------

  const handleSmartFill = async () => {
    if (!form.title && !form.description && !form.thumbnail) {
      setError("Veuillez d'abord saisir un titre, une description ou ajouter une image.");
      return;
    }

    setSmartFillLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/ai/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          image_url: form.thumbnail,
          language: locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Génération intelligente échouée.');

      setSmartFillSuggestions(data.suggestions);
      setShowSmartFillModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération IA.');
    } finally {
      setSmartFillLoading(false);
    }
  };

  const applySmartFillItem = (field: 'title' | 'description' | 'hub_category' | 'storefront_category') => {
    if (!smartFillSuggestions) return;
    setForm((prev) => {
      const next = { ...prev };
      if (field === 'title') next.title = smartFillSuggestions.suggested_title;
      if (field === 'description') next.description = smartFillSuggestions.suggested_description;
      if (field === 'hub_category') {
        const found = marketplaceCategories.find((c) =>
          c.name.toLowerCase().includes(smartFillSuggestions.suggested_hub_category_name.toLowerCase()),
        );
        if (found) next.marketplace_category_id = found.id;
      }
      if (field === 'storefront_category') {
        const found = storefrontCategories.find((c) =>
          c.name.toLowerCase().includes(smartFillSuggestions.suggested_storefront_category.toLowerCase()),
        );
        if (found) next.storefront_category_id = found.id;
      }
      return next;
    });
  };

  const applyAllSmartFill = () => {
    if (!smartFillSuggestions) return;
    applySmartFillItem('title');
    applySmartFillItem('description');
    applySmartFillItem('hub_category');
    applySmartFillItem('storefront_category');
    setShowSmartFillModal(false);
    setSuccess('Toutes les informations suggérées par l’IA ont été appliquées avec succès !');
  };

  const handlePhotoStudioReplaceBackground = async (preset: string) => {
    if (!form.thumbnail) {
      setError("Veuillez d'abord importer une image principale de produit avant d'utiliser le Studio Photo.");
      return;
    }

    const currentBase = rawOriginalImage || form.thumbnail;
    if (!rawOriginalImage) {
      setRawOriginalImage(currentBase);
    }

    setPhotoStudioLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/ai/photo-studio/replace-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          image_url: currentBase,
          preset,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Remplacement de fond échoué.');

      const nextImageUrl = data.processed_image_url || currentBase;
      setProcessedStudioImage(nextImageUrl);
      setStudioSliderPos(50);

      const presetMeta = STUDIO_PRESETS.find((p) => p.id === preset);
      setStudioHistory((prev) => [
        {
          id: String(Date.now()),
          presetName: presetMeta ? `${presetMeta.icon} ${presetMeta.name}` : `Studio ${preset}`,
          imageUrl: nextImageUrl,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev.slice(0, 7),
      ]);

      setSuccess(`Fond studio "${preset}" appliqué avec succès par l'IA ! Inspectez le résultat avec le comparateur avant/après.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur Studio Photo.');
    } finally {
      setPhotoStudioLoading(false);
    }
  };

  const handlePhotoStudioGenerateGallery = async () => {
    if (!form.title) {
      setError('Veuillez renseigner un titre de produit avant de générer la galerie photo.');
      return;
    }

    setPhotoStudioLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/ai/photo-studio/generate-gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_title: form.title,
          image_url: form.thumbnail || undefined,
          style: 'lifestyle',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Génération de la galerie échouée.');

      if (Array.isArray(data.gallery_images)) {
        setForm((prev) => ({
          ...prev,
          gallery_images: Array.from(new Set([...prev.gallery_images, ...data.gallery_images])).slice(0, 8),
        }));
        setSuccess("2 nouvelles photos de galerie et mockups publicitaires générées par l'IA !");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de génération de galerie.');
    } finally {
      setPhotoStudioLoading(false);
    }
  };

  const handlePhotoStudioEnhance = async () => {
    if (!form.thumbnail) {
      setError("Veuillez d'abord importer une image de produit.");
      return;
    }

    const currentBase = rawOriginalImage || form.thumbnail;
    if (!rawOriginalImage) {
      setRawOriginalImage(currentBase);
    }

    setPhotoStudioLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/ai/photo-studio/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ image_url: currentBase }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Sublimation d'image échouée.");

      const nextImageUrl = data.enhanced_image_url || currentBase;
      setProcessedStudioImage(nextImageUrl);
      setStudioSliderPos(50);

      setStudioHistory((prev) => [
        {
          id: String(Date.now()),
          presetName: '✨ Sublimation 4K UHD',
          imageUrl: nextImageUrl,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev.slice(0, 7),
      ]);

      setSuccess("Éclairage, balance des blancs et résolution 4K sublimés par l'IA !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'amélioration d'image.");
    } finally {
      setPhotoStudioLoading(false);
    }
  };

  const handleDownloadImage = (url: string, filename = 'produit-studio-4k.webp') => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleEnhanceDescription = async () => {
    const title = form.title.trim();
    if (!title) {
      setError("Saisissez un titre de produit avant d'enrichir la description.");
      return;
    }
    setError('');
    setSuccess('');
    setEnhancingDescription(true);
    try {
      const marketCategory = marketplaceCategories.find((category) => category.id === form.marketplace_category_id)?.name;
      const res = await fetchWithCsrf('/api/pd/ai/product-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_id: editingProduct?.id,
          title,
          current_description: form.description.trim() || undefined,
          category: marketCategory || undefined,
          attributes: form.attributes
            .map((attribute) => ({ name: attribute.name.trim(), value: attribute.value.trim() }))
            .filter((attribute) => attribute.name && attribute.value),
          language: locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr',
          tone: 'friendly',
        }),
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Échec d'enrichissement IA de la description"));
      }
      const data = await res.json();
      const description = data.description?.description_html;
      if (!description) throw new Error("Aucune description HTML renvoyée par l'IA.");
      setForm((current) => ({ ...current, description }));
      setSuccess("Fiche produit enrichie par l'IA avec succès !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec d'enrichissement de la description");
    } finally {
      setEnhancingDescription(false);
    }
  };

  // -----------------------------------------------------------------------
  // BULK ACTIONS FOR PRODUCTS
  // -----------------------------------------------------------------------
  const toggleSelectAll = () => {
    if (selectedIds.size === visibleProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleProducts.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setError('');
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetchWithCsrf(`/api/pd/stores/me/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus }),
          }),
        ),
      );
      setSelectedIds(new Set());
      await fetchProducts();
      setSuccess(`${selectedIds.size} produits mis à jour en statut "${newStatus}".`);
    } catch {
      setError('Échec de la mise à jour groupée');
    }
  };

  // -----------------------------------------------------------------------
  // DRAWER & FORM MANAGEMENT
  // -----------------------------------------------------------------------

  const resetForm = () => {
    setForm(emptyForm);
    setEditingProduct(null);
    setShowDrawer(false);
    setDrawerTab('general');
    setSelectedVariantIndexes(new Set());
    setRawOriginalImage('');
    setProcessedStudioImage('');
    setStudioSliderPos(50);
    setStudioZoomEnabled(false);
    setStudioHistory([]);
    setSuccess('');
    setError('');
  };

  const startEdit = (product: Product) => {
    const thumbnailImage = product.images?.find((image) => image.is_thumbnail);
    const wholesalePricing = product.metadata?.wholesale_pricing;
    const initialThumb = thumbnailImage?.url || product.thumbnail || '';
    setEditingProduct(product);
    setRawOriginalImage(initialThumb);
    setProcessedStudioImage(initialThumb);
    setStudioSliderPos(50);
    setStudioZoomEnabled(false);
    setStudioHistory([]);
    setForm({
      type: product.type || 'physical',
      title: product.title,
      slug: product.slug || '',
      product_reference: product.product_reference || '',
      price: String(product.price),
      marketplace_category_id: product.marketplace_category_id || '',
      storefront_category_id: product.storefront_category_id || '',
      inventory_quantity: String(product.inventory_quantity ?? 0),
      description: product.description || '',
      thumbnail: initialThumb,
      gallery_images: (product.images || []).filter((image) => !image.is_thumbnail).map((image) => image.url),
      seo_title: product.seo_title || '',
      seo_description: product.seo_description || '',
      tags: (product.tags || []).join(', '),
      attributes: product.attributes || [],
      max_downloads: String(product.max_downloads ?? 5),
      download_expires_hours: String(product.download_expires_hours ?? 72),
      digital_file_key: product.digital_file_key || '',
      digital_file_name: product.digital_file_name || '',
      digital_file_content_type: product.digital_file_content_type || '',
      digital_file_size: product.digital_file_size ? String(product.digital_file_size) : '',
      license_keys: '',
      wholesale_min_quantity: String(wholesalePricing?.min_quantity ?? 2),
      wholesale_price_tiers: wholesalePricing?.price_tiers?.length
        ? wholesalePricing.price_tiers.map((tier) => ({
            min_quantity: String(tier.min_quantity),
            unit_price: String(tier.unit_price),
          }))
        : [{ min_quantity: String(wholesalePricing?.min_quantity ?? 2), unit_price: '' }],
      cost_price: String(product.metadata?.cost_price || ''),
      variants: (product.variants || []).map((variant) => {
        const firstOption = Object.entries(variant.options || {})[0];
        return {
          id: variant.id,
          sku: variant.sku || '',
          title: variant.title,
          price: String(variant.price),
          inventory_quantity: String(variant.inventory_quantity ?? 0),
          option_name: firstOption?.[0] || '',
          option_value: firstOption?.[1] || '',
          options: variant.options || {},
        };
      }),
      status: product.status,
    });
    setMatrixDefaultPrice(String(product.price));
    setDrawerTab('general');
    setShowDrawer(true);
  };

  // Upload helpers
  const uploadProductFile = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Veuillez importer une image JPG, PNG ou WebP.');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("L'image ne doit pas dépasser 10 Mo.");
    }

    const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type,
        purpose: 'product_image',
      }),
    });

    if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes, "Échec de préparation de l'image"));

    const data = await presignRes.json();
    const uploadUrl = data.upload_url as string | undefined;
    const publicUrl = data.public_url as string | undefined;

    if (!uploadUrl || !publicUrl) throw new Error("URL de téléversement manquante");

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    if (!uploadRes.ok) throw new Error("Échec de l'envoi de l'image.");
    return publicUrl;
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setError('');
    setSuccess('');
    setUploadingImage(true);
    try {
      const publicUrl = await uploadProductFile(file);
      setForm((current) => ({ ...current, thumbnail: publicUrl }));
      setRawOriginalImage(publicUrl);
      setProcessedStudioImage(publicUrl);
      setStudioSliderPos(50);
      setStudioHistory([]);
      await fetchMediaItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de téléversement d'image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    setSuccess('');
    setUploadingImage(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadProductFile(file));
      }
      setForm((current) => ({
        ...current,
        gallery_images: [...current.gallery_images, ...urls],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de téléversement de la galerie');
    } finally {
      setUploadingImage(false);
    }
  };

  const saveProductImage = async (productId: string, thumbnail: string) => {
    if (!thumbnail.trim()) return;
    await fetchWithCsrf(`/api/pd/stores/me/products/${productId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        url: thumbnail.trim(),
        alt_text: form.title.trim(),
        is_thumbnail: true,
      }),
    });
  };

  const saveGalleryImages = async (productId: string) => {
    const existingUrls = new Set((editingProduct?.images || []).filter((image) => !image.is_thumbnail).map((image) => image.url));
    const newUrls = form.gallery_images.filter((url) => url.trim() && !existingUrls.has(url.trim()));
    for (const url of newUrls) {
      await fetchWithCsrf(`/api/pd/stores/me/products/${productId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          url: url.trim(),
          alt_text: form.title.trim(),
          is_thumbnail: false,
        }),
      });
    }
  };

  const deleteRemovedGalleryImages = async (productId: string) => {
    const keptUrls = new Set(form.gallery_images.map((url) => url.trim()).filter(Boolean));
    const removedImages = (editingProduct?.images || []).filter((image) => !image.is_thumbnail && !keptUrls.has(image.url));
    for (const image of removedImages) {
      await fetchWithCsrf(`/api/pd/stores/me/products/${productId}/images/${image.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    }
  };

  // Save product handler
  const handleSave = async () => {
    setError('');
    setSuccess('');
    const price = Number(form.price);
    const inventory = Number(form.inventory_quantity || 0);
    const maxDownloads = Number(form.max_downloads || 5);
    const downloadExpiresHours = Number(form.download_expires_hours || 72);
    const licenseKeys = parseLicenseKeys(form.license_keys);
    const wholesaleMinQuantity = Number(form.wholesale_min_quantity || 0);
    const wholesalePriceTiers = parseWholesalePriceTiers(form.wholesale_price_tiers);
    const variants = parseProductVariants(form.variants);

    if (!form.title.trim()) {
      setError('Le titre du produit est obligatoire.');
      setDrawerTab('general');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError('Le prix doit être un nombre positif valide.');
      setDrawerTab('pricing');
      return;
    }

    const attributes = form.attributes
      .map((attribute) => ({ name: attribute.name.trim(), value: attribute.value.trim() }))
      .filter((attribute) => attribute.name || attribute.value);

    setCreating(true);
    try {
      const isEditing = Boolean(editingProduct);
      const res = await fetchWithCsrf(isEditing ? `/api/pd/stores/me/products/${editingProduct!.id}` : '/api/pd/stores/me/products', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || undefined,
          product_reference: form.product_reference.trim() || null,
          marketplace_category_id: form.marketplace_category_id || null,
          storefront_category_id: form.storefront_category_id || null,
          price,
          inventory_quantity: Number.isFinite(inventory) && inventory >= 0 ? inventory : 0,
          thumbnail: form.thumbnail.trim() || null,
          seo_title: form.seo_title.trim() || null,
          seo_description: form.seo_description.trim() || null,
          tags: parseTags(form.tags),
          attributes,
          max_downloads: Number.isFinite(maxDownloads) && maxDownloads > 0 ? maxDownloads : 5,
          download_expires_hours: Number.isFinite(downloadExpiresHours) && downloadExpiresHours > 0 ? downloadExpiresHours : 72,
          digital_file_key: form.digital_file_key || null,
          digital_file_name: form.digital_file_name || null,
          digital_file_content_type: form.digital_file_content_type || null,
          digital_file_size: form.digital_file_size ? Number(form.digital_file_size) : null,
          license_keys: form.type === 'serial' ? licenseKeys : undefined,
          wholesale_min_quantity: isWholesaleSeller ? wholesaleMinQuantity : undefined,
          wholesale_price_tiers: isWholesaleSeller ? wholesalePriceTiers : undefined,
          metadata: {
            ...(editingProduct?.metadata || {}),
            cost_price: form.cost_price ? parseFloat(form.cost_price) : undefined,
          },
          variants,
          status: form.status,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const productId = data.product?.id || editingProduct?.id;
        const thumbnailChanged = form.thumbnail.trim() !== (editingProduct?.thumbnail || '').trim();
        if (productId && form.thumbnail.trim() && (!editingProduct || thumbnailChanged)) {
          await saveProductImage(productId, form.thumbnail);
        }
        if (productId) {
          await deleteRemovedGalleryImages(productId);
          await saveGalleryImages(productId);
        }
        resetForm();
        await fetchProducts();
        setSuccess(isEditing ? 'Produit mis à jour avec succès.' : 'Nouveau produit créé avec succès.');
      } else {
        setError(await getErrorMessage(res, isEditing ? 'Échec de mise à jour' : 'Échec de création'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce produit ?')) return;
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setProducts((current) => current.filter((product) => product.id !== productId));
        setTotalProducts((current) => Math.max(0, current - 1));
        setSuccess('Produit supprimé avec succès.');
      } else {
        setError(await getErrorMessage(res, 'Échec de suppression'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    }
  };

  const handleStatusChange = async (product: Product, status: string) => {
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/stores/me/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        const data = await res.json();
        setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, ...data.product } : item)));
        setSuccess(`Statut mis à jour : ${status}`);
      } else {
        setError(await getErrorMessage(res, 'Impossible de modifier le statut'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HIGH-CRAFT STATS & COMMAND BAR */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-[#B91C1C] text-white shadow-lg shadow-red-500/20">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#B91C1C]">
                  Studio Catalogue Vendeur
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Stock Total: <strong className="text-slate-800 dark:text-slate-200">{totalStockCount}</strong> unités
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Gestion des Produits & Studio IA
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                Gérez votre inventaire, configurez vos déclinaisons SKU et sublimez vos photos studio en 1 clic.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Vue Tableau Dense"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Vue Grille Studio"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowDrawer(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2.5 text-xs font-black text-white hover:bg-[#991B1B] shadow-md shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Nouveau Produit
            </button>
            <button
              type="button"
              onClick={() => void fetchProducts()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#B91C1C]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50/90 dark:bg-red-950/30 p-3 text-xs font-bold text-red-700 dark:text-red-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {success && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 dark:bg-emerald-950/30 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
            <button type="button" onClick={() => setSuccess('')} className="p-1 hover:bg-emerald-100 rounded">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* KPI Metric Cards */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-bold opacity-70 uppercase tracking-wider">Total Références</span>
            <p className="mt-1 text-xl font-black">{totalProducts}</p>
          </div>

          <div
            onClick={() => setStatusFilter((curr) => (curr === 'published' ? 'all' : 'published'))}
            className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
              statusFilter === 'published'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 hover:border-emerald-200'
            }`}
          >
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Publiés & En Ligne
            </span>
            <p className="mt-1 text-xl font-black text-emerald-900 dark:text-emerald-200">{publishedCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter((curr) => (curr === 'draft' ? 'all' : 'draft'))}
            className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
              statusFilter === 'draft'
                ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-bold opacity-70 uppercase tracking-wider">Brouillons</span>
            <p className="mt-1 text-xl font-black">{draftCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter((curr) => (curr === 'low_stock' ? 'all' : 'low_stock'))}
            className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
              statusFilter === 'low_stock'
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 hover:border-amber-200'
            }`}
          >
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Alertes Stock Faible
            </span>
            <p className="mt-1 text-xl font-black text-amber-900 dark:text-amber-200">{lowStockCount}</p>
          </div>
        </div>
      </div>

      {/* 2. CATALOG SEARCH & MODULAR FILTER BAR */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, SKU, catégorie..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#B91C1C]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-[#B91C1C]"
          >
            <option value="all">Tous les Statuts</option>
            <option value="published">Publiés</option>
            <option value="draft">Brouillons</option>
            <option value="pending_approval">En attente</option>
            <option value="low_stock">Stock Faible (≤5)</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-[#B91C1C]"
          >
            <option value="all">Tous les Types</option>
            <option value="physical">Physique</option>
            <option value="digital">Numérique</option>
            <option value="serial">Licence / Série</option>
            <option value="service">Prestation</option>
          </select>

          {/* Hub Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-[#B91C1C]"
          >
            <option value="all">Toutes les Catégories</option>
            {marketplaceCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. PRODUCT CATALOG: DENSE TABLE OR VISUAL GRID */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-xs font-semibold text-slate-400">
            <Loader2 className="w-8 h-8 text-[#B91C1C] animate-spin mb-2" />
            <span>Chargement du catalogue...</span>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400 space-y-3">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Package className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Aucun produit ne correspond à vos critères.</p>
            <p className="text-slate-400">Ajoutez un nouveau produit ou réinitialisez vos filtres de recherche.</p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowDrawer(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B91C1C] text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Créer mon premier produit
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* TABULAR DENSE VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-3.5 pl-6 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === visibleProducts.length && visibleProducts.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-[#B91C1C] focus:ring-[#B91C1C]"
                    />
                  </th>
                  <th className="py-3.5 px-3">Visuel & Produit</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3">Prix Unitaire</th>
                  <th className="py-3.5 px-3">Stock Dispo</th>
                  <th className="py-3.5 px-3">Statut</th>
                  <th className="py-3.5 px-3">Catégories Hub & Vitrine</th>
                  <th className="py-3.5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {visibleProducts.map((product) => {
                  const statusMeta = getStatusBadge(product.status);
                  const typeMeta = getTypeBadge(product.type);
                  const isLowStock = product.inventory_quantity <= 5;
                  const isSelected = selectedIds.has(product.id);

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group ${
                        isSelected ? 'bg-red-50/30 dark:bg-red-950/20' : ''
                      }`}
                    >
                      {/* Select Checkbox */}
                      <td className="py-3 pl-6 pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(product.id)}
                          className="rounded border-slate-300 text-[#B91C1C] focus:ring-[#B91C1C]"
                        />
                      </td>

                      {/* Product & Visual */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 flex-shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shadow-sm">
                            {product.thumbnail ? (
                              <img src={product.thumbnail} alt={product.title} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs group-hover:text-[#B91C1C] transition-colors">
                              {product.title}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 truncate">
                              {product.product_reference || product.slug || product.id.slice(-8)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${typeMeta.color}`}>
                          {typeMeta.label}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-white text-sm">
                        {formatPrice(product.price)}
                      </td>

                      {/* Inventory Stock */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                            isLowStock
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {isLowStock && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />}
                          {product.inventory_quantity} en stock
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <select
                          value={product.status}
                          onChange={(e) => handleStatusChange(product, e.target.value)}
                          className={`text-[11px] font-bold border rounded-lg px-2 py-1 outline-none ${statusMeta.badge}`}
                        >
                          <option value="published">Publié</option>
                          <option value="draft">Brouillon</option>
                          <option value="archived">Archivé</option>
                        </select>
                      </td>

                      {/* Categories */}
                      <td className="py-3 px-3 text-[11px] text-slate-500 space-y-0.5 max-w-[200px] truncate">
                        <p className="truncate font-semibold text-slate-700 dark:text-slate-300">
                          🌐 {product.marketplace_category_name || product.category || 'Non classé'}
                        </p>
                        <p className="truncate text-[10px] text-slate-400">
                          🏪 {product.storefront_category_name || 'Vitrine générale'}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={getHubProductHref(product)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="Voir en boutique"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          {product.status === 'published' && (
                            <a
                              href={`/hub/dashboard/ads?product_id=${encodeURIComponent(product.id)}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="Sponsoriser / Campagne Ads"
                            >
                              <Megaphone className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                            title="Modifier dans le Studio"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* VISUAL STUDIO GRID VIEW */
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {visibleProducts.map((product) => {
              const statusMeta = getStatusBadge(product.status);
              const typeMeta = getTypeBadge(product.type);
              const isSelected = selectedIds.has(product.id);

              return (
                <div
                  key={product.id}
                  className={`group relative rounded-2xl border overflow-hidden bg-white dark:bg-slate-800/60 shadow-sm transition-all hover:shadow-md ${
                    isSelected ? 'border-[#B91C1C] ring-2 ring-red-500/20' : 'border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  {/* Select Tag */}
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(product.id)}
                      className="rounded border-white/80 bg-white/80 text-[#B91C1C] shadow"
                    />
                  </div>

                  {/* Top Status & Type Badges */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border shadow-sm ${typeMeta.color}`}>
                      {typeMeta.label}
                    </span>
                  </div>

                  {/* Thumbnail Image with Hover Zoom */}
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                    {product.thumbnail ? (
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Package className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    )}

                    {/* Quick Action Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        className="p-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 shadow-lg font-bold text-xs flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" /> Éditer
                      </button>
                      <a
                        href={getHubProductHref(product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 shadow-lg"
                        title="Aperçu"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      </a>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 space-y-2 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white truncate" title={product.title}>
                      {product.title}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {formatPrice(product.price)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusMeta.badge}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <span>Stock: {product.inventory_quantity}</span>
                      <span className="truncate max-w-[110px] text-right">{product.marketplace_category_name || 'Non classé'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-800/30">
          <span>
            Page {page} sur {totalPages} · {totalProducts} références totales
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((c) => Math.max(1, c - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

      {/* 4. FLOATING BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-950 text-white shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-5 duration-200">
          <span className="text-xs font-bold text-slate-300">
            <strong className="text-white">{selectedIds.size}</strong> sélectionné(s)
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            type="button"
            onClick={() => handleBulkStatusChange('published')}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold transition-colors"
          >
            Publier
          </button>
          <button
            type="button"
            onClick={() => handleBulkStatusChange('draft')}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors"
          >
            Brouillon
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-1.5 text-slate-400 hover:text-white"
            title="Désélectionner tout"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODULAR PRODUCT STUDIO DRAWER (THE CORE WORKSPACE) */}
      {/* ========================================================================= */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-red-500 to-[#B91C1C] text-white shadow-md shadow-red-500/20">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    {editingProduct ? 'Modifier le Produit' : 'Créer un Nouveau Produit'}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Studio d’édition modulaire et enrichissement IA</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLivePreview((curr) => !curr)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    showLivePreview
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700'
                  }`}
                  title="Afficher/Masquer l'aperçu boutique en direct"
                >
                  <Eye className="w-3.5 h-3.5 inline mr-1" />
                  Aperçu Live
                </button>
                <button
                  type="button"
                  onClick={() => void handleSmartFill()}
                  disabled={smartFillLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-purple-500/20 hover:scale-105 transition-all disabled:opacity-50"
                  title="L'IA analyse vos mots-clés et remplit automatiquement le titre, la description et la catégorisation !"
                >
                  {smartFillLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-yellow-300" />}
                  <span>Assistant Magique IA</span>
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modular Drawer Tab Navigation */}
            <div className="flex items-center gap-1 overflow-x-auto px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 no-scrollbar">
              {[
                { id: 'general', label: '1. Fiche & Type', icon: Package, done: Boolean(form.title) },
                { id: 'pricing', label: '2. Prix & Variantes', icon: Coins, done: Boolean(form.price) },
                { id: 'taxonomy', label: '3. Catégories', icon: Tag, done: Boolean(form.marketplace_category_id || form.storefront_category_id) },
                { id: 'description', label: '4. Description HTML', icon: FileText, done: Boolean(form.description) },
                { id: 'media', label: '5. Studio Photo IA', icon: ImageIcon, done: Boolean(form.thumbnail) },
                { id: 'seo', label: '6. SEO & Tags', icon: GlobeIcon, done: Boolean(form.seo_title || form.tags) },
                { id: 'digital', label: '7. Fichiers Digitaux', icon: Download, done: Boolean(form.digital_file_key) },
              ].map((tab) => {
                const isActive = drawerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDrawerTab(tab.id as DrawerTab)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {tab.done && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {/* Drawer Body: Form Inputs + Optional Live Preview */}
            <div className="flex-1 overflow-y-auto p-6 flex gap-6">
              {/* Main Tab Area */}
              <div className="flex-1 space-y-6">
                {/* TAB 1: GENERAL INFO */}
                {drawerTab === 'general' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Titre du Produit *
                        </label>
                        <input
                          type="text"
                          value={form.title}
                          onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                          placeholder="Ex: Montre Chronographe Automatique en Cuir"
                          className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Permalien / Slug URL
                        </label>
                        <input
                          type="text"
                          value={form.slug}
                          onChange={(e) => setForm((c) => ({ ...c, slug: normalizePermalink(e.target.value) }))}
                          placeholder={normalizePermalink(form.title) || 'auto-genere-depuis-titre'}
                          className="w-full px-4 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Référence SKU / Code Article
                        </label>
                        <input
                          type="text"
                          value={form.product_reference}
                          onChange={(e) => setForm((c) => ({ ...c, product_reference: e.target.value }))}
                          placeholder="SKU-2026-X01"
                          className="w-full px-4 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Famille de Produit
                        </label>
                        <select
                          value={form.type}
                          onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))}
                          className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                        >
                          <option value="physical">Physique (Colis & Livraison)</option>
                          <option value="digital">Numérique (Téléchargement)</option>
                          <option value="serial">Licence / Numéro de série</option>
                          <option value="service">Prestation de service</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Statut de Publication
                        </label>
                        <select
                          value={form.status}
                          onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}
                          className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                        >
                          <option value="published">Publié (En ligne)</option>
                          <option value="draft">Brouillon</option>
                          <option value="archived">Archivé</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: PRICING, WHOLESALE & 1-CLICK VARIANT MATRIX */}
                {drawerTab === 'pricing' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Base Pricing & Inventory */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Prix Unitaire TTC (TND) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={form.price}
                          onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))}
                          placeholder="0.000"
                          className="w-full px-4 py-2.5 text-sm font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                        />
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Quantité en Stock Global
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={form.inventory_quantity}
                          onChange={(e) => setForm((c) => ({ ...c, inventory_quantity: e.target.value }))}
                          placeholder="10"
                          className="w-full px-4 py-2.5 text-sm font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                        />
                      </div>
                    </div>

                    {/* Wholesale Pricing Tiers & Dynamic Margin Calculator */}
                    {isWholesaleSeller && (
                      <div className="p-5 rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-gradient-to-b from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 space-y-4 shadow-sm">
                        {/* Section Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 dark:border-amber-900/50 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-black text-lg">
                              📦
                            </span>
                            <div>
                              <h4 className="text-xs font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider">
                                Calculateur de Remise Dynamique B2B Wholesale & Marges
                              </h4>
                              <p className="text-[11px] text-amber-700/80 dark:text-amber-400 font-medium">
                                Définissez vos remises dégressives par volume avec simulation de marge et protection des prix
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setForm((c) => ({
                                  ...c,
                                  wholesale_price_tiers: [
                                    ...c.wholesale_price_tiers,
                                    { min_quantity: String((c.wholesale_price_tiers.length + 1) * 10), unit_price: '' },
                                  ],
                                }))
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-sm shadow-amber-500/20 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Ajouter un Palier</span>
                            </button>
                          </div>
                        </div>

                        {/* Cost Price & Retail Margin Header Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-amber-100/40 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Prix Public de Détail (Base) :
                            </span>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {parseFloat(form.price) > 0 ? `${parseFloat(form.price).toFixed(3)} TND` : <span className="text-slate-400 text-xs italic">Non défini</span>}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Coût de Revient / Achat (Optionnel) :
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={form.cost_price}
                                onChange={(e) => setForm((c) => ({ ...c, cost_price: e.target.value }))}
                                placeholder="Ex: 12.500"
                                className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Marge Brute au Détail :
                            </span>
                            {(() => {
                              const retail = parseFloat(form.price) || 0;
                              const cost = parseFloat(form.cost_price) || 0;
                              if (retail > 0 && cost > 0) {
                                const marginTnd = retail - cost;
                                const marginPct = (marginTnd / retail) * 100;
                                return (
                                  <p className={`text-xs font-black ${marginTnd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                                    +{marginTnd.toFixed(3)} TND ({marginPct.toFixed(1)}%)
                                  </p>
                                );
                              }
                              return <p className="text-xs text-slate-400 font-medium">Saisissez prix & coût pour calculer</p>;
                            })()}
                          </div>
                        </div>

                        {/* Quick Wholesale Strategy Presets */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-900/80 dark:text-amber-400">
                            ⚡ Stratégies & Courbes de Dégressivité en 1 Clic :
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {WHOLESALE_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleApplyWholesalePreset(preset)}
                                className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-800 text-left hover:border-amber-500 hover:shadow-md transition-all group"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="text-base">{preset.icon}</span>
                                  <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                                    {preset.name}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{preset.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tiers List with In-Depth Real-Time Analytics & Margin Feedback */}
                        <div className="space-y-3 pt-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Paliers Actifs ({form.wholesale_price_tiers.length}) :
                          </span>

                          {form.wholesale_price_tiers.map((tier, idx) => {
                            const minQty = parseFloat(tier.min_quantity) || 0;
                            const unitPrice = parseFloat(tier.unit_price) || 0;
                            const basePrice = parseFloat(form.price) || 0;
                            const costPrice = parseFloat(form.cost_price) || 0;

                            const discountPct = basePrice > 0 && unitPrice > 0 ? ((basePrice - unitPrice) / basePrice) * 100 : 0;
                            const buyerSavingsPerUnit = basePrice > 0 && unitPrice > 0 ? Math.max(0, basePrice - unitPrice) : 0;
                            const minBatchValue = minQty * unitPrice;
                            const netMarginTnd = costPrice > 0 && unitPrice > 0 ? unitPrice - costPrice : 0;
                            const netMarginPct = costPrice > 0 && unitPrice > 0 ? (netMarginTnd / unitPrice) * 100 : 0;
                            const batchNetProfit = netMarginTnd * minQty;

                            // Incoherence checks
                            const isHigherThanRetail = unitPrice >= basePrice && basePrice > 0 && unitPrice > 0;
                            const prevUnitPrice = idx > 0 ? parseFloat(form.wholesale_price_tiers[idx - 1].unit_price) || 0 : 0;
                            const isHigherThanPrev = prevUnitPrice > 0 && unitPrice >= prevUnitPrice;
                            const isLossMaking = costPrice > 0 && unitPrice > 0 && unitPrice < costPrice;

                            return (
                              <div
                                key={idx}
                                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                                  isHigherThanRetail || isHigherThanPrev || isLossMaking
                                    ? 'border-red-300 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20'
                                    : 'border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black">
                                      {idx + 1}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      Palier Volume {idx + 1}
                                    </span>
                                  </div>

                                  {/* Discount / Incoherence Badges */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {discountPct > 0 && !isHigherThanRetail && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        🔥 -{discountPct.toFixed(1)}% remise B2B
                                      </span>
                                    )}
                                    {isHigherThanRetail && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-700 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Prix ≥ Détail ({basePrice.toFixed(3)} TND)
                                      </span>
                                    )}
                                    {isHigherThanPrev && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Non dégressif (Palier {idx}: {prevUnitPrice.toFixed(3)} TND)
                                      </span>
                                    )}
                                    {isLossMaking && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-600 text-white flex items-center gap-1">
                                        🚨 Vente à perte (Coût: {costPrice.toFixed(3)} TND)
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setForm((c) => ({
                                          ...c,
                                          wholesale_price_tiers: c.wholesale_price_tiers.filter((_, i) => i !== idx),
                                        }))
                                      }
                                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors ml-auto"
                                      title="Supprimer ce palier"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Input Row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                                      Quantité Minimale Commandée :
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        min="2"
                                        placeholder="Ex: 10"
                                        value={tier.min_quantity}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setForm((c) => ({
                                            ...c,
                                            wholesale_price_tiers: c.wholesale_price_tiers.map((t, i) =>
                                              i === idx ? { ...t, min_quantity: val } : t,
                                            ),
                                          }));
                                        }}
                                        className="w-full px-3 py-2 text-xs font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">
                                        unités
                                      </span>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                                      Prix Unitaire Grossiste B2B :
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        placeholder="Ex: 15.000"
                                        value={tier.unit_price}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setForm((c) => ({
                                            ...c,
                                            wholesale_price_tiers: c.wholesale_price_tiers.map((t, i) =>
                                              i === idx ? { ...t, unit_price: val } : t,
                                            ),
                                          }));
                                        }}
                                        className="w-full px-3 py-2 text-xs font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">
                                        TND / unité
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Dynamic Telemetry & Margin Results Bar */}
                                {unitPrice > 0 && minQty > 0 && (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                                    <div className="space-y-0.5">
                                      <p className="text-[10px] text-slate-400 font-semibold">Panier Min. Lot :</p>
                                      <p className="font-black text-slate-900 dark:text-white">{minBatchValue.toFixed(3)} TND</p>
                                    </div>

                                    <div className="space-y-0.5">
                                      <p className="text-[10px] text-slate-400 font-semibold">Économie Acheteur :</p>
                                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {buyerSavingsPerUnit > 0 ? `-${buyerSavingsPerUnit.toFixed(3)} TND/u` : '0 TND'}
                                      </p>
                                    </div>

                                    <div className="space-y-0.5">
                                      <p className="text-[10px] text-slate-400 font-semibold">Marge Unitaire :</p>
                                      {costPrice > 0 ? (
                                        <p className={`font-black ${netMarginTnd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                                          {netMarginTnd > 0 ? `+${netMarginTnd.toFixed(3)}` : netMarginTnd.toFixed(3)} TND ({netMarginPct.toFixed(1)}%)
                                        </p>
                                      ) : (
                                        <p className="text-slate-400 italic text-[11px]">—</p>
                                      )}
                                    </div>

                                    <div className="space-y-0.5">
                                      <p className="text-[10px] text-slate-400 font-semibold">Gain Net / Commande Lot :</p>
                                      {costPrice > 0 ? (
                                        <p className={`font-black ${batchNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                                          +{batchNetProfit.toFixed(3)} TND
                                        </p>
                                      ) : (
                                        <p className="text-slate-400 italic text-[11px]">—</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ========================================================================= */}
                    {/* 1-CLICK PRODUCT VARIANT MATRIX SECTION */}
                    {/* ========================================================================= */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm space-y-4 p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#B91C1C]">
                              <Sliders className="w-4 h-4" />
                            </span>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              Matrice de Déclinaisons & Variantes SKU
                            </h4>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400 font-medium">
                            Générez instantanément toutes les combinaisons de tailles, couleurs, pointures et formats en 1 clic.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMatrixDefaultPrice(form.price || '0.000');
                              setShowMatrixModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-[#B91C1C] text-white text-xs font-black shadow-md shadow-red-500/20 hover:scale-105 transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                            <span>Générateur Matriciel 1-Clic</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setForm((c) => ({
                                ...c,
                                variants: [
                                  ...c.variants,
                                  {
                                    sku: '',
                                    title: `${c.title || 'Produit'} - Variante`,
                                    price: c.price || '0.000',
                                    inventory_quantity: '5',
                                    option_name: 'Taille',
                                    option_value: 'M',
                                    options: { Taille: 'M' },
                                  },
                                ],
                              }))
                            }
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                          >
                            + Ligne Simple
                          </button>
                        </div>
                      </div>

                      {/* Mass Actions Bar when variants are selected */}
                      {form.variants.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 text-xs">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={selectedVariantIndexes.size === form.variants.length && form.variants.length > 0}
                                onChange={handleSelectAllVariants}
                                className="rounded border-slate-300 text-[#B91C1C] focus:ring-[#B91C1C]"
                              />
                              <span>
                                {selectedVariantIndexes.size > 0
                                  ? `${selectedVariantIndexes.size} / ${form.variants.length} sélectionnée(s)`
                                  : 'Tout sélectionner'}
                              </span>
                            </label>
                          </div>

                          {selectedVariantIndexes.size > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Batch Price */}
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.001"
                                  placeholder="Prix groupé TND"
                                  value={batchVariantPrice}
                                  onChange={(e) => setBatchVariantPrice(e.target.value)}
                                  className="w-28 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={handleApplyBatchVariantPrice}
                                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-[11px] hover:bg-black"
                                >
                                  Appliquer Prix
                                </button>
                              </div>

                              {/* Batch Stock */}
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  placeholder="Stock groupé"
                                  value={batchVariantStock}
                                  onChange={(e) => setBatchVariantStock(e.target.value)}
                                  className="w-24 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={handleApplyBatchVariantStock}
                                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-[11px] hover:bg-black"
                                >
                                  Appliquer Stock
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={handleDeleteSelectedVariants}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                                title="Supprimer la sélection"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Variant Matrix Table */}
                      {form.variants.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-400 space-y-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                          <Package className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                          <p className="font-bold text-slate-600 dark:text-slate-400">Aucune variante configurée pour ce produit.</p>
                          <p>Cliquez sur "Générateur Matriciel 1-Clic" pour combiner vos options ou ajoutez une ligne simple.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-slate-400 font-bold uppercase text-[10px]">
                                <th className="py-2.5 pl-3 pr-2 w-8">#</th>
                                <th className="py-2.5 px-3">Déclinaison & Attributs</th>
                                <th className="py-2.5 px-3">Code SKU</th>
                                <th className="py-2.5 px-3 w-32">Prix Unitaire</th>
                                <th className="py-2.5 px-3 w-28">Stock Dispo</th>
                                <th className="py-2.5 pr-3 text-right w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                              {form.variants.map((variant, idx) => {
                                const isSelected = selectedVariantIndexes.has(idx);
                                const optionTags = Object.entries(variant.options || {});

                                return (
                                  <tr
                                    key={idx}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                                      isSelected ? 'bg-red-50/20 dark:bg-red-950/20' : ''
                                    }`}
                                  >
                                    <td className="py-2.5 pl-3 pr-2">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleSelectVariant(idx)}
                                        className="rounded border-slate-300 text-[#B91C1C] focus:ring-[#B91C1C]"
                                      />
                                    </td>

                                    {/* Variant Name & Attribute Badges */}
                                    <td className="py-2.5 px-3">
                                      <div className="space-y-1">
                                        <input
                                          type="text"
                                          value={variant.title}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setForm((c) => ({
                                              ...c,
                                              variants: c.variants.map((v, i) => (i === idx ? { ...v, title: val } : v)),
                                            }));
                                          }}
                                          className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                                        />
                                        {optionTags.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-1">
                                            {optionTags.map(([optName, optVal]) => (
                                              <span
                                                key={optName}
                                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                              >
                                                <strong>{optName}:</strong> {optVal}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </td>

                                    {/* SKU */}
                                    <td className="py-2.5 px-3">
                                      <input
                                        type="text"
                                        value={variant.sku}
                                        onChange={(e) => {
                                          const val = e.target.value.toUpperCase();
                                          setForm((c) => ({
                                            ...c,
                                            variants: c.variants.map((v, i) => (i === idx ? { ...v, sku: val } : v)),
                                          }));
                                        }}
                                        placeholder="SKU-AUTO"
                                        className="w-full px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 bg-white"
                                      />
                                    </td>

                                    {/* Price */}
                                    <td className="py-2.5 px-3">
                                      <input
                                        type="number"
                                        step="0.001"
                                        value={variant.price}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setForm((c) => ({
                                            ...c,
                                            variants: c.variants.map((v, i) => (i === idx ? { ...v, price: val } : v)),
                                          }));
                                        }}
                                        className="w-full px-2.5 py-1 text-xs font-black rounded-lg border border-slate-200 bg-white"
                                      />
                                    </td>

                                    {/* Stock with increment/decrement */}
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currStock = Number(variant.inventory_quantity || 0);
                                            const nextStock = Math.max(0, currStock - 1);
                                            setForm((c) => ({
                                              ...c,
                                              variants: c.variants.map((v, i) =>
                                                i === idx ? { ...v, inventory_quantity: String(nextStock) } : v
                                              ),
                                            }));
                                          }}
                                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold"
                                        >
                                          -
                                        </button>
                                        <input
                                          type="number"
                                          value={variant.inventory_quantity}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setForm((c) => ({
                                              ...c,
                                              variants: c.variants.map((v, i) => (i === idx ? { ...v, inventory_quantity: val } : v)),
                                            }));
                                          }}
                                          className="w-14 text-center px-1.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currStock = Number(variant.inventory_quantity || 0);
                                            setForm((c) => ({
                                              ...c,
                                              variants: c.variants.map((v, i) =>
                                                i === idx ? { ...v, inventory_quantity: String(currStock + 1) } : v
                                              ),
                                            }));
                                          }}
                                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </td>

                                    {/* Action Delete */}
                                    <td className="py-2.5 pr-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setForm((c) => ({
                                            ...c,
                                            variants: c.variants.filter((_, i) => i !== idx),
                                          }))
                                        }
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                        title="Supprimer cette déclinaison"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Cumulative Variant Statistics Summary */}
                      {form.variants.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 font-semibold">
                          <span>
                            📊 <strong>{form.variants.length}</strong> déclinaisons configurées · Stock cumulé :{' '}
                            <strong>{form.variants.reduce((acc, v) => acc + (Number(v.inventory_quantity) || 0), 0)}</strong> unités
                          </span>
                          <span>
                            Valeur d&apos;inventaire :{' '}
                            <strong>
                              {formatPrice(
                                form.variants.reduce((acc, v) => acc + (Number(v.price) || 0) * (Number(v.inventory_quantity) || 0), 0)
                              )}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: TAXONOMY & CATEGORIES */}
                {drawerTab === 'taxonomy' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          🌐 Catégorie Principale PandaMarket Hub
                        </label>
                        <select
                          value={form.marketplace_category_id}
                          onChange={(e) => setForm((c) => ({ ...c, marketplace_category_id: e.target.value }))}
                          className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                        >
                          <option value="">Non catégorisé sur le Hub</option>
                          {marketplaceCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.parent_name ? `└─ ${cat.name}` : cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          🏪 Catégorie Vitrine de Votre Boutique
                        </label>
                        <select
                          value={form.storefront_category_id}
                          onChange={(e) => setForm((c) => ({ ...c, storefront_category_id: e.target.value }))}
                          className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-[#B91C1C]"
                        >
                          <option value="">Non catégorisé sur la boutique</option>
                          {storefrontCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Add Storefront Category in 1-Click */}
                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex items-center gap-3">
                      <input
                        type="text"
                        value={newStorefrontCategory}
                        onChange={(e) => setNewStorefrontCategory(e.target.value)}
                        placeholder="Ajouter une nouvelle catégorie vitrine..."
                        className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newStorefrontCategory.trim()) return;
                          setCreatingCategory(true);
                          try {
                            const res = await fetchWithCsrf('/api/pd/stores/me/categories', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ name: newStorefrontCategory.trim() }),
                            });
                            const data = await res.json();
                            if (res.ok) {
                              setStorefrontCategories((curr) => [...curr, data.category]);
                              setForm((curr) => ({ ...curr, storefront_category_id: data.category.id }));
                              setNewStorefrontCategory('');
                              setSuccess('Catégorie vitrine créée et sélectionnée !');
                            }
                          } catch {}
                          setCreatingCategory(false);
                        }}
                        disabled={creatingCategory || !newStorefrontCategory.trim()}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black disabled:opacity-50"
                      >
                        {creatingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : '+ Créer'}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 4: DESCRIPTION & HTML EDITOR */}
                {drawerTab === 'description' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                          Description Commerciale & Fiche HTML
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium">Structurez vos titres H3, paragraphes et listes à puces</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleEnhanceDescription()}
                        disabled={enhancingDescription || !form.title}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                      >
                        {enhancingDescription ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Sublimer avec l&apos;IA
                      </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <ProductDescriptionEditor
                        value={form.description}
                        onChange={(val) => setForm((c) => ({ ...c, description: val }))}
                        placeholder="Décrivez les atouts majeurs, la composition et les conseils d'utilisation..."
                      />
                    </div>

                    {/* Attributes & Technical Specs */}
                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                          📋 Attributs & Caractéristiques Techniques
                        </span>
                        <button
                          type="button"
                          onClick={() => setForm((c) => ({ ...c, attributes: [...c.attributes, { name: '', value: '' }] }))}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300"
                        >
                          + Ajouter un attribut
                        </button>
                      </div>

                      {form.attributes.length > 0 && (
                        <div className="space-y-2">
                          {form.attributes.map((attr, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Propriété (ex: Matière)"
                                value={attr.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm((c) => ({
                                    ...c,
                                    attributes: c.attributes.map((a, i) => (i === idx ? { ...a, name: val } : a)),
                                  }));
                                }}
                                className="w-1/3 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                              />
                              <input
                                type="text"
                                placeholder="Valeur (ex: 100% Cuir Véritable)"
                                value={attr.value}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm((c) => ({
                                    ...c,
                                    attributes: c.attributes.map((a, i) => (i === idx ? { ...a, value: val } : a)),
                                  }));
                                }}
                                className="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((c) => ({
                                    ...c,
                                    attributes: c.attributes.filter((_, i) => i !== idx),
                                  }))
                                }
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 5: PHOTO STUDIO & AI GENERATOR */}
                {drawerTab === 'media' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    {/* Main Thumbnail Section */}
                    <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                            Image Principale / Vignette Produit
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium">Photo de couverture affichée sur la marketplace</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMediaPickerTarget('thumbnail');
                              setShowMediaPicker(true);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                          >
                            Médiathèque
                          </button>
                          <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black shadow-sm">
                            {uploadingImage ? 'Envoi...' : 'Téléverser'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => void handleImageUpload(e.target.files?.[0] || null)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                          {form.thumbnail ? (
                            <img src={form.thumbnail} alt="Vignette" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-slate-300" />
                          )}
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-slate-800 dark:text-slate-200">Format recommandé : JPG / PNG / WebP</p>
                          <p className="text-slate-400">Dimensions optimales : 1000x1000px avec fond neutre.</p>
                        </div>
                      </div>
                    </div>

                    {/* INTERACTIVE COMPARISON SLIDER & ASPECT RATIOS */}
                    {form.thumbnail && (
                      <div className="p-5 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-gradient-to-b from-purple-50/40 to-slate-50/50 dark:from-purple-950/20 dark:to-slate-900 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 dark:border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                              <Crop className="w-4 h-4" />
                            </span>
                            <div>
                              <h4 className="text-xs font-black uppercase text-purple-900 dark:text-purple-300">
                                Comparateur Avant / Après & Cadrage Ratios
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium">
                                Glissez le curseur central pour inspecter le détourage et les reflets du fond IA
                              </p>
                            </div>
                          </div>

                          {/* Aspect Ratio Selector */}
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                            {[
                              { id: '1:1', label: '1:1 Carré', desc: 'Marketplace' },
                              { id: '4:5', label: '4:5 Portrait', desc: 'Story & Social' },
                              { id: '16:9', label: '16:9 Bannière', desc: 'Vitrine Web' },
                              { id: '3:4', label: '3:4 Fiche', desc: 'Catalogue' },
                            ].map((ratio) => (
                              <button
                                key={ratio.id}
                                type="button"
                                onClick={() => setStudioAspectRatio(ratio.id as any)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  studioAspectRatio === ratio.id
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                                title={ratio.desc}
                              >
                                {ratio.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* COMPARISON CANVAS / SLIDER */}
                        <div className="relative py-2 flex flex-col items-center">
                          <div
                            onPointerDown={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                              setStudioSliderPos(pct);
                            }}
                            onPointerMove={(e) => {
                              if (e.buttons === 1) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                                setStudioSliderPos(pct);
                              }
                            }}
                            className={`relative select-none overflow-hidden rounded-2xl border-2 border-purple-200 dark:border-purple-800 bg-slate-950 shadow-2xl cursor-ew-resize transition-all duration-300 ${
                              studioAspectRatio === '4:5'
                                ? 'aspect-[4/5] w-full max-w-sm'
                                : studioAspectRatio === '16:9'
                                ? 'aspect-video w-full max-w-2xl'
                                : studioAspectRatio === '3:4'
                                ? 'aspect-[3/4] w-full max-w-sm'
                                : 'aspect-square w-full max-w-md'
                            }`}
                          >
                            {/* Background Layer: Processed Studio AI Image */}
                            <img
                              src={processedStudioImage || form.thumbnail}
                              alt="Studio Après"
                              className={`absolute inset-0 h-full w-full object-cover transition-transform duration-200 ${
                                studioZoomEnabled ? 'scale-150 origin-center' : 'scale-100'
                              }`}
                            />

                            {/* Foreground Layer: Raw Original Image (Pixel-perfect clipping without resizing) */}
                            <div
                              className="absolute inset-0 overflow-hidden"
                              style={{ clipPath: `inset(0 ${100 - studioSliderPos}% 0 0)` }}
                            >
                              <img
                                src={rawOriginalImage || form.thumbnail}
                                alt="Original Avant"
                                className={`absolute inset-0 h-full w-full object-cover transition-transform duration-200 ${
                                  studioZoomEnabled ? 'scale-150 origin-center' : 'scale-100'
                                }`}
                              />
                            </div>

                            {/* Draggable Divider Handle */}
                            <div
                              className="absolute top-0 bottom-0 pointer-events-none z-20"
                              style={{ left: `${studioSliderPos}%` }}
                            >
                              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center border-2 border-purple-600">
                                <ArrowLeftRight className="w-4 h-4 text-purple-700" />
                              </div>
                            </div>

                            {/* Floating Badges */}
                            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-black text-white uppercase tracking-wider shadow">
                              ◀ AVANT (Photo Brute)
                            </div>
                            <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-lg bg-purple-900/80 backdrop-blur-md text-[10px] font-black text-yellow-300 uppercase tracking-wider shadow flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-yellow-300" />
                              APRÈS (Studio IA 4K) ▶
                            </div>

                            {/* Live Percentage Indicator */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono text-white/90">
                              {Math.round(studioSliderPos)}% / {100 - Math.round(studioSliderPos)}%
                            </div>
                          </div>

                          {/* Slider Action Toolbar */}
                          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setStudioZoomEnabled((curr) => !curr)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                                studioZoomEnabled
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              <span>{studioZoomEnabled ? 'Zoom 200% Actif' : 'Loupe 200%'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (processedStudioImage) {
                                  setForm((c) => ({ ...c, thumbnail: processedStudioImage }));
                                  setSuccess('Image studio appliquée comme vignette principale !');
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-black hover:bg-purple-700 shadow-md shadow-purple-500/20"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Appliquer comme Vignette</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (processedStudioImage) {
                                  setForm((c) => ({ ...c, gallery_images: [...c.gallery_images, processedStudioImage] }));
                                  setSuccess('Photo studio ajoutée à la galerie !');
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Ajouter à la Galerie</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadImage(processedStudioImage || form.thumbnail)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                              title="Télécharger l'image studio en haute définition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Télécharger HD</span>
                            </button>

                            {rawOriginalImage && rawOriginalImage !== processedStudioImage && (
                              <button
                                type="button"
                                onClick={() => {
                                  setProcessedStudioImage(rawOriginalImage);
                                  setForm((c) => ({ ...c, thumbnail: rawOriginalImage }));
                                  setSuccess("Image d'origine rétablie.");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Rétablir Original</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Studio History Variations Carousel */}
                        {studioHistory.length > 0 && (
                          <div className="pt-3 border-t border-purple-100 dark:border-slate-800 space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                              Historique des décors générés ({studioHistory.length}) :
                            </span>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                              {studioHistory.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => {
                                    setProcessedStudioImage(item.imageUrl);
                                    setStudioSliderPos(50);
                                  }}
                                  className={`flex-shrink-0 cursor-pointer p-1.5 rounded-xl border transition-all flex items-center gap-2 ${
                                    processedStudioImage === item.imageUrl
                                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400'
                                  }`}
                                >
                                  <img src={item.imageUrl} alt={item.presetName} className="h-10 w-10 rounded-lg object-cover" />
                                  <div className="text-[11px] pr-1">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{item.presetName}</p>
                                    <p className="text-[9px] text-slate-400">{item.timestamp}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI Photo Studio Presets */}
                    <div className="p-5 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <h4 className="text-xs font-black uppercase text-purple-900 dark:text-purple-300">
                            Studio Photo IA & Décors Publicitaires
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handlePhotoStudioEnhance()}
                            disabled={photoStudioLoading || !form.thumbnail}
                            className="px-3 py-1 text-[11px] font-bold rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 shadow-sm disabled:opacity-50"
                          >
                            {photoStudioLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '✨ Sublimer 4K'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handlePhotoStudioGenerateGallery()}
                            disabled={photoStudioLoading || !form.title}
                            className="px-3 py-1 text-[11px] font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50"
                          >
                            {photoStudioLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '🎨 Générer Mockups'}
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-purple-700 dark:text-purple-300 leading-relaxed font-medium">
                        Détourez et intégrez instantanément votre produit dans un décor studio haut de gamme en 1 clic :
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {STUDIO_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            disabled={photoStudioLoading || !form.thumbnail}
                            onClick={() => void handlePhotoStudioReplaceBackground(preset.id)}
                            className="p-3 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-white dark:bg-slate-800 text-left hover:border-purple-400 hover:shadow-md transition-all disabled:opacity-50 space-y-1"
                          >
                            <span className="text-xl">{preset.icon}</span>
                            <p className="font-black text-xs text-slate-900 dark:text-white">{preset.name}</p>
                            <p className="text-[10px] text-slate-400 leading-tight">{preset.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Multi-Image Gallery */}
                    <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                          Galerie Multi-Photos & Vues Supplémentaires ({form.gallery_images.length})
                        </span>
                        <label className="cursor-pointer px-3 py-1 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
                          + Ajouter des photos
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => void handleGalleryUpload(e.target.files)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {form.gallery_images.map((url, idx) => (
                          <div key={idx} className="relative group h-20 w-20 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                            <img src={url} alt="Galerie" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() =>
                                setForm((c) => ({
                                  ...c,
                                  gallery_images: c.gallery_images.filter((_, i) => i !== idx),
                                }))
                              }
                              className="absolute top-1 right-1 p-1 rounded-md bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 6: SEO & SEARCH */}
                {drawerTab === 'seo' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                          Optimisation pour les Moteurs de Recherche (SEO)
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium">Balises méta et mots-clés de recherche</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const title = form.title.trim();
                          if (!title) return;
                          const cat = marketplaceCategories.find((c) => c.id === form.marketplace_category_id)?.name;
                          setForm((c) => ({
                            ...c,
                            seo_title: `${title}${cat ? ` | ${cat}` : ''}`.slice(0, 60),
                            seo_description: `Découvrez ${title} sur PandaMarket. Qualité certifiée et livraison rapide.`.slice(0, 160),
                          }));
                          setSuccess('Méta-données SEO générées !');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                        Générer SEO
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Titre SEO (Balise Meta Title) - Max 60 caractères
                        </label>
                        <input
                          type="text"
                          value={form.seo_title}
                          onChange={(e) => setForm((c) => ({ ...c, seo_title: e.target.value }))}
                          placeholder="Ex: Montre Homme Automatique Luxe | Horlogerie PandaMarket"
                          className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Description SEO (Meta Description) - Max 160 caractères
                        </label>
                        <textarea
                          rows={3}
                          value={form.seo_description}
                          onChange={(e) => setForm((c) => ({ ...c, seo_description: e.target.value }))}
                          placeholder="Texte accrocheur incitant au clic dans les résultats Google..."
                          className="w-full p-3 text-xs font-medium rounded-xl border border-slate-200 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Mots-Clés & Tags de Recherche (Séparés par des virgules)
                        </label>
                        <input
                          type="text"
                          value={form.tags}
                          onChange={(e) => setForm((c) => ({ ...c, tags: e.target.value }))}
                          placeholder="montre, automatique, cuir, luxe, suisse"
                          className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 7: DIGITAL DELIVERABLES */}
                {drawerTab === 'digital' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-4">
                      <h4 className="text-xs font-black uppercase text-slate-800">
                        Téléchargements Numériques & Fichiers Sécurisés
                      </h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Téléchargements Max Autorisés</label>
                          <input
                            type="number"
                            value={form.max_downloads}
                            onChange={(e) => setForm((c) => ({ ...c, max_downloads: e.target.value }))}
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Expiration du Lien (Heures)</label>
                          <input
                            type="number"
                            value={form.download_expires_hours}
                            onChange={(e) => setForm((c) => ({ ...c, download_expires_hours: e.target.value }))}
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Clés de Licence / Numéros de Série (Une clé par ligne)
                        </label>
                        <textarea
                          rows={4}
                          value={form.license_keys}
                          onChange={(e) => setForm((c) => ({ ...c, license_keys: e.target.value }))}
                          placeholder="XXXX-YYYY-ZZZZ-0001&#10;XXXX-YYYY-ZZZZ-0002"
                          className="w-full p-3 font-mono text-xs font-bold rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* LIVE STORE PREVIEW COLLAPSIBLE SIDEBAR */}
              {showLivePreview && (
                <div className="hidden lg:block w-72 flex-shrink-0 border-l border-slate-100 dark:border-slate-800 pl-6 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Aperçu Vitrine Acheteur
                  </span>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-md">
                    <div className="aspect-square w-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                      {form.thumbnail ? (
                        <img src={form.thumbnail} alt="Aperçu" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="w-10 h-10 text-slate-300" />
                      )}
                    </div>
                    <div className="p-4 space-y-2 text-xs">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                        {form.type}
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white line-clamp-2">
                        {form.title || 'Titre de votre produit'}
                      </p>
                      <p className="text-base font-black text-slate-900 dark:text-white">
                        {form.price ? formatPrice(form.price) : '0.000 TND'}
                      </p>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>En stock: {form.inventory_quantity || 0}</span>
                        <span className="text-emerald-600 font-bold">Livraison Rapide</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Sticky Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono font-bold text-slate-500">Raccourci: Ctrl+S</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#B91C1C] text-white text-xs font-black hover:bg-[#991B1B] shadow-md shadow-red-500/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingProduct ? 'Enregistrer les Modifications' : 'Créer et Publier le Produit'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. 1-CLICK VARIANT MATRIX GENERATOR MODAL */}
      {/* ========================================================================= */}
      {showMatrixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-3xl rounded-3xl border border-red-200 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-red-600 to-[#B91C1C] text-white shadow-md shadow-red-500/20">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Générateur Matriciel de Déclinaisons 1-Clic
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Configurez vos attributs et laissez le moteur combiner automatiquement tous les SKU, prix et stocks.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMatrixModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Option Presets Palette with Category Tabs & Search */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  🎯 Puces d&apos;Options Prédéfinies Instantanées ({filteredPresets.length} disponibles) :
                </span>

                {/* Preset Search Input */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    placeholder="Filtrer (ex: matelas, or, ram)..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-red-500"
                  />
                  {presetSearch && (
                    <button
                      type="button"
                      onClick={() => setPresetSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  { id: 'all', label: `✨ Tous (${OPTION_PRESETS.length})` },
                  { id: 'fashion', label: '👗 Mode & Vêtements' },
                  { id: 'beauty', label: '💄 Beauté & Parfums' },
                  { id: 'tech', label: '💻 High-Tech' },
                  { id: 'home', label: '🏡 Maison & Déco' },
                  { id: 'food', label: '🍯 Terroir & Saveurs' },
                  { id: 'jewelry', label: '💍 Bijouterie' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPresetCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all text-[11px] ${
                      presetCategoryFilter === cat.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Filtered Preset Chips Grid */}
              {filteredPresets.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center italic">
                  Aucun preset ne correspond à votre recherche &quot;{presetSearch}&quot;.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyOptionPreset(preset)}
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-red-400 hover:bg-red-50/40 dark:hover:bg-red-950/20 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                      title={`Ajouter ${preset.name} (${preset.values.join(', ')})`}
                    >
                      <span className="text-sm">{preset.icon}</span>
                      <span>{preset.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({preset.values.length})</span>
                      <Plus className="w-3 h-3 text-slate-400 group-hover:text-red-600 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Option Dimensions List */}
            <div className="space-y-4">
              {matrixDimensions.map((dim, dimIdx) => (
                <div
                  key={dim.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black">
                        {dimIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={dim.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMatrixDimensions((prev) =>
                            prev.map((d, i) => (i === dimIdx ? { ...d, name: val } : d))
                          );
                        }}
                        placeholder="Nom de l'option (ex: Taille, Couleur)"
                        className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMatrixDimensions((prev) => prev.filter((_, i) => i !== dimIdx))}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tag Values Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {dim.values.map((val, valIdx) => (
                      <span
                        key={valIdx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm"
                      >
                        <span>{val}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveValueFromDimension(dimIdx, valIdx)}
                          className="p-0.5 hover:text-red-600 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {/* Add Value Input */}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={dim.inputValue || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMatrixDimensions((prev) =>
                            prev.map((d, i) => (i === dimIdx ? { ...d, inputValue: val } : d))
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddValueToDimension(dimIdx, dim.inputValue || '');
                          }
                        }}
                        placeholder="+ Ajouter valeur (Entrée)"
                        className="w-36 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddValueToDimension(dimIdx, dim.inputValue || '')}
                        className="px-2 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setMatrixDimensions((prev) => [
                    ...prev,
                    { id: String(Date.now()), name: '', values: [], inputValue: '' },
                  ])
                }
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                + Ajouter une dimension d&apos;option supplémentaire
              </button>
            </div>

            {/* Matrix Initial Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Prix Unitaire par Défaut
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={matrixDefaultPrice}
                  onChange={(e) => setMatrixDefaultPrice(e.target.value)}
                  placeholder={form.price || '0.000'}
                  className="w-full px-3 py-1.5 font-bold rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Stock Initial par Déclinaison
                </label>
                <input
                  type="number"
                  value={matrixDefaultStock}
                  onChange={(e) => setMatrixDefaultStock(e.target.value)}
                  placeholder="5"
                  className="w-full px-3 py-1.5 font-bold rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Préfixe SKU Personnalisé
                </label>
                <input
                  type="text"
                  value={matrixSkuPrefix}
                  onChange={(e) => setMatrixSkuPrefix(e.target.value.toUpperCase())}
                  placeholder={form.product_reference || 'PROD-2026'}
                  className="w-full px-3 py-1.5 font-mono font-bold rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>

            {/* Footer Summary & Generate CTA */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                <span>Combinaisons calculées : </span>
                <strong className="text-slate-900 dark:text-white text-sm">{matrixCombinationsCount} déclinaisons</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMatrixModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleApplyMatrixGenerator}
                  disabled={matrixCombinationsCount === 0}
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-red-600 to-[#B91C1C] text-white text-xs font-black shadow-md shadow-red-500/20 hover:scale-105 disabled:opacity-50 transition-all"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>Générer {matrixCombinationsCount} Déclinaisons en 1-Clic</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. AI SMART FILL REVIEW MODAL */}
      {/* ========================================================================= */}
      {showSmartFillModal && smartFillSuggestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-3xl rounded-3xl border border-purple-200 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-purple-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Suggestions IA Prêtes à Valider</h3>
                  <p className="text-xs text-slate-400 font-medium">Examinez les propositions et appliquez-les en un clic</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSmartFillModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Suggested Title */}
              <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-purple-900 dark:text-purple-300 text-[10px]">
                    📌 Titre Commercial Optimisé
                  </span>
                  <button
                    type="button"
                    onClick={() => applySmartFillItem('title')}
                    className="px-3 py-1 rounded-lg bg-purple-600 text-white font-bold text-[11px] hover:bg-purple-700"
                  >
                    Appliquer le titre
                  </button>
                </div>
                <p className="p-3 rounded-xl bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-purple-100 dark:border-purple-900">
                  {smartFillSuggestions.suggested_title}
                </p>
              </div>

              {/* Suggested HTML Description */}
              <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-purple-900 dark:text-purple-300 text-[10px]">
                    📄 Fiche Description HTML Enrichie
                  </span>
                  <button
                    type="button"
                    onClick={() => applySmartFillItem('description')}
                    className="px-3 py-1 rounded-lg bg-purple-600 text-white font-bold text-[11px] hover:bg-purple-700"
                  >
                    Appliquer la description
                  </button>
                </div>
                <div
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-purple-100 dark:border-purple-900 max-h-40 overflow-y-auto leading-relaxed prose prose-sm"
                  dangerouslySetInnerHTML={{ __html: smartFillSuggestions.suggested_description }}
                />
              </div>

              {/* Suggested Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black uppercase text-purple-900 text-[10px]">🌐 Catégorie Hub</span>
                    <button
                      type="button"
                      onClick={() => applySmartFillItem('hub_category')}
                      className="px-2.5 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px]"
                    >
                      Appliquer
                    </button>
                  </div>
                  <p className="p-2.5 rounded-lg bg-white font-bold text-slate-800">
                    {smartFillSuggestions.suggested_hub_category_name}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black uppercase text-purple-900 text-[10px]">🏪 Catégorie Vitrine</span>
                    <button
                      type="button"
                      onClick={() => applySmartFillItem('storefront_category')}
                      className="px-2.5 py-0.5 rounded-md bg-purple-600 text-white font-bold text-[10px]"
                    >
                      Appliquer
                    </button>
                  </div>
                  <p className="p-2.5 rounded-lg bg-white font-bold text-slate-800">
                    {smartFillSuggestions.suggested_storefront_category}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-purple-100 pt-4">
              <button
                type="button"
                onClick={() => void handleSmartFill()}
                disabled={smartFillLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                {smartFillLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-600" />}
                Régénérer d&apos;autres propositions
              </button>

              <button
                type="button"
                onClick={applyAllSmartFill}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black shadow-md shadow-purple-600/20 hover:scale-105 transition-all"
              >
                <Check className="w-4 h-4 text-yellow-300" />
                Tout Valider & Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MEDIA PICKER MODAL */}
      {/* ========================================================================= */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Médiathèque Boutique</h3>
                <p className="text-xs text-slate-400 font-medium">Réutilisez une photo déjà téléversée</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {mediaItems.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 font-semibold">
                  Aucune photo enregistrée dans la médiathèque.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {mediaItems.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (mediaPickerTarget === 'thumbnail') {
                          setForm((c) => ({ ...c, thumbnail: item.url }));
                        } else {
                          setForm((c) => ({ ...c, gallery_images: [...c.gallery_images, item.url] }));
                        }
                        setShowMediaPicker(false);
                      }}
                      className="aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-[#B91C1C] transition-all bg-slate-100"
                    >
                      <img src={item.url} alt="Media" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GlobeIcon(props: { className?: string }) {
  return <Tag {...props} />;
}
