'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';

/* ─── 1. ReGoCard & ReGoSplitCard ─── */
export interface ReGoCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function ReGoCard({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  children,
  className = '',
  noPadding = false,
}: ReGoCardProps) {
  return (
    <div
      className={`rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] transition-all duration-200 ${className}`}
    >
      {(title || actions || Icon || badge) && (
        <div className="flex items-center justify-between border-b border-[var(--rego-border,#dedede)]/70 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && <Icon className="w-4 h-4 text-[var(--rego-accent,#ad0505)] shrink-0" />}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {title && <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)] truncate">{title}</h3>}
                {badge}
              </div>
              {subtitle && <p className="text-xs text-[var(--rego-ink-2,#737373)] truncate">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
    </div>
  );
}

export function ReGoSplitCard({
  left,
  right,
  className = '',
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-12 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] overflow-hidden shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] ${className}`}
    >
      <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[var(--rego-border,#dedede)]/70 p-4">
        {left}
      </div>
      <div className="lg:col-span-7 p-4">
        {right}
      </div>
    </div>
  );
}

/* ─── 2. ReGoKpiHero ─── */
export interface ReGoKpiHeroProps {
  label: string;
  value: React.ReactNode;
  delta?: string | number;
  deltaType?: 'increase' | 'decrease' | 'neutral';
  deltaLabel?: string;
  hint?: string;
  icon?: LucideIcon;
  sparkline?: React.ReactNode;
  className?: string;
  accent?: boolean;
}

export function ReGoKpiHero({
  label,
  value,
  delta,
  deltaType = 'increase',
  deltaLabel = 'vs période préc.',
  hint,
  icon: Icon,
  sparkline,
  className = '',
  accent = false,
}: ReGoKpiHeroProps) {
  return (
    <div
      className={`rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-3.5 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))] flex flex-col justify-between transition-all hover:border-[var(--rego-accent,#ad0505)]/40 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] truncate">
          {label}
        </span>
        {Icon && (
          <div className="p-1.5 rounded-md bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-fg,#111111)]">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="my-2">
        <div className={`text-2xl lg:text-3xl font-black tracking-tight tabular-nums ${accent ? 'text-[var(--rego-accent,#ad0505)]' : 'text-[var(--rego-fg,#111111)]'}`}>
          {value}
        </div>
        {hint && <p className="text-[11px] text-[var(--rego-ink-3,#949494)] mt-0.5 truncate">{hint}</p>}
      </div>

      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
        {delta !== undefined && (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                deltaType === 'increase'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : deltaType === 'decrease'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {deltaType === 'increase' && <TrendingUp className="w-2.5 h-2.5" />}
              {deltaType === 'decrease' && <TrendingDown className="w-2.5 h-2.5" />}
              {deltaType === 'neutral' && <Minus className="w-2.5 h-2.5" />}
              <span>{typeof delta === 'number' ? `${delta > 0 ? '+' : ''}${delta}%` : String(delta)}</span>
            </span>
            {deltaLabel && <span className="text-[10px] text-[var(--rego-ink-3,#949494)]">{deltaLabel}</span>}
          </div>
        )}
        {sparkline && <div className="shrink-0">{sparkline}</div>}
      </div>
    </div>
  );
}

/* ─── 3. ReGoAmtBox (Tunisian Dinar Formatter) ─── */
export function ReGoAmtBox({
  amount,
  size = 'md',
  className = '',
}: {
  amount: number | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;
  const dinars = Math.floor(num);
  const millimes = Math.round((num - dinars) * 1000);
  const millimesStr = String(millimes).padStart(3, '0');

  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-xl font-black',
  };

  return (
    <span className={`inline-flex items-baseline font-mono font-bold tabular-nums text-[var(--rego-fg,#111111)] ${className}`}>
      <span className={textClasses[size]}>{dinars.toLocaleString('fr-TN')}</span>
      <span className="text-[0.75em] text-[var(--rego-ink-2,#737373)] font-medium">.{millimesStr}</span>
      <span className="ms-1 text-[0.65em] font-extrabold uppercase text-[var(--rego-ink-3,#949494)] tracking-wider">
        TND
      </span>
    </span>
  );
}

/* ─── 4. ReGoStatusChip ─── */
export function ReGoStatusChip({
  status,
  label,
  size = 'sm',
  className = '',
}: {
  status: 'ok' | 'warn' | 'err' | 'accent' | 'neutral' | 'info';
  label: React.ReactNode;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const statusStyles = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    warn: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    err: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    accent: 'bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)] border-[var(--rego-accent-line,rgba(173,5,5,0.3))]',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
  };

  const sizeStyles = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wider ${statusStyles[status]} ${sizeStyles[size]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      <span>{label}</span>
    </span>
  );
}

/* ─── 5. ReGoDrawer (Slide-out inspection panel) ─── */
export function ReGoDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  footer,
  children,
  width = 'max-w-lg',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 end-0 max-w-full flex ps-10">
        <div
          className={`w-screen ${width} bg-[var(--rego-bg,#ffffff)] border-s border-[var(--rego-border,#dedede)] shadow-2xl flex flex-col`}
        >
          <div className="flex items-center justify-between border-b border-[var(--rego-border,#dedede)] px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-[var(--rego-fg,#111111)]">{title}</h2>
              {subtitle && <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] hover:text-[var(--rego-fg,#111111)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
          {footer && (
            <div className="border-t border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/60 px-5 py-3.5 flex items-center justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── 6. ReGoModal (Focus-trapped dialog) ─── */
export function ReGoModal({
  isOpen,
  onClose,
  title,
  subtitle,
  actions,
  children,
  maxWidth = 'max-w-md',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div
        className={`relative w-full ${maxWidth} rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-2xl p-5 z-10 space-y-4`}
      >
        <div className="flex items-center justify-between border-b border-[var(--rego-border,#dedede)] pb-3">
          <div>
            <h3 className="text-base font-bold text-[var(--rego-fg,#111111)]">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] hover:text-[var(--rego-fg,#111111)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>{children}</div>
        {actions && <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--rego-border,#dedede)]">{actions}</div>}
      </div>
    </div>
  );
}
