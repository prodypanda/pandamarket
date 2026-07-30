'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, Trash2, Star, Check, Loader2 } from 'lucide-react';
import { SavedViewDTO, AnalyticsTimeRange, AnalyticsCurrency } from '@/types/analytics';
import {
  fetchSavedViews,
  createSavedView,
  deleteSavedView,
  setDefaultSavedView,
} from '@/lib/admin-platform-analytics';

interface SavedViewsDropdownProps {
  currentFilters: {
    timeRange: AnalyticsTimeRange;
    currency: AnalyticsCurrency;
  };
  onApplySavedView: (filters: { timeRange?: AnalyticsTimeRange; currency?: AnalyticsCurrency }) => void;
}

export const SavedViewsDropdown: React.FC<SavedViewsDropdownProps> = ({
  currentFilters,
  onApplySavedView,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedViewDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSavedViews = () => {
    setLoading(true);
    fetchSavedViews()
      .then((views) => {
        setSavedViews(views);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) loadSavedViews();
  }, [isOpen]);

  const handleSaveCurrentView = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;

    setSaving(true);
    try {
      await createSavedView({
        name: newViewName.trim(),
        filters: currentFilters,
        is_default: isDefault,
      });
      setNewViewName('');
      setIsCreating(false);
      setIsDefault(false);
      loadSavedViews();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSavedView(id);
      loadSavedViews();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefault = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await setDefaultSavedView(id);
      loadSavedViews();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm transition-all"
      >
        <Bookmark className="w-4 h-4 text-indigo-500" />
        <span>Saved Views</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-30 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">Saved Views Preset</span>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
            >
              <Plus className="h-3 w-3" />
              <span>Save Current</span>
            </button>
          </div>

          {isCreating && (
            <form onSubmit={handleSaveCurrentView} className="mt-3 space-y-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <input
                type="text"
                placeholder="View preset name..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-stone-50 px-3 py-1.5 text-xs outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
              <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Set as default view</span>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newViewName.trim()}
                  className="px-3 py-1 text-[11px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          )}

          <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
            {loading ? (
              <p className="text-[11px] text-slate-400 p-2 text-center">Loading views...</p>
            ) : savedViews.length === 0 ? (
              <p className="text-[11px] text-slate-400 p-2 text-center">No saved views yet</p>
            ) : (
              savedViews.map((view) => (
                <div
                  key={view.id}
                  onClick={() => {
                    onApplySavedView(view.filters as any);
                    setIsOpen(false);
                  }}
                  className="flex items-center justify-between rounded-xl p-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    {view.is_default ? (
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    ) : (
                      <Bookmark className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate text-slate-800 dark:text-slate-200">{view.name}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!view.is_default && (
                      <button
                        title="Set default"
                        onClick={(e) => handleSetDefault(view.id, e)}
                        className="p-1 hover:text-amber-500 text-slate-400"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      title="Delete view"
                      onClick={(e) => handleDelete(view.id, e)}
                      className="p-1 hover:text-rose-500 text-slate-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
