/**
 * Page Builder Pre-built Templates
 * ─────────────────────────────────────────────────────────────
 * ~20 ready-to-use page templates for vendors using the GrapesJS Page Builder.
 * Each template provides:
 *   - A unique slug suggestion
 *   - Pre-built HTML content styled with inline CSS (GrapesJS-compatible)
 *   - A CSS string for additional styles
 *   - A category for filtering in the template picker
 *   - A thumbnail description for the UI
 *
 * Design system compliance:
 *   - Panda Green (#16C784) for primary CTAs
 *   - Panda Black (#1A1A2E) for dark sections
 *   - Inter font family
 *   - Consistent spacing (48px/24px sections)
 *   - Mobile-responsive grid patterns
 *   - Tunisian market context (TND currency, local references)
 */

export interface PageTemplate {
  id: string;
  name: string;
  slug: string;
  category: TemplateCategory;
  description: string;
  icon: string;
  html: string;
  css: string;
  sellerTypes?: TemplateSellerType[];
  sections?: TemplateSection[];
  isHomepage?: boolean;
}

export type TemplateSellerType =
  | 'general'
  | 'fashion'
  | 'electronics'
  | 'food'
  | 'services'
  | 'digital'
  | 'wholesale';

export type TemplateSection =
  | 'hero'
  | 'products'
  | 'faq'
  | 'testimonials'
  | 'policies'
  | 'contact'
  | 'banner'
  | 'collections';

export type TemplateCategory =
  | 'marketing'
  | 'informational'
  | 'e-commerce'
  | 'content'
  | 'utility';

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; icon: string }> = {
  marketing: { label: 'Marketing', icon: '📢' },
  informational: { label: 'Informationnel', icon: 'ℹ️' },
  'e-commerce': { label: 'E-Commerce', icon: '🛍️' },
  content: { label: 'Contenu', icon: '📝' },
  utility: { label: 'Utilitaire', icon: '⚙️' },
};

export const TEMPLATE_SELLER_TYPES: Record<TemplateSellerType, { label: string; icon: string }> = {
  general: { label: 'Tous', icon: '✨' },
  fashion: { label: 'Mode', icon: '👗' },
  electronics: { label: 'Électronique', icon: '💻' },
  food: { label: 'Food', icon: '🍽️' },
  services: { label: 'Services', icon: '🧰' },
  digital: { label: 'Digital', icon: '⬇️' },
  wholesale: { label: 'Wholesale', icon: '📦' },
};

// ─── Shared CSS reset applied to all templates ──────────────

const BASE_FONT = "font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;";
const SECTION_PAD = 'padding: 64px 24px;';
const SECTION_PAD_SM = 'padding: 48px 24px;';
const MAX_W = 'max-width: 1100px; margin-left: auto; margin-right: auto;';
const H2_STYLE = `font-size: 30px; font-weight: 700; ${BASE_FONT} margin-bottom: 12px; color: #111827;`;
const SUBTITLE = 'font-size: 16px; color: #6B7280; margin-bottom: 32px;';
const BTN_PRIMARY = 'display: inline-block; padding: 14px 32px; background: #16C784; color: white; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px; border: none; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;';
const BTN_OUTLINE = 'display: inline-block; padding: 14px 32px; background: transparent; color: #16C784; border: 2px solid #16C784; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px; cursor: pointer; transition: transform 0.15s ease, background 0.15s ease;';
const CARD = 'background: white; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden; transition: transform 0.25s ease, box-shadow 0.25s ease;';
const CARD_SHADOW = 'background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; transition: transform 0.25s ease, box-shadow 0.25s ease;';

interface TemplateMetadata {
  sellerTypes?: TemplateSellerType[];
  sections?: TemplateSection[];
  isHomepage?: boolean;
}

export interface TemplateBranding {
  storeName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  sellerType?: TemplateSellerType | string | null;
}

const TEMPLATE_METADATA: Record<string, TemplateMetadata> = {
  'tpl-landing': { sellerTypes: ['general', 'fashion', 'electronics', 'food', 'digital'], sections: ['hero', 'products', 'testimonials', 'banner'] },
  'tpl-about': { sellerTypes: ['general', 'services'], sections: ['hero', 'testimonials'] },
  'tpl-contact': { sellerTypes: ['general', 'services'], sections: ['hero', 'contact'] },
  'tpl-faq': { sellerTypes: ['general', 'services', 'digital'], sections: ['hero', 'faq', 'policies'] },
  'tpl-sale': { sellerTypes: ['general', 'fashion', 'electronics', 'food', 'wholesale'], sections: ['hero', 'products', 'banner'] },
  'tpl-lookbook': { sellerTypes: ['fashion'], sections: ['hero', 'products', 'collections'] },
  'tpl-shipping': { sellerTypes: ['general', 'wholesale'], sections: ['hero', 'policies'] },
  'tpl-size-guide': { sellerTypes: ['fashion'], sections: ['policies'] },
  'tpl-collection': { sellerTypes: ['fashion', 'electronics', 'food', 'wholesale'], sections: ['hero', 'products', 'collections'] },
  'tpl-seasonal': { sellerTypes: ['general', 'fashion', 'food'], sections: ['hero', 'products', 'banner'] },
  'tpl-testimonials': { sellerTypes: ['general', 'services'], sections: ['hero', 'testimonials'] },
  'tpl-loyalty': { sellerTypes: ['general', 'fashion', 'electronics', 'food'], sections: ['hero', 'banner'] },
  'tpl-gift-cards': { sellerTypes: ['fashion', 'food', 'services', 'digital'], sections: ['hero', 'products'] },
  'tpl-homepage-dynamic': { sellerTypes: ['general', 'fashion', 'electronics', 'food', 'services', 'digital', 'wholesale'], sections: ['hero', 'products', 'collections', 'testimonials', 'policies', 'contact'], isHomepage: true },
};

function isHexColor(value?: string | null): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function escapeTemplateText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function applyColorBranding(value: string, primaryColor: string, secondaryColor: string): string {
  return value
    .replace(/#16C784/g, primaryColor)
    .replace(/#14b876/g, primaryColor)
    .replace(/#1A1A2E/g, secondaryColor);
}

function brandLockup(branding: TemplateBranding): string {
  const storeName = branding.storeName?.trim();
  const logoUrl = branding.logoUrl?.trim();
  if (!storeName && !logoUrl) return '';
  const name = escapeTemplateText(storeName || 'Votre boutique');
  const logo = logoUrl
    ? `<img src="${escapeTemplateText(logoUrl)}" alt="${name}" style="height: 38px; width: auto; max-width: 160px; object-fit: contain;" />`
    : `<span style="display: inline-flex; width: 38px; height: 38px; border-radius: 12px; background: rgba(255,255,255,0.14); align-items: center; justify-content: center; font-weight: 800;">${name.slice(0, 1).toUpperCase()}</span>`;
  return `<div style="display: inline-flex; align-items: center; gap: 12px; margin-bottom: 28px; padding: 10px 14px; border-radius: 999px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18);">${logo}<span style="font-size: 14px; font-weight: 700;">${name}</span></div>`;
}

function applyBrandLockup(html: string, branding: TemplateBranding): string {
  const lockup = brandLockup(branding);
  if (!lockup) return html;
  const container = `<div style="${MAX_W}">`;
  if (html.includes(container)) {
    return html.replace(container, `${container}\n    ${lockup}`);
  }
  return `${lockup}\n${html}`;
}

function withTemplateMetadata(templates: PageTemplate[]): PageTemplate[] {
  return templates.map((template) => ({
    ...template,
    ...(TEMPLATE_METADATA[template.id] || { sellerTypes: ['general'] }),
  }));
}

export function applyTemplateBranding(template: PageTemplate, branding: TemplateBranding = {}): PageTemplate {
  const primaryColor = isHexColor(branding.primaryColor) ? branding.primaryColor : '#16C784';
  const secondaryColor = isHexColor(branding.secondaryColor) ? branding.secondaryColor : '#1A1A2E';
  const storeName = branding.storeName?.trim();
  let html = applyColorBranding(template.html, primaryColor, secondaryColor);
  const css = applyColorBranding(template.css, primaryColor, secondaryColor);
  if (storeName) {
    html = html
      .replace(/Votre boutique/g, escapeTemplateText(storeName))
      .replace(/votre boutique/g, escapeTemplateText(storeName))
      .replace(/Notre Boutique/g, escapeTemplateText(storeName))
      .replace(/Notre boutique/g, escapeTemplateText(storeName))
      .replace(/notre boutique/g, escapeTemplateText(storeName));
  }
  html = applyBrandLockup(html, branding);
  return { ...template, html, css };
}

/**
 * Shared responsive CSS injected into every template via the `css` field.
 * Provides mobile-first breakpoints, hover states, and smooth transitions
 * that cannot be expressed with inline styles alone.
 *
 * Breakpoints match design-system.md:
 *   - Mobile:  0 – 639px
 *   - Tablet:  640px – 1023px
 *   - Desktop: 1024px+
 */
const RESPONSIVE_CSS = `
/* ── Base reset ── */
*, *::before, *::after { box-sizing: border-box; }
img { max-width: 100%; height: auto; }
section { overflow-x: hidden; }

/* ── Hover states (design-system.md §3.2) ── */
a[style*="background: #16C784"]:hover,
button[style*="background: #16C784"]:hover {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(22, 199, 132, 0.3);
}
a[style*="background: #16C784"]:active,
button[style*="background: #16C784"]:active {
  transform: scale(0.98);
}
a[style*="border: 2px solid #16C784"]:hover {
  background: rgba(22, 199, 132, 0.08) !important;
  transform: scale(1.02);
}
a[style*="background: white"][style*="color: #16C784"]:hover,
a[style*="background: white"][style*="color: #EA3943"]:hover,
a[style*="background: white"][style*="color: #FF6B35"]:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* ── Card hover lift ── */
div[style*="border: 1px solid #E5E7EB"][style*="border-radius: 12px"]:hover,
div[style*="box-shadow: 0 1px 3px"][style*="border-radius: 12px"]:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12);
}

/* ── Image zoom on hover ── */
div[style*="aspect-ratio"] {
  overflow: hidden;
}
div[style*="aspect-ratio"]:hover {
  /* Only apply to cards that contain product images */
}

/* ── Mobile: 0 – 639px ── */
@media (max-width: 639px) {
  section { padding-left: 16px !important; padding-right: 16px !important; }

  /* Hero titles scale down */
  h1[style*="font-size: 52px"],
  h1[style*="font-size: 48px"],
  h1[style*="font-size: 56px"],
  h1[style*="font-size: 44px"] {
    font-size: 28px !important;
    line-height: 1.15 !important;
  }
  h2[style*="font-size: 30px"],
  h2[style*="font-size: 28px"],
  h2[style*="font-size: 36px"] {
    font-size: 22px !important;
  }
  p[style*="font-size: 18px"],
  p[style*="font-size: 20px"] {
    font-size: 15px !important;
  }

  /* Grids collapse to 1 column on mobile */
  div[style*="grid-template-columns: repeat(3"],
  div[style*="grid-template-columns: repeat(4"],
  div[style*="grid-template-columns: 1fr 1fr"],
  div[style*="grid-template-columns: 2fr 1fr"] {
    grid-template-columns: 1fr !important;
  }

  /* 2-col grids stay 2-col for product cards */
  div[style*="grid-template-columns: repeat(4, 1fr)"] {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  /* Side-by-side layouts stack */
  div[style*="display: flex"][style*="gap: 48px"],
  div[style*="display: flex"][style*="gap: 32px"] {
    flex-direction: column !important;
  }

  /* Countdown timer stays horizontal but smaller */
  div[style*="justify-content: center"][style*="gap: 16px"] > div[style*="min-width: 80px"],
  div[style*="justify-content: center"][style*="gap: 16px"] > div[style*="min-width: 70px"] {
    min-width: 60px !important;
    padding: 12px 14px !important;
  }
  div[style*="justify-content: center"][style*="gap: 16px"] > div p[style*="font-size: 36px"],
  div[style*="justify-content: center"][style*="gap: 16px"] > div p[style*="font-size: 32px"] {
    font-size: 24px !important;
  }

  /* Stats numbers scale down */
  p[style*="font-size: 42px"],
  p[style*="font-size: 36px"] {
    font-size: 28px !important;
  }

  /* Buttons full-width on mobile */
  div[style*="display: flex"][style*="justify-content: center"][style*="flex-wrap: wrap"] > a {
    width: 100%;
    text-align: center;
  }

  /* Table horizontal scroll */
  table { display: block; overflow-x: auto; white-space: nowrap; }

  /* Grid-row span reset */
  div[style*="grid-row: span 2"] {
    grid-row: span 1 !important;
  }
}

/* ── Tablet: 640px – 1023px ── */
@media (min-width: 640px) and (max-width: 1023px) {
  h1[style*="font-size: 52px"],
  h1[style*="font-size: 56px"] {
    font-size: 38px !important;
  }
  h1[style*="font-size: 48px"],
  h1[style*="font-size: 44px"] {
    font-size: 34px !important;
  }

  /* 4-col grids become 2-col */
  div[style*="grid-template-columns: repeat(4"] {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  /* 3-col grids become 2-col */
  div[style*="grid-template-columns: repeat(3"] {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  /* 2-col with sidebar stays but narrows */
  div[style*="grid-template-columns: 2fr 1fr"] {
    grid-template-columns: 1fr !important;
  }
}

/* ── Smooth scroll for carousel ── */
div[style*="overflow-x: auto"] {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}
div[style*="overflow-x: auto"]::-webkit-scrollbar {
  height: 6px;
}
div[style*="overflow-x: auto"]::-webkit-scrollbar-thumb {
  background: #D1D5DB;
  border-radius: 3px;
}

/* ── Focus visible for accessibility ── */
a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible {
  outline: 2px solid #16C784;
  outline-offset: 2px;
}

/* ── Input focus state ── */
input:focus, textarea:focus {
  border-color: #16C784 !important;
  box-shadow: 0 0 0 3px rgba(22, 199, 132, 0.15);
}

/* ── Placeholder image pattern (subtle diagonal stripes) ── */
div[style*="aspect-ratio"][style*="background: #F3F4F6"],
div[style*="aspect-ratio"][style*="background: #E5E7EB"] {
  background-image: linear-gradient(
    135deg,
    transparent 25%,
    rgba(0,0,0,0.02) 25%,
    rgba(0,0,0,0.02) 50%,
    transparent 50%,
    transparent 75%,
    rgba(0,0,0,0.02) 75%
  ) !important;
  background-size: 20px 20px !important;
}
`.trim();

// ─── Templates ──────────────────────────────────────────────

export const PAGE_TEMPLATES: PageTemplate[] = withTemplateMetadata([
  // ═══════════════════════════════════════════════════════════
  // 1. LANDING PAGE (Product Launch)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-landing',
    name: 'Lancement Produit',
    slug: 'lancement',
    category: 'marketing',
    description: 'Page de lancement avec hero, features, témoignages et CTA.',
    icon: '🚀',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} text-align: center; background: linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%); color: white;">
  <div style="${MAX_W}">
    <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.15em; color: #16C784; margin-bottom: 16px; font-weight: 600;">Nouveau</p>
    <h1 style="font-size: 52px; font-weight: 800; ${BASE_FONT} margin-bottom: 20px; line-height: 1.1;">
      Découvrez notre<br/>dernier produit
    </h1>
    <p style="font-size: 18px; color: #94A3B8; margin-bottom: 36px; max-width: 560px; margin-left: auto; margin-right: auto; line-height: 1.6;">
      Une innovation pensée pour vous. Qualité premium, design moderne, livraison rapide partout en Tunisie.
    </p>
    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
      <a href="#" style="${BTN_PRIMARY}">Commander maintenant</a>
      <a href="#" style="${BTN_OUTLINE} color: white; border-color: rgba(255,255,255,0.3);">En savoir plus</a>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; text-align: center;">
      <div style="padding: 24px;">
        <div style="width: 56px; height: 56px; background: #F0FDF4; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px;">✨</div>
        <h3 style="font-weight: 600; margin-bottom: 8px; font-size: 18px;">Qualité Premium</h3>
        <p style="font-size: 14px; color: #6B7280; line-height: 1.6;">Matériaux soigneusement sélectionnés pour une durabilité exceptionnelle.</p>
      </div>
      <div style="padding: 24px;">
        <div style="width: 56px; height: 56px; background: #F0FDF4; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px;">🚚</div>
        <h3 style="font-weight: 600; margin-bottom: 8px; font-size: 18px;">Livraison Express</h3>
        <p style="font-size: 14px; color: #6B7280; line-height: 1.6;">Recevez votre commande en 2-3 jours partout en Tunisie.</p>
      </div>
      <div style="padding: 24px;">
        <div style="width: 56px; height: 56px; background: #F0FDF4; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px;">🔒</div>
        <h3 style="font-weight: 600; margin-bottom: 8px; font-size: 18px;">Paiement Sécurisé</h3>
        <p style="font-size: 14px; color: #6B7280; line-height: 1.6;">Flouci, Konnect, Mandat Minute ou paiement à la livraison.</p>
      </div>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM} background: #F9FAFB; text-align: center;">
  <div style="${MAX_W}">
    <h2 style="${H2_STYLE}">Ce que disent nos clients</h2>
    <p style="${SUBTITLE}">Des centaines de clients satisfaits.</p>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;">
      <div style="${CARD_SHADOW} padding: 28px; text-align: left;">
        <p style="color: #F5A623; margin-bottom: 12px; font-size: 16px;">★★★★★</p>
        <p style="color: #374151; margin-bottom: 16px; line-height: 1.6;">"Produit exceptionnel ! La qualité est au rendez-vous et la livraison était très rapide."</p>
        <p style="font-weight: 600; font-size: 14px; color: #111827;">— Sami B., Tunis</p>
      </div>
      <div style="${CARD_SHADOW} padding: 28px; text-align: left;">
        <p style="color: #F5A623; margin-bottom: 12px; font-size: 16px;">★★★★★</p>
        <p style="color: #374151; margin-bottom: 16px; line-height: 1.6;">"Je recommande vivement cette boutique. Service client réactif et produits conformes."</p>
        <p style="font-weight: 600; font-size: 14px; color: #111827;">— Amira K., Sfax</p>
      </div>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM} background: #16C784; text-align: center; color: white;">
  <div style="${MAX_W}">
    <h2 style="font-size: 30px; font-weight: 700; margin-bottom: 12px;">Prêt à commander ?</h2>
    <p style="font-size: 16px; opacity: 0.9; margin-bottom: 28px;">Profitez de la livraison gratuite sur votre première commande.</p>
    <a href="#" style="display: inline-block; padding: 14px 32px; background: white; color: #16C784; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 16px;">Commander maintenant</a>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 2. ABOUT US
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-about',
    name: 'À propos',
    slug: 'a-propos',
    category: 'informational',
    description: 'Présentez votre boutique, votre histoire et votre équipe.',
    icon: '👥',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} background: linear-gradient(135deg, #1A1A2E, #16213E); color: white; text-align: center;">
  <div style="${MAX_W}">
    <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.15em; color: #16C784; margin-bottom: 12px; font-weight: 600;">Notre histoire</p>
    <h1 style="font-size: 44px; font-weight: 800; ${BASE_FONT} margin-bottom: 16px;">À propos de nous</h1>
    <p style="font-size: 18px; color: #94A3B8; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      Passionnés par la qualité et le service, nous mettons tout en œuvre pour vous offrir une expérience d'achat exceptionnelle.
    </p>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W} display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;">
    <div style="aspect-ratio: 4/3; background: #F3F4F6; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 48px;">📸</div>
    <div>
      <h2 style="${H2_STYLE}">Notre Mission</h2>
      <p style="font-size: 16px; color: #374151; line-height: 1.7; margin-bottom: 16px;">
        Fondée en Tunisie, notre boutique est née d'une passion pour les produits de qualité accessibles à tous. Nous sélectionnons chaque article avec soin pour garantir votre satisfaction.
      </p>
      <p style="font-size: 16px; color: #374151; line-height: 1.7;">
        Notre engagement : vous offrir le meilleur rapport qualité-prix avec un service client irréprochable et une livraison rapide partout en Tunisie.
      </p>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM} background: #F9FAFB;">
  <div style="${MAX_W} text-align: center;">
    <h2 style="${H2_STYLE}">Nos Valeurs</h2>
    <p style="${SUBTITLE}">Ce qui nous guide au quotidien.</p>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
      <div style="padding: 24px;">
        <div style="font-size: 36px; margin-bottom: 12px;">🎯</div>
        <h3 style="font-weight: 600; margin-bottom: 8px;">Qualité</h3>
        <p style="font-size: 14px; color: #6B7280;">Des produits rigoureusement sélectionnés.</p>
      </div>
      <div style="padding: 24px;">
        <div style="font-size: 36px; margin-bottom: 12px;">🤝</div>
        <h3 style="font-weight: 600; margin-bottom: 8px;">Confiance</h3>
        <p style="font-size: 14px; color: #6B7280;">Transparence et honnêteté.</p>
      </div>
      <div style="padding: 24px;">
        <div style="font-size: 36px; margin-bottom: 12px;">💡</div>
        <h3 style="font-weight: 600; margin-bottom: 8px;">Innovation</h3>
        <p style="font-size: 14px; color: #6B7280;">Toujours à la pointe des tendances.</p>
      </div>
      <div style="padding: 24px;">
        <div style="font-size: 36px; margin-bottom: 12px;">🌍</div>
        <h3 style="font-weight: 600; margin-bottom: 8px;">Local</h3>
        <p style="font-size: 14px; color: #6B7280;">Fiers d'être tunisiens.</p>
      </div>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W} text-align: center;">
    <h2 style="${H2_STYLE}">Notre Équipe</h2>
    <p style="${SUBTITLE}">Des passionnés à votre service.</p>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;">
      <div>
        <div style="width: 100px; height: 100px; border-radius: 50%; background: #E5E7EB; margin: 0 auto 16px;"></div>
        <p style="font-weight: 600; font-size: 16px;">Ahmed</p>
        <p style="font-size: 14px; color: #16C784;">Fondateur</p>
      </div>
      <div>
        <div style="width: 100px; height: 100px; border-radius: 50%; background: #E5E7EB; margin: 0 auto 16px;"></div>
        <p style="font-weight: 600; font-size: 16px;">Sarra</p>
        <p style="font-size: 14px; color: #16C784;">Responsable Design</p>
      </div>
      <div>
        <div style="width: 100px; height: 100px; border-radius: 50%; background: #E5E7EB; margin: 0 auto 16px;"></div>
        <p style="font-weight: 600; font-size: 16px;">Youssef</p>
        <p style="font-size: 14px; color: #16C784;">Logistique</p>
      </div>
    </div>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 3. CONTACT PAGE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-contact',
    name: 'Contact',
    slug: 'contact',
    category: 'informational',
    description: 'Formulaire de contact avec coordonnées et carte.',
    icon: '📞',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} background: linear-gradient(135deg, #1A1A2E, #16213E); color: white; text-align: center;">
  <div style="${MAX_W}">
    <h1 style="font-size: 44px; font-weight: 800; ${BASE_FONT} margin-bottom: 12px;">Contactez-nous</h1>
    <p style="font-size: 18px; color: #94A3B8;">Nous sommes là pour vous aider. N'hésitez pas à nous écrire.</p>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W} display: grid; grid-template-columns: 1fr 1fr; gap: 48px;">
    <div>
      <h2 style="${H2_STYLE} font-size: 24px;">Envoyez-nous un message</h2>
      <form style="display: flex; flex-direction: column; gap: 16px; margin-top: 24px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <input type="text" placeholder="Nom" style="padding: 12px 16px; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px; ${BASE_FONT}" />
          <input type="email" placeholder="Email" style="padding: 12px 16px; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px; ${BASE_FONT}" />
        </div>
        <input type="text" placeholder="Sujet" style="padding: 12px 16px; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px; ${BASE_FONT}" />
        <textarea placeholder="Votre message..." rows="5" style="padding: 12px 16px; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 14px; resize: vertical; ${BASE_FONT}"></textarea>
        <button type="submit" style="${BTN_PRIMARY} text-align: center;">Envoyer le message</button>
      </form>
    </div>
    <div>
      <h2 style="${H2_STYLE} font-size: 24px;">Nos Coordonnées</h2>
      <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 24px;">
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="width: 44px; height: 44px; background: #F0FDF4; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">📍</div>
          <div>
            <p style="font-weight: 600; margin-bottom: 4px;">Adresse</p>
            <p style="font-size: 14px; color: #6B7280;">Rue de la Liberté, Tunis 1000, Tunisie</p>
          </div>
        </div>
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="width: 44px; height: 44px; background: #F0FDF4; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">📧</div>
          <div>
            <p style="font-weight: 600; margin-bottom: 4px;">Email</p>
            <p style="font-size: 14px; color: #6B7280;">contact@maboutique.tn</p>
          </div>
        </div>
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="width: 44px; height: 44px; background: #F0FDF4; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">📱</div>
          <div>
            <p style="font-weight: 600; margin-bottom: 4px;">Téléphone</p>
            <p style="font-size: 14px; color: #6B7280;">+216 XX XXX XXX</p>
          </div>
        </div>
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div style="width: 44px; height: 44px; background: #F0FDF4; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">🕐</div>
          <div>
            <p style="font-weight: 600; margin-bottom: 4px;">Horaires</p>
            <p style="font-size: 14px; color: #6B7280;">Lun - Sam : 9h00 - 18h00</p>
          </div>
        </div>
      </div>
      <div style="margin-top: 32px; aspect-ratio: 16/9; background: #E5E7EB; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #9CA3AF;">
        📍 Intégrez votre carte Google Maps ici
      </div>
    </div>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 4. FAQ PAGE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-faq',
    name: 'FAQ',
    slug: 'faq',
    category: 'informational',
    description: 'Questions fréquentes organisées par catégorie.',
    icon: '❓',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} background: linear-gradient(135deg, #1A1A2E, #16213E); color: white; text-align: center;">
  <div style="${MAX_W}">
    <h1 style="font-size: 44px; font-weight: 800; ${BASE_FONT} margin-bottom: 12px;">Questions Fréquentes</h1>
    <p style="font-size: 18px; color: #94A3B8;">Trouvez rapidement les réponses à vos questions.</p>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="max-width: 800px; margin: 0 auto;">
    <h2 style="${H2_STYLE} font-size: 22px;">🛒 Commandes</h2>
    <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; margin-bottom: 32px;">
      <div style="padding: 20px 24px; border-bottom: 1px solid #E5E7EB;">
        <p style="font-weight: 600; margin: 0; color: #111827;">Comment passer une commande ?</p>
        <p style="color: #6B7280; margin-top: 8px; font-size: 14px; line-height: 1.6;">Parcourez notre catalogue, ajoutez les articles souhaités au panier, puis suivez les étapes de checkout. Vous pouvez payer par Flouci, Konnect, Mandat Minute ou à la livraison.</p>
      </div>
      <div style="padding: 20px 24px; border-bottom: 1px solid #E5E7EB;">
        <p style="font-weight: 600; margin: 0; color: #111827;">Puis-je modifier ma commande après validation ?</p>
        <p style="color: #6B7280; margin-top: 8px; font-size: 14px; line-height: 1.6;">Contactez-nous dans les 2 heures suivant votre commande. Au-delà, la commande est en cours de préparation et ne peut plus être modifiée.</p>
      </div>
      <div style="padding: 20px 24px;">
        <p style="font-weight: 600; margin: 0; color: #111827;">Comment suivre ma commande ?</p>
        <p style="color: #6B7280; margin-top: 8px; font-size: 14px; line-height: 1.6;">Rendez-vous dans votre espace client, section "Mes commandes". Vous y trouverez le statut et le numéro de suivi de chaque commande.</p>
      </div>
    </div>

    <h2 style="${H2_STYLE} font-size: 22px;">🚚 Livraison</h2>
    <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; margin-bottom: 32px;">
      <div style="padding: 20px 24px; border-bottom: 1px solid #E5E7EB;">
        <p style="font-weight: 600; margin: 0; color: #111827;">Quels sont les délais de livraison ?</p>
        <p style="color: #6B7280; margin-top: 8px; font-size: 14px; line-height: 1.6;">3 à 5 jours ouvrables pour le Grand Tunis, 5 à 7 jours pour le reste de la Tunisie.</p>
      </div>
      <div style="padding: 20px 24px;">
        <p style="font-weight: 600; margin: 0; color: #111827;">Combien coûte la livraison ?</p>
        <p style="color: #6B7280; margin-top: 8px; font-size: 14px; line-height: 1.6;">7 TND pour la livraison standard. Gratuite à partir de 100 TND d'achat.</p>
      </div>
    </div>

    <h2 style="${H2_STYLE} font-size: 22px;">💳 Paiement</h2>
    <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; margin-bottom: 32px;">
      <div style="padding: 20px 24px; border-bottom: 1px solid #E5E7EB;">
        <p style="font-weight: 600; margin: 0; color: #111827;">Quels modes de paiement acceptez-vous ?</p>
        <p style="color: #6B7280; margin-top: 8px; font-size: 14px; line-height: 1.6;">Flouci, Konnect (paiement en ligne), Mandat Minute (virement postal) et paiement à la livraison (COD).</p>
      </div>
      <div style="padding: 20px 24px;">
        <p style="font-weight: 600; margin: 0; color: #111827;">Le paiement est-il sécurisé ?</p>
        <p style="color: #6B7280; margin-top: 8px; font-size: 14px; line-height: 1.6;">Oui, toutes les transactions sont chiffrées et sécurisées. Nous ne stockons jamais vos données bancaires.</p>
      </div>
    </div>

    <h2 style="${H2_STYLE} font-size: 22px;">🔄 Retours</h2>
    <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
      <div style="padding: 20px 24px; border-bottom: 1px solid #E5E7EB;">
        <p style="font-weight: 600; margin: 0; color: #111827;">Comment retourner un produit ?</p>
        <p style="color: #6B7280; margin-top: 8px; font-size: 14px; line-height: 1.6;">Contactez notre service client dans les 14 jours suivant la réception. Le produit doit être dans son état d'origine, non utilisé et dans son emballage.</p>
      </div>
      <div style="padding: 20px 24px;">
        <p style="font-weight: 600; margin: 0; color: #111827;">Quand serai-je remboursé ?</p>
        <p style="color: #6B7280; margin-top: 8px; font-size: 14px; line-height: 1.6;">Le remboursement est effectué sous 5 à 7 jours ouvrables après réception et vérification du produit retourné.</p>
      </div>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM} background: #F0FDF4; text-align: center;">
  <div style="${MAX_W}">
    <h2 style="${H2_STYLE} font-size: 24px;">Vous n'avez pas trouvé votre réponse ?</h2>
    <p style="${SUBTITLE}">Notre équipe est disponible pour vous aider.</p>
    <a href="#" style="${BTN_PRIMARY}">Nous contacter</a>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 5. SALE / PROMOTION PAGE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-sale',
    name: 'Promotion / Soldes',
    slug: 'promotions',
    category: 'marketing',
    description: 'Page de soldes avec countdown, produits en promo et CTA urgents.',
    icon: '🔥',
    css: RESPONSIVE_CSS,
    html: `
<section style="padding: 80px 24px; background: linear-gradient(135deg, #EA3943 0%, #FF6B6B 100%); text-align: center; color: white;">
  <div style="${MAX_W}">
    <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px; font-weight: 600;">⚡ Offre limitée</p>
    <h1 style="font-size: 52px; font-weight: 800; ${BASE_FONT} margin-bottom: 16px;">Soldes Flash</h1>
    <p style="font-size: 18px; opacity: 0.9; margin-bottom: 32px;">Jusqu'à -50% sur une sélection de produits. Ne manquez pas cette occasion !</p>
    <div style="display: flex; justify-content: center; gap: 16px; margin-bottom: 36px;">
      <div style="background: rgba(255,255,255,0.2); padding: 16px 24px; border-radius: 12px; min-width: 80px;">
        <p style="font-size: 36px; font-weight: 800; margin: 0;">02</p>
        <p style="font-size: 12px; margin: 0; opacity: 0.8;">JOURS</p>
      </div>
      <div style="background: rgba(255,255,255,0.2); padding: 16px 24px; border-radius: 12px; min-width: 80px;">
        <p style="font-size: 36px; font-weight: 800; margin: 0;">14</p>
        <p style="font-size: 12px; margin: 0; opacity: 0.8;">HEURES</p>
      </div>
      <div style="background: rgba(255,255,255,0.2); padding: 16px 24px; border-radius: 12px; min-width: 80px;">
        <p style="font-size: 36px; font-weight: 800; margin: 0;">37</p>
        <p style="font-size: 12px; margin: 0; opacity: 0.8;">MINUTES</p>
      </div>
    </div>
    <a href="#" style="display: inline-block; padding: 16px 40px; background: white; color: #EA3943; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 18px;">Voir les offres →</a>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <h2 style="${H2_STYLE} text-align: center;">Meilleures Offres</h2>
    <p style="${SUBTITLE} text-align: center;">Sélection limitée, premiers arrivés premiers servis.</p>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
      <div style="${CARD}">
        <div style="aspect-ratio: 1; background: #F3F4F6; position: relative;">
          <span style="position: absolute; top: 8px; left: 8px; background: #EA3943; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700;">-30%</span>
        </div>
        <div style="padding: 16px;">
          <p style="font-weight: 600; margin-bottom: 8px;">Produit en promo</p>
          <div style="display: flex; align-items: center; gap: 8px;">
            <p style="color: #EA3943; font-weight: 700; font-size: 18px;">59.000 TND</p>
            <p style="color: #9CA3AF; text-decoration: line-through; font-size: 14px;">85.000 TND</p>
          </div>
        </div>
      </div>
      <div style="${CARD}">
        <div style="aspect-ratio: 1; background: #F3F4F6; position: relative;">
          <span style="position: absolute; top: 8px; left: 8px; background: #EA3943; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700;">-50%</span>
        </div>
        <div style="padding: 16px;">
          <p style="font-weight: 600; margin-bottom: 8px;">Produit en promo</p>
          <div style="display: flex; align-items: center; gap: 8px;">
            <p style="color: #EA3943; font-weight: 700; font-size: 18px;">45.000 TND</p>
            <p style="color: #9CA3AF; text-decoration: line-through; font-size: 14px;">90.000 TND</p>
          </div>
        </div>
      </div>
      <div style="${CARD}">
        <div style="aspect-ratio: 1; background: #F3F4F6; position: relative;">
          <span style="position: absolute; top: 8px; left: 8px; background: #EA3943; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700;">-20%</span>
        </div>
        <div style="padding: 16px;">
          <p style="font-weight: 600; margin-bottom: 8px;">Produit en promo</p>
          <div style="display: flex; align-items: center; gap: 8px;">
            <p style="color: #EA3943; font-weight: 700; font-size: 18px;">120.000 TND</p>
            <p style="color: #9CA3AF; text-decoration: line-through; font-size: 14px;">150.000 TND</p>
          </div>
        </div>
      </div>
      <div style="${CARD}">
        <div style="aspect-ratio: 1; background: #F3F4F6; position: relative;">
          <span style="position: absolute; top: 8px; left: 8px; background: #EA3943; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700;">-40%</span>
        </div>
        <div style="padding: 16px;">
          <p style="font-weight: 600; margin-bottom: 8px;">Produit en promo</p>
          <div style="display: flex; align-items: center; gap: 8px;">
            <p style="color: #EA3943; font-weight: 700; font-size: 18px;">35.000 TND</p>
            <p style="color: #9CA3AF; text-decoration: line-through; font-size: 14px;">58.000 TND</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM} background: #FEF2F2; text-align: center;">
  <div style="${MAX_W}">
    <h2 style="font-size: 28px; font-weight: 700; color: #EA3943; margin-bottom: 12px;">🔥 Dépêchez-vous !</h2>
    <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">Les stocks sont limités. Commandez maintenant avant qu'il ne soit trop tard.</p>
    <a href="#" style="display: inline-block; padding: 14px 32px; background: #EA3943; color: white; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 16px;">Voir toutes les promotions</a>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 6. LOOKBOOK / GALLERY
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-lookbook',
    name: 'Lookbook / Galerie',
    slug: 'lookbook',
    category: 'e-commerce',
    description: 'Galerie visuelle de produits en situation, style magazine.',
    icon: '📸',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} background: #0F0F23; color: white; text-align: center;">
  <div style="${MAX_W}">
    <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.2em; color: #16C784; margin-bottom: 12px; font-weight: 600;">Collection 2026</p>
    <h1 style="font-size: 48px; font-weight: 800; ${BASE_FONT} margin-bottom: 16px;">Lookbook</h1>
    <p style="font-size: 18px; color: #94A3B8;">Découvrez nos produits en situation. Inspirez-vous.</p>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
      <div style="grid-row: span 2; aspect-ratio: 2/3; background: linear-gradient(180deg, #F3F4F6 0%, #E5E7EB 100%); border-radius: 12px; display: flex; align-items: flex-end; padding: 24px; position: relative; overflow: hidden;">
        <div style="position: relative; z-index: 1;">
          <p style="font-weight: 700; font-size: 18px; color: #111827;">Collection Été</p>
          <p style="font-size: 14px; color: #6B7280;">12 articles</p>
        </div>
      </div>
      <div style="aspect-ratio: 1; background: #F3F4F6; border-radius: 12px;"></div>
      <div style="aspect-ratio: 1; background: #E5E7EB; border-radius: 12px;"></div>
      <div style="aspect-ratio: 1; background: #E5E7EB; border-radius: 12px;"></div>
      <div style="aspect-ratio: 1; background: #F3F4F6; border-radius: 12px;"></div>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM} background: #F9FAFB;">
  <div style="${MAX_W}">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div style="aspect-ratio: 16/9; background: #E5E7EB; border-radius: 12px;"></div>
      <div style="aspect-ratio: 16/9; background: #F3F4F6; border-radius: 12px;"></div>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM} text-align: center;">
  <div style="${MAX_W}">
    <h2 style="${H2_STYLE}">Envie de shopper ?</h2>
    <p style="${SUBTITLE}">Retrouvez tous ces articles dans notre catalogue.</p>
    <a href="#" style="${BTN_PRIMARY}">Voir le catalogue</a>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 7. BLOG LISTING
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-blog',
    name: 'Blog / Actualités',
    slug: 'blog',
    category: 'content',
    description: 'Liste d\'articles de blog avec catégories et images.',
    icon: '📰',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} background: linear-gradient(135deg, #1A1A2E, #16213E); color: white; text-align: center;">
  <div style="${MAX_W}">
    <h1 style="font-size: 44px; font-weight: 800; ${BASE_FONT} margin-bottom: 12px;">Notre Blog</h1>
    <p style="font-size: 18px; color: #94A3B8;">Conseils, tendances et actualités de notre boutique.</p>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 32px;">
      <div>
        <article style="${CARD} margin-bottom: 24px;">
          <div style="aspect-ratio: 16/9; background: #F3F4F6;"></div>
          <div style="padding: 24px;">
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <span style="padding: 4px 10px; background: #F0FDF4; color: #16C784; border-radius: 6px; font-size: 12px; font-weight: 600;">CONSEILS</span>
              <span style="font-size: 12px; color: #9CA3AF; line-height: 24px;">15 Mai 2026</span>
            </div>
            <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Comment bien choisir ses produits en ligne</h2>
            <p style="font-size: 14px; color: #6B7280; line-height: 1.6; margin-bottom: 16px;">Découvrez nos conseils pour faire les meilleurs choix lors de vos achats en ligne. Qualité, prix, avis clients...</p>
            <a href="#" style="color: #16C784; font-weight: 600; font-size: 14px; text-decoration: none;">Lire la suite →</a>
          </div>
        </article>
        <article style="${CARD} margin-bottom: 24px;">
          <div style="aspect-ratio: 16/9; background: #E5E7EB;"></div>
          <div style="padding: 24px;">
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <span style="padding: 4px 10px; background: #EFF6FF; color: #3B82F6; border-radius: 6px; font-size: 12px; font-weight: 600;">TENDANCES</span>
              <span style="font-size: 12px; color: #9CA3AF; line-height: 24px;">10 Mai 2026</span>
            </div>
            <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Les tendances de l'été 2026</h2>
            <p style="font-size: 14px; color: #6B7280; line-height: 1.6; margin-bottom: 16px;">Les incontournables de la saison estivale. Couleurs, styles et must-have à ne pas manquer.</p>
            <a href="#" style="color: #16C784; font-weight: 600; font-size: 14px; text-decoration: none;">Lire la suite →</a>
          </div>
        </article>
      </div>
      <aside>
        <div style="background: #F9FAFB; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="font-weight: 700; margin-bottom: 16px; font-size: 16px;">Catégories</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <a href="#" style="font-size: 14px; color: #374151; text-decoration: none; padding: 8px 0; border-bottom: 1px solid #E5E7EB;">Conseils (5)</a>
            <a href="#" style="font-size: 14px; color: #374151; text-decoration: none; padding: 8px 0; border-bottom: 1px solid #E5E7EB;">Tendances (3)</a>
            <a href="#" style="font-size: 14px; color: #374151; text-decoration: none; padding: 8px 0; border-bottom: 1px solid #E5E7EB;">Nouveautés (7)</a>
            <a href="#" style="font-size: 14px; color: #374151; text-decoration: none; padding: 8px 0;">Guides (2)</a>
          </div>
        </div>
        <div style="background: #16C784; border-radius: 12px; padding: 24px; color: white; text-align: center;">
          <h3 style="font-weight: 700; margin-bottom: 8px;">Newsletter</h3>
          <p style="font-size: 13px; opacity: 0.9; margin-bottom: 16px;">Recevez nos derniers articles.</p>
          <input type="email" placeholder="votre@email.com" style="width: 100%; padding: 10px 14px; border: none; border-radius: 8px; font-size: 14px; margin-bottom: 8px; box-sizing: border-box;" />
          <button style="width: 100%; padding: 10px; background: #1A1A2E; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">S'inscrire</button>
        </div>
      </aside>
    </div>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 8. SHIPPING & RETURNS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-shipping',
    name: 'Livraison & Retours',
    slug: 'livraison-retours',
    category: 'informational',
    description: 'Informations sur la livraison, les délais et la politique de retour.',
    icon: '🚚',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} background: linear-gradient(135deg, #1A1A2E, #16213E); color: white; text-align: center;">
  <div style="${MAX_W}">
    <h1 style="font-size: 44px; font-weight: 800; ${BASE_FONT} margin-bottom: 12px;">Livraison & Retours</h1>
    <p style="font-size: 18px; color: #94A3B8;">Tout ce que vous devez savoir sur nos services de livraison.</p>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 48px;">
      <div style="${CARD_SHADOW} padding: 32px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 16px;">🚚</div>
        <h3 style="font-weight: 700; margin-bottom: 8px; font-size: 18px;">Livraison Standard</h3>
        <p style="font-size: 28px; font-weight: 800; color: #16C784; margin-bottom: 8px;">7 TND</p>
        <p style="font-size: 14px; color: #6B7280;">3-5 jours ouvrables</p>
      </div>
      <div style="${CARD_SHADOW} padding: 32px; text-align: center; border: 2px solid #16C784;">
        <div style="font-size: 40px; margin-bottom: 16px;">⚡</div>
        <h3 style="font-weight: 700; margin-bottom: 8px; font-size: 18px;">Livraison Express</h3>
        <p style="font-size: 28px; font-weight: 800; color: #16C784; margin-bottom: 8px;">15 TND</p>
        <p style="font-size: 14px; color: #6B7280;">24-48 heures</p>
      </div>
      <div style="${CARD_SHADOW} padding: 32px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 16px;">🎁</div>
        <h3 style="font-weight: 700; margin-bottom: 8px; font-size: 18px;">Livraison Gratuite</h3>
        <p style="font-size: 28px; font-weight: 800; color: #16C784; margin-bottom: 8px;">0 TND</p>
        <p style="font-size: 14px; color: #6B7280;">Dès 100 TND d'achat</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 48px;">
      <div>
        <h2 style="${H2_STYLE} font-size: 24px;">📦 Zones de livraison</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px;">
          <thead>
            <tr style="background: #F3F4F6;">
              <th style="padding: 12px 16px; text-align: left; border-bottom: 2px solid #E5E7EB;">Zone</th>
              <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid #E5E7EB;">Délai</th>
              <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid #E5E7EB;">Tarif</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">Grand Tunis</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">2-3 jours</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">7 TND</td></tr>
            <tr><td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">Sahel</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">3-4 jours</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">7 TND</td></tr>
            <tr><td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">Nord-Ouest</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">4-5 jours</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">7 TND</td></tr>
            <tr><td style="padding: 12px 16px;">Sud</td><td style="padding: 12px 16px; text-align: center;">5-7 jours</td><td style="padding: 12px 16px; text-align: center;">10 TND</td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <h2 style="${H2_STYLE} font-size: 24px;">🔄 Politique de retour</h2>
        <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 16px;">
          <div style="padding: 16px; background: #F9FAFB; border-radius: 8px;">
            <p style="font-weight: 600; margin-bottom: 4px;">Délai de retour</p>
            <p style="font-size: 14px; color: #6B7280;">14 jours à compter de la réception de votre commande.</p>
          </div>
          <div style="padding: 16px; background: #F9FAFB; border-radius: 8px;">
            <p style="font-weight: 600; margin-bottom: 4px;">Conditions</p>
            <p style="font-size: 14px; color: #6B7280;">Produit non utilisé, dans son emballage d'origine, avec étiquettes.</p>
          </div>
          <div style="padding: 16px; background: #F9FAFB; border-radius: 8px;">
            <p style="font-weight: 600; margin-bottom: 4px;">Remboursement</p>
            <p style="font-size: 14px; color: #6B7280;">Sous 5-7 jours ouvrables après vérification du produit retourné.</p>
          </div>
          <div style="padding: 16px; background: #F9FAFB; border-radius: 8px;">
            <p style="font-weight: 600; margin-bottom: 4px;">Frais de retour</p>
            <p style="font-size: 14px; color: #6B7280;">À la charge du client sauf en cas de produit défectueux.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 9. SIZE GUIDE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-size-guide',
    name: 'Guide des Tailles',
    slug: 'guide-tailles',
    category: 'e-commerce',
    description: 'Tableau des tailles avec instructions de mesure.',
    icon: '📏',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} background: linear-gradient(135deg, #1A1A2E, #16213E); color: white; text-align: center;">
  <div style="${MAX_W}">
    <h1 style="font-size: 44px; font-weight: 800; ${BASE_FONT} margin-bottom: 12px;">Guide des Tailles</h1>
    <p style="font-size: 18px; color: #94A3B8;">Trouvez votre taille parfaite grâce à notre guide détaillé.</p>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="max-width: 900px; margin: 0 auto;">
    <h2 style="${H2_STYLE} font-size: 24px;">📐 Comment prendre vos mesures</h2>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; margin-bottom: 40px;">
      <div style="${CARD_SHADOW} padding: 20px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">1️⃣</div>
        <p style="font-weight: 600; margin-bottom: 4px;">Poitrine</p>
        <p style="font-size: 13px; color: #6B7280;">Mesurez le tour de poitrine au niveau le plus large.</p>
      </div>
      <div style="${CARD_SHADOW} padding: 20px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">2️⃣</div>
        <p style="font-weight: 600; margin-bottom: 4px;">Taille</p>
        <p style="font-size: 13px; color: #6B7280;">Mesurez le tour de taille au niveau le plus étroit.</p>
      </div>
      <div style="${CARD_SHADOW} padding: 20px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">3️⃣</div>
        <p style="font-weight: 600; margin-bottom: 4px;">Hanches</p>
        <p style="font-size: 13px; color: #6B7280;">Mesurez le tour de hanches au niveau le plus large.</p>
      </div>
    </div>

    <h2 style="${H2_STYLE} font-size: 24px;">👕 Hauts & Vestes</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px; margin-bottom: 40px;">
      <thead>
        <tr style="background: #F3F4F6;">
          <th style="padding: 14px 16px; text-align: left; border-bottom: 2px solid #E5E7EB; font-weight: 600;">Taille</th>
          <th style="padding: 14px 16px; text-align: center; border-bottom: 2px solid #E5E7EB; font-weight: 600;">Poitrine (cm)</th>
          <th style="padding: 14px 16px; text-align: center; border-bottom: 2px solid #E5E7EB; font-weight: 600;">Taille (cm)</th>
          <th style="padding: 14px 16px; text-align: center; border-bottom: 2px solid #E5E7EB; font-weight: 600;">Longueur (cm)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; font-weight: 600;">XS</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">82-86</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">62-66</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">64</td></tr>
        <tr style="background: #F9FAFB;"><td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; font-weight: 600;">S</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">86-91</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">66-71</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">66</td></tr>
        <tr><td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; font-weight: 600;">M</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">91-96</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">71-76</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">68</td></tr>
        <tr style="background: #F9FAFB;"><td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; font-weight: 600;">L</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">96-101</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">76-81</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">70</td></tr>
        <tr><td style="padding: 12px 16px; font-weight: 600;">XL</td><td style="padding: 12px 16px; text-align: center;">101-106</td><td style="padding: 12px 16px; text-align: center;">81-86</td><td style="padding: 12px 16px; text-align: center;">72</td></tr>
      </tbody>
    </table>

    <h2 style="${H2_STYLE} font-size: 24px;">👟 Chaussures</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px;">
      <thead>
        <tr style="background: #F3F4F6;">
          <th style="padding: 14px 16px; text-align: left; border-bottom: 2px solid #E5E7EB; font-weight: 600;">EU</th>
          <th style="padding: 14px 16px; text-align: center; border-bottom: 2px solid #E5E7EB; font-weight: 600;">US</th>
          <th style="padding: 14px 16px; text-align: center; border-bottom: 2px solid #E5E7EB; font-weight: 600;">UK</th>
          <th style="padding: 14px 16px; text-align: center; border-bottom: 2px solid #E5E7EB; font-weight: 600;">Longueur pied (cm)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; font-weight: 600;">38</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">6</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">5</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">24.0</td></tr>
        <tr style="background: #F9FAFB;"><td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; font-weight: 600;">39</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">6.5</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">5.5</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">24.5</td></tr>
        <tr><td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; font-weight: 600;">40</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">7</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">6</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">25.0</td></tr>
        <tr style="background: #F9FAFB;"><td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; font-weight: 600;">41</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">8</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">7</td><td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid #E5E7EB;">25.5</td></tr>
        <tr><td style="padding: 12px 16px; font-weight: 600;">42</td><td style="padding: 12px 16px; text-align: center;">9</td><td style="padding: 12px 16px; text-align: center;">8</td><td style="padding: 12px 16px; text-align: center;">26.5</td></tr>
      </tbody>
    </table>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 10. BRAND STORY
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-brand-story',
    name: 'Notre Histoire',
    slug: 'notre-histoire',
    category: 'content',
    description: 'Racontez l\'histoire de votre marque avec un design narratif.',
    icon: '📖',
    css: RESPONSIVE_CSS,
    html: `
<section style="padding: 100px 24px; background: linear-gradient(135deg, #0F0F23 0%, #1A1A2E 100%); color: white; text-align: center;">
  <div style="${MAX_W}">
    <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.2em; color: #16C784; margin-bottom: 16px; font-weight: 600;">Depuis 2024</p>
    <h1 style="font-size: 52px; font-weight: 800; ${BASE_FONT} margin-bottom: 20px; line-height: 1.1;">Notre Histoire</h1>
    <p style="font-size: 20px; color: #94A3B8; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      De la passion à la réalité. Découvrez comment tout a commencé.
    </p>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="max-width: 800px; margin: 0 auto;">
    <div style="display: flex; gap: 32px; margin-bottom: 48px; align-items: center;">
      <div style="width: 80px; height: 80px; background: #F0FDF4; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0;">🌱</div>
      <div>
        <p style="font-size: 13px; color: #16C784; font-weight: 600; margin-bottom: 4px;">2024</p>
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Les débuts</h3>
        <p style="font-size: 15px; color: #6B7280; line-height: 1.7;">Tout a commencé avec une idée simple : rendre les produits de qualité accessibles à tous les Tunisiens. Depuis notre petit atelier à Tunis, nous avons commencé à sélectionner les meilleurs articles.</p>
      </div>
    </div>
    <div style="display: flex; gap: 32px; margin-bottom: 48px; align-items: center;">
      <div style="width: 80px; height: 80px; background: #EFF6FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0;">🚀</div>
      <div>
        <p style="font-size: 13px; color: #3B82F6; font-weight: 600; margin-bottom: 4px;">2025</p>
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">La croissance</h3>
        <p style="font-size: 15px; color: #6B7280; line-height: 1.7;">Notre communauté a grandi rapidement. Des centaines de clients satisfaits nous ont fait confiance. Nous avons élargi notre catalogue et amélioré notre service de livraison.</p>
      </div>
    </div>
    <div style="display: flex; gap: 32px; margin-bottom: 48px; align-items: center;">
      <div style="width: 80px; height: 80px; background: #FEF3C7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0;">⭐</div>
      <div>
        <p style="font-size: 13px; color: #F5A623; font-weight: 600; margin-bottom: 4px;">2026</p>
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Aujourd'hui</h3>
        <p style="font-size: 15px; color: #6B7280; line-height: 1.7;">Nous sommes fiers de servir des milliers de clients à travers toute la Tunisie. Notre engagement reste le même : qualité, service et satisfaction client.</p>
      </div>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM} background: #F9FAFB; text-align: center;">
  <div style="${MAX_W}">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;">
      <div>
        <p style="font-size: 42px; font-weight: 800; color: #16C784;">5000+</p>
        <p style="font-size: 14px; color: #6B7280;">Clients satisfaits</p>
      </div>
      <div>
        <p style="font-size: 42px; font-weight: 800; color: #16C784;">500+</p>
        <p style="font-size: 14px; color: #6B7280;">Produits disponibles</p>
      </div>
      <div>
        <p style="font-size: 42px; font-weight: 800; color: #16C784;">24</p>
        <p style="font-size: 14px; color: #6B7280;">Gouvernorats livrés</p>
      </div>
    </div>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 11. COLLECTION SHOWCASE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-collection',
    name: 'Vitrine Collection',
    slug: 'collection',
    category: 'e-commerce',
    description: 'Présentez une collection de produits avec un design premium.',
    icon: '💎',
    css: RESPONSIVE_CSS,
    html: `
<section style="padding: 80px 24px; background: #0F0F23; color: white; text-align: center;">
  <div style="${MAX_W}">
    <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.2em; color: #16C784; margin-bottom: 12px; font-weight: 600;">Exclusivité</p>
    <h1 style="font-size: 48px; font-weight: 800; ${BASE_FONT} margin-bottom: 16px;">Collection Premium</h1>
    <p style="font-size: 18px; color: #94A3B8; max-width: 500px; margin: 0 auto;">Des pièces uniques sélectionnées pour leur qualité exceptionnelle.</p>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
      <div style="aspect-ratio: 4/5; background: linear-gradient(180deg, #F3F4F6, #E5E7EB); border-radius: 16px; display: flex; align-items: flex-end; padding: 32px; position: relative;">
        <div>
          <p style="font-weight: 700; font-size: 22px; color: #111827; margin-bottom: 4px;">Pièce Signature</p>
          <p style="font-size: 14px; color: #6B7280; margin-bottom: 12px;">L'essence de notre savoir-faire</p>
          <a href="#" style="color: #16C784; font-weight: 600; font-size: 14px; text-decoration: none;">Découvrir →</a>
        </div>
      </div>
      <div style="display: grid; grid-template-rows: 1fr 1fr; gap: 24px;">
        <div style="background: #F3F4F6; border-radius: 16px; display: flex; align-items: flex-end; padding: 24px;">
          <div>
            <p style="font-weight: 600; font-size: 16px; color: #111827;">Accessoires</p>
            <a href="#" style="color: #16C784; font-size: 14px; text-decoration: none;">Voir →</a>
          </div>
        </div>
        <div style="background: #E5E7EB; border-radius: 16px; display: flex; align-items: flex-end; padding: 24px;">
          <div>
            <p style="font-weight: 600; font-size: 16px; color: #111827;">Édition Limitée</p>
            <a href="#" style="color: #16C784; font-size: 14px; text-decoration: none;">Voir →</a>
          </div>
        </div>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
      <div style="${CARD}">
        <div style="aspect-ratio: 1; background: #F3F4F6;"></div>
        <div style="padding: 16px;">
          <p style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">Article Premium</p>
          <p style="color: #16C784; font-weight: 700;">185.000 TND</p>
        </div>
      </div>
      <div style="${CARD}">
        <div style="aspect-ratio: 1; background: #E5E7EB;"></div>
        <div style="padding: 16px;">
          <p style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">Article Premium</p>
          <p style="color: #16C784; font-weight: 700;">220.000 TND</p>
        </div>
      </div>
      <div style="${CARD}">
        <div style="aspect-ratio: 1; background: #F3F4F6;"></div>
        <div style="padding: 16px;">
          <p style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">Article Premium</p>
          <p style="color: #16C784; font-weight: 700;">150.000 TND</p>
        </div>
      </div>
      <div style="${CARD}">
        <div style="aspect-ratio: 1; background: #E5E7EB;"></div>
        <div style="padding: 16px;">
          <p style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">Article Premium</p>
          <p style="color: #16C784; font-weight: 700;">95.000 TND</p>
        </div>
      </div>
    </div>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 12. SEASONAL CAMPAIGN
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-seasonal',
    name: 'Campagne Saisonnière',
    slug: 'campagne-ete',
    category: 'marketing',
    description: 'Page de campagne saisonnière avec ambiance visuelle forte.',
    icon: '☀️',
    css: RESPONSIVE_CSS,
    html: `
<section style="padding: 100px 24px; background: linear-gradient(135deg, #FF6B35 0%, #F7C948 100%); text-align: center; color: white;">
  <div style="${MAX_W}">
    <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 16px; font-weight: 600;">☀️ Collection Été 2026</p>
    <h1 style="font-size: 56px; font-weight: 800; ${BASE_FONT} margin-bottom: 20px; line-height: 1.05;">
      L'été est arrivé
    </h1>
    <p style="font-size: 18px; opacity: 0.9; margin-bottom: 36px; max-width: 500px; margin-left: auto; margin-right: auto;">
      Découvrez notre sélection estivale. Des pièces légères, colorées et tendance pour profiter du soleil tunisien.
    </p>
    <a href="#" style="display: inline-block; padding: 16px 40px; background: white; color: #FF6B35; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 16px;">Explorer la collection</a>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; text-align: center; margin-bottom: 48px;">
      <div style="padding: 24px;">
        <div style="font-size: 40px; margin-bottom: 12px;">👕</div>
        <h3 style="font-weight: 600; margin-bottom: 4px;">Vêtements légers</h3>
        <p style="font-size: 14px; color: #6B7280;">Coton, lin et matières respirantes</p>
      </div>
      <div style="padding: 24px;">
        <div style="font-size: 40px; margin-bottom: 12px;">🕶️</div>
        <h3 style="font-weight: 600; margin-bottom: 4px;">Accessoires</h3>
        <p style="font-size: 14px; color: #6B7280;">Lunettes, chapeaux et sacs</p>
      </div>
      <div style="padding: 24px;">
        <div style="font-size: 40px; margin-bottom: 12px;">👟</div>
        <h3 style="font-weight: 600; margin-bottom: 4px;">Chaussures</h3>
        <p style="font-size: 14px; color: #6B7280;">Sandales et sneakers d'été</p>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
      <div style="${CARD}"><div style="aspect-ratio: 3/4; background: linear-gradient(180deg, #FEF3C7, #FDE68A);"></div><div style="padding: 16px;"><p style="font-weight: 600; margin-bottom: 4px;">T-shirt Été</p><p style="color: #FF6B35; font-weight: 700;">45.000 TND</p></div></div>
      <div style="${CARD}"><div style="aspect-ratio: 3/4; background: linear-gradient(180deg, #DBEAFE, #93C5FD);"></div><div style="padding: 16px;"><p style="font-weight: 600; margin-bottom: 4px;">Short Plage</p><p style="color: #FF6B35; font-weight: 700;">55.000 TND</p></div></div>
      <div style="${CARD}"><div style="aspect-ratio: 3/4; background: linear-gradient(180deg, #D1FAE5, #6EE7B7);"></div><div style="padding: 16px;"><p style="font-weight: 600; margin-bottom: 4px;">Sandales</p><p style="color: #FF6B35; font-weight: 700;">65.000 TND</p></div></div>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM} background: linear-gradient(135deg, #FF6B35, #F7C948); text-align: center; color: white;">
  <div style="${MAX_W}">
    <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 12px;">Livraison gratuite cet été !</h2>
    <p style="font-size: 16px; opacity: 0.9; margin-bottom: 24px;">Sur toutes les commandes de la collection été. Offre valable jusqu'au 31 août.</p>
    <a href="#" style="display: inline-block; padding: 14px 32px; background: white; color: #FF6B35; border-radius: 8px; font-weight: 700; text-decoration: none;">Profiter de l'offre</a>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 13. COMING SOON
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-coming-soon',
    name: 'Coming Soon',
    slug: 'bientot',
    category: 'utility',
    description: 'Page "Bientôt disponible" avec inscription newsletter.',
    icon: '⏳',
    css: RESPONSIVE_CSS,
    html: `
<section style="min-height: 80vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0F0F23 0%, #1A1A2E 50%, #16213E 100%); color: white; text-align: center; padding: 48px 24px;">
  <div style="max-width: 560px;">
    <div style="width: 80px; height: 80px; background: rgba(22, 199, 132, 0.15); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 32px; font-size: 36px;">🚀</div>
    <h1 style="font-size: 48px; font-weight: 800; ${BASE_FONT} margin-bottom: 16px; line-height: 1.1;">Bientôt disponible</h1>
    <p style="font-size: 18px; color: #94A3B8; margin-bottom: 40px; line-height: 1.6;">
      Nous préparons quelque chose d'incroyable. Inscrivez-vous pour être les premiers informés du lancement.
    </p>
    <div style="display: flex; gap: 8px; max-width: 440px; margin: 0 auto 24px;">
      <input type="email" placeholder="votre@email.com" style="flex: 1; padding: 14px 18px; border: 1px solid #2D2D4A; border-radius: 8px; font-size: 15px; background: #1A1A2E; color: white; ${BASE_FONT}" />
      <button style="padding: 14px 28px; background: #16C784; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 15px; white-space: nowrap;">Me notifier</button>
    </div>
    <p style="font-size: 13px; color: #4B5563;">Pas de spam. Juste une notification au lancement.</p>
    <div style="display: flex; justify-content: center; gap: 24px; margin-top: 48px;">
      <a href="#" style="color: #94A3B8; text-decoration: none; font-size: 14px;">Facebook</a>
      <a href="#" style="color: #94A3B8; text-decoration: none; font-size: 14px;">Instagram</a>
      <a href="#" style="color: #94A3B8; text-decoration: none; font-size: 14px;">TikTok</a>
    </div>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 14. THANK YOU PAGE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-thank-you',
    name: 'Page de Remerciement',
    slug: 'merci',
    category: 'utility',
    description: 'Page post-achat avec confirmation et suggestions.',
    icon: '🎉',
    css: RESPONSIVE_CSS,
    html: `
<section style="min-height: 60vh; display: flex; align-items: center; justify-content: center; padding: 64px 24px; text-align: center;">
  <div style="max-width: 560px;">
    <div style="width: 80px; height: 80px; background: #F0FDF4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 40px;">✅</div>
    <h1 style="font-size: 36px; font-weight: 800; ${BASE_FONT} margin-bottom: 12px; color: #111827;">Merci pour votre commande !</h1>
    <p style="font-size: 16px; color: #6B7280; margin-bottom: 32px; line-height: 1.6;">
      Votre commande a été confirmée avec succès. Vous recevrez un email de confirmation avec les détails de suivi.
    </p>
    <div style="background: #F9FAFB; border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: left;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-size: 14px; color: #6B7280;">Numéro de commande</span>
        <span style="font-weight: 600; font-size: 14px;">#PD-XXXXX</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-size: 14px; color: #6B7280;">Livraison estimée</span>
        <span style="font-weight: 600; font-size: 14px;">3-5 jours ouvrables</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="font-size: 14px; color: #6B7280;">Mode de paiement</span>
        <span style="font-weight: 600; font-size: 14px;">Flouci</span>
      </div>
    </div>
    <div style="display: flex; gap: 12px; justify-content: center;">
      <a href="#" style="${BTN_PRIMARY}">Suivre ma commande</a>
      <a href="#" style="${BTN_OUTLINE}">Continuer mes achats</a>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM} background: #F9FAFB;">
  <div style="${MAX_W} text-align: center;">
    <h2 style="${H2_STYLE} font-size: 24px;">Vous pourriez aussi aimer</h2>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 24px;">
      <div style="${CARD}"><div style="aspect-ratio: 1; background: #F3F4F6;"></div><div style="padding: 12px;"><p style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">Produit suggéré</p><p style="color: #16C784; font-weight: 700; font-size: 14px;">45.000 TND</p></div></div>
      <div style="${CARD}"><div style="aspect-ratio: 1; background: #E5E7EB;"></div><div style="padding: 12px;"><p style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">Produit suggéré</p><p style="color: #16C784; font-weight: 700; font-size: 14px;">65.000 TND</p></div></div>
      <div style="${CARD}"><div style="aspect-ratio: 1; background: #F3F4F6;"></div><div style="padding: 12px;"><p style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">Produit suggéré</p><p style="color: #16C784; font-weight: 700; font-size: 14px;">85.000 TND</p></div></div>
      <div style="${CARD}"><div style="aspect-ratio: 1; background: #E5E7EB;"></div><div style="padding: 12px;"><p style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">Produit suggéré</p><p style="color: #16C784; font-weight: 700; font-size: 14px;">35.000 TND</p></div></div>
    </div>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 15. CUSTOM 404
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-404',
    name: 'Page 404 Personnalisée',
    slug: 'page-introuvable',
    category: 'utility',
    description: 'Page d\'erreur 404 avec design engageant et liens utiles.',
    icon: '🔍',
    css: RESPONSIVE_CSS,
    html: `
<section style="min-height: 70vh; display: flex; align-items: center; justify-content: center; padding: 64px 24px; text-align: center; background: #F9FAFB;">
  <div style="max-width: 480px;">
    <p style="font-size: 120px; font-weight: 800; color: #E5E7EB; line-height: 1; margin-bottom: 16px;">404</p>
    <h1 style="font-size: 28px; font-weight: 700; ${BASE_FONT} margin-bottom: 12px; color: #111827;">Page introuvable</h1>
    <p style="font-size: 16px; color: #6B7280; margin-bottom: 32px; line-height: 1.6;">
      Oups ! La page que vous cherchez n'existe pas ou a été déplacée.
    </p>
    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
      <a href="/" style="${BTN_PRIMARY}">Retour à l'accueil</a>
      <a href="#" style="${BTN_OUTLINE}">Voir le catalogue</a>
    </div>
    <div style="margin-top: 48px;">
      <p style="font-size: 14px; color: #9CA3AF; margin-bottom: 16px;">Pages populaires :</p>
      <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
        <a href="#" style="font-size: 14px; color: #16C784; text-decoration: none; font-weight: 500;">Nouveautés</a>
        <a href="#" style="font-size: 14px; color: #16C784; text-decoration: none; font-weight: 500;">Promotions</a>
        <a href="#" style="font-size: 14px; color: #16C784; text-decoration: none; font-weight: 500;">Contact</a>
        <a href="#" style="font-size: 14px; color: #16C784; text-decoration: none; font-weight: 500;">FAQ</a>
      </div>
    </div>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 16. TESTIMONIALS / REVIEWS PAGE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-testimonials',
    name: 'Témoignages Clients',
    slug: 'temoignages',
    category: 'content',
    description: 'Page dédiée aux avis et témoignages clients.',
    icon: '⭐',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} background: linear-gradient(135deg, #1A1A2E, #16213E); color: white; text-align: center;">
  <div style="${MAX_W}">
    <h1 style="font-size: 44px; font-weight: 800; ${BASE_FONT} margin-bottom: 12px;">Ils nous font confiance</h1>
    <p style="font-size: 18px; color: #94A3B8;">Découvrez les avis de nos clients satisfaits.</p>
    <div style="display: flex; justify-content: center; gap: 32px; margin-top: 32px;">
      <div><p style="font-size: 36px; font-weight: 800;">4.8/5</p><p style="font-size: 14px; color: #94A3B8;">Note moyenne</p></div>
      <div><p style="font-size: 36px; font-weight: 800;">2500+</p><p style="font-size: 14px; color: #94A3B8;">Avis vérifiés</p></div>
      <div><p style="font-size: 36px; font-weight: 800;">98%</p><p style="font-size: 14px; color: #94A3B8;">Recommandent</p></div>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
      <div style="${CARD_SHADOW} padding: 28px;">
        <p style="color: #F5A623; margin-bottom: 12px;">★★★★★</p>
        <p style="color: #374151; margin-bottom: 16px; line-height: 1.6; font-size: 15px;">"Service impeccable du début à la fin. Le produit correspond parfaitement à la description. Je recommande !"</p>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #E5E7EB;"></div>
          <div><p style="font-weight: 600; font-size: 14px;">Sami B.</p><p style="font-size: 12px; color: #9CA3AF;">Tunis</p></div>
        </div>
      </div>
      <div style="${CARD_SHADOW} padding: 28px;">
        <p style="color: #F5A623; margin-bottom: 12px;">★★★★★</p>
        <p style="color: #374151; margin-bottom: 16px; line-height: 1.6; font-size: 15px;">"Livraison rapide et emballage soigné. C'est ma troisième commande et je suis toujours aussi satisfaite."</p>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #E5E7EB;"></div>
          <div><p style="font-weight: 600; font-size: 14px;">Amira K.</p><p style="font-size: 12px; color: #9CA3AF;">Sfax</p></div>
        </div>
      </div>
      <div style="${CARD_SHADOW} padding: 28px;">
        <p style="color: #F5A623; margin-bottom: 12px;">★★★★☆</p>
        <p style="color: #374151; margin-bottom: 16px; line-height: 1.6; font-size: 15px;">"Très bon rapport qualité-prix. Le service client est réactif et professionnel. Je reviendrai."</p>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #E5E7EB;"></div>
          <div><p style="font-weight: 600; font-size: 14px;">Youssef M.</p><p style="font-size: 12px; color: #9CA3AF;">Sousse</p></div>
        </div>
      </div>
      <div style="${CARD_SHADOW} padding: 28px;">
        <p style="color: #F5A623; margin-bottom: 12px;">★★★★★</p>
        <p style="color: #374151; margin-bottom: 16px; line-height: 1.6; font-size: 15px;">"Première commande et je suis bluffé par la qualité. L'emballage est premium et la livraison était en avance."</p>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #E5E7EB;"></div>
          <div><p style="font-weight: 600; font-size: 14px;">Nour H.</p><p style="font-size: 12px; color: #9CA3AF;">Nabeul</p></div>
        </div>
      </div>
      <div style="${CARD_SHADOW} padding: 28px;">
        <p style="color: #F5A623; margin-bottom: 12px;">★★★★★</p>
        <p style="color: #374151; margin-bottom: 16px; line-height: 1.6; font-size: 15px;">"J'ai offert un produit à ma sœur et elle a adoré. La qualité est vraiment au rendez-vous."</p>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #E5E7EB;"></div>
          <div><p style="font-weight: 600; font-size: 14px;">Fatma Z.</p><p style="font-size: 12px; color: #9CA3AF;">Bizerte</p></div>
        </div>
      </div>
      <div style="${CARD_SHADOW} padding: 28px;">
        <p style="color: #F5A623; margin-bottom: 12px;">★★★★★</p>
        <p style="color: #374151; margin-bottom: 16px; line-height: 1.6; font-size: 15px;">"Excellent ! Le paiement par Flouci est super pratique. Commande reçue en 2 jours à Tunis."</p>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #E5E7EB;"></div>
          <div><p style="font-weight: 600; font-size: 14px;">Karim L.</p><p style="font-size: 12px; color: #9CA3AF;">Tunis</p></div>
        </div>
      </div>
    </div>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 17. LOYALTY / VIP PROGRAM
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-loyalty',
    name: 'Programme Fidélité',
    slug: 'fidelite',
    category: 'marketing',
    description: 'Présentez votre programme de fidélité ou VIP.',
    icon: '👑',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} background: linear-gradient(135deg, #1A1A2E, #2D1B69); color: white; text-align: center;">
  <div style="${MAX_W}">
    <p style="font-size: 40px; margin-bottom: 16px;">👑</p>
    <h1 style="font-size: 44px; font-weight: 800; ${BASE_FONT} margin-bottom: 16px;">Programme Fidélité</h1>
    <p style="font-size: 18px; color: #C4B5FD; max-width: 500px; margin: 0 auto;">Gagnez des points à chaque achat et profitez d'avantages exclusifs.</p>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <h2 style="${H2_STYLE} text-align: center;">Comment ça marche ?</h2>
    <p style="${SUBTITLE} text-align: center;">3 étapes simples pour commencer à gagner.</p>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; text-align: center;">
      <div>
        <div style="width: 64px; height: 64px; background: #F0FDF4; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; font-weight: 800; color: #16C784;">1</div>
        <h3 style="font-weight: 600; margin-bottom: 8px;">Achetez</h3>
        <p style="font-size: 14px; color: #6B7280;">Gagnez 1 point pour chaque 1 TND dépensé.</p>
      </div>
      <div>
        <div style="width: 64px; height: 64px; background: #EFF6FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; font-weight: 800; color: #3B82F6;">2</div>
        <h3 style="font-weight: 600; margin-bottom: 8px;">Cumulez</h3>
        <p style="font-size: 14px; color: #6B7280;">Vos points s'accumulent automatiquement.</p>
      </div>
      <div>
        <div style="width: 64px; height: 64px; background: #FEF3C7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; font-weight: 800; color: #F5A623;">3</div>
        <h3 style="font-weight: 600; margin-bottom: 8px;">Profitez</h3>
        <p style="font-size: 14px; color: #6B7280;">Échangez vos points contre des réductions.</p>
      </div>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM} background: #F9FAFB;">
  <div style="${MAX_W}">
    <h2 style="${H2_STYLE} text-align: center;">Niveaux de fidélité</h2>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 24px;">
      <div style="${CARD_SHADOW} padding: 32px; text-align: center;">
        <p style="font-size: 32px; margin-bottom: 8px;">🥉</p>
        <h3 style="font-weight: 700; margin-bottom: 4px;">Bronze</h3>
        <p style="font-size: 14px; color: #6B7280; margin-bottom: 16px;">0 - 500 points</p>
        <ul style="list-style: none; padding: 0; font-size: 14px; color: #374151; line-height: 2;">
          <li>✓ 5% de réduction</li>
          <li>✓ Accès aux ventes privées</li>
        </ul>
      </div>
      <div style="background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 32px; text-align: center; border: 2px solid #16C784;">
        <p style="font-size: 32px; margin-bottom: 8px;">🥈</p>
        <h3 style="font-weight: 700; margin-bottom: 4px;">Argent</h3>
        <p style="font-size: 14px; color: #6B7280; margin-bottom: 16px;">500 - 2000 points</p>
        <ul style="list-style: none; padding: 0; font-size: 14px; color: #374151; line-height: 2;">
          <li>✓ 10% de réduction</li>
          <li>✓ Livraison gratuite</li>
          <li>✓ Accès anticipé</li>
        </ul>
      </div>
      <div style="${CARD_SHADOW} padding: 32px; text-align: center;">
        <p style="font-size: 32px; margin-bottom: 8px;">🥇</p>
        <h3 style="font-weight: 700; margin-bottom: 4px;">Or</h3>
        <p style="font-size: 14px; color: #6B7280; margin-bottom: 16px;">2000+ points</p>
        <ul style="list-style: none; padding: 0; font-size: 14px; color: #374151; line-height: 2;">
          <li>✓ 15% de réduction</li>
          <li>✓ Livraison express gratuite</li>
          <li>✓ Cadeaux exclusifs</li>
        </ul>
      </div>
    </div>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 18. STORE LOCATOR / PICKUP POINTS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-store-locator',
    name: 'Points de Retrait',
    slug: 'points-retrait',
    category: 'informational',
    description: 'Carte des points de retrait et adresses physiques.',
    icon: '📍',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} background: linear-gradient(135deg, #1A1A2E, #16213E); color: white; text-align: center;">
  <div style="${MAX_W}">
    <h1 style="font-size: 44px; font-weight: 800; ${BASE_FONT} margin-bottom: 12px;">Points de Retrait</h1>
    <p style="font-size: 18px; color: #94A3B8;">Récupérez votre commande gratuitement dans l'un de nos points partenaires.</p>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <div style="aspect-ratio: 16/7; background: #E5E7EB; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #9CA3AF; margin-bottom: 40px; font-size: 18px;">
      📍 Carte interactive des points de retrait
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
      <div style="${CARD_SHADOW} padding: 24px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 40px; height: 40px; background: #F0FDF4; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">📍</div>
          <h3 style="font-weight: 600;">Tunis Centre</h3>
        </div>
        <p style="font-size: 14px; color: #6B7280; margin-bottom: 8px;">Avenue Habib Bourguiba, Tunis 1000</p>
        <p style="font-size: 13px; color: #9CA3AF;">Lun-Sam : 9h-18h</p>
      </div>
      <div style="${CARD_SHADOW} padding: 24px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 40px; height: 40px; background: #F0FDF4; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">📍</div>
          <h3 style="font-weight: 600;">La Marsa</h3>
        </div>
        <p style="font-size: 14px; color: #6B7280; margin-bottom: 8px;">Rue du Lac, La Marsa 2078</p>
        <p style="font-size: 13px; color: #9CA3AF;">Lun-Sam : 9h-18h</p>
      </div>
      <div style="${CARD_SHADOW} padding: 24px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 40px; height: 40px; background: #F0FDF4; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">📍</div>
          <h3 style="font-weight: 600;">Sfax</h3>
        </div>
        <p style="font-size: 14px; color: #6B7280; margin-bottom: 8px;">Avenue de la République, Sfax 3000</p>
        <p style="font-size: 13px; color: #9CA3AF;">Lun-Sam : 9h-17h</p>
      </div>
    </div>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 19. GIFT CARDS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-gift-cards',
    name: 'Cartes Cadeaux',
    slug: 'cartes-cadeaux',
    category: 'e-commerce',
    description: 'Page de vente de cartes cadeaux avec différents montants.',
    icon: '🎁',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} background: linear-gradient(135deg, #16C784, #0EA5E9); text-align: center; color: white;">
  <div style="${MAX_W}">
    <p style="font-size: 40px; margin-bottom: 16px;">🎁</p>
    <h1 style="font-size: 48px; font-weight: 800; ${BASE_FONT} margin-bottom: 16px;">Cartes Cadeaux</h1>
    <p style="font-size: 18px; opacity: 0.9; max-width: 500px; margin: 0 auto;">Le cadeau parfait pour toutes les occasions. Offrez le choix !</p>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <h2 style="${H2_STYLE} text-align: center;">Choisissez un montant</h2>
    <p style="${SUBTITLE} text-align: center;">Envoyée par email instantanément.</p>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
      <div style="${CARD_SHADOW} padding: 32px; text-align: center; cursor: pointer; transition: transform 0.2s;">
        <p style="font-size: 36px; font-weight: 800; color: #16C784; margin-bottom: 8px;">25</p>
        <p style="font-size: 14px; color: #6B7280;">TND</p>
      </div>
      <div style="${CARD_SHADOW} padding: 32px; text-align: center; cursor: pointer;">
        <p style="font-size: 36px; font-weight: 800; color: #16C784; margin-bottom: 8px;">50</p>
        <p style="font-size: 14px; color: #6B7280;">TND</p>
      </div>
      <div style="background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 32px; text-align: center; cursor: pointer; border: 2px solid #16C784;">
        <p style="font-size: 12px; color: #16C784; font-weight: 600; margin-bottom: 4px;">POPULAIRE</p>
        <p style="font-size: 36px; font-weight: 800; color: #16C784; margin-bottom: 8px;">100</p>
        <p style="font-size: 14px; color: #6B7280;">TND</p>
      </div>
      <div style="${CARD_SHADOW} padding: 32px; text-align: center; cursor: pointer;">
        <p style="font-size: 36px; font-weight: 800; color: #16C784; margin-bottom: 8px;">200</p>
        <p style="font-size: 14px; color: #6B7280;">TND</p>
      </div>
    </div>
    <div style="text-align: center; margin-top: 32px;">
      <a href="#" style="${BTN_PRIMARY} font-size: 18px; padding: 16px 40px;">Offrir une carte cadeau</a>
    </div>
  </div>
</section>

<section style="${SECTION_PAD_SM} background: #F9FAFB;">
  <div style="${MAX_W}">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; text-align: center;">
      <div style="padding: 24px;">
        <div style="font-size: 32px; margin-bottom: 12px;">📧</div>
        <h3 style="font-weight: 600; margin-bottom: 4px;">Envoi instantané</h3>
        <p style="font-size: 14px; color: #6B7280;">Reçue par email en quelques secondes.</p>
      </div>
      <div style="padding: 24px;">
        <div style="font-size: 32px; margin-bottom: 12px;">📅</div>
        <h3 style="font-weight: 600; margin-bottom: 4px;">Validité 1 an</h3>
        <p style="font-size: 14px; color: #6B7280;">Utilisable pendant 12 mois.</p>
      </div>
      <div style="padding: 24px;">
        <div style="font-size: 32px; margin-bottom: 12px;">🛍️</div>
        <h3 style="font-weight: 600; margin-bottom: 4px;">Tout le catalogue</h3>
        <p style="font-size: 14px; color: #6B7280;">Valable sur tous nos produits.</p>
      </div>
    </div>
  </div>
</section>
    `.trim(),
  },

  {
    id: 'tpl-homepage-dynamic',
    name: 'Accueil Boutique Dynamique',
    slug: 'accueil',
    category: 'e-commerce',
    description: 'Homepage complète connectée aux produits, collections, politiques et coordonnées réelles de la boutique.',
    icon: '🏪',
    css: RESPONSIVE_CSS,
    html: `
<section data-pd-block="store-hero" data-pd-title="Bienvenue" data-pd-subtitle="Découvrez nos nouveautés, collections et engagements." data-pd-image-url="" data-pd-image-position="center center" data-pd-image-fit="cover" style="${SECTION_PAD} text-align: center; background: linear-gradient(135deg, #1A1A2E 0%, #16213E 55%, #16C784 140%); color: white;">
  <div style="${MAX_W}">
    <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.15em; color: #16C784; margin-bottom: 16px; font-weight: 800;">Homepage dynamique</p>
    <h1 style="font-size: 52px; font-weight: 800; ${BASE_FONT} margin-bottom: 20px; line-height: 1.1;">Votre boutique, prête à vendre</h1>
    <p style="font-size: 18px; color: #D1D5DB; margin-bottom: 34px; max-width: 640px; margin-left: auto; margin-right: auto; line-height: 1.6;">Ce modèle utilise automatiquement vos produits publiés, collections, couleurs et informations boutique.</p>
    <a href="#catalogue" style="display: inline-block; padding: 14px 32px; background: #16C784; color: white; border-radius: 999px; font-weight: 800; text-decoration: none; font-size: 16px;">Explorer le catalogue</a>
  </div>
</section>

<section id="catalogue" data-pd-block="featured-products" data-pd-title="Produits sélectionnés" data-pd-subtitle="Les articles à mettre en avant dès maintenant." data-pd-limit="4" style="${SECTION_PAD_SM} background: #FFFFFF;">
  <div style="${MAX_W}">
    <p style="color: #16C784; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;">Catalogue réel</p>
    <h2 style="${H2_STYLE}">Produits mis en avant</h2>
    <p style="${SUBTITLE}">Le rendu public affichera vos produits publiés avec prix et images réels.</p>
  </div>
</section>

<section data-pd-block="category-showcase" data-pd-title="Collections populaires" data-pd-limit="6" style="${SECTION_PAD_SM} background: #F9FAFB;">
  <div style="${MAX_W}">
    <p style="color: #16C784; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 8px;">Collections</p>
    <h2 style="${H2_STYLE}">Parcourez nos univers</h2>
  </div>
</section>

<section style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center;">
      <div style="${CARD_SHADOW} padding: 28px;"><p style="font-size: 30px; margin-bottom: 10px;">⚡</p><h3 style="font-weight: 800; margin-bottom: 8px;">Rapide</h3><p style="font-size: 14px; color: #6B7280;">Navigation simple et sections prêtes à convertir.</p></div>
      <div style="${CARD_SHADOW} padding: 28px;"><p style="font-size: 30px; margin-bottom: 10px;">🛡️</p><h3 style="font-weight: 800; margin-bottom: 8px;">Fiable</h3><p style="font-size: 14px; color: #6B7280;">Politiques et informations rassurantes pour vos clients.</p></div>
      <div style="${CARD_SHADOW} padding: 28px;"><p style="font-size: 30px; margin-bottom: 10px;">📱</p><h3 style="font-weight: 800; margin-bottom: 8px;">Mobile</h3><p style="font-size: 14px; color: #6B7280;">Structure responsive adaptée aux acheteurs mobiles.</p></div>
    </div>
  </div>
</section>

<section data-pd-block="store-policies" data-pd-title="Pourquoi commander chez nous ?" data-pd-subtitle="Livraison, retours et paiement expliqués clairement." style="${SECTION_PAD_SM} background: #F9FAFB;">
  <div style="${MAX_W}">
    <h2 style="${H2_STYLE} text-align: center;">Informations essentielles</h2>
  </div>
</section>

<section data-pd-block="store-contact" data-pd-title="Besoin d’aide ?" style="${SECTION_PAD_SM}">
  <div style="${MAX_W}">
    <h2 style="${H2_STYLE} text-align: center;">Contact boutique</h2>
  </div>
</section>
    `.trim(),
  },

  // ═══════════════════════════════════════════════════════════
  // 20. BLANK STARTER
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tpl-blank',
    name: 'Page Vierge',
    slug: 'nouvelle-page',
    category: 'utility',
    description: 'Page vierge avec structure de base. Commencez de zéro.',
    icon: '📄',
    css: RESPONSIVE_CSS,
    html: `
<section style="${SECTION_PAD} text-align: center;">
  <div style="${MAX_W}">
    <h1 style="font-size: 36px; font-weight: 700; ${BASE_FONT} margin-bottom: 12px; color: #111827;">Titre de votre page</h1>
    <p style="font-size: 16px; color: #6B7280; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      Commencez à construire votre page en ajoutant des blocs depuis le panneau de gauche. Glissez-déposez des sections hero, grilles de produits, témoignages et plus encore.
    </p>
  </div>
</section>
    `.trim(),
  },
]);
