import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Home, Search, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

interface ErrorStateAction {
  href: string;
  label: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'dark';
}

interface ErrorStatePageProps {
  eyebrow?: string;
  code?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  actions?: ErrorStateAction[];
  children?: ReactNode;
  compact?: boolean;
}

function actionClass(variant: ErrorStateAction['variant'] = 'primary') {
  if (variant === 'dark') return 'bg-slate-950 text-white shadow-lg shadow-slate-950/20 hover:-translate-y-0.5 hover:bg-slate-800';
  if (variant === 'secondary') return 'border border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:bg-gray-50';
  return 'bg-[#16C784] text-white shadow-lg shadow-emerald-900/15 hover:-translate-y-0.5 hover:bg-[#14b576]';
}

export function ErrorStatePage({
  eyebrow = 'PandaMarket',
  code,
  title,
  description,
  icon: Icon = ShieldCheck,
  actions = [
    { href: '/hub', label: 'Go to marketplace', icon: Home },
    { href: '/hub/search', label: 'Search products', icon: Search, variant: 'secondary' },
  ],
  children,
  compact = false,
}: ErrorStatePageProps) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(22,199,132,0.20),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-12 text-gray-900">
      <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-[#16C784]/10 blur-2xl" />
      <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-slate-900/10 blur-3xl" />
      <div className={`relative w-full ${compact ? 'max-w-2xl' : 'max-w-4xl'}`}>
        <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex min-h-[260px] flex-col justify-between bg-slate-950 p-8 text-white sm:p-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-200 ring-1 ring-white/10">
                  <span className="h-2 w-2 rounded-full bg-[#16C784]" />
                  {eyebrow}
                </div>
                <div className="mt-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#16C784]/15 ring-1 ring-[#16C784]/20">
                  <Icon className="h-10 w-10 text-[#16C784]" />
                </div>
              </div>
              <div className="mt-10">
                <p className="text-sm font-semibold text-white/50">Need help?</p>
                <p className="mt-2 text-sm leading-6 text-white/75">Return to a safe page, search the marketplace, or contact support if this keeps happening.</p>
              </div>
            </div>
            <div className="p-8 sm:p-10 lg:p-12">
              {code && <p className="text-7xl font-black tracking-tight text-gray-100 sm:text-8xl">{code}</p>}
              <h1 className={code ? '-mt-8 text-3xl font-black text-gray-900 sm:text-4xl' : 'text-3xl font-black text-gray-900 sm:text-4xl'}>{title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">{description}</p>
              {children && <div className="mt-6">{children}</div>}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {actions.map((action) => {
                  const ActionIcon = action.icon || ArrowLeft;
                  return (
                    <Link
                      key={`${action.href}-${action.label}`}
                      href={action.href}
                      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black transition ${actionClass(action.variant)}`}
                    >
                      <ActionIcon className="h-4 w-4" />
                      {action.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
