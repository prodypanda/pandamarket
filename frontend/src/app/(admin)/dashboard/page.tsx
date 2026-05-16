'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Flag, Loader2, Receipt, ShieldCheck, ShoppingCart, Users, DollarSign, Settings, Activity, Store, Crown, Sparkles, Mail } from 'lucide-react';

interface AdminStats {
  total_stores: number;
  total_orders: number;
  total_revenue: number;
  pending_kyc: number;
  pending_mandats: number;
  open_reports: number;
}

export default function AdminDashboard() {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetchWithCsrf('/api/pd/admin/stats', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          setError('Failed to load stats');
        }
      } catch {
        setError('Network error');
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  const statCards = stats
    ? [
        { name: 'Total Vendors', value: stats.total_stores.toLocaleString(), icon: Users, color: 'bg-amber-50 text-[#B91C1C]', ring: 'shadow-red-900/5' },
        { name: 'Total Revenue (GMV)', value: `TND ${stats.total_revenue.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}`, icon: DollarSign, color: 'bg-amber-50 text-[#B91C1C]', ring: 'shadow-red-900/5' },
        { name: 'Total Orders', value: stats.total_orders.toLocaleString(), icon: ShoppingCart, color: 'bg-red-50 text-[#7F1D1D]', ring: 'shadow-red-900/5' },
        { name: 'Pending KYC', value: stats.pending_kyc.toLocaleString(), icon: ShieldCheck, color: 'bg-yellow-50 text-yellow-600', ring: 'shadow-yellow-900/5' },
        { name: 'Pending Mandats', value: stats.pending_mandats.toLocaleString(), icon: Receipt, color: 'bg-orange-50 text-orange-600', ring: 'shadow-orange-900/5' },
        { name: 'Open Reports', value: stats.open_reports.toLocaleString(), icon: Flag, color: 'bg-red-50 text-red-600', ring: 'shadow-red-900/5' },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#3B0D0D] via-[#7F1D1D] to-[#B91C1C] p-8 text-white shadow-2xl shadow-slate-950/20">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
        <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full bg-[#B91C1C]/20 blur-[80px] animate-pulse" />
        <div className="absolute right-48 top-20 h-48 w-48 rounded-full bg-amber-300/20 blur-[60px] animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#FCD34D] backdrop-blur-md">
              <Activity className="h-3.5 w-3.5" />
              System Status: Optimal
            </span>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">Admin</span>
            </h1>
            <p className="mt-4 text-sm font-medium leading-relaxed text-slate-300">
              Welcome to the PandaMarket control center. Here is your platform overview, operational risks, seller activity, and revenue signals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/settings" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 text-sm font-bold text-white shadow-lg backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/10">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <Link href="/hub" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-900/25 transition-all hover:-translate-y-0.5 hover:bg-[#991B1B]">
              Go to Hub
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center rounded-[2rem] border border-white/70 bg-white/80 py-16 shadow-sm">
          <Loader2 className="w-8 h-8 text-[#B91C1C] animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 font-semibold text-red-700">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat) => (
            <div
              key={stat.name}
              className={`group relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white p-6 shadow-xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl ${stat.ring}`}
            >
              <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:opacity-40 ${stat.color.split(' ')[0]}`} />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">{stat.name}</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{stat.value}</p>
                </div>
                <div className={`rounded-2xl p-3 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Center & Quick Links */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Action Center */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">Action Center</h3>
              <p className="text-sm font-medium text-slate-500">Tasks requiring immediate attention</p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-black text-red-600">
              {stats ? stats.pending_kyc + stats.pending_mandats + stats.open_reports : 0}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/kyc" className="group flex items-center justify-between rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-yellow-200 hover:shadow-xl hover:shadow-yellow-900/5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600 transition-colors group-hover:bg-yellow-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">KYC Verifications</p>
                  <p className="text-sm font-medium text-slate-500">
                    {stats ? `${stats.pending_kyc} pending store validation${stats.pending_kyc !== 1 ? 's' : ''}` : 'Loading...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-yellow-500 group-hover:text-white">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>

            <Link href="/mandats" className="group flex items-center justify-between rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-900/5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-100">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Mandat Proofs</p>
                  <p className="text-sm font-medium text-slate-500">
                    {stats ? `${stats.pending_mandats} pending payment validation${stats.pending_mandats !== 1 ? 's' : ''}` : 'Loading...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-orange-500 group-hover:text-white">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>

            <Link href="/reports" className="group flex items-center justify-between rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-red-200 hover:shadow-xl hover:shadow-red-900/5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 transition-colors group-hover:bg-red-100">
                  <Flag className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Active Reports</p>
                  <p className="text-sm font-medium text-slate-500">
                    {stats ? `${stats.open_reports} open dispute${stats.open_reports !== 1 ? 's' : ''}` : 'Loading...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-red-500 group-hover:text-white">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">Quick Jump</h3>
              <p className="text-sm font-medium text-slate-500">Fast navigation</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Vendors', href: '/users', icon: Users, color: 'text-[#B91C1C]', bg: 'bg-amber-50' },
              { label: 'Stores', href: '/stores', icon: Store, color: 'text-[#B91C1C]', bg: 'bg-amber-50' },
              { label: 'Plans', href: '/plans', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'AI Costs', href: '/ai-costs', icon: Sparkles, color: 'text-[#7F1D1D]', bg: 'bg-red-50' },
              { label: 'System Logs', href: '/system-logs', icon: Activity, color: 'text-[#B91C1C]', bg: 'bg-amber-50' },
              { label: 'Email settings', href: '/settings', icon: Mail, color: 'text-[#B91C1C]', bg: 'bg-amber-50' },
            ].map((link) => (
              <Link key={link.label} href={link.href} className="group flex flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-slate-100 bg-white p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${link.bg} ${link.color} transition-transform group-hover:scale-110`}>
                  <link.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
