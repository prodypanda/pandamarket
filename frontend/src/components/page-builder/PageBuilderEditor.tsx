'use client';

import { fetchWithCsrf } from '@/lib/api';
import { revalidatePageBuilderCache } from '@/lib/page-builder-cache';
import { normalizePublicAssetUrl } from '@/lib/public-assets';
/**
 * PageBuilderEditor — GrapesJS integration for PandaMarket vendor dashboard.
 * ─────────────────────────────────────────────────────────────────────────
 * This component wraps GrapesJS in a React client component.
 * It loads the editor on mount, provides save/publish actions,
 * and communicates with the backend via the page-builder API.
 *
 * Design system compliance:
 *   - Panda Green (#16C784) for primary actions
 *   - Inter font
 *   - Lucide icons
 *   - Dark panel styling matching the GrapesJS dark theme
 */

import { useEffect, useRef, useState, useCallback, useMemo, type ChangeEvent, type DragEvent } from 'react';
import { Save, Eye, EyeOff, ArrowLeft, Loader2, Monitor, Tablet, Smartphone, AlertCircle, AlertTriangle, CheckCircle2, ImageIcon, ExternalLink, History, RotateCcw, Plus, Store, ShoppingBag, Tags, Megaphone, HelpCircle, Star, ShieldCheck, Phone, Undo2, Redo2, Clock3, Sparkles, Download, Upload, Palette, Share2, Accessibility, ClipboardCheck, FileJson, Lock, Trash2, Wand2, type LucideIcon } from 'lucide-react';
import {
  renderPageBuilderDynamicBlocks,
  type PageBuilderDynamicContext,
  type PageBuilderStoreProduct,
} from './dynamic-blocks';
import type { TemplateSection } from './templates';

// GrapesJS types
interface GrapesJSEditor {
  getHtml: (opts?: { component?: unknown }) => string;
  getCss: (opts?: { component?: unknown }) => string;
  getWrapper: () => unknown;
  getProjectData: () => Record<string, unknown>;
  loadProjectData: (data: Record<string, unknown>) => void;
  setComponents: (components: string) => void;
  addComponents: (components: string) => unknown;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  destroy: () => void;
  DomComponents: { clear: () => void };
  AssetManager: GrapesJSAssetManager;
  UndoManager?: GrapesJSUndoManager;
  Canvas?: { getFrameEl?: () => HTMLIFrameElement | null };
  setStyle: (css: string) => void;
  setDevice: (device: string) => void;
  runCommand?: (command: string) => unknown;
  stopCommand?: (command: string) => unknown;
}

interface GrapesJSAssetManager {
  add: (asset: GrapesJSAsset | GrapesJSAsset[]) => unknown;
  open: (options?: GrapesJSAssetOpenOptions) => unknown;
  close: () => unknown;
}

interface GrapesJSAsset {
  type: 'image';
  src: string;
  name?: string;
}

interface GrapesJSAssetSelection {
  getSrc: () => string;
}

interface GrapesJSAssetOpenOptions {
  types?: string[];
  accept?: string;
  select?: (asset: GrapesJSAssetSelection, complete: boolean) => void;
}

interface GrapesJSUndoManager {
  undo: () => unknown;
  redo: () => unknown;
  hasUndo?: () => boolean;
  hasRedo?: () => boolean;
}

interface PageBuilderEditorProps {
  pageId: string;
  storeId: string;
  storeHost?: string | null;
  initialData?: {
    builder_data: Record<string, unknown>;
    html: string;
    css: string;
    title: string;
    slug?: string;
    is_published: boolean;
    is_homepage?: boolean;
    seo_title?: string | null;
    seo_description?: string | null;
    og_image?: string | null;
    noindex?: boolean;
    show_in_navigation?: boolean;
    show_in_footer?: boolean;
    sort_order?: number | null;
  };
  onSave?: () => void;
  onBack?: () => void;
  initialNotice?: string;
  hasAiSeo?: boolean;
}

interface PageBuilderPageSettings {
  seo_title: string;
  seo_description: string;
  og_image: string;
  noindex: boolean;
  show_in_navigation: boolean;
  show_in_footer: boolean;
  sort_order: number;
}

interface PageBuilderVersion {
  id: string;
  version_number: number;
  title: string;
  slug: string;
  published_at?: string | null;
  created_at: string;
}

interface RestoredPagePayload {
  builder_data?: Record<string, unknown>;
  html?: string;
  css?: string;
  is_published?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image?: string | null;
  noindex?: boolean;
  show_in_navigation?: boolean;
  show_in_footer?: boolean;
  sort_order?: number | null;
}

interface BuilderProductOption extends PageBuilderStoreProduct {
  status?: string | null;
}

interface BuilderCategoryOption {
  id: string;
  name: string;
  slug?: string | null;
  product_count?: number | string | null;
}

interface BuilderStorePreview {
  name?: string | null;
  subdomain?: string | null;
  custom_domain?: string | null;
  shipping_mode?: string | null;
  settings?: Record<string, unknown> | null;
}

type DynamicBlockAttributes = Record<string, string>;

interface BuilderMediaItem {
  url: string;
  product_title?: string | null;
  alt_text?: string | null;
}

interface DynamicBlockSelection {
  blockType: string;
  attrs: DynamicBlockAttributes;
}

interface DynamicEditorComponent {
  addAttributes?: (attrs: Record<string, string>) => void;
  getAttributes?: () => DynamicBlockAttributes;
  parent?: () => unknown;
  components?: (content?: string) => unknown;
  setStyle?: (style: Record<string, string>) => unknown;
  toHTML?: () => string;
  get?: (name: string) => unknown;
}

interface DynamicPreviewContent {
  innerHtml: string;
  style?: string;
}

interface SeoImageMeta {
  url: string;
  status: 'loading' | 'loaded' | 'error';
  width?: number;
  height?: number;
}

interface SectionOutlineItem {
  index: number;
  label: string;
  tag: string;
  detail: string;
}

interface EditorActivityItem {
  id: string;
  time: string;
  label: string;
  detail: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

interface SavedSectionItem {
  id: string;
  name: string;
  html: string;
  createdAt: string;
}

interface PageGlobalStyles {
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  buttonRadius: string;
  sectionSpacing: string;
  fontFamily: string;
}

interface ChecklistItem {
  label: string;
  ok: boolean;
  text: string;
}

interface PandaTemplateImport {
  panda_template_version?: string;
  type?: string;
  name?: string;
  html?: string;
  css?: string;
  settings?: Partial<PageBuilderPageSettings>;
  globalStyles?: Partial<PageGlobalStyles>;
}

interface SectionLibraryItem {
  id: string;
  section: TemplateSection;
  title: string;
  description: string;
  icon: LucideIcon;
  preview: SectionPreviewType;
  content: string;
}

type SectionPreviewType = 'hero' | 'products' | 'collections' | 'banner' | 'faq' | 'testimonials' | 'policies' | 'contact';

type BlockPreviewType = SectionPreviewType | 'shipping' | 'payment' | 'footer' | 'newsletter' | 'video' | 'team' | 'countdown' | 'carousel' | 'logos' | 'pricing' | 'form' | 'map' | 'blog' | 'size' | 'returns' | 'instagram';

const SECTION_LIBRARY_LABELS: Record<TemplateSection, { label: string; icon: LucideIcon }> = {
  hero: { label: 'Hero', icon: Store },
  products: { label: 'Produits', icon: ShoppingBag },
  faq: { label: 'FAQ', icon: HelpCircle },
  testimonials: { label: 'Avis', icon: Star },
  policies: { label: 'Politiques', icon: ShieldCheck },
  contact: { label: 'Contact', icon: Phone },
  banner: { label: 'Bannière', icon: Megaphone },
  collections: { label: 'Collections', icon: Tags },
};

const SECTION_LIBRARY_FILTERS: TemplateSection[] = [
  'hero',
  'products',
  'collections',
  'banner',
  'faq',
  'testimonials',
  'policies',
  'contact',
];

const DEFAULT_GLOBAL_STYLES: PageGlobalStyles = {
  primaryColor: '#16C784',
  backgroundColor: '#FFFFFF',
  surfaceColor: '#FFFFFF',
  textColor: '#1A1A2E',
  buttonRadius: '999',
  sectionSpacing: '56',
  fontFamily: 'Inter, sans-serif',
};

const GLOBAL_STYLE_START = '/* pd-page-global-styles:start */';
const GLOBAL_STYLE_END = '/* pd-page-global-styles:end */';
const MAX_TEMPLATE_IMPORT_BYTES = 1_000_000;

const SECTION_LIBRARY: SectionLibraryItem[] = [
  {
    id: 'store-hero',
    section: 'hero',
    title: 'Hero boutique dynamique',
    description: 'Nom, description, logo et couleur de la boutique.',
    icon: Store,
    preview: 'hero',
    content: `
<section data-pd-block="store-hero" data-pd-title="" data-pd-subtitle="" data-pd-image-url="" data-pd-image-position="center center" data-pd-image-fit="cover" style="padding: 80px 24px; text-align: center; background: linear-gradient(135deg, #1A1A2E 0%, #16213E 100%); color: white;">
  <h1 style="font-size: 48px; font-weight: 800; margin-bottom: 16px; font-family: Inter, sans-serif;">Hero connecté à la boutique</h1>
  <p style="font-size: 18px; color: #94A3B8; margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto;">Ce bloc utilisera automatiquement le branding de votre boutique sur la page publique.</p>
  <a href="#" style="display: inline-block; padding: 14px 32px; background: #16C784; color: white; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">Explorer le catalogue</a>
</section>
    `.trim(),
  },
  {
    id: 'featured-products',
    section: 'products',
    title: 'Produits sélectionnés',
    description: 'Affiche des produits publiés ou choisis manuellement.',
    icon: ShoppingBag,
    preview: 'products',
    content: `
<section data-pd-block="featured-products" data-pd-title="Produits sélectionnés" data-pd-subtitle="Mettez en avant vos meilleurs articles." data-pd-limit="4" style="padding: 56px 24px; max-width: 1200px; margin: 0 auto; background: #FFFFFF;">
  <p style="color: #16C784; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;">Dynamique</p>
  <h2 style="font-size: 30px; font-weight: 800; margin-bottom: 12px; font-family: Inter, sans-serif;">Produits mis en avant</h2>
  <p style="color: #6B7280; margin-bottom: 28px;">Ce bloc affichera automatiquement vos produits publiés.</p>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
    <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 28px; text-align: center; color: #6B7280;">Produit réel</div>
    <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 28px; text-align: center; color: #6B7280;">Produit réel</div>
    <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 28px; text-align: center; color: #6B7280;">Produit réel</div>
  </div>
</section>
    `.trim(),
  },
  {
    id: 'category-showcase',
    section: 'collections',
    title: 'Collections dynamiques',
    description: 'Met en avant les catégories actives de la boutique.',
    icon: Tags,
    preview: 'collections',
    content: `
<section data-pd-block="category-showcase" data-pd-title="Collections populaires" data-pd-limit="6" style="padding: 56px 24px; background: #F9FAFB;">
  <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
    <p style="color: #16C784; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;">Dynamique</p>
    <h2 style="font-size: 30px; font-weight: 800; margin-bottom: 28px; font-family: Inter, sans-serif;">Collections réelles</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 20px;">
      <div style="min-height: 160px; border-radius: 20px; background: #111827; color: white; display: grid; place-items: center;">Catégorie réelle</div>
      <div style="min-height: 160px; border-radius: 20px; background: #111827; color: white; display: grid; place-items: center;">Catégorie réelle</div>
    </div>
  </div>
</section>
    `.trim(),
  },
  {
    id: 'cta-banner',
    section: 'banner',
    title: 'Bannière promotion',
    description: 'Annonce courte avec appel à l’action.',
    icon: Megaphone,
    preview: 'banner',
    content: `
<section style="padding: 48px 24px; background: #16C784; text-align: center; color: white;">
  <h2 style="font-size: 30px; font-weight: 800; margin-bottom: 12px; font-family: Inter, sans-serif;">Offre spéciale — Livraison gratuite !</h2>
  <p style="font-size: 16px; opacity: 0.9; margin-bottom: 24px;">Sur toutes les commandes de plus de 100 TND. Offre limitée.</p>
  <a href="#" style="display: inline-block; padding: 14px 32px; background: white; color: #16C784; border-radius: 8px; font-weight: 800; text-decoration: none;">En profiter maintenant</a>
</section>
    `.trim(),
  },
  {
    id: 'faq',
    section: 'faq',
    title: 'FAQ compacte',
    description: 'Questions fréquentes prêtes à personnaliser.',
    icon: HelpCircle,
    preview: 'faq',
    content: `
<section style="padding: 56px 24px; max-width: 880px; margin: 0 auto;">
  <h2 style="font-size: 30px; font-weight: 800; text-align: center; margin-bottom: 32px; font-family: Inter, sans-serif;">Questions fréquentes</h2>
  <div style="border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; background: white;">
    <div style="padding: 20px 24px; border-bottom: 1px solid #E5E7EB;"><p style="font-weight: 700; margin: 0;">Quels sont les délais de livraison ?</p><p style="color: #6B7280; margin-top: 8px; font-size: 14px;">3 à 5 jours ouvrables partout en Tunisie.</p></div>
    <div style="padding: 20px 24px; border-bottom: 1px solid #E5E7EB;"><p style="font-weight: 700; margin: 0;">Comment retourner un produit ?</p><p style="color: #6B7280; margin-top: 8px; font-size: 14px;">14 jours pour retourner un produit non utilisé.</p></div>
    <div style="padding: 20px 24px;"><p style="font-weight: 700; margin: 0;">Quels modes de paiement ?</p><p style="color: #6B7280; margin-top: 8px; font-size: 14px;">Flouci, Konnect, mandat et paiement à la livraison selon disponibilité.</p></div>
  </div>
</section>
    `.trim(),
  },
  {
    id: 'testimonials',
    section: 'testimonials',
    title: 'Avis clients',
    description: 'Deux cartes d’avis pour rassurer les acheteurs.',
    icon: Star,
    preview: 'testimonials',
    content: `
<section style="padding: 56px 24px; background: #F9FAFB;">
  <h2 style="font-size: 30px; font-weight: 800; text-align: center; margin-bottom: 32px; font-family: Inter, sans-serif;">Ce que disent nos clients</h2>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; max-width: 1000px; margin: 0 auto;">
    <div style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"><p style="color: #F5A623; margin-bottom: 8px;">★★★★★</p><p style="color: #374151; margin-bottom: 12px;">"Excellent service et produits de qualité. Je recommande vivement !"</p><p style="font-weight: 700; font-size: 14px;">— Client satisfait</p></div>
    <div style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"><p style="color: #F5A623; margin-bottom: 8px;">★★★★★</p><p style="color: #374151; margin-bottom: 12px;">"Livraison rapide et emballage soigné. Très satisfait de mon achat."</p><p style="font-weight: 700; font-size: 14px;">— Client fidèle</p></div>
  </div>
</section>
    `.trim(),
  },
  {
    id: 'store-policies',
    section: 'policies',
    title: 'Politiques boutique',
    description: 'Livraison, retours et paiement connectés.',
    icon: ShieldCheck,
    preview: 'policies',
    content: `
<section data-pd-block="store-policies" data-pd-title="Politiques de la boutique" data-pd-subtitle="Les informations essentielles avant de commander." style="padding: 64px 24px; background: linear-gradient(180deg, #FFFFFF, #F9FAFB);">
  <div style="max-width: 1180px; margin: 0 auto; text-align: center;">
    <p style="color: #16C784; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;">Dynamique</p>
    <h2 style="font-size: 30px; font-weight: 800; margin-bottom: 12px; font-family: Inter, sans-serif;">Politiques réelles</h2>
    <p style="color: #6B7280; margin-bottom: 28px;">Ce bloc regroupe livraison, retours et paiement depuis les paramètres de boutique.</p>
  </div>
</section>
    `.trim(),
  },
  {
    id: 'store-contact',
    section: 'contact',
    title: 'Contact boutique',
    description: 'Email, téléphone et adresse configurés.',
    icon: Phone,
    preview: 'contact',
    content: `
<section data-pd-block="store-contact" data-pd-title="Contactez la boutique" style="padding: 56px 24px; max-width: 980px; margin: 0 auto;">
  <div style="border: 1px solid #E5E7EB; border-radius: 28px; padding: 40px; background: white;">
    <p style="color: #16C784; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;">Dynamique</p>
    <h2 style="font-size: 30px; font-weight: 800; margin-bottom: 12px; font-family: Inter, sans-serif;">Contact réel de la boutique</h2>
    <p style="color: #6B7280; margin-bottom: 24px;">Ce bloc affichera les coordonnées configurées dans les paramètres de boutique.</p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
      <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 18px; color: #6B7280;">Email réel</div>
      <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 18px; color: #6B7280;">Téléphone réel</div>
      <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 18px; color: #6B7280;">Adresse réelle</div>
    </div>
  </div>
</section>
    `.trim(),
  },
];

const blockPreviewIcons: Record<BlockPreviewType, string> = {
  hero: '▰',
  products: '▦',
  collections: '▥',
  banner: '▭',
  faq: '?',
  testimonials: '★',
  policies: '✓',
  contact: '@',
  shipping: '↗',
  payment: '$',
  footer: '≡',
  newsletter: '@',
  video: '▶',
  team: '◉',
  countdown: '◷',
  carousel: '▱',
  logos: '◆',
  pricing: '$',
  form: '✎',
  map: '⌖',
  blog: '¶',
  size: '⌗',
  returns: '↺',
  instagram: '□',
};

function blockLabel(title: string, preview: BlockPreviewType): string {
  const icon = blockPreviewIcons[preview];
  return `
    <div class="pd-gjs-block-card">
      <div class="pd-gjs-block-preview pd-gjs-block-preview--${preview}">
        <span class="pd-gjs-block-mark">${icon}</span>
        <span class="pd-gjs-block-line pd-gjs-block-line--wide"></span>
        <span class="pd-gjs-block-line"></span>
      </div>
      <span class="pd-gjs-block-title">${title}</span>
    </div>
  `;
}

function SectionVisualPreview({ preview, Icon }: { preview: SectionPreviewType; Icon: LucideIcon }) {
  return (
    <span className={`relative block h-16 overflow-hidden rounded-xl border border-[#E4D8C6] shadow-inner section-visual section-visual-${preview}`}>
      <Icon className="absolute left-3 top-3 h-6 w-6 text-white drop-shadow" />
      <span className="absolute bottom-3 left-3 h-1.5 w-16 rounded-full bg-white/85" />
      <span className="absolute bottom-6 left-3 h-1.5 w-10 rounded-full bg-white/65" />
      {preview === 'products' || preview === 'collections' ? (
        <span className="absolute right-3 top-3 grid grid-cols-2 gap-1">
          <span className="h-5 w-5 rounded bg-white/75" />
          <span className="h-5 w-5 rounded bg-white/55" />
          <span className="h-5 w-5 rounded bg-white/55" />
          <span className="h-5 w-5 rounded bg-white/75" />
        </span>
      ) : null}
      {preview === 'faq' || preview === 'testimonials' || preview === 'policies' ? (
        <span className="absolute right-3 top-3 space-y-1.5">
          <span className="block h-2 w-14 rounded-full bg-white/75" />
          <span className="block h-2 w-11 rounded-full bg-white/55" />
          <span className="block h-2 w-14 rounded-full bg-white/75" />
        </span>
      ) : null}
      {preview === 'banner' || preview === 'contact' ? (
        <span className="absolute right-3 top-3 h-10 w-16 rounded-xl border border-white/40 bg-white/30" />
      ) : null}
    </span>
  );
}

function slugSegment(value?: string | null): string {
  return (value || 'non-categorized-products')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'non-categorized-products';
}

function parseProductIds(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function parseCategorySlugs(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((slug) => slugSegment(slug))
    .filter(Boolean);
}

function settingsString(settings: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = settings?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function settingsColor(settings: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const colors = settings?.colors;
  if (typeof colors === 'object' && colors !== null && !Array.isArray(colors)) {
    const value = (colors as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return settingsString(settings, `${key}_color`);
}

function escapePreviewAttr(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function editorBodyHtml(html?: string): string {
  if (!html) return '';
  const bodyMatch = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html);
  return bodyMatch?.[1] || html;
}

function mergeEditorCss(componentCss: string, pageCss?: string): string {
  return [componentCss.trim(), pageCss?.trim()].filter(Boolean).join('\n\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGrapesProjectData(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const pages = value.pages;
  if (!Array.isArray(pages) || pages.length === 0) return false;
  return pages.some((page) => {
    if (!isRecord(page)) return false;
    const frames = page.frames;
    return Array.isArray(frames) && frames.length > 0;
  });
}

function applyPageContentToGrapesEditor(
  editor: GrapesJSEditor,
  builderData: unknown,
  html?: string,
  css?: string,
) {
  if (isGrapesProjectData(builderData)) {
    let projectLoaded = false;
    try {
      editor.loadProjectData(builderData);
      projectLoaded = true;
    } catch {
      projectLoaded = false;
    }
    if (projectLoaded) return;
  }

  editor.DomComponents.clear();
  const fallbackHtml = editorBodyHtml(html);
  if (fallbackHtml) {
    editor.setComponents(fallbackHtml);
  }
  const componentCss = editor.getCss({ component: editor.getWrapper() });
  editor.setStyle(mergeEditorCss(componentCss, css));
}

function filenameFromUrl(url: string): string {
  const path = url.split('?')[0].split('#')[0];
  const name = path.split('/').pop() || 'Image boutique';
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function formatVersionDate(value?: string | null): string {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function mediaItemToAsset(item: BuilderMediaItem): GrapesJSAsset | null {
  const src = normalizePublicAssetUrl(item.url);
  if (!src) return null;
  return {
    type: 'image',
    src,
    name: item.alt_text || item.product_title || filenameFromUrl(src),
  };
}

function uploadFilesFromEvent(event: unknown): File[] {
  const source = event as {
    dataTransfer?: { files?: FileList };
    target?: { files?: FileList };
  };
  return Array.from(source.dataTransfer?.files || source.target?.files || []);
}

async function responseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message || data?.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function dynamicPreviewContent(blockType: string, attrs: DynamicBlockAttributes, context: PageBuilderDynamicContext): DynamicPreviewContent {
  const attrText = Object.entries({ ...attrs, 'data-pd-block': blockType })
    .filter(([name]) => name.startsWith('data-pd-'))
    .map(([name, value]) => `${name}="${escapePreviewAttr(value)}"`)
    .join(' ');
  const rendered = renderPageBuilderDynamicBlocks(`<section ${attrText}></section>`, context);
  if (typeof document === 'undefined') return { innerHtml: rendered };
  const template = document.createElement('template');
  template.innerHTML = rendered.trim();
  const element = template.content.firstElementChild;
  return {
    innerHtml: element?.innerHTML || rendered,
    style: element?.getAttribute('style') || undefined,
  };
}

function styleAttributeToObject(style: string): Record<string, string> {
  return style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, declaration) => {
      const separatorIndex = declaration.indexOf(':');
      if (separatorIndex > 0) {
        acc[declaration.slice(0, separatorIndex).trim()] = declaration.slice(separatorIndex + 1).trim();
      }
      return acc;
    }, {});
}

function dynamicBlockLabel(blockType: string): string {
  const labels: Record<string, string> = {
    'store-hero': 'Hero boutique',
    'product-grid': 'Grille produits',
    'featured-products': 'Produits sélectionnés',
    'category-showcase': 'Collections',
    'store-contact': 'Contact boutique',
    'shipping-policy': 'Livraison',
    'payment-policy': 'Paiement',
    'store-policies': 'Politiques boutique',
  };
  return labels[blockType] || 'Bloc dynamique';
}

function supportsProductControls(blockType: string): boolean {
  return blockType === 'product-grid' || blockType === 'featured-products';
}

function supportsSubtitleControl(blockType: string): boolean {
  return [
    'store-hero',
    'product-grid',
    'featured-products',
    'shipping-policy',
    'payment-policy',
    'store-policies',
  ].includes(blockType);
}

function supportsLimitControl(blockType: string): boolean {
  return blockType === 'product-grid' || blockType === 'featured-products' || blockType === 'category-showcase';
}

function supportsCategorySelectionControls(blockType: string): boolean {
  return blockType === 'category-showcase';
}

function supportsImageControl(blockType: string): boolean {
  return blockType === 'store-hero';
}

const HERO_IMAGE_POSITION_OPTIONS = [
  { label: 'Haut gauche', value: 'left top' },
  { label: 'Haut centre', value: 'center top' },
  { label: 'Haut droite', value: 'right top' },
  { label: 'Centre gauche', value: 'left center' },
  { label: 'Centre', value: 'center center' },
  { label: 'Centre droite', value: 'right center' },
  { label: 'Bas gauche', value: 'left bottom' },
  { label: 'Bas centre', value: 'center bottom' },
  { label: 'Bas droite', value: 'right bottom' },
];

const HERO_IMAGE_FIT_OPTIONS = [
  { label: 'Recadrer pour remplir', value: 'cover' },
  { label: 'Afficher toute l’image', value: 'contain' },
] as const;

function normalizeHeroImagePosition(value?: string): string {
  const normalized = value || 'center center';
  if (/^\d{1,3}%\s+\d{1,3}%$/.test(normalized)) return normalized;
  return HERO_IMAGE_POSITION_OPTIONS.some((option) => option.value === normalized) ? normalized : 'center center';
}

function normalizeHeroImageFit(value?: string): 'cover' | 'contain' {
  return value === 'contain' ? 'contain' : 'cover';
}

function heroImageFocusPercent(position: string): { x: number; y: number } {
  const percentMatch = /^(\d{1,3})%\s+(\d{1,3})%$/.exec(position);
  if (percentMatch) {
    return {
      x: Math.min(100, Math.max(0, Number(percentMatch[1]))),
      y: Math.min(100, Math.max(0, Number(percentMatch[2]))),
    };
  }
  const [horizontal = 'center', vertical = 'center'] = position.split(' ');
  return {
    x: horizontal === 'left' ? 0 : horizontal === 'right' ? 100 : 50,
    y: vertical === 'top' ? 0 : vertical === 'bottom' ? 100 : 50,
  };
}

function extractFirstHeroImageUrl(html?: string): string {
  if (!html || typeof document === 'undefined') return '';
  const template = document.createElement('template');
  template.innerHTML = html;
  const explicitHero = template.content.querySelector('[data-pd-block="store-hero"]');
  const source = explicitHero || template.content;
  const dataImage = explicitHero?.getAttribute('data-pd-image-url');
  const image = source.querySelector('img')?.getAttribute('src');
  const backgroundStyle = source.querySelector<HTMLElement>('[style*="background-image"]')?.style.backgroundImage || '';
  const backgroundMatch = /url\(["']?([^"')]+)["']?\)/.exec(backgroundStyle);
  return normalizePublicAssetUrl(dataImage || image || backgroundMatch?.[1] || '');
}

function seoImageQualityMessage(meta: SeoImageMeta | null): { type: 'success' | 'warning' | 'error'; message: string } | null {
  if (!meta) return null;
  if (meta.status === 'loading') return { type: 'warning', message: 'Analyse des dimensions de l’image...' };
  if (meta.status === 'error') return { type: 'error', message: 'Impossible de lire les dimensions de cette image.' };
  if (!meta.width || !meta.height) return null;
  const ratio = meta.width / meta.height;
  if (meta.width < 1200 || meta.height < 630) {
    return { type: 'warning', message: `Image petite (${meta.width} × ${meta.height}). Recommandé : au moins 1200 × 630 px.` };
  }
  if (ratio < 1.55) {
    return { type: 'warning', message: `Image trop verticale (${meta.width} × ${meta.height}). Les partages sociaux préfèrent un format horizontal 1.91:1.` };
  }
  if (ratio > 2.25) {
    return { type: 'warning', message: `Image très panoramique (${meta.width} × ${meta.height}). Elle risque d’être recadrée sur les réseaux.` };
  }
  return { type: 'success', message: `Bon format SEO (${meta.width} × ${meta.height}).` };
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

function collapseGrapesBlockCategories(container: HTMLElement | null): void {
  if (!container) return;
  const categoryBodies = Array.from(container.querySelectorAll<HTMLElement>('.gjs-blocks-c'));
  categoryBodies.forEach((body) => {
    body.style.display = 'none';
  });
  const categoryTitles = Array.from(container.querySelectorAll<HTMLElement>('.gjs-title'));
  categoryTitles.forEach((title) => {
    title.classList.add('pd-gjs-category-collapsed');
  });
}

function safeText(value: string, fallback: string): string {
  const text = value.replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function elementLabel(element: Element, index: number): string {
  const dataTitle = element.getAttribute('data-pd-title');
  const heading = element.querySelector('h1,h2,h3')?.textContent || '';
  const dynamicLabel = dynamicBlockLabel(element.getAttribute('data-pd-block') || '');
  return safeText(dataTitle || heading || dynamicLabel, `Section ${index + 1}`);
}

function buildSectionOutline(html: string): SectionOutlineItem[] {
  if (typeof document === 'undefined') return [];
  const template = document.createElement('template');
  template.innerHTML = editorBodyHtml(html);
  const elements = Array.from(template.content.children).filter((element) => element instanceof HTMLElement);
  return elements.slice(0, 30).map((element, index) => ({
    index,
    label: elementLabel(element, index),
    tag: element.tagName.toLowerCase(),
    detail: element.getAttribute('data-pd-block') || element.className?.toString().split(' ').slice(0, 2).join(' ') || 'section',
  }));
}

function buildAccessibilityWarnings(html: string): string[] {
  if (typeof document === 'undefined') return [];
  const template = document.createElement('template');
  template.innerHTML = editorBodyHtml(html);
  const imagesWithoutAlt = template.content.querySelectorAll('img:not([alt]), img[alt=""]').length;
  const unsafeLinks = Array.from(template.content.querySelectorAll<HTMLAnchorElement>('a')).filter((link) => {
    const href = link.getAttribute('href')?.trim() || '';
    return !href || href === '#' || /^javascript:/i.test(href);
  }).length;
  const h1Count = template.content.querySelectorAll('h1').length;
  const emptyActions = Array.from(template.content.querySelectorAll('a,button')).filter((element) => !element.textContent?.trim()).length;
  return [
    imagesWithoutAlt ? `${imagesWithoutAlt} image${imagesWithoutAlt > 1 ? 's' : ''} sans texte alternatif.` : '',
    unsafeLinks ? `${unsafeLinks} lien${unsafeLinks > 1 ? 's' : ''} vide${unsafeLinks > 1 ? 's' : ''} ou temporaire${unsafeLinks > 1 ? 's' : ''}.` : '',
    h1Count === 0 ? 'Aucun titre H1 détecté.' : '',
    h1Count > 1 ? `${h1Count} titres H1 détectés, gardez idéalement un H1 principal.` : '',
    emptyActions ? `${emptyActions} bouton${emptyActions > 1 ? 's' : ''} ou lien${emptyActions > 1 ? 's' : ''} sans libellé.` : '',
  ].filter(Boolean);
}

function buildMobileWarnings(html: string, css: string): string[] {
  const source = `${html}\n${css}`;
  const fixedWidths = Array.from(source.matchAll(/(?:width|min-width)\s*:\s*(\d{3,4})px/gi))
    .map((match) => Number(match[1]))
    .filter((width) => width > 390);
  const largeText = Array.from(source.matchAll(/font-size\s*:\s*(\d{2,3})px/gi))
    .map((match) => Number(match[1]))
    .filter((size) => size > 42);
  const template = typeof document !== 'undefined' ? document.createElement('template') : null;
  if (template) template.innerHTML = editorBodyHtml(html);
  const tables = template?.content.querySelectorAll('table').length || 0;
  return [
    fixedWidths.length ? `${fixedWidths.length} largeur${fixedWidths.length > 1 ? 's' : ''} fixe${fixedWidths.length > 1 ? 's' : ''} au-dessus de 390px.` : '',
    largeText.length ? `${largeText.length} texte${largeText.length > 1 ? 's' : ''} très grand${largeText.length > 1 ? 's' : ''} à vérifier sur mobile.` : '',
    tables ? `${tables} tableau${tables > 1 ? 'x' : ''} à tester sur écran étroit.` : '',
  ].filter(Boolean);
}

function clampHexColor(value: string, fallback: string): string {
  const color = value.trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function clampNumericString(value: string, fallback: string, min: number, max: number): string {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return String(Math.min(max, Math.max(min, number)));
}

function normalizeGlobalStyles(value: Partial<PageGlobalStyles>): PageGlobalStyles {
  return {
    primaryColor: clampHexColor(value.primaryColor || DEFAULT_GLOBAL_STYLES.primaryColor, DEFAULT_GLOBAL_STYLES.primaryColor),
    backgroundColor: clampHexColor(value.backgroundColor || DEFAULT_GLOBAL_STYLES.backgroundColor, DEFAULT_GLOBAL_STYLES.backgroundColor),
    surfaceColor: clampHexColor(value.surfaceColor || DEFAULT_GLOBAL_STYLES.surfaceColor, DEFAULT_GLOBAL_STYLES.surfaceColor),
    textColor: clampHexColor(value.textColor || DEFAULT_GLOBAL_STYLES.textColor, DEFAULT_GLOBAL_STYLES.textColor),
    buttonRadius: clampNumericString(value.buttonRadius || DEFAULT_GLOBAL_STYLES.buttonRadius, DEFAULT_GLOBAL_STYLES.buttonRadius, 0, 999),
    sectionSpacing: clampNumericString(value.sectionSpacing || DEFAULT_GLOBAL_STYLES.sectionSpacing, DEFAULT_GLOBAL_STYLES.sectionSpacing, 24, 120),
    fontFamily: ['Inter, sans-serif', 'Arial, sans-serif', 'Georgia, serif', 'system-ui, sans-serif'].includes(value.fontFamily || '')
      ? value.fontFamily || DEFAULT_GLOBAL_STYLES.fontFamily
      : DEFAULT_GLOBAL_STYLES.fontFamily,
  };
}

function normalizeImportedSettings(settings?: Partial<PageBuilderPageSettings>): Partial<PageBuilderPageSettings> {
  if (!settings) return {};
  const next: Partial<PageBuilderPageSettings> = {};
  if (typeof settings.seo_title === 'string') next.seo_title = settings.seo_title.slice(0, 200);
  if (typeof settings.seo_description === 'string') next.seo_description = settings.seo_description.slice(0, 320);
  if (typeof settings.og_image === 'string') next.og_image = normalizePublicAssetUrl(settings.og_image);
  if (typeof settings.noindex === 'boolean') next.noindex = settings.noindex;
  if (typeof settings.show_in_navigation === 'boolean') next.show_in_navigation = settings.show_in_navigation;
  if (typeof settings.show_in_footer === 'boolean') next.show_in_footer = settings.show_in_footer;
  if (typeof settings.sort_order === 'number') next.sort_order = Math.max(0, Math.min(999, Math.round(settings.sort_order)));
  return next;
}

function pageGlobalStyleCss(styles: PageGlobalStyles): string {
  return `${GLOBAL_STYLE_START}
body { background: ${styles.backgroundColor}; color: ${styles.textColor}; font-family: ${styles.fontFamily}; }
section { padding-top: ${styles.sectionSpacing}px !important; padding-bottom: ${styles.sectionSpacing}px !important; }
a, button { border-radius: ${styles.buttonRadius}px !important; }
a:not([style*="color"]) { color: ${styles.primaryColor}; }
.pd-page-surface { background: ${styles.surfaceColor}; }
${GLOBAL_STYLE_END}`;
}

function stripPageGlobalStyleCss(css: string): string {
  const start = css.indexOf(GLOBAL_STYLE_START);
  const end = css.indexOf(GLOBAL_STYLE_END);
  if (start === -1 || end === -1 || end < start) return css;
  return `${css.slice(0, start)}${css.slice(end + GLOBAL_STYLE_END.length)}`.trim();
}

function withPageGlobalStyleCss(css: string, styles: PageGlobalStyles): string {
  return [stripPageGlobalStyleCss(css).trim(), pageGlobalStyleCss(styles)].filter(Boolean).join('\n\n');
}

function isUnsafeTemplateUrl(value: string): boolean {
  const normalized = value.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
  return normalized.startsWith('javascript:') || normalized.startsWith('vbscript:') || normalized.startsWith('data:') || normalized.startsWith('file:');
}

function sanitizeTemplateHtml(html: string): string {
  if (typeof document === 'undefined') return '';
  const template = document.createElement('template');
  template.innerHTML = editorBodyHtml(html.slice(0, MAX_TEMPLATE_IMPORT_BYTES));
  template.content.querySelectorAll('script,iframe,object,embed,meta,link,style').forEach((element) => element.remove());
  template.content.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      if (name.startsWith('on') || name === 'srcdoc') {
        element.removeAttribute(attribute.name);
        return;
      }
      if ((name === 'href' || name === 'src' || name === 'xlink:href') && isUnsafeTemplateUrl(value)) {
        element.removeAttribute(attribute.name);
        return;
      }
      if (name === 'style' && /expression\s*\(|javascript:|vbscript:|data:/i.test(value)) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  return template.innerHTML.trim();
}

function sanitizeTemplateCss(css: string): string {
  return css
    .slice(0, 250_000)
    .replace(/@import[^;]+;/gi, '')
    .replace(/url\s*\(\s*(['"]?)(?:javascript|vbscript|data|file):[^)]*\)/gi, 'url()')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/behavior\s*:[^;]+;/gi, '')
    .replace(/-moz-binding\s*:[^;]+;/gi, '')
    .trim();
}

function readTemplateFile(file: File): Promise<PandaTemplateImport> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_TEMPLATE_IMPORT_BYTES) {
      reject(new Error('Le fichier template dépasse la limite sécurisée de 1 MB.'));
      return;
    }
    if (!file.name.toLowerCase().endsWith('.json')) {
      reject(new Error('Import refusé : utilisez un fichier JSON exporté depuis PandaMarket.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier template.'));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '')) as PandaTemplateImport;
        if (parsed.type !== 'pandamarket-page-builder-template' || typeof parsed.html !== 'string') {
          reject(new Error('Template invalide ou non reconnu.'));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error('JSON template invalide.'));
      }
    };
    reader.readAsText(file);
  });
}

function downloadTemplateFile(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function PageBuilderEditor({
  pageId,
  storeId,
  storeHost,
  initialData,
  onSave,
  onBack,
  initialNotice,
  hasAiSeo = false,
}: PageBuilderEditorProps) {
  const editorRef = useRef<GrapesJSEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blockPanelRef = useRef<HTMLDivElement>(null);
  const selectorPanelRef = useRef<HTMLDivElement>(null);
  const stylePanelRef = useRef<HTMLDivElement>(null);
  const layerPanelRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [isPublished, setIsPublished] = useState(initialData?.is_published ?? false);
  const [pageSettings, setPageSettings] = useState<PageBuilderPageSettings>({
    seo_title: initialData?.seo_title || '',
    seo_description: initialData?.seo_description || '',
    og_image: initialData?.og_image || '',
    noindex: initialData?.noindex || false,
    show_in_navigation: initialData?.show_in_navigation || false,
    show_in_footer: initialData?.show_in_footer || false,
    sort_order: initialData?.sort_order ?? 0,
  });
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetUploading, setAssetUploading] = useState(false);
  const [activeDevice, setActiveDevice] = useState('Desktop');
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const [componentsVisible, setComponentsVisible] = useState(true);
  const [activeSectionFilter, setActiveSectionFilter] = useState<TemplateSection | 'all'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [builderStore, setBuilderStore] = useState<BuilderStorePreview | null>(null);
  const [builderProducts, setBuilderProducts] = useState<BuilderProductOption[]>([]);
  const [builderCategories, setBuilderCategories] = useState<BuilderCategoryOption[]>([]);
  const [storeMediaAssets, setStoreMediaAssets] = useState<BuilderMediaItem[]>([]);
  const [selectedDynamicBlock, setSelectedDynamicBlock] = useState<DynamicBlockSelection | null>(null);
  const [versions, setVersions] = useState<PageBuilderVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [isSectionDropActive, setIsSectionDropActive] = useState(false);
  const [seoImagePickerOpen, setSeoImagePickerOpen] = useState(false);
  const [seoImageSearch, setSeoImageSearch] = useState('');
  const [seoImagePickerError, setSeoImagePickerError] = useState('');
  const [seoImageMeta, setSeoImageMeta] = useState<SeoImageMeta | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState(() => extractFirstHeroImageUrl(initialData?.html));
  const [blockSearch, setBlockSearch] = useState('');
  const [sectionsQuickOpen, setSectionsQuickOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [currentHtml, setCurrentHtml] = useState(initialData?.html || '');
  const [currentCss, setCurrentCss] = useState(initialData?.css || '');
  const [sectionOutline, setSectionOutline] = useState<SectionOutlineItem[]>(() => buildSectionOutline(initialData?.html || ''));
  const [activityTimeline, setActivityTimeline] = useState<EditorActivityItem[]>([]);
  const [savedSections, setSavedSections] = useState<SavedSectionItem[]>([]);
  const [globalStyles, setGlobalStyles] = useState<PageGlobalStyles>(DEFAULT_GLOBAL_STYLES);
  const [publishChecklistOpen, setPublishChecklistOpen] = useState(false);
  const [templateImporting, setTemplateImporting] = useState(false);
  const [aiCopyLoading, setAiCopyLoading] = useState(false);
  const savingRef = useRef(false);
  const previewRefreshRef = useRef(false);
  const selectedComponentRef = useRef<DynamicEditorComponent | null>(null);
  const selectedRawComponentRef = useRef<DynamicEditorComponent | null>(null);

  const updatePageSetting = useCallback((name: keyof PageBuilderPageSettings, value: string | boolean | number) => {
    setPageSettings((prev) => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const updateUndoRedoState = useCallback((targetEditor = editorRef.current) => {
    const undoManager = targetEditor?.UndoManager;
    setCanUndo(Boolean(undoManager?.hasUndo?.()));
    setCanRedo(Boolean(undoManager?.hasRedo?.()));
  }, []);

  const savedSectionsStorageKey = useMemo(() => `pd_page_builder_saved_sections_${storeId || 'store'}`, [storeId]);

  const recordActivity = useCallback((label: string, detail: string, status: EditorActivityItem['status'] = 'info') => {
    setActivityTimeline((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        label,
        detail,
        status,
      },
      ...prev,
    ].slice(0, 8));
  }, []);

  const refreshEditorSnapshot = useCallback((targetEditor = editorRef.current) => {
    if (!targetEditor) return;
    const wrapper = targetEditor.getWrapper();
    const html = targetEditor.getHtml({ component: wrapper });
    const css = withPageGlobalStyleCss(targetEditor.getCss({ component: wrapper }), globalStyles);
    setCurrentHtml(html);
    setCurrentCss(css);
    setHeroImageUrl(extractFirstHeroImageUrl(html));
    setSectionOutline(buildSectionOutline(html));
  }, [globalStyles]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(savedSectionsStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        setSavedSections(parsed.filter((item): item is SavedSectionItem => (
          isRecord(item) &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.html === 'string' &&
          typeof item.createdAt === 'string'
        )).slice(0, 20));
      }
    } catch {
      setSavedSections([]);
    }
  }, [savedSectionsStorageKey]);

  const filteredSectionLibrary = useMemo(() => {
    const query = blockSearch.trim().toLowerCase();
    let sections = activeSectionFilter === 'all'
      ? SECTION_LIBRARY
      : SECTION_LIBRARY.filter((section) => section.section === activeSectionFilter);
    if (query) {
      sections = sections.filter((section) => {
        const label = `${section.title} ${section.description} ${SECTION_LIBRARY_LABELS[section.section].label}`.toLowerCase();
        return label.includes(query);
      });
    }
    return sections;
  }, [activeSectionFilter, blockSearch]);

  const filteredSeoMediaAssets = useMemo(() => {
    const needle = seoImageSearch.trim().toLowerCase();
    if (!needle) return storeMediaAssets;
    return storeMediaAssets.filter((asset) => {
      const label = `${asset.alt_text || ''} ${asset.product_title || ''} ${filenameFromUrl(asset.url)} ${asset.url}`.toLowerCase();
      return label.includes(needle);
    });
  }, [seoImageSearch, storeMediaAssets]);

  const seoImageQuality = useMemo(() => seoImageQualityMessage(seoImageMeta), [seoImageMeta]);
  const seoChecks = useMemo(() => {
    const titleLength = pageSettings.seo_title.trim().length;
    const descriptionLength = pageSettings.seo_description.trim().length;
    return [
      {
        label: 'Titre SEO',
        ok: titleLength >= 35 && titleLength <= 70,
        text: titleLength ? `${titleLength}/70 caractères` : 'Titre manquant',
      },
      {
        label: 'Description',
        ok: descriptionLength >= 80 && descriptionLength <= 160,
        text: descriptionLength ? `${descriptionLength}/160 caractères` : 'Description manquante',
      },
      {
        label: 'Image sociale',
        ok: Boolean(pageSettings.og_image),
        text: pageSettings.og_image ? 'Image sélectionnée' : 'Image manquante',
      },
      {
        label: 'Indexation',
        ok: !pageSettings.noindex,
        text: pageSettings.noindex ? 'Noindex actif' : 'Indexable',
      },
    ];
  }, [pageSettings.noindex, pageSettings.og_image, pageSettings.seo_description, pageSettings.seo_title]);

  const accessibilityWarnings = useMemo(() => buildAccessibilityWarnings(currentHtml), [currentHtml]);
  const mobileWarnings = useMemo(() => buildMobileWarnings(currentHtml, currentCss), [currentCss, currentHtml]);
  const publishChecklist = useMemo<ChecklistItem[]>(() => [
    {
      label: 'Titre SEO',
      ok: seoChecks[0]?.ok ?? false,
      text: seoChecks[0]?.text || 'Titre manquant',
    },
    {
      label: 'Description SEO',
      ok: seoChecks[1]?.ok ?? false,
      text: seoChecks[1]?.text || 'Description manquante',
    },
    {
      label: 'Image de partage',
      ok: Boolean(pageSettings.og_image),
      text: pageSettings.og_image ? 'Image configurée' : 'Recommandée pour Facebook/WhatsApp',
    },
    {
      label: 'Mobile',
      ok: mobileWarnings.length === 0,
      text: mobileWarnings.length ? `${mobileWarnings.length} point${mobileWarnings.length > 1 ? 's' : ''} à vérifier` : 'Aucun risque évident',
    },
    {
      label: 'Accessibilité',
      ok: accessibilityWarnings.length === 0,
      text: accessibilityWarnings.length ? `${accessibilityWarnings.length} amélioration${accessibilityWarnings.length > 1 ? 's' : ''}` : 'Aucun problème détecté',
    },
    {
      label: 'Indexation',
      ok: !pageSettings.noindex,
      text: pageSettings.noindex ? 'Noindex actif' : 'La page peut être indexée',
    },
  ], [accessibilityWarnings.length, mobileWarnings.length, pageSettings.noindex, pageSettings.og_image, seoChecks]);
  const publishChecklistScore = publishChecklist.filter((item) => item.ok).length;

  const insertLibrarySection = useCallback((section: SectionLibraryItem, mode: 'click' | 'drop' = 'click') => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.addComponents(section.content);
    refreshEditorSnapshot(editor);
    setHasUnsavedChanges(true);
    setFeedback({
      type: 'success',
      message: mode === 'drop'
        ? `Section "${section.title}" déposée dans le brouillon.`
        : `Section "${section.title}" ajoutée au brouillon.`,
    });
  }, [refreshEditorSnapshot]);

  const handleSectionDragStart = useCallback((event: DragEvent<HTMLButtonElement>, section: SectionLibraryItem) => {
    if (!editorRef.current) return;
    setDraggedSectionId(section.id);
    setIsSectionDropActive(false);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-pd-section-id', section.id);
    event.dataTransfer.setData('text/plain', section.title);
  }, []);

  const handleSectionDragEnd = useCallback(() => {
    setDraggedSectionId(null);
    setIsSectionDropActive(false);
  }, []);

  const handleCanvasDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!draggedSectionId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsSectionDropActive(true);
  }, [draggedSectionId]);

  const handleCanvasDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;
    setIsSectionDropActive(false);
  }, []);

  const handleCanvasDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    const sectionId = event.dataTransfer.getData('application/x-pd-section-id') || draggedSectionId;
    const section = SECTION_LIBRARY.find((item) => item.id === sectionId);
    if (!section) return;
    event.preventDefault();
    event.stopPropagation();
    insertLibrarySection(section, 'drop');
    setDraggedSectionId(null);
    setIsSectionDropActive(false);
  }, [draggedSectionId, insertLibrarySection]);

  useEffect(() => {
    const blockPanelEl = blockPanelRef.current;
    if (!blockPanelEl) return;
    const query = blockSearch.trim().toLowerCase();
    const blocks = Array.from(blockPanelEl.querySelectorAll<HTMLElement>('.gjs-block'));
    blocks.forEach((block) => {
      const label = block.textContent?.toLowerCase() || '';
      const visible = !query || label.includes(query);
      block.style.display = visible ? '' : 'none';
    });
  }, [blockSearch, editorReady]);

  const addStoreMediaToEditor = useCallback((items: BuilderMediaItem[], targetEditor = editorRef.current) => {
    const assets = items
      .map(mediaItemToAsset)
      .filter((asset): asset is GrapesJSAsset => Boolean(asset));
    if (assets.length) {
      targetEditor?.AssetManager.add(assets);
    }
    return assets.length;
  }, []);

  const applyRestoredPageToEditor = useCallback((page: RestoredPagePayload) => {
    const editor = editorRef.current;
    if (!editor) return;
    previewRefreshRef.current = true;
    try {
      applyPageContentToGrapesEditor(editor, page.builder_data, page.html, page.css);
      setPageSettings({
        seo_title: page.seo_title || '',
        seo_description: page.seo_description || '',
        og_image: page.og_image || '',
        noindex: page.noindex || false,
        show_in_navigation: page.show_in_navigation || false,
        show_in_footer: page.show_in_footer || false,
        sort_order: page.sort_order ?? 0,
      });
      setIsPublished(page.is_published ?? isPublished);
      setHasUnsavedChanges(false);
      setLastSaved(new Date().toLocaleTimeString('fr-FR'));
      updateUndoRedoState(editor);
    } finally {
      window.setTimeout(() => {
        previewRefreshRef.current = false;
      }, 0);
    }
  }, [isPublished, updateUndoRedoState]);

  const loadVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/page-builder/pages/${pageId}/versions`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, 'Impossible de charger l’historique'));
      }
      const data = await res.json();
      setVersions(data.data || []);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de charger l’historique',
      });
    } finally {
      setVersionsLoading(false);
    }
  }, [pageId]);

  const restoreVersion = useCallback(async (version: PageBuilderVersion) => {
    if (!window.confirm(`Restaurer la version ${version.version_number} dans le brouillon ? La page publique ne changera pas avant publication.`)) {
      return;
    }
    setRestoringVersionId(version.id);
    setFeedback(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/page-builder/pages/${pageId}/versions/${version.id}/restore`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => null) as { page?: RestoredPagePayload; error?: { message?: string }; message?: string } | null;
      if (!res.ok || !data?.page) {
        throw new Error(data?.error?.message || data?.message || 'Impossible de restaurer cette version');
      }
      applyRestoredPageToEditor(data.page);
      setFeedback({
        type: 'success',
        message: `Version ${version.version_number} restaurée dans le brouillon. Prévisualisez puis publiez pour la mettre en ligne.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de restaurer cette version',
      });
    } finally {
      setRestoringVersionId(null);
    }
  }, [applyRestoredPageToEditor, pageId]);

  const loadStoreMediaAssets = useCallback(async (targetEditor = editorRef.current, showSuccess = false) => {
    setAssetLoading(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/media?limit=100', { credentials: 'include' });
      if (!res.ok) {
        throw new Error(await responseErrorMessage(res, 'Impossible de charger la médiathèque'));
      }
      const data = await res.json();
      const items = ((data.data || []) as BuilderMediaItem[])
        .map((item) => ({ ...item, url: normalizePublicAssetUrl(item.url) }))
        .filter((item) => Boolean(item.url));
      setStoreMediaAssets(items);
      const count = addStoreMediaToEditor(items, targetEditor);
      if (showSuccess) {
        setFeedback({
          type: 'success',
          message: count ? `${count} image${count > 1 ? 's' : ''} chargée${count > 1 ? 's' : ''} dans la médiathèque.` : 'Aucune image trouvée dans la médiathèque.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de charger la médiathèque',
      });
    } finally {
      setAssetLoading(false);
    }
  }, [addStoreMediaToEditor]);

  const uploadEditorAsset = useCallback(async (file: File, targetEditor = editorRef.current) => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Veuillez importer une image.');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('L’image doit faire moins de 10 MB.');
    }

    const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type,
        file_size: file.size,
        purpose: 'product_image',
      }),
    });
    if (!presignRes.ok) {
      throw new Error(await responseErrorMessage(presignRes, 'Impossible de préparer l’import'));
    }
    const presignData = await presignRes.json();
    if (!presignData.upload_url || !presignData.public_url) {
      throw new Error('URL d’import invalide.');
    }

    const uploadRes = await fetch(presignData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!uploadRes.ok) {
      throw new Error('Échec de l’import de l’image.');
    }

    const asset: GrapesJSAsset = {
      type: 'image',
      src: normalizePublicAssetUrl(presignData.public_url),
      name: file.name,
    };
    targetEditor?.AssetManager.add(asset);
    return asset;
  }, []);

  const uploadEditorAssets = useCallback(async (files: File[], targetEditor = editorRef.current) => {
    if (!files.length) return;
    setAssetUploading(true);
    setFeedback(null);
    try {
      await Promise.all(files.map((file) => uploadEditorAsset(file, targetEditor)));
      setFeedback({
        type: 'success',
        message: `${files.length} image${files.length > 1 ? 's' : ''} importée${files.length > 1 ? 's' : ''} dans la médiathèque.`,
      });
      await loadStoreMediaAssets(targetEditor);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Import image échoué',
      });
    } finally {
      setAssetUploading(false);
    }
  }, [loadStoreMediaAssets, uploadEditorAsset]);

  const dynamicPreviewContext = useMemo<PageBuilderDynamicContext>(() => {
    const settings = builderStore?.settings || {};
    return {
      storeName: builderStore?.name || initialData?.title || 'Votre boutique',
      storeDescription: settingsString(settings, 'store_description') || settingsString(settings, 'description'),
      storePathBase: '',
      primaryColor: settingsColor(settings, 'primary') || '#16C784',
      logoUrl: settingsString(settings, 'logo_url'),
      contactEmail: settingsString(settings, 'contact_email'),
      contactPhone: settingsString(settings, 'contact_phone'),
      address: settingsString(settings, 'address'),
      city: settingsString(settings, 'city'),
      country: settingsString(settings, 'country'),
      shippingMode: typeof builderStore?.shipping_mode === 'string' ? builderStore.shipping_mode : undefined,
      shippingPolicy: settingsString(settings, 'shipping_policy'),
      returnsPolicy: settingsString(settings, 'returns_policy'),
      paymentPolicy: settingsString(settings, 'payment_policy'),
      products: builderProducts,
    };
  }, [builderProducts, builderStore, initialData?.title]);

  const refreshDynamicBlockPreview = useCallback((component: DynamicEditorComponent | null, attrs: DynamicBlockAttributes) => {
    const blockType = attrs['data-pd-block'];
    if (!component?.components || !blockType) return;
    const preview = dynamicPreviewContent(blockType, attrs, dynamicPreviewContext);
    previewRefreshRef.current = true;
    if (preview.style) {
      component.setStyle?.(styleAttributeToObject(preview.style));
    }
    component.components(preview.innerHtml);
    window.setTimeout(() => {
      previewRefreshRef.current = false;
    }, 0);
  }, [dynamicPreviewContext]);

  const findDynamicComponent = useCallback((component: unknown): DynamicEditorComponent | null => {
    let current = component as DynamicEditorComponent | null;
    while (current) {
      const attrs = current.getAttributes?.() || {};
      if (attrs['data-pd-block']) return current;
      current = current.parent?.() as DynamicEditorComponent | null;
    }
    return null;
  }, []);

  const syncDynamicSelection = useCallback((component: unknown) => {
    const dynamicComponent = findDynamicComponent(component);
    if (!dynamicComponent) {
      selectedComponentRef.current = null;
      setSelectedDynamicBlock(null);
      return;
    }
    selectedComponentRef.current = dynamicComponent;
    const attrs = dynamicComponent.getAttributes?.() || {};
    setSelectedDynamicBlock({
      blockType: attrs['data-pd-block'] || '',
      attrs,
    });
  }, [findDynamicComponent]);

  const updateDynamicBlockAttribute = useCallback((name: string, value: string) => {
    const component = selectedComponentRef.current;
    if (!component) return;
    component.addAttributes?.({ [name]: value });
    const attrs = component.getAttributes?.() || {};
    refreshDynamicBlockPreview(component, attrs);
    setSelectedDynamicBlock({
      blockType: attrs['data-pd-block'] || selectedDynamicBlock?.blockType || '',
      attrs,
    });
    setHasUnsavedChanges(true);
  }, [refreshDynamicBlockPreview, selectedDynamicBlock?.blockType]);

  const toggleDynamicProduct = useCallback((productId: string) => {
    const currentIds = parseProductIds(selectedDynamicBlock?.attrs['data-pd-product-ids']);
    const nextIds = currentIds.includes(productId)
      ? currentIds.filter((id) => id !== productId)
      : [...currentIds, productId].slice(0, 12);
    updateDynamicBlockAttribute('data-pd-product-ids', nextIds.join(','));
  }, [selectedDynamicBlock?.attrs, updateDynamicBlockAttribute]);

  const toggleDynamicCategory = useCallback((categorySlug: string) => {
    const currentSlugs = parseCategorySlugs(selectedDynamicBlock?.attrs['data-pd-category-slugs']);
    const normalizedSlug = slugSegment(categorySlug);
    const nextSlugs = currentSlugs.includes(normalizedSlug)
      ? currentSlugs.filter((slug) => slug !== normalizedSlug)
      : [...currentSlugs, normalizedSlug].slice(0, 12);
    updateDynamicBlockAttribute('data-pd-category-slugs', nextSlugs.join(','));
  }, [selectedDynamicBlock?.attrs, updateDynamicBlockAttribute]);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      try {
        const [storeRes, productsRes, categoriesRes] = await Promise.all([
          fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/stores/me/products?limit=100&status=published', { credentials: 'include' }),
          fetchWithCsrf('/api/pd/stores/me/categories', { credentials: 'include' }),
        ]);
        if (cancelled) return;
        if (storeRes.ok) {
          const data = await storeRes.json();
          setBuilderStore(data.store || null);
        }
        if (productsRes.ok) {
          const data = await productsRes.json();
          setBuilderProducts((data.data || []).map((product: BuilderProductOption) => ({
            id: product.id,
            title: product.title,
            slug: product.slug,
            price: product.price,
            thumbnail: product.thumbnail,
            images: product.images,
            status: product.status,
            category: product.category,
            marketplace_category_name: product.marketplace_category_name,
            marketplace_category_slug: product.marketplace_category_slug,
            storefront_category_name: product.storefront_category_name,
            storefront_category_slug: product.storefront_category_slug,
            storefront_parent_category_slug: product.storefront_parent_category_slug,
          })));
        }
        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setBuilderCategories(data.data || []);
        }
      } catch {
        if (!cancelled) {
          setBuilderStore(null);
          setBuilderProducts([]);
          setBuilderCategories([]);
        }
      }
    };
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedDynamicBlock) return;
    refreshDynamicBlockPreview(selectedComponentRef.current, selectedDynamicBlock.attrs);
  }, [refreshDynamicBlockPreview, selectedDynamicBlock]);

  // Initialize GrapesJS
  useEffect(() => {
    const containerEl = containerRef.current;
    const blockPanelEl = blockPanelRef.current;
    const selectorPanelEl = selectorPanelRef.current;
    const stylePanelEl = stylePanelRef.current;
    const layerPanelEl = layerPanelRef.current;
    if (!containerEl || !blockPanelEl || !selectorPanelEl || !stylePanelEl || !layerPanelEl) return;

    let cancelled = false;
    let editor: GrapesJSEditor | null = null;
    const resetMounts = () => {
      containerEl.replaceChildren();
      blockPanelEl.replaceChildren();
      selectorPanelEl.replaceChildren();
      stylePanelEl.replaceChildren();
      layerPanelEl.replaceChildren();
    };
    resetMounts();

    const initEditor = async () => {
      // Dynamic import to avoid SSR issues
      const grapesjs = (await import('grapesjs')).default;
      const blocksBasic = (await import('grapesjs-blocks-basic')).default;
      if (cancelled) return;

      const nextEditor = grapesjs.init({
        container: containerEl,
        height: '100%',
        width: 'auto',
        fromElement: false,
        storageManager: false, // We handle persistence ourselves
        plugins: [blocksBasic],
        pluginsOpts: {
          [blocksBasic as unknown as string]: {
            flexGrid: true,
            blocks: [
              'column1', 'column2', 'column3', 'column3-7',
              'text', 'link', 'image', 'video',
              'map', 'link-block', 'quote', 'text-basic',
            ],
          },
        },
        canvas: {
          styles: [
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
          ],
        },
        pageManager: {
          pages: [
            {
              id: 'main',
              type: 'main',
              component: '',
              styles: '',
            },
          ],
        },
        panels: {
          defaults: [],
        },
        // Custom block categories for e-commerce
        blockManager: {
          appendTo: blockPanelEl,
        },
        layerManager: {
          appendTo: layerPanelEl,
        },
        assetManager: {
          autoAdd: false,
          uploadFile: async (event: unknown) => {
            await uploadEditorAssets(uploadFilesFromEvent(event), nextEditor);
          },
        },
        selectorManager: {
          appendTo: selectorPanelEl,
          componentFirst: true,
        },
        styleManager: {
          appendTo: stylePanelEl,
          sectors: [
            {
              name: 'General',
              open: true,
              buildProps: [
                'float', 'display', 'position', 'top', 'right', 'left', 'bottom',
              ],
            },
            {
              name: 'Dimension',
              open: false,
              buildProps: [
                'width', 'height', 'max-width', 'min-height', 'margin', 'padding',
              ],
            },
            {
              name: 'Typography',
              open: false,
              buildProps: [
                'font-family', 'font-size', 'font-weight', 'letter-spacing',
                'color', 'line-height', 'text-align', 'text-decoration',
                'text-shadow',
              ],
            },
            {
              name: 'Decorations',
              open: false,
              buildProps: [
                'background-color', 'border-radius', 'border', 'box-shadow',
                'background',
              ],
            },
          ],
        },
        deviceManager: {
          devices: [
            { name: 'Desktop', width: '' },
            { name: 'Tablet', width: '768px', widthMedia: '992px' },
            { name: 'Mobile', width: '375px', widthMedia: '480px' },
          ],
        },
      }) as unknown as GrapesJSEditor;
      if (cancelled) {
        nextEditor.destroy();
        resetMounts();
        return;
      }
      editor = nextEditor;
      void loadStoreMediaAssets(editor);
      editor.runCommand?.('sw-visibility');
      setComponentsVisible(true);

      // Add custom e-commerce blocks
      addEcommerceBlocks(editor);
      window.setTimeout(() => collapseGrapesBlockCategories(blockPanelEl), 0);

      // Load initial data if available
      applyPageContentToGrapesEditor(editor, initialData?.builder_data, initialData?.html, initialData?.css);

      // Track changes
      editor.on('change:changesCount', () => {
        if (previewRefreshRef.current) return;
        setHasUnsavedChanges(true);
        updateUndoRedoState(nextEditor);
        refreshEditorSnapshot(nextEditor);
      });
      editor.on('component:add', () => {
        updateUndoRedoState(nextEditor);
        refreshEditorSnapshot(nextEditor);
      });
      editor.on('component:remove', () => {
        updateUndoRedoState(nextEditor);
        refreshEditorSnapshot(nextEditor);
      });
      editor.on('component:update', () => {
        updateUndoRedoState(nextEditor);
        refreshEditorSnapshot(nextEditor);
      });
      editor.on('component:selected', (component: unknown) => {
        selectedRawComponentRef.current = component as DynamicEditorComponent;
        syncDynamicSelection(component);
      });
      editor.on('component:deselected', () => {
        selectedRawComponentRef.current = null;
        selectedComponentRef.current = null;
        setSelectedDynamicBlock(null);
      });

      editorRef.current = editor;
      setEditorReady(true);
      updateUndoRedoState(editor);
      refreshEditorSnapshot(editor);
    };

    void initEditor();

    return () => {
      cancelled = true;
      editorRef.current = null;
      if (editor) {
        editor.destroy();
      }
      resetMounts();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Add e-commerce specific blocks
  const addEcommerceBlocks = (editor: GrapesJSEditor) => {
    // GrapesJS BlockManager is not exposed in the public type definitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bm = (editor as any).BlockManager;

    bm.add('hero-section', {
      label: blockLabel('Store Hero', 'hero'),
      category: 'E-Commerce',
      content: `
        <section data-pd-block="store-hero" data-pd-title="" data-pd-subtitle="" data-pd-image-url="" data-pd-image-position="center center" data-pd-image-fit="cover" style="padding: 80px 24px; text-align: center; background: linear-gradient(135deg, #1A1A2E 0%, #16213E 100%); color: white;">
          <h1 style="font-size: 48px; font-weight: 800; margin-bottom: 16px; font-family: Inter, sans-serif;">
            Hero connecté à la boutique
          </h1>
          <p style="font-size: 18px; color: #94A3B8; margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto;">
            Ce bloc utilisera automatiquement le nom, le logo, la description et les couleurs de votre boutique sur la page publique.
          </p>
          <a href="#" style="display: inline-block; padding: 14px 32px; background: #16C784; color: white; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px;">
            Explorer le catalogue
          </a>
        </section>
      `,
    });

    bm.add('product-grid', {
      label: blockLabel('Product Grid', 'products'),
      category: 'E-Commerce',
      content: `
        <section data-pd-block="product-grid" data-pd-title="Nos produits" data-pd-subtitle="Découvrez les articles disponibles dans cette boutique." data-pd-limit="8" style="padding: 48px 24px; max-width: 1200px; margin: 0 auto;">
          <h2 style="font-size: 30px; font-weight: 700; margin-bottom: 32px; font-family: Inter, sans-serif;">
            Grille produits dynamique
          </h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 24px;">
            <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
              <div style="aspect-ratio: 1; background: #F3F4F6;"></div>
              <div style="padding: 16px;">
                <p style="font-weight: 600; margin-bottom: 4px;">Produit publié</p>
                <p style="color: #16C784; font-weight: 700;">Prix réel</p>
              </div>
            </div>
            <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
              <div style="aspect-ratio: 1; background: #F3F4F6;"></div>
              <div style="padding: 16px;">
                <p style="font-weight: 600; margin-bottom: 4px;">Produit publié</p>
                <p style="color: #16C784; font-weight: 700;">Prix réel</p>
              </div>
            </div>
            <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
              <div style="aspect-ratio: 1; background: #F3F4F6;"></div>
              <div style="padding: 16px;">
                <p style="font-weight: 600; margin-bottom: 4px;">Produit publié</p>
                <p style="color: #16C784; font-weight: 700;">Prix réel</p>
              </div>
            </div>
          </div>
        </section>
      `,
    });

    bm.add('featured-products', {
      label: blockLabel('Featured Products', 'products'),
      category: 'E-Commerce',
      content: `
        <section data-pd-block="featured-products" data-pd-title="Produits sélectionnés" data-pd-subtitle="Mettez en avant vos meilleurs articles." data-pd-limit="4" style="padding: 48px 24px; max-width: 1200px; margin: 0 auto; background: #FFFFFF;">
          <p style="color: #16C784; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;">Dynamique</p>
          <h2 style="font-size: 30px; font-weight: 800; margin-bottom: 12px; font-family: Inter, sans-serif;">Produits mis en avant</h2>
          <p style="color: #6B7280; margin-bottom: 28px;">Ce bloc affichera automatiquement vos derniers produits publiés.</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px;">
            <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 28px; text-align: center; color: #6B7280;">Produit réel</div>
            <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 28px; text-align: center; color: #6B7280;">Produit réel</div>
            <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 28px; text-align: center; color: #6B7280;">Produit réel</div>
            <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 28px; text-align: center; color: #6B7280;">Produit réel</div>
          </div>
        </section>
      `,
    });

    bm.add('category-showcase', {
      label: blockLabel('Categories', 'collections'),
      category: 'E-Commerce',
      content: `
        <section data-pd-block="category-showcase" data-pd-title="Collections de la boutique" data-pd-limit="6" style="padding: 56px 24px; background: #F9FAFB;">
          <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
            <p style="color: #16C784; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;">Dynamique</p>
            <h2 style="font-size: 30px; font-weight: 800; margin-bottom: 28px; font-family: Inter, sans-serif;">Collections réelles</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 20px;">
              <div style="min-height: 160px; border-radius: 20px; background: #111827; color: white; display: grid; place-items: center;">Catégorie réelle</div>
              <div style="min-height: 160px; border-radius: 20px; background: #111827; color: white; display: grid; place-items: center;">Catégorie réelle</div>
              <div style="min-height: 160px; border-radius: 20px; background: #111827; color: white; display: grid; place-items: center;">Catégorie réelle</div>
            </div>
          </div>
        </section>
      `,
    });

    bm.add('store-contact', {
      label: blockLabel('Store Contact', 'contact'),
      category: 'E-Commerce',
      content: `
        <section data-pd-block="store-contact" data-pd-title="Contactez la boutique" style="padding: 56px 24px; max-width: 980px; margin: 0 auto;">
          <div style="border: 1px solid #E5E7EB; border-radius: 28px; padding: 40px; background: white;">
            <p style="color: #16C784; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;">Dynamique</p>
            <h2 style="font-size: 30px; font-weight: 800; margin-bottom: 12px; font-family: Inter, sans-serif;">Contact réel de la boutique</h2>
            <p style="color: #6B7280; margin-bottom: 24px;">Ce bloc affichera l&apos;email, le téléphone et l&apos;adresse configurés dans les paramètres de boutique.</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
              <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 18px; color: #6B7280;">Email réel</div>
              <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 18px; color: #6B7280;">Téléphone réel</div>
              <div style="border: 1px dashed #D1D5DB; border-radius: 16px; padding: 18px; color: #6B7280;">Adresse réelle</div>
            </div>
          </div>
        </section>
      `,
    });

    bm.add('shipping-policy', {
      label: blockLabel('Shipping Policy', 'shipping'),
      category: 'E-Commerce',
      content: `
        <section data-pd-block="shipping-policy" data-pd-title="Livraison" data-pd-subtitle="Informations de préparation, livraison et suivi pour cette boutique." style="padding: 56px 24px; background: #F9FAFB;">
          <div style="max-width: 980px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 28px; background: white; padding: 40px;">
            <p style="color: #16C784; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;">Dynamique</p>
            <h2 style="font-size: 30px; font-weight: 800; margin-bottom: 12px; font-family: Inter, sans-serif;">Politique livraison réelle</h2>
            <p style="color: #6B7280; margin-bottom: 20px;">Ce bloc utilise le mode de livraison et le texte de politique configurés dans la boutique.</p>
            <div style="border-left: 4px solid #16C784; padding: 16px 18px; background: #F9FAFB; border-radius: 14px; color: #374151;">Livraison boutique</div>
          </div>
        </section>
      `,
    });

    bm.add('payment-policy', {
      label: blockLabel('Payment Policy', 'payment'),
      category: 'E-Commerce',
      content: `
        <section data-pd-block="payment-policy" data-pd-title="Paiement sécurisé" data-pd-subtitle="Les modes de paiement disponibles sont présentés au checkout selon le type de produits commandés." style="padding: 56px 24px; max-width: 1100px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 28px;">
            <p style="color: #16C784; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;">Dynamique</p>
            <h2 style="font-size: 30px; font-weight: 800; margin-bottom: 12px; font-family: Inter, sans-serif;">Paiements de la boutique</h2>
            <p style="color: #6B7280;">Ce bloc décrit les méthodes de paiement disponibles sans exposer de configuration secrète.</p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px;">
            <div style="border: 1px dashed #D1D5DB; border-radius: 18px; padding: 18px; color: #6B7280;">Flouci</div>
            <div style="border: 1px dashed #D1D5DB; border-radius: 18px; padding: 18px; color: #6B7280;">Konnect</div>
            <div style="border: 1px dashed #D1D5DB; border-radius: 18px; padding: 18px; color: #6B7280;">Mandat / COD</div>
          </div>
        </section>
      `,
    });

    bm.add('store-policies', {
      label: blockLabel('Store Policies', 'policies'),
      category: 'E-Commerce',
      content: `
        <section data-pd-block="store-policies" data-pd-title="Politiques de la boutique" data-pd-subtitle="Les informations essentielles avant de commander." style="padding: 64px 24px; background: linear-gradient(180deg, #FFFFFF, #F9FAFB);">
          <div style="max-width: 1180px; margin: 0 auto; text-align: center;">
            <p style="color: #16C784; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;">Dynamique</p>
            <h2 style="font-size: 30px; font-weight: 800; margin-bottom: 12px; font-family: Inter, sans-serif;">Politiques réelles</h2>
            <p style="color: #6B7280; margin-bottom: 28px;">Ce bloc regroupe livraison, retours et paiement depuis les paramètres de boutique.</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; text-align: left;">
              <article style="border: 1px dashed #D1D5DB; border-radius: 22px; padding: 24px; background: white;">Livraison</article>
              <article style="border: 1px dashed #D1D5DB; border-radius: 22px; padding: 24px; background: white;">Retours</article>
              <article style="border: 1px dashed #D1D5DB; border-radius: 22px; padding: 24px; background: white;">Paiement</article>
            </div>
          </div>
        </section>
      `,
    });

    bm.add('testimonials', {
      label: blockLabel('Testimonials', 'testimonials'),
      category: 'E-Commerce',
      content: `
        <section style="padding: 48px 24px; background: #F9FAFB;">
          <h2 style="font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 32px; font-family: Inter, sans-serif;">
            Ce que disent nos clients
          </h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; max-width: 1000px; margin: 0 auto;">
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #F5A623; margin-bottom: 8px;">★★★★★</p>
              <p style="color: #374151; margin-bottom: 12px;">"Excellent service et produits de qualité. Je recommande vivement !"</p>
              <p style="font-weight: 600; font-size: 14px;">— Client satisfait</p>
            </div>
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #F5A623; margin-bottom: 8px;">★★★★★</p>
              <p style="color: #374151; margin-bottom: 12px;">"Livraison rapide et emballage soigné. Très satisfait de mon achat."</p>
              <p style="font-weight: 600; font-size: 14px;">— Client fidèle</p>
            </div>
          </div>
        </section>
      `,
    });

    bm.add('cta-banner', {
      label: blockLabel('CTA Banner', 'banner'),
      category: 'E-Commerce',
      content: `
        <section style="padding: 48px 24px; background: #16C784; text-align: center; color: white;">
          <h2 style="font-size: 30px; font-weight: 700; margin-bottom: 12px; font-family: Inter, sans-serif;">
            Offre spéciale — Livraison gratuite !
          </h2>
          <p style="font-size: 16px; opacity: 0.9; margin-bottom: 24px;">
            Sur toutes les commandes de plus de 100 TND. Offre limitée.
          </p>
          <a href="#" style="display: inline-block; padding: 14px 32px; background: white; color: #16C784; border-radius: 8px; font-weight: 700; text-decoration: none;">
            En profiter maintenant
          </a>
        </section>
      `,
    });

    bm.add('footer', {
      label: blockLabel('Footer', 'footer'),
      category: 'E-Commerce',
      content: `
        <footer style="padding: 48px 24px; background: #1A1A2E; color: #94A3B8;">
          <div style="max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 32px;">
            <div>
              <h3 style="color: white; font-weight: 700; margin-bottom: 16px;">Notre Boutique</h3>
              <p style="font-size: 14px; line-height: 1.6;">Votre destination pour des produits de qualité en Tunisie.</p>
            </div>
            <div>
              <h3 style="color: white; font-weight: 700; margin-bottom: 16px;">Liens</h3>
              <ul style="list-style: none; padding: 0; font-size: 14px; line-height: 2;">
                <li><a href="#" style="color: #94A3B8; text-decoration: none;">Accueil</a></li>
                <li><a href="#" style="color: #94A3B8; text-decoration: none;">Catalogue</a></li>
                <li><a href="#" style="color: #94A3B8; text-decoration: none;">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 style="color: white; font-weight: 700; margin-bottom: 16px;">Contact</h3>
              <p style="font-size: 14px; line-height: 2;">contact@maboutique.tn<br/>+216 XX XXX XXX</p>
            </div>
          </div>
          <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #2D2D4A; font-size: 12px;">
            Propulsé par votre marketplace
          </div>
        </footer>
      `,
    });

    bm.add('newsletter', { label: blockLabel('Newsletter', 'newsletter'), category: 'Marketing', content: `<section style="padding:48px 24px;background:#F0FDF4;text-align:center;"><h2 style="font-size:24px;font-weight:700;margin-bottom:8px;">Restez informé</h2><p style="color:#6B7280;margin-bottom:24px;font-size:14px;">Inscrivez-vous pour recevoir nos offres exclusives.</p><div style="display:flex;gap:8px;max-width:420px;margin:0 auto;"><input type="email" placeholder="votre@email.com" style="flex:1;padding:12px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:14px;"/><button style="padding:12px 24px;background:#16C784;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">S'inscrire</button></div></section>` });

    bm.add('video-hero', { label: blockLabel('Video Hero', 'video'), category: 'Media', content: `<section style="padding:48px 24px;text-align:center;background:#0F0F23;color:white;"><h2 style="font-size:30px;font-weight:700;margin-bottom:24px;">Découvrez notre histoire</h2><div style="max-width:720px;margin:0 auto;aspect-ratio:16/9;background:#1A1A2E;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:48px;">▶️</div><p style="color:#94A3B8;margin-top:16px;font-size:14px;">Regardez comment nos produits sont fabriqués</p></section>` });

    bm.add('faq-accordion', { label: blockLabel('FAQ', 'faq'), category: 'Content', content: `<section style="padding:48px 24px;max-width:800px;margin:0 auto;"><h2 style="font-size:30px;font-weight:700;text-align:center;margin-bottom:32px;">Questions fréquentes</h2><div style="border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;"><div style="padding:20px 24px;border-bottom:1px solid #E5E7EB;"><p style="font-weight:600;margin:0;">Quels sont les délais de livraison ?</p><p style="color:#6B7280;margin-top:8px;font-size:14px;">3 à 5 jours ouvrables partout en Tunisie.</p></div><div style="padding:20px 24px;border-bottom:1px solid #E5E7EB;"><p style="font-weight:600;margin:0;">Comment retourner un produit ?</p><p style="color:#6B7280;margin-top:8px;font-size:14px;">14 jours pour retourner un produit non utilisé.</p></div><div style="padding:20px 24px;"><p style="font-weight:600;margin:0;">Quels modes de paiement ?</p><p style="color:#6B7280;margin-top:8px;font-size:14px;">Flouci, Konnect, Mandat Minute et COD.</p></div></div></section>` });

    bm.add('team-about', { label: blockLabel('Team / About', 'team'), category: 'Content', content: `<section style="padding:48px 24px;text-align:center;"><h2 style="font-size:30px;font-weight:700;margin-bottom:8px;">Notre Équipe</h2><p style="color:#6B7280;margin-bottom:32px;">Des passionnés dédiés à vous offrir le meilleur.</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:700px;margin:0 auto;"><div><div style="width:80px;height:80px;border-radius:50%;background:#E5E7EB;margin:0 auto 12px;"></div><p style="font-weight:600;">Ahmed</p><p style="font-size:14px;color:#6B7280;">Fondateur</p></div><div><div style="width:80px;height:80px;border-radius:50%;background:#E5E7EB;margin:0 auto 12px;"></div><p style="font-weight:600;">Sarra</p><p style="font-size:14px;color:#6B7280;">Design</p></div><div><div style="width:80px;height:80px;border-radius:50%;background:#E5E7EB;margin:0 auto 12px;"></div><p style="font-weight:600;">Youssef</p><p style="font-size:14px;color:#6B7280;">Logistique</p></div></div></section>` });

    bm.add('countdown-timer', { label: blockLabel('Countdown', 'countdown'), category: 'Marketing', content: `<section style="padding:48px 24px;background:linear-gradient(135deg,#EA3943,#FF6B6B);text-align:center;color:white;"><p style="font-size:14px;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:8px;">Offre limitée</p><h2 style="font-size:36px;font-weight:800;margin-bottom:24px;">Soldes Flash !</h2><div style="display:flex;justify-content:center;gap:16px;margin-bottom:24px;"><div style="background:rgba(255,255,255,0.2);padding:16px 20px;border-radius:8px;min-width:70px;"><p style="font-size:32px;font-weight:800;margin:0;">02</p><p style="font-size:11px;margin:0;">JOURS</p></div><div style="background:rgba(255,255,255,0.2);padding:16px 20px;border-radius:8px;min-width:70px;"><p style="font-size:32px;font-weight:800;margin:0;">14</p><p style="font-size:11px;margin:0;">HEURES</p></div><div style="background:rgba(255,255,255,0.2);padding:16px 20px;border-radius:8px;min-width:70px;"><p style="font-size:32px;font-weight:800;margin:0;">37</p><p style="font-size:11px;margin:0;">MIN</p></div></div><a href="#" style="display:inline-block;padding:14px 32px;background:white;color:#EA3943;border-radius:8px;font-weight:700;text-decoration:none;">Voir les offres</a></section>` });

    bm.add('image-carousel', { label: blockLabel('Carousel', 'carousel'), category: 'Media', content: `<section style="padding:48px 24px;"><div style="display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:16px;"><div style="min-width:300px;aspect-ratio:4/3;background:#F3F4F6;border-radius:12px;scroll-snap-align:start;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#9CA3AF;">Image 1</div><div style="min-width:300px;aspect-ratio:4/3;background:#F3F4F6;border-radius:12px;scroll-snap-align:start;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#9CA3AF;">Image 2</div><div style="min-width:300px;aspect-ratio:4/3;background:#F3F4F6;border-radius:12px;scroll-snap-align:start;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#9CA3AF;">Image 3</div><div style="min-width:300px;aspect-ratio:4/3;background:#F3F4F6;border-radius:12px;scroll-snap-align:start;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#9CA3AF;">Image 4</div></div></section>` });

    bm.add('brand-logos', { label: blockLabel('Brand Logos', 'logos'), category: 'Marketing', content: `<section style="padding:32px 24px;background:#F9FAFB;text-align:center;"><p style="font-size:12px;text-transform:uppercase;letter-spacing:0.15em;color:#9CA3AF;margin-bottom:24px;">Ils nous font confiance</p><div style="display:flex;justify-content:center;align-items:center;gap:40px;flex-wrap:wrap;opacity:0.5;"><div style="width:100px;height:40px;background:#D1D5DB;border-radius:4px;"></div><div style="width:100px;height:40px;background:#D1D5DB;border-radius:4px;"></div><div style="width:100px;height:40px;background:#D1D5DB;border-radius:4px;"></div><div style="width:100px;height:40px;background:#D1D5DB;border-radius:4px;"></div><div style="width:100px;height:40px;background:#D1D5DB;border-radius:4px;"></div></div></section>` });

    bm.add('pricing-table', { label: blockLabel('Pricing', 'pricing'), category: 'Content', content: `<section style="padding:48px 24px;text-align:center;"><h2 style="font-size:30px;font-weight:700;margin-bottom:32px;">Nos Tarifs</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:24px;max-width:900px;margin:0 auto;"><div style="border:1px solid #E5E7EB;border-radius:12px;padding:32px 24px;"><h3 style="font-weight:600;margin-bottom:8px;">Basic</h3><p style="font-size:36px;font-weight:800;color:#16C784;margin-bottom:16px;">29 <span style="font-size:16px;">TND</span></p><ul style="list-style:none;padding:0;font-size:14px;color:#6B7280;line-height:2.2;text-align:left;"><li>✓ Feature 1</li><li>✓ Feature 2</li></ul><a href="#" style="display:block;margin-top:24px;padding:12px;background:#16C784;color:white;border-radius:8px;text-decoration:none;font-weight:600;text-align:center;">Choisir</a></div><div style="border:2px solid #16C784;border-radius:12px;padding:32px 24px;"><h3 style="font-weight:600;margin-bottom:8px;">Pro</h3><p style="font-size:36px;font-weight:800;color:#16C784;margin-bottom:16px;">59 <span style="font-size:16px;">TND</span></p><ul style="list-style:none;padding:0;font-size:14px;color:#6B7280;line-height:2.2;text-align:left;"><li>✓ Feature 1</li><li>✓ Feature 2</li><li>✓ Feature 3</li></ul><a href="#" style="display:block;margin-top:24px;padding:12px;background:#16C784;color:white;border-radius:8px;text-decoration:none;font-weight:600;text-align:center;">Choisir</a></div></div></section>` });

    bm.add('contact-form', { label: blockLabel('Contact Form', 'form'), category: 'Content', content: `<section style="padding:48px 24px;max-width:600px;margin:0 auto;"><h2 style="font-size:30px;font-weight:700;text-align:center;margin-bottom:32px;">Contactez-nous</h2><form style="display:flex;flex-direction:column;gap:16px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;"><input type="text" placeholder="Nom" style="padding:12px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:14px;"/><input type="email" placeholder="Email" style="padding:12px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:14px;"/></div><input type="text" placeholder="Sujet" style="padding:12px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:14px;"/><textarea placeholder="Votre message..." rows="5" style="padding:12px 16px;border:1px solid #D1D5DB;border-radius:8px;font-size:14px;resize:vertical;"></textarea><button type="submit" style="padding:14px;background:#16C784;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:16px;">Envoyer</button></form></section>` });

    bm.add('map-embed', { label: blockLabel('Map', 'map'), category: 'Content', content: `<section style="padding:48px 24px;"><h2 style="font-size:24px;font-weight:700;text-align:center;margin-bottom:24px;">Nous trouver</h2><div style="max-width:800px;margin:0 auto;aspect-ratio:16/9;background:#E5E7EB;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#9CA3AF;"><p style="text-align:center;">📍 Intégrez votre carte Google Maps ici</p></div></section>` });

    bm.add('blog-section', { label: blockLabel('Blog', 'blog'), category: 'Content', content: `<section style="padding:48px 24px;max-width:1200px;margin:0 auto;"><h2 style="font-size:30px;font-weight:700;margin-bottom:32px;">Notre Blog</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px;"><article style="border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;"><div style="aspect-ratio:16/9;background:#F3F4F6;"></div><div style="padding:20px;"><p style="font-size:12px;color:#16C784;font-weight:600;margin-bottom:8px;">CONSEILS</p><h3 style="font-weight:600;margin-bottom:8px;">Comment choisir le bon produit</h3><p style="font-size:14px;color:#6B7280;">Découvrez nos conseils...</p></div></article><article style="border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;"><div style="aspect-ratio:16/9;background:#F3F4F6;"></div><div style="padding:20px;"><p style="font-size:12px;color:#16C784;font-weight:600;margin-bottom:8px;">NOUVEAUTÉS</p><h3 style="font-weight:600;margin-bottom:8px;">Les tendances de la saison</h3><p style="font-size:14px;color:#6B7280;">Les dernières tendances...</p></div></article></div></section>` });

    bm.add('size-guide', { label: blockLabel('Size Guide', 'size'), category: 'E-Commerce', content: `<section style="padding:48px 24px;max-width:800px;margin:0 auto;"><h2 style="font-size:24px;font-weight:700;text-align:center;margin-bottom:24px;">Guide des tailles</h2><table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="background:#F3F4F6;"><th style="padding:12px 16px;text-align:left;border-bottom:2px solid #E5E7EB;">Taille</th><th style="padding:12px 16px;text-align:center;border-bottom:2px solid #E5E7EB;">Poitrine</th><th style="padding:12px 16px;text-align:center;border-bottom:2px solid #E5E7EB;">Taille</th><th style="padding:12px 16px;text-align:center;border-bottom:2px solid #E5E7EB;">Hanches</th></tr></thead><tbody><tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;font-weight:600;">S</td><td style="padding:12px 16px;text-align:center;border-bottom:1px solid #E5E7EB;">86-91</td><td style="padding:12px 16px;text-align:center;border-bottom:1px solid #E5E7EB;">66-71</td><td style="padding:12px 16px;text-align:center;border-bottom:1px solid #E5E7EB;">91-96</td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;font-weight:600;">M</td><td style="padding:12px 16px;text-align:center;border-bottom:1px solid #E5E7EB;">91-96</td><td style="padding:12px 16px;text-align:center;border-bottom:1px solid #E5E7EB;">71-76</td><td style="padding:12px 16px;text-align:center;border-bottom:1px solid #E5E7EB;">96-101</td></tr><tr><td style="padding:12px 16px;font-weight:600;">L</td><td style="padding:12px 16px;text-align:center;">96-101</td><td style="padding:12px 16px;text-align:center;">76-81</td><td style="padding:12px 16px;text-align:center;">101-106</td></tr></tbody></table></section>` });

    bm.add('shipping-info', { label: blockLabel('Shipping Info', 'shipping'), category: 'E-Commerce', content: `<section style="padding:48px 24px;background:#F9FAFB;"><h2 style="font-size:24px;font-weight:700;text-align:center;margin-bottom:32px;">Livraison & Retours</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:24px;max-width:900px;margin:0 auto;"><div style="text-align:center;padding:24px;"><div style="font-size:32px;margin-bottom:12px;">🚚</div><h3 style="font-weight:600;margin-bottom:8px;">Livraison rapide</h3><p style="font-size:14px;color:#6B7280;">3-5 jours ouvrables en Tunisie</p></div><div style="text-align:center;padding:24px;"><div style="font-size:32px;margin-bottom:12px;">🔄</div><h3 style="font-weight:600;margin-bottom:8px;">Retours gratuits</h3><p style="font-size:14px;color:#6B7280;">14 jours pour changer d'avis</p></div><div style="text-align:center;padding:24px;"><div style="font-size:32px;margin-bottom:12px;">🔒</div><h3 style="font-weight:600;margin-bottom:8px;">Paiement sécurisé</h3><p style="font-size:14px;color:#6B7280;">Flouci, Konnect, Mandat Minute</p></div></div></section>` });

    bm.add('return-policy', { label: blockLabel('Return Policy', 'returns'), category: 'E-Commerce', content: `<section style="padding:48px 24px;max-width:800px;margin:0 auto;"><h2 style="font-size:30px;font-weight:700;text-align:center;margin-bottom:32px;">Politique de retour</h2><div style="background:#F9FAFB;border-radius:12px;padding:32px;"><div style="margin-bottom:24px;"><h3 style="font-weight:600;margin-bottom:8px;">📦 Délai de retour</h3><p style="font-size:14px;color:#6B7280;">14 jours à compter de la réception.</p></div><div style="margin-bottom:24px;"><h3 style="font-weight:600;margin-bottom:8px;">✅ Conditions</h3><p style="font-size:14px;color:#6B7280;">Produit non utilisé, emballage d'origine.</p></div><div><h3 style="font-weight:600;margin-bottom:8px;">💰 Remboursement</h3><p style="font-size:14px;color:#6B7280;">Sous 5-7 jours ouvrables après vérification.</p></div></div></section>` });

    bm.add('instagram-feed', { label: blockLabel('Instagram', 'instagram'), category: 'Marketing', content: `<section style="padding:48px 24px;text-align:center;"><h2 style="font-size:24px;font-weight:700;margin-bottom:8px;">Suivez-nous sur Instagram</h2><p style="color:#6B7280;margin-bottom:24px;font-size:14px;">@votreboutique</p><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;max-width:600px;margin:0 auto;"><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div><div style="aspect-ratio:1;background:#F3F4F6;border-radius:4px;"></div></div></section>` });

    bm.add('trust-badges', { label: blockLabel('Trust Badges', 'policies'), category: 'E-Commerce', content: `<section style="padding:36px 24px;background:#FFFFFF;"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;max-width:1000px;margin:0 auto;"><div style="border:1px solid #E5E7EB;border-radius:18px;padding:20px;text-align:center;"><div style="font-size:28px;margin-bottom:8px;">🚚</div><h3 style="font-weight:800;margin-bottom:4px;">Livraison rapide</h3><p style="font-size:13px;color:#6B7280;">Partout en Tunisie</p></div><div style="border:1px solid #E5E7EB;border-radius:18px;padding:20px;text-align:center;"><div style="font-size:28px;margin-bottom:8px;">🔒</div><h3 style="font-weight:800;margin-bottom:4px;">Paiement sécurisé</h3><p style="font-size:13px;color:#6B7280;">Checkout protégé</p></div><div style="border:1px solid #E5E7EB;border-radius:18px;padding:20px;text-align:center;"><div style="font-size:28px;margin-bottom:8px;">💬</div><h3 style="font-weight:800;margin-bottom:4px;">Support boutique</h3><p style="font-size:13px;color:#6B7280;">Réponse rapide</p></div></div></section>` });

    bm.add('coupon-strip', { label: blockLabel('Coupon Strip', 'banner'), category: 'Marketing', content: `<section style="padding:36px 24px;background:linear-gradient(135deg,#1A1A2E,#3153B7);color:white;text-align:center;"><p style="font-size:12px;text-transform:uppercase;letter-spacing:.18em;color:#D6B779;margin-bottom:8px;">Code promo</p><h2 style="font-size:30px;font-weight:900;margin-bottom:12px;">-10% sur votre prochaine commande</h2><div style="display:inline-flex;align-items:center;gap:12px;border:1px dashed rgba(255,255,255,.45);border-radius:999px;padding:10px 18px;background:rgba(255,255,255,.12);"><span style="font-weight:900;letter-spacing:.18em;">WELCOME10</span><a href="#" style="color:#16C784;font-weight:800;text-decoration:none;">Acheter maintenant</a></div></section>` });

    bm.add('before-after', { label: blockLabel('Before / After', 'carousel'), category: 'Media', content: `<section style="padding:56px 24px;background:#F9FAFB;"><div style="max-width:1000px;margin:0 auto;text-align:center;"><h2 style="font-size:30px;font-weight:800;margin-bottom:10px;">Avant / Après</h2><p style="color:#6B7280;margin-bottom:28px;">Montrez clairement la valeur de vos produits ou services.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;"><div style="background:white;border:1px solid #E5E7EB;border-radius:20px;overflow:hidden;"><div style="aspect-ratio:4/3;background:#E5E7EB;display:grid;place-items:center;color:#9CA3AF;">Image avant</div><div style="padding:16px;font-weight:800;">Avant</div></div><div style="background:white;border:1px solid #E5E7EB;border-radius:20px;overflow:hidden;"><div style="aspect-ratio:4/3;background:#DCFCE7;display:grid;place-items:center;color:#16A34A;">Image après</div><div style="padding:16px;font-weight:800;">Après</div></div></div></div></section>` });

    bm.add('process-steps', { label: blockLabel('Process Steps', 'team'), category: 'Content', content: `<section style="padding:56px 24px;background:#FFFFFF;"><div style="max-width:980px;margin:0 auto;text-align:center;"><h2 style="font-size:30px;font-weight:800;margin-bottom:28px;">Comment ça marche ?</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px;text-align:left;"><div style="border:1px solid #E5E7EB;border-radius:18px;padding:22px;"><span style="display:inline-grid;place-items:center;width:34px;height:34px;border-radius:999px;background:#16C784;color:white;font-weight:900;margin-bottom:12px;">1</span><h3 style="font-weight:800;margin-bottom:6px;">Choisissez</h3><p style="font-size:14px;color:#6B7280;">Sélectionnez les produits adaptés à vos besoins.</p></div><div style="border:1px solid #E5E7EB;border-radius:18px;padding:22px;"><span style="display:inline-grid;place-items:center;width:34px;height:34px;border-radius:999px;background:#16C784;color:white;font-weight:900;margin-bottom:12px;">2</span><h3 style="font-weight:800;margin-bottom:6px;">Commandez</h3><p style="font-size:14px;color:#6B7280;">Validez votre panier avec un paiement sécurisé.</p></div><div style="border:1px solid #E5E7EB;border-radius:18px;padding:22px;"><span style="display:inline-grid;place-items:center;width:34px;height:34px;border-radius:999px;background:#16C784;color:white;font-weight:900;margin-bottom:12px;">3</span><h3 style="font-weight:800;margin-bottom:6px;">Recevez</h3><p style="font-size:14px;color:#6B7280;">Suivez la livraison jusqu’à réception.</p></div></div></div></section>` });

    bm.add('featured-quote', { label: blockLabel('Featured Quote', 'testimonials'), category: 'Content', content: `<section style="padding:56px 24px;background:#FFF8E8;"><blockquote style="max-width:820px;margin:0 auto;text-align:center;"><p style="font-size:28px;line-height:1.35;font-weight:800;color:#1A1A2E;margin-bottom:18px;">“Ajoutez ici une citation forte, un avis client premium ou une promesse de marque.”</p><footer style="color:#8A6F3D;font-weight:800;">— Client satisfait</footer></blockquote></section>` });
  };

  const persistPage = useCallback(async (opts: {
    mode?: 'manual' | 'autosave' | 'publish';
    isPublished?: boolean;
  } = {}) => {
    if (!editorRef.current || savingRef.current) return false;
    const mode = opts.mode || 'manual';
    const isAutosave = mode === 'autosave';
    const isPublish = mode === 'publish';
    savingRef.current = true;
    if (isAutosave) {
      setAutosaving(true);
    } else if (!isPublish) {
      setSaving(true);
    }
    if (!isAutosave) {
      setFeedback(null);
    }
    try {
      const editor = editorRef.current;
      const wrapper = editor.getWrapper();
      const payload: Record<string, unknown> = {
        builder_data: editor.getProjectData(),
        html: editorBodyHtml(editor.getHtml({ component: wrapper })),
        css: withPageGlobalStyleCss(editor.getCss({ component: wrapper }), globalStyles),
        seo_title: pageSettings.seo_title,
        seo_description: pageSettings.seo_description,
        og_image: pageSettings.og_image,
        noindex: pageSettings.noindex,
        show_in_navigation: pageSettings.show_in_navigation,
        show_in_footer: pageSettings.show_in_footer,
        sort_order: pageSettings.sort_order,
      };
      if (opts.isPublished !== undefined) {
        payload.is_published = opts.isPublished;
      }
      const res = await fetchWithCsrf(`/api/pd/page-builder/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null) as {
        page?: { slug?: string | null; is_homepage?: boolean | null };
        error?: { message?: string };
        message?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || 'Erreur de sauvegarde');
      }
      setHasUnsavedChanges(false);
      const savedAt = new Date().toLocaleTimeString('fr-FR');
      setLastSaved(savedAt);
      refreshEditorSnapshot(editor);
      recordActivity(
        isAutosave ? 'Autosave' : opts.isPublished !== undefined ? (opts.isPublished ? 'Published version' : 'Unpublished') : 'Draft saved',
        isAutosave ? `Brouillon autosauvegardé à ${savedAt}.` : opts.isPublished !== undefined ? (opts.isPublished ? 'Page publiée en ligne.' : 'Page retirée du public.') : `Brouillon sauvegardé à ${savedAt}.`,
        'success',
      );
      if (opts.isPublished !== undefined) {
        setIsPublished(opts.isPublished);
        await revalidatePageBuilderCache({
          storeId,
          slug: data?.page?.slug || initialData?.slug,
          homepage: Boolean(data?.page?.is_homepage ?? initialData?.is_homepage),
        });
        if (opts.isPublished) {
          void loadVersions();
        }
      }
      setFeedback({
        type: 'success',
        message: isAutosave
          ? 'Brouillon autosauvegardé.'
          : opts.isPublished !== undefined
            ? opts.isPublished ? 'Page publiée.' : 'Page dépubliée.'
            : 'Brouillon sauvegardé.',
      });
      if (!isAutosave) {
        onSave?.();
      }
      return true;
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erreur de sauvegarde',
      });
      return false;
    } finally {
      savingRef.current = false;
      if (isAutosave) {
        setAutosaving(false);
      } else if (!isPublish) {
        setSaving(false);
      }
    }
  }, [globalStyles, initialData, loadVersions, onSave, pageId, pageSettings, recordActivity, refreshEditorSnapshot, storeId]);

  // Save handler
  const handleSave = useCallback(() => {
    void persistPage({ mode: 'manual' });
  }, [persistPage]);

  const handlePreview = useCallback(async () => {
    if (!editorReady || previewing) return;
    const host = storeHost?.trim();
    if (!host) {
      setFeedback({ type: 'error', message: 'Impossible de déterminer le lien de la boutique pour l’aperçu.' });
      return;
    }
    const previewWindow = window.open('about:blank', '_blank');
    setPreviewing(true);
    setFeedback(null);
    try {
      const saved = await persistPage({ mode: 'manual' });
      if (!saved) {
        previewWindow?.close();
        return;
      }
      const res = await fetchWithCsrf(`/api/pd/page-builder/pages/${pageId}/preview`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => null) as {
        token?: string;
        page?: { slug?: string; is_homepage?: boolean };
        error?: { message?: string };
        message?: string;
      } | null;
      if (!res.ok || !data?.token || !data.page?.slug) {
        throw new Error(data?.error?.message || data?.message || 'Impossible de générer l’aperçu');
      }
      const previewPath = data.page.is_homepage
        ? `/store/${encodeURIComponent(host)}`
        : `/store/${encodeURIComponent(host)}/pages/${encodeURIComponent(data.page.slug)}`;
      const previewUrl = `${previewPath}?pb_preview=${encodeURIComponent(data.token)}`;
      if (previewWindow) {
        previewWindow.opener = null;
        previewWindow.location.href = previewUrl;
      } else {
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
      }
      setFeedback({ type: 'success', message: 'Aperçu du brouillon ouvert.' });
    } catch (err) {
      previewWindow?.close();
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Impossible de générer l’aperçu',
      });
    } finally {
      setPreviewing(false);
    }
  }, [editorReady, pageId, persistPage, previewing, storeHost]);

  // Publish/Unpublish handler
  const handleTogglePublish = useCallback(async () => {
    if (!editorRef.current) return;
    setPublishing(true);
    try {
      const newPublished = !isPublished;
      if (newPublished) {
        setPublishChecklistOpen(true);
        const openIssues = publishChecklist.filter((item) => !item.ok);
        if (openIssues.length && !window.confirm(`Publier avec ${openIssues.length} point(s) à vérifier ?`)) {
          return;
        }
      }
      await persistPage({ mode: 'publish', isPublished: newPublished });
    } finally {
      setPublishing(false);
    }
  }, [isPublished, persistPage, publishChecklist]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  useEffect(() => {
    if (!initialNotice) return;
    setFeedback({ type: 'success', message: initialNotice });
  }, [initialNotice]);

  useEffect(() => {
    if (!pageSettings.og_image) {
      setSeoImageMeta(null);
      return;
    }
    const src = pageSettings.og_image;
    setSeoImageMeta({ url: src, status: 'loading' });
    const image = new Image();
    image.onload = () => {
      setSeoImageMeta({
        url: src,
        status: 'loaded',
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      setSeoImageMeta({ url: src, status: 'error' });
    };
    image.src = src;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [pageSettings.og_image]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!editorReady || !hasUnsavedChanges || savingRef.current) return;
    const timeout = window.setTimeout(() => {
      void persistPage({ mode: 'autosave' });
    }, 30000);
    return () => window.clearTimeout(timeout);
  }, [editorReady, hasUnsavedChanges, persistPage]);

  const handleBack = () => {
    if (hasUnsavedChanges && !window.confirm('Vous avez des changements non sauvegardés. Quitter quand même ?')) {
      return;
    }
    onBack?.();
  };

  const handleUndo = useCallback(() => {
    const editor = editorRef.current;
    const undoManager = editor?.UndoManager;
    if (!undoManager?.hasUndo?.()) return;
    undoManager.undo();
    setHasUnsavedChanges(true);
    window.setTimeout(() => {
      updateUndoRedoState(editor);
      refreshEditorSnapshot(editor);
    }, 0);
  }, [refreshEditorSnapshot, updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    const editor = editorRef.current;
    const undoManager = editor?.UndoManager;
    if (!undoManager?.hasRedo?.()) return;
    undoManager.redo();
    setHasUnsavedChanges(true);
    window.setTimeout(() => {
      updateUndoRedoState(editor);
      refreshEditorSnapshot(editor);
    }, 0);
  }, [refreshEditorSnapshot, updateUndoRedoState]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !isEditableKeyboardTarget(e.target)) {
        e.preventDefault();
        handleUndo();
      }
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        if (!isEditableKeyboardTarget(e.target)) {
          e.preventDefault();
          handleRedo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleRedo, handleSave, handleUndo]);

  const handleDeviceChange = (device: string) => {
    editorRef.current?.setDevice(device);
    setActiveDevice(device);
    setDeviceMenuOpen(false);
    if (device === 'Mobile' && mobileWarnings.length) {
      setFeedback({ type: 'error', message: `Mobile: ${mobileWarnings.length} point(s) à vérifier avant publication.` });
      recordActivity('Mobile warning', `${mobileWarnings.length} point(s) détecté(s).`, 'warning');
    }
  };

  const handleToggleComponentsVisible = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextVisible = !componentsVisible;
    if (nextVisible) {
      editor.runCommand?.('sw-visibility');
    } else {
      editor.stopCommand?.('sw-visibility');
    }
    setComponentsVisible(nextVisible);
  };

  const handleOpenAssets = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.AssetManager.open();
    void loadStoreMediaAssets(editor, true);
  };

  const handleChooseDynamicImage = () => {
    const editor = editorRef.current;
    if (!editor) return;
    void loadStoreMediaAssets(editor);
    editor.AssetManager.open({
      types: ['image'],
      accept: 'image/*',
      select: (asset, complete) => {
        const src = normalizePublicAssetUrl(asset.getSrc());
        if (!src) return;
        updateDynamicBlockAttribute('data-pd-image-url', src);
        if (complete) editor.AssetManager.close();
      },
    });
  };


  const handleChoosePageOgImage = () => {
    if (!editorReady) return;
    setSeoImagePickerOpen(true);
    setSeoImagePickerError('');
    void loadStoreMediaAssets(editorRef.current);
  };

  const handleSelectPageOgImage = (url: string) => {
    const src = normalizePublicAssetUrl(url);
    if (!src) return;
    updatePageSetting('og_image', src);
    setSeoImagePickerOpen(false);
    setSeoImagePickerError('');
    setFeedback({ type: 'success', message: 'Image de partage mise à jour.' });
  };

  const handleUseHeroImageForSeo = () => {
    if (!heroImageUrl) return;
    updatePageSetting('og_image', heroImageUrl);
    setFeedback({ type: 'success', message: 'Image hero utilisée comme image de partage.' });
  };

  const handleUploadPageOgImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !editorRef.current) return;
    setAssetUploading(true);
    setSeoImagePickerError('');
    try {
      const asset = await uploadEditorAsset(file, editorRef.current);
      updatePageSetting('og_image', asset.src);
      setSeoImagePickerOpen(false);
      setFeedback({ type: 'success', message: 'Image importée et définie comme image de partage.' });
      await loadStoreMediaAssets(editorRef.current);
    } catch (err) {
      setSeoImagePickerError(err instanceof Error ? err.message : 'Import image échoué');
    } finally {
      setAssetUploading(false);
    }
  };

  const handleGlobalStyleChange = (field: keyof PageGlobalStyles, value: string) => {
    const next = normalizeGlobalStyles({ ...globalStyles, [field]: value });
    setGlobalStyles(next);
    const editor = editorRef.current;
    if (editor) {
      const wrapper = editor.getWrapper();
      editor.setStyle(withPageGlobalStyleCss(editor.getCss({ component: wrapper }), next));
      refreshEditorSnapshot(editor);
    }
    setHasUnsavedChanges(true);
    recordActivity('Global styles', 'Styles globaux mis à jour.', 'info');
  };

  const handleSaveSelectedSection = () => {
    const component = selectedRawComponentRef.current || selectedComponentRef.current;
    const rawHtml = component?.toHTML?.() || '';
    const html = sanitizeTemplateHtml(rawHtml);
    if (!html) {
      setFeedback({ type: 'error', message: 'Sélectionnez une section sur la page avant de la sauvegarder.' });
      return;
    }
    const name = window.prompt('Nom de la section réutilisable', safeText(String(component?.get?.('name') || selectedDynamicBlock?.blockType || 'Section personnalisée'), 'Section personnalisée'));
    if (!name) return;
    const nextSections = [{ id: `${Date.now()}`, name: name.slice(0, 80), html, createdAt: new Date().toISOString() }, ...savedSections].slice(0, 20);
    setSavedSections(nextSections);
    window.localStorage.setItem(savedSectionsStorageKey, JSON.stringify(nextSections));
    setFeedback({ type: 'success', message: 'Section sauvegardée dans votre bibliothèque locale.' });
    recordActivity('Saved section', name.slice(0, 80), 'success');
  };

  const handleInsertSavedSection = (section: SavedSectionItem) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.addComponents(section.html);
    refreshEditorSnapshot(editor);
    setHasUnsavedChanges(true);
    setFeedback({ type: 'success', message: `Section "${section.name}" ajoutée.` });
  };

  const handleDeleteSavedSection = (sectionId: string) => {
    const nextSections = savedSections.filter((section) => section.id !== sectionId);
    setSavedSections(nextSections);
    window.localStorage.setItem(savedSectionsStorageKey, JSON.stringify(nextSections));
  };

  const handleExportTemplate = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const wrapper = editor.getWrapper();
    const html = editorBodyHtml(editor.getHtml({ component: wrapper }));
    const css = withPageGlobalStyleCss(editor.getCss({ component: wrapper }), globalStyles);
    const filenameBase = slugSegment(initialData?.slug || initialData?.title || 'page-template');
    downloadTemplateFile(`${filenameBase}-pandamarket-template.json`, {
      panda_template_version: '1.0',
      type: 'pandamarket-page-builder-template',
      name: initialData?.title || 'PandaMarket template',
      exported_at: new Date().toISOString(),
      html,
      css,
      settings: pageSettings,
      globalStyles,
    });
    recordActivity('Template export', 'Template JSON sécurisé téléchargé.', 'success');
  };

  const handleImportTemplate = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !editorRef.current) return;
    setTemplateImporting(true);
    try {
      const template = await readTemplateFile(file);
      const html = sanitizeTemplateHtml(template.html || '');
      const css = sanitizeTemplateCss(template.css || '');
      if (!html) throw new Error('Template vide après vérification de sécurité.');
      const importedStyles = normalizeGlobalStyles({ ...globalStyles, ...(template.globalStyles || {}) });
      editorRef.current.setComponents(html);
      editorRef.current.setStyle(withPageGlobalStyleCss(css, importedStyles));
      setGlobalStyles(importedStyles);
      setPageSettings((prev) => ({ ...prev, ...normalizeImportedSettings(template.settings) }));
      refreshEditorSnapshot(editorRef.current);
      setHasUnsavedChanges(true);
      setFeedback({ type: 'success', message: 'Template importé dans le brouillon après vérification de sécurité.' });
      recordActivity('Template import', template.name || file.name, 'success');
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Import template échoué' });
      recordActivity('Template import failed', err instanceof Error ? err.message : 'Import échoué', 'error');
    } finally {
      setTemplateImporting(false);
    }
  };

  const handleAiCopyHelper = async () => {
    if (!hasAiSeo) {
      setFeedback({ type: 'error', message: 'Assistant IA SEO disponible avec une option IA SEO active.' });
      return;
    }
    setAiCopyLoading(true);
    try {
      const res = await fetchWithCsrf('/api/pd/ai/page-copy-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          page_title: initialData?.title || builderStore?.name || 'Page boutique',
          current_seo_title: pageSettings.seo_title,
          current_seo_description: pageSettings.seo_description,
          section_outline: sectionOutline.map((section) => section.label).slice(0, 12),
          language: 'fr',
        }),
      });
      const data = await res.json().catch(() => null) as { suggestions?: { seo_title?: string; seo_description?: string; cta?: string }; error?: { message?: string }; message?: string } | null;
      if (!res.ok || !data?.suggestions) {
        throw new Error(data?.error?.message || data?.message || 'Assistant IA indisponible');
      }
      setPageSettings((prev) => ({
        ...prev,
        seo_title: data.suggestions?.seo_title?.slice(0, 200) || prev.seo_title,
        seo_description: data.suggestions?.seo_description?.slice(0, 320) || prev.seo_description,
      }));
      setHasUnsavedChanges(true);
      setFeedback({ type: 'success', message: `Suggestions IA appliquées. CTA proposé: ${data.suggestions.cta || 'Voir la boutique'}` });
      recordActivity('AI copy helper', 'Titre et description SEO proposés.', 'success');
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Assistant IA indisponible' });
    } finally {
      setAiCopyLoading(false);
    }
  };

  const deviceButtons = [
    { label: 'Desktop', icon: Monitor },
    { label: 'Tablet', icon: Tablet },
    { label: 'Mobile', icon: Smartphone },
  ];
  const activeDeviceButton = deviceButtons.find((device) => device.label === activeDevice) || deviceButtons[0];
  const ActiveDeviceIcon = activeDeviceButton.icon;
  const selectedProductIds = parseProductIds(selectedDynamicBlock?.attrs['data-pd-product-ids']);
  const selectedCategorySlugs = parseCategorySlugs(selectedDynamicBlock?.attrs['data-pd-category-slugs']);
  const selectedBlockType = selectedDynamicBlock?.blockType || '';
  const selectedHeroImagePosition = normalizeHeroImagePosition(selectedDynamicBlock?.attrs['data-pd-image-position']);
  const selectedHeroImageFit = normalizeHeroImageFit(selectedDynamicBlock?.attrs['data-pd-image-fit']);
  const selectedHeroFocus = heroImageFocusPercent(selectedHeroImagePosition);
  const selectedHeroPositionSelectValue = HERO_IMAGE_POSITION_OPTIONS.some((option) => option.value === selectedHeroImagePosition)
    ? selectedHeroImagePosition
    : '__custom__';

  return (
    <div data-testid="page-builder-editor" className="gjs-editor-shell h-screen flex flex-col bg-[#ECE7DD] text-[#1A1A2E]">
      <style>{`
        .gjs-editor-shell .gjs-one-bg,
        .gjs-editor-shell .gjs-two-bg,
        .gjs-editor-shell .gjs-three-bg,
        .gjs-editor-shell .gjs-four-bg {
          background: transparent;
        }

        .gjs-editor-shell .gjs-two-color,
        .gjs-editor-shell .gjs-four-color {
          color: #1A1A2E;
        }

        .gjs-editor-shell .gjs-cv-canvas,
        .gjs-editor-shell .gjs-cv-canvas__frames {
          background: #F6F3ED;
        }

        .gjs-editor-shell .gjs-pn-panel.gjs-pn-commands,
        .gjs-editor-shell .gjs-pn-panel.gjs-pn-options,
        .gjs-editor-shell .gjs-pn-panel.gjs-pn-devices-c,
        .gjs-editor-shell .gjs-pn-panel.gjs-pn-views {
          display: none !important;
        }

        .gjs-editor-shell .gjs-cv-canvas {
          top: 0;
          width: 100%;
          height: 100%;
        }

        .gjs-editor-shell .gjs-frame-wrapper {
          border-radius: 18px;
          box-shadow: 0 18px 50px rgba(26, 26, 46, 0.12);
        }

        .gjs-editor-shell .gjs-frame-wrapper__top,
        .gjs-editor-shell .gjs-frame-wrapper__name {
          color: #7C7468;
          font-size: 11px;
          font-weight: 700;
        }

        .gjs-editor-shell .gjs-toolbar,
        .gjs-editor-shell .gjs-badge,
        .gjs-editor-shell .gjs-placeholder,
        .gjs-editor-shell .gjs-highlighter,
        .gjs-editor-shell .gjs-resizer-h {
          border-color: #D6B779;
          background: #1A1A2E;
          color: #FFFFFF;
        }

        .gjs-editor-shell .gjs-block-categories,
        .gjs-editor-shell .gjs-blocks-c,
        .gjs-editor-shell .gjs-sm-sectors,
        .gjs-editor-shell .gjs-layer-container {
          background: transparent;
          color: #1A1A2E;
          font-family: inherit;
        }

        .gjs-editor-shell .gjs-block-category,
        .gjs-editor-shell .gjs-sm-sector {
          margin-bottom: 10px;
          overflow: hidden;
          border: 1px solid #E4D8C6;
          border-radius: 14px;
          background: #FFFFFF;
          box-shadow: 0 1px 2px rgba(26, 26, 46, 0.04);
        }

        .gjs-editor-shell .gjs-title,
        .gjs-editor-shell .gjs-sm-sector-title {
          border-bottom: 1px solid #E4D8C6;
          background: #F8F2E8;
          color: #8A6F3D;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .gjs-editor-shell .gjs-blocks-c {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          padding: 10px;
        }

        .gjs-editor-shell .gjs-block {
          width: auto;
          min-height: 74px;
          margin: 0;
          padding: 10px 8px;
          border: 1px solid #E4D8C6;
          border-radius: 12px;
          background: #FFFFFF;
          color: #1A1A2E;
          box-shadow: none;
          transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
        }

        .gjs-editor-shell .gjs-block:hover {
          transform: translateY(-1px);
          border-color: #D6B779;
          background: #FFFDF8;
        }

        .gjs-editor-shell .gjs-block-label {
          margin-top: 6px;
          color: #4B5563;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.25;
        }

        .gjs-editor-shell .section-visual-hero,
        .gjs-editor-shell .pd-gjs-block-preview--hero {
          background: radial-gradient(circle at 78% 28%, rgba(255,255,255,.28), transparent 24%), linear-gradient(135deg, #1A1A2E 0%, #3153B7 100%);
        }

        .gjs-editor-shell .section-visual-products,
        .gjs-editor-shell .pd-gjs-block-preview--products {
          background: linear-gradient(135deg, #16C784 0%, #0F9F69 100%);
        }

        .gjs-editor-shell .section-visual-collections,
        .gjs-editor-shell .pd-gjs-block-preview--collections {
          background: linear-gradient(135deg, #8A6F3D 0%, #D6B779 100%);
        }

        .gjs-editor-shell .section-visual-banner,
        .gjs-editor-shell .pd-gjs-block-preview--banner,
        .gjs-editor-shell .pd-gjs-block-preview--countdown {
          background: linear-gradient(135deg, #EA3943 0%, #F5A623 100%);
        }

        .gjs-editor-shell .section-visual-faq,
        .gjs-editor-shell .section-visual-policies,
        .gjs-editor-shell .pd-gjs-block-preview--faq,
        .gjs-editor-shell .pd-gjs-block-preview--policies,
        .gjs-editor-shell .pd-gjs-block-preview--shipping,
        .gjs-editor-shell .pd-gjs-block-preview--returns {
          background: linear-gradient(135deg, #4B5563 0%, #1A1A2E 100%);
        }

        .gjs-editor-shell .section-visual-testimonials,
        .gjs-editor-shell .pd-gjs-block-preview--testimonials,
        .gjs-editor-shell .pd-gjs-block-preview--pricing {
          background: linear-gradient(135deg, #D6B779 0%, #F5A623 100%);
        }

        .gjs-editor-shell .section-visual-contact,
        .gjs-editor-shell .pd-gjs-block-preview--contact,
        .gjs-editor-shell .pd-gjs-block-preview--form,
        .gjs-editor-shell .pd-gjs-block-preview--newsletter {
          background: linear-gradient(135deg, #3153B7 0%, #16C784 100%);
        }

        .gjs-editor-shell .pd-gjs-block-preview--payment,
        .gjs-editor-shell .pd-gjs-block-preview--logos,
        .gjs-editor-shell .pd-gjs-block-preview--footer {
          background: linear-gradient(135deg, #1A1A2E 0%, #6B6258 100%);
        }

        .gjs-editor-shell .pd-gjs-block-preview--video,
        .gjs-editor-shell .pd-gjs-block-preview--carousel,
        .gjs-editor-shell .pd-gjs-block-preview--instagram {
          background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%);
        }

        .gjs-editor-shell .pd-gjs-block-preview--team,
        .gjs-editor-shell .pd-gjs-block-preview--map,
        .gjs-editor-shell .pd-gjs-block-preview--blog,
        .gjs-editor-shell .pd-gjs-block-preview--size {
          background: linear-gradient(135deg, #F8F2E8 0%, #D6B779 100%);
        }

        .gjs-editor-shell .pd-gjs-block-card {
          display: block;
          width: 100%;
        }

        .gjs-editor-shell .pd-gjs-block-preview {
          position: relative;
          display: block;
          height: 54px;
          overflow: hidden;
          border-radius: 10px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.22);
        }

        .gjs-editor-shell .pd-gjs-block-mark {
          position: absolute;
          left: 9px;
          top: 8px;
          display: grid;
          width: 24px;
          height: 24px;
          place-items: center;
          border-radius: 8px;
          background: rgba(255,255,255,.22);
          color: white;
          font-size: 14px;
          font-weight: 900;
        }

        .gjs-editor-shell .pd-gjs-block-line {
          position: absolute;
          left: 9px;
          bottom: 10px;
          width: 42px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255,255,255,.62);
        }

        .gjs-editor-shell .pd-gjs-block-line--wide {
          bottom: 19px;
          width: 62px;
          background: rgba(255,255,255,.82);
        }

        .gjs-editor-shell .pd-gjs-block-title {
          display: block;
          margin-top: 7px;
          overflow: hidden;
          color: #1A1A2E;
          font-size: 10px;
          font-weight: 800;
          line-height: 1.15;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .gjs-editor-shell .gjs-block svg,
        .gjs-editor-shell .gjs-block i {
          color: #8A6F3D;
          fill: currentColor;
        }

        .gjs-editor-shell .gjs-sm-properties {
          padding: 10px;
        }

        .gjs-editor-shell .gjs-sm-property {
          margin-bottom: 10px;
          color: #4B5563;
          font-size: 11px;
          font-weight: 700;
        }

        .gjs-editor-shell .gjs-sm-composite,
        .gjs-editor-shell .gjs-sm-stack,
        .gjs-editor-shell .gjs-sm-layers,
        .gjs-editor-shell .gjs-sm-layer,
        .gjs-editor-shell .gjs-sm-layer-preview-c {
          border-color: #E4D8C6;
          background: #FFFFFF;
          color: #1A1A2E;
        }

        .gjs-editor-shell .gjs-sm-label,
        .gjs-editor-shell .gjs-label {
          color: #6B6258;
          font-weight: 700;
        }

        .gjs-editor-shell .gjs-field,
        .gjs-editor-shell .gjs-field input,
        .gjs-editor-shell .gjs-field select,
        .gjs-editor-shell .gjs-field textarea,
        .gjs-editor-shell .gjs-input-holder input,
        .gjs-editor-shell .gjs-clm-select input,
        .gjs-editor-shell .gjs-clm-field input {
          border-color: #E4D8C6;
          border-radius: 10px;
          background: #FFFFFF;
          color: #1A1A2E;
          box-shadow: none;
        }

        .gjs-editor-shell .gjs-field:focus-within {
          border-color: #D6B779;
          box-shadow: 0 0 0 2px rgba(214, 183, 121, 0.18);
        }

        .gjs-editor-shell .gjs-field input::placeholder,
        .gjs-editor-shell .gjs-input-holder input::placeholder {
          color: #9CA3AF;
        }

        @keyframes pdChecklistPulse {
          0% { transform: scale(.98); box-shadow: 0 0 0 rgba(22,199,132,0); }
          55% { transform: scale(1.01); box-shadow: 0 12px 34px rgba(22,199,132,.18); }
          100% { transform: scale(1); box-shadow: 0 1px 2px rgba(26,26,46,.04); }
        }

        .gjs-editor-shell .pd-checklist-card {
          animation: pdChecklistPulse .55s ease-out;
        }

        .gjs-editor-shell .gjs-radio-item,
        .gjs-editor-shell .gjs-radio-item-label,
        .gjs-editor-shell .gjs-sm-icon {
          color: #6B6258;
        }

        .gjs-editor-shell .gjs-radio-item input:checked + .gjs-radio-item-label,
        .gjs-editor-shell .gjs-radio-item-label:hover {
          background: #F8F2E8;
          color: #1A1A2E;
        }

        .gjs-editor-shell .gjs-field-arrow-u,
        .gjs-editor-shell .gjs-field-arrow-d {
          border-bottom-color: #8A8174;
          border-top-color: #8A8174;
        }

        .gjs-editor-shell .gjs-layer,
        .gjs-editor-shell .gjs-layer-title {
          border-color: #E4D8C6;
          background: #FFFFFF;
          color: #1A1A2E;
        }

        .gjs-editor-shell .gjs-layer-title:hover,
        .gjs-editor-shell .gjs-layer.gjs-selected .gjs-layer-title {
          background: #F8F2E8;
          color: #1A1A2E;
        }

        .gjs-editor-shell .gjs-layer-name {
          color: #1A1A2E;
          font-size: 11px;
          font-weight: 700;
        }

        .gjs-editor-shell .gjs-layer-count,
        .gjs-editor-shell .gjs-layer-vis,
        .gjs-editor-shell .gjs-layer-caret {
          color: #8A8174;
        }

        .gjs-editor-shell .gjs-trt-trait,
        .gjs-editor-shell .gjs-trt-traits,
        .gjs-editor-shell .gjs-clm-tags,
        .gjs-editor-shell .gjs-clm-tag,
        .gjs-editor-shell .gjs-clm-sel {
          border-color: #E4D8C6;
          background: #FFFFFF;
          color: #1A1A2E;
        }

        .gjs-mdl-container,
        .gjs-mdl-dialog,
        .gjs-am-assets-cont,
        .gjs-am-file-uploader,
        .gjs-am-assets,
        .gjs-editor-shell .gjs-mdl-container,
        .gjs-editor-shell .gjs-mdl-dialog,
        .gjs-editor-shell .gjs-am-assets-cont,
        .gjs-editor-shell .gjs-am-file-uploader,
        .gjs-editor-shell .gjs-am-assets {
          background: #FBF8F1;
          color: #1A1A2E;
        }

        .gjs-mdl-dialog,
        .gjs-editor-shell .gjs-mdl-dialog {
          border: 1px solid #E4D8C6;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(26, 26, 46, 0.22);
        }

        .gjs-mdl-header,
        .gjs-editor-shell .gjs-mdl-header {
          border-bottom: 1px solid #E4D8C6;
          background: #F8F2E8;
          color: #1A1A2E;
        }

        .gjs-mdl-title,
        .gjs-mdl-btn-close,
        .gjs-editor-shell .gjs-mdl-title,
        .gjs-editor-shell .gjs-mdl-btn-close {
          color: #1A1A2E;
        }

        .gjs-am-file-uploader,
        .gjs-editor-shell .gjs-am-file-uploader {
          border: 1px dashed #D6B779;
          border-radius: 18px;
        }

        .gjs-am-file-uploader > form,
        .gjs-am-file-uploader #gjs-am-title,
        .gjs-editor-shell .gjs-am-file-uploader > form,
        .gjs-editor-shell .gjs-am-file-uploader #gjs-am-title {
          color: #7C7468;
        }

        .gjs-am-add-asset,
        .gjs-btn-prim,
        .gjs-editor-shell .gjs-am-add-asset,
        .gjs-editor-shell .gjs-btn-prim {
          border: 1px solid #16C784;
          border-radius: 999px;
          background: #16C784;
          color: #FFFFFF;
          font-weight: 800;
        }

        .gjs-am-add-asset:hover,
        .gjs-btn-prim:hover,
        .gjs-editor-shell .gjs-am-add-asset:hover,
        .gjs-editor-shell .gjs-btn-prim:hover {
          background: #14b876;
        }

        .gjs-am-asset,
        .gjs-editor-shell .gjs-am-asset {
          border: 1px solid #E4D8C6;
          border-radius: 14px;
          background: #FFFFFF;
          overflow: hidden;
        }

        .gjs-am-asset-name,
        .gjs-am-meta,
        .gjs-am-close,
        .gjs-editor-shell .gjs-am-asset-name,
        .gjs-editor-shell .gjs-am-meta,
        .gjs-editor-shell .gjs-am-close {
          color: #4B5563;
        }

        .gjs-am-asset:hover,
        .gjs-am-asset.gjs-am-selected,
        .gjs-editor-shell .gjs-am-asset:hover,
        .gjs-editor-shell .gjs-am-asset.gjs-am-selected {
          border-color: #D6B779;
          box-shadow: 0 8px 24px rgba(214, 183, 121, 0.18);
        }
      `}</style>
      {/* Top Toolbar */}
      <div className="h-16 bg-[#FBF8F1] border-b border-[#D6B779]/40 flex items-center justify-between px-5 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 rounded-full border border-[#E4D8C6] bg-white px-3 py-1.5 text-sm font-semibold text-[#5F6472] shadow-sm transition-colors hover:border-[#D6B779] hover:text-[#1A1A2E]"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <div className="w-px h-7 bg-[#E4D8C6]" />
          <div>
            <span className="block text-sm font-bold text-[#1A1A2E]">
              {initialData?.title || 'Page sans titre'}
            </span>
            <span className="text-[11px] font-medium text-[#8A8174]">
              {hasUnsavedChanges ? 'Unpublished changes' : isPublished ? 'Published version live' : 'Saved as draft'}
            </span>
          </div>
          {hasUnsavedChanges && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Unpublished changes</span>
          )}
          {lastSaved && !hasUnsavedChanges && (
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Saved as draft · {lastSaved}</span>
          )}
          {isPublished && !hasUnsavedChanges && (
            <span className="rounded-full border border-[#CCD8FF] bg-[#EEF3FF] px-2.5 py-1 text-xs font-bold text-[#3153B7]">Published version live</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-[#E4D8C6] bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!editorReady || !canUndo}
              title="Annuler la dernière modification"
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-[#4B5563] transition-colors hover:bg-[#F4EDE2] hover:text-[#1A1A2E] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!editorReady || !canRedo}
              title="Rétablir la modification"
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-[#4B5563] transition-colors hover:bg-[#F4EDE2] hover:text-[#1A1A2E] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Redo2 className="h-3.5 w-3.5" />
              Redo
            </button>
          </div>
          <button
            type="button"
            onClick={handleToggleComponentsVisible}
            disabled={!editorReady}
            aria-pressed={componentsVisible}
            title="Afficher ou masquer les contours des composants"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold shadow-sm transition-colors disabled:opacity-40 ${
              componentsVisible
                ? 'border-[#1A1A2E] bg-[#1A1A2E] text-white hover:bg-[#252543]'
                : 'border-[#E4D8C6] bg-white text-[#4B5563] hover:border-[#D6B779] hover:text-[#1A1A2E]'
            }`}
          >
            {componentsVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            View components
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDeviceMenuOpen((open) => !open)}
              disabled={!editorReady}
              aria-expanded={deviceMenuOpen}
              className="inline-flex min-w-32 items-center justify-between gap-2 rounded-full border border-[#E4D8C6] bg-[#1A1A2E] px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#252543] disabled:opacity-40"
            >
              <span className="inline-flex items-center gap-1.5">
                <ActiveDeviceIcon className="h-3.5 w-3.5" />
                {activeDeviceButton.label}
              </span>
              <span className="text-[10px]">▾</span>
            </button>
            {deviceMenuOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-2xl border border-[#E4D8C6] bg-white p-1.5 shadow-xl">
                {deviceButtons.filter((device) => device.label !== activeDevice).map((device) => {
                  const Icon = device.icon;
                  return (
                    <button
                      key={device.label}
                      type="button"
                      onClick={() => handleDeviceChange(device.label)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-[#4B5563] transition-colors hover:bg-[#F4EDE2] hover:text-[#1A1A2E]"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {device.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleOpenAssets}
            disabled={!editorReady || assetLoading || assetUploading}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E4D8C6] bg-white px-3.5 py-2 text-xs font-semibold text-[#4B5563] shadow-sm transition-colors hover:border-[#D6B779] hover:text-[#1A1A2E] disabled:opacity-40"
          >
            {assetLoading || assetUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            {assetUploading ? 'Import...' : assetLoading ? 'Chargement...' : 'Médias'}
          </button>
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !editorReady}
            className="flex items-center gap-1.5 rounded-full bg-[#16C784] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-[#14b876] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Sauvegarde...' : 'Sauvegarder brouillon'}
          </button>

          <button
            onClick={handlePreview}
            disabled={previewing || saving || publishing || !editorReady || !storeHost}
            className="flex items-center gap-1.5 rounded-full border border-[#E4D8C6] bg-white px-4 py-2 text-sm font-bold text-[#374151] shadow-sm transition-colors hover:border-[#D6B779] hover:text-[#1A1A2E] disabled:opacity-50"
          >
            {previewing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            {previewing ? 'Aperçu...' : 'Aperçu'}
          </button>

          {/* Publish/Unpublish Button */}
          <button
            onClick={handleTogglePublish}
            disabled={publishing || !editorReady}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold shadow-sm transition-colors disabled:opacity-50 ${
              isPublished
                ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'border border-[#CCD8FF] bg-[#EEF3FF] text-[#3153B7] hover:bg-[#E2EAFF]'
            }`}
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPublished ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {publishing ? '...' : isPublished ? 'Dépublier' : 'Publier'}
          </button>
        </div>
      </div>

      {(feedback || autosaving) && (
        <div className={`flex items-center gap-2 border-b px-5 py-2.5 text-xs font-semibold shadow-sm ${
          feedback?.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-emerald-100 bg-emerald-50 text-emerald-700'
        }`}>
          {autosaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : feedback?.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>{autosaving ? 'Autosauvegarde en cours...' : feedback?.message}</span>
        </div>
      )}

      {/* Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Blocks */}
        <div className="flex w-72 flex-shrink-0 flex-col overflow-y-auto border-r border-[#E4D8C6] bg-[#FBF8F1] shadow-sm">
          <div className="order-[50] border-b border-[#E4D8C6] p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileJson className="h-4 w-4 text-[#8A6F3D]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A6F3D]">Templates sécurisés</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportTemplate}
                disabled={!editorReady}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E4D8C6] bg-white px-3 py-2 text-xs font-bold text-[#4B5563] shadow-sm hover:border-[#D6B779] disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
              <label className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E4D8C6] bg-white px-3 py-2 text-xs font-bold text-[#4B5563] shadow-sm hover:border-[#D6B779] ${!editorReady ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}>
                {templateImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Import
                <input type="file" accept="application/json,.json" onChange={handleImportTemplate} disabled={!editorReady || templateImporting} className="hidden" />
              </label>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-[#7C7468]">Import JSON vérifié: scripts, iframes, événements et URLs dangereuses sont retirés avant chargement.</p>
          </div>
          <div className="order-[10] border-b border-[#E4D8C6] p-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-[#8A6F3D]">Recherche blocs</span>
              <input
                type="search"
                value={blockSearch}
                onChange={(event) => setBlockSearch(event.target.value)}
                placeholder="Hero, produit, FAQ..."
                className="w-full rounded-xl border border-[#E4D8C6] bg-white px-3 py-2 text-xs font-semibold text-[#1A1A2E] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
              />
            </label>
          </div>
          <div className="order-[20] border-b border-[#E4D8C6] p-4">
            <button
              type="button"
              onClick={() => setSectionsQuickOpen((open) => !open)}
              data-testid="page-builder-sections-toggle"
              className="mb-3 flex w-full items-start justify-between gap-3 text-left"
            >
              <span>
                <span className="block text-xs font-bold text-[#8A6F3D] uppercase tracking-[0.18em]">
                Sections rapides
                </span>
                <span className="mt-1 block text-[11px] leading-relaxed text-[#7C7468]">
                  Glissez une section vers la page, ou cliquez pour l’ajouter à la fin.
                </span>
              </span>
              <span className="rounded-full border border-[#E4D8C6] bg-white px-2 py-1 text-[10px] font-bold text-[#6B6258]">
                {sectionsQuickOpen ? 'Fermer' : 'Ouvrir'}
              </span>
            </button>
            {sectionsQuickOpen && (
              <>
                <div className="mb-3 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveSectionFilter('all')}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                      activeSectionFilter === 'all'
                        ? 'border-[#1A1A2E] bg-[#1A1A2E] text-white'
                        : 'border-[#E4D8C6] bg-white text-[#6B7280] hover:border-[#D6B779] hover:text-[#1A1A2E]'
                    }`}
                  >
                    Tous
                  </button>
                  {SECTION_LIBRARY_FILTERS.map((filter) => {
                    const option = SECTION_LIBRARY_LABELS[filter];
                    const Icon = option.icon;
                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setActiveSectionFilter(filter)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                          activeSectionFilter === filter
                            ? 'border-[#1A1A2E] bg-[#1A1A2E] text-white'
                            : 'border-[#E4D8C6] bg-white text-[#6B7280] hover:border-[#D6B779] hover:text-[#1A1A2E]'
                        }`}
                      >
                        <Icon className="inline h-3 w-3" /> {option.label}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {filteredSectionLibrary.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        draggable={editorReady}
                        onDragStart={(event) => handleSectionDragStart(event, section)}
                        onDragEnd={handleSectionDragEnd}
                        onClick={() => insertLibrarySection(section)}
                        disabled={!editorReady}
                        aria-label={`Glisser ou ajouter la section ${section.title}`}
                        data-testid={`page-builder-section-${section.id}`}
                        className={`group w-full cursor-grab rounded-2xl border p-2.5 text-left shadow-sm transition-all active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 ${
                          draggedSectionId === section.id
                            ? 'border-[#D6B779] bg-[#FFF8E8] opacity-80 shadow-[#D6B779]/20'
                            : 'border-[#E4D8C6] bg-white hover:-translate-y-0.5 hover:border-[#D6B779] hover:bg-[#FFFDF8] hover:shadow-[#D6B779]/20'
                        }`}
                      >
                        <SectionVisualPreview preview={section.preview} Icon={Icon} />
                        <span className="mt-2 flex items-start gap-2">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold text-[#1A1A2E]">{section.title}</span>
                            <span className="mt-0.5 block text-[10px] leading-snug text-[#7C7468]">{section.description}</span>
                            <span className="mt-2 inline-flex items-center rounded-full border border-[#D6B779]/20 bg-[#D6B779]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8A6F3D]">
                              Glisser
                            </span>
                          </span>
                          <Plus className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#9CA3AF] transition-colors group-hover:text-[#16C784]" />
                        </span>
                      </button>
                    );
                  })}
                  {!filteredSectionLibrary.length && (
                    <p className="rounded-xl border border-dashed border-[#E4D8C6] bg-white p-3 text-xs font-medium text-[#7C7468]">
                      Aucune section rapide trouvée.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="order-[40] border-b border-[#E4D8C6] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#8A6F3D]" />
                <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#8A6F3D]">Mes sections</h3>
              </div>
              <button
                type="button"
                onClick={handleSaveSelectedSection}
                disabled={!editorReady}
                className="rounded-full border border-[#E4D8C6] bg-white px-2 py-1 text-[10px] font-bold text-[#6B6258] hover:border-[#D6B779] disabled:opacity-40"
              >
                Sauver
              </button>
            </div>
            {savedSections.length ? (
              <div className="space-y-2">
                {savedSections.map((section) => (
                  <div key={section.id} className="rounded-xl border border-[#E4D8C6] bg-white p-2 shadow-sm">
                    <p className="truncate text-xs font-bold text-[#1A1A2E]">{section.name}</p>
                    <div className="mt-2 flex gap-1.5">
                      <button type="button" onClick={() => handleInsertSavedSection(section)} className="flex-1 rounded-lg bg-[#16C784] px-2 py-1.5 text-[10px] font-bold text-white">Ajouter</button>
                      <button type="button" onClick={() => handleDeleteSavedSection(section.id)} aria-label="Delete" className="rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-[#E4D8C6] bg-white/70 p-3 text-xs text-[#7C7468]">Sélectionnez un bloc/section dans la page puis cliquez Sauver.</p>
            )}
          </div>
          <div className="order-[30] p-4 pb-2">
            <h3 className="text-xs font-bold text-[#8A6F3D] uppercase tracking-[0.18em] mb-2">
              Blocs
            </h3>
          </div>
          <div ref={blockPanelRef} id="gjs-blocks" className="order-[31] px-3 pb-4 text-[#1A1A2E]" />
        </div>

        {/* Center — Canvas */}
        <div
          data-testid="page-builder-canvas-drop-target"
          className="relative flex-1 overflow-hidden bg-[#F6F3ED]"
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          {!editorReady && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-[#16C784] animate-spin mx-auto mb-3" />
                <p className="text-sm text-[#7C7468]">Chargement de l&apos;éditeur...</p>
              </div>
            </div>
          )}
          <div ref={containerRef} className="h-full" />
          {draggedSectionId && editorReady && (
            <div
              className={`absolute inset-4 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
                isSectionDropActive
                  ? 'border-[#16C784] bg-[#16C784]/15 shadow-2xl shadow-[#16C784]/20'
                  : 'border-[#D6B779] bg-[#1A1A2E]/20'
              }`}
              onDragOver={handleCanvasDragOver}
              onDragLeave={handleCanvasDragLeave}
              onDrop={handleCanvasDrop}
            >
              <div className="pointer-events-none rounded-2xl border border-white/60 bg-white/95 px-6 py-5 text-center shadow-xl">
                <p className="text-sm font-bold text-[#1A1A2E]">
                  Déposez la section ici
                </p>
                <p className="mt-1 text-xs text-[#7C7468]">
                  Elle sera ajoutée au brouillon de la page.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel — Styles & Layers */}
        <div className="flex w-80 flex-shrink-0 flex-col overflow-y-auto border-l border-[#E4D8C6] bg-[#FBF8F1] shadow-sm">

          <div className="order-[110] border-b border-[#E4D8C6] p-4">
            <details>
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A6F3D]">
                <Clock3 className="h-3.5 w-3.5" />
                Timeline sauvegarde
              </summary>
              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-[#E4D8C6] bg-white p-3 text-xs shadow-sm">
                  <p className="font-bold text-[#1A1A2E]">{autosaving ? 'Autosave en cours...' : hasUnsavedChanges ? 'Changements non sauvegardés' : lastSaved ? `Dernier brouillon: ${lastSaved}` : 'Aucune sauvegarde récente'}</p>
                  <p className="mt-1 text-[11px] text-[#7C7468]">Autosave toutes les 30 secondes après modification.</p>
                </div>
                {activityTimeline.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[#E4D8C6] bg-white p-2 text-xs shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#1A1A2E]">{item.label}</span>
                      <span className="text-[10px] text-[#7C7468]">{item.time}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#7C7468]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>

          <div className="order-[30] border-b border-[#E4D8C6] p-4">
            <details>
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A6F3D]">
                <Palette className="h-3.5 w-3.5" />
                Styles globaux
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {([
                  ['primaryColor', 'Primaire'],
                  ['backgroundColor', 'Fond'],
                  ['surfaceColor', 'Surface'],
                  ['textColor', 'Texte'],
                ] as Array<[keyof PageGlobalStyles, string]>).map(([field, label]) => (
                  <label key={field} className="block rounded-xl border border-[#E4D8C6] bg-white p-2 text-[11px] font-bold text-[#6B6258]">
                    {label}
                    <input type="color" value={globalStyles[field]} onChange={(event) => handleGlobalStyleChange(field, event.target.value)} className="mt-1 h-8 w-full rounded border border-[#E4D8C6]" />
                  </label>
                ))}
                <label className="col-span-2 block rounded-xl border border-[#E4D8C6] bg-white p-2 text-[11px] font-bold text-[#6B6258]">
                  Espacement sections
                  <input type="range" min="24" max="120" value={globalStyles.sectionSpacing} onChange={(event) => handleGlobalStyleChange('sectionSpacing', event.target.value)} className="mt-1 w-full accent-[#16C784]" />
                </label>
                <label className="col-span-2 block rounded-xl border border-[#E4D8C6] bg-white p-2 text-[11px] font-bold text-[#6B6258]">
                  Rayon boutons
                  <input type="range" min="0" max="999" value={globalStyles.buttonRadius} onChange={(event) => handleGlobalStyleChange('buttonRadius', event.target.value)} className="mt-1 w-full accent-[#16C784]" />
                </label>
              </div>
            </details>
          </div>

          <div className="order-[60] border-b border-[#E4D8C6] p-4">
            <details>
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A6F3D]">
                <Share2 className="h-3.5 w-3.5" />
                Aperçu social
              </summary>
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#E4D8C6] bg-white shadow-sm">
                <div className="aspect-[1200/630] bg-[#F4EDE2] bg-cover bg-center" style={{ backgroundImage: pageSettings.og_image ? `url("${pageSettings.og_image.replace(/"/g, '\\"')}")` : undefined }} />
                <div className="p-3">
                  <p className="truncate text-xs font-bold text-[#1A1A2E]">{pageSettings.seo_title || initialData?.title || 'Titre de page'}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-[#7C7468]">{pageSettings.seo_description || 'Description SEO affichée dans les partages sociaux.'}</p>
                  <p className="mt-2 truncate text-[10px] font-bold uppercase tracking-wider text-[#8A6F3D]">{storeHost || 'boutique'}.pandamarket</p>
                </div>
              </div>
            </details>
          </div>

          <div className="order-[50] border-b border-[#E4D8C6] p-4">
            <details>
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A6F3D]">
                <Wand2 className="h-3.5 w-3.5" />
                Assistant IA copy
              </summary>
              <div className="mt-3 rounded-xl border border-[#E4D8C6] bg-white p-3 text-xs shadow-sm">
                <p className="leading-relaxed text-[#7C7468]">Génère un titre SEO et une description depuis le contenu actuel. Utilise les crédits IA SEO du plan.</p>
                {!hasAiSeo && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700"><Lock className="h-3 w-3" /> IA SEO requise</p>
                )}
                <button type="button" onClick={handleAiCopyHelper} disabled={aiCopyLoading || !editorReady} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A2E] px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
                  {aiCopyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Générer suggestions
                </button>
              </div>
            </details>
          </div>

          <div className="order-[70] border-b border-[#E4D8C6] p-4">
            <details open={publishChecklistOpen} onToggle={(event) => setPublishChecklistOpen(event.currentTarget.open)}>
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A6F3D]">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Checklist publication
              </summary>
              <div className="pd-checklist-card mt-3 rounded-2xl border border-[#E4D8C6] bg-white p-3 shadow-sm">
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#F4EDE2]">
                  <div className="h-full rounded-full bg-[#16C784] transition-all" style={{ width: `${Math.round((publishChecklistScore / publishChecklist.length) * 100)}%` }} />
                </div>
                <div className="space-y-2">
                  {publishChecklist.map((item) => (
                    <div key={item.label} className="flex items-start gap-2 text-[11px]">
                      {item.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-[#16C784]" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-500" />}
                      <span><span className="font-bold text-[#1A1A2E]">{item.label}</span><span className="block text-[#7C7468]">{item.text}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>

          <div className="order-[80] border-b border-[#E4D8C6] p-4">
            <details>
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A6F3D]">
                <Smartphone className="h-3.5 w-3.5" />
                Warnings mobile
              </summary>
              <div className="mt-3 space-y-2">
                {mobileWarnings.length ? mobileWarnings.map((warning) => (
                  <p key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-700">{warning}</p>
                )) : <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">Aucun risque mobile évident.</p>}
              </div>
            </details>
          </div>

          <div className="order-[90] border-b border-[#E4D8C6] p-4">
            <details>
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A6F3D]">
                <Accessibility className="h-3.5 w-3.5" />
                Accessibilité
              </summary>
              <div className="mt-3 space-y-2">
                {accessibilityWarnings.length ? accessibilityWarnings.map((warning) => (
                  <p key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-700">{warning}</p>
                )) : <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-xs font-semibold text-emerald-700">Aucun problème évident détecté.</p>}
              </div>
            </details>
          </div>

          <div className="order-[10] border-b border-[#E4D8C6] p-4">
            <details open>
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.18em] text-[#8A6F3D]">
                Paramètres page
              </summary>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#6B6258]">Titre SEO</span>
                  <input
                    type="text"
                    value={pageSettings.seo_title}
                    onChange={(event) => updatePageSetting('seo_title', event.target.value)}
                    placeholder={initialData?.title || 'Titre public'}
                    maxLength={200}
                    className="w-full rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs text-[#1A1A2E] outline-none transition-colors focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#6B6258]">Description SEO</span>
                  <textarea
                    value={pageSettings.seo_description}
                    onChange={(event) => updatePageSetting('seo_description', event.target.value)}
                    rows={3}
                    maxLength={320}
                    placeholder="Résumé affiché dans Google et les partages sociaux"
                    className="w-full rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs text-[#1A1A2E] outline-none transition-colors focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
                  />
                </label>
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#6B6258]">Image de partage</span>
                    {pageSettings.og_image && (
                      <button
                        type="button"
                        onClick={() => updatePageSetting('og_image', '')}
                        className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                  {pageSettings.og_image && (
                    <div className="mb-2 overflow-hidden rounded-xl border border-[#E4D8C6] bg-white shadow-sm">
                      <div
                        className="h-24 bg-cover bg-center"
                        style={{ backgroundImage: `url("${pageSettings.og_image.replace(/"/g, '\\"')}")` }}
                      />
                      <div className="border-t border-[#E4D8C6] px-3 py-2">
                        <p className="truncate text-[11px] font-semibold text-[#6B6258]">{filenameFromUrl(pageSettings.og_image)}</p>
                        {seoImageMeta?.status === 'loaded' && seoImageMeta.url === pageSettings.og_image && (
                          <p className="mt-0.5 text-[10px] font-medium text-[#7C7468]">
                            {seoImageMeta.width} × {seoImageMeta.height}px
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {seoImageQuality && (
                    <div className={`mb-2 rounded-lg border px-3 py-2 text-[11px] font-semibold ${
                      seoImageQuality.type === 'success'
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : seoImageQuality.type === 'error'
                          ? 'border-red-100 bg-red-50 text-red-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}>
                      {seoImageQuality.message}
                    </div>
                  )}
                  <input
                    type="url"
                    value={pageSettings.og_image}
                    onChange={(event) => updatePageSetting('og_image', normalizePublicAssetUrl(event.target.value))}
                    placeholder="https://... ou /pd-product-images/..."
                    className="mb-2 w-full rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs text-[#1A1A2E] outline-none transition-colors focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
                  />
                  <button
                    type="button"
                    onClick={handleChoosePageOgImage}
                    disabled={!editorReady || assetLoading || assetUploading}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs font-semibold text-[#4B5563] shadow-sm transition-colors hover:border-[#D6B779] hover:text-[#1A1A2E] disabled:opacity-40"
                  >
                    {assetLoading || assetUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5" />
                    )}
                    {assetUploading ? 'Import...' : assetLoading ? 'Chargement...' : 'Choisir image SEO'}
                  </button>
                  {heroImageUrl && (
                    <button
                      type="button"
                      onClick={handleUseHeroImageForSeo}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#D6B779] bg-[#FFF8E8] px-3 py-2 text-xs font-semibold text-[#8A6F3D] shadow-sm transition-colors hover:bg-[#F8F2E8]"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Use current hero image as SEO image
                    </button>
                  )}
                  <p className="mt-1 text-[10px] leading-snug text-[#7C7468]">
                    Format recommandé : image large 1200 × 630 px pour les partages sociaux.
                  </p>
                </div>
                <label className="flex items-start gap-2 rounded-lg border border-[#E4D8C6] bg-white p-2 text-xs font-medium text-[#4B5563] shadow-sm">
                  <input
                    type="checkbox"
                    checked={pageSettings.show_in_navigation}
                    onChange={(event) => updatePageSetting('show_in_navigation', event.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-[#16C784]"
                  />
                  Afficher dans la navigation
                </label>
                <label className="flex items-start gap-2 rounded-lg border border-[#E4D8C6] bg-white p-2 text-xs font-medium text-[#4B5563] shadow-sm">
                  <input
                    type="checkbox"
                    checked={pageSettings.show_in_footer}
                    onChange={(event) => updatePageSetting('show_in_footer', event.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-[#16C784]"
                  />
                  Afficher dans le footer
                </label>
                <label className="flex items-start gap-2 rounded-lg border border-[#E4D8C6] bg-white p-2 text-xs font-medium text-[#4B5563] shadow-sm">
                  <input
                    type="checkbox"
                    checked={pageSettings.noindex}
                    onChange={(event) => updatePageSetting('noindex', event.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-[#16C784]"
                  />
                  Masquer des moteurs de recherche
                </label>
                <div className="rounded-xl border border-[#E4D8C6] bg-white p-3 shadow-sm">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8A6F3D]">SEO quality helper</p>
                  <div className="space-y-1.5">
                    {seoChecks.map((check) => (
                      <div key={check.label} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-[#4B5563]">{check.label}</span>
                        <span className={`rounded-full px-2 py-0.5 font-bold ${
                          check.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {check.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#6B6258]">Ordre</span>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={pageSettings.sort_order}
                    onChange={(event) => updatePageSetting('sort_order', Math.max(0, Math.min(999, Number(event.target.value) || 0)))}
                    className="w-full rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs text-[#1A1A2E] outline-none transition-colors focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
                  />
                </label>
              </div>
            </details>
          </div>
          <div className="order-[100] border-b border-[#E4D8C6] p-4">
            <details>
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8A6F3D]">
                <History className="h-3.5 w-3.5" />
                Historique
              </summary>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] leading-relaxed text-[#7C7468]">
                    Draft saved = brouillon interne. Published version = page live. Restored version = version copiée dans le brouillon avant publication.
                  </p>
                  <button
                    type="button"
                    onClick={loadVersions}
                    disabled={versionsLoading}
                    className="rounded-lg border border-[#E4D8C6] bg-white px-2 py-1 text-[11px] font-semibold text-[#4B5563] shadow-sm hover:border-[#D6B779] hover:text-[#1A1A2E] disabled:opacity-40"
                  >
                    {versionsLoading ? '...' : 'Actualiser'}
                  </button>
                </div>
                {versionsLoading && !versions.length ? (
                  <div className="flex items-center gap-2 rounded-lg border border-[#E4D8C6] bg-white p-3 text-xs text-[#6B7280] shadow-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Chargement...
                  </div>
                ) : versions.length ? (
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {versions.map((version) => {
                      const restoring = restoringVersionId === version.id;
                      return (
                        <div key={version.id} className="rounded-lg border border-[#E4D8C6] bg-white p-3 shadow-sm">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-[#1A1A2E]">
                                Published version #{version.version_number}
                              </p>
                              <p className="truncate text-[11px] text-[#7C7468]">
                                {formatVersionDate(version.published_at || version.created_at)}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#16C784]/10 px-2 py-0.5 text-[10px] font-bold text-[#16C784]">
                              Published version
                            </span>
                          </div>
                          <p className="mb-2 truncate text-[11px] text-[#6B7280]">
                            {version.title} · /{version.slug}
                          </p>
                          <button
                            type="button"
                            onClick={() => restoreVersion(version)}
                            disabled={Boolean(restoringVersionId)}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#E4D8C6] bg-[#F8F2E8] px-3 py-2 text-xs font-semibold text-[#4B5563] transition-colors hover:border-[#D6B779] hover:text-[#1A1A2E] disabled:opacity-40"
                          >
                            {restoring ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            {restoring ? 'Restoring version...' : 'Restore as draft'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#E4D8C6] bg-white/70 p-3 text-xs text-[#7C7468]">
                    Aucune version publiée pour cette page.
                  </div>
                )}
              </div>
            </details>
          </div>
          {selectedDynamicBlock && (
            <div className="order-[40] border-b border-[#E4D8C6] p-4">
              <div className="mb-3">
                <p className="text-xs font-bold text-[#8A6F3D] uppercase tracking-[0.18em]">
                  Bloc dynamique
                </p>
                <h3 className="mt-1 text-sm font-bold text-[#1A1A2E]">
                  {dynamicBlockLabel(selectedBlockType)}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[#7C7468]">
                  Ces paramètres contrôlent les données réelles rendues sur la boutique publique.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#6B6258]">Titre</span>
                  <input
                    type="text"
                    value={selectedDynamicBlock.attrs['data-pd-title'] || ''}
                    onChange={(event) => updateDynamicBlockAttribute('data-pd-title', event.target.value)}
                    placeholder={dynamicBlockLabel(selectedBlockType)}
                    className="w-full rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs text-[#1A1A2E] outline-none transition-colors focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
                  />
                </label>

                {supportsSubtitleControl(selectedBlockType) && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#6B6258]">Sous-titre</span>
                    <textarea
                      value={selectedDynamicBlock.attrs['data-pd-subtitle'] || ''}
                      onChange={(event) => updateDynamicBlockAttribute('data-pd-subtitle', event.target.value)}
                      rows={3}
                      placeholder="Texte descriptif du bloc"
                      className="w-full rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs text-[#1A1A2E] outline-none transition-colors focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
                    />
                  </label>
                )}

                {supportsImageControl(selectedBlockType) && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#6B6258]">Image hero</span>
                      {selectedDynamicBlock.attrs['data-pd-image-url'] && (
                        <button
                          type="button"
                          onClick={() => updateDynamicBlockAttribute('data-pd-image-url', '')}
                          className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                        >
                          Effacer
                        </button>
                      )}
                    </div>
                    {selectedDynamicBlock.attrs['data-pd-image-url'] && (
                      <div className="mb-2 overflow-hidden rounded-lg border border-[#E4D8C6] bg-white shadow-sm">
                        <div
                          className="h-24 w-full bg-cover bg-center"
                          style={{
                            backgroundImage: `url("${selectedDynamicBlock.attrs['data-pd-image-url'].replace(/"/g, '\\"')}")`,
                            backgroundPosition: selectedHeroImagePosition,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: selectedHeroImageFit,
                          }}
                        />
                      </div>
                    )}
                    <input
                      type="url"
                      value={selectedDynamicBlock.attrs['data-pd-image-url'] || ''}
                      onChange={(event) => updateDynamicBlockAttribute('data-pd-image-url', normalizePublicAssetUrl(event.target.value))}
                      placeholder="https://... ou /pd-product-images/..."
                      className="mb-2 w-full rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs text-[#1A1A2E] outline-none transition-colors focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
                    />
                    <div className="mb-2 rounded-xl border border-[#E4D8C6] bg-white p-3 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#1A1A2E]">Cadrage de l’image</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#16C784]">
                          {selectedHeroImageFit === 'cover' ? 'Crop actif' : 'Image complète'}
                        </span>
                      </div>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-[#6B6258]">Position rapide</span>
                        <select
                          value={selectedHeroPositionSelectValue}
                          onChange={(event) => {
                            if (event.target.value !== '__custom__') updateDynamicBlockAttribute('data-pd-image-position', event.target.value);
                          }}
                          className="w-full rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs text-[#1A1A2E] outline-none transition-colors focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
                        >
                          {selectedHeroPositionSelectValue === '__custom__' && (
                            <option value="__custom__">Position personnalisée</option>
                          )}
                          {HERO_IMAGE_POSITION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-[#6B6258]">Horizontal</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={selectedHeroFocus.x}
                            onChange={(event) => updateDynamicBlockAttribute('data-pd-image-position', `${event.target.value}% ${selectedHeroFocus.y}%`)}
                            className="w-full accent-[#16C784]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-[#6B6258]">Vertical</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={selectedHeroFocus.y}
                            onChange={(event) => updateDynamicBlockAttribute('data-pd-image-position', `${selectedHeroFocus.x}% ${event.target.value}%`)}
                            className="w-full accent-[#16C784]"
                          />
                        </label>
                      </div>
                      <label className="mt-3 block">
                        <span className="mb-1 block text-xs font-semibold text-[#6B6258]">Recadrage</span>
                        <select
                          value={selectedHeroImageFit}
                          onChange={(event) => updateDynamicBlockAttribute('data-pd-image-fit', normalizeHeroImageFit(event.target.value))}
                          className="w-full rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs text-[#1A1A2E] outline-none transition-colors focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
                        >
                          {HERO_IMAGE_FIT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={handleChooseDynamicImage}
                      disabled={!editorReady || assetLoading || assetUploading}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs font-semibold text-[#4B5563] shadow-sm transition-colors hover:border-[#D6B779] hover:text-[#1A1A2E] disabled:opacity-40"
                    >
                      {assetLoading || assetUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="h-3.5 w-3.5" />
                      )}
                      Choisir depuis les médias
                    </button>
                  </div>
                )}

                {supportsLimitControl(selectedBlockType) && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[#6B6258]">Nombre à afficher</span>
                    <select
                      value={selectedDynamicBlock.attrs['data-pd-limit'] || (selectedBlockType === 'featured-products' ? '4' : '8')}
                      onChange={(event) => updateDynamicBlockAttribute('data-pd-limit', event.target.value)}
                      className="w-full rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs text-[#1A1A2E] outline-none transition-colors focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
                    >
                      {[3, 4, 6, 8, 10, 12].map((limit) => (
                        <option key={limit} value={String(limit)}>{limit}</option>
                      ))}
                    </select>
                  </label>
                )}

                {supportsProductControls(selectedBlockType) && (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-[#6B6258]">Filtrer par catégorie</span>
                      <select
                        value={selectedDynamicBlock.attrs['data-pd-category'] || ''}
                        onChange={(event) => updateDynamicBlockAttribute('data-pd-category', event.target.value)}
                        className="w-full rounded-lg border border-[#E4D8C6] bg-white px-3 py-2 text-xs text-[#1A1A2E] outline-none transition-colors focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20"
                      >
                        <option value="">Toutes les catégories</option>
                        {builderCategories.map((category) => {
                          const slug = category.slug || slugSegment(category.name);
                          return (
                            <option key={category.id} value={slug}>
                              {category.name}
                              {category.product_count ? ` (${category.product_count})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </label>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#6B6258]">Produits manuels</span>
                        {selectedProductIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => updateDynamicBlockAttribute('data-pd-product-ids', '')}
                            className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                          >
                            Effacer
                          </button>
                        )}
                      </div>
                      <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-[#E4D8C6] bg-white p-2 shadow-sm">
                        {builderProducts.length ? builderProducts.map((product) => {
                          const checked = selectedProductIds.includes(product.id);
                          return (
                            <label key={product.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-[#F8F2E8]">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDynamicProduct(product.id)}
                                className="mt-0.5 h-3.5 w-3.5 rounded border-[#E4D8C6] accent-[#16C784]"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-semibold text-[#1A1A2E]">{product.title}</span>
                                <span className="block truncate text-[10px] text-[#7C7468]">
                                  {product.category || product.status || product.id}
                                </span>
                              </span>
                            </label>
                          );
                        }) : (
                          <p className="px-2 py-3 text-xs text-[#7C7468]">
                            Aucun produit chargé.
                          </p>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-[#7C7468]">
                        Si des produits sont cochés, ils seront affichés en priorité dans cet ordre de sélection.
                      </p>
                    </div>
                  </>
                )}

                {supportsCategorySelectionControls(selectedBlockType) && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#6B6258]">Collections à afficher</span>
                      {selectedCategorySlugs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => updateDynamicBlockAttribute('data-pd-category-slugs', '')}
                          className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                        >
                          Effacer
                        </button>
                      )}
                    </div>
                    <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-[#E4D8C6] bg-white p-2 shadow-sm">
                      {builderCategories.length ? builderCategories.map((category) => {
                        const slug = category.slug || slugSegment(category.name);
                        const checked = selectedCategorySlugs.includes(slugSegment(slug));
                        return (
                          <label key={category.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-[#F8F2E8]">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleDynamicCategory(slug)}
                              className="mt-0.5 h-3.5 w-3.5 rounded border-[#E4D8C6] accent-[#16C784]"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-[#1A1A2E]">{category.name}</span>
                              <span className="block truncate text-[10px] text-[#7C7468]">
                                {category.product_count ? `${category.product_count} produit${Number(category.product_count) > 1 ? 's' : ''}` : slug}
                              </span>
                            </span>
                          </label>
                        );
                      }) : (
                        <p className="px-2 py-3 text-xs text-[#7C7468]">
                          Aucune collection chargée.
                        </p>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-[#7C7468]">
                      Si aucune collection n&apos;est cochée, le bloc affiche automatiquement les collections actives.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="order-[20] border-b border-[#E4D8C6]">
            <div className="p-4 pb-2">
              <h3 className="text-xs font-bold text-[#8A6F3D] uppercase tracking-[0.18em] mb-2">
                Styles
              </h3>
            </div>
            <div className="px-3 pb-3">
              <div className="rounded-2xl border border-[#E4D8C6] bg-white p-3 shadow-sm">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#8A6F3D]">Classes & états</p>
                <div ref={selectorPanelRef} id="gjs-selectors" />
              </div>
            </div>
            <div ref={stylePanelRef} id="gjs-styles" className="px-3 pb-4" />
          </div>
          <div className="order-[999] sticky bottom-0 z-20 border-t border-[#E4D8C6] bg-[#FBF8F1] shadow-[0_-10px_24px_rgba(26,26,46,0.08)]">
            <div className="p-4 pb-2">
              <h3 className="text-xs font-bold text-[#8A6F3D] uppercase tracking-[0.18em] mb-2">
                Calques
              </h3>
            </div>
            <div ref={layerPanelRef} id="gjs-layers" className="max-h-64 overflow-y-auto px-3 pb-4" />
          </div>
        </div>
      </div>
      {seoImagePickerOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1A1A2E]/65 px-4 py-6 backdrop-blur-sm"
          onClick={() => setSeoImagePickerOpen(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#E4D8C6] bg-[#FBF8F1] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E4D8C6] bg-gradient-to-r from-[#FFFDF8] to-[#F8F2E8] px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8A6F3D]">SEO & partage social</p>
                <h2 className="mt-1 text-xl font-black text-[#1A1A2E]">Choisir l’image de partage</h2>
                <p className="mt-1 text-sm font-medium text-[#7C7468]">
                  Sélectionnez une image existante ou importez une nouvelle image optimisée pour Facebook, WhatsApp et Google.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSeoImagePickerOpen(false)}
                className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-[#E4D8C6] bg-white text-xl font-bold text-[#6B6258] shadow-sm transition-colors hover:border-[#D6B779] hover:text-[#1A1A2E]"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[320px_1fr]">
              <div className="border-b border-[#E4D8C6] bg-white p-5 lg:border-b-0 lg:border-r">
                <div className="overflow-hidden rounded-2xl border border-[#E4D8C6] bg-[#F8F2E8] shadow-inner">
                  {pageSettings.og_image ? (
                    <div
                      className="aspect-[1200/630] bg-cover bg-center"
                      style={{ backgroundImage: `url("${pageSettings.og_image.replace(/"/g, '\\"')}")` }}
                    />
                  ) : (
                    <div className="flex aspect-[1200/630] flex-col items-center justify-center gap-2 text-[#8A6F3D]">
                      <ImageIcon className="h-9 w-9" />
                      <span className="text-xs font-bold">Aucune image sélectionnée</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 rounded-2xl border border-[#E4D8C6] bg-[#FFFDF8] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8A6F3D]">Aperçu actuel</p>
                  <p className="mt-2 truncate text-sm font-bold text-[#1A1A2E]">
                    {pageSettings.og_image ? filenameFromUrl(pageSettings.og_image) : 'Pas encore configurée'}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[#7C7468]">
                    Utilisez une image claire, horizontale, avec peu de texte. Taille conseillée : 1200 × 630 px.
                  </p>
                  {seoImageQuality && (
                    <p className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
                      seoImageQuality.type === 'success'
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : seoImageQuality.type === 'error'
                          ? 'border-red-100 bg-red-50 text-red-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}>
                      {seoImageQuality.message}
                    </p>
                  )}
                  {heroImageUrl && (
                    <button
                      type="button"
                      onClick={handleUseHeroImageForSeo}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#D6B779] bg-white px-4 py-2 text-xs font-bold text-[#8A6F3D] transition-colors hover:bg-[#FFF8E8]"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Use current hero image
                    </button>
                  )}
                  {pageSettings.og_image && (
                    <button
                      type="button"
                      onClick={() => updatePageSetting('og_image', '')}
                      className="mt-3 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100"
                    >
                      Retirer l’image
                    </button>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col p-5">
                {seoImagePickerError && (
                  <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    {seoImagePickerError}
                  </div>
                )}
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1">
                    <input
                      type="search"
                      value={seoImageSearch}
                      onChange={(event) => setSeoImageSearch(event.target.value)}
                      placeholder="Rechercher dans la médiathèque..."
                      className="w-full rounded-2xl border border-[#E4D8C6] bg-white px-4 py-3 text-sm font-semibold text-[#1A1A2E] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#D6B779] focus:ring-4 focus:ring-[#D6B779]/15"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void loadStoreMediaAssets(editorRef.current, true)}
                      disabled={assetLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E4D8C6] bg-white px-4 py-2.5 text-sm font-bold text-[#6B6258] shadow-sm transition-colors hover:border-[#D6B779] hover:text-[#1A1A2E] disabled:opacity-50"
                    >
                      {assetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Actualiser
                    </button>
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#16C784] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-[#14b876]">
                      {assetUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      {assetUploading ? 'Import...' : 'Importer'}
                      <input type="file" accept="image/*" onChange={handleUploadPageOgImage} disabled={assetUploading} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {assetLoading ? (
                    <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-[#E4D8C6] bg-white text-[#16C784]">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : filteredSeoMediaAssets.length === 0 ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#E4D8C6] bg-white px-6 text-center">
                      <ImageIcon className="h-10 w-10 text-[#D6B779]" />
                      <p className="mt-3 text-sm font-bold text-[#1A1A2E]">Aucune image trouvée</p>
                      <p className="mt-1 text-xs text-[#7C7468]">Importez une image ou modifiez votre recherche.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredSeoMediaAssets.map((asset) => {
                        const selected = pageSettings.og_image === asset.url;
                        const label = asset.alt_text || asset.product_title || filenameFromUrl(asset.url);
                        return (
                          <button
                            key={asset.url}
                            type="button"
                            onClick={() => handleSelectPageOgImage(asset.url)}
                            className={`group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D6B779] hover:shadow-lg ${
                              selected ? 'border-[#16C784] ring-4 ring-[#16C784]/15' : 'border-[#E4D8C6]'
                            }`}
                          >
                            <div
                              className="aspect-[1200/630] bg-[#F4EDE2] bg-cover bg-center transition-transform group-hover:scale-[1.02]"
                              style={{ backgroundImage: `url("${asset.url.replace(/"/g, '\\"')}")` }}
                            />
                            <div className="p-3">
                              <p className="truncate text-sm font-bold text-[#1A1A2E]">{label}</p>
                              <p className="mt-1 truncate text-xs font-medium text-[#7C7468]">{filenameFromUrl(asset.url)}</p>
                              <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                selected ? 'bg-[#16C784]/10 text-[#0F9F69]' : 'bg-[#F4EDE2] text-[#8A6F3D]'
                              }`}>
                                {selected ? 'Sélectionnée' : 'Utiliser'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
