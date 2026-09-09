'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Globe,
  ShieldCheck,
  Server,
  Lock,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Info,
  ChevronRight,
  SlidersHorizontal,
  CheckCircle,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export interface DnsRecord {
  id: string;
  type: 'CNAME' | 'A' | 'TXT';
  name: string;
  target: string;
  ttl: string;
  purpose: string;
  status: string;
}

export interface SellerReGoDomainsProps {
  subdomain: string;
  customDomain: string;
  initialCustomDomain: string;
  dnsRecords: DnsRecord[];
  hasCustomDomainAccess: boolean;
  saving: boolean;
  isDirty: boolean;
  feedback: { message: string; isError?: boolean } | null;
  onCustomDomainChange: (value: string) => void;
  onSave: () => Promise<void>;
  onReset: () => void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoDomains({
  subdomain,
  customDomain,
  initialCustomDomain,
  dnsRecords,
  hasCustomDomainAccess,
  saving,
  isDirty,
  feedback,
  onCustomDomainChange,
  onSave,
  onReset,
  dir = 'ltr',
}: SellerReGoDomainsProps) {
  const { t } = useLocale();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showDnsDrawer, setShowDnsDrawer] = useState(false);

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

  const isCustomDomainConnected = Boolean(initialCustomDomain && initialCustomDomain.trim());
  const cleanDomain = customDomain.trim().replace(/^https?:\/\//, '');

  const propagationCheckUrl = cleanDomain
    ? `https://www.whatsmydns.net/#CNAME/${encodeURIComponent(cleanDomain)}`
    : 'https://www.whatsmydns.net/#CNAME/cname.pandamarket.tn';

  return (
    <div dir={dir}>
      <DashboardPageWrapper
        breadcrumbs={[
          { label: 'Accueil', href: '/hub/dashboard' },
          { label: 'Boutique en Ligne', href: '/hub/dashboard/online-store' },
          { label: 'Domaines & DNS' },
        ]}
        headerTitle="Nom de Domaine & Configuration DNS"
        headerSubtitle="Associez votre propre nom de domaine personnalisé (ex: votre-boutique.tn) à votre vitrine PandaMarket pour renforcer votre notoriété de marque."
        headerIcon={Globe}
        statusBadge={
          <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)] rounded-full">
            DNS & SSL Edge
          </span>
        }
        secondaryAction={
          <a
            href={propagationCheckUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Tester Propagation DNS</span>
          </a>
        }
        primaryAction={
          <button
            onClick={() => onSave()}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>{saving ? 'Enregistrement...' : 'Enregistrer le Domaine'}</span>
          </button>
        }
        alertBanner={
          <div className="space-y-2">
            {feedback && (
              <div
                className={`flex items-center gap-3 p-3.5 rounded-[var(--rego-r,8px)] border text-xs font-semibold ${
                  feedback.isError
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {feedback.isError ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}
            {!hasCustomDomainAccess && (
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-[var(--rego-r,8px)] border border-amber-200 bg-amber-50 text-amber-800 text-xs">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    La configuration de domaines personnalisés (.tn, .com) requiert un forfait Regular ou supérieur.
                  </span>
                </div>
                <Link
                  href="/hub/dashboard/subscription"
                  className="px-3 py-1 bg-amber-600 text-white rounded-md font-bold text-[11px] hover:bg-amber-700 transition-colors"
                >
                  Débloquer la fonctionnalité
                </Link>
              </div>
            )}
          </div>
        }
        kpiStrip={
          <>
            <ReGoKpiHero
              label="Sous-domaine PandaMarket"
              value={subdomain ? `${subdomain}.pm.tn` : 'Non configuré'}
              hint="Toujours actif & certificat SSL inclus"
              icon={Globe}
            />
            <ReGoKpiHero
              label="Domaine Personnalisé"
              value={initialCustomDomain || 'Non associé'}
              hint={isCustomDomainConnected ? 'Actif & Redirection SSL' : 'En attente de configuration'}
              icon={Server}
              accent={isCustomDomainConnected}
            />
            <ReGoKpiHero
              label="Certificat SSL / TLS"
              value="Let's Encrypt 256-bit"
              hint="Renouvellement automatique sécurisé"
              icon={ShieldCheck}
            />
            <ReGoKpiHero
              label="Temps de Réponse DNS"
              value="< 35 ms"
              hint="PandaMarket Anycast Edge CDN"
              icon={Sparkles}
            />
          </>
        }
        mainContent={
          <div className="space-y-6">
            {/* 1. Official Subdomain Section */}
            <ReGoCard
              title="Sous-domaine Officiel PandaMarket (Gratuit & Permanent)"
              subtitle="Ce sous-domaine reste toujours accessible même si vous configurez un nom de domaine personnalisé"
              icon={Globe}
              badge={<ReGoStatusChip status="ok" label="Actif à vie" size="xs" />}
              actions={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(`https://${subdomain}.pandamarket.tn`, 'subdomain')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs"
                  >
                    {copiedKey === 'subdomain' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copier l'URL</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`/store/${subdomain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md bg-[var(--rego-fg,#111111)] text-white hover:opacity-90 transition-all shadow-2xs"
                  >
                    <span>Ouvrir</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              }
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[var(--rego-r,8px)] bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-3,#949494)]">
                    URL Permanente de la Vitrine
                  </span>
                  <div className="font-mono text-sm font-black text-[var(--rego-fg,#111111)] mt-0.5">
                    https://{subdomain}.pandamarket.tn
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>HTTPS Garanti & Certifié</span>
                </div>
              </div>
            </ReGoCard>

            {/* 2. Custom Domain Configuration Form */}
            <ReGoCard
              title="Domaine Personnalisé (Marque Blanche)"
              subtitle="Connectez votre nom de domaine propre (ex: artisanat-tunisie.tn) acheté chez l'ATI, OVH, Hostinger ou Namecheap"
              icon={Server}
              badge={
                isCustomDomainConnected ? (
                  <ReGoStatusChip status="ok" label="Connecté" size="xs" />
                ) : (
                  <ReGoStatusChip status="neutral" label="Non configuré" size="xs" />
                )
              }
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1.5">
                    Nom de Domaine Souhaité
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rego-ink-3,#949494)]" />
                      <input
                        type="text"
                        value={customDomain}
                        onChange={(e) => onCustomDomainChange(e.target.value)}
                        placeholder="ex: ma-boutique.tn ou www.ma-boutique.tn"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {isDirty && (
                        <button
                          type="button"
                          onClick={onReset}
                          className="px-3 py-2 text-xs font-bold rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                        >
                          Annuler
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSave()}
                        disabled={saving || !isDirty}
                        className="px-4 py-2 text-xs font-bold rounded-md bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
                      >
                        {saving ? 'Enregistrement...' : 'Associer ce Domaine'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--rego-ink-3,#949494)] mt-1.5">
                    Ne saisissez pas le protocole <code>https://</code>. Indiquez simplement le nom d'hôte (ex: <code>boutique.artisan.tn</code> ou <code>artisan.tn</code>).
                  </p>
                </div>

                {/* DNS Setup Guide Card */}
                <div className="border-t border-[var(--rego-border,#dedede)] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-black text-[var(--rego-fg,#111111)] uppercase tracking-wider">
                        Guide de Configuration DNS (Zone DNS de votre Registrar)
                      </h4>
                      <p className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5">
                        Ajoutez les enregistrements suivants dans le panneau d'administration de votre registrar pour pointer votre domaine vers PandaMarket.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDnsDrawer(true)}
                      className="text-xs font-bold text-[var(--rego-accent,#ad0505)] hover:underline flex items-center gap-1"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Détails & Aide</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)]">
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Hôte / Nom</th>
                          <th className="py-2.5 px-3">Valeur / Cible</th>
                          <th className="py-2.5 px-3">TTL</th>
                          <th className="py-2.5 px-3">Objectif</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--rego-border,#dedede)]/60 bg-[var(--rego-bg,#ffffff)]">
                        {dnsRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-[var(--rego-surface,#f5f5f5)]/40 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-[var(--rego-fg,#111111)]">
                              <span className="px-1.5 py-0.5 bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] rounded">
                                {record.type}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-[var(--rego-fg,#111111)] font-bold">
                              {record.name}
                            </td>
                            <td className="py-3 px-3 font-mono text-[var(--rego-fg,#111111)]">
                              <span className="px-2 py-0.5 rounded bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)]">
                                {record.target}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[var(--rego-ink-2,#737373)] font-mono">
                              {record.ttl}
                            </td>
                            <td className="py-3 px-3 text-[11px] text-[var(--rego-ink-2,#737373)]">
                              {record.purpose}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(record.target, record.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors shadow-2xs"
                              >
                                {copiedKey === record.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600">Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
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
                </div>
              </div>
            </ReGoCard>
          </div>
        }
        drawer={
          <ReGoDrawer
            isOpen={showDnsDrawer}
            onClose={() => setShowDnsDrawer(false)}
            title="Assistance & Propagation DNS"
            subtitle="Procédure de vérification de domaine"
            footer={
              <a
                href={propagationCheckUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-white hover:opacity-90 transition-all shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir l'outil DNSChecker mondial</span>
              </a>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] space-y-2">
                <h4 className="font-bold text-[var(--rego-fg,#111111)]">Délai de Propagation DNS</h4>
                <p className="text-[var(--rego-ink-2,#737373)] leading-relaxed">
                  Après avoir renseigné les enregistrements CNAME et A chez votre registraire (ATI, Topnet, OVH, etc.), la propagation mondiale nécessite généralement entre 15 minutes et 24 heures.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] text-[10px]">
                  Étapes Recommandées
                </h4>
                <ol className="space-y-2.5 text-[var(--rego-fg,#111111)] font-medium list-decimal pl-4">
                  <li>Connectez-vous à la console d'administration de votre bureau d'enregistrement (.tn ou international).</li>
                  <li>Accédez à la section « Gestion de Zone DNS ».</li>
                  <li>Créez un enregistrement CNAME pour l'hôte <code>www</code> pointant vers <code>cname.pandamarket.tn</code>.</li>
                  <li>Créez un enregistrement A pour le domaine apex <code>@</code> pointant vers <code>141.95.120.45</code>.</li>
                  <li>Attendez la validation et vérifiez via l'outil de propagation.</li>
                </ol>
              </div>

              <div className="p-3 rounded-md bg-sky-50 border border-sky-200 text-sky-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  <span>Certificat SSL Automatique</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Dès que les serveurs DNS de PandaMarket détectent la propagation correcte de votre domaine, un certificat SSL Let's Encrypt 256-bit est généré automatiquement sous 5 minutes.
                </p>
              </div>
            </div>
          </ReGoDrawer>
        }
      />
    </div>
  );
}
