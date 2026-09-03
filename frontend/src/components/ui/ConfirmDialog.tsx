'use client';

import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Modal, ModalProps } from './Modal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  dir?: 'ltr' | 'rtl' | 'auto';
  maxWidth?: ModalProps['maxWidth'];
  icon?: React.ReactNode;
  confirmButtonClassName?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false,
  dir,
  maxWidth = 'md',
  icon,
  confirmButtonClassName = '',
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isBusy = loading || internalLoading;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: icon || <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
          iconBg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50',
          confirmBtn:
            'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white focus:ring-rose-500 shadow-2xs',
        };
      case 'warning':
        return {
          icon: icon || <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
          iconBg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50',
          confirmBtn:
            'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white focus:ring-amber-500 shadow-2xs',
        };
      case 'primary':
      default:
        return {
          icon: icon || <CheckCircle2 className="w-5 h-5 text-slate-900 dark:text-white shrink-0" />,
          iconBg: 'bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700',
          confirmBtn:
            'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white focus:ring-slate-400 shadow-2xs',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isBusy) onClose();
      }}
      closeOnEscape={!isBusy}
      closeOnBackdropClick={!isBusy}
      maxWidth={maxWidth}
      dir={dir}
      showCloseButton={!isBusy}
    >
      <div className="flex items-start gap-4">
        <div className={`shrink-0 p-2.5 rounded-2xl ${variantStyles.iconBg}`}>
          {variantStyles.icon}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
            {title}
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            {description}
          </div>
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
          type="button"
          data-autofocus
          onClick={handleConfirm}
          disabled={isBusy}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${variantStyles.confirmBtn} ${confirmButtonClassName}`}
        >
          {isBusy && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
          <span>{confirmLabel}</span>
        </button>
      </div>
    </Modal>
  );
}
