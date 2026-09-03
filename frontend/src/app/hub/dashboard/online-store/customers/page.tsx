'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
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
  const { t, locale, dir } = useLocale();
  const [customers, setCustomers] = useState<StorefrontCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';

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
      <div dir={dir} className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2 text-slate-900 dark:text-white">
                <Users className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('dashboardPages.customers.title')}
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('dashboardPages.customers.subtitle')}
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('dashboardPages.customers.search')}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 pl-9 pr-4 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        {filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">{t('dashboardPages.customers.name')}</th>
                  <th className="px-6 py-3.5">{t('dashboardPages.customers.contact')}</th>
                  <th className="px-6 py-3.5">{t('dashboardPages.customers.joinDate')}</th>
                  <th className="px-6 py-3.5 text-right">{t('dashboardPages.customers.orders')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || t('dashboardPages.customers.defaultCustomerName')}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">{c.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{c.email}</span>
                      </div>
                      {c.phone && <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{c.phone}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{new Date(c.created_at).toLocaleDateString(dateLocale)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700">
                        <ShoppingBag className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                        {c.order_count || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
            {searchQuery
              ? t('dashboardPages.customers.noSearchResults')
              : t('dashboardPages.customers.noCustomers')}
          </div>
        )}
      </div>
    </div>
  );
}
