'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { Search, ChevronDown, X, Loader2 } from 'lucide-react';

type ReferenceType = 'page' | 'product' | 'category' | 'collection';

interface ReferenceSelectorProps {
  type: ReferenceType;
  value: string;
  onChange: (id: string, label?: string) => void;
  className?: string;
}

interface Option {
  id: string;
  label: string;
}

const ENDPOINTS: Partial<Record<ReferenceType, string>> = {
  page: '/api/pd/page-builder/pages',
  product: '/api/pd/stores/me/products?limit=100',
  category: '/api/pd/stores/me/categories',
  // No collections API exists yet — handled with a message
  // collection: null,
};

const PLACEHOLDERS: Record<ReferenceType, string> = {
  page: 'Rechercher une page…',
  product: 'Rechercher un produit…',
  category: 'Rechercher une catégorie…',
  collection: 'Rechercher une collection…',
};

const EMPTY_LABELS: Record<ReferenceType, string> = {
  page: 'Aucune page trouvée',
  product: 'Aucun produit trouvé',
  category: 'Aucune catégorie trouvée',
  collection: 'Aucune collection trouvée (utilisez les catégories)',
};

function extractLabel(row: Record<string, unknown>, type: ReferenceType): string {
  if (typeof row.title === 'string') return row.title;
  if (typeof row.name === 'string') return row.name;
  if (typeof row.product_name === 'string') return row.product_name;
  if (type === 'product' && typeof row.sku === 'string') return String(row.sku);
  return String(row.id);
}

export function ReferenceSelector({ type, value, onChange, className }: ReferenceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const ref = useRef<HTMLDivElement>(null);

  // Clear cached options whenever the type changes (page → product → category etc.)
  useEffect(() => {
    setOptions([]);
    setQuery('');
    setSelectedLabel('');
  }, [type]);

  // Fetch options when dropdown opens (re-fetches every time type changes + opens)
  useEffect(() => {
    if (!open) return;
    const endpoint = ENDPOINTS[type];
    if (!endpoint) {
      // No API endpoint for this type (e.g. collections not yet implemented)
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchWithCsrf(endpoint, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        const rows: Record<string, unknown>[] = Array.isArray(data) ? data : (data?.data ?? []);
        setOptions(rows.map((r) => ({ id: String(r.id), label: extractLabel(r, type) })));
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [open, type]);

  // Resolve the selected label when value changes (e.g. after page reload)
  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      return;
    }
    if (options.length > 0) {
      const found = options.find((o) => o.id === value);
      setSelectedLabel(found ? found.label : value);
    } else {
      setSelectedLabel(value);
    }
  }, [value, options]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
      >
        <span className={selectedLabel ? 'truncate' : 'text-slate-400'}>
          {selectedLabel || `Sélectionner…`}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSelectedLabel('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onChange('');
                  setSelectedLabel('');
                }
              }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={PLACEHOLDERS[type]}
              autoFocus
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Chargement…
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                {EMPTY_LABELS[type]}
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id, opt.label);
                    setSelectedLabel(opt.label);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-slate-50 ${
                    opt.id === value ? 'bg-red-50 font-semibold text-[#B91C1C]' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  <span className="ml-2 shrink-0 font-mono text-[10px] text-slate-400">{opt.id.slice(-8)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
