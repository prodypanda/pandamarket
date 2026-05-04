export type ThemeId =
  | 'minimal' | 'classic' | 'modern' | 'boutique' | 'artisan' | 'techhub' | 'flavor'
  | 'elegance' | 'neon' | 'sahara' | 'medina' | 'coastal' | 'urban' | 'garden'
  | 'studio' | 'luxe' | 'fresh' | 'craft' | 'digital' | 'kids';

/**
 * Available font families mapped to CSS variables loaded in layout.tsx.
 * Each theme can specify a body font and a heading font independently.
 */
export type ThemeFontFamily =
  | 'font-[family-name:var(--font-inter)]'
  | 'font-[family-name:var(--font-playfair)]'
  | 'font-[family-name:var(--font-poppins)]'
  | 'font-[family-name:var(--font-montserrat)]'
  | 'font-[family-name:var(--font-lora)]'
  | 'font-[family-name:var(--font-space-grotesk)]'
  | 'font-sans'
  | 'font-serif';

/** Layout variation controls how the storefront page structure is rendered. */
export type LayoutVariation = 'default' | 'sidebar' | 'full-width' | 'magazine';

/** Grid density controls the spacing and number of columns in product grids. */
export type GridDensity = 'compact' | 'comfortable' | 'spacious';

/** Hero style controls the hero section appearance. */
export type HeroStyle = 'banner' | 'split' | 'minimal' | 'video' | 'none';

/**
 * Color presets allow vendors to pick from curated palettes per theme.
 * Each preset overrides the theme's default hex colors.
 */
export interface ColorPreset {
  id: string;
  name: string;
  primary: string;     // Hex color for primary CTA / accent
  secondary: string;   // Hex color for secondary backgrounds
  accent: string;      // Hex color for highlights / links
  background: string;  // Hex color for page background
  text: string;        // Hex color for body text
  headerBg: string;    // Hex color for header background
  footerBg: string;    // Hex color for footer background
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    headingFont?: string;
    headingStyle: string;
  };
  layout: {
    headerStyle: 'center' | 'left' | 'split';
    productGrid: 'tight' | 'relaxed' | 'masonry';
    borderRadius: string;
  };
  /** Available layout variations for this theme. First is the default. */
  layoutVariations: LayoutVariation[];
  /** Available grid density options. First is the default. */
  gridDensities: GridDensity[];
  /** Available hero styles. First is the default. */
  heroStyles: HeroStyle[];
  /** Curated color presets for this theme. First is the default palette. */
  colorPresets: ColorPreset[];
}

/**
 * Vendor-level customization stored in `store.settings.themeCustomization`.
 * These override the theme defaults at render time.
 */
export interface ThemeCustomization {
  layoutVariation?: LayoutVariation;
  gridDensity?: GridDensity;
  heroStyle?: HeroStyle;
  colorPresetId?: string;
  /** Custom colors override even the preset when provided. */
  customColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    headerBg?: string;
    footerBg?: string;
  };
}

/**
 * Resolved colors for a theme, merging defaults -> preset -> custom overrides.
 * All values are hex strings (e.g. '#16C784').
 */
export interface ResolvedColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  headerBg: string;
  footerBg: string;
}

/**
 * Resolve the final colors for a theme given vendor customization.
 * Priority: customColors > colorPreset > theme defaults.
 */
export function resolveThemeColors(
  theme: ThemeConfig,
  customization?: ThemeCustomization,
): ResolvedColors {
  // Extract default hex colors from the first preset (or fallback)
  const defaultPreset = theme.colorPresets[0];
  const base: ResolvedColors = defaultPreset
    ? { ...defaultPreset }
    : {
        primary: '#16C784',
        secondary: '#F9FAFB',
        accent: '#16C784',
        background: '#FFFFFF',
        text: '#111827',
        headerBg: '#FFFFFF',
        footerBg: '#1A1A2E',
      };

  // Apply preset if selected
  if (customization?.colorPresetId) {
    const preset = theme.colorPresets.find((p) => p.id === customization.colorPresetId);
    if (preset) {
      Object.assign(base, {
        primary: preset.primary,
        secondary: preset.secondary,
        accent: preset.accent,
        background: preset.background,
        text: preset.text,
        headerBg: preset.headerBg,
        footerBg: preset.footerBg,
      });
    }
  }

  // Apply custom color overrides
  if (customization?.customColors) {
    const cc = customization.customColors;
    if (cc.primary) base.primary = cc.primary;
    if (cc.secondary) base.secondary = cc.secondary;
    if (cc.accent) base.accent = cc.accent;
    if (cc.background) base.background = cc.background;
    if (cc.text) base.text = cc.text;
    if (cc.headerBg) base.headerBg = cc.headerBg;
    if (cc.footerBg) base.footerBg = cc.footerBg;
  }

  return base;
}

/**
 * Get the product grid Tailwind classes based on grid density.
 */
export function getGridClasses(density: GridDensity): string {
  switch (density) {
    case 'compact':
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';
    case 'comfortable':
      return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5';
    case 'spacious':
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8';
    default:
      return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5';
  }
}

/**
 * Get the container max-width class based on layout variation.
 */
export function getLayoutClasses(variation: LayoutVariation): {
  container: string;
  hasSidebar: boolean;
  sidebarWidth: string;
  mainWidth: string;
} {
  switch (variation) {
    case 'sidebar':
      return {
        container: 'max-w-[1400px] mx-auto px-4 sm:px-6',
        hasSidebar: true,
        sidebarWidth: 'w-64 flex-shrink-0',
        mainWidth: 'flex-1 min-w-0',
      };
    case 'full-width':
      return {
        container: 'w-full px-4 sm:px-6',
        hasSidebar: false,
        sidebarWidth: '',
        mainWidth: 'w-full',
      };
    case 'magazine':
      return {
        container: 'max-w-6xl mx-auto px-4 sm:px-6',
        hasSidebar: false,
        sidebarWidth: '',
        mainWidth: 'w-full',
      };
    default:
      return {
        container: 'max-w-7xl mx-auto px-4 sm:px-8',
        hasSidebar: false,
        sidebarWidth: '',
        mainWidth: 'w-full',
      };
  }
}

// ─── Layout / Grid / Hero labels for the settings UI ────────

export const LAYOUT_VARIATION_LABELS: Record<LayoutVariation, { label: string; description: string; icon: string }> = {
  default: { label: 'Standard', description: 'Mise en page classique centrée', icon: '📐' },
  sidebar: { label: 'Avec barre latérale', description: 'Filtres et catégories sur le côté', icon: '📊' },
  'full-width': { label: 'Pleine largeur', description: 'Contenu étendu sur toute la largeur', icon: '🖥️' },
  magazine: { label: 'Magazine', description: 'Style éditorial avec colonnes étroites', icon: '📰' },
};

export const GRID_DENSITY_LABELS: Record<GridDensity, { label: string; description: string; cols: string }> = {
  compact: { label: 'Compact', description: 'Plus de produits visibles, petites cartes', cols: '5-6 colonnes' },
  comfortable: { label: 'Confortable', description: 'Équilibre entre densité et lisibilité', cols: '3-4 colonnes' },
  spacious: { label: 'Spacieux', description: 'Grandes cartes, focus sur les images', cols: '2-3 colonnes' },
};

export const HERO_STYLE_LABELS: Record<HeroStyle, { label: string; description: string; icon: string }> = {
  banner: { label: 'Bannière', description: 'Grande image avec texte superposé', icon: '🎯' },
  split: { label: 'Divisé', description: 'Image à gauche, texte à droite', icon: '↔️' },
  minimal: { label: 'Minimal', description: 'Texte simple sans image de fond', icon: '✨' },
  video: { label: 'Vidéo', description: 'Vidéo de fond en boucle', icon: '🎬' },
  none: { label: 'Aucun', description: 'Pas de section hero', icon: '⊘' },
};

export const themes: Record<ThemeId, ThemeConfig> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    colors: {
      primary: 'bg-black text-white',
      secondary: 'bg-gray-100 text-gray-900',
      accent: 'text-black',
      background: 'bg-white',
      text: 'text-gray-900',
    },
    typography: {
      fontFamily: 'font-sans',
      headingStyle: 'font-bold tracking-tight',
    },
    layout: {
      headerStyle: 'left',
      productGrid: 'relaxed',
      borderRadius: 'rounded-none',
    },
    layoutVariations: ['default', 'full-width', 'magazine'],
    gridDensities: ['comfortable', 'compact', 'spacious'],
    heroStyles: ['minimal', 'banner', 'none'],
    colorPresets: [
      { id: 'minimal-default', name: 'Noir & Blanc', primary: '#000000', secondary: '#F3F4F6', accent: '#000000', background: '#FFFFFF', text: '#111827', headerBg: '#FFFFFF', footerBg: '#000000' },
      { id: 'minimal-warm', name: 'Warm Ivory', primary: '#2C2C2C', secondary: '#FAF7F2', accent: '#8B7355', background: '#FFFDF8', text: '#2C2C2C', headerBg: '#FFFDF8', footerBg: '#2C2C2C' },
      { id: 'minimal-cool', name: 'Cool Slate', primary: '#334155', secondary: '#F1F5F9', accent: '#475569', background: '#FFFFFF', text: '#1E293B', headerBg: '#FFFFFF', footerBg: '#0F172A' },
      { id: 'minimal-sage', name: 'Sage', primary: '#4A5D4A', secondary: '#F5F7F2', accent: '#6B8E6B', background: '#FAFBF8', text: '#2D3B2D', headerBg: '#FAFBF8', footerBg: '#2D3B2D' },
    ],
  },
  classic: {
    id: 'classic',
    name: 'Classic',
    colors: {
      primary: 'bg-blue-600 text-white',
      secondary: 'bg-blue-50 text-blue-900',
      accent: 'text-blue-600',
      background: 'bg-gray-50',
      text: 'text-gray-800',
    },
    typography: {
      fontFamily: 'font-[family-name:var(--font-lora)]',
      headingFont: 'font-[family-name:var(--font-playfair)]',
      headingStyle: 'font-semibold',
    },
    layout: {
      headerStyle: 'center',
      productGrid: 'tight',
      borderRadius: 'rounded-md',
    },
    layoutVariations: ['default', 'sidebar', 'magazine'],
    gridDensities: ['comfortable', 'compact', 'spacious'],
    heroStyles: ['banner', 'split', 'minimal'],
    colorPresets: [
      { id: 'classic-default', name: 'Bleu Royal', primary: '#2563EB', secondary: '#EFF6FF', accent: '#2563EB', background: '#F9FAFB', text: '#1F2937', headerBg: '#FFFFFF', footerBg: '#1E3A5F' },
      { id: 'classic-navy', name: 'Navy & Gold', primary: '#1E3A5F', secondary: '#FDF8F0', accent: '#C9A96E', background: '#FFFFFF', text: '#1E3A5F', headerBg: '#FFFFFF', footerBg: '#0F1D2F' },
      { id: 'classic-burgundy', name: 'Bordeaux', primary: '#722F37', secondary: '#FDF2F4', accent: '#722F37', background: '#FFFBFC', text: '#2D1216', headerBg: '#FFFFFF', footerBg: '#3D1A1F' },
      { id: 'classic-forest', name: 'Forêt', primary: '#1B4332', secondary: '#F0FDF4', accent: '#2D6A4F', background: '#FAFDFB', text: '#1B4332', headerBg: '#FFFFFF', footerBg: '#0D2818' },
    ],
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    colors: {
      primary: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white',
      secondary: 'bg-white/10 backdrop-blur-md text-white',
      accent: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600',
      background: 'bg-slate-900',
      text: 'text-slate-100',
    },
    typography: {
      fontFamily: 'font-sans',
      headingStyle: 'font-extrabold tracking-tighter',
    },
    layout: {
      headerStyle: 'split',
      productGrid: 'masonry',
      borderRadius: 'rounded-2xl',
    },
    layoutVariations: ['default', 'full-width', 'magazine'],
    gridDensities: ['comfortable', 'compact', 'spacious'],
    heroStyles: ['banner', 'video', 'split', 'minimal'],
    colorPresets: [
      { id: 'modern-default', name: 'Violet Indigo', primary: '#8B5CF6', secondary: '#1E1B4B', accent: '#A78BFA', background: '#0F172A', text: '#E2E8F0', headerBg: '#0F172A', footerBg: '#020617' },
      { id: 'modern-emerald', name: 'Émeraude', primary: '#10B981', secondary: '#064E3B', accent: '#34D399', background: '#0F172A', text: '#E2E8F0', headerBg: '#0F172A', footerBg: '#022C22' },
      { id: 'modern-rose', name: 'Rose Néon', primary: '#F43F5E', secondary: '#4C0519', accent: '#FB7185', background: '#0F0A15', text: '#F1F5F9', headerBg: '#0F0A15', footerBg: '#1C0A12' },
      { id: 'modern-amber', name: 'Ambre', primary: '#F59E0B', secondary: '#451A03', accent: '#FBBF24', background: '#0C0A09', text: '#F5F5F4', headerBg: '#0C0A09', footerBg: '#1C1917' },
      { id: 'modern-cyan', name: 'Cyan', primary: '#06B6D4', secondary: '#164E63', accent: '#22D3EE', background: '#0F172A', text: '#E2E8F0', headerBg: '#0F172A', footerBg: '#0C4A6E' },
    ],
  },
  boutique: {
    id: 'boutique',
    name: 'Boutique',
    colors: {
      primary: 'bg-[#1C1C1C] text-[#F5F0EB]',
      secondary: 'bg-[#F5F0EB] text-[#1C1C1C]',
      accent: 'text-[#C9A96E]',
      background: 'bg-[#F5F0EB]',
      text: 'text-[#1C1C1C]',
    },
    typography: {
      fontFamily: 'font-[family-name:var(--font-montserrat)]',
      headingFont: 'font-[family-name:var(--font-playfair)]',
      headingStyle: 'font-light tracking-[0.15em] uppercase',
    },
    layout: {
      headerStyle: 'center',
      productGrid: 'relaxed',
      borderRadius: 'rounded-none',
    },
    layoutVariations: ['default', 'magazine', 'full-width'],
    gridDensities: ['spacious', 'comfortable'],
    heroStyles: ['banner', 'split', 'minimal'],
    colorPresets: [
      { id: 'boutique-default', name: 'Ivoire & Or', primary: '#1C1C1C', secondary: '#F5F0EB', accent: '#C9A96E', background: '#F5F0EB', text: '#1C1C1C', headerBg: '#F5F0EB', footerBg: '#1C1C1C' },
      { id: 'boutique-blush', name: 'Blush', primary: '#2C2C2C', secondary: '#FFF0F0', accent: '#D4A0A0', background: '#FFF8F8', text: '#2C2C2C', headerBg: '#FFF8F8', footerBg: '#2C2C2C' },
      { id: 'boutique-midnight', name: 'Minuit', primary: '#F5F0EB', secondary: '#1A1A2E', accent: '#D4AF37', background: '#0F0F1A', text: '#F5F0EB', headerBg: '#0F0F1A', footerBg: '#050510' },
      { id: 'boutique-olive', name: 'Olive Luxe', primary: '#2C2C2C', secondary: '#F5F2ED', accent: '#8B8B3A', background: '#FAFAF5', text: '#2C2C2C', headerBg: '#FAFAF5', footerBg: '#2C2C2C' },
    ],
  },
  artisan: {
    id: 'artisan',
    name: 'Artisan',
    colors: {
      primary: 'bg-[#5C4033] text-white',
      secondary: 'bg-[#FFF8F0] text-[#3E2723]',
      accent: 'text-[#5C4033]',
      background: 'bg-[#FFF8F0]',
      text: 'text-[#3E2723]',
    },
    typography: {
      fontFamily: 'font-[family-name:var(--font-lora)]',
      headingFont: 'font-[family-name:var(--font-playfair)]',
      headingStyle: 'font-semibold tracking-normal',
    },
    layout: {
      headerStyle: 'left',
      productGrid: 'masonry',
      borderRadius: 'rounded-xl',
    },
    layoutVariations: ['default', 'sidebar', 'magazine'],
    gridDensities: ['comfortable', 'spacious'],
    heroStyles: ['banner', 'split', 'minimal'],
    colorPresets: [
      { id: 'artisan-default', name: 'Terre Cuite', primary: '#5C4033', secondary: '#FFF8F0', accent: '#5C4033', background: '#FFF8F0', text: '#3E2723', headerBg: '#FFF8F0', footerBg: '#3E2723' },
      { id: 'artisan-clay', name: 'Argile', primary: '#8B6F47', secondary: '#FAF5EF', accent: '#A0845C', background: '#FFFCF7', text: '#3D2B1F', headerBg: '#FFFCF7', footerBg: '#3D2B1F' },
      { id: 'artisan-moss', name: 'Mousse', primary: '#4A5D3A', secondary: '#F5F7F0', accent: '#6B8E4A', background: '#FAFBF5', text: '#2D3B1F', headerBg: '#FAFBF5', footerBg: '#2D3B1F' },
    ],
  },
  techhub: {
    id: 'techhub',
    name: 'TechHub',
    colors: {
      primary: 'bg-[#00D4FF] text-[#0A0A0A]',
      secondary: 'bg-[#111111] text-[#E0E0E0]',
      accent: 'text-[#00D4FF]',
      background: 'bg-[#0A0A0A]',
      text: 'text-[#E0E0E0]',
    },
    typography: {
      fontFamily: 'font-[family-name:var(--font-space-grotesk)]',
      headingStyle: 'font-bold tracking-tight',
    },
    layout: {
      headerStyle: 'split',
      productGrid: 'tight',
      borderRadius: 'rounded-lg',
    },
    layoutVariations: ['default', 'full-width', 'sidebar'],
    gridDensities: ['compact', 'comfortable'],
    heroStyles: ['banner', 'video', 'split'],
    colorPresets: [
      { id: 'techhub-default', name: 'Cyan Néon', primary: '#00D4FF', secondary: '#111111', accent: '#00D4FF', background: '#0A0A0A', text: '#E0E0E0', headerBg: '#0A0A0A', footerBg: '#050505' },
      { id: 'techhub-green', name: 'Matrix', primary: '#00FF88', secondary: '#0A1A0A', accent: '#00FF88', background: '#050A05', text: '#C0E0C0', headerBg: '#050A05', footerBg: '#020502' },
      { id: 'techhub-purple', name: 'Ultraviolet', primary: '#BF5AF2', secondary: '#1A0A2E', accent: '#BF5AF2', background: '#0A0515', text: '#E0D0F0', headerBg: '#0A0515', footerBg: '#050210' },
      { id: 'techhub-orange', name: 'Magma', primary: '#FF6B35', secondary: '#1A0A05', accent: '#FF8C5A', background: '#0A0505', text: '#F0E0D0', headerBg: '#0A0505', footerBg: '#050202' },
    ],
  },
  flavor: {
    id: 'flavor',
    name: 'Flavor',
    colors: {
      primary: 'bg-[#D4451A] text-white',
      secondary: 'bg-[#FFF9F5] text-[#2D1B0E]',
      accent: 'text-[#D4451A]',
      background: 'bg-[#FFFCF8]',
      text: 'text-[#2D1B0E]',
    },
    typography: {
      fontFamily: 'font-[family-name:var(--font-poppins)]',
      headingStyle: 'font-extrabold tracking-tight',
    },
    layout: {
      headerStyle: 'center',
      productGrid: 'tight',
      borderRadius: 'rounded-2xl',
    },
    layoutVariations: ['default', 'full-width', 'sidebar'],
    gridDensities: ['comfortable', 'compact', 'spacious'],
    heroStyles: ['banner', 'split', 'minimal'],
    colorPresets: [
      { id: 'flavor-default', name: 'Terracotta', primary: '#D4451A', secondary: '#FFF9F5', accent: '#D4451A', background: '#FFFCF8', text: '#2D1B0E', headerBg: '#FFFCF8', footerBg: '#2D1B0E' },
      { id: 'flavor-olive', name: 'Olive & Tomate', primary: '#C0392B', secondary: '#F5F5DC', accent: '#6B8E23', background: '#FFFFF0', text: '#2D2D0E', headerBg: '#FFFFF0', footerBg: '#2D2D0E' },
      { id: 'flavor-spice', name: 'Épices', primary: '#B8860B', secondary: '#FFF8E7', accent: '#CD853F', background: '#FFFDF5', text: '#3D2B1F', headerBg: '#FFFDF5', footerBg: '#3D2B1F' },
    ],
  },
  elegance: {
    id: 'elegance',
    name: 'Elegance',
    colors: {
      primary: 'bg-[#2C2C2C] text-white',
      secondary: 'bg-[#FAFAF8] text-[#1A1A1A]',
      accent: 'text-[#2C2C2C]',
      background: 'bg-[#FAFAF8]',
      text: 'text-[#1A1A1A]',
    },
    typography: { fontFamily: 'font-[family-name:var(--font-montserrat)]', headingFont: 'font-[family-name:var(--font-playfair)]', headingStyle: 'font-light tracking-wide' },
    layout: { headerStyle: 'center', productGrid: 'relaxed', borderRadius: 'rounded-none' },
    layoutVariations: ['default', 'magazine', 'full-width'],
    gridDensities: ['spacious', 'comfortable'],
    heroStyles: ['banner', 'split', 'minimal', 'none'],
    colorPresets: [
      { id: 'elegance-default', name: 'Charcoal', primary: '#2C2C2C', secondary: '#FAFAF8', accent: '#2C2C2C', background: '#FAFAF8', text: '#1A1A1A', headerBg: '#FAFAF8', footerBg: '#1A1A1A' },
      { id: 'elegance-pearl', name: 'Perle', primary: '#4A4A4A', secondary: '#F8F6F3', accent: '#B8A88A', background: '#FDFCFA', text: '#2C2C2C', headerBg: '#FDFCFA', footerBg: '#2C2C2C' },
      { id: 'elegance-noir', name: 'Noir Absolu', primary: '#FFFFFF', secondary: '#1A1A1A', accent: '#C0C0C0', background: '#0A0A0A', text: '#F0F0F0', headerBg: '#0A0A0A', footerBg: '#000000' },
    ],
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    colors: {
      primary: 'bg-[#39FF14] text-[#050505]',
      secondary: 'bg-[#0A0A0A] text-[#E8E8E8]',
      accent: 'text-[#39FF14]',
      background: 'bg-[#050505]',
      text: 'text-[#E8E8E8]',
    },
    typography: { fontFamily: 'font-[family-name:var(--font-space-grotesk)]', headingStyle: 'font-black uppercase tracking-tighter' },
    layout: { headerStyle: 'split', productGrid: 'tight', borderRadius: 'rounded-none' },
    layoutVariations: ['default', 'full-width'],
    gridDensities: ['compact', 'comfortable'],
    heroStyles: ['banner', 'video', 'minimal'],
    colorPresets: [
      { id: 'neon-default', name: 'Vert Néon', primary: '#39FF14', secondary: '#0A0A0A', accent: '#39FF14', background: '#050505', text: '#E8E8E8', headerBg: '#050505', footerBg: '#020202' },
      { id: 'neon-pink', name: 'Rose Néon', primary: '#FF1493', secondary: '#0A050A', accent: '#FF69B4', background: '#050205', text: '#F0E0F0', headerBg: '#050205', footerBg: '#020102' },
      { id: 'neon-blue', name: 'Bleu Néon', primary: '#00BFFF', secondary: '#050A0F', accent: '#00BFFF', background: '#020508', text: '#E0F0FF', headerBg: '#020508', footerBg: '#010305' },
      { id: 'neon-yellow', name: 'Jaune Néon', primary: '#FFD700', secondary: '#0A0A05', accent: '#FFD700', background: '#050502', text: '#F0F0E0', headerBg: '#050502', footerBg: '#020201' },
    ],
  },
  sahara: {
    id: 'sahara',
    name: 'Sahara',
    colors: {
      primary: 'bg-[#C4713B] text-white',
      secondary: 'bg-[#FDF6EE] text-[#3D2B1F]',
      accent: 'text-[#C4713B]',
      background: 'bg-[#FDF6EE]',
      text: 'text-[#3D2B1F]',
    },
    typography: { fontFamily: 'font-sans', headingStyle: 'font-bold tracking-wide' },
    layout: { headerStyle: 'left', productGrid: 'tight', borderRadius: 'rounded-xl' },
    layoutVariations: ['default', 'sidebar', 'magazine'],
    gridDensities: ['comfortable', 'compact', 'spacious'],
    heroStyles: ['banner', 'split', 'minimal'],
    colorPresets: [
      { id: 'sahara-default', name: 'Sable Doré', primary: '#C4713B', secondary: '#FDF6EE', accent: '#C4713B', background: '#FDF6EE', text: '#3D2B1F', headerBg: '#FDF6EE', footerBg: '#3D2B1F' },
      { id: 'sahara-sunset', name: 'Coucher de Soleil', primary: '#E07B39', secondary: '#FFF5EB', accent: '#D4451A', background: '#FFFAF5', text: '#3D2B1F', headerBg: '#FFFAF5', footerBg: '#2D1B0E' },
      { id: 'sahara-oasis', name: 'Oasis', primary: '#2E8B57', secondary: '#F5FAF0', accent: '#C4713B', background: '#FAFDF5', text: '#2D3B1F', headerBg: '#FAFDF5', footerBg: '#1A2E1A' },
    ],
  },
  medina: {
    id: 'medina',
    name: 'Medina',
    colors: {
      primary: 'bg-[#1A4A4A] text-white',
      secondary: 'bg-[#FBF7F0] text-[#1C1C1C]',
      accent: 'text-[#D4A853]',
      background: 'bg-[#FBF7F0]',
      text: 'text-[#1C1C1C]',
    },
    typography: { fontFamily: 'font-[family-name:var(--font-lora)]', headingFont: 'font-[family-name:var(--font-playfair)]', headingStyle: 'font-bold tracking-wide' },
    layout: { headerStyle: 'center', productGrid: 'tight', borderRadius: 'rounded-xl' },
    layoutVariations: ['default', 'sidebar', 'magazine'],
    gridDensities: ['comfortable', 'compact', 'spacious'],
    heroStyles: ['banner', 'split', 'minimal'],
    colorPresets: [
      { id: 'medina-default', name: 'Teal & Or', primary: '#1A4A4A', secondary: '#FBF7F0', accent: '#D4A853', background: '#FBF7F0', text: '#1C1C1C', headerBg: '#FBF7F0', footerBg: '#1A4A4A' },
      { id: 'medina-royal', name: 'Bleu Royal', primary: '#1A3A6A', secondary: '#F5F0E5', accent: '#C9A96E', background: '#FAF8F2', text: '#1A1A2E', headerBg: '#FAF8F2', footerBg: '#0F1D35' },
      { id: 'medina-terracotta', name: 'Terre & Zellige', primary: '#8B4513', secondary: '#FBF5ED', accent: '#1A6A6A', background: '#FDF8F0', text: '#2D1B0E', headerBg: '#FDF8F0', footerBg: '#3D2B1F' },
    ],
  },
  coastal: {
    id: 'coastal',
    name: 'Coastal',
    colors: {
      primary: 'bg-[#2B7A9B] text-white',
      secondary: 'bg-[#F7FBFD] text-[#1E3A4F]',
      accent: 'text-[#2B7A9B]',
      background: 'bg-[#F7FBFD]',
      text: 'text-[#1E3A4F]',
    },
    typography: { fontFamily: 'font-[family-name:var(--font-poppins)]', headingStyle: 'font-semibold' },
    layout: { headerStyle: 'left', productGrid: 'relaxed', borderRadius: 'rounded-2xl' },
    layoutVariations: ['default', 'full-width', 'magazine'],
    gridDensities: ['comfortable', 'spacious'],
    heroStyles: ['banner', 'split', 'video', 'minimal'],
    colorPresets: [
      { id: 'coastal-default', name: 'Océan', primary: '#2B7A9B', secondary: '#F7FBFD', accent: '#2B7A9B', background: '#F7FBFD', text: '#1E3A4F', headerBg: '#FFFFFF', footerBg: '#1E3A4F' },
      { id: 'coastal-sunset', name: 'Coucher Marin', primary: '#E07B39', secondary: '#FFF8F0', accent: '#2B7A9B', background: '#FFFAF5', text: '#1E3A4F', headerBg: '#FFFAF5', footerBg: '#1E3A4F' },
      { id: 'coastal-lagoon', name: 'Lagon', primary: '#0EA5E9', secondary: '#F0F9FF', accent: '#06B6D4', background: '#F8FDFF', text: '#0C4A6E', headerBg: '#F8FDFF', footerBg: '#0C4A6E' },
    ],
  },
  urban: {
    id: 'urban',
    name: 'Urban',
    colors: {
      primary: 'bg-[#FF3B30] text-white',
      secondary: 'bg-black text-white',
      accent: 'text-[#FF3B30]',
      background: 'bg-white',
      text: 'text-[#0A0A0A]',
    },
    typography: { fontFamily: 'font-[family-name:var(--font-montserrat)]', headingStyle: 'font-black uppercase tracking-tighter' },
    layout: { headerStyle: 'left', productGrid: 'tight', borderRadius: 'rounded-none' },
    layoutVariations: ['default', 'full-width', 'sidebar'],
    gridDensities: ['compact', 'comfortable'],
    heroStyles: ['banner', 'video', 'split'],
    colorPresets: [
      { id: 'urban-default', name: 'Rouge Vif', primary: '#FF3B30', secondary: '#000000', accent: '#FF3B30', background: '#FFFFFF', text: '#0A0A0A', headerBg: '#FFFFFF', footerBg: '#0A0A0A' },
      { id: 'urban-mono', name: 'Monochrome', primary: '#000000', secondary: '#1A1A1A', accent: '#FFFFFF', background: '#FFFFFF', text: '#0A0A0A', headerBg: '#FFFFFF', footerBg: '#000000' },
      { id: 'urban-electric', name: 'Électrique', primary: '#FFD600', secondary: '#0A0A0A', accent: '#FFD600', background: '#FFFFFF', text: '#0A0A0A', headerBg: '#0A0A0A', footerBg: '#0A0A0A' },
    ],
  },
  garden: {
    id: 'garden',
    name: 'Garden',
    colors: {
      primary: 'bg-[#3A7D44] text-white',
      secondary: 'bg-[#F5F9F0] text-[#2D3B2D]',
      accent: 'text-[#3A7D44]',
      background: 'bg-[#F5F9F0]',
      text: 'text-[#2D3B2D]',
    },
    typography: { fontFamily: 'font-sans', headingStyle: 'font-bold' },
    layout: { headerStyle: 'left', productGrid: 'relaxed', borderRadius: 'rounded-2xl' },
    layoutVariations: ['default', 'sidebar', 'magazine'],
    gridDensities: ['comfortable', 'spacious'],
    heroStyles: ['banner', 'split', 'minimal'],
    colorPresets: [
      { id: 'garden-default', name: 'Vert Nature', primary: '#3A7D44', secondary: '#F5F9F0', accent: '#3A7D44', background: '#F5F9F0', text: '#2D3B2D', headerBg: '#F5F9F0', footerBg: '#2D3B2D' },
      { id: 'garden-bloom', name: 'Floraison', primary: '#D4567A', secondary: '#FFF5F8', accent: '#3A7D44', background: '#FFFBFC', text: '#2D2D3B', headerBg: '#FFFBFC', footerBg: '#2D3B2D' },
      { id: 'garden-earth', name: 'Terre', primary: '#6B4226', secondary: '#F5F0E5', accent: '#3A7D44', background: '#FAF5ED', text: '#3B2F2F', headerBg: '#FAF5ED', footerBg: '#2D1B0E' },
    ],
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    colors: {
      primary: 'bg-[#8B5CF6] text-white',
      secondary: 'bg-[#FAFAFA] text-[#1A1A1A]',
      accent: 'text-[#8B5CF6]',
      background: 'bg-[#FAFAFA]',
      text: 'text-[#1A1A1A]',
    },
    typography: { fontFamily: 'font-sans', headingStyle: 'font-medium tracking-wide' },
    layout: { headerStyle: 'left', productGrid: 'masonry', borderRadius: 'rounded-lg' },
    layoutVariations: ['default', 'full-width', 'magazine'],
    gridDensities: ['comfortable', 'spacious'],
    heroStyles: ['minimal', 'banner', 'none'],
    colorPresets: [
      { id: 'studio-default', name: 'Violet', primary: '#8B5CF6', secondary: '#FAFAFA', accent: '#8B5CF6', background: '#FAFAFA', text: '#1A1A1A', headerBg: '#FAFAFA', footerBg: '#1A1A1A' },
      { id: 'studio-mono', name: 'Monochrome', primary: '#1A1A1A', secondary: '#F5F5F5', accent: '#6B7280', background: '#FFFFFF', text: '#1A1A1A', headerBg: '#FFFFFF', footerBg: '#0A0A0A' },
      { id: 'studio-warm', name: 'Warm Studio', primary: '#D97706', secondary: '#FFFBEB', accent: '#B45309', background: '#FFFDF5', text: '#1C1917', headerBg: '#FFFDF5', footerBg: '#1C1917' },
    ],
  },
  luxe: {
    id: 'luxe',
    name: 'Luxe',
    colors: {
      primary: 'bg-[#D4AF37] text-[#0D0D0D]',
      secondary: 'bg-[#1A1A1A] text-[#F5F5F0]',
      accent: 'text-[#D4AF37]',
      background: 'bg-[#0D0D0D]',
      text: 'text-[#F5F5F0]',
    },
    typography: { fontFamily: 'font-[family-name:var(--font-montserrat)]', headingFont: 'font-[family-name:var(--font-playfair)]', headingStyle: 'font-light tracking-[0.2em]' },
    layout: { headerStyle: 'center', productGrid: 'relaxed', borderRadius: 'rounded-none' },
    layoutVariations: ['default', 'magazine', 'full-width'],
    gridDensities: ['spacious', 'comfortable'],
    heroStyles: ['banner', 'video', 'split'],
    colorPresets: [
      { id: 'luxe-default', name: 'Or & Noir', primary: '#D4AF37', secondary: '#1A1A1A', accent: '#D4AF37', background: '#0D0D0D', text: '#F5F5F0', headerBg: '#0D0D0D', footerBg: '#050505' },
      { id: 'luxe-platinum', name: 'Platine', primary: '#C0C0C0', secondary: '#1A1A1A', accent: '#E8E8E8', background: '#0A0A0A', text: '#F0F0F0', headerBg: '#0A0A0A', footerBg: '#050505' },
      { id: 'luxe-rose', name: 'Or Rose', primary: '#B76E79', secondary: '#1A1A1A', accent: '#E8A0A0', background: '#0D0A0A', text: '#F5F0F0', headerBg: '#0D0A0A', footerBg: '#050303' },
    ],
  },
  fresh: {
    id: 'fresh',
    name: 'Fresh',
    colors: {
      primary: 'bg-[#22C55E] text-white',
      secondary: 'bg-white text-[#1A2E1A]',
      accent: 'text-[#22C55E]',
      background: 'bg-white',
      text: 'text-[#1A2E1A]',
    },
    typography: { fontFamily: 'font-sans', headingStyle: 'font-bold' },
    layout: { headerStyle: 'left', productGrid: 'tight', borderRadius: 'rounded-xl' },
    layoutVariations: ['default', 'sidebar', 'full-width'],
    gridDensities: ['compact', 'comfortable', 'spacious'],
    heroStyles: ['banner', 'split', 'minimal'],
    colorPresets: [
      { id: 'fresh-default', name: 'Vert Frais', primary: '#22C55E', secondary: '#FFFFFF', accent: '#22C55E', background: '#FFFFFF', text: '#1A2E1A', headerBg: '#FFFFFF', footerBg: '#1A2E1A' },
      { id: 'fresh-citrus', name: 'Agrumes', primary: '#F59E0B', secondary: '#FFFBEB', accent: '#22C55E', background: '#FFFFF5', text: '#1A2E1A', headerBg: '#FFFFF5', footerBg: '#1A2E1A' },
      { id: 'fresh-berry', name: 'Baies', primary: '#DC2626', secondary: '#FFF5F5', accent: '#22C55E', background: '#FFFAFA', text: '#1A1A2E', headerBg: '#FFFAFA', footerBg: '#1A1A2E' },
    ],
  },
  craft: {
    id: 'craft',
    name: 'Craft',
    colors: {
      primary: 'bg-[#A0522D] text-white',
      secondary: 'bg-[#FAF5EF] text-[#3B2F2F]',
      accent: 'text-[#A0522D]',
      background: 'bg-[#FAF5EF]',
      text: 'text-[#3B2F2F]',
    },
    typography: { fontFamily: 'font-[family-name:var(--font-lora)]', headingFont: 'font-[family-name:var(--font-playfair)]', headingStyle: 'font-bold' },
    layout: { headerStyle: 'left', productGrid: 'relaxed', borderRadius: 'rounded-xl' },
    layoutVariations: ['default', 'sidebar', 'magazine'],
    gridDensities: ['comfortable', 'spacious'],
    heroStyles: ['banner', 'split', 'minimal'],
    colorPresets: [
      { id: 'craft-default', name: 'Bois & Cuir', primary: '#A0522D', secondary: '#FAF5EF', accent: '#A0522D', background: '#FAF5EF', text: '#3B2F2F', headerBg: '#FAF5EF', footerBg: '#3B2F2F' },
      { id: 'craft-indigo', name: 'Indigo Artisan', primary: '#3F51B5', secondary: '#F5F5FA', accent: '#A0522D', background: '#FAFAFF', text: '#1A1A3B', headerBg: '#FAFAFF', footerBg: '#1A1A3B' },
      { id: 'craft-natural', name: 'Naturel', primary: '#6B8E23', secondary: '#F5F5E5', accent: '#A0522D', background: '#FAFAF0', text: '#2D3B1F', headerBg: '#FAFAF0', footerBg: '#2D3B1F' },
    ],
  },
  digital: {
    id: 'digital',
    name: 'Digital',
    colors: {
      primary: 'bg-[#6366F1] text-white',
      secondary: 'bg-[#1A1A2E] text-[#E2E8F0]',
      accent: 'text-[#6366F1]',
      background: 'bg-[#0F0F1A]',
      text: 'text-[#E2E8F0]',
    },
    typography: { fontFamily: 'font-[family-name:var(--font-space-grotesk)]', headingStyle: 'font-bold tracking-tight' },
    layout: { headerStyle: 'split', productGrid: 'tight', borderRadius: 'rounded-xl' },
    layoutVariations: ['default', 'full-width', 'sidebar'],
    gridDensities: ['compact', 'comfortable'],
    heroStyles: ['banner', 'video', 'split'],
    colorPresets: [
      { id: 'digital-default', name: 'Indigo', primary: '#6366F1', secondary: '#1A1A2E', accent: '#6366F1', background: '#0F0F1A', text: '#E2E8F0', headerBg: '#0F0F1A', footerBg: '#050510' },
      { id: 'digital-teal', name: 'Teal', primary: '#14B8A6', secondary: '#0A1A1A', accent: '#2DD4BF', background: '#050F0F', text: '#E0F0F0', headerBg: '#050F0F', footerBg: '#020808' },
      { id: 'digital-gradient', name: 'Gradient', primary: '#EC4899', secondary: '#1A0A2E', accent: '#8B5CF6', background: '#0F051A', text: '#F0E0FF', headerBg: '#0F051A', footerBg: '#050210' },
    ],
  },
  kids: {
    id: 'kids',
    name: 'Kids',
    colors: {
      primary: 'bg-[#FF6B9D] text-white',
      secondary: 'bg-[#FFFBF0] text-[#2D2D2D]',
      accent: 'text-[#FF6B9D]',
      background: 'bg-[#FFFBF0]',
      text: 'text-[#2D2D2D]',
    },
    typography: { fontFamily: 'font-[family-name:var(--font-poppins)]', headingStyle: 'font-black' },
    layout: { headerStyle: 'left', productGrid: 'tight', borderRadius: 'rounded-3xl' },
    layoutVariations: ['default', 'full-width'],
    gridDensities: ['comfortable', 'compact', 'spacious'],
    heroStyles: ['banner', 'split', 'minimal'],
    colorPresets: [
      { id: 'kids-default', name: 'Rose Bonbon', primary: '#FF6B9D', secondary: '#FFFBF0', accent: '#FF6B9D', background: '#FFFBF0', text: '#2D2D2D', headerBg: '#FFFBF0', footerBg: '#2D2D2D' },
      { id: 'kids-ocean', name: 'Océan Fun', primary: '#00B4D8', secondary: '#F0FBFF', accent: '#FF6B9D', background: '#F8FDFF', text: '#2D2D3D', headerBg: '#F8FDFF', footerBg: '#1E3A4F' },
      { id: 'kids-jungle', name: 'Jungle', primary: '#4CAF50', secondary: '#F5FFF5', accent: '#FF9800', background: '#FAFFF5', text: '#2D3B2D', headerBg: '#FAFFF5', footerBg: '#2D3B2D' },
      { id: 'kids-candy', name: 'Bonbons', primary: '#E040FB', secondary: '#FFF5FF', accent: '#FF6B9D', background: '#FFFAFF', text: '#3D2D3D', headerBg: '#FFFAFF', footerBg: '#2D1D2D' },
    ],
  },
};
