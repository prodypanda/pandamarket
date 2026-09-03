'use client';

import { useEffect } from 'react';
import { AlertTriangle, Save, RotateCcw } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

interface UnsavedChangesBannerProps {
  isDirty: boolean;
  onSave: () => void | Promise<void>;
  onReset: () => void;
  saving?: boolean;
}

export function UnsavedChangesBanner({
  isDirty,
  onSave,
  onReset,
  saving = false,
}: UnsavedChangesBannerProps) {
  const { t, dir } = useLocale();
  // Prevent accidental browser navigation / tab close
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  if (!isDirty) return null;

  return (
    <div dir={dir} className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-amber-300/80 dark:border-amber-500/50 bg-slate-900/95 dark:bg-slate-950/95 px-6 py-3.5 text-white shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 text-amber-400">
        <AlertTriangle className="h-5 w-5 animate-pulse flex-shrink-0" />
        <span className="text-xs font-bold sm:text-sm">{t('common.unsavedChanges')}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 hover:border-slate-600 dark:border-slate-700 dark:hover:border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 dark:text-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 hover:text-white dark:hover:text-white transition disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-1.5 text-xs font-bold shadow-2xs transition disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  );
}
