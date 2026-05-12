'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, FileText, Loader2, MessageSquare, XCircle } from 'lucide-react';
import { HubNavbar } from '../../../components/hub/HubNavbar';
import { HubFooter } from '../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../hooks/useMarketplaceTheme';
import { fetchWithCsrf } from '../../../lib/api';

type ReportStatus = 'open' | 'investigating' | 'awaiting_buyer' | 'awaiting_seller' | 'resolved' | 'dismissed';

interface Report {
  id: string;
  store_name?: string | null;
  store_subdomain?: string | null;
  order_id: string | null;
  category: string;
  priority: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  updated_at?: string | null;
}

const statusConfig: Record<ReportStatus, { label: string; className: string; icon: typeof AlertTriangle }> = {
  open: { label: 'Ouvert', className: 'bg-red-50 text-red-700 ring-red-100', icon: AlertTriangle },
  investigating: { label: 'En analyse', className: 'bg-amber-50 text-amber-700 ring-amber-100', icon: Clock },
  awaiting_buyer: { label: 'Action acheteur', className: 'bg-blue-50 text-blue-700 ring-blue-100', icon: MessageSquare },
  awaiting_seller: { label: 'Réponse vendeur', className: 'bg-purple-50 text-purple-700 ring-purple-100', icon: MessageSquare },
  resolved: { label: 'Résolu', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100', icon: CheckCircle },
  dismissed: { label: 'Rejeté', className: 'bg-gray-100 text-gray-600 ring-gray-200', icon: XCircle },
};

export default function BuyerCasesPage() {
  const { settings, classes, isAliExpress } = useMarketplaceTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'all' | ReportStatus>('all');
  const accentText = isAliExpress ? 'text-[#ff4747]' : 'text-[#16C784]';

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: '1', limit: '50' });
        if (status !== 'all') params.set('status', status);
        const res = await fetchWithCsrf(`/api/pd/reports/me?${params.toString()}`);
        if (res.status === 401) {
          window.location.href = '/login/buyer?next=/hub/cases';
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setReports(data.data || []);
        } else {
          setReports([]);
        }
      } finally {
        setLoading(false);
      }
    }
    void loadReports();
  }, [status]);

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar marketplaceName={settings.marketplace_name} marketplaceLogoUrl={settings.marketplace_logo_url} marketplaceTheme={settings.marketplace_theme} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className={`mb-6 rounded-[2rem] p-6 text-white sm:p-8 ${classes.header}`}>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-white/70">Centre de résolution</p>
          <h1 className="mt-3 text-3xl font-black">Mes dossiers</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75">Suivez vos signalements, ajoutez des informations et joignez des preuves pour aider l'équipe marketplace.</p>
        </section>

        <div className="mb-6 flex flex-wrap gap-2">
          {(['all', 'open', 'investigating', 'awaiting_buyer', 'awaiting_seller', 'resolved', 'dismissed'] as Array<'all' | ReportStatus>).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${status === item ? classes.primary : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {item === 'all' ? 'Tous' : statusConfig[item].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={`${classes.panel} flex min-h-[260px] items-center justify-center`}>
            <Loader2 className={`h-7 w-7 animate-spin ${accentText}`} />
          </div>
        ) : reports.length === 0 ? (
          <div className={`${classes.panel} p-12 text-center`}>
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
            <h2 className="text-xl font-black text-gray-900">Aucun dossier</h2>
            <p className="mt-2 text-sm text-gray-500">Vos dossiers de résolution apparaîtront ici après un signalement.</p>
            <Link href="/hub/orders" className={`mt-6 inline-flex rounded-full px-5 py-3 text-sm font-black text-white ${isAliExpress ? 'bg-[#ff4747]' : 'bg-[#16C784]'}`}>
              Voir mes commandes
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reports.map((report) => {
              const config = statusConfig[report.status];
              const StatusIcon = config.icon;
              return (
                <Link key={report.id} href={`/hub/cases/${report.id}`} className={`${classes.panel} group p-5 transition hover:-translate-y-1 hover:shadow-xl`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ring-1 ${config.className}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">{report.priority}</span>
                      </div>
                      <h2 className="mt-4 text-lg font-black text-gray-900">{report.store_name || 'Dossier marketplace'}</h2>
                    </div>
                    <FileText className={`h-6 w-6 ${accentText}`} />
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">{report.reason}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-gray-400">
                    <span>#{report.id.slice(-8).toUpperCase()}</span>
                    {report.order_id && <span>Commande #{report.order_id.slice(-8).toUpperCase()}</span>}
                    <span>{new Date(report.created_at).toLocaleDateString('fr-TN')}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <HubFooter {...settings} />
    </div>
  );
}
