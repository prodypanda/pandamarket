'use client';

import { useState, useMemo, useCallback } from 'react';
import { X, Search, LayoutTemplate, Sparkles, Monitor, Tablet, Smartphone } from 'lucide-react';
import {
  applyTemplateBranding,
  PAGE_TEMPLATES,
  TEMPLATE_CATEGORIES,
  TEMPLATE_SELLER_TYPES,
  type PageTemplate,
  type TemplateCategory,
  type TemplateBranding,
  type TemplateSellerType,
} from './templates';

interface Props {
  onSelect: (t: PageTemplate) => void;
  onClose: () => void;
  storeBranding?: TemplateBranding;
}

export function TemplatePicker({ onSelect, onClose, storeBranding }: Props) {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<TemplateCategory | 'all'>('all');
  const preferredSellerType = normalizeTemplateSellerType(storeBranding?.sellerType);
  const [activeSellerType, setActiveSellerType] = useState<TemplateSellerType | 'all'>(preferredSellerType || 'all');
  const [preview, setPreview] = useState<PageTemplate | null>(null);
  const templates = useMemo(
    () => PAGE_TEMPLATES.map((template) => applyTemplateBranding(template, storeBranding)),
    [storeBranding],
  );

  const filtered = useMemo(() => {
    let t = templates;
    if (activeCat !== 'all') t = t.filter((x) => x.category === activeCat);
    if (activeSellerType !== 'all') {
      t = t.filter((x) => {
        const sellerTypes = x.sellerTypes || ['general'];
        return sellerTypes.includes(activeSellerType) || sellerTypes.includes('general');
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      t = t.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.description.toLowerCase().includes(q) ||
          (x.sections || []).some((section) => section.toLowerCase().includes(q)),
      );
    }
    return t;
  }, [search, activeCat, activeSellerType, templates]);

  const cats = Object.entries(TEMPLATE_CATEGORIES) as [
    TemplateCategory,
    { label: string; icon: string },
  ][];
  const sellerTypes = Object.entries(TEMPLATE_SELLER_TYPES) as [
    TemplateSellerType,
    { label: string; icon: string },
  ][];

  const catBtnClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
      active
        ? 'border-[#1A1A2E] bg-[#1A1A2E] text-white'
        : 'border-[#E4D8C6] bg-white text-[#6B7280] hover:border-[#D6B779] hover:text-[#1A1A2E]'
    }`;

  // Preview sub-view with isolated iframe rendering + device size toggle
  if (preview) {
    return (
      <PreviewModal
        template={preview}
        onSelect={() => onSelect(preview)}
        onClose={() => setPreview(null)}
      />
    );
  }

  // Main picker grid
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-[#E4D8C6] bg-[#FBF8F1] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4D8C6] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F4EDE2] rounded-xl flex items-center justify-center">
              <LayoutTemplate className="w-5 h-5 text-[#8A6F3D]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1A1A2E]">Choisir un template</h2>
              <p className="text-xs text-[#7C7468]">
                {PAGE_TEMPLATES.length} templates disponibles · couleurs boutique appliquées
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#7C7468] hover:text-[#1A1A2E] rounded-lg hover:bg-[#F4EDE2]"
            aria-label="Close template picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + Filters */}
        <div className="px-6 py-3 border-b border-[#E4D8C6] flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8174]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-[#E4D8C6] rounded-xl bg-white text-[#1A1A2E] focus:border-[#D6B779] focus:ring-2 focus:ring-[#D6B779]/20 outline-none"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              <button onClick={() => setActiveCat('all')} className={catBtnClass(activeCat === 'all')}>
                Tous
              </button>
              {cats.map(([key, { label }]) => (
                <button key={key} onClick={() => setActiveCat(key)} className={catBtnClass(activeCat === key)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              <button onClick={() => setActiveSellerType('all')} className={catBtnClass(activeSellerType === 'all')}>
                Tous vendeurs
              </button>
              {sellerTypes.map(([key, { label }]) => (
                <button key={key} onClick={() => setActiveSellerType(key)} className={catBtnClass(activeSellerType === key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FFFDF8]">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#7C7468] text-sm">Aucun template trouvé.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map((tpl) => (
                <TemplateCard key={tpl.id} template={tpl} onClick={() => setPreview(tpl)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template Card (thumbnail in grid) ──────────────────────

function TemplateCard({ template: tpl, onClick }: { template: PageTemplate; onClick: () => void }) {
  return (
    <div
      className="group overflow-hidden rounded-2xl border border-[#E4D8C6] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#D6B779] hover:shadow-lg cursor-pointer"
      onClick={onClick}
    >
      <div className="h-48 bg-[#F6F3ED] relative overflow-hidden">
        {/* Scaled-down miniature preview — CSS omitted intentionally to avoid leaking
            global styles into the parent document. At 18% scale, hover/responsive
            styles are invisible anyway. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: 'scale(0.18)',
            transformOrigin: 'top left',
            width: `${100 / 0.18}%`,
            height: `${100 / 0.18}%`,
          }}
          dangerouslySetInnerHTML={{ __html: tpl.html }}
        />
        {/* Gradient fade at bottom so the preview doesn't look cut off */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#F6F3ED] to-transparent" />
        {/* Hover overlay with CTA */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-[#1A1A2E]/35 transition-colors flex items-center justify-center">
          <span className="text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-[#16C784] px-4 py-2 rounded-full shadow-lg">
            Aperçu
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-sm text-[#1A1A2E] truncate">{tpl.name}</h3>
        </div>
        <p className="text-xs text-[#7C7468] line-clamp-2">{tpl.description}</p>
        <div className="mt-2">
          <span className="inline-block px-2 py-0.5 bg-[#F4EDE2] text-[#7C7468] text-[10px] font-bold rounded-full">
            {TEMPLATE_CATEGORIES[tpl.category].label}
          </span>
          {tpl.isHomepage && (
            <span className="ml-1 inline-block rounded-full bg-[#16C784]/10 px-2 py-0.5 text-[10px] font-bold text-[#16C784]">
              Accueil
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function normalizeTemplateSellerType(value?: string | null): TemplateSellerType | null {
  if (value === 'wholesaler' || value === 'hybrid') return 'wholesale';
  if (
    value === 'general' ||
    value === 'fashion' ||
    value === 'electronics' ||
    value === 'food' ||
    value === 'services' ||
    value === 'digital' ||
    value === 'wholesale'
  ) {
    return value;
  }
  return null;
}

// ─── Preview Modal (full-size with iframe isolation + device toggle) ─────

type DeviceSize = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTHS: Record<DeviceSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

function PreviewModal({
  template,
  onSelect,
  onClose,
}: {
  template: PageTemplate;
  onSelect: () => void;
  onClose: () => void;
}) {
  const [device, setDevice] = useState<DeviceSize>('desktop');

  // Build a self-contained HTML document for the iframe.
  // This fully isolates the template CSS from the parent page.
  const iframeSrcDoc = useMemo(() => {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; -webkit-font-smoothing: antialiased; }
    img { max-width: 100%; height: auto; }
    ${template.css || ''}
  </style>
</head>
<body>${template.html}</body>
</html>`;
  }, [template]);

  const deviceBtnClass = useCallback(
    (d: DeviceSize) =>
      `p-1.5 rounded-md transition-colors ${
        device === d
          ? 'bg-[#1A1A2E] text-white'
          : 'text-[#7C7468] hover:text-[#1A1A2E] hover:bg-white'
      }`,
    [device],
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl mx-4 max-h-[92vh] flex flex-col overflow-hidden rounded-3xl border border-[#E4D8C6] bg-[#FBF8F1] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#E4D8C6] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F4EDE2] text-[#8A6F3D]">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#1A1A2E]">{template.name}</h3>
              <p className="text-xs text-[#7C7468]">/{template.slug}</p>
            </div>
          </div>

          {/* Device toggle */}
          <div className="flex items-center gap-1 rounded-full border border-[#E4D8C6] bg-[#F4EDE2] p-1">
            <button
              onClick={() => setDevice('desktop')}
              className={deviceBtnClass('desktop')}
              title="Desktop"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={deviceBtnClass('tablet')}
              title="Tablette"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={deviceBtnClass('mobile')}
              title="Mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSelect}
              className="flex items-center gap-2 rounded-full bg-[#16C784] px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-[#14b876]"
            >
              <Sparkles className="w-4 h-4" />
              Utiliser ce template
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#7C7468] hover:text-[#1A1A2E] rounded-lg hover:bg-[#F4EDE2]"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Iframe preview — fully isolated from parent CSS */}
        <div className="flex-1 overflow-auto bg-[#ECE7DD] flex justify-center p-4">
          <div
            className="transition-all duration-300 ease-in-out"
            style={{
              width: DEVICE_WIDTHS[device],
              maxWidth: '100%',
            }}
          >
            <iframe
              srcDoc={iframeSrcDoc}
              title={`Aperçu: ${template.name}`}
              className="w-full bg-white rounded-2xl shadow-sm border border-[#E4D8C6]"
              style={{
                height: '70vh',
                border: 'none',
              }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
