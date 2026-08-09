'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/api';
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
  Printer,
  ChevronRight,
  ShieldCheck,
  Percent,
  Sliders,
  DollarSign,
  Loader2,
  ExternalLink,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { UnsavedChangesBanner } from '@/components/dashboard/UnsavedChangesBanner';
import { revalidateStoreCache } from '@/lib/store-cache';
import { useLocale } from '@/contexts/LocaleContext';

interface IntegrationsSettings {
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

interface CarrierInfo {
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

interface GovernorateInfo {
  code: string;
  name: string;
  name_ar: string;
  zone: string;
  default_postal: string;
}

interface SmartQuote {
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

interface TrackingEvent {
  timestamp: string;
  location: string;
  description: string;
  status: string;
}

interface TrackingResult {
  tracking_number: string;
  provider: string;
  carrier_name: string;
  status: string;
  events: TrackingEvent[];
  estimated_delivery: string | null;
}

export default function IntegrationsPage() {
  const { t, locale } = useLocale();
  const [activeTab, setActiveTab] = useState<'logistics' | 'pixels'>('logistics');

  // Integrations state
  const [integrations, setIntegrations] = useState<IntegrationsSettings>({
    google_analytics_id: '',
    facebook_pixel_id: '',
    tiktok_pixel_id: '',
    custom_head_js: '',
    custom_body_js: '',
    shipping_automation_mode: 'smart_best_rate',
    free_shipping_threshold: 0,
    enabled_carriers: {
      aramex: true,
      laposte_rapid: true,
      first_delivery: true,
      runex: true,
      fleex: true,
      own_fleet: true,
    },
    carrier_rate_adjustments: {},
  });
  const [initialIntegrations, setInitialIntegrations] = useState<IntegrationsSettings>({});
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('Boutique');
  const [storePhone, setStorePhone] = useState('21699000000');
  const [storeCity, setStoreCity] = useState('Tunis');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  // Logistics Aggregator Data
  const [carriers, setCarriers] = useState<CarrierInfo[]>([]);
  const [governorates, setGovernorates] = useState<GovernorateInfo[]>([]);

  // Interactive Quote Simulator
  const [simOriginCity, setSimOriginCity] = useState('Tunis');
  const [simDestGov, setSimDestGov] = useState('Tunis');
  const [simWeight, setSimWeight] = useState(1.5);
  const [simCodAmount, setSimCodAmount] = useState(65.0);
  const [simLoading, setSimLoading] = useState(false);
  const [simQuotes, setSimQuotes] = useState<SmartQuote[]>([]);
  const [simBestRate, setSimBestRate] = useState<SmartQuote | null>(null);
  const [simFastest, setSimFastest] = useState<SmartQuote | null>(null);
  const [simRecommended, setSimRecommended] = useState<SmartQuote | null>(null);

  // Interactive Tracking Search
  const [searchTrackingNumber, setSearchTrackingNumber] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [trackingError, setTrackingError] = useState('');

  // AWB Sample Generator Modal
  const [awbPreviewCarrier, setAwbPreviewCarrier] = useState<CarrierInfo | null>(null);

  // Fetch Store settings & carriers list
  const fetchStore = useCallback(async () => {
    try {
      const [resStore, resCarriers] = await Promise.all([
        fetchWithCsrf('/api/pd/stores/me', { credentials: 'include' }),
        fetch('/api/pd/shipping/carriers').then((r) => r.json()).catch(() => null),
      ]);

      if (resStore.ok) {
        const data = await resStore.json();
        const loaded = data.store.settings?.integrations || {};
        const safeIntegrations: IntegrationsSettings = {
          google_analytics_id: loaded.google_analytics_id || '',
          facebook_pixel_id: loaded.facebook_pixel_id || '',
          tiktok_pixel_id: loaded.tiktok_pixel_id || '',
          custom_head_js: loaded.custom_head_js || '',
          custom_body_js: loaded.custom_body_js || '',
          shipping_automation_mode: loaded.shipping_automation_mode || 'smart_best_rate',
          free_shipping_threshold: loaded.free_shipping_threshold || 0,
          enabled_carriers: loaded.enabled_carriers || {
            aramex: true,
            laposte_rapid: true,
            first_delivery: true,
            runex: true,
            fleex: true,
            own_fleet: true,
          },
          carrier_rate_adjustments: loaded.carrier_rate_adjustments || {},
        };
        setIntegrations(safeIntegrations);
        setInitialIntegrations(safeIntegrations);
        setSubdomain(data.store.subdomain || '');
        setCustomDomain(data.store.custom_domain || null);
        setStoreName(data.store.name || 'Boutique');
        setStorePhone(data.store.phone || '21699000000');
        setStoreCity(data.store.city || 'Tunis');
      }

      if (resCarriers?.data) {
        setCarriers(resCarriers.data.carriers || []);
        setGovernorates(resCarriers.data.governorates || []);
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

  // Run Quote Simulator
  const runQuoteSimulator = useCallback(async () => {
    setSimLoading(true);
    try {
      const res = await fetch('/api/pd/shipping/smart-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_city: simOriginCity,
          destination: {
            address_line_1: 'Adresse Client',
            city: simDestGov,
            state: simDestGov,
            country: 'TN',
          },
          weight_kg: simWeight,
          cod_amount: simCodAmount,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSimQuotes(json.data.quotes || []);
          setSimBestRate(json.data.best_rate || null);
          setSimFastest(json.data.fastest || null);
          setSimRecommended(json.data.recommended || null);
        }
      }
    } catch {
      // ignore
    } finally {
      setSimLoading(false);
    }
  }, [simOriginCity, simDestGov, simWeight, simCodAmount]);

  useEffect(() => {
    if (!loading && carriers.length > 0) {
      runQuoteSimulator();
    }
  }, [loading, carriers.length, runQuoteSimulator]);

  // Run Tracking Search
  const handleTrackSearch = async () => {
    if (!searchTrackingNumber.trim()) return;
    setTrackingLoading(true);
    setTrackingError('');
    setTrackingResult(null);
    try {
      const res = await fetch(`/api/pd/shipping/track/${encodeURIComponent(searchTrackingNumber.trim())}`);
      if (!res.ok) {
        throw new Error('Colis non trouvé ou numéro de suivi invalide');
      }
      const json = await res.json();
      setTrackingResult(json.data);
    } catch (err) {
      setTrackingError(err instanceof Error ? err.message : 'Erreur lors du suivi');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleChange = (field: keyof IntegrationsSettings, value: any) => {
    setIntegrations((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleToggleCarrier = (carrierId: string) => {
    setIntegrations((prev) => {
      const current = prev.enabled_carriers || {};
      const updated = { ...current, [carrierId]: !current[carrierId] };
      return { ...prev, enabled_carriers: updated };
    });
    setIsDirty(true);
  };

  const handleCarrierAdjustment = (carrierId: string, adjustment: number) => {
    setIntegrations((prev) => {
      const current = prev.carrier_rate_adjustments || {};
      const updated = { ...current, [carrierId]: adjustment };
      return { ...prev, carrier_rate_adjustments: updated };
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithCsrf('/api/pd/stores/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          settings: { integrations },
        }),
      });
      if (res.ok) {
        setInitialIntegrations(integrations);
        setIsDirty(false);
        setFeedback({ message: 'Configuration logistique & intégrations sauvegardée avec succès !' });
        revalidateStoreCache({ subdomain, custom_domain: customDomain });
      } else {
        setFeedback({ message: 'Erreur lors de l’enregistrement.', isError: true });
      }
    } catch {
      setFeedback({ message: 'Erreur réseau lors de la sauvegarde.', isError: true });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleReset = () => {
    setIntegrations(initialIntegrations);
    setIsDirty(false);
  };

  const formatMoney = (amount: number) => `${amount.toFixed(3)} DT`;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-[#B91C1C]/10 p-3 text-[#B91C1C]">
              <Truck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Hub Logistique & Intégrations Plateforme
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Connectez les transporteurs tunisiens (Aramex, Rapid-Poste, First Delivery, Runex, Fleex) et vos outils marketing.
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('logistics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'logistics'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4 text-[#B91C1C]" />
              <span>🚚 Transporteurs & Routage</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pixels')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'pixels'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-4 h-4 text-indigo-600" />
              <span>📊 Pixels & Marketing</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs font-bold ${
              feedback.isError
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LOGISTICS AGGREGATOR & TUNISIAN CARRIERS */}
      {/* ========================================================================= */}
      {activeTab === 'logistics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Smart Automation Strategy Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#B91C1C] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  Moteur de Routage Intelligent PandaMarket
                </span>
                <h2 className="text-base font-black text-slate-900 mt-1">
                  Stratégie d&apos;Expédition & Sélection Automatique des Transporteurs
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attribuez automatiquement chaque commande au transporteur le plus avantageux selon le gouvernorat de livraison.
                </p>
              </div>

              {/* Strategy Selector */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('shipping_automation_mode', 'smart_best_rate')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    integrations.shipping_automation_mode === 'smart_best_rate'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Routage Intelligent (Recommandé)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('shipping_automation_mode', 'manual')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    integrations.shipping_automation_mode === 'manual'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Choix Manuel</span>
                </button>
              </div>
            </div>

            {/* Free shipping threshold input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
                <label className="block text-xs font-black text-amber-900 uppercase tracking-wider">
                  🎉 Seuil de Livraison Gratuite (TND) :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={integrations.free_shipping_threshold || ''}
                    onChange={(e) => handleChange('free_shipping_threshold', parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 100 (0 = Désactivé)"
                    className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-xs font-black text-amber-900 font-mono">DT</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Offrez automatiquement les frais de port à vos clients si leur panier dépasse ce montant.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                  📍 Hub & Ville d&apos;Expédition par Défaut :
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={storeCity}
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 outline-none"
                  />
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-black">
                    Actif
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Origine utilisée pour calculer les distances et matrices tarifaires des transporteurs.
                </p>
              </div>
            </div>
          </div>

          {/* Active Carriers Matrix */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Transporteurs Tunisiens Partenaires & Ajustements Tarifaires
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Activez ou désactivez chaque coursier et personnalisez vos majorations / remises commerciales.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {carriers.map((carrier) => {
                const isEnabled = integrations.enabled_carriers?.[carrier.id] ?? true;
                const adjustment = integrations.carrier_rate_adjustments?.[carrier.id] ?? 0;

                return (
                  <div
                    key={carrier.id}
                    className={`p-5 rounded-3xl border transition-all space-y-4 ${
                      isEnabled
                        ? 'border-slate-200 bg-white shadow-sm hover:border-[#B91C1C]/40'
                        : 'border-slate-100 bg-slate-50/70 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                          {carrier.logo_badge}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {carrier.tagline}
                        </p>
                      </div>

                      {/* Enable switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleCarrier(carrier.id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${
                          isEnabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isEnabled ? 'Activé ✅' : 'Désactivé ❌'}
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Tarif de Base National :</span>
                        <span className="font-mono font-black text-slate-900">{formatMoney(carrier.base_rate_tnd)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Délai Moyen (SLA) :</span>
                        <span className="font-bold text-slate-700">
                          {carrier.sla_hours_max <= 24 ? '24h chrono' : `${carrier.sla_hours_min}-${carrier.sla_hours_max}h`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Préfixe Bordereau AWB :</span>
                        <span className="font-mono font-bold text-indigo-600">{carrier.tracking_prefix}-xxxx</span>
                      </div>
                    </div>

                    {/* Surcharge or Discount rule */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">Ajustement Marchand (DT) :</span>
                        <span className="font-mono font-bold text-[#B91C1C]">
                          {adjustment > 0 ? `+${adjustment.toFixed(3)}` : adjustment < 0 ? `${adjustment.toFixed(3)}` : '0.000'} DT
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        value={adjustment || ''}
                        onChange={(e) => handleCarrierAdjustment(carrier.id, parseFloat(e.target.value) || 0)}
                        placeholder="Ex: +1.000 ou -1.500"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-800 outline-none"
                      />
                    </div>

                    {/* Test AWB preview button */}
                    <button
                      type="button"
                      onClick={() => setAwbPreviewCarrier(carrier)}
                      className="w-full py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Aperçu Bordereau AWB</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Multi-Carrier Rate Simulator */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Simulateur & Comparateur en Direct
                </span>
                <h2 className="text-base font-black text-slate-900 mt-1">
                  Testeur de Devis Multi-Transporteurs sur 24 Gouvernorats
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Simulez n&apos;importe quelle destination tunisienne pour visualiser les tarifs et les recommandations de routage.
                </p>
              </div>

              <button
                type="button"
                onClick={runQuoteSimulator}
                disabled={simLoading}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5"
              >
                {simLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Recalculer</span>
              </button>
            </div>

            {/* Simulator Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 uppercase">
                  📍 Gouvernorat Destinataire :
                </label>
                <select
                  value={simDestGov}
                  onChange={(e) => setSimDestGov(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500"
                >
                  {governorates.map((gov) => (
                    <option key={gov.code} value={gov.name}>
                      {gov.name} ({gov.name_ar}) · {gov.zone.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 uppercase">
                  ⚖️ Poids du Colis (KG) :
                </label>
                <input
                  type="number"
                  min={0.1}
                  max={50}
                  step={0.5}
                  value={simWeight}
                  onChange={(e) => setSimWeight(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 uppercase">
                  💵 Montant COD à Encaisser (DT) :
                </label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={simCodAmount}
                  onChange={(e) => setSimCodAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 uppercase">
                  🏢 Ville Origine :
                </label>
                <input
                  type="text"
                  value={simOriginCity}
                  onChange={(e) => setSimOriginCity(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 outline-none"
                />
              </div>
            </div>

            {/* Smart Routing Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Best Rate Card */}
              {simBestRate && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">
                    🏷️ Meilleur Tarif Économique
                  </span>
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-900 text-sm">{simBestRate.carrier_name}</p>
                    <p className="text-lg font-black text-emerald-600 font-mono">
                      {formatMoney(simBestRate.total_shipping_tnd)}
                    </p>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Délai estimé : <strong>{simBestRate.estimated_days_label}</strong>
                  </p>
                </div>
              )}

              {/* Fastest Delivery Card */}
              {simFastest && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black uppercase">
                    ⚡ Livraison la Plus Rapide
                  </span>
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-900 text-sm">{simFastest.carrier_name}</p>
                    <p className="text-lg font-black text-amber-700 font-mono">
                      {formatMoney(simFastest.total_shipping_tnd)}
                    </p>
                  </div>
                  <p className="text-xs text-amber-800">
                    Délai estimé : <strong>{simFastest.estimated_days_label} ({simFastest.estimated_hours_min}-{simFastest.estimated_hours_max}h)</strong>
                  </p>
                </div>
              )}

              {/* Recommended Card */}
              {simRecommended && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 space-y-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase">
                    ⭐ Recommandé PandaMarket
                  </span>
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-900 text-sm">{simRecommended.carrier_name}</p>
                    <p className="text-lg font-black text-indigo-600 font-mono">
                      {formatMoney(simRecommended.total_shipping_tnd)}
                    </p>
                  </div>
                  <p className="text-xs text-indigo-800">
                    Meilleur équilibre fiabilité / délai pour <strong>{simDestGov}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Detailed Quotes Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Transporteur</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Délai (SLA)</th>
                    <th className="px-4 py-3">Frais Transport</th>
                    <th className="px-4 py-3">Frais COD</th>
                    <th className="px-4 py-3">Total Vendeur</th>
                    <th className="px-4 py-3 text-right">Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simQuotes.map((q) => (
                    <tr key={q.carrier_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {q.carrier_name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {q.service_type}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {q.estimated_days_label}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-800">
                        {formatMoney(q.price_tnd)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {q.cod_fee_tnd > 0 ? formatMoney(q.cod_fee_tnd) : 'Gratuit'}
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-slate-900 text-sm">
                        {formatMoney(q.total_shipping_tnd)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {q.is_best_rate && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                            Meilleur Tarif
                          </span>
                        )}
                        {q.is_fastest && !q.is_best_rate && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                            Plus Rapide
                          </span>
                        )}
                        {q.is_recommended && !q.is_best_rate && !q.is_fastest && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black">
                            Recommandé
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-time Multi-Carrier Tracking Timeline */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Suivi Logistique Multi-Transporteurs
              </span>
              <h2 className="text-base font-black text-slate-900 mt-1">
                Recherche & Suivi d&apos;Expédition en Temps Réel
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Entrez un numéro de suivi AWB (ex: ARAMEX-TN-..., RP-TN-..., FD-TN-...) pour visualiser les étapes de livraison.
              </p>
            </div>

            <div className="flex items-center gap-2 max-w-xl">
              <input
                type="text"
                value={searchTrackingNumber}
                onChange={(e) => setSearchTrackingNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrackSearch()}
                placeholder="Entrez le numéro de suivi AWB..."
                className="flex-1 px-4 py-2.5 text-xs font-mono font-bold rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-[#B91C1C]"
              />
              <button
                type="button"
                onClick={handleTrackSearch}
                disabled={trackingLoading || !searchTrackingNumber.trim()}
                className="px-5 py-2.5 rounded-2xl bg-[#B91C1C] text-white text-xs font-black hover:bg-[#991B1B] transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {trackingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Suivre</span>
              </button>
            </div>

            {trackingError && (
              <p className="text-xs font-bold text-red-600">{trackingError}</p>
            )}

            {trackingResult && (
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Numéro de Suivi AWB :</span>
                    <p className="font-mono font-black text-slate-900 text-sm">{trackingResult.tracking_number}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                      {trackingResult.carrier_name}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-black uppercase">
                      {trackingResult.status}
                    </span>
                  </div>
                </div>

                {/* Timeline Events */}
                <div className="space-y-4 relative pl-6 border-l-2 border-slate-200">
                  {trackingResult.events.map((ev, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#B91C1C] border-2 border-white shadow-xs" />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-xs">{ev.location}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(ev.timestamp).toLocaleString(locale === 'ar' ? 'ar-TN' : 'fr-TN')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{ev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MARKETING PIXELS & CUSTOM SCRIPTS */}
      {/* ========================================================================= */}
      {activeTab === 'pixels' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-base font-black text-slate-900">
              Pixels Publicitaires & Balises de Tracking E-commerce
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Renseignez vos identifiants pour activer automatiquement les événements d&apos;achat et de panier.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">{t('dashboardPages.integrations.googleAnalyticsId')}</label>
              <input
                type="text"
                value={integrations.google_analytics_id || ''}
                onChange={(e) => handleChange('google_analytics_id', e.target.value)}
                placeholder={t('dashboardPages.integrations.googleAnalyticsPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">{t('dashboardPages.integrations.metaPixelId')}</label>
              <input
                type="text"
                value={integrations.facebook_pixel_id || ''}
                onChange={(e) => handleChange('facebook_pixel_id', e.target.value)}
                placeholder={t('dashboardPages.integrations.metaPixelPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">{t('dashboardPages.integrations.tiktokPixelId')}</label>
              <input
                type="text"
                value={integrations.tiktok_pixel_id || ''}
                onChange={(e) => handleChange('tiktok_pixel_id', e.target.value)}
                placeholder={t('dashboardPages.integrations.tiktokPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">{t('dashboardPages.integrations.customHeadJs')}</label>
            <textarea
              rows={4}
              value={integrations.custom_head_js || ''}
              onChange={(e) => handleChange('custom_head_js', e.target.value)}
              placeholder={t('dashboardPages.integrations.customHeadJsPlaceholder')}
              className="w-full font-mono text-xs rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-3 placeholder-slate-500 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">{t('dashboardPages.integrations.customBodyJs')}</label>
            <textarea
              rows={4}
              value={integrations.custom_body_js || ''}
              onChange={(e) => handleChange('custom_body_js', e.target.value)}
              placeholder={t('dashboardPages.integrations.customBodyJsPlaceholder')}
              className="w-full font-mono text-xs rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-3 placeholder-slate-500 focus:border-[#B91C1C] focus:outline-none focus:ring-1 focus:ring-[#B91C1C]"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#B91C1C] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#991B1B] transition shadow-sm disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? t('dashboardPages.integrations.saving') : t('dashboardPages.integrations.saveButton')}
          </button>
        </div>
      )}

      {/* AWB Label Preview Modal */}
      {awbPreviewCarrier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#B91C1C]" />
                <h3 className="text-base font-black text-slate-900">
                  Bordereau d&apos;Expédition AWB Standard
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAwbPreviewCarrier(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Fermer ✕
              </button>
            </div>

            {/* Standardized AWB Ticket */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 space-y-4 font-sans text-xs">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="font-black text-sm uppercase text-slate-900">{awbPreviewCarrier.name}</span>
                  <p className="text-[10px] text-slate-400">Bordereau de Transport Routier Tunisie</p>
                </div>
                <div className="p-1 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <QrCode className="w-8 h-8 text-slate-900" />
                </div>
              </div>

              {/* Barcode Simulation */}
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center space-y-1">
                <div className="h-8 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px)] w-4/5 mx-auto" />
                <p className="font-mono font-black text-xs text-slate-900 tracking-wider">
                  {awbPreviewCarrier.tracking_prefix}-84920193
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-slate-400">Expéditeur (Vendeur) :</span>
                  <p className="font-bold text-slate-900">{storeName}</p>
                  <p className="text-[10px] text-slate-500">{storeCity}, Tunisie</p>
                  <p className="text-[10px] font-mono text-slate-400">Tel: {storePhone}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-slate-400">Destinataire (Client) :</span>
                  <p className="font-bold text-slate-900">Ahmed Ben Salem</p>
                  <p className="text-[10px] text-slate-500">Sousse, 4000</p>
                  <p className="text-[10px] font-mono text-slate-400">Tel: +216 24 111 222</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between font-bold">
                <div>
                  <span className="text-[9px] font-black uppercase text-amber-800">Montant COD à Encaisser :</span>
                  <p className="text-base font-black text-amber-900 font-mono">75.000 DT</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase text-amber-800">Poids :</span>
                  <p className="text-xs font-mono text-amber-900">1.800 KG</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAwbPreviewCarrier(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-2xl bg-[#B91C1C] text-white font-black text-xs hover:bg-[#991B1B] transition shadow-sm flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer l&apos;AWB</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Banner */}
      <UnsavedChangesBanner
        isDirty={isDirty}
        onSave={handleSave}
        onReset={handleReset}
        saving={saving}
      />
    </div>
  );
}
