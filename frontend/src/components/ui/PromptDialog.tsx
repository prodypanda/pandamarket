'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Modal, ModalProps } from './Modal';

export interface PromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
  required?: boolean;
  inputType?: 'text' | 'textarea';
  loading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  rows?: number;
  errorMessage?: string | null;
  helperText?: React.ReactNode;
  maxWidth?: ModalProps['maxWidth'];
}

export function PromptDialog({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  label,
  placeholder = '',
  defaultValue = '',
  maxLength,
  required = false,
  inputType = 'text',
  loading = false,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  dir,
  rows = 3,
  errorMessage,
  helperText,
  maxWidth = 'md',
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [internalLoading, setInternalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isBusy = loading || internalLoading;
  const activeError = errorMessage || localError;

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setLocalError(null);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (required && !value.trim()) {
      setLocalError('Ce champ est obligatoire.');
      return;
    }

    try {
      setLocalError(null);
      setInternalLoading(true);
      await onSubmit(value);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isBusy) onClose();
      }}
      closeOnEscape={!isBusy}
      closeOnBackdropClick={!isBusy}
      title={title}
      subtitle={description}
      maxWidth={maxWidth}
      dir={dir}
      showCloseButton={!isBusy}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {activeError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{activeError}</span>
          </div>
        )}

        <div className="space-y-1.5">
          {label && (
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {label}
              {required && <span className="text-rose-500 ml-1">*</span>}
            </label>
          )}

          {inputType === 'textarea' ? (
            <textarea
              autoFocus
              data-autofocus
              rows={rows}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (localError) setLocalError(null);
              }}
              placeholder={placeholder}
              maxLength={maxLength}
              disabled={isBusy}
              className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-colors disabled:opacity-50 resize-y"
            />
          ) : (
            <input
              type="text"
              autoFocus
              data-autofocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (localError) setLocalError(null);
              }}
              placeholder={placeholder}
              maxLength={maxLength}
              disabled={isBusy}
              className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-colors disabled:opacity-50"
            />
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-0.5">
            <div>{helperText}</div>
            {typeof maxLength === 'number' && (
              <div
                className={`font-mono text-[11px] ${
                  value.length >= maxLength
                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                    : value.length >= maxLength * 0.9
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {`${value.length}/${maxLength}`}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="px-4 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={isBusy || (required && !value.trim())}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-sm font-medium transition-colors disabled:opacity-50 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {isBusy && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
