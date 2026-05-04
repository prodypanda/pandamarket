'use client';

import { useState, useMemo, useCallback } from 'react';
import { X, Search, LayoutTemplate, Sparkles, Monitor, Tablet, Smartphone } from 'lucide-react';
import {
  PAGE_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type PageTemplate,
  type TemplateCategory,
} from './templates';

interface Props {
  onSelect: (t: PageTemplate) => void;
  onClose: () => void;
}

export function TemplatePicker({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<TemplateCategory | 'all'>('all');
  const [preview, setPreview] = useState<PageTemplate | null>(null);

  const filtered = useMemo(() => {
    let t = PAGE_TEMPLATES;
    if (activeCat !== 'all') t = t.filter((x) => x.category === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      t = t.filter(
        (x) => x.name.toLowerCase().includes(q) || x.description.toLowerCase().includes(q),
      );
    }
    return t;
  }, [search, activeCat]);

  const cats = Object.entries(TEMPLATE_CATEGORIES) as [
    TemplateCategory,
    { label: string; icon: string },
  ][];

  const catBtnClass = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
      active ? 'bg-[#16C784] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#16C784]/10 rounded-xl flex items-center justify-center">
              <LayoutTemplate className="w-5 h-5 text-[#16C784]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Choisir un template</h2>
              <p className="text-xs text-gray-500">
                {PAGE_TEMPLATES.length} templates disponibles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + Filters */}
        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              <button onClick={() => setActiveCat('all')} className={catBtnClass(activeCat === 'all')}>
                Tous
              </button>
              {cats.map(([key, { label, icon }]) => (
                <button key={key} onClick={() => setActiveCat(key)} className={catBtnClass(activeCat === key)}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">Aucun template trouvé.</p>
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
      className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-[#16C784]/30 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="h-48 bg-gray-50 relative overflow-hidden">
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
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 to-transparent" />
        {/* Hover overlay with CTA */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <span className="text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity bg-[#16C784] px-4 py-2 rounded-lg shadow-lg">
            Aperçu
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{tpl.icon}</span>
          <h3 className="font-semibold text-sm text-gray-900 truncate">{tpl.name}</h3>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2">{tpl.description}</p>
        <div className="mt-2">
          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-full">
            {TEMPLATE_CATEGORIES[tpl.category].icon} {TEMPLATE_CATEGORIES[tpl.category].label}
          </span>
        </div>
      </div>
    </div>
  );
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
          ? 'bg-[#16C784]/15 text-[#16C784]'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`,
    [device],
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template.icon}</span>
            <div>
              <h3 className="font-bold text-gray-900">{template.name}</h3>
              <p className="text-xs text-gray-500">/{template.slug}</p>
            </div>
          </div>

          {/* Device toggle */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
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
              className="flex items-center gap-2 px-5 py-2 bg-[#16C784] text-white text-sm font-semibold rounded-lg hover:bg-[#14b876] transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Utiliser ce template
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Iframe preview — fully isolated from parent CSS */}
        <div className="flex-1 overflow-auto bg-gray-100 flex justify-center p-4">
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
              className="w-full bg-white rounded-lg shadow-sm border border-gray-200"
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
