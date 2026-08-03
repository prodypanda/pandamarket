'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWithCsrf } from '@/lib/api';
import {
  Globe,
  Palette,
  Layout,
  Navigation as NavIcon,
  FileText,
  Search,
  Code2,
  Users,
  Eye,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { revalidateStoreCache } from '@/lib/store-cache';
import { getStorefrontUrl } from '@/lib/store-hosts';
import { useLocale } from '@/contexts/LocaleContext';

interface StoreData {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  theme_id: string;
  status: string;
  is_verified: boolean;
  settings?: {
    maintenance_message?: string;
    logo_url?: string;
  };
}

export default function OnlineStoreOverviewPage() {
  const { t } = useLocale();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const fetchStore = async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStore(data.store);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStore();
  }, []);

  const handleTogglePublish = async () => {
    if (!store) return;
    setPublishing(true);
    // Backend PUT /api/pd/stores/me/maintenance expects { enabled: boolean }.
    // enabled=true  -> store enters maintenance mode (offline)
    // enabled=false -> store goes live (status becomes 'verified')
    const isCurrentlyOnline = store.status === 'verified';
    const goingOffline = isCurrentlyOnline;
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          enabled: goingOffline,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStore((prev) => (prev ? { ...prev, status: data.store?.status || (goingOffline ? 'maintenance' : 'verified') } : null));
        setFeedback({
          message: goingOffline
            ? t('dashboardPages.onlineStore.maintenanceMode')
            : t('dashboardPages.onlineStore.published'),
        });
        revalidateStoreCache({ subdomain: store.subdomain, custom_domain: store.custom_domain });
      } else {
        const errData = await res.json().catch(() => ({}));
        setFeedback({ message: errData.error?.message || t('dashboardPages.onlineStore.updateStatusError'), isError: true });
      }
    } catch {
      setFeedback({ message: t('common.networkError'), isError: true });
    } finally {
      setPublishing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const storefrontUrl = getStorefrontUrl({
    subdomain: store?.subdomain,
    customDomain: store?.custom_domain,
  });

  const isPublished = store?.status === 'verified';

  const quickLinks = [
    {
      title: t('dashboardPages.themes.title'),
      desc: t('dashboardPages.themes.subtitle'),
      href: '/hub/dashboard/online-store/themes',
      icon: Palette,
      badge: store?.theme_id ? `${t('dashboardPages.themes.active')}: ${store.theme_id}` : undefined,
    },
    {
      title: t('dashboardPages.customize.title'),
      desc: t('dashboardPages.customize.subtitle'),
      href: '/hub/dashboard/online-store/customize',
      icon: Layout,
    },
    {
      title: t('storefrontNav.title'),
      desc: t('storefrontNav.subtitle'),
      href: '/hub/dashboard/online-store/navigation',
      icon: NavIcon,
    },
    {
      title: t('dashboardPages.pageBuilder.title'),
      desc: t('dashboardPages.pageBuilder.title'),
      href: '/hub/dashboard/page-builder',
      icon: FileText,
    },
    {
      title: t('dashboardPages.domains.title'),
      desc: t('dashboardPages.domains.subtitle'),
      href: '/hub/dashboard/online-store/domains',
      icon: Globe,
      badge: store?.custom_domain || `${store?.subdomain}.garbage.team`,
    },
    {
      title: t('dashboardPages.seo.title'),
      desc: t('dashboardPages.seo.subtitle'),
      href: '/hub/dashboard/online-store/seo',
      icon: Search,
    },
    {
      title: t('dashboardPages.integrations.title'),
      desc: t('dashboardPages.integrations.subtitle'),
      href: '/hub/dashboard/online-store/integrations',
      icon: Code2,
    },
    {
      title: t('dashboardPages.customers.title'),
      desc: t('dashboardPages.customers.subtitle'),
      href: '/hub/dashboard/online-store/customers',
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-[#B91C1C]/10 p-2 text-[#B91C1C]">
                <Globe className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900">{t('dashboardPages.onlineStore.title')}</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {t('dashboardPages.onlineStore.title')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={storefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-[#B91C1C] hover:text-[#B91C1C] transition shadow-sm"
            >
              <Eye className="h-4 w-4" />
              <span>{t('dashboardPages.onlineStore.visit')}</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>

            <button
              type="button"
              onClick={handleTogglePublish}
              disabled={publishing}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 ${
                isPublished
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isPublished ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{t('dashboardPages.onlineStore.published')}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span>{t('dashboardPages.onlineStore.publish')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs font-semibold ${
              feedback.isError
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#B91C1C]/40 hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700 group-hover:bg-[#B91C1C]/10 group-hover:text-[#B91C1C] transition-colors">
                  <item.icon className="h-5 w-5" />
                </div>
                {item.badge && (
                  <span className="truncate max-w-[120px] rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {item.badge}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#B91C1C] transition-colors">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.desc}</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#B91C1C] opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Gérer</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
