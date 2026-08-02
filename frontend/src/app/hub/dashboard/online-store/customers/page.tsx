'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { Users, Search, RefreshCw, Mail, Calendar, ShoppingBag } from 'lucide-react';

interface StorefrontCustomer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  order_count?: number;
}

export default function StorefrontCustomersPage() {
  const [customers, setCustomers] = useState<StorefrontCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/customers', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.data || data.customers || []);
      }
    } catch {
      // Fallback empty list
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter((c) => {
    const term = searchQuery.toLowerCase();
    return (
      c.email?.toLowerCase().includes(term) ||
      c.first_name?.toLowerCase().includes(term) ||
      c.last_name?.toLowerCase().includes(term) ||
      c.phone?.includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-[#B91C1C]/10 p-2 text-[#B91C1C]">
                <Users className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900">Clients Storefront</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Liste des comptes acheteurs enregistrés sur votre boutique en ligne.
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Client</th>
                  <th className="px-6 py-3.5">Contact</th>
                  <th className="px-6 py-3.5">Inscrit le</th>
                  <th className="px-6 py-3.5 text-right">Commandes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || 'Acheteur'}
                      </div>
                      <div className="text-[11px] text-slate-400">{c.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{c.email}</span>
                      </div>
                      {c.phone && <div className="mt-0.5 text-[11px] text-slate-400">{c.phone}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        <ShoppingBag className="h-3 w-3 text-slate-500" />
                        {c.order_count || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            {searchQuery ? 'Aucun client ne correspond à votre recherche.' : 'Aucun client enregistré pour l\'instant.'}
          </div>
        )}
      </div>
    </div>
  );
}
