'use client';

import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  HOME_TEMPLATE_BLOCKS,
  resolveHomeBlocks,
  serializeHomepageBlocksSetting,
  type HomeBlockConfig,
  type HomeHeroSlide,
  type HomeTemplateId,
} from '../../lib/home-blocks';

interface HomepageBlocksEditorProps {
  value: string;
  onChange: (next: string) => void;
}

const TEMPLATES: Array<{ id: HomeTemplateId; label: string; hint: string }> = [
  { id: 'alibaba', label: 'Alibaba B2B', hint: 'Applied when Homepage Layout is set to "Alibaba B2B".' },
  { id: 'amazon', label: 'Amazon classic', hint: 'Applied when Homepage Layout is set to "Amazon classic".' },
  { id: 'aliexpress', label: 'AliExpress deals', hint: 'Applied when Homepage Layout is "Deals" or the AliExpress theme default.' },
  { id: 'classic', label: 'Classic hub', hint: 'Applied when Homepage Layout is "Classic" or the Panda theme default.' },
];

const INPUT_CLASS = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#B91C1C] focus:ring-2 focus:ring-[#B91C1C]/15';
const FIELD_LABEL_CLASS = 'block text-[10px] font-bold uppercase tracking-wider text-slate-400';

export function HomepageBlocksEditor({ value, onChange }: HomepageBlocksEditorProps) {
  const [activeTemplate, setActiveTemplate] = useState<HomeTemplateId>('alibaba');

  const config = useMemo(
    () => ({
      alibaba: resolveHomeBlocks(value, 'alibaba'),
      amazon: resolveHomeBlocks(value, 'amazon'),
      aliexpress: resolveHomeBlocks(value, 'aliexpress'),
      classic: resolveHomeBlocks(value, 'classic'),
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

  const updateSlides = (template: HomeTemplateId, blockId: string, slides: HomeHeroSlide[]) => {
    updateBlock(template, blockId, { slides });
  };

  const activeMeta = TEMPLATES.find((template) => template.id === activeTemplate) ?? TEMPLATES[0];
  const defs = new Map(HOME_TEMPLATE_BLOCKS[activeTemplate].map((def) => [def.id, def]));

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

      {/* Template tabs */}
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => setActiveTemplate(template.id)}
            className={`rounded-xl px-4 py-2 text-xs font-black transition-colors ${
              activeTemplate === template.id
                ? 'bg-[#B91C1C] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {template.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-stone-50 p-5">
        <p className="text-sm font-black text-slate-900">{activeMeta.label}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{activeMeta.hint}</p>
        <div className="mt-4 space-y-3">
          {config[activeTemplate].map((block) => {
            const def = defs.get(block.id);
            if (!def) return null;
            const slides = block.slides ?? [];
            const maxSlides = def.maxSlides || 6;
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
                      onChange={(e) => updateBlock(activeTemplate, block.id, { enabled: e.target.checked })}
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
                        onClick={() => moveBlock(activeTemplate, block.id, -1)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${def.label} down`}
                        onClick={() => moveBlock(activeTemplate, block.id, 1)}
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
                        <label className={FIELD_LABEL_CLASS}>Section title</label>
                        <input
                          type="text"
                          value={block.title || ''}
                          onChange={(e) => updateBlock(activeTemplate, block.id, { title: e.target.value })}
                          placeholder={def.defaultTitle}
                          className={INPUT_CLASS}
                        />
                      </div>
                    )}
                    {def.supportsLimit && (
                      <div>
                        <label className={FIELD_LABEL_CLASS}>Items shown</label>
                        <input
                          type="number"
                          min={1}
                          max={def.maxLimit || 24}
                          value={block.limit || def.defaultLimit || 1}
                          onChange={(e) => updateBlock(activeTemplate, block.id, { limit: Number(e.target.value) })}
                          className={INPUT_CLASS}
                        />
                      </div>
                    )}
                  </div>
                )}

                {(def.supportsImage || def.supportsCta) && block.enabled && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {def.supportsImage && (
                      <div>
                        <label className={FIELD_LABEL_CLASS}>Banner image URL</label>
                        <input
                          type="text"
                          value={block.image_url || ''}
                          onChange={(e) => updateBlock(activeTemplate, block.id, { image_url: e.target.value })}
                          placeholder="https://... or /path.png"
                          className={INPUT_CLASS}
                        />
                      </div>
                    )}
                    {def.supportsCta && (
                      <>
                        <div>
                          <label className={FIELD_LABEL_CLASS}>CTA label</label>
                          <input
                            type="text"
                            value={block.cta_label || ''}
                            onChange={(e) => updateBlock(activeTemplate, block.id, { cta_label: e.target.value })}
                            placeholder="View all"
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <label className={FIELD_LABEL_CLASS}>CTA URL</label>
                          <input
                            type="text"
                            value={block.cta_url || ''}
                            onChange={(e) => updateBlock(activeTemplate, block.id, { cta_url: e.target.value })}
                            placeholder="/hub/search"
                            className={INPUT_CLASS}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {def.supportsSlides && block.enabled && (
                  <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-stone-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Hero slides {slides.length > 0 ? `(${slides.length}/${maxSlides})` : '— using automatic fallback'}
                      </p>
                      <button
                        type="button"
                        disabled={slides.length >= maxSlides}
                        onClick={() => updateSlides(activeTemplate, block.id, [...slides, { title: 'New slide' }])}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add slide
                      </button>
                    </div>
                    {slides.length === 0 && (
                      <p className="text-xs font-medium text-slate-400">
                        Without slides, the carousel uses the homepage banner plus top categories automatically.
                      </p>
                    )}
                    {slides.map((slide, index) => (
                      <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[11px] font-black text-slate-500">Slide {index + 1}</p>
                          <span className="flex gap-1">
                            <button
                              type="button"
                              aria-label={`Move slide ${index + 1} up`}
                              onClick={() => {
                                if (index === 0) return;
                                const next = [...slides];
                                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                updateSlides(activeTemplate, block.id, next);
                              }}
                              className="rounded-lg border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Move slide ${index + 1} down`}
                              onClick={() => {
                                if (index >= slides.length - 1) return;
                                const next = [...slides];
                                [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                updateSlides(activeTemplate, block.id, next);
                              }}
                              className="rounded-lg border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove slide ${index + 1}`}
                              onClick={() => updateSlides(activeTemplate, block.id, slides.filter((_, i) => i !== index))}
                              className="rounded-lg border border-red-100 p-1 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <label className={FIELD_LABEL_CLASS}>Title</label>
                            <input
                              type="text"
                              value={slide.title}
                              onChange={(e) => updateSlides(activeTemplate, block.id, slides.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)))}
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <label className={FIELD_LABEL_CLASS}>Subtitle</label>
                            <input
                              type="text"
                              value={slide.subtitle || ''}
                              onChange={(e) => updateSlides(activeTemplate, block.id, slides.map((s, i) => (i === index ? { ...s, subtitle: e.target.value } : s)))}
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <label className={FIELD_LABEL_CLASS}>Image URL</label>
                            <input
                              type="text"
                              value={slide.image_url || ''}
                              onChange={(e) => updateSlides(activeTemplate, block.id, slides.map((s, i) => (i === index ? { ...s, image_url: e.target.value } : s)))}
                              placeholder="https://... or /path.png"
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={FIELD_LABEL_CLASS}>CTA label</label>
                              <input
                                type="text"
                                value={slide.cta_label || ''}
                                onChange={(e) => updateSlides(activeTemplate, block.id, slides.map((s, i) => (i === index ? { ...s, cta_label: e.target.value } : s)))}
                                placeholder="Shop now"
                                className={INPUT_CLASS}
                              />
                            </div>
                            <div>
                              <label className={FIELD_LABEL_CLASS}>CTA URL</label>
                              <input
                                type="text"
                                value={slide.cta_url || ''}
                                onChange={(e) => updateSlides(activeTemplate, block.id, slides.map((s, i) => (i === index ? { ...s, cta_url: e.target.value } : s)))}
                                placeholder="/hub/search"
                                className={INPUT_CLASS}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
