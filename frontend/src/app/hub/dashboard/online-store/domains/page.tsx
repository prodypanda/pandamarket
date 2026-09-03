'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
import {
  Globe,
  Save,
  ExternalLink,
  RefreshCw,
  Lock,
  Sparkles,
  Copy,
  Check,
  Info,
  ShieldCheck,
  Server,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useDashboardSubscription } from '@/contexts/DashboardSubscriptionContext';
import { UnsavedChangesBanner } from '@/components/dashboard/UnsavedChangesBanner';
import { revalidateStoreCache } from '@/lib/store-cache';
import { useLocale } from '@/contexts/LocaleContext';

interface DnsRecord {
  id: string;
  type: 'CNAME' | 'A' | 'TXT';
  name: string;
  target: string;
  ttl: string;
  purpose: string;
  status: string;
}

export default function DomainsPage() {
  const { t, dir } = useLocale();
  const { limits } = useDashboardSubscription();
  const hasCustomDomainAccess = limits === null || limits.has_custom_domain;
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [initialCustomDomain, setInitialCustomDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchStore = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSubdomain(data.store.subdomain || '');
        const domain = data.store.custom_domain || '';
        setCustomDomain(domain);
        setInitialCustomDomain(domain);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/domain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ custom_domain: customDomain.trim() || null }),
      });
      if (res.ok) {
        setInitialCustomDomain(customDomain);
        setIsDirty(false);
        setFeedback({ message: t('dashboardPages.domains.successMessage') });
        revalidateStoreCache({ subdomain, custom_domain: customDomain.trim() || null });
      } else {
        const errData = await res.json().catch(() => ({}));
        setFeedback({
          message:
            errData.error?.message ||
            errData.message ||
            t('dashboardPages.domains.errorSaving'),
          isError: true,
        });
      }
    } catch {
      setFeedback({ message: t('dashboardPages.domains.networkError'), isError: true });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleReset = () => {
    setCustomDomain(initialCustomDomain);
    setIsDirty(false);
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2000);
    } catch {
      // Fallback
    }
  };

  // Structured DNS records table data
  const dnsRecords: DnsRecord[] = [
    {
      id: 'cname-www',
      type: 'CNAME',
      name: 'www',
      target: 'cname.pandamarket.tn',
      ttl: '3600',
      purpose: 'Sous-domaine web principal vers PandaMarket Edge',
      status: 'Recommandé',
    },
    {
      id: 'a-apex',
      type: 'A',
      name: '@',
      target: '141.95.120.45',
      ttl: '3600',
      purpose: 'Domaine racine apex vers notre passerelle IP sécurisée',
      status: 'Requis pour apex',
    },
    {
      id: 'txt-challenge',
      type: 'TXT',
      name: '_pandamarket-challenge',
      target: `pm-store-verify-${subdomain || 'store'}`,
      ttl: '3600',
      purpose: 'Validation de propriété DNS & émission certificat SSL/TLS',
      status: 'Sécurité SSL',
    },
  ];

  const propagationCheckUrl = customDomain.trim()
    ? `https://www.whatsmydns.net/#CNAME/${encodeURIComponent(customDomain.trim().replace(/^https?:\/\//, ''))}`
    : 'https://www.whatsmydns.net/#CNAME/cname.pandamarket.tn';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" dir={dir}>
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header Card */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 p-3 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            <Globe className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('dashboardPages.domains.title')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboardPages.domains.subtitle')}
            </p>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-xl p-3.5 text-xs font-semibold flex items-center gap-2 ${
              feedback.isError
                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
            }`}
          >
            {feedback.isError ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Primary Subdomain Card */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('dashboardPages.domains.freeSubdomain')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboardPages.domains.subdomainDesc')}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Check className="h-3 w-3" /> Actif & Sécurisé
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 p-4 border border-slate-200/80 dark:border-slate-700">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">
              {subdomain}.pandamarket.tn
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sous-domaine gratuit inclus à vie avec certificat SSL automatique.
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => copyToClipboard(`https://${subdomain}.pandamarket.tn`, 'subdomain-url')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              {copiedKey === 'subdomain-url' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copier</span>
                </>
              )}
            </button>
            <a
              href={`/store/${subdomain}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-white transition shadow-2xs"
            >
              <span>{t('dashboardPages.domains.open')}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Custom Domain Configuration Card */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('dashboardPages.domains.customDomainHeading')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('dashboardPages.domains.customDomainDesc')}
            </p>
          </div>
          {!hasCustomDomainAccess && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1 text-[11px] font-black text-amber-700 dark:text-amber-400">
              <Lock className="h-3 w-3" /> Plan Starter requis
            </span>
          )}
        </div>

        {!hasCustomDomainAccess ? (
          <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-5 text-xs space-y-3">
            <p className="font-bold text-amber-900 dark:text-amber-300">
              Les noms de domaine personnalisés (ex: boutique.tn, masociete.com) sont disponibles à partir du forfait Starter.
            </p>
            <p className="text-amber-800/80 dark:text-amber-400">
              Bénéficiez d&apos;une marque blanche complète avec votre propre nom de domaine et un certificat SSL Let&apos;s Encrypt gratuit généré automatiquement.
            </p>
            <Link
              href="/hub/dashboard/subscription"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2 text-xs font-bold text-white transition shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400 dark:text-amber-600" />
              <span>Mettre à niveau mon abonnement</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('dashboardPages.domains.customDomain')}
              </label>
              <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => {
                    setCustomDomain(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder={t('dashboardPages.domains.customDomainPlaceholder')}
                  className="flex-1 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasCustomDomainAccess}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-5 py-2.5 text-xs font-bold text-white transition shadow-2xs disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? t('dashboardPages.domains.saving') : t('dashboardPages.domains.saveDomain')}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Saisissez votre domaine sans http:// ni https:// (ex: www.maboutique.tn ou shop.domain.com).
              </p>
            </div>

            {/* DNS Records Table & Helper Section */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Enregistrements DNS à configurer chez votre registraire (ATI, OVH, GoDaddy, Cloudflare...)
                  </h3>
                </div>

                <a
                  href={propagationCheckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition underline underline-offset-4"
                >
                  <span>Vérifier la propagation DNS</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Nom / Hôte</th>
                      <th className="px-4 py-3">Valeur / Cible</th>
                      <th className="px-4 py-3">TTL</th>
                      <th className="px-4 py-3">Rôle</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                    {dnsRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3.5 font-bold">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-mono text-[11px] font-extrabold ${
                              rec.type === 'CNAME'
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : rec.type === 'A'
                                  ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {rec.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{rec.name}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(rec.name, `${rec.id}-name`)}
                              title="Copier l'hôte"
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition rounded"
                            >
                              {copiedKey === `${rec.id}-name` ? (
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <span>{rec.target}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(rec.target, `${rec.id}-val`)}
                              title="Copier la valeur cible"
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition rounded"
                            >
                              {copiedKey === `${rec.id}-val` ? (
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                          {rec.ttl}
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                          {rec.purpose}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(rec.target, `${rec.id}-target`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          >
                            {copiedKey === `${rec.id}-target` ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-600 dark:text-emerald-400">Copié !</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copier</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Propagation Notice Box */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Délai de Propagation & Certificat SSL Let&apos;s Encrypt</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  La propagation des modifications DNS dépend de votre bureau d&apos;enregistrement et peut nécessiter entre <strong>15 minutes et 24 heures</strong> pour être active sur l&apos;ensemble des réseaux tunisiens et internationaux.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Outils de vérification :
                  </span>
                  <a
                    href={propagationCheckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    <span>WhatsMyDNS CNAME</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <a
                    href="https://dnschecker.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400 hover:underline"
                  >
                    <span>DNSChecker Global</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <UnsavedChangesBanner
        isDirty={isDirty}
        onSave={handleSave}
        onReset={handleReset}
        saving={saving}
      />
    </div>
  );
}
