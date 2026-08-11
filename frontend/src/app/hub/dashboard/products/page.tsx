'use client';

import React, { Fragment } from 'react';
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
    cost_price?: number;
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
  wholesale_enabled: boolean;
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
  wholesale_enabled: false,
  wholesale_min_quantity: '5',
  wholesale_price_tiers: [],
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
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [storeCounts, setStoreCounts] = useState({
    total: 0,
    published: 0,
    draft: 0,
    low_stock: 0,
  });
  const [sellerType, setSellerType] = useState<'retailer' | 'wholesaler' | 'hybrid'>('retailer');
  const [marketplaceName, setMarketplaceName] = useState('PandaMarket');
  const isWholesaleSeller = sellerType === 'wholesaler' || sellerType === 'hybrid';

  // Wholesale B2B Calculator & Interactive Simulator State
  const [b2bSimulatedQty, setB2bSimulatedQty] = useState<number>(10);

  // SEO Live Scoring & Multi-Platform Snippet State
  const [seoPreviewTab, setSeoPreviewTab] = useState<'google' | 'whatsapp' | 'facebook' | 'twitter'>('google');
  const [seoAiGenerating, setSeoAiGenerating] = useState(false);

  // Extended Bulk Actions & CSV Export State
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPriceMode, setBulkPriceMode] = useState<'percent' | 'fixed'>('percent');
  const [bulkPriceValue, setBulkPriceValue] = useState('-15');
  const [bulkPriceRoundToNine, setBulkPriceRoundToNine] = useState(false);

  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [bulkMarketplaceCategoryId, setBulkMarketplaceCategoryId] = useState('');
  const [bulkStorefrontCategoryId, setBulkStorefrontCategoryId] = useState('');

  const [showBulkStockModal, setShowBulkStockModal] = useState(false);
  const [bulkStockMode, setBulkStockMode] = useState<'set' | 'delta'>('set');
  const [bulkStockValue, setBulkStockValue] = useState('20');

  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // AI Smart Fill & Photo Studio (Assistant Magique IA)
  interface SmartFillExtractionResult {
    suggested_title: string;
    suggested_description: string;
    suggested_price: number | null;
    suggested_hub_category_name: string;
    suggested_hub_subcategory_name: string;
    suggested_storefront_category: string;
    suggested_storefront_subcategory: string;
    suggested_tags: string[];
    suggested_attributes: Array<{ name: string; value: string }>;
    suggested_variants: Array<{ name: string; values: string[] }>;
    suggested_seo_title: string;
    suggested_seo_description: string;
  }

  const [smartFillLoading, setSmartFillLoading] = useState(false);
  const [showSmartFillModal, setShowSmartFillModal] = useState(false);
  const [smartFillMode, setSmartFillMode] = useState<'prompt' | 'current'>('prompt');
  const [freePromptText, setFreePromptText] = useState<string>('');
  const [smartFillLanguage, setSmartFillLanguage] = useState<'fr' | 'ar' | 'en'>('fr');
  const [smartFillActiveTab, setSmartFillActiveTab] = useState<'input' | 'preview'>('input');
  const [smartFillSuggestions, setSmartFillSuggestions] = useState<SmartFillExtractionResult | null>(null);
  const [selectedFieldsToApply, setSelectedFieldsToApply] = useState<Record<string, boolean>>({
    title: true,
    description: true,
    price: true,
    categories: true,
    tags: true,
    attributes: true,
    variants: true,
    seo: true,
  });
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
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      queryParams.set('limit', limit.toString());
      if (statusFilter && statusFilter !== 'all') {
        queryParams.set('status', statusFilter);
      }
      if (search.trim()) {
        queryParams.set('search', search.trim());
      }

      const res = await fetchWithCsrf(`/api/pd/stores/me/products?${queryParams.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const nextProducts = Array.isArray(data.data) ? (data.data as Product[]) : [];
        const nextTotal = Number(data.meta?.total || 0);
        setProducts(nextProducts);
        setTotalPages(data.meta?.total_pages || 1);
        setTotalProducts(nextTotal);

        if (data.meta?.counts) {
          setStoreCounts({
            total: Number(data.meta.counts.total || 0),
            published: Number(data.meta.counts.published || 0),
            draft: Number(data.meta.counts.draft || 0),
            low_stock: Number(data.meta.counts.low_stock || 0),
          });
        } else {
          setStoreCounts((prev) => ({
            ...prev,
            total: nextTotal,
          }));
        }

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
  }, [page, limit, statusFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  const publishedCount = storeCounts.published;
  const draftCount = storeCounts.draft;
  const lowStockCount = storeCounts.low_stock;
  const totalStockCount = useMemo(() => products.reduce((acc, p) => acc + (p.inventory_quantity || 0), 0), [products]);

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      // Type filter
      if (typeFilter !== 'all' && (p.type || 'physical') !== typeFilter) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'all' && p.marketplace_category_id !== categoryFilter && p.storefront_category_id !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [products, typeFilter, categoryFilter]);

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
      wholesale_enabled: true,
      wholesale_min_quantity: calculatedTiers[0]?.min_quantity || '5',
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

  const handleOpenPromptLibreModal = () => {
    setSmartFillMode('prompt');
    if (!freePromptText && (form.title || form.description)) {
      setFreePromptText([form.title, form.description.replace(/<[^>]+>/g, ' ')].filter(Boolean).join(' - '));
    }
    setShowSmartFillModal(true);
  };

  const handleAutoRefillFromCurrentFields = async () => {
    if (!form.title && !form.description && !form.thumbnail) {
      setError("Veuillez saisir au moins un champ (titre, description ou image) dans votre fiche pour que l'IA puisse auto-compléter le reste.");
      return;
    }

    setSmartFillMode('current');
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
          language: smartFillLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Auto-complétion intelligente échouée.');

      setSmartFillSuggestions(data.suggestions);
      setSmartFillActiveTab('preview');
      setSelectedFieldsToApply({
        title: !form.title && Boolean(data.suggestions.suggested_title),
        description: !form.description && Boolean(data.suggestions.suggested_description),
        price: !form.price && Boolean(data.suggestions.suggested_price),
        categories: (!form.marketplace_category_id || !form.storefront_category_id) && Boolean(data.suggestions.suggested_hub_category_name || data.suggestions.suggested_storefront_category),
        tags: !form.tags && Boolean(data.suggestions.suggested_tags?.length),
        attributes: form.attributes.length === 0 && Boolean(data.suggestions.suggested_attributes?.length),
        variants: form.variants.length === 0 && Boolean(data.suggestions.suggested_variants?.length),
        seo: (!form.seo_title || !form.seo_description) && Boolean(data.suggestions.suggested_seo_title || data.suggestions.suggested_seo_description),
      });
      setShowSmartFillModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’auto-complétion IA.');
    } finally {
      setSmartFillLoading(false);
    }
  };

  const handleSmartFill = async (overridePrompt?: string) => {
    const promptToSend = overridePrompt !== undefined ? overridePrompt : (smartFillMode === 'prompt' ? freePromptText : '');
    
    if (smartFillMode === 'prompt' && !promptToSend.trim()) {
      setError("Veuillez coller un message, une note fournisseur ou rédiger un prompt libre.");
      return;
    }
    if (smartFillMode === 'current' && !form.title && !form.description && !form.thumbnail) {
      setError("Veuillez d'abord saisir un titre, une description ou ajouter une image dans la fiche.");
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
          prompt: smartFillMode === 'prompt' ? promptToSend : undefined,
          title: smartFillMode === 'current' ? form.title : undefined,
          description: smartFillMode === 'current' ? form.description : undefined,
          image_url: form.thumbnail,
          language: smartFillLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Extraction intelligente échouée.');

      setSmartFillSuggestions(data.suggestions);
      setSmartFillActiveTab('preview');
      setSelectedFieldsToApply({
        title: Boolean(data.suggestions.suggested_title),
        description: Boolean(data.suggestions.suggested_description),
        price: Boolean(data.suggestions.suggested_price),
        categories: Boolean(data.suggestions.suggested_hub_category_name || data.suggestions.suggested_storefront_category),
        tags: Boolean(data.suggestions.suggested_tags?.length),
        attributes: Boolean(data.suggestions.suggested_attributes?.length),
        variants: Boolean(data.suggestions.suggested_variants?.length),
        seo: Boolean(data.suggestions.suggested_seo_title || data.suggestions.suggested_seo_description),
      });
      setShowSmartFillModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération IA.');
    } finally {
      setSmartFillLoading(false);
    }
  };

  const applySmartFillItem = (field: 'title' | 'description' | 'price' | 'hub_category' | 'storefront_category' | 'tags' | 'attributes' | 'variants' | 'seo') => {
    if (!smartFillSuggestions) return;
    setForm((prev) => {
      const next = { ...prev };
      if (field === 'title' && smartFillSuggestions.suggested_title) {
        next.title = smartFillSuggestions.suggested_title;
        if (!next.slug) {
          next.slug = smartFillSuggestions.suggested_title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        }
      }
      if (field === 'description' && smartFillSuggestions.suggested_description) {
        next.description = smartFillSuggestions.suggested_description;
      }
      if (field === 'price' && smartFillSuggestions.suggested_price) {
        next.price = Number(smartFillSuggestions.suggested_price).toFixed(3);
      }
      if (field === 'hub_category' && smartFillSuggestions.suggested_hub_category_name) {
        const found = marketplaceCategories.find((c) =>
          c.name.toLowerCase().includes(smartFillSuggestions.suggested_hub_category_name.toLowerCase()) ||
          smartFillSuggestions.suggested_hub_category_name.toLowerCase().includes(c.name.toLowerCase())
        );
        if (found) next.marketplace_category_id = found.id;
      }
      if (field === 'storefront_category' && smartFillSuggestions.suggested_storefront_category) {
        const found = storefrontCategories.find((c) =>
          c.name.toLowerCase().includes(smartFillSuggestions.suggested_storefront_category.toLowerCase()) ||
          smartFillSuggestions.suggested_storefront_category.toLowerCase().includes(c.name.toLowerCase())
        );
        if (found) next.storefront_category_id = found.id;
      }
      if (field === 'tags' && Array.isArray(smartFillSuggestions.suggested_tags) && smartFillSuggestions.suggested_tags.length > 0) {
        next.tags = smartFillSuggestions.suggested_tags.join(', ');
      }
      if (field === 'attributes' && Array.isArray(smartFillSuggestions.suggested_attributes) && smartFillSuggestions.suggested_attributes.length > 0) {
        next.attributes = smartFillSuggestions.suggested_attributes;
      }
      if (field === 'variants' && Array.isArray(smartFillSuggestions.suggested_variants) && smartFillSuggestions.suggested_variants.length > 0) {
        // Generate combinatorial variants
        const axes = smartFillSuggestions.suggested_variants.filter((a) => a.name && a.values.length > 0);
        if (axes.length === 1) {
          const axis = axes[0];
          const defaultPrice = next.price || '0.000';
          next.variants = axis.values.map((val) => ({
            id: undefined,
            sku: '',
            title: `${val}`,
            price: defaultPrice,
            inventory_quantity: '10',
            option_name: axis.name,
            option_value: val,
            options: { [axis.name]: val },
          }));
        } else if (axes.length >= 2) {
          const ax1 = axes[0];
          const ax2 = axes[1];
          const defaultPrice = next.price || '0.000';
          const generated: ProductVariantForm[] = [];
          ax1.values.forEach((v1) => {
            ax2.values.forEach((v2) => {
              generated.push({
                id: undefined,
                sku: '',
                title: `${v1} / ${v2}`,
                price: defaultPrice,
                inventory_quantity: '10',
                option_name: ax1.name,
                option_value: v1,
                options: { [ax1.name]: v1, [ax2.name]: v2 },
              });
            });
          });
          next.variants = generated;
        }
      }
      if (field === 'seo') {
        if (smartFillSuggestions.suggested_seo_title) next.seo_title = smartFillSuggestions.suggested_seo_title;
        if (smartFillSuggestions.suggested_seo_description) next.seo_description = smartFillSuggestions.suggested_seo_description;
      }
      return next;
    });
  };

  const applySelectedSmartFill = () => {
    if (!smartFillSuggestions) return;
    if (selectedFieldsToApply.title) applySmartFillItem('title');
    if (selectedFieldsToApply.description) applySmartFillItem('description');
    if (selectedFieldsToApply.price) applySmartFillItem('price');
    if (selectedFieldsToApply.categories) {
      applySmartFillItem('hub_category');
      applySmartFillItem('storefront_category');
    }
    if (selectedFieldsToApply.tags) applySmartFillItem('tags');
    if (selectedFieldsToApply.attributes) applySmartFillItem('attributes');
    if (selectedFieldsToApply.variants) applySmartFillItem('variants');
    if (selectedFieldsToApply.seo) applySmartFillItem('seo');

    setShowSmartFillModal(false);
    setDrawerTab('general');
    setSuccess('✨ Fiche produit enrichie avec succès par l’Assistant Magique IA !');
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

  // -----------------------------------------------------------------------
  // WHOLESALE B2B DYNAMIC DISCOUNT & COHERENCE CALCULATOR ENGINE
  // -----------------------------------------------------------------------
  const getWholesaleAnalysis = () => {
    const basePrice = parseFloat(form.price) || 0;
    const costPrice = parseFloat(form.cost_price) || 0;
    const tiers = form.wholesale_price_tiers || [];

    const issues: string[] = [];
    let previousQty = 1;
    let previousUnitPrice = basePrice > 0 ? basePrice : Infinity;

    const analyzedTiers = tiers.map((tier, idx) => {
      const minQty = parseInt(tier.min_quantity, 10) || 0;
      const unitPrice = parseFloat(tier.unit_price) || 0;
      const tierIssues: string[] = [];

      // 1. Quantity checks
      if (minQty < 2) {
        tierIssues.push('La quantité minimale doit être d’au moins 2 unités');
      }
      if (idx > 0 && minQty <= previousQty) {
        tierIssues.push(`La quantité doit être supérieure au palier précédent (${previousQty} unités)`);
      }

      // 2. Unit price checks
      if (basePrice > 0) {
        if (unitPrice >= basePrice) {
          tierIssues.push(`Le prix grossiste (${unitPrice.toFixed(3)} DT) doit être strictement inférieur au prix détail (${basePrice.toFixed(3)} DT)`);
        }
      }
      if (idx > 0 && unitPrice >= previousUnitPrice) {
        tierIssues.push(`Anomalie : Le prix unitaire ne doit pas augmenter avec une quantité plus élevée (${unitPrice.toFixed(3)} DT ≥ ${previousUnitPrice.toFixed(3)} DT)`);
      }

      const discountPct = basePrice > 0 && unitPrice > 0 ? Math.max(0, ((basePrice - unitPrice) / basePrice) * 100) : 0;
      const unitSavings = basePrice > 0 && unitPrice > 0 ? Math.max(0, basePrice - unitPrice) : 0;
      const minOrderTotal = minQty > 0 && unitPrice > 0 ? minQty * unitPrice : 0;
      const minOrderSavings = minQty > 0 && unitSavings > 0 ? minQty * unitSavings : 0;

      const netMarginTnd = costPrice > 0 && unitPrice > 0 ? unitPrice - costPrice : 0;
      const netMarginPct = costPrice > 0 && unitPrice > 0 ? (netMarginTnd / unitPrice) * 100 : 0;
      const totalMarginGenerated = minQty > 0 && netMarginTnd > 0 ? minQty * netMarginTnd : 0;

      if (minQty > 0) previousQty = minQty;
      if (unitPrice > 0) previousUnitPrice = unitPrice;

      tierIssues.forEach((issue) => issues.push(`Palier #${idx + 1} : ${issue}`));

      return {
        idx,
        minQty,
        unitPrice,
        discountPct,
        unitSavings,
        minOrderTotal,
        minOrderSavings,
        netMarginTnd,
        netMarginPct,
        totalMarginGenerated,
        tierIssues,
      };
    });

    // Determine pricing for simulated quantity
    let appliedTier: (typeof analyzedTiers)[0] | null = null;
    if (b2bSimulatedQty >= 1) {
      for (const t of analyzedTiers) {
        if (t.minQty > 0 && b2bSimulatedQty >= t.minQty) {
          appliedTier = t;
        }
      }
    }

    const simUnitPrice = appliedTier && appliedTier.unitPrice > 0 ? appliedTier.unitPrice : basePrice;
    const simTotal = b2bSimulatedQty * simUnitPrice;
    const simBaseTotal = b2bSimulatedQty * basePrice;
    const simSavings = Math.max(0, simBaseTotal - simTotal);
    const simDiscountPct = basePrice > 0 && simUnitPrice < basePrice ? ((basePrice - simUnitPrice) / basePrice) * 100 : 0;
    const simMargin = costPrice > 0 ? (simUnitPrice - costPrice) * b2bSimulatedQty : 0;

    return {
      basePrice,
      costPrice,
      analyzedTiers,
      issues,
      hasErrors: issues.length > 0,
      simulation: {
        qty: b2bSimulatedQty,
        appliedTier,
        unitPrice: simUnitPrice,
        total: simTotal,
        savings: simSavings,
        discountPct: simDiscountPct,
        margin: simMargin,
      },
    };
  };

  // -----------------------------------------------------------------------
  // SEO LIVE SCORING ENGINE & MULTI-PLATFORM PREVIEW
  // -----------------------------------------------------------------------
  const getSeoAnalysis = () => {
    const effectiveTitle = (form.seo_title || form.title || '').trim();
    const effectiveDesc = (form.seo_description || form.description?.replace(/<[^>]+>/g, '') || '').trim();
    const tagsArray = (form.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
    const cleanContent = (form.description || '').replace(/<[^>]+>/g, '').trim();

    let score = 0;

    // 1. Title Score (25 pts max)
    let titleStatus: 'pass' | 'warn' | 'fail' = 'fail';
    let titleMsg = '';
    if (effectiveTitle.length >= 40 && effectiveTitle.length <= 65) {
      score += 25;
      titleStatus = 'pass';
      titleMsg = 'Longueur parfaite pour Google (40 - 65 car.)';
    } else if (effectiveTitle.length >= 20 && effectiveTitle.length < 40) {
      score += 15;
      titleStatus = 'warn';
      titleMsg = 'Un peu court : visez entre 40 et 65 caractères';
    } else if (effectiveTitle.length > 65 && effectiveTitle.length <= 80) {
      score += 15;
      titleStatus = 'warn';
      titleMsg = 'Un peu long : risque d’être tronqué sur smartphone';
    } else if (effectiveTitle.length > 0) {
      score += 5;
      titleStatus = 'fail';
      titleMsg = effectiveTitle.length < 20 ? 'Titre trop court (<20 car.)' : 'Titre trop long (>80 car.)';
    } else {
      titleMsg = 'Titre SEO manquant';
    }

    // 2. Description Score (25 pts max)
    let descStatus: 'pass' | 'warn' | 'fail' = 'fail';
    let descMsg = '';
    if (effectiveDesc.length >= 120 && effectiveDesc.length <= 165) {
      score += 25;
      descStatus = 'pass';
      descMsg = 'Taille idéale pour le snippet Google (120 - 165 car.)';
    } else if (effectiveDesc.length >= 60 && effectiveDesc.length < 120) {
      score += 15;
      descStatus = 'warn';
      descMsg = 'Description un peu courte (recommandé : 120 - 165 car.)';
    } else if (effectiveDesc.length > 165 && effectiveDesc.length <= 200) {
      score += 15;
      descStatus = 'warn';
      descMsg = 'Description longue : Google n’affichera que les 160 premiers caractères';
    } else if (effectiveDesc.length > 0) {
      score += 5;
      descStatus = 'fail';
      descMsg = effectiveDesc.length < 60 ? 'Méta-description trop courte (<60 car.)' : 'Méta-description excessive (>200 car.)';
    } else {
      descMsg = 'Méta-description manquante';
    }

    // 3. Tags & Keywords (15 pts max)
    let tagsStatus: 'pass' | 'warn' | 'fail' = 'fail';
    let tagsMsg = '';
    if (tagsArray.length >= 3) {
      score += 15;
      tagsStatus = 'pass';
      tagsMsg = `${tagsArray.length} mots-clés pertinents configurés`;
    } else if (tagsArray.length >= 1) {
      score += 8;
      tagsStatus = 'warn';
      tagsMsg = `${tagsArray.length} mot-clé : ajoutez au moins 3 tags cibles`;
    } else {
      tagsMsg = 'Aucun tag de recherche e-commerce';
    }

    // 4. Thumbnail & Social Image (15 pts max)
    let imageStatus: 'pass' | 'warn' | 'fail' = 'fail';
    let imageMsg = '';
    if (form.thumbnail) {
      score += 15;
      imageStatus = 'pass';
      imageMsg = 'Visuel de couverture présent (OpenGraph & Google Images)';
    } else {
      imageMsg = 'Photo principale manquante pour les partages sociaux';
    }

    // 5. URL Slug (10 pts max)
    let slugStatus: 'pass' | 'warn' | 'fail' = 'fail';
    let slugMsg = '';
    if (form.slug && form.slug.length >= 3) {
      score += 10;
      slugStatus = 'pass';
      slugMsg = `URL propre : /${form.slug}`;
    } else {
      slugMsg = 'Slug URL non défini';
    }

    // 6. Detailed Body Content (10 pts max)
    let contentStatus: 'pass' | 'warn' | 'fail' = 'fail';
    let contentMsg = '';
    if (cleanContent.length >= 100) {
      score += 10;
      contentStatus = 'pass';
      contentMsg = 'Description détaillée complète (>100 caractères)';
    } else if (cleanContent.length >= 30) {
      score += 5;
      contentStatus = 'warn';
      contentMsg = 'Description produit succincte';
    } else {
      contentMsg = 'Description produit vide ou trop courte';
    }

    let grade: 'excellent' | 'good' | 'poor' = 'poor';
    let gradeLabel = 'Référencement Insuffisant';
    let gradeColor = 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';

    if (score >= 85) {
      grade = 'excellent';
      gradeLabel = 'SEO Optimal (Prêt pour Google)';
      gradeColor = 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    } else if (score >= 60) {
      grade = 'good';
      gradeLabel = 'Bon Référencement (Améliorations possibles)';
      gradeColor = 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    }

    return {
      score,
      grade,
      gradeLabel,
      gradeColor,
      titleLength: effectiveTitle.length,
      descLength: effectiveDesc.length,
      tagsCount: tagsArray.length,
      checks: {
        title: { status: titleStatus, message: titleMsg, count: effectiveTitle.length, max: 60 },
        description: { status: descStatus, message: descMsg, count: effectiveDesc.length, max: 160 },
        tags: { status: tagsStatus, message: tagsMsg, count: tagsArray.length },
        image: { status: imageStatus, message: imageMsg },
        slug: { status: slugStatus, message: slugMsg },
        content: { status: contentStatus, message: contentMsg },
      },
    };
  };

  const handleGenerateSeoWithAi = async () => {
    const rawTitle = form.title.trim();
    if (!rawTitle && !form.description) {
      setError('Veuillez d’abord renseigner un titre ou une description de produit.');
      return;
    }

    setSeoAiGenerating(true);
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
          language: smartFillLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Génération SEO échouée.');

      const sug = data.suggestions;
      setForm((curr) => ({
        ...curr,
        seo_title: sug.suggested_seo_title || curr.seo_title || `${rawTitle} | PandaMarket Tunisie`.slice(0, 60),
        seo_description:
          sug.suggested_seo_description ||
          curr.seo_description ||
          `Achetez ${rawTitle} au meilleur prix en Tunisie sur PandaMarket. Qualité garantie, livraison rapide et paiement sécurisé.`.slice(0, 160),
        tags:
          Array.isArray(sug.suggested_tags) && sug.suggested_tags.length > 0
            ? sug.suggested_tags.join(', ')
            : curr.tags,
      }));

      setSuccess('✨ Méta-titre, description et mots-clés SEO optimisés avec succès par l’IA !');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération SEO par l’IA.');
    } finally {
      setSeoAiGenerating(false);
    }
  };

  // -----------------------------------------------------------------------
  // CATALOGUE CSV / EXCEL EXPORT
  // -----------------------------------------------------------------------
  const handleExportCSV = (scope: 'all' | 'filtered' | 'selected' = 'filtered') => {
    let targetList: Product[] = [];
    if (scope === 'selected') {
      targetList = products.filter((p) => selectedIds.has(p.id));
    } else if (scope === 'filtered') {
      targetList = visibleProducts;
    } else {
      targetList = products;
    }

    if (targetList.length === 0) {
      setError('Aucun produit à exporter.');
      return;
    }

    const headers = [
      'ID Produit',
      'Titre du Produit',
      'Type',
      'Prix (TND)',
      'Stock',
      'Statut',
      'Catégorie Marketplace',
      'Catégorie Vitrine',
      'Tags',
      'Nb Variantes',
      'Nb Images',
      'Date Création',
    ];

    const escapeCSV = (val: unknown) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = targetList.map((p) => [
      escapeCSV(p.id),
      escapeCSV(p.title),
      escapeCSV(p.type),
      escapeCSV(Number(p.price || 0).toFixed(3)),
      escapeCSV(p.inventory_quantity),
      escapeCSV(p.status === 'published' ? 'Publié' : p.status === 'draft' ? 'Brouillon' : 'Archivé'),
      escapeCSV(p.marketplace_category_name || ''),
      escapeCSV(p.storefront_category_name || ''),
      escapeCSV(Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '')),
      escapeCSV(Array.isArray(p.variants) ? p.variants.length : 0),
      escapeCSV(Array.isArray(p.images) ? p.images.length : 0),
      escapeCSV((p as any).created_at ? new Date((p as any).created_at).toISOString().slice(0, 10) : ''),
    ]);

    // Add UTF-8 BOM so Excel opens accents cleanly
    const csvContent =
      '\uFEFF' +
      [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `catalogue-pandamarket-${scope}-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccess(`Export CSV généré avec succès (${targetList.length} produit(s)).`);
  };

  // -----------------------------------------------------------------------
  // EXTENDED BULK OPERATIONS HANDLER
  // -----------------------------------------------------------------------
  const executeBatchAction = async (
    action:
      | { type: 'set_status'; status: 'published' | 'draft' | 'archived' }
      | { type: 'adjust_price'; mode: 'percent' | 'fixed'; value: number; round_to_nearest_nine?: boolean }
      | { type: 'set_category'; marketplace_category_id?: string | null; storefront_category_id?: string | null }
      | { type: 'adjust_inventory'; mode: 'set' | 'delta'; value: number }
      | { type: 'delete' },
  ) => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/products/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_ids: Array.from(selectedIds),
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Erreur lors de l’action groupée.');

      setSuccess(data.message || 'Action groupée appliquée avec succès.');
      setSelectedIds(new Set());
      setShowBulkPriceModal(false);
      setShowBulkCategoryModal(false);
      setShowBulkStockModal(false);
      setShowBulkDeleteModal(false);
      await fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l’action groupée.');
    } finally {
      setBulkActionLoading(false);
    }
  };
  const handleBulkStatusChange = async (newStatus: 'published' | 'draft' | 'archived') => {
    await executeBatchAction({ type: 'set_status', status: newStatus });
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
      wholesale_enabled: Boolean(wholesalePricing?.enabled && Array.isArray(wholesalePricing?.price_tiers) && wholesalePricing.price_tiers.length > 0),
      wholesale_min_quantity: String(wholesalePricing?.min_quantity ?? 5),
      wholesale_price_tiers: wholesalePricing?.price_tiers?.length
        ? wholesalePricing.price_tiers.map((tier) => ({
            min_quantity: String(tier.min_quantity),
            unit_price: String(tier.unit_price),
          }))
        : [],
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
    const isWholesaleActive = Boolean(form.wholesale_enabled);
    const wholesaleMinQuantity = Number(form.wholesale_min_quantity || 5);
    const wholesalePriceTiers = isWholesaleActive ? parseWholesalePriceTiers(form.wholesale_price_tiers) : [];

    if (isWholesaleActive && wholesalePriceTiers.length === 0) {
      setError("Veuillez renseigner au moins un palier de prix de gros valide ou désactiver l'option B2B.");
      setDrawerTab('pricing');
      return;
    }

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
          wholesale_min_quantity: isWholesaleActive ? (wholesaleMinQuantity >= 2 ? wholesaleMinQuantity : 2) : null,
          wholesale_price_tiers: isWholesaleActive ? wholesalePriceTiers : [],
          metadata: (() => {
            const { wholesale_pricing, ...rest } = editingProduct?.metadata || {} as Record<string, unknown>;
            return {
              ...rest,
              cost_price: form.cost_price ? parseFloat(form.cost_price) : undefined,
            };
          })(),
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
                handleOpenPromptLibreModal();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 px-3.5 py-2.5 text-xs font-black text-white shadow-md shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              title="Créer une fiche produit complète en 15 secondes via un prompt libre ou message WhatsApp"
            >
              <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
              <span>🪄 Assistant Magique (Prompt Libre)</span>
            </button>

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
              onClick={() => handleExportCSV(selectedIds.size > 0 ? 'selected' : 'filtered')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all"
              title="Exporter le catalogue en fichier CSV pour Excel"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Export CSV</span>
              {selectedIds.size > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black">
                  ({selectedIds.size})
                </span>
              )}
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

        {/* Full Interactive Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-slate-600 dark:text-slate-400">
              Affichage {totalProducts === 0 ? 0 : (page - 1) * limit + 1} à {Math.min(page * limit, totalProducts)} sur {totalProducts} références
            </span>
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500">Par page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-[#B91C1C]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((c) => Math.max(1, c - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              Précédent
            </button>

            {/* Page Number Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((pNum) => pNum === 1 || pNum === totalPages || Math.abs(pNum - page) <= 2)
              .map((pNum, idx, arr) => {
                const prevNum = arr[idx - 1];
                const showEllipsis = prevNum && pNum - prevNum > 1;
                return (
                  <Fragment key={pNum}>
                    {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                    <button
                      type="button"
                      onClick={() => setPage(pNum)}
                      disabled={loading}
                      className={`h-8 w-8 rounded-lg font-bold transition-all text-xs flex items-center justify-center ${
                        page === pNum
                          ? 'bg-[#B91C1C] text-white shadow-sm'
                          : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {pNum}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

      {/* 4. EXTENDED FLOATING BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-2 sm:gap-2.5 px-4 sm:px-6 py-3 rounded-2xl bg-slate-950/95 text-white shadow-2xl border border-slate-800 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 max-w-[95vw]">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white font-black text-xs">
              {selectedIds.size}
            </span>
            <span className="text-xs font-bold text-slate-300 hidden sm:inline">sélectionné(s)</span>
          </div>

          {/* Status Actions */}
          <button
            type="button"
            onClick={() => void handleBulkStatusChange('published')}
            disabled={bulkActionLoading}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
            title="Publier tous les produits sélectionnés"
          >
            🟢 Publier
          </button>
          <button
            type="button"
            onClick={() => void handleBulkStatusChange('draft')}
            disabled={bulkActionLoading}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
            title="Passer en brouillon"
          >
            ⚪ Brouillon
          </button>
          <button
            type="button"
            onClick={() => void handleBulkStatusChange('archived')}
            disabled={bulkActionLoading}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all hidden md:inline-block"
            title="Archiver"
          >
            📦 Archiver
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Extended Operations */}
          <button
            type="button"
            onClick={() => setShowBulkPriceModal(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-900/60 border border-purple-700/60 hover:bg-purple-800 text-purple-200 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Ajuster les prix en pourcentage ou montant fixe (ex: soldes)"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Ajuster Prix</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBulkCategoryModal(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-900/60 border border-indigo-700/60 hover:bg-indigo-800 text-indigo-200 text-xs font-bold transition-all flex items-center gap-1.5 hidden lg:flex"
            title="Assigner une catégorie Marketplace ou Vitrine à la sélection"
          >
            <Tag className="w-3.5 h-3.5 text-indigo-300" />
            <span>Catégories</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBulkStockModal(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-900/60 border border-blue-700/60 hover:bg-blue-800 text-blue-200 text-xs font-bold transition-all flex items-center gap-1.5 hidden md:flex"
            title="Mettre à jour le stock en masse"
          >
            <Layers className="w-3.5 h-3.5 text-blue-300" />
            <span>Stock</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportCSV('selected')}
            className="px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-700/60 hover:bg-emerald-800 text-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 hidden sm:flex"
            title="Exporter les produits sélectionnés en CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {/* Delete Action */}
          <button
            type="button"
            onClick={() => setShowBulkDeleteModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-red-950/80 border border-red-800/80 hover:bg-red-900 text-red-300 text-xs font-bold transition-all flex items-center gap-1"
            title="Supprimer définitivement les produits sélectionnés"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Supprimer</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Deselect All */}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                {/* Old/Classic AI Button: Refills remaining fields from whatever is currently entered */}
                <button
                  type="button"
                  onClick={handleAutoRefillFromCurrentFields}
                  disabled={smartFillLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/80 transition-all disabled:opacity-50"
                  title="Auto-complète le reste de la fiche à partir du titre, description ou photo déjà saisis"
                >
                  {smartFillLoading && smartFillMode === 'current' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>⚡ Auto-Complétion IA</span>
                </button>

                {/* New AI Button: Opens the Free Prompt / WhatsApp / Supplier Note Mode */}
                <button
                  type="button"
                  onClick={handleOpenPromptLibreModal}
                  disabled={smartFillLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-purple-500/20 hover:scale-105 transition-all disabled:opacity-50"
                  title="Ouvre l'Assistant Magique en mode prompt libre / message WhatsApp fournisseur"
                >
                  {smartFillLoading && smartFillMode === 'prompt' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  )}
                  <span>🪄 Assistant Magique (Prompt Libre)</span>
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
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                      {/* Activation Header & Toggle */}
                      <div className="p-4 sm:p-5 flex items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-black text-lg shadow-sm shadow-amber-500/30">
                            📦
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                Prix de Gros & Remises par Volume (B2B)
                              </h4>
                              {form.wholesale_enabled && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  Actif
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Offrez des tarifs dégressifs pour encourager les commandes en grande quantité
                            </p>
                          </div>
                        </div>

                        {/* Switch */}
                        <button
                          type="button"
                          onClick={() =>
                            setForm((curr) => {
                              const next = !curr.wholesale_enabled;
                              const baseP = parseFloat(curr.price) || 0;
                              return {
                                ...curr,
                                wholesale_enabled: next,
                                wholesale_price_tiers:
                                  next && curr.wholesale_price_tiers.length === 0
                                    ? [
                                        {
                                          min_quantity: '5',
                                          unit_price: baseP > 0 ? (baseP * 0.9).toFixed(3) : '',
                                        },
                                        {
                                          min_quantity: '20',
                                          unit_price: baseP > 0 ? (baseP * 0.8).toFixed(3) : '',
                                        },
                                      ]
                                    : curr.wholesale_price_tiers,
                              };
                            })
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            form.wholesale_enabled ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              form.wholesale_enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Content when Wholesale is Enabled */}
                      {form.wholesale_enabled && (() => {
                        const ws = getWholesaleAnalysis();

                        return (
                          <div className="p-4 sm:p-5 space-y-6 animate-in fade-in duration-200">
                            {/* Cost Price & Retail Margin Summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-900/50">
                              <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  Prix Public Détail (Base B2C) :
                                </span>
                                <p className="text-base font-black text-slate-900 dark:text-white">
                                  {ws.basePrice > 0 ? `${ws.basePrice.toFixed(3)} TND` : <span className="text-slate-400 text-xs italic">Non défini</span>}
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
                                    className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                                  />
                                  <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400">TND</span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  Marge Brute Vente Détail :
                                </span>
                                {ws.basePrice > 0 && ws.costPrice > 0 ? (
                                  <p className={`text-xs font-black ${ws.basePrice >= ws.costPrice ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                                    +{(ws.basePrice - ws.costPrice).toFixed(3)} TND ({(((ws.basePrice - ws.costPrice) / ws.basePrice) * 100).toFixed(1)}%)
                                  </p>
                                ) : (
                                  <p className="text-xs text-slate-400 font-medium italic">Saisissez le coût de revient pour le calcul</p>
                                )}
                              </div>
                            </div>

                            {/* Incoherence & Tier Inversion Alert Box */}
                            {ws.hasErrors && (
                              <div className="p-4 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/60 space-y-2 animate-in fade-in">
                                <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-black text-xs">
                                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                  <span>Incohérences de Paliers Grossistes Détectées :</span>
                                </div>
                                <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
                                  {ws.issues.map((issue, idx) => (
                                    <li key={idx}>{issue}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* 1-Click Smart Presets */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                ⚡ Modèles Stratégiques de Paliers Grossistes en 1 Clic :
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {WHOLESALE_PRESETS.map((preset) => (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleApplyWholesalePreset(preset)}
                                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:bg-amber-50/80 hover:border-amber-400 dark:hover:bg-slate-800 transition-all text-left group shadow-xs"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-base">{preset.icon}</span>
                                      <span className="font-black text-xs text-slate-800 dark:text-slate-200 group-hover:text-amber-600 truncate">
                                        {preset.name}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 truncate mt-1">{preset.desc}</p>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Detailed Paliers Table with Live Calculations */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    Grille Tarifaire Wholesale B2B & Économies Grossistes
                                  </h4>
                                  <p className="text-[11px] text-slate-400">
                                    Définissez des prix dégressifs par palier de volume pour attirer les commandes groupées.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((c) => ({
                                      ...c,
                                      wholesale_price_tiers: [
                                        ...c.wholesale_price_tiers,
                                        {
                                          min_quantity: String((c.wholesale_price_tiers.length + 1) * 10),
                                          unit_price: form.price ? (parseFloat(form.price) * Math.max(0.5, 1 - (c.wholesale_price_tiers.length + 1) * 0.05)).toFixed(3) : '',
                                        },
                                      ],
                                    }))
                                  }
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-all shadow-md shadow-amber-600/20"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Ajouter un Palier</span>
                                </button>
                              </div>

                              {form.wholesale_price_tiers.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed border-amber-200 dark:border-amber-900/50 rounded-3xl p-6 bg-amber-50/20">
                                  <Package className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-60" />
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Aucun palier grossiste configuré.
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-1">
                                    Cliquez sur un modèle en 1 clic ci-dessus ou sur "Ajouter un Palier" pour débuter.
                                  </p>
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-black uppercase text-[10px]">
                                      <tr>
                                        <th className="px-3.5 py-3">Palier (Qté Min.)</th>
                                        <th className="px-3.5 py-3">Prix Unitaire B2B</th>
                                        <th className="px-3.5 py-3">Remise Accordée</th>
                                        <th className="px-3.5 py-3">Panier Min. (CA)</th>
                                        <th className="px-3.5 py-3">Économie Client Pro</th>
                                        <th className="px-3.5 py-3">Marge Brute B2B</th>
                                        <th className="px-2 py-3 text-center">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                      {ws.analyzedTiers.map((tier) => {
                                        const hasRowIssues = tier.tierIssues.length > 0;

                                        return (
                                          <tr
                                            key={tier.idx}
                                            className={`transition-colors ${
                                              hasRowIssues
                                                ? 'bg-red-50/50 dark:bg-red-950/20'
                                                : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                                            }`}
                                          >
                                            {/* Minimum Quantity Input */}
                                            <td className="px-3.5 py-2.5">
                                              <div className="flex items-center gap-1.5">
                                                <input
                                                  type="number"
                                                  min="2"
                                                  placeholder="Ex: 5"
                                                  value={form.wholesale_price_tiers[tier.idx]?.min_quantity || ''}
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    setForm((c) => ({
                                                      ...c,
                                                      wholesale_price_tiers: c.wholesale_price_tiers.map((t, i) =>
                                                        i === tier.idx ? { ...t, min_quantity: val } : t,
                                                      ),
                                                    }));
                                                  }}
                                                  className="w-20 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-amber-500 font-mono"
                                                />
                                                <span className="text-slate-400 text-[11px] font-bold">unités</span>
                                              </div>
                                            </td>

                                            {/* Unit Price Input */}
                                            <td className="px-3.5 py-2.5">
                                              <div className="flex items-center gap-1.5">
                                                <input
                                                  type="number"
                                                  step="0.001"
                                                  min="0"
                                                  placeholder="Ex: 25.000"
                                                  value={form.wholesale_price_tiers[tier.idx]?.unit_price || ''}
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    setForm((c) => ({
                                                      ...c,
                                                      wholesale_price_tiers: c.wholesale_price_tiers.map((t, i) =>
                                                        i === tier.idx ? { ...t, unit_price: val } : t,
                                                      ),
                                                    }));
                                                  }}
                                                  className="w-28 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-amber-500 font-mono"
                                                />
                                                <span className="text-slate-400 text-[11px] font-bold">TND</span>
                                              </div>
                                            </td>

                                            {/* Discount Badge */}
                                            <td className="px-3.5 py-2.5">
                                              {tier.discountPct > 0 ? (
                                                <div className="flex flex-col">
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 w-fit">
                                                    -{tier.discountPct.toFixed(1)}%
                                                  </span>
                                                  <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                                    -{tier.unitSavings.toFixed(3)} DT/u
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-slate-400 text-[11px] italic">Pas de remise</span>
                                              )}
                                            </td>

                                            {/* Min Order Total (CA Panier) */}
                                            <td className="px-3.5 py-2.5">
                                              {tier.minOrderTotal > 0 ? (
                                                <div>
                                                  <span className="font-black text-slate-900 dark:text-white font-mono text-xs block">
                                                    {tier.minOrderTotal.toFixed(3)} TND
                                                  </span>
                                                  <span className="text-[10px] text-slate-400">
                                                    pour {tier.minQty} unités
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-slate-400 text-[11px]">—</span>
                                              )}
                                            </td>

                                            {/* Total Customer Savings */}
                                            <td className="px-3.5 py-2.5">
                                              {tier.minOrderSavings > 0 ? (
                                                <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                                                  +{tier.minOrderSavings.toFixed(3)} TND
                                                </span>
                                              ) : (
                                                <span className="text-slate-400 text-[11px]">—</span>
                                              )}
                                            </td>

                                            {/* Margin Calculation */}
                                            <td className="px-3.5 py-2.5">
                                              {ws.costPrice > 0 && tier.unitPrice > 0 ? (
                                                <div>
                                                  <span
                                                    className={`font-black text-xs font-mono block ${
                                                      tier.netMarginTnd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'
                                                    }`}
                                                  >
                                                    {tier.netMarginTnd > 0 ? `+${tier.netMarginTnd.toFixed(3)}` : tier.netMarginTnd.toFixed(3)} DT/u ({tier.netMarginPct.toFixed(0)}%)
                                                  </span>
                                                  <span className="text-[10px] text-slate-400 font-mono">
                                                    CA marge : +{tier.totalMarginGenerated.toFixed(3)} DT
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-slate-400 text-[11px] italic">Coût non saisi</span>
                                              )}
                                            </td>

                                            {/* Delete Row Button */}
                                            <td className="px-2 py-2.5 text-center">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setForm((c) => ({
                                                    ...c,
                                                    wholesale_price_tiers: c.wholesale_price_tiers.filter((_, i) => i !== tier.idx),
                                                  }))
                                                }
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                                                title="Supprimer ce palier"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* Interactive B2B Wholesale Cart Simulator */}
                            {form.wholesale_price_tiers.length > 0 && (
                              <div className="p-5 rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-slate-900/5 dark:bg-slate-800/40 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 dark:border-slate-700 pb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-xl bg-amber-500 text-white">
                                      <Coins className="w-4 h-4" />
                                    </div>
                                    <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                      Simulateur de Commande Grossiste B2B (Aperçu Acheteur)
                                    </h5>
                                  </div>

                                  {/* Quick Qty Tester Chips */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-slate-400 font-bold">Tester quantité :</span>
                                    {[5, 10, 20, 50, 100].map((q) => (
                                      <button
                                        key={q}
                                        type="button"
                                        onClick={() => setB2bSimulatedQty(q)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                          b2bSimulatedQty === q
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                        }`}
                                      >
                                        {q}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 space-y-1">
                                    <span className="text-[10px] font-black uppercase text-slate-400">Quantité Achetée :</span>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="1"
                                        value={b2bSimulatedQty}
                                        onChange={(e) => setB2bSimulatedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        className="w-20 px-2.5 py-1 text-sm font-black rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                      />
                                      <span className="text-xs font-bold text-slate-500">unités</span>
                                    </div>
                                  </div>

                                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 space-y-1">
                                    <span className="text-[10px] font-black uppercase text-slate-400">Palier Déclenché :</span>
                                    <p className="text-xs font-black text-slate-900 dark:text-white">
                                      {ws.simulation.appliedTier ? (
                                        <span className="text-amber-600 dark:text-amber-400">
                                          ≥ {ws.simulation.appliedTier.minQty} unités (-{ws.simulation.appliedTier.discountPct.toFixed(1)}%)
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">Prix détail standard</span>
                                      )}
                                    </p>
                                    <p className="text-[10px] font-mono text-slate-400">
                                      {ws.simulation.unitPrice.toFixed(3)} DT / unité
                                    </p>
                                  </div>

                                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 space-y-1">
                                    <span className="text-[10px] font-black uppercase text-slate-400">Total Facturé B2B :</span>
                                    <p className="text-sm font-black text-slate-900 dark:text-white font-mono">
                                      {ws.simulation.total.toFixed(3)} TND
                                    </p>
                                    {ws.simulation.savings > 0 && (
                                      <p className="text-[10px] font-bold text-emerald-600">
                                        Économie client : -{ws.simulation.savings.toFixed(3)} DT
                                      </p>
                                    )}
                                  </div>

                                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 space-y-1">
                                    <span className="text-[10px] font-black uppercase text-slate-400">Marge Vendeur Réalisée :</span>
                                    {ws.costPrice > 0 ? (
                                      <p className={`text-sm font-black font-mono ${ws.simulation.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        +{ws.simulation.margin.toFixed(3)} TND
                                      </p>
                                    ) : (
                                      <p className="text-xs text-slate-400 italic">Coût non spécifié</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

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
                              e.preventDefault();
                              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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
                            style={{ touchAction: 'none' }}
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
                            {/* Background Layer: Processed Studio AI Image (APRÈS) */}
                            <img
                              src={processedStudioImage || form.thumbnail}
                              alt="Studio Après"
                              draggable={false}
                              className={`absolute inset-0 h-full w-full object-cover pointer-events-none ${
                                studioZoomEnabled ? 'scale-150 origin-center' : ''
                              }`}
                            />

                            {/* Foreground Layer: Raw Original Image (AVANT) — clipPath applied directly on img */}
                            <img
                              src={rawOriginalImage || form.thumbnail}
                              alt="Original Avant"
                              draggable={false}
                              className={`absolute inset-0 h-full w-full object-cover pointer-events-none ${
                                studioZoomEnabled ? 'scale-150 origin-center' : ''
                              }`}
                              style={{ clipPath: `inset(0 ${100 - studioSliderPos}% 0 0)` }}
                            />

                            {/* Draggable Divider Handle with vertical line */}
                            <div
                              className="absolute top-0 bottom-0 pointer-events-none z-20"
                              style={{ left: `${studioSliderPos}%`, transform: 'translateX(-1px)' }}
                            >
                              {/* Vertical divider line */}
                              <div className="absolute inset-y-0 w-0.5 bg-white/80 shadow-lg" />
                              {/* Circular handle */}
                              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-px h-9 w-9 rounded-full bg-white text-slate-900 shadow-2xl flex items-center justify-center border-2 border-purple-600 ring-4 ring-purple-400/20">
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

                {/* TAB 6: SEO & SEARCH (LIVE SCORING & MULTI-PLATFORM SNIPPET PREVIEW) */}
                {drawerTab === 'seo' && (() => {
                  const seo = getSeoAnalysis();
                  const effectiveTitle = form.seo_title || form.title || 'Titre du Produit sur PandaMarket Tunisie';
                  const effectiveDesc =
                    form.seo_description ||
                    form.description?.replace(/<[^>]+>/g, '').slice(0, 160) ||
                    'Découvrez ce produit d’exception sur PandaMarket Tunisie. Qualité certifiée, paiement sécurisé et livraison rapide dans toute la Tunisie.';
                  const productUrl = `pandamarket.tn/store/boutique/${form.slug || 'mon-produit'}`;

                  return (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      {/* Top Header & AI 1-Click Optimize Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-900/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-purple-500/20">
                            <GlobeIcon className="w-6 h-6 text-yellow-300" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                              <span>Optimisation Référencement Naturel (SEO) & Social</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${seo.gradeColor}`}>
                                Score : {seo.score} / 100
                              </span>
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              Maximisez votre visibilité sur Google, Facebook et WhatsApp pour attirer du trafic organique gratuit.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleGenerateSeoWithAi()}
                          disabled={seoAiGenerating || (!form.title && !form.description)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white font-black text-xs shadow-md shadow-purple-600/25 hover:scale-105 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
                        >
                          {seoAiGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Optimisation IA en cours...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                              <span>✨ Optimiser le SEO par l'IA</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Dynamic Score Gauge & Audit Checklist */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Gauge Card */}
                        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col items-center justify-center text-center space-y-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Jauge de Performance SEO
                          </span>
                          <div className="relative flex items-center justify-center">
                            <div className="w-24 h-24 rounded-full border-8 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                              <span className="text-2xl font-black text-slate-900 dark:text-white">
                                {seo.score}%
                              </span>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-xl text-xs font-black border ${seo.gradeColor}`}>
                            {seo.gradeLabel}
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                seo.score >= 85
                                  ? 'bg-emerald-500'
                                  : seo.score >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${seo.score}%` }}
                            />
                          </div>
                        </div>

                        {/* SEO Audit Checklist (2 cols on lg) */}
                        <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            📋 Diagnostic en Temps Réel & Recommandations :
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {/* Title check */}
                            <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-2">
                              <span className="mt-0.5 text-sm">
                                {seo.checks.title.status === 'pass' ? '✅' : seo.checks.title.status === 'warn' ? '⚠️' : '❌'}
                              </span>
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <strong className="text-slate-900 dark:text-white">Titre SEO Google</strong>
                                  <span className="font-mono text-[10px] text-slate-400 font-bold">{seo.checks.title.count}/60</span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{seo.checks.title.message}</p>
                              </div>
                            </div>

                            {/* Meta desc check */}
                            <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-2">
                              <span className="mt-0.5 text-sm">
                                {seo.checks.description.status === 'pass' ? '✅' : seo.checks.description.status === 'warn' ? '⚠️' : '❌'}
                              </span>
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <strong className="text-slate-900 dark:text-white">Méta-Description</strong>
                                  <span className="font-mono text-[10px] text-slate-400 font-bold">{seo.checks.description.count}/160</span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{seo.checks.description.message}</p>
                              </div>
                            </div>

                            {/* Tags check */}
                            <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-2">
                              <span className="mt-0.5 text-sm">
                                {seo.checks.tags.status === 'pass' ? '✅' : seo.checks.tags.status === 'warn' ? '⚠️' : '❌'}
                              </span>
                              <div>
                                <strong className="text-slate-900 dark:text-white">Mots-Clés E-commerce</strong>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{seo.checks.tags.message}</p>
                              </div>
                            </div>

                            {/* Image check */}
                            <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-2">
                              <span className="mt-0.5 text-sm">
                                {seo.checks.image.status === 'pass' ? '✅' : '❌'}
                              </span>
                              <div>
                                <strong className="text-slate-900 dark:text-white">Image de Couverture Sociale</strong>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{seo.checks.image.message}</p>
                              </div>
                            </div>

                            {/* Slug check */}
                            <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-2">
                              <span className="mt-0.5 text-sm">
                                {seo.checks.slug.status === 'pass' ? '✅' : '❌'}
                              </span>
                              <div>
                                <strong className="text-slate-900 dark:text-white">Permalien / Slug URL</strong>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{seo.checks.slug.message}</p>
                              </div>
                            </div>

                            {/* Content check */}
                            <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-2">
                              <span className="mt-0.5 text-sm">
                                {seo.checks.content.status === 'pass' ? '✅' : seo.checks.content.status === 'warn' ? '⚠️' : '❌'}
                              </span>
                              <div>
                                <strong className="text-slate-900 dark:text-white">Richesse de Description</strong>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{seo.checks.content.message}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Editable Form Inputs */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Title Input */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Titre SEO (Meta Title) - Balise &lt;title&gt; :
                            </label>
                            <span
                              className={`font-mono text-[11px] font-bold ${
                                seo.checks.title.count > 65
                                  ? 'text-red-500'
                                  : seo.checks.title.count >= 40
                                  ? 'text-emerald-600'
                                  : 'text-amber-500'
                              }`}
                            >
                              {seo.checks.title.count} / 60 caractères
                            </span>
                          </div>
                          <input
                            type="text"
                            value={form.seo_title}
                            onChange={(e) => setForm((c) => ({ ...c, seo_title: e.target.value }))}
                            placeholder={form.title || 'Ex: Montre Automatique Homme Cuir Luxe | PandaMarket'}
                            className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-purple-600"
                          />
                          <p className="text-[10px] text-slate-400">
                            Conseil : Placez les mots-clés principaux en premier, suivis du nom de votre boutique.
                          </p>
                        </div>

                        {/* Tags Input */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Mots-Clés E-commerce & Recherche :
                            </label>
                            <span className="font-mono text-[11px] font-bold text-purple-600">
                              {seo.tagsCount} tag(s)
                            </span>
                          </div>
                          <input
                            type="text"
                            value={form.tags}
                            onChange={(e) => setForm((c) => ({ ...c, tags: e.target.value }))}
                            placeholder="running, baskets homme, respirant, sport, italie"
                            className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-purple-600"
                          />
                          <p className="text-[10px] text-slate-400">
                            Séparez les mots-clés par des virgules pour faciliter la recherche client.
                          </p>
                        </div>

                        {/* Meta Description Input */}
                        <div className="lg:col-span-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Méta-Description SEO (Affichée sous le titre dans les résultats Google) :
                            </label>
                            <span
                              className={`font-mono text-[11px] font-bold ${
                                seo.checks.description.count > 165
                                  ? 'text-red-500'
                                  : seo.checks.description.count >= 120
                                  ? 'text-emerald-600'
                                  : 'text-amber-500'
                              }`}
                            >
                              {seo.checks.description.count} / 160 caractères
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            value={form.seo_description}
                            onChange={(e) => setForm((c) => ({ ...c, seo_description: e.target.value }))}
                            placeholder="Rédigez un résumé attrayant incitant les clients à cliquer sur votre lien dans les résultats Google..."
                            className="w-full p-3.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-purple-600 leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* Multi-Platform Snippet Previews */}
                      <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-purple-600" />
                            <h5 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                              Aperçus Réalistes en Direct :
                            </h5>
                          </div>

                          {/* Preview Platform Tabs */}
                          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            {[
                              { id: 'google', label: '🔍 Google Search' },
                              { id: 'whatsapp', label: '📱 WhatsApp' },
                              { id: 'facebook', label: '📘 Facebook' },
                              { id: 'twitter', label: '🐦 X / Twitter' },
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSeoPreviewTab(tab.id as any)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  seoPreviewTab === tab.id
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 1. Google SERP Preview Card */}
                        {seoPreviewTab === 'google' && (
                          <div className="p-5 rounded-2xl bg-white dark:bg-[#202124] border border-slate-200 dark:border-[#3c4043] shadow-xs space-y-2 max-w-2xl font-sans">
                            {/* Breadcrumbs */}
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-6 h-6 rounded-full bg-red-600 text-white font-black flex items-center justify-center text-[10px]">
                                P
                              </div>
                              <div className="truncate">
                                <span className="font-bold text-[#202124] dark:text-[#dadce0] text-xs">PandaMarket</span>
                                <span className="text-[#5f6368] dark:text-[#9aa0a6] text-[11px] block truncate">
                                  https://{productUrl}
                                </span>
                              </div>
                            </div>

                            {/* Google Title Link */}
                            <h3 className="text-base sm:text-lg text-[#1a0dab] dark:text-[#8ab4f8] hover:underline font-medium cursor-pointer leading-snug">
                              {effectiveTitle}
                            </h3>

                            {/* Price & Rating Badge */}
                            <div className="flex items-center gap-2 text-xs text-[#70757a] dark:text-[#9aa0a6]">
                              <span className="text-amber-500 font-bold">★★★★★ 4.9 (24 avis)</span>
                              <span>·</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {formatPrice(form.price || '0')}
                              </span>
                              <span>·</span>
                              <span className="text-emerald-600 font-bold">En stock</span>
                            </div>

                            {/* Snippet Description */}
                            <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed line-clamp-2">
                              {effectiveDesc}
                            </p>
                          </div>
                        )}

                        {/* 2. WhatsApp Preview Card */}
                        {seoPreviewTab === 'whatsapp' && (
                          <div className="p-4 rounded-2xl bg-[#0b141a] max-w-md shadow-lg">
                            <div className="p-3 rounded-xl bg-[#202c33] text-white space-y-2 border-l-4 border-[#00a884]">
                              {form.thumbnail ? (
                                <div className="h-40 w-full rounded-lg overflow-hidden bg-slate-800 relative">
                                  <img
                                    src={form.thumbnail}
                                    alt={effectiveTitle}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="h-32 w-full rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 text-xs">
                                  Pas d'image de couverture
                                </div>
                              )}
                              <h4 className="font-bold text-xs text-white line-clamp-1">{effectiveTitle}</h4>
                              <p className="text-[11px] text-[#8696a0] line-clamp-2">{effectiveDesc}</p>
                              <span className="text-[10px] text-[#00a884] font-mono block">pandamarket.tn</span>
                            </div>
                          </div>
                        )}

                        {/* 3. Facebook / OpenGraph Preview Card */}
                        {seoPreviewTab === 'facebook' && (
                          <div className="max-w-lg rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
                            {form.thumbnail ? (
                              <div className="h-48 w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                <img
                                  src={form.thumbnail}
                                  alt={effectiveTitle}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-48 w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs">
                                Ajouter une photo de couverture pour le partage Facebook (1200x630px)
                              </div>
                            )}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                PANDAMARKET.TN
                              </span>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                {effectiveTitle}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                {effectiveDesc}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* 4. Twitter / X Card Preview */}
                        {seoPreviewTab === 'twitter' && (
                          <div className="max-w-md rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-black shadow-md">
                            {form.thumbnail && (
                              <div className="h-44 w-full relative overflow-hidden bg-slate-900">
                                <img
                                  src={form.thumbnail}
                                  alt={effectiveTitle}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="p-3 space-y-1">
                              <span className="text-[10px] text-slate-500">pandamarket.tn</span>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                {effectiveTitle}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                {effectiveDesc}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

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
      {/* 7. AI SMART FILL / ASSISTANT MAGIQUE IA MODAL */}
      {/* ========================================================================= */}
      {showSmartFillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-4xl rounded-3xl border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-purple-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-500 text-white shadow-lg shadow-purple-500/25">
                  <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      Assistant Magique IA : Mode Prompt Libre & Extraction Fiche Complète
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      GPT-4 / Claude / Gemini
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Collez un message WhatsApp, une note fournisseur ou une phrase brute pour générer instantanément la fiche produit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSmartFillModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector & Language Selector Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSmartFillMode('prompt')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    smartFillMode === 'prompt'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  ✍️ Mode Prompt Libre / Message Fournisseur
                </button>
                <button
                  type="button"
                  onClick={() => setSmartFillMode('current')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    smartFillMode === 'current'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  📋 Champs de la Fiche Actuelle
                </button>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Langue :</span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'fr', label: '🇫🇷 Français' },
                    { id: 'ar', label: '🇹🇳 Darija / Arabe' },
                    { id: 'en', label: '🇬🇧 English' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setSmartFillLanguage(lang.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        smartFillLanguage === lang.id
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border border-purple-300 dark:border-purple-700'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input Section (Free Prompt Mode) */}
            {smartFillMode === 'prompt' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    📝 Texte brut, description libre ou message fournisseur :
                  </label>
                  {smartFillSuggestions && (
                    <button
                      type="button"
                      onClick={() => setSmartFillActiveTab(smartFillActiveTab === 'input' ? 'preview' : 'input')}
                      className="text-xs font-bold text-purple-600 hover:underline"
                    >
                      {smartFillActiveTab === 'input' ? 'Voir suggestions extraites →' : '← Modifier le texte brut'}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={freePromptText}
                    onChange={(e) => setFreePromptText(e.target.value)}
                    placeholder="Collez ici votre texte brut... Ex: Je vends des baskets sport running respirantes pour homme et femme, pointures 40 à 45, semelle amortissante confort, importées d'Italie, prix 120dt..."
                    className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 leading-relaxed"
                  />
                  {freePromptText && (
                    <button
                      type="button"
                      onClick={() => setFreePromptText('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-1"
                      title="Effacer le texte"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 1-Click Quick Samples */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    💡 Exemples en 1-Clic pour tester :
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      {
                        icon: '👟',
                        label: 'Baskets Running (120 DT)',
                        text: "Baskets running respirantes pour homme et femme, semelle amortissante confort et adhérence supérieure, pointures 40 à 45, importées d'Italie, prix 120dt",
                      },
                      {
                        icon: '👗',
                        label: 'Robe Soirée Soie (85 DT)',
                        text: "Robe longue soirée en soie naturelle avec broderie artisanale dorée, coupe fluide élégante, tailles S, M, L, XL, fait main en Tunisie, prix 85dt",
                      },
                      {
                        icon: '📱',
                        label: 'Écouteurs Bluetooth (49 DT)',
                        text: "Écouteurs sans fil bluetooth 5.3 avec réduction active de bruit, autonomie 24h, boîtier étanche IPX5 et charge ultra-rapide, prix 49dt",
                      },
                      {
                        icon: '🏺',
                        label: 'Huile d’Olive Bio (35 DT)',
                        text: "Huile d'olive extra vierge biologique première pression à froid récolte 2026, bouteille en verre 1 Litre région Sahel Tunisie, prix 35dt",
                      },
                    ].map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFreePromptText(sample.text);
                          void handleSmartFill(sample.text);
                        }}
                        className="p-2 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-100/70 dark:hover:bg-purple-900/40 text-left transition-all group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{sample.icon}</span>
                          <span className="font-bold text-xs text-purple-950 dark:text-purple-200 group-hover:text-purple-600 truncate">
                            {sample.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{sample.text}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Extract Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => void handleSmartFill()}
                    disabled={smartFillLoading || !freePromptText.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white font-black text-sm shadow-lg shadow-purple-600/25 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {smartFillLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Extraction intelligente par l'IA en cours...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                        <span>Analyser & Extraire la Fiche Complète (1-Clic)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Input Section (Current Form Mode) */}
            {smartFillMode === 'current' && (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  L'IA utilisera le titre actuel (<strong>{form.title || 'Non renseigné'}</strong>), la description et l'image actuelle de votre fiche produit pour enrichir et compléter tous les champs manquants.
                </p>
                <button
                  type="button"
                  onClick={() => void handleSmartFill()}
                  disabled={smartFillLoading || (!form.title && !form.description && !form.thumbnail)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-sm shadow-md shadow-purple-600/20 hover:opacity-95 disabled:opacity-50 transition-all"
                >
                  {smartFillLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyse de la fiche en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      <span>Compléter & Enrichir la Fiche Produit Actuelle</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Extraction Results Preview Section */}
            {smartFillSuggestions && (
              <div className="space-y-4 pt-4 border-t border-purple-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white font-black text-xs">
                      ✓
                    </span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      Fiche Produit Complète Extraite par l'IA
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFieldsToApply({
                          title: true,
                          description: true,
                          price: true,
                          categories: true,
                          tags: true,
                          attributes: true,
                          variants: true,
                          seo: true,
                        })
                      }
                      className="text-[11px] font-bold text-purple-600 hover:underline"
                    >
                      Tout cocher
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFieldsToApply({
                          title: false,
                          description: false,
                          price: false,
                          categories: false,
                          tags: false,
                          attributes: false,
                          variants: false,
                          seo: false,
                        })
                      }
                      className="text-[11px] font-bold text-slate-500 hover:underline"
                    >
                      Tout décocher
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                  {/* Title & Price Card */}
                  <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFieldsToApply.title}
                          onChange={(e) => setSelectedFieldsToApply((c) => ({ ...c, title: e.target.checked }))}
                          className="rounded text-purple-600"
                        />
                        <span className="font-black uppercase text-purple-900 dark:text-purple-300 text-[10px]">
                          📌 Titre Commercial Optimisé
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => applySmartFillItem('title')}
                        className="px-2.5 py-0.5 rounded-lg bg-purple-600 text-white font-bold text-[10px] hover:bg-purple-700"
                      >
                        Appliquer
                      </button>
                    </div>
                    <p className="p-3 rounded-xl bg-white dark:bg-slate-800 font-black text-slate-900 dark:text-white border border-purple-100 dark:border-slate-700">
                      {smartFillSuggestions.suggested_title}
                    </p>

                    {/* Detected Price */}
                    <div className="pt-2 border-t border-purple-100 dark:border-slate-700/60 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFieldsToApply.price}
                          onChange={(e) => setSelectedFieldsToApply((c) => ({ ...c, price: e.target.checked }))}
                          className="rounded text-purple-600"
                        />
                        <span className="font-black uppercase text-slate-600 dark:text-slate-300 text-[10px]">
                          💰 Prix Détecté :
                        </span>
                      </label>
                      {smartFillSuggestions.suggested_price ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-black text-xs">
                            {Number(smartFillSuggestions.suggested_price).toFixed(3)} TND
                          </span>
                          <button
                            type="button"
                            onClick={() => applySmartFillItem('price')}
                            className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px]"
                          >
                            Appliquer
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Non spécifié dans le texte</span>
                      )}
                    </div>
                  </div>

                  {/* Categories Card */}
                  <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFieldsToApply.categories}
                          onChange={(e) => setSelectedFieldsToApply((c) => ({ ...c, categories: e.target.checked }))}
                          className="rounded text-purple-600"
                        />
                        <span className="font-black uppercase text-purple-900 dark:text-purple-300 text-[10px]">
                          🌐 Catégorisation Hub & Vitrine
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          applySmartFillItem('hub_category');
                          applySmartFillItem('storefront_category');
                        }}
                        className="px-2.5 py-0.5 rounded-lg bg-purple-600 text-white font-bold text-[10px] hover:bg-purple-700"
                      >
                        Appliquer les 2
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Catégorie Hub :</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {smartFillSuggestions.suggested_hub_category_name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => applySmartFillItem('hub_category')}
                          className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 font-bold text-[10px]"
                        >
                          Appliquer
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Vitrine Boutique :</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {smartFillSuggestions.suggested_storefront_category}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => applySmartFillItem('storefront_category')}
                          className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 font-bold text-[10px]"
                        >
                          Appliquer
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* HTML Marketing Description Card */}
                  <div className="lg:col-span-2 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFieldsToApply.description}
                          onChange={(e) => setSelectedFieldsToApply((c) => ({ ...c, description: e.target.checked }))}
                          className="rounded text-purple-600"
                        />
                        <span className="font-black uppercase text-purple-900 dark:text-purple-300 text-[10px]">
                          📄 Description Marketing HTML Complète
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => applySmartFillItem('description')}
                        className="px-2.5 py-0.5 rounded-lg bg-purple-600 text-white font-bold text-[10px] hover:bg-purple-700"
                      >
                        Appliquer la description
                      </button>
                    </div>
                    <div
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-purple-100 dark:border-slate-700 max-h-48 overflow-y-auto leading-relaxed prose prose-sm dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: smartFillSuggestions.suggested_description }}
                    />
                  </div>

                  {/* Technical Attributes & Tags */}
                  <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFieldsToApply.attributes}
                          onChange={(e) => setSelectedFieldsToApply((c) => ({ ...c, attributes: e.target.checked }))}
                          className="rounded text-purple-600"
                        />
                        <span className="font-black uppercase text-purple-900 dark:text-purple-300 text-[10px]">
                          ⚙️ Caractéristiques Techniques ({smartFillSuggestions.suggested_attributes?.length || 0})
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => applySmartFillItem('attributes')}
                        className="px-2.5 py-0.5 rounded-lg bg-purple-600 text-white font-bold text-[10px] hover:bg-purple-700"
                      >
                        Appliquer
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700 min-h-12 items-center">
                      {smartFillSuggestions.suggested_attributes && smartFillSuggestions.suggested_attributes.length > 0 ? (
                        smartFillSuggestions.suggested_attributes.map((attr, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                          >
                            <strong className="text-purple-600 dark:text-purple-400 mr-1">{attr.name}:</strong> {attr.value}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Aucun attribut spécifique détecté</span>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="pt-2 border-t border-purple-100 dark:border-slate-700 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFieldsToApply.tags}
                          onChange={(e) => setSelectedFieldsToApply((c) => ({ ...c, tags: e.target.checked }))}
                          className="rounded text-purple-600"
                        />
                        <span className="font-black uppercase text-slate-600 dark:text-slate-300 text-[10px]">
                          🏷️ Tags E-commerce ({smartFillSuggestions.suggested_tags?.length || 0})
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => applySmartFillItem('tags')}
                        className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 font-bold text-[10px]"
                      >
                        Appliquer
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {smartFillSuggestions.suggested_tags?.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Variants & SEO Card */}
                  <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 space-y-3">
                    {/* Variants */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFieldsToApply.variants}
                          onChange={(e) => setSelectedFieldsToApply((c) => ({ ...c, variants: e.target.checked }))}
                          className="rounded text-purple-600"
                        />
                        <span className="font-black uppercase text-purple-900 dark:text-purple-300 text-[10px]">
                          🔀 Déclinaisons & Variantes Détectées
                        </span>
                      </label>
                      {smartFillSuggestions.suggested_variants && smartFillSuggestions.suggested_variants.length > 0 && (
                        <button
                          type="button"
                          onClick={() => applySmartFillItem('variants')}
                          className="px-2.5 py-0.5 rounded-lg bg-purple-600 text-white font-bold text-[10px] hover:bg-purple-700"
                        >
                          Générer Déclinaisons
                        </button>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700 space-y-1.5 min-h-12">
                      {smartFillSuggestions.suggested_variants && smartFillSuggestions.suggested_variants.length > 0 ? (
                        smartFillSuggestions.suggested_variants.map((v, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs">
                            <span className="font-black text-purple-700 dark:text-purple-300">{v.name} :</span>
                            <div className="flex flex-wrap gap-1">
                              {v.values.map((val, vi) => (
                                <span key={vi} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-bold">
                                  {val}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Produit unique (pas de tailles/couleurs multiples détectées)</span>
                      )}
                    </div>

                    {/* SEO */}
                    <div className="pt-2 border-t border-purple-100 dark:border-slate-700 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFieldsToApply.seo}
                          onChange={(e) => setSelectedFieldsToApply((c) => ({ ...c, seo: e.target.checked }))}
                          className="rounded text-purple-600"
                        />
                        <span className="font-black uppercase text-slate-600 dark:text-slate-300 text-[10px]">
                          🔍 Balises SEO Google
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => applySmartFillItem('seo')}
                        className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 font-bold text-[10px]"
                      >
                        Appliquer
                      </button>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700 space-y-1">
                      <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 truncate">
                        {smartFillSuggestions.suggested_seo_title}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {smartFillSuggestions.suggested_seo_description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-purple-100 dark:border-slate-800 pt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSmartFill()}
                  disabled={smartFillLoading || (smartFillMode === 'prompt' && !freePromptText.trim())}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {smartFillLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-600" />}
                  <span>Régénérer d'autres propositions</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSmartFillModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={applySelectedSmartFill}
                  disabled={!smartFillSuggestions}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white text-xs font-black shadow-lg shadow-purple-600/25 hover:scale-105 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 text-yellow-300" />
                  <span>✨ Tout Appliquer à la Fiche Produit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}{/* ========================================================================= */}
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
      {/* ========================================================================= */}
      {/* 9. BULK PRICE ADJUSTMENT MODAL */}
      {/* ========================================================================= */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-purple-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
                  <Coins className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Ajustement Groupé des Prix (Soldes & Tarifs)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Appliquer une modification de prix sur <strong>{selectedIds.size}</strong> produit(s) sélectionné(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkPriceModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Adjustment Type Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setBulkPriceMode('percent')}
                className={`py-2 rounded-lg text-xs font-black transition-all ${
                  bulkPriceMode === 'percent'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Pourcentage (%)
              </button>
              <button
                type="button"
                onClick={() => setBulkPriceMode('fixed')}
                className={`py-2 rounded-lg text-xs font-black transition-all ${
                  bulkPriceMode === 'fixed'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Montant Fixe (TND)
              </button>
            </div>

            {/* Preset Strategy Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                ⚡ Préréglages Rapides :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '-10% Soldes', mode: 'percent', val: '-10' },
                  { label: '-20% Soldes', mode: 'percent', val: '-20' },
                  { label: '-30% Déstockage', mode: 'percent', val: '-30' },
                  { label: '-50% Flash', mode: 'percent', val: '-50' },
                  { label: '+10% Inflation', mode: 'percent', val: '10' },
                  { label: '+5.000 DT', mode: 'fixed', val: '5' },
                  { label: '-5.000 DT', mode: 'fixed', val: '-5' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setBulkPriceMode(chip.mode as any);
                      setBulkPriceValue(chip.val);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 hover:border-purple-300"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Value Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Valeur d'ajustement ({bulkPriceMode === 'percent' ? '%' : 'TND'}) :
              </label>
              <div className="relative">
                <input
                  type="number"
                  step={bulkPriceMode === 'percent' ? '1' : '0.100'}
                  value={bulkPriceValue}
                  onChange={(e) => setBulkPriceValue(e.target.value)}
                  placeholder={bulkPriceMode === 'percent' ? '-20' : '-5.000'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-purple-600"
                />
                <span className="absolute right-3.5 top-3 text-xs font-black text-slate-400">
                  {bulkPriceMode === 'percent' ? '%' : 'TND'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Utilisez un nombre négatif (ex: <code>-20</code>) pour réduire les prix, ou positif (ex: <code>10</code>) pour les augmenter.
              </p>
            </div>

            {/* Smart Rounding Checkbox */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkPriceRoundToNine}
                onChange={(e) => setBulkPriceRoundToNine(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">Arrondir au 0.900 le plus proche</span>
                <p className="text-[11px] text-slate-400">Ex: 19.450 DT deviendra 19.900 DT pour un effet psychologique de prix.</p>
              </div>
            </label>

            {/* Live Simulation Preview */}
            <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-2">
              <span className="text-[10px] font-black uppercase text-purple-900 dark:text-purple-300">
                Aperçu de la simulation (sur les 3 premiers articles) :
              </span>
              <div className="space-y-1.5 text-xs">
                {products
                  .filter((p) => selectedIds.has(p.id))
                  .slice(0, 3)
                  .map((p) => {
                    const oldP = parseFloat(String(p.price)) || 0;
                    const val = parseFloat(bulkPriceValue) || 0;
                    let nextP = bulkPriceMode === 'percent' ? oldP * (1 + val / 100) : oldP + val;
                    nextP = Math.max(0.001, nextP);
                    if (bulkPriceRoundToNine) {
                      nextP = Math.max(0.9, Math.floor(nextP) + 0.9);
                    }
                    const isReduction = nextP < oldP;
                    return (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {p.title}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-400 line-through text-[11px]">{formatPrice(String(p.price))}</span>
                          <span className="text-slate-400">→</span>
                          <span className={`font-black ${isReduction ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}>
                            {formatPrice(nextP.toString())}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-purple-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowBulkPriceModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() =>
                  void executeBatchAction({
                    type: 'adjust_price',
                    mode: bulkPriceMode,
                    value: parseFloat(bulkPriceValue) || 0,
                    round_to_nearest_nine: bulkPriceRoundToNine,
                  })
                }
                disabled={bulkActionLoading || !bulkPriceValue}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs shadow-md shadow-purple-600/20 hover:scale-105 disabled:opacity-50 transition-all"
              >
                {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : <Check className="w-4 h-4 inline mr-1" />}
                Appliquer à {selectedIds.size} produit(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. BULK CATEGORY ASSIGNMENT MODAL */}
      {/* ========================================================================= */}
      {showBulkCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-indigo-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Assignation Groupée de Catégorie
                  </h3>
                  <p className="text-xs text-slate-500">
                    Déplacer <strong>{selectedIds.size}</strong> produit(s) dans une nouvelle catégorie
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkCategoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  🌐 Catégorie Marketplace Hub :
                </label>
                <select
                  value={bulkMarketplaceCategoryId}
                  onChange={(e) => setBulkMarketplaceCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold outline-none focus:border-indigo-600"
                >
                  <option value="">-- Conserver la catégorie Hub actuelle --</option>
                  {marketplaceCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  🏪 Catégorie Vitrine Boutique :
                </label>
                <select
                  value={bulkStorefrontCategoryId}
                  onChange={(e) => setBulkStorefrontCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold outline-none focus:border-indigo-600"
                >
                  <option value="">-- Conserver la catégorie Vitrine actuelle --</option>
                  {storefrontCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-indigo-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowBulkCategoryModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() =>
                  void executeBatchAction({
                    type: 'set_category',
                    marketplace_category_id: bulkMarketplaceCategoryId || undefined,
                    storefront_category_id: bulkStorefrontCategoryId || undefined,
                  })
                }
                disabled={bulkActionLoading || (!bulkMarketplaceCategoryId && !bulkStorefrontCategoryId)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
              >
                {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : <Check className="w-4 h-4 inline mr-1" />}
                Assigner aux {selectedIds.size} produit(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. BULK STOCK ADJUSTMENT MODAL */}
      {/* ========================================================================= */}
      {showBulkStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Mise à Jour Groupée du Stock
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ajuster l'inventaire de <strong>{selectedIds.size}</strong> produit(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkStockModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setBulkStockMode('set')}
                className={`py-2 rounded-lg text-xs font-black transition-all ${
                  bulkStockMode === 'set'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Stock Fixe Commun
              </button>
              <button
                type="button"
                onClick={() => setBulkStockMode('delta')}
                className={`py-2 rounded-lg text-xs font-black transition-all ${
                  bulkStockMode === 'delta'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Ajouter / Retirer (+/-)
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {bulkStockMode === 'set' ? 'Quantité en stock à fixer :' : 'Quantité à ajouter ou déduire (+/-) :'}
              </label>
              <input
                type="number"
                value={bulkStockValue}
                onChange={(e) => setBulkStockValue(e.target.value)}
                placeholder={bulkStockMode === 'set' ? '20' : '+10 ou -5'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-blue-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowBulkStockModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() =>
                  void executeBatchAction({
                    type: 'adjust_inventory',
                    mode: bulkStockMode,
                    value: parseInt(bulkStockValue, 10) || 0,
                  })
                }
                disabled={bulkActionLoading || !bulkStockValue}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all"
              >
                {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : <Check className="w-4 h-4 inline mr-1" />}
                Mettre à jour le stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. BULK DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Suppression Groupée Définitive
                </h3>
                <p className="text-xs text-red-600 dark:text-red-400 font-bold">
                  Attention : Cette opération est irréversible !
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement <strong>{selectedIds.size}</strong> produit(s) ? Leurs variantes, images et historiques associés seront également effacés.
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void executeBatchAction({ type: 'delete' })}
                disabled={bulkActionLoading}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Confirmer la suppression ({selectedIds.size})</span>
              </button>
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
