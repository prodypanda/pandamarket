'use client';

import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import {
  HOME_TEMPLATE_BLOCKS,
  resolveHomeBlocks,
  serializeHomepageBlocksSetting,
  type HomeBlockConfig,
  type HomeTemplateId,
} from '../../lib/home-blocks';

interface HomepageBlocksEditorProps {
  value: string;
  onChange: (next: string) => void;
}

const TEMPLATES: Array<{ id: HomeTemplateId; label: string; hint: string }> = [
  { id: 'alibaba', label: 'Alibaba B2B', hint: 'Applied when Homepage Layout is set to "Alibaba B2B".' },
  { id: 'amazon', label: 'Amazon classic', hint: 'Applied when Homepage Layout is set to "Amazon classic".' },
];

export function HomepageBlocksEditor({ value, onChange }: HomepageBlocksEditorProps) {
  const config = useMemo(
    () => ({
      alibaba: resolveHomeBlocks(value, 'alibaba'),
      amazon: resolveHomeBlocks(value, 'amazon'),
    }),
    [value],
  );

  const commit = (template: HomeTemplateId, nextBlocks: HomeBlockConfig[]) => {
    onChange(serializeHomepageBlocksSetting({ ...config, [template]: nextBlocks }));
  };

  const updateBlock = (template: HomeTemplateId, id: string, patch: Partial<HomeBlockConfig>) => {
    commit(template, config[template].map((block) => (block.id === id ? { ...block, ...patch } : block)));
  };

  const moveBlock = (template: HomeTemplateId, id: string, delta: number) => {
    const defs = new Map(HOME_TEMPLATE_BLOCKS[template].map((def) => [def.id, def]));
    const list = [...config[template]];
    const from = list.findIndex((block) => block.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= list.length) return;
    if (defs.get(list[to].id)?.fixed) return;
    [list[from], list[to]] = [list[to], list[from]];
    commit(template, list);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">
          Toggle, reorder and customize the blocks of each homepage template. Changes apply after saving this section.
        </p>
        <button
          type="button"
          onClick={() => onChange('')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
        </button>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {TEMPLATES.map((template) => {
          const defs = new Map(HOME_TEMPLATE_BLOCKS[template.id].map((def) => [def.id, def]));
          return (
            <div key={template.id} className="rounded-2xl border border-slate-200 bg-stone-50 p-5">
              <p className="text-sm font-black text-slate-900">{template.label}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{template.hint}</p>
              <div className="mt-4 space-y-3">
                {config[template.id].map((block) => {
                  const def = defs.get(block.id);
                  if (!def) return null;
                  return (
                    <div
                      key={block.id}
                      className={`rounded-2xl border bg-white p-4 transition-opacity ${block.enabled ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={block.enabled}
                            onChange={(e) => updateBlock(template.id, block.id, { enabled: e.target.checked })}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#B91C1C] focus:ring-[#B91C1C]/30"
                          />
                          <span>
                            <span className="block text-sm font-bold text-slate-900">{def.label}</span>
                            <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500">{def.description}</span>
                          </span>
                        </label>
                        {def.fixed ? (
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Fixed position
                          </span>
                        ) : (
                          <span className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              aria-label={`Move ${def.label} up`}
                              onClick={() => moveBlock(template.id, block.id, -1)}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${def.label} down`}
                              onClick={() => moveBlock(template.id, block.id, 1)}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </div>
                      {(def.supportsTitle || def.supportsLimit) && block.enabled && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
                          {def.supportsTitle && (
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Section title</label>
                              <input
                                type="text"
                                value={block.title || ''}
                                onChange={(e) => updateBlock(template.id, block.id, { title: e.target.value })}
                                placeholder={def.defaultTitle}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15"
                              />
                            </div>
                          )}
                          {def.supportsLimit && (
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Items shown</label>
                              <input
                                type="number"
                                min={1}
                                max={def.maxLimit || 24}
                                value={block.limit || def.defaultLimit || 1}
                                onChange={(e) => updateBlock(template.id, block.id, { limit: Number(e.target.value) })}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
