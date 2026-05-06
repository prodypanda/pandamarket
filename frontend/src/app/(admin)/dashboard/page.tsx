'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Flag, Loader2, Receipt, ShieldCheck, ShoppingCart, Users, DollarSign } from 'lucide-react';

interface AdminStats {
  total_stores: number;
  total_orders: number;
  total_revenue: number;
  pending_kyc: number;
  pending_mandats: number;
  open_reports: number;
}

export default function AdminDashboard() {
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
        { name: 'Total Vendors', value: stats.total_stores.toLocaleString(), icon: Users, color: 'bg-blue-50 text-blue-600', ring: 'shadow-blue-900/5' },
        { name: 'Total Revenue (GMV)', value: `TND ${stats.total_revenue.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}`, icon: DollarSign, color: 'bg-emerald-50 text-[#16C784]', ring: 'shadow-emerald-900/5' },
        { name: 'Total Orders', value: stats.total_orders.toLocaleString(), icon: ShoppingCart, color: 'bg-purple-50 text-purple-600', ring: 'shadow-purple-900/5' },
        { name: 'Pending KYC', value: stats.pending_kyc.toLocaleString(), icon: ShieldCheck, color: 'bg-yellow-50 text-yellow-600', ring: 'shadow-yellow-900/5' },
        { name: 'Pending Mandats', value: stats.pending_mandats.toLocaleString(), icon: Receipt, color: 'bg-orange-50 text-orange-600', ring: 'shadow-orange-900/5' },
        { name: 'Open Reports', value: stats.open_reports.toLocaleString(), icon: Flag, color: 'bg-red-50 text-red-600', ring: 'shadow-red-900/5' },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[2rem] bg-[#0F0F23] p-8 text-white shadow-2xl shadow-slate-950/15">
        <div className="relative">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#16C784]/20 blur-3xl" />
          <div className="absolute right-32 top-10 h-24 w-24 rounded-full bg-blue-500/20 blur-2xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#1EE69A]">
                Superadmin control center
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Admin Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/65">Platform overview, operational risks, seller activity, and revenue signals in one place.</p>
            </div>
            <Link href="/hub" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#16C784] px-5 py-3 text-sm font-black text-white shadow-xl shadow-emerald-900/30 transition-all hover:-translate-y-0.5 hover:bg-[#14b876]">
              Go to marketplace hub
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center rounded-[2rem] border border-white/70 bg-white/80 py-16 shadow-sm">
          <Loader2 className="w-8 h-8 text-[#16C784] animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 font-semibold text-red-700">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat) => (
            <div
              key={stat.name}
              className={`group overflow-hidden rounded-[1.75rem] border border-white/80 bg-white p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${stat.ring}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-gray-400">{stat.name}</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-gray-900">{stat.value}</p>
                </div>
                <div className={`rounded-2xl p-3 transition-transform duration-300 group-hover:scale-110 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Urgent Actions */}
      <div className="rounded-[2rem] border border-white/80 bg-white p-6 shadow-xl shadow-slate-900/5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900">⚡ Urgent Actions</h3>
            <p className="text-sm text-gray-500">Resolve items that directly affect sellers and buyers.</p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <Link href="/kyc" className="flex items-center justify-between rounded-2xl border border-yellow-100 bg-yellow-50 p-4 transition-all hover:-translate-y-0.5 hover:bg-yellow-100">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">
                {stats ? `${stats.pending_kyc} KYC verification${stats.pending_kyc !== 1 ? 's' : ''} pending` : 'KYC verifications pending'}
              </span>
            </div>
            <span className="text-yellow-600 text-sm font-medium">Review →</span>
          </Link>
          <Link href="/mandats" className="flex items-center justify-between rounded-2xl border border-orange-100 bg-orange-50 p-4 transition-all hover:-translate-y-0.5 hover:bg-orange-100">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">
                {stats ? `${stats.pending_mandats} Mandat proof${stats.pending_mandats !== 1 ? 's' : ''} to validate` : 'Mandat proofs to validate'}
              </span>
            </div>
            <span className="text-orange-600 text-sm font-medium">Review →</span>
          </Link>
          <Link href="/reports" className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 transition-all hover:-translate-y-0.5 hover:bg-red-100">
            <div className="flex items-center gap-3">
              <Flag className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">
                {stats ? `${stats.open_reports} open report${stats.open_reports !== 1 ? 's' : ''}` : 'Open reports'}
              </span>
            </div>
            <span className="text-red-600 text-sm font-medium">Review →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
