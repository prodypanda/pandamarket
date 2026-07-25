'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Copy, Image as ImageIcon, Sparkles, Link as LinkIcon, Layers, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { MarketplaceAssetPicker } from './MarketplaceAssetPicker';

export interface CarouselSlide {
  id?: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  badgeText?: string;
  bgPreset?: string;
}

interface HeroCarouselEditorProps {
  value: string; // JSON string from settings (hub_hero_carousel_slides)
  onChange: (nextJsonString: string) => void;
}

const PRESET_GRADIENTS: Record<string, { label: string; bg: string }> = {
  navy: { label: 'Alibaba Navy', bg: 'linear-gradient(120deg, #0b1e3f, #163060)' },
  sunset: { label: 'Neon Sunset', bg: 'linear-gradient(120deg, #ff6a00, #ee0979)' },
  emerald: { label: 'Emerald Luxury', bg: 'linear-gradient(120deg, #059669, #064e3b)' },
  dark: { label: 'Dark Cyber', bg: 'linear-gradient(120deg, #0f172a, #1e293b)' },
  gold: { label: 'Golden Elegance', bg: 'linear-gradient(120deg, #d97706, #78350f)' },
};

export function HeroCarouselEditor({ value, onChange }: HeroCarouselEditorProps) {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState<boolean>(false);

  // Parse JSON value on initial load or change
  useEffect(() => {
    if (!value || value.trim() === '' || value === '[]') {
      setSlides([]);
      return;
    }
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        setSlides(
          parsed.map((item: any, idx: number) => ({
            id: item.id || `slide-${idx}-${Date.now()}`,
            title: item.title || item.name || '',
            subtitle: item.subtitle || item.description || '',
            ctaLabel: item.ctaLabel || item.cta_label || 'Shop now',
            ctaUrl: item.ctaUrl || item.cta_url || '/hub/search',
            imageUrl: item.imageUrl || item.image_url || '',
            badgeText: item.badgeText || item.badge_text || '',
            bgPreset: item.bgPreset || item.bg_preset || 'navy',
          }))
        );
      }
    } catch (err) {
      console.warn('Failed to parse carousel slides:', err);
    }
  }, [value]);

  // Sync back to JSON string
  const updateSlides = (nextSlides: CarouselSlide[]) => {
    setSlides(nextSlides);
    onChange(JSON.stringify(nextSlides));
  };

  const handleAddSlide = () => {
    const newSlide: CarouselSlide = {
      id: `slide-${Date.now()}`,
      title: 'Nouvelle Bannière Promotionnelle',
      subtitle: 'Description attractive de votre offre spéciale ou catégorie.',
      ctaLabel: 'Découvrir',
      ctaUrl: '/hub/search',
      imageUrl: '',
      badgeText: 'PROMO EXCLUSIVE',
      bgPreset: 'navy',
    };
    const next = [...slides, newSlide];
    updateSlides(next);
    setSelectedIndex(next.length - 1);
  };

  const handleUpdateSlide = (index: number, patch: Partial<CarouselSlide>) => {
    const next = slides.map((s, idx) => (idx === index ? { ...s, ...patch } : s));
    updateSlides(next);
  };

  const handleRemoveSlide = (index: number) => {
    const next = slides.filter((_, idx) => idx !== index);
    updateSlides(next);
    if (selectedIndex >= next.length) {
      setSelectedIndex(Math.max(0, next.length - 1));
    }
  };

  const handleMoveSlide = (index: number, delta: number) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    const next = [...slides];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    updateSlides(next);
    setSelectedIndex(targetIndex);
  };

  const handleDuplicateSlide = (index: number) => {
    const slideToCopy = slides[index];
    const copy: CarouselSlide = {
      ...slideToCopy,
      id: `slide-${Date.now()}`,
      title: `${slideToCopy.title} (Copie)`,
    };
    const next = [...slides];
    next.splice(index + 1, 0, copy);
    updateSlides(next);
    setSelectedIndex(index + 1);
  };

  const currentSlide = slides[selectedIndex] || slides[0];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
        <div>
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#ff6a00]" /> Visual Hero Carousel Builder
          </h4>
          <p className="text-xs text-slate-500">
            {slides.length === 0
              ? 'No custom slides created. Auto-generated category slides will be displayed.'
              : `${slides.length} custom slide(s) active.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" /> {showPreview ? 'Hide Preview' : 'Show Live Preview'}
          </button>
          <button
            type="button"
            onClick={handleAddSlide}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff6a00] px-4 py-2 text-xs font-black text-white shadow-md hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Carousel Slide
          </button>
        </div>
      </div>

      {/* Live Admin Carousel Banner Preview */}
      {showPreview && currentSlide && (
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 shadow-xl transition-all">
          <div className="bg-slate-900 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-[#ff6a00]" /> Live Slide Preview (Slide {selectedIndex + 1} of {slides.length})</span>
            <span className="text-slate-500">Theme: {PRESET_GRADIENTS[currentSlide.bgPreset || 'navy']?.label || 'Custom Image'}</span>
          </div>
          <div
            className="relative flex min-h-[220px] flex-col justify-center p-6 text-white sm:p-8"
            style={{
              background: currentSlide.imageUrl
                ? `linear-gradient(rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.65)), url(${currentSlide.imageUrl}) center/cover no-repeat`
                : PRESET_GRADIENTS[currentSlide.bgPreset || 'navy']?.bg || PRESET_GRADIENTS.navy.bg,
            }}
          >
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
              {currentSlide.badgeText || 'PANDAMARKET B2B'}
            </span>
            <h3 className="mt-3 max-w-lg text-2xl font-black leading-tight sm:text-3xl">
              {currentSlide.title || 'Slide Title'}
            </h3>
            {currentSlide.subtitle && (
              <p className="mt-2 max-w-md text-xs font-semibold text-white/80 line-clamp-2">
                {currentSlide.subtitle}
              </p>
            )}
            <div className="mt-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#ff6a00] px-5 py-2 text-xs font-black text-white shadow-lg">
                {currentSlide.ctaLabel || 'Shop now'} ➔
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Slide Cards List */}
      {slides.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
          <Layers className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-700">No Custom Carousel Slides Created</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Click the "Add Carousel Slide" button above to create custom hero banners with custom text, images, and links.
          </p>
          <button
            type="button"
            onClick={handleAddSlide}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#ff6a00] px-4 py-2 text-xs font-black text-white shadow-md hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" /> Create First Slide
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Slide Selector Tabs */}
          <div className="space-y-2 lg:col-span-4">
            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">Slide List ({slides.length})</h5>
            {slides.map((slide, idx) => (
              <div
                key={slide.id || idx}
                onClick={() => setSelectedIndex(idx)}
                className={`group flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all ${
                  idx === selectedIndex
                    ? 'border-[#ff6a00] bg-orange-50/60 shadow-md ring-2 ring-[#ff6a00]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    idx === selectedIndex ? 'bg-[#ff6a00] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <p className={`text-xs font-bold truncate ${idx === selectedIndex ? 'text-[#ff6a00]' : 'text-slate-800'}`}>
                      {slide.title || 'Untitled Slide'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{slide.ctaUrl}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleMoveSlide(idx, -1); }}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="Move Up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleMoveSlide(idx, 1); }}
                    disabled={idx === slides.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="Move Down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDuplicateSlide(idx); }}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveSlide(idx); }}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Slide Form Editor */}
          {currentSlide && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-8 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h5 className="text-sm font-black text-slate-800">Editing Slide #{selectedIndex + 1}</h5>
                <span className="text-xs font-semibold text-slate-400">ID: {currentSlide.id}</span>
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Headline Title</label>
                  <input
                    type="text"
                    value={currentSlide.title}
                    onChange={(e) => handleUpdateSlide(selectedIndex, { title: e.target.value })}
                    placeholder="e.g. Grandes Offres B2B PandaMarket"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/15"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Badge Text (Top Label)</label>
                  <input
                    type="text"
                    value={currentSlide.badgeText || ''}
                    onChange={(e) => handleUpdateSlide(selectedIndex, { badgeText: e.target.value })}
                    placeholder="e.g. 🔥 OFFRE LIMITÉE"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/15"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Description Subtitle</label>
                <textarea
                  rows={2}
                  value={currentSlide.subtitle}
                  onChange={(e) => handleUpdateSlide(selectedIndex, { subtitle: e.target.value })}
                  placeholder="Short description highlighting deals or category perks..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-800 outline-none transition-all focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/15"
                />
              </div>

              {/* CTA Button & Target URL */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">CTA Button Label</label>
                  <input
                    type="text"
                    value={currentSlide.ctaLabel}
                    onChange={(e) => handleUpdateSlide(selectedIndex, { ctaLabel: e.target.value })}
                    placeholder="e.g. Explorer le Hub"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/15"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">CTA Link Target URL</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={currentSlide.ctaUrl}
                      onChange={(e) => handleUpdateSlide(selectedIndex, { ctaUrl: e.target.value })}
                      placeholder="e.g. /hub/search or /hub/category/electronics"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/15"
                    />
                    <LinkIcon className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Background Color Preset & Image Picker */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700">Background Style & Theme Preset</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {Object.entries(PRESET_GRADIENTS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleUpdateSlide(selectedIndex, { bgPreset: key })}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all ${
                        (currentSlide.bgPreset || 'navy') === key
                          ? 'border-[#ff6a00] ring-2 ring-[#ff6a00]/20 bg-orange-50/40'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="h-6 w-full rounded-lg shadow-inner" style={{ background: preset.bg }} />
                      <span className="text-[10px] font-extrabold text-slate-700 truncate w-full">{preset.label}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="mb-1 block text-xs font-bold text-slate-600">Custom Background Image URL (Optional)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={currentSlide.imageUrl}
                      onChange={(e) => handleUpdateSlide(selectedIndex, { imageUrl: e.target.value })}
                      placeholder="e.g. /pd-product-images/banners/hero.jpg"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setIsAssetPickerOpen(true)}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <ImageIcon className="h-4 w-4 text-[#ff6a00]" /> Select Asset
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">High-res banner image URL. If provided, it overrides the gradient theme.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isAssetPickerOpen && (
        <MarketplaceAssetPicker
          open={isAssetPickerOpen}
          onClose={() => setIsAssetPickerOpen(false)}
          onSelect={(url) => {
            if (currentSlide) handleUpdateSlide(selectedIndex, { imageUrl: url });
            setIsAssetPickerOpen(false);
          }}
          title="Select Carousel Background Image"
          type="image"
        />
      )}
    </div>
  );
}
