'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

export interface DashboardPageWrapperProps {
  breadcrumbs: Array<{ label: string; href?: string }>;
  headerTitle: string;
  headerSubtitle?: string;
  headerIcon?: LucideIcon;
  statusBadge?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  alertBanner?: React.ReactNode;
  kpiStrip?: React.ReactNode;
  filterToolbar?: React.ReactNode;
  mainContent: React.ReactNode;
  drawer?: React.ReactNode;
  modals?: React.ReactNode;
}

export function DashboardPageWrapper({
  breadcrumbs,
  headerTitle,
  headerSubtitle,
  headerIcon: HeaderIcon,
  statusBadge,
  primaryAction,
  secondaryAction,
  alertBanner,
  kpiStrip,
  filterToolbar,
  mainContent,
  drawer,
  modals,
}: DashboardPageWrapperProps) {
  return (
    <div className="space-y-4 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Layer 1: Breadcrumbs Navigation Trail */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs text-[var(--rego-ink-2,#737373)]">
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-[var(--rego-border,#dedede)]">/</span>}
            {b.href ? (
              <Link href={b.href} className="hover:text-[var(--rego-fg,#111111)] transition-colors">
                {b.label}
              </Link>
            ) : (
              <span className="font-bold text-[var(--rego-fg,#111111)]">{b.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Layer 2: Page Header Bar */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-[var(--rego-border,#dedede)]/70 pb-3.5">
        <div className="flex items-center gap-3">
          {HeaderIcon && (
            <div className="p-2 rounded-lg bg-[var(--rego-surface,#f5f5f5)] text-[var(--rego-accent,#ad0505)]">
              <HeaderIcon className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--rego-fg,#111111)]">
                {headerTitle}
              </h1>
              {statusBadge}
            </div>
            {headerSubtitle && (
              <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">{headerSubtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {secondaryAction}
          {primaryAction}
        </div>
      </header>

      {/* Layer 3: Critical Operational Alert Banner (Conditional) */}
      {alertBanner && <div>{alertBanner}</div>}

      {/* Layer 4: Telemetry & KPI Cards Strip (component owns its own grid) */}
      {kpiStrip && <div className="w-full">{kpiStrip}</div>}

      {/* Layer 5: Control Bar & Filter Toolbar */}
      {filterToolbar && (
        <div className="rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] p-2.5 shadow-[var(--rego-shadow-s,0_1px_2px_rgba(0,0,0,0.05))]">
          {filterToolbar}
        </div>
      )}

      {/* Layer 6: Main Operational Working Area */}
      <main>{mainContent}</main>

      {/* Layer 7: Detail Inspection Drawer */}
      {drawer}

      {/* Layer 8: Focus-Trapped Action Modals */}
      {modals}
    </div>
  );
}
