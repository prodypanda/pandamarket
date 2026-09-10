'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Truck,
  Code2,
  Save,
  RefreshCw,
  Zap,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Search,
  Sliders,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
  ShieldCheck,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import {
  ReGoCard,
  ReGoSplitCard,
  ReGoKpiHero,
  ReGoAmtBox,
  ReGoStatusChip,
  ReGoDrawer,
} from './ReGoPrimitives';
import { DashboardPageWrapper } from '../DashboardPageWrapper';

export interface IntegrationsSettings {
  google_analytics_id?: string;
  facebook_pixel_id?: string;
  tiktok_pixel_id?: string;
  custom_head_js?: string;
  custom_body_js?: string;
  shipping_automation_mode?: 'smart_best_rate' | 'manual';
  free_shipping_threshold?: number;
  enabled_carriers?: Record<string, boolean>;
  carrier_rate_adjustments?: Record<string, number>;
}

export interface CarrierInfo {
  id: string;
  name: string;
  logo_badge: string;
  tagline: string;
  coverage_type: string;
  sla_hours_min: number;
  sla_hours_max: number;
  base_rate_tnd: number;
  cod_handling_tnd: number;
  tracking_prefix: string;
  active: boolean;
}

export interface GovernorateInfo {
  code: string;
  name: string;
  name_ar: string;
  zone: 'grand_tunis' | 'cap_bon_sahel' | 'nord_ouest_centre' | 'sfax_sud';
  default_postal: string;
}

export interface SmartQuote {
  carrier_id: string;
  carrier_name: string;
  logo_badge: string;
  service_type: string;
  estimated_hours_min: number;
  estimated_hours_max: number;
  estimated_days_label: string;
  price_tnd: number;
  cod_fee_tnd: number;
  total_shipping_tnd: number;
  coverage_zone: string;
  destination_governorate: string;
  is_best_rate: boolean;
  is_fastest: boolean;
  is_recommended: boolean;
}

export interface SellerReGoIntegrationsProps {
  integrations: IntegrationsSettings;
  carriers: CarrierInfo[];
  governorates: GovernorateInfo[];
  activeTab: 'logistics' | 'pixels';
  onTabChange: (tab: 'logistics' | 'pixels') => void;
  simOriginCity: string;
  onSimOriginCityChange: (v: string) => void;
  simDestGov: string;
  onSimDestGovChange: (v: string) => void;
  simWeight: number;
  onSimWeightChange: (v: number) => void;
  simCodAmount: number;
  onSimCodAmountChange: (v: number) => void;
  simQuotes: SmartQuote[];
  simBestRate: SmartQuote | null;
  simFastest: SmartQuote | null;
  simRecommended: SmartQuote | null;
  saving: boolean;
  isDirty: boolean;
  feedback: { message: string; isError?: boolean } | null;
  onChange: (field: keyof IntegrationsSettings, value: any) => void;
  onToggleCarrier: (carrierId: string) => void;
  onCarrierAdjustment: (carrierId: string, adj: number) => void;
  onSave: () => Promise<void>;
  onReset: () => void;
  dir?: 'ltr' | 'rtl';
}

export function SellerReGoIntegrations({
  integrations,
  carriers,
  governorates,
  activeTab,
  onTabChange,
  simOriginCity,
  onSimOriginCityChange,
  simDestGov,
  onSimDestGovChange,
  simWeight,
  onSimWeightChange,
  simCodAmount,
  onSimCodAmountChange,
  simQuotes,
  simBestRate,
  simFastest,
  simRecommended: _simRecommended,
  saving,
  isDirty,
  feedback,
  onChange,
  onToggleCarrier,
  onCarrierAdjustment: _onCarrierAdjustment,
  onSave,
  onReset,
  dir = 'ltr',
}: SellerReGoIntegrationsProps) {
  const { t: _t } = useLocale();
  const [showCarrierDrawer, setShowCarrierDrawer] = useState(false);
  const [selectedCarrierForDrawer, setSelectedCarrierForDrawer] = useState<CarrierInfo | null>(null);

  const enabledCarriers = integrations.enabled_carriers || {};
  const activeCarriersCount = Object.values(enabledCarriers).filter(Boolean).length;
  const totalCarriersCount = carriers.length;

  const activePixelsCount = [
    integrations.facebook_pixel_id,
    integrations.tiktok_pixel_id,
    integrations.google_analytics_id,
  ].filter((p) => p && p.trim().length > 0).length;

  const lowestSimQuote = simBestRate ? simBestRate.total_shipping_tnd : 6.500;

  return (
    <div dir={dir}>
      <DashboardPageWrapper
        breadcrumbs={[
          { label: 'Accueil', href: '/hub/dashboard' },
          { label: 'Boutique en Ligne', href: '/hub/dashboard/online-store' },
          { label: 'Logistique & Intégrations' },
        ]}
        headerTitle="Transporteurs Tunisiens & Pixels Marketing"
        headerSubtitle="Simulez vos frais d'expédition sur les 24 gouvernorats, configurez vos transporteurs partenaires et injectez vos pixels publicitaires de conversion."
        headerIcon={Truck}
        statusBadge={
          <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[var(--rego-accent-soft,rgba(173,5,5,0.1))] text-[var(--rego-accent,#ad0505)] rounded-full">
            24 Gouvernorats & Pixels
          </span>
        }
        secondaryAction={
          <div className="flex items-center rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)] p-0.5">
            <button
              onClick={() => onTabChange('logistics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                activeTab === 'logistics'
                  ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                  : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Transporteurs (24 Gouv)</span>
            </button>
            <button
              onClick={() => onTabChange('pixels')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                activeTab === 'pixels'
                  ? 'bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] shadow-2xs'
                  : 'text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Pixels Marketing</span>
            </button>
          </div>
        }
        primaryAction={
          <button
            onClick={() => onSave()}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Enregistrement...' : 'Enregistrer les Paramètres'}</span>
          </button>
        }
        alertBanner={
          feedback && (
            <div
              className={`flex items-center gap-3 p-3.5 rounded-[var(--rego-r,8px)] border text-xs font-semibold ${
                feedback.isError
                  ? 'border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-800'
                  : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800'
              }`}
            >
              {feedback.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          )
        }
        kpiStrip={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <ReGoKpiHero
              label="Transporteurs Partenaires"
              value={`${activeCarriersCount} / ${totalCarriersCount}`}
              hint="Aramex, Rapid-Poste, Runex, First Delivery"
              icon={Truck}
            />
            <ReGoKpiHero
              label="Couverture Territoriale"
              value="24 / 24"
              hint="Tous gouvernorats & zones rurales"
              icon={MapPin}
              accent
            />
            <ReGoKpiHero
              label="Tarif Estimé le Plus Compétitif"
              value={<ReGoAmtBox amount={lowestSimQuote} size="lg" />}
              hint={`Vers ${simDestGov} pour ${simWeight} kg`}
              icon={Zap}
            />
            <ReGoKpiHero
              label="Pixels Connectés"
              value={`${activePixelsCount} / 3`}
              hint="Meta Pixel, TikTok & Google GA4"
              icon={Code2}
            />
          </div>
        }
        mainContent={
          activeTab === 'logistics' ? (
            <div className="space-y-6">
              {/* Simulator & Carrier Quotes Matrix */}
              <ReGoSplitCard
                left={
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--rego-fg,#111111)] flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[var(--rego-accent,#ad0505)]" />
                        <span>Simulateur d&apos;Expédition 24 Gouvernorats</span>
                      </h3>
                      <p className="text-xs text-[var(--rego-ink-2,#737373)] mt-0.5">
                        Testez les tarifs en direct selon la ville d&apos;expédition, la destination et le poids du colis.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1">
                          Gouvernorat de Départ
                        </label>
                        <select
                          value={simOriginCity}
                          onChange={(e) => onSimOriginCityChange(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all font-bold"
                        >
                          {governorates.map((gov) => (
                            <option key={`orig-${gov.code}`} value={gov.name}>
                              {gov.name} ({gov.name_ar})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1">
                          Gouvernorat de Destination (Client)
                        </label>
                        <select
                          value={simDestGov}
                          onChange={(e) => onSimDestGovChange(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all font-bold"
                        >
                          {governorates.map((gov) => (
                            <option key={`dest-${gov.code}`} value={gov.name}>
                              {gov.name} ({gov.name_ar}) — {gov.zone.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1">
                            Poids du Colis (kg)
                          </label>
                          <select
                            value={simWeight}
                            onChange={(e) => onSimWeightChange(parseFloat(e.target.value))}
                            className="w-full px-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all font-mono"
                          >
                            <option value={0.5}>0.5 kg (Petit paquet)</option>
                            <option value={1.0}>1.0 kg (Standard)</option>
                            <option value={2.0}>2.0 kg (Moyen)</option>
                            <option value={5.0}>5.0 kg (Volumineux)</option>
                            <option value={10.0}>10.0 kg (Lourd)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1">
                            Montant COD (TND)
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={simCodAmount}
                            onChange={(e) => onSimCodAmountChange(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all font-mono"
                            placeholder="65.000"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--rego-ink-2,#737373)]">Mode d&apos;automatisation</span>
                        <select
                          value={integrations.shipping_automation_mode || 'smart_best_rate'}
                          onChange={(e) => onChange('shipping_automation_mode', e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-bold text-[var(--rego-fg,#111111)]"
                        >
                          <option value="smart_best_rate">Meilleur Tarif Auto</option>
                          <option value="manual">Choix Manuel du Client</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--rego-ink-2,#737373)]">Seuil Livraison Gratuite</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="5"
                            min="0"
                            value={integrations.free_shipping_threshold ?? 0}
                            onChange={(e) => onChange('free_shipping_threshold', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-xs rounded border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] font-mono text-end"
                          />
                          <span className="text-[10px] font-bold text-[var(--rego-ink-3,#949494)]">TND</span>
                        </div>
                      </div>
                    </div>
                  </div>
                }
                right={
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--rego-border,#dedede)] pb-3">
                      <div>
                        <h4 className="text-xs font-black text-[var(--rego-fg,#111111)] uppercase tracking-wider">
                          Matrice Comparative des Offres Transporteurs
                        </h4>
                        <p className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5">
                          Résultats en direct calculés pour un colis de {simWeight} kg livré à {simDestGov}.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {simQuotes.map((quote) => {
                        const carrierData = carriers.find((c) => c.id === quote.carrier_id);
                        const isEnabled = enabledCarriers[quote.carrier_id] ?? true;

                        return (
                          <div
                            key={quote.carrier_id}
                            className={`p-3.5 rounded-[var(--rego-r,8px)] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isEnabled
                                ? 'border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] shadow-2xs hover:border-[var(--rego-fg,#111111)]'
                                : 'border-dashed border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 opacity-60'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] flex items-center justify-center shrink-0">
                                <Truck className="w-4 h-4 text-[var(--rego-fg,#111111)]" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                                    {quote.carrier_name}
                                  </h4>
                                  {quote.is_best_rate && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 rounded">
                                      Économique
                                    </span>
                                  )}
                                  {quote.is_fastest && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-black bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 rounded">
                                      Plus Rapide
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-[var(--rego-ink-3,#949494)]" />
                                    <span>{quote.estimated_days_label} ({quote.estimated_hours_min}-{quote.estimated_hours_max}h)</span>
                                  </span>
                                  <span>·</span>
                                  <span>Couverture : {quote.coverage_zone.replace('_', ' ')}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--rego-border,#dedede)]/60">
                              <div className="text-end">
                                <ReGoAmtBox amount={quote.total_shipping_tnd} size="md" />
                                {quote.cod_fee_tnd > 0 && (
                                  <p className="text-[10px] text-[var(--rego-ink-3,#949494)]">
                                    incl. +{quote.cod_fee_tnd.toFixed(3)} frais COD
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onToggleCarrier(quote.carrier_id)}
                                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                                    isEnabled
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                                  }`}
                                >
                                  {isEnabled ? 'Activé' : 'Désactivé'}
                                </button>

                                {carrierData && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCarrierForDrawer(carrierData);
                                      setShowCarrierDrawer(true);
                                    }}
                                    className="p-1.5 rounded text-[var(--rego-ink-2,#737373)] hover:text-[var(--rego-fg,#111111)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                                    title="Détails du transporteur"
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                }
              />
            </div>
          ) : (
            /* Pixels Tab */
            <div className="space-y-6">
              <ReGoCard
                title="Pixels de Suivi Publicitaire & Mesure d'Audience"
                subtitle="Connectez vos outils d'analyse pour mesurer vos conversions et synchroniser vos audiences e-commerce"
                icon={Code2}
              >
                <div className="space-y-5">
                  {/* Meta Pixel */}
                  <div className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                            Meta Pixel (Facebook & Instagram)
                          </h4>
                          {integrations.facebook_pixel_id ? (
                            <ReGoStatusChip status="ok" label="Connecté" size="xs" />
                          ) : (
                            <ReGoStatusChip status="neutral" label="Non configuré" size="xs" />
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5">
                          Suivi du tunnel d&apos;achat et reciblage publicitaire sur Facebook Ads & Instagram Ads.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1">
                        Identifiant Meta Pixel (Pixel ID)
                      </label>
                      <input
                        type="text"
                        value={integrations.facebook_pixel_id || ''}
                        onChange={(e) => onChange('facebook_pixel_id', e.target.value)}
                        placeholder="ex: 123456789012345"
                        className="w-full max-w-md px-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all font-mono"
                      />
                    </div>

                    <div className="pt-2 border-t border-[var(--rego-border,#dedede)]/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--rego-ink-3,#949494)]">
                        Événements ReGo injectés automatiquement :
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase (TND)'].map((ev) => (
                          <span
                            key={ev}
                            className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[var(--rego-bg,#ffffff)] border border-[var(--rego-border,#dedede)] rounded text-emerald-700 dark:text-emerald-300"
                          >
                            ✓ {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* TikTok Pixel */}
                  <div className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                            TikTok Pixel
                          </h4>
                          {integrations.tiktok_pixel_id ? (
                            <ReGoStatusChip status="ok" label="Connecté" size="xs" />
                          ) : (
                            <ReGoStatusChip status="neutral" label="Non configuré" size="xs" />
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5">
                          Suivi des conversions et optimisation des campagnes vidéo sur TikTok Ads Manager.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1">
                        Identifiant TikTok Pixel (Pixel ID)
                      </label>
                      <input
                        type="text"
                        value={integrations.tiktok_pixel_id || ''}
                        onChange={(e) => onChange('tiktok_pixel_id', e.target.value)}
                        placeholder="ex: C5XXXXXX123456789"
                        className="w-full max-w-md px-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Google Analytics 4 */}
                  <div className="p-4 rounded-[var(--rego-r,8px)] border border-[var(--rego-border,#dedede)] bg-[var(--rego-surface,#f5f5f5)]/40 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-[var(--rego-fg,#111111)]">
                            Google Analytics 4 (GA4)
                          </h4>
                          {integrations.google_analytics_id ? (
                            <ReGoStatusChip status="ok" label="Connecté" size="xs" />
                          ) : (
                            <ReGoStatusChip status="neutral" label="Non configuré" size="xs" />
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--rego-ink-2,#737373)] mt-0.5">
                          Rapports de trafic en temps réel, sources d&apos;acquisition et parcours d&apos;achat détaillés.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1">
                        ID de Mesure Google Analytics (Measurement ID)
                      </label>
                      <input
                        type="text"
                        value={integrations.google_analytics_id || ''}
                        onChange={(e) => onChange('google_analytics_id', e.target.value)}
                        placeholder="G-XXXXXXXXXX"
                        className="w-full max-w-md px-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Custom Head/Body Scripts */}
                  <div className="space-y-3 pt-2 border-t border-[var(--rego-border,#dedede)]">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] mb-1">
                        Scripts JavaScript Personnalisés (&lt;head&gt;)
                      </label>
                      <textarea
                        rows={2}
                        value={integrations.custom_head_js || ''}
                        onChange={(e) => onChange('custom_head_js', e.target.value)}
                        placeholder="<!-- Script inséré dans l'en-tête HTML -->"
                        className="w-full px-3 py-2 text-xs rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-fg,#111111)] font-mono focus:outline-none focus:border-[var(--rego-accent,#ad0505)] transition-all"
                      />
                    </div>
                  </div>

                  {isDirty && (
                    <div className="pt-3 flex items-center gap-2 border-t border-[var(--rego-border,#dedede)]">
                      <button
                        type="button"
                        onClick={onReset}
                        className="px-3 py-1.5 text-xs font-bold rounded-md border border-[var(--rego-border,#dedede)] bg-[var(--rego-bg,#ffffff)] text-[var(--rego-ink-2,#737373)] hover:bg-[var(--rego-surface,#f5f5f5)] transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => onSave()}
                        disabled={saving}
                        className="px-4 py-1.5 text-xs font-bold rounded-md bg-[var(--rego-accent,#ad0505)] text-white hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
                      >
                        {saving ? 'Enregistrement...' : 'Enregistrer les Pixels'}
                      </button>
                    </div>
                  )}
                </div>
              </ReGoCard>
            </div>
          )
        }
        drawer={
          <ReGoDrawer
            isOpen={showCarrierDrawer}
            onClose={() => setShowCarrierDrawer(false)}
            title={selectedCarrierForDrawer?.name || 'Détails Transporteur'}
            subtitle={selectedCarrierForDrawer?.tagline}
            footer={
              <button
                onClick={() => setShowCarrierDrawer(false)}
                className="w-full px-4 py-2 text-xs font-bold rounded-[var(--rego-r,8px)] bg-[var(--rego-fg,#111111)] text-white hover:opacity-90 transition-all shadow-2xs"
              >
                Fermer la fiche
              </button>
            }
          >
            {selectedCarrierForDrawer && (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-md bg-[var(--rego-surface,#f5f5f5)] border border-[var(--rego-border,#dedede)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--rego-ink-2,#737373)]">Délai d&apos;Acheminement (SLA)</span>
                    <span className="font-bold text-[var(--rego-fg,#111111)] font-mono">
                      {selectedCarrierForDrawer.sla_hours_min}h à {selectedCarrierForDrawer.sla_hours_max}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--rego-ink-2,#737373)]">Tarif de Base Estimé</span>
                    <ReGoAmtBox amount={selectedCarrierForDrawer.base_rate_tnd} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--rego-ink-2,#737373)]">Frais de Gestion COD</span>
                    <ReGoAmtBox amount={selectedCarrierForDrawer.cod_handling_tnd} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--rego-ink-2,#737373)]">Préfixe de Suivi National</span>
                    <span className="font-mono text-[var(--rego-fg,#111111)] font-bold">
                      {selectedCarrierForDrawer.tracking_prefix}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-[var(--rego-ink-2,#737373)] text-[10px]">
                    Sécurité des Fonds & Rapprochement COD
                  </h4>
                  <ul className="space-y-1.5 text-[var(--rego-fg,#111111)] list-disc pl-4">
                    <li>Rapatriement des encaissements COD garanti sous 48h sur votre compte bancaire tunisien.</li>
                    <li>Bordereaux de livraison AWB imprimables en 1 clic avec code-barres et QR Code national.</li>
                    <li>Notification SMS automatique au destinataire lors de la sortie en livraison.</li>
                  </ul>
                </div>
              </div>
            )}
          </ReGoDrawer>
        }
      />
    </div>
  );
}
